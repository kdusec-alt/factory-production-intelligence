/** Independent plan/settings actions; called only after existing link authorization. */
export const settingLimits:Record<string,[number,number]>={referenceGC:[0,1000],referenceASM:[0,1000],lowLoadPct:[0,300],sufficientLoadPct:[0,300],nearPlanPct:[0,300],lowEfficiencyPct:[0,300],effChangePoints:[0,100],mixChangePct:[0,100],imbalancePoints:[0,300],absenceAlertPct:[0,100],outputTolerancePct:[0,100]};
const date=(s:any)=>typeof s==='string'&&/^20\d\d-\d\d-\d\d$/.test(s)&&!Number.isNaN(Date.parse(s+'T00:00:00Z'))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
export function validatePlanning(raw:any){
 if(!raw||typeof raw!=='object'||!date(raw.date)||!['factory','gc','asm'].includes(raw.scope))throw Error('Invalid planning date/scope');
 if(!Array.isArray(raw.models)||raw.models.length>100)throw Error('Invalid model list');
 const seen=new Set();const models=raw.models.map((m:any)=>{
  const model=String(m.model||'').trim().toUpperCase(),pairs=m.plannedPairs;
  if(!/^[A-Z0-9._+ /-]{1,70}$/.test(model)||seen.has(model)||!Number.isInteger(pairs)||pairs<0||pairs>20000)throw Error('Invalid/duplicate planned model');
  if(raw.scope==='gc'&&model==='SOB-1632'&&pairs>0)throw Error('SOB-1632 does not use Stockfit; cannot dispatch to GC');
  seen.add(model);return {model,plannedPairs:pairs};
 });
 const plannedMembers=raw.plannedMembers??null;
 if(plannedMembers!==null&&(!Number.isInteger(plannedMembers)||plannedMembers<0||plannedMembers>1000))throw Error('Invalid planned attendance');
 const hours=raw.hours??8;if(typeof hours!=='number'||!Number.isFinite(hours)||hours<0||hours>24)throw Error('Invalid planning hours');
 const notes=String(raw.notes||'');if(notes.length>1000)throw Error('Planning notes too long');
 return {date:raw.date,scope:raw.scope,plannedMembers:raw.scope==='factory'?null:plannedMembers,hours,models,notes};
}
export function validateSettings(raw:any){
 if(!raw||typeof raw!=='object')throw Error('Invalid settings');const out:Record<string,number>={};
 for(const [k,[min,max]] of Object.entries(settingLimits)){const v=raw[k];if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)throw Error('Invalid setting '+k);out[k]=v;}
 if(!Number.isInteger(out.referenceGC)||!Number.isInteger(out.referenceASM)||out.lowLoadPct>out.sufficientLoadPct)throw Error('Invalid staffing/load settings');
 return out;
}
export async function planningAction(db:any,body:any,isAdmin:boolean,isViewer:boolean){
 if(!['planning_read','planning_save','planning_settings_save'].includes(body.action))return null;
 if(!isAdmin&&!isViewer)return {status:403,body:{error:'Manager access required'}};
 if(body.action==='planning_read'){
  if(!date(body.date))return {status:422,body:{error:'Invalid planning date'}};
  const {data,error}=await db.from('factory_ie_management').select('record_key,payload,revision,updated_at').in('record_key',['settings',body.date+'|factory',body.date+'|gc',body.date+'|asm']);
  return error?{status:500,body:{error:'Cannot load planning'}}:{status:200,body:{ok:true,records:data||[]}};
 }
 if(!isAdmin)return {status:403,body:{error:'Only admin may save planning'}};
 let payload,key;try{if(body.action==='planning_save'){payload=validatePlanning(body.plan);key=payload.date+'|'+payload.scope;}else{payload=validateSettings(body.settings);key='settings';}}catch(e){return {status:422,body:{error:String((e as Error).message)}};}
 if(!Number.isInteger(body.expected_revision)||body.expected_revision<0)return {status:422,body:{error:'Expected revision required'}};
 const {data,error}=await db.rpc('save_factory_ie_management',{p_key:key,p_payload:payload,p_expected_revision:body.expected_revision});
 if(error)return {status:String(error.message).includes('PLANNING_REVISION_CONFLICT')?409:500,body:{error:String(error.message).includes('PLANNING_REVISION_CONFLICT')?'Planning changed on another device; reload before saving':'Could not save planning'}};
 return {status:200,body:{ok:true,record:data}};
}
