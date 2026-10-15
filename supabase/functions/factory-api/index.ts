/**
 * Factory Production Intelligence V1.6 Supabase Edge Function.
 * Deploy with JWT verification DISABLED; authorization is via strong private staff/admin URL-fragment keys.
 * Only SHA-256 hashes are stored in an RLS-protected credential table; no plaintext keys in public files.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';

const allowedOrigin = 'https://kdusec-alt.github.io';
const cors = (origin: string | null): Record<string,string> => ({
  'Access-Control-Allow-Origin': origin===allowedOrigin ? origin : allowedOrigin,
  'Access-Control-Allow-Headers': 'content-type,x-staff-key,x-admin-key',
  'Access-Control-Allow-Methods': 'POST,OPTIONS',
  'Access-Control-Max-Age': '600',
  'Vary': 'Origin',
  'Cache-Control': 'no-store',
  'Content-Type': 'application/json; charset=utf-8',
});
const send=(status:number,obj:unknown,origin:string|null)=>new Response(JSON.stringify(obj),{status,headers:cors(origin)});
const isInt=(n:unknown,min:number,max:number)=>Number.isInteger(n)&&Number(n)>=min&&Number(n)<=max;
const isNum=(n:unknown,min:number,max:number)=>typeof n==='number'&&Number.isFinite(n)&&n>=min&&n<=max;
const validDate=(v:unknown)=>typeof v==='string'&&/^20\d\d-\d\d-\d\d$/.test(v)&&!Number.isNaN(Date.parse(v+'T00:00:00Z'))&&new Date(v+'T00:00:00Z').toISOString().slice(0,10)===v;
async function hashKey(value:string):Promise<string>{
 const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(value)));
 return Array.from(bytes).map(b=>b.toString(16).padStart(2,'0')).join('');
}
function validate(raw:unknown):Record<string,unknown>{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Invalid report');
 const r=raw as Record<string,unknown>;
 const {production_date,factory,line,process,output_total,normal_hc,normal_hours,ot_output,ot_hc,ot_hours,no_ot,models,operator_name,notes}=r;
 if(!validDate(production_date))throw new Error('Invalid production date');
 if(r.plant!==undefined&&r.plant!=='NBY')throw new Error('Only NBY factory is supported');
 if(!['A','B','C','D'].includes(String(factory)))throw new Error('Invalid factory');
 if(typeof line!=='string'||!new RegExp('^'+factory+'0[1-'+(factory==='D'?6:7)+']$').test(line))throw new Error('Invalid line');
 if(!['gc','asm'].includes(String(process)))throw new Error('Invalid process');
 if(!isInt(output_total,0,20000)||!isInt(normal_hc,1,1000)||!isNum(normal_hours,.5,16))throw new Error('Invalid output, HC or normal hours');
 if(typeof operator_name!=='string'||operator_name.trim().length<2||operator_name.length>80)throw new Error('Operator is required');
 if(typeof notes!=='string'||notes.length>500)throw new Error('Notes too long');
 if(typeof no_ot!=='boolean')throw new Error('OT confirmation required');
 if(no_ot){if(ot_output!==0||ot_hc!==null||ot_hours!==0)throw new Error('No-OT mismatch');}
 else if(ot_output===null){if(ot_hc!==null||ot_hours!==null)throw new Error('Unknown OT mismatch');}
 else if(!isInt(ot_output,0,Number(output_total))||!isInt(ot_hc,1,1000)||!isNum(ot_hours,.5,16))throw new Error('Invalid OT fields');
 if(!Array.isArray(models)||models.length<1||models.length>20)throw new Error('Model detail required');
 const codes=new Set<string>();let modelTotal=0,modelOT=0;
 for(const item of models){
  if(!item||typeof item!=='object')throw new Error('Invalid model row');
  const m=item as Record<string,unknown>;
  if(typeof m.code!=='string'||!(/^[A-Z0-9._+\-/ ]{1,70}$/.test(m.code))||codes.has(m.code))throw new Error('Invalid or duplicate model code');
  if(!isInt(m.total,0,20000))throw new Error('Invalid model output');
  if(ot_output===null){if(m.ot!==null)throw new Error('Model OT must be unknown');}
  else if(!isInt(m.ot,0,Number(m.total)))throw new Error('Invalid model OT');
  codes.add(m.code);modelTotal+=Number(m.total);modelOT+=Number(m.ot||0);
 }
 if(modelTotal!==output_total||ot_output!==null&&modelOT!==ot_output)throw new Error('Model totals do not reconcile');
 return {production_date,plant:'NBY',factory,line,process,output_total,normal_hc,normal_hours,ot_output,ot_hc,ot_hours,no_ot,models,operator_name:operator_name.trim(),notes:notes.trim()};
}
Deno.serve(async (request:Request)=>{
 const origin=request.headers.get('origin');
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors(origin)});
 if(request.method!=='POST')return send(405,{error:'Method not allowed'},origin);
 if(origin&&origin!==allowedOrigin)return send(403,{error:'Origin not allowed'},origin);
 const url=Deno.env.get('SUPABASE_URL')||'';
 const legacyKey=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')||'';
 let key=legacyKey;
 if(!key){
  try{const keys=JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS')||'{}');key=keys.default||Object.values(keys)[0]||'';}
  catch{key='';}
 }
 if(!url||!key)return send(503,{error:'Database is not configured'},origin);
 const supabase=createClient(url,String(key),{auth:{persistSession:false,autoRefreshToken:false}});
 const staffToken=request.headers.get('x-staff-key')||'';
 const adminToken=request.headers.get('x-admin-key')||'';
 const provided=adminToken||staffToken;
 if(provided.length<32||provided.length>256)return send(401,{error:'Invalid staff/manager link'},origin);
 const digest=await hashKey(provided);
 const {data:credential,error:authError}=await supabase.from('factory_link_credentials')
   .select('role').eq('key_hash',digest).eq('active',true).maybeSingle();
 if(authError){console.error('Auth lookup error',authError.code);return send(503,{error:'Authentication is unavailable'},origin);}
 const isAdmin=Boolean(adminToken)&&credential?.role==='admin';
 const isStaff=Boolean(staffToken)&&credential?.role==='staff';
 if(!isStaff&&!isAdmin)return send(401,{error:'Invalid staff/manager link'},origin);
 const size=Number(request.headers.get('content-length')||'0');
 if(size>32_000)return send(413,{error:'Request too large'},origin);
 let body:Record<string,unknown>;
 try{
  const raw=await request.text();
  if(raw.length>32_000)return send(413,{error:'Request too large'},origin);
  body=JSON.parse(raw);
  if(!body||typeof body!=='object'||Array.isArray(body))throw new Error();
 }catch{return send(400,{error:'Invalid JSON'},origin);}
 const action=body.action;
 if(action==='health')return send(200,{ok:true,role:isAdmin?'admin':'staff'},origin);
 if(action==='save'){
  if(!isStaff&&!isAdmin)return send(403,{error:'Write not permitted'},origin);
  let record:Record<string,unknown>;
  try{record=validate(body.record);}catch(e){return send(422,{error:String((e as Error).message)},origin);}
  const expected=body.expected_revision===undefined?null:body.expected_revision;
  if(expected!==null&&!isInt(expected,1,1_000_000))return send(422,{error:'Invalid expected revision'},origin);
  const {data,error}=await supabase.rpc('save_factory_entry',{p_record:record,p_expected_revision:expected});
  if(error){
   const match=String(error.message||'').match(/REVISION_CONFLICT:(\d+)/);
   if(match)return send(409,{error:'This report already exists or has changed',revision:Number(match[1])},origin);
   console.error('DB error',error.code);return send(500,{error:'Could not save report. Contact manager.'},origin);
  }
  return send(200,{ok:true,id:data.id,revision:data.revision,saved_at:data.updated_at,production_date:data.production_date,line:data.line},origin);
 }
 if(action==='list'){
  if(!isAdmin)return send(403,{error:'Manager access required'},origin);
  const from=body.date_from,to=body.date_to;
  if(!validDate(from)||!validDate(to)||String(from)>String(to))return send(422,{error:'Invalid date range'},origin);
  const {data,error}=await supabase.from('production_entries').select('plant,production_date,factory,line,process,operator_name,output_total,normal_hc,normal_hours,ot_output,ot_hc,ot_hours,no_ot,models,notes,revision,updated_at').gte('production_date',from).lte('production_date',to).order('production_date',{ascending:false}).limit(2000);
  if(error){console.error('List error',error.code);return send(500,{error:'Cannot load reports'},origin);}
  return send(200,{ok:true,rows:data||[],truncated:(data||[]).length===2000},origin);
 }
 return send(400,{error:'Unknown action'},origin);
});
