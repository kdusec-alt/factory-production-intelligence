'use strict';
/* IE KPI calculation core. Pure functions; no browser state or network side effects.
 * IE cycle is total manual work seconds per pair, not line takt.
 * Process totals must NEVER be added together as finished footwear output.
 */
(function(root){
  const num = value => value === '' || value === null || value === undefined ? null :
    (Number.isFinite(Number(value)) ? Number(value) : null);
  const positive = value => Number.isFinite(value) && value > 0;
  const modelKey = value => String(value || '').trim().toUpperCase();
  function standardAt(standards, model, date){
    return (standards || []).filter(s => modelKey(s.model) === modelKey(model) &&
      (!s.effectiveDate || s.effectiveDate <= date))
      .sort((a,b) => String(b.effectiveDate || '').localeCompare(String(a.effectiveDate || '')))[0] || null;
  }
  function calculateProcess({day, models, standards, process}){
    if(!['gc','asm'].includes(process)) throw new Error('Invalid process');
    const hc=num(day?.[process+'HC']), hours=num(day?.[process+'Hours']);
    const reported=num(day?.[process+'Normal']);
    const rows=(models || []).filter(m => m.date === day?.date);
    const reasons=[], details=[]; let actual=0, workSeconds=0;
    if(!positive(hc) || !positive(hours)) reasons.push('MISSING_HC_OR_HOURS');
    if(reported===null || reported<0) reasons.push('MISSING_REPORTED_OUTPUT');
    if(!rows.length) reasons.push('MISSING_MODEL_BREAKDOWN');
    for(const m of rows){
      const pairs=num(m[process+'Normal']);
      const seconds=num(standardAt(standards,m.model,m.date)?.[process+'Cycle']);
      if(pairs===null || pairs<0){reasons.push('MISSING_MODEL_OUTPUT');continue;}
      actual+=pairs;
      if(pairs>0 && !positive(seconds)){reasons.push('MISSING_IE_STANDARD');continue;}
      workSeconds+=pairs*(seconds || 0);
      details.push({model:modelKey(m.model),actualPairs:pairs,manualSecondsPerPair:positive(seconds)?seconds:null});
    }
    if(reported!==null && Math.abs(reported-actual)>0.5) reasons.push('OUTPUT_MISMATCH');
    const unique=[...new Set(reasons)];
    const valid=unique.length===0 && actual>0 && workSeconds>0;
    const weightedSeconds=valid?workSeconds/actual:null;
    const standardPairs=valid?(hc*hours*3600/weightedSeconds):null;
    const efficiency=valid?(actual/standardPairs*100):null;
    return {process,date:day?.date||null,hc,hours,actualPairs:valid?actual:null,
      ieStandardPairs:standardPairs,variancePairs:valid?actual-standardPairs:null,
      variancePercent:valid?(actual-standardPairs)/standardPairs*100:null,
      efficiencyPercent:efficiency,weightedManualSeconds:weightedSeconds,
      manualWorkHours:valid?workSeconds/3600:null,modelMixBasis:'ACTUAL_OUTPUT_MIX',
      valid,reasons:unique,details};
  }
  function calculateDay({day,models,standards}){
    return {date:day?.date||null,
      stockfit:calculateProcess({day,models,standards,process:'gc'}),
      assembly:calculateProcess({day,models,standards,process:'asm'})};
  }

  /* Shared-line allocation: one HC pool, three models, weighted by planned pairs.
   * This is a labor-content theoretical capacity, not bottleneck/takt validation.
   * When no independent plan exists, actual mix may be used but must be labelled retrospective.
   */
  function sharedLinePlan({date,process,hc,hours=8,models,standards,mixSource='PLANNED'}){
    if(!['gc','asm'].includes(process)) throw new Error('Invalid process');
    const headcount=num(hc),shift=num(hours),reasons=[];
    if(!positive(headcount)||!positive(shift)) reasons.push('MISSING_HC_OR_HOURS');
    const entries=(models||[]).map(m=>{
      const weight=num(m.weight??m.plannedPairs);
      const sec=num(standardAt(standards,m.model,date)?.[process+'Cycle']);
      if(weight===null||weight<0) reasons.push('MISSING_MODEL_MIX');
      if(!positive(sec)) reasons.push('MISSING_IE_STANDARD');
      return {model:modelKey(m.model),weight,manualSecondsPerPair:sec};
    });
    if(!entries.length) reasons.push('MISSING_MODEL_MIX');
    const sum=entries.reduce((a,m)=>a+(positive(m.weight)?m.weight:0),0);
    if(!positive(sum)) reasons.push('MISSING_MODEL_MIX');
    if(new Set(entries.map(x=>x.model)).size!==entries.length) reasons.push('DUPLICATE_MODEL');
    if(reasons.length)return {valid:false,reasons:[...new Set(reasons)],process,date};
    const weightedSeconds=entries.reduce((a,m)=>a+m.weight/sum*m.manualSecondsPerPair,0);
    const totalPairs=headcount*shift*3600/weightedSeconds;
    const details=entries.map(m=>({model:m.model,share:m.weight/sum,
      ieStandardPairs:totalPairs*m.weight/sum,manualSecondsPerPair:m.manualSecondsPerPair}));
    return {valid:true,reasons:[],process,date,hc:headcount,hours:shift,
      ieStandardPairs:totalPairs,weightedManualSeconds:weightedSeconds,
      mixSource,details,assumption:'100_PERCENT_THEORETICAL_MANUAL_LABOR'};
  }
  root.FactoryIEKPI=Object.freeze({standardAt,calculateProcess,calculateDay,sharedLinePlan});
})(typeof window !== 'undefined' ? window : globalThis);
