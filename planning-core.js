'use strict';
/* Read-only management math. Plans/settings live separately from production state. */
(()=>{
 const defaults=Object.freeze({referenceGC:55,referenceASM:83,lowLoadPct:90,sufficientLoadPct:100,nearPlanPct:95,lowEfficiencyPct:90,effChangePoints:2,mixChangePct:5,imbalancePoints:20,absenceAlertPct:0,outputTolerancePct:10});
 const cache=new Map();let settings={...defaults};
 const numeric=x=>x===null||x===undefined||x===''?null:Number.isFinite(Number(x))?Number(x):null;
 const ie=()=>window.FactoryIEPlanner;
 function setRecords(records){for(const r of records||[]){cache.set(r.record_key,r);if(r.record_key==='settings')settings={...defaults,...r.payload};}}
 function reference(p){return p==='gc'?settings.referenceGC:settings.referenceASM;}
 function planWork(plan,p,date){
  if(!plan||plan.scope==='factory'||plan.scope!==p)return {valid:false,pairs:null,seconds:null,avg:null,errors:['NO_PROCESS_PLAN'],rows:[]};
  const rows=[],errors=[],seen=new Set();
  for(const m of plan.models||[]){const model=String(m.model||'').trim().toUpperCase(),pairs=numeric(m.plannedPairs);
   if(seen.has(model)||pairs===null||pairs<0||!Number.isInteger(pairs)){errors.push('INVALID_PLAN_MODEL');continue;}seen.add(model);
   const applicable=ie().applicable(p,model);if(!applicable){if(pairs>0)errors.push('NON_APPLICABLE_DISPATCH');continue;}
   const seconds=numeric(ie().standard(model,date)?.[p+'Cycle']);if(pairs>0&&!(seconds>0))errors.push('MISSING_PLAN_IE:'+model);
   rows.push({model,pairs,seconds,work:seconds>0?pairs*seconds:0});
  }
  const pairs=rows.reduce((s,m)=>s+m.pairs,0),seconds=rows.reduce((s,m)=>s+m.work,0);
  return {valid:!errors.length,pairs,seconds,avg:pairs>0&&!errors.length?seconds/pairs:null,rows,errors};
 }
 function metrics(date,p){
  const record=cache.get(date+'|'+p),plan=record?.payload||null,day=state.daily.find(d=>d.date===date),actual=day?ie().calculate(p,day):null;
  const plannedMembers=plan?.plannedMembers??null,referenceMembers=reference(p),expectedMembers=plannedMembers??referenceMembers;
  const actualMembers=actual?.members??null,planHours=plan?.hours??8;
  const availableMembers=actualMembers??expectedMembers,availableSeconds=availableMembers*planHours*3600;
  const pw=planWork(plan,p,date),planLoad=pw.valid&&availableSeconds>0?pw.seconds/availableSeconds:null;
  const dispatchAttainment=pw.valid&&pw.pairs>0&&actual?.valid?actual.actual/pw.pairs:null;
  const am=new Map((actual?.rows||[]).map(m=>[m.model,m.pairs]));
  const matchedAttainment=pw.valid&&pw.pairs>0&&actual?.valid?pw.rows.reduce((s,m)=>s+Math.min(m.pairs,am.get(m.model)||0),0)/pw.pairs:null;
  const absence=actualMembers!==null?Math.max(0,expectedMembers-actualMembers):null,absenceRate=absence!==null&&expectedMembers>0?absence/expectedMembers:null;
  const mixAvg=actual?.hasMix?actual.avg:pw.valid?pw.avg:null,mixSource=actual?.hasMix?'actual':pw.avg>0?'plan':null;
  const hours=actual?.hours??planHours;
  const plannedCapacity=mixAvg>0?expectedMembers*hours*3600/mixAvg:null,actualCapacity=mixAvg>0&&actualMembers!==null?actualMembers*hours*3600/mixAvg:null;
  const absenceLoss=plannedCapacity!==null&&actualCapacity!==null?Math.max(0,plannedCapacity-actualCapacity):null;
  const actualExtra=!!plan&&pw.valid&&(actual?.rows||[]).some(m=>m.pairs>0&&!pw.rows.some(r=>r.model===m.model&&r.pairs>0));
  return {date,p,record,plan,pw,actual,plannedMembers,expectedMembers,referenceMembers,attendanceConfirmed:plannedMembers!==null,actualMembers,availableMembers,planHours,availableSeconds,planLoad,loadUsesActual:actualMembers!==null,dispatchAttainment,matchedAttainment,actualExtra,absence,absenceRate,mixAvg,mixSource,plannedCapacity,actualCapacity,absenceLoss,standardHourGap:actual?.valid&&actual.availableHours!==null?actual.availableHours-actual.earnedHours:null};
 }
 function simulate(p,date,members,hours,mix){
  const rows=(mix||[]).map(m=>({model:m.model,plannedPairs:numeric(m.pairs)}));
  const pw=planWork({scope:p,models:rows},p,date),valid=Number.isInteger(members)&&members>=0&&Number.isFinite(hours)&&hours>=0&&hours<=24&&pw.valid&&pw.avg>0;
  const target=valid?members*hours*3600/pw.avg:null;
  return {valid,avg:pw.avg,target,workHours:pw.valid?pw.seconds/3600:null,errors:pw.errors,allocations:target!==null?pw.rows.map(r=>({model:r.model,target:target*r.pairs/pw.pairs})):[]};
 }
 function classify(m){
  const out=[],a=m.actual,hasActual=!!(a?.valid&&Number.isFinite(a.efficiency));
  if(!m.plan)out.push({code:'NO_PROCESS_PLAN',fact:true});
  else if(!m.pw.valid)out.push({code:'PLAN_INVALID',fact:true});
  else if(m.planLoad!==null){
   if(hasActual&&m.planLoad*100<settings.lowLoadPct&&m.matchedAttainment!==null&&m.matchedAttainment*100>=settings.nearPlanPct)out.push({code:'LOW_DISPATCH',fact:false});
   if(hasActual&&m.planLoad*100>=settings.sufficientLoadPct&&a.efficiency*100<settings.lowEfficiencyPct&&m.matchedAttainment!==null&&m.matchedAttainment*100<settings.nearPlanPct)out.push({code:'ENOUGH_DISPATCH_LOW_OUTPUT',fact:false});
  }
  if(m.absenceRate!==null&&m.absenceRate*100>settings.absenceAlertPct)out.push({code:m.attendanceConfirmed?'ABSENCE':'REFERENCE_STAFF_GAP',fact:m.attendanceConfirmed});
  if(!hasActual)out.push({code:'NO_ACTUAL_EFFICIENCY',fact:true});
  if(m.actualExtra)out.push({code:'EXTRA_MODELS',fact:true});
  return out;
 }
 function compareProcesses(gc,asm){
  if(!gc.pw.valid||!asm.pw.valid||gc.planLoad===null||asm.planLoad===null)return {status:'unverified',reason:'PROCESS_PLANS_REQUIRED'};
  const gap=(gc.planLoad-asm.planLoad)*100;
  return {status:Math.abs(gap)>=settings.imbalancePoints?'potential':'balanced',gap,process:gap>0?'gc':'asm'};
 }
 window.FactoryPlanning={defaults,cache,get settings(){return settings;},setRecords,reference,planWork,metrics,simulate,classify,compareProcesses};
})();
