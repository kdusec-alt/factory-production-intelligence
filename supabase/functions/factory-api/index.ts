/**
 * Factory Production Intelligence V1.6 Supabase Edge Function.
 * Deploy with JWT verification DISABLED; authorization is via strong private staff/admin URL-fragment keys.
 * Only SHA-256 hashes are stored in an RLS-protected credential table; no plaintext keys in public files.
 */
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.4';
import { benchmark } from './benchmark.ts';
import { planningAction } from './planning.ts';

const allowedOrigin = 'https://kdusec-alt.github.io';
const cors = (origin: string | null): Record<string,string> => ({
  'Access-Control-Allow-Origin': origin===allowedOrigin ? origin : allowedOrigin,
  'Access-Control-Allow-Headers': 'content-type,x-staff-key,x-admin-key,x-viewer-key',
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
 const {production_date,plant,process,output_total,normal_hc,normal_hours,ot_output,ot_hc,ot_hours,no_ot,models,operator_name,notes}=r;
 if(!validDate(production_date))throw new Error('Invalid production date');
 if(plant!=='NBY')throw new Error('Only NBY factory is supported');
 if('factory' in r||'line' in r)throw new Error('Outdated form: reload the NBY-only page');
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
 return {production_date,plant:'NBY',process,output_total,normal_hc,normal_hours,ot_output,ot_hc,ot_hours,no_ot,models,operator_name:operator_name.trim(),notes:notes.trim()};
}

function validateExcel(raw:unknown):Record<string,unknown>{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Invalid Excel payload');
 const p=raw as Record<string,unknown>,d=p.daily,m=p.models,q=p.quality;
 if(!Array.isArray(d)||!Array.isArray(m)||!Array.isArray(q)||typeof p.has_quality_sheet!=='boolean')
  throw new Error('Excel arrays missing');
 if(d.length>600||m.length>6000||q.length>2000||(!d.length&&!p.has_quality_sheet))
  throw new Error('Excel row limit exceeded');
 const names=['gcTotal','gcHC','gcOT','gcOTHC','gcHours','asmTotal','asmHC','asmOT','asmOTHC','asmHours','otHours'];
 const dayMap=new Map<string,Record<string,unknown>>();
 const days=d.map(x=>{
  if(!x||typeof x!=='object'||Array.isArray(x))throw new Error('Invalid Excel day');
  const v=x as Record<string,unknown>,date=v.date;
  if(!validDate(date)||dayMap.has(String(date)))throw new Error('Invalid/duplicate Excel date');
  const out:Record<string,unknown>={date};
  for(const k of names){
   const n=v[k];if(n===null||n===undefined||n===''){out[k]=null;continue;}
   if(!isNum(n,0,20000))throw new Error(String(date)+': invalid '+k);
   if(['gcHC','gcOTHC','asmHC','asmOTHC'].includes(k)&&!Number.isInteger(n))throw new Error(String(date)+': non-integer '+k);
   out[k]=n;
  }
  if(out.gcTotal===null&&out.asmTotal===null)throw new Error(String(date)+': no process totals');
  for(const prefix of ['gc','asm']){
   const total=out[prefix+'Total'],ot=out[prefix+'OT'],hc=out[prefix+'HC'],hours=out[prefix+'Hours'];
   if(total!==null){
    if(!isInt(total,0,20000)||!isInt(hc,1,1000)||!isNum(hours,.5,16))
      throw new Error(String(date)+': '+prefix+' requires valid total/HC/hours');
    if(ot!==null&&(!isInt(ot,0,Number(total))))throw new Error(String(date)+': invalid '+prefix+' OT');
    if(ot!==null&&Number(ot)>0&&(!isInt(out[prefix+'OTHC'],1,1000)||!isNum(out.otHours,.5,16)))
      throw new Error(String(date)+': '+prefix+' OT HC/hours missing');
   }
  }
  dayMap.set(String(date),out);return out;
 });
 const seen=new Set<string>(),groups=new Map<string,{total:number,ot:number,hasOT:boolean,hasTotal:boolean}>();
 const models=m.map(x=>{
  if(!x||typeof x!=='object'||Array.isArray(x))throw new Error('Invalid Excel model');
  const v=x as Record<string,unknown>,date=v.date,model=String(v.model||'').trim();
  if(!validDate(date)||!dayMap.has(String(date))||!new RegExp('^[A-Za-z0-9._+ /-]{1,70}$').test(model))
   throw new Error('Invalid Excel model/date: '+String(date)+' / '+model);
  const key=String(date)+'|'+model;if(seen.has(key))throw new Error('Duplicate Excel model '+key);seen.add(key);
  const out:Record<string,unknown>={date,model};
  for(const pfx of ['gc','asm']){
   const total=v[pfx+'Total'],ot=v[pfx+'OT'];
   if(total!==null&&total!==undefined&&!isInt(total,0,20000))throw new Error(key+': invalid model total');
   if(ot!==null&&ot!==undefined&&(!isInt(ot,0,20000)||total===null||total===undefined||Number(ot)>Number(total)))throw new Error(key+': invalid model OT');
   out[pfx+'Total']=total??null;out[pfx+'OT']=ot??null;
   if(total!==null&&total!==undefined){
    const gk=String(date)+'|'+pfx,g=groups.get(gk)||{total:0,ot:0,hasOT:false,hasTotal:false};
    g.total+=Number(total);g.hasTotal=true;if(ot!==null&&ot!==undefined){g.ot+=Number(ot);g.hasOT=true;}
    groups.set(gk,g);
   }
  }
  return out;
 });
 for(const [key,g] of groups){
  const [date,pfx]=key.split('|'),day=dayMap.get(date)!;
  if(g.hasTotal&&day[pfx+'Total']!==null&&g.total!==day[pfx+'Total'])
   throw new Error(date+' '+pfx+': model totals do not reconcile with daily');
  if(g.hasOT&&day[pfx+'OT']!==null&&g.ot!==day[pfx+'OT'])
   throw new Error(date+' '+pfx+': model OT does not reconcile with daily');
 }
 const quality=q.map(x=>{
  if(!x||typeof x!=='object'||Array.isArray(x))throw new Error('Invalid quality row');
  const v=x as Record<string,unknown>,out:Record<string,unknown>={};
  for(const k of ['page','type','area','areaVN','model','issue','descriptionVN','descriptionZH','affected','allocation','direct','senior','cause','caution']){
   const z=v[k];if(z===null||z===undefined){out[k]=null;continue;}
   if(['page','affected'].includes(k)){if(!isNum(z,0,1000000))throw new Error('Invalid quality count');out[k]=z;}
   else {if(typeof z!=='string'&&typeof z!=='number')throw new Error('Invalid quality field');out[k]=String(z).slice(0,1000);}
  }
  return out;
 });
 return {daily:days,models,quality,has_quality_sheet:p.has_quality_sheet};
}


/** IE Total Cycletime here is the SUM of manual standard seconds across stations,
 *  NOT the finished-pair line takt. No machine/wait time is included. */
function validateIE(raw:unknown):Record<string,unknown>{
 if(!raw||typeof raw!=='object'||Array.isArray(raw))throw new Error('Invalid IE standard');
 const r=raw as Record<string,unknown>;
 const model=String(r.model||'').trim().toUpperCase(),effectiveDate=String(r.effectiveDate||'');
 if(!/^[A-Z0-9._+\-/ ]{1,70}$/.test(model))throw new Error('Invalid IE model code');
 if(effectiveDate&&!validDate(effectiveDate))throw new Error('Invalid IE effective date');
 const name=String(r.name||''),notes=String(r.notes||'');
 if(name.length>120||notes.length>1000)throw new Error('IE notes/name too long');
 const gc=r.gcCycle===null||r.gcCycle===undefined||r.gcCycle===''?null:r.gcCycle;
 const asm=r.asmCycle===null||r.asmCycle===undefined||r.asmCycle===''?null:r.asmCycle;
 if(gc===null&&asm===null)throw new Error('At least one process manual-seconds standard is required');
 if(gc!==null&&!isNum(gc,0.001,300000)||asm!==null&&!isNum(asm,0.001,300000))
  throw new Error('Manual work-content seconds must be positive');
 return {model,name,effectiveDate,notes,gcCycle:gc,asmCycle:asm,standardKind:'manual-work-content',updatedAt:new Date().toISOString()};
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
 const viewerToken=request.headers.get('x-viewer-key')||'';
 const provided=adminToken||staffToken||viewerToken;
 if(provided.length<32||provided.length>256)return send(401,{error:'Invalid staff/manager link'},origin);
 const digest=await hashKey(provided);
 const {data:credential,error:authError}=await supabase.from('factory_link_credentials')
   .select('role').eq('key_hash',digest).eq('active',true).maybeSingle();
 if(authError){console.error('Auth lookup error',authError.code);return send(503,{error:'Authentication is unavailable'},origin);}
 const isAdmin=Boolean(adminToken)&&credential?.role==='admin';
 const isStaff=Boolean(staffToken)&&credential?.role==='staff';
 const isViewer=Boolean(viewerToken)&&credential?.role==='viewer';
 if(!isStaff&&!isAdmin&&!isViewer)return send(401,{error:'Invalid staff/manager link'},origin);
 const size=Number(request.headers.get('content-length')||'0');
 if(size>1_500_000)return send(413,{error:'Request too large'},origin);
 let body:Record<string,unknown>;
 try{
  const raw=await request.text();
  if(raw.length>1_500_000)return send(413,{error:'Request too large'},origin);
  body=JSON.parse(raw);
  if(!body||typeof body!=='object'||Array.isArray(body))throw new Error();
 }catch{return send(400,{error:'Invalid JSON'},origin);}
 const action=body.action;
 const planningResult=await planningAction(supabase,body,isAdmin,isViewer);
 if(planningResult)return send(planningResult.status,planningResult.body,origin);
 if(action!=='import_excel'&&action!=='upsert_ie_batch'&&size>32_000)return send(413,{error:'Request too large'},origin);
 if(action==='health')return send(200,{ok:true,role:isAdmin?'admin':isViewer?'viewer':'staff'},origin);
 if(action==='benchmark'){
  const date=body.production_date,process=String(body.process||''),models=body.models;
  if(!validDate(date)||!['gc','asm'].includes(process))
   return send(422,{error:'Invalid benchmark selection'},origin);
  if(!Array.isArray(models)||models.length>20||models.some(x=>typeof x!=='string'||x.length>70))
   return send(422,{error:'Invalid model selection'},origin);
  try{return send(200,await benchmark(supabase,String(date),process,[...new Set(models)].sort()),origin);}
  catch(e){console.error('Benchmark error');return send(500,{error:'Cannot calculate benchmark'},origin);}
 }
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
  return send(200,{ok:true,id:data.id,revision:data.revision,saved_at:data.updated_at,production_date:data.production_date,plant:'NBY',process:data.process},origin);
 }


 if(action==='import_excel'){
  if(!isAdmin)return send(403,{error:'Manager import permission required'},origin);
  let clean:Record<string,unknown>;
  try{clean=validateExcel(body.payload);}catch(e){return send(422,{error:String((e as Error).message)},origin);}
  const filenames=body.filenames;
  if(!Array.isArray(filenames)||filenames.length<1||filenames.length>10
    ||filenames.some(x=>typeof x!=='string'||x.trim().length<1||x.length>120))
    return send(422,{error:'Invalid file names'},origin);
  const {data,error}=await supabase.rpc('import_factory_excel',{
   p_payload:clean,p_filenames:filenames,p_credential_hash:digest
  });
  if(error){console.error('Excel import failed',error.code);return send(500,{error:'Cloud Excel import failed; no partial import was committed'},origin);}
  return send(200,{...data,ok:true},origin);
 }
 if(action==='save_ie'){
  if(!isAdmin)return send(403,{error:'Only admin may update IE standards'},origin);
  let standard:Record<string,unknown>;
  try{standard=validateIE(body.standard);}catch(e){return send(422,{error:String((e as Error).message)},origin);}
  const {error}=await supabase.from('factory_ie_standards').upsert({
   plant:'NBY',model:standard.model,effective_date:standard.effectiveDate,
   standard,updated_at:new Date().toISOString()
  },{onConflict:'plant,model,effective_date'});
  if(error){console.error('IE save failed',error.code);return send(500,{error:'Cannot save IE standard'},origin);}
  return send(200,{ok:true,standard},origin);
 }
 if(action==='delete_ie'){
  if(!isAdmin)return send(403,{error:'Only admin may delete IE standards'},origin);
  const model=String(body.model||'').trim().toUpperCase(),effectiveDate=String(body.effectiveDate||'');
  if(!/^[A-Z0-9._+\-/ ]{1,70}$/.test(model)||effectiveDate&&!validDate(effectiveDate))
   return send(422,{error:'Invalid IE key'},origin);
  const {error}=await supabase.from('factory_ie_standards').delete().eq('plant','NBY')
   .eq('model',model).eq('effective_date',effectiveDate);
  if(error)return send(500,{error:'Cannot delete IE standard'},origin);
  return send(200,{ok:true},origin);
 }
 if(action==='upsert_ie_batch'){
  if(!isAdmin)return send(403,{error:'Only admin may migrate IE standards'},origin);
  if(!Array.isArray(body.standards)||!body.standards.length||body.standards.length>100)
   return send(422,{error:'IE batch must contain 1–100 standards'},origin);
  let rows:Record<string,unknown>[];
  try{
   const keys=new Set<string>();
   rows=body.standards.map(x=>{
    const standard=validateIE(x),id=String(standard.model)+'|'+String(standard.effectiveDate);
    if(keys.has(id))throw new Error('Duplicate IE standard '+id);
    keys.add(id);
    return {plant:'NBY',model:standard.model,effective_date:standard.effectiveDate,
      standard,updated_at:new Date().toISOString()};
   });
  }catch(e){return send(422,{error:String((e as Error).message)},origin);}
  const {error}=await supabase.from('factory_ie_standards').upsert(rows,{onConflict:'plant,model,effective_date'});
  if(error){console.error('IE batch failed',error.code);return send(500,{error:'Cannot migrate IE standards'},origin);}
  return send(200,{ok:true,count:rows.length},origin);
 }
 if(action==='create_viewer'){
  if(!isAdmin)return send(403,{error:'Admin required'},origin);
  const label=typeof body.label==='string'?body.label.trim():'';
  if(label.length<2||label.length>60)return send(422,{error:'Viewer name must be 2-60 characters'},origin);
  const bytes=crypto.getRandomValues(new Uint8Array(32));
  const viewerKey=Array.from(bytes).map(x=>x.toString(16).padStart(2,'0')).join('');
  const hash=await hashKey(viewerKey);
  const {error}=await supabase.from('factory_link_credentials').insert({key_hash:hash,role:'viewer',active:true,label});
  if(error){console.error('Viewer link create failed',error.code);return send(500,{error:'Could not create viewer link'},origin);}
  return send(200,{ok:true,viewer_key:viewerKey,label},origin);
 }
 if(action==='list_viewers'){
  if(!isAdmin)return send(403,{error:'Admin required'},origin);
  const {data,error}=await supabase.from('factory_link_credentials')
   .select('key_hash,label,active,created_at').eq('role','viewer').order('created_at',{ascending:false}).limit(100);
  if(error)return send(500,{error:'Could not list viewers'},origin);
  return send(200,{ok:true,viewers:data||[]},origin);
 }
 if(action==='revoke_viewer'){
  if(!isAdmin)return send(403,{error:'Admin required'},origin);
  if(typeof body.key_hash!=='string'||!(/^[0-9a-f]{64}$/.test(body.key_hash)))return send(422,{error:'Invalid viewer ID'},origin);
  const {data,error}=await supabase.from('factory_link_credentials')
   .update({active:false}).eq('role','viewer').eq('key_hash',body.key_hash).select('key_hash');
  if(error)return send(500,{error:'Could not revoke viewer link'},origin);
  return send(200,{ok:true,revoked:Boolean(data?.length)},origin);
 }
 if(action==='dashboard'){
  if(!isAdmin&&!isViewer)return send(403,{error:'Manager access required'},origin);
  const [reports,archive,excelDays,excelQuality,excelLatest,ieStandards]=await Promise.all([
   supabase.from('production_entries')
    .select('plant,production_date,process,operator_name,output_total,normal_hc,normal_hours,ot_output,ot_hc,ot_hours,no_ot,models,notes,revision,updated_at')
    .eq('plant','NBY').order('production_date',{ascending:false}).limit(2000),
   supabase.from('factory_import_archives')
    .select('source_exported_at,snapshot')
    .eq('source_id','github-production-records-2026-10-14-092950z').maybeSingle(),
   supabase.from('factory_excel_days').select('production_date,daily,models,updated_at').eq('plant','NBY').order('production_date',{ascending:false}).limit(2000),
   supabase.from('factory_excel_quality').select('quality,updated_at').eq('plant','NBY').maybeSingle(),
   supabase.from('factory_excel_import_log').select('id,filenames,imported_at,daily_count,model_count,quality_count').eq('plant','NBY').order('imported_at',{ascending:false}).limit(1).maybeSingle(),
   supabase.from('factory_ie_standards').select('model,effective_date,standard,updated_at').eq('plant','NBY').order('model').limit(1000)
  ]);
  if(reports.error||archive.error||excelDays.error||excelQuality.error||excelLatest.error||ieStandards.error){
   console.error('Dashboard query failed',reports.error?.code||archive.error?.code);
   return send(500,{error:'Cloud dashboard data unavailable'},origin);
  }
  const legacy=archive.data?.snapshot||{};
  return send(200,{
   ok:true,rows:reports.data||[],truncated:(reports.data||[]).length===2000||(excelDays.data||[]).length===2000,
   legacy_quality:Array.isArray(legacy.quality)?legacy.quality:[],
   excel_days:excelDays.data||[],excel_quality:excelQuality.data||null,
   excel_latest:excelLatest.data||null,
   ie_standards:(ieStandards.data||[]).map((r:any)=>({...r.standard,updatedAt:r.updated_at})),
   legacy_ie_standards:Array.isArray(legacy.ieStandards)?legacy.ieStandards:[],
   archive_exported_at:archive.data?.source_exported_at||null,
   fetched_at:new Date().toISOString()
  },origin);
 }
 if(action==='list'){
  if(!isAdmin&&!isViewer)return send(403,{error:'Manager access required'},origin);
  const from=body.date_from,to=body.date_to;
  if(!validDate(from)||!validDate(to)||String(from)>String(to))return send(422,{error:'Invalid date range'},origin);
  const {data,error}=await supabase.from('production_entries').select('plant,production_date,process,operator_name,output_total,normal_hc,normal_hours,ot_output,ot_hc,ot_hours,no_ot,models,notes,revision,updated_at').gte('production_date',from).lte('production_date',to).order('production_date',{ascending:false}).limit(2000);
  if(error){console.error('List error',error.code);return send(500,{error:'Cannot load reports'},origin);}
  const {data:excel,error:excelError}=await supabase.from('factory_excel_days')
   .select('production_date,daily,models,updated_at').eq('plant','NBY').gte('production_date',from).lte('production_date',to).order('production_date',{ascending:false}).limit(2000);
  if(excelError)return send(500,{error:'Cannot load Excel cloud reports'},origin);
  return send(200,{ok:true,rows:data||[],excel_days:excel||[],truncated:(data||[]).length===2000||(excel||[]).length===2000},origin);
 }
 return send(400,{error:'Unknown action'},origin);
});
