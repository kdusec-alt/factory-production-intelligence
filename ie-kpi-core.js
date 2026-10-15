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
  root.FactoryIEKPI=Object.freeze({standardAt,calculateProcess,calculateDay});
})(typeof window !== 'undefined' ? window : globalThis);
