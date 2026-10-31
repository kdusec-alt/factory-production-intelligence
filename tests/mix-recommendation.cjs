const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const state={lang:'zh',daily:[],models:[],ieStandards:[{model:'A',gcCycle:3600,asmCycle:3600},{model:'B',gcCycle:7200,asmCycle:7200},{model:'SOB-1632',gcCycle:null,asmCycle:5000}],demo:false};
const ctx={state,window:{},translations:{zh:{},vn:{},en:{}},document:{addEventListener(){}},console};vm.createContext(ctx);
for(const file of ['ie-planner.js','mix-recommendation.js'])vm.runInContext(fs.readFileSync(file,'utf8'),ctx);
const analyze=ctx.window.FactoryMixRecommendation.analyze;
function day(date,a,b,hc=10,hours=8){state.daily.push({date,gcHC:hc,gcHours:hours,gcNormal:a+b});state.models.push({date,model:'A',gcNormal:a,gcTotal:a},{date,model:'B',gcNormal:b,gcTotal:b});}
let checks=0;function check(name,fn){fn();console.log('PASS',name);checks++;}
day('2026-10-01',30,30);day('2026-10-02',10,10);day('2026-10-03',10,10);
day('2026-10-04',22,5);day('2026-10-05',22,5);day('2026-10-06',22,5);
check('one exceptional day cannot beat a repeatable conservative efficiency',()=>{const r=analyze('gc','2026-10-06',10);assert.equal(r.best.samples,3);assert(r.best.allocation.find(m=>m.model==='A').share>.7);assert.equal(r.best.planningEff,.4);});
check('integer quantities reconcile and never exceed labor budget',()=>{const b=analyze('gc','2026-10-06',10).best;assert.equal(b.total,b.allocation.reduce((s,m)=>s+m.pairs,0));assert(b.standardHours<=b.budgetHours);assert(b.allocation.every(m=>Number.isInteger(m.pairs)));});
check('insufficient support gives no forced recommendation',()=>assert.equal(analyze('gc','2026-10-06',10,{minDays:7}).best,null));
check('future records and records outside the rolling window do not leak',()=>{const before=JSON.stringify(analyze('gc','2026-10-06',10));day('2026-10-20',40,40);day('2026-01-01',40,40);assert.equal(JSON.stringify(analyze('gc','2026-10-06',10)),before);});
check('different attendance and non-8H days are excluded',()=>{day('2026-10-07',40,40,30);day('2026-10-08',40,40,10,4);const r=analyze('gc','2026-10-08',10);assert.equal(r.eligible,6);assert.equal(r.excluded,2);});
check('football has no stockfit contribution',()=>{state.models.push({date:'2026-10-06',model:'SOB-1632',gcTotal:null,gcNormal:null});assert(analyze('gc','2026-10-06',10).best.allocation.every(m=>m.model!=='SOB-1632'));});
check('missing IE does not become a zero-work model',()=>{state.ieStandards.pop();const saved=state.ieStandards.pop();assert.equal(analyze('gc','2026-10-06',10).best,null);state.ieStandards.push(saved);});
check('zero or invalid scenario and demo data do not generate quantities',()=>{assert.equal(analyze('gc','2026-10-06',0).best,null);assert.equal(analyze('gc','2026-10-06',10.5).best,null);state.demo=true;assert.equal(analyze('gc','2026-10-06',10).best,null);state.demo=false;});
check('scenario analysis does not mutate historical state',()=>{const original=JSON.stringify(state);analyze('gc','2026-10-06',9);analyze('gc','2026-10-06',12);assert.equal(JSON.stringify(state),original);});
check('all sample mixes lie within the displayed reference tolerance',()=>{const r=analyze('gc','2026-10-06',10);for(const g of r.groups)for(const m of g.allocation){assert(m.maxShare-m.share<=.100000001);assert(m.share-m.minShare<=.100000001);}});
console.log(checks+' mix recommendation checks passed');
