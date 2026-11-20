const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const host={innerHTML:''},day={date:'2026-11-19',gcHC:55,asmHC:81};
const state={lang:'zh',daily:[day],models:[{date:'2026-11-19',model:'BBB-1698',gcNormal:100,asmNormal:100}],ieStandards:[{model:'BBB-1698',gcCycle:3156,asmCycle:3996}],demo:false};
const scheduled={date:'2026-12-01',rows:[
 {date:'2026-12-01',model:'BBB-1698',fg:'FG1',pairs:332,ieStages:[{name:'GCD 底加流程',seconds:3156},{name:'Thanh hinh 成型',seconds:3996}]},
 {date:'2026-12-01',model:'JDB-1705',fg:'FG2',pairs:81,ieStages:[{name:'GCD 底加流程',seconds:3265},{name:'Thanh hinh 成型',seconds:4790}]},
 {date:'2026-12-01',model:'SOB-1632',fg:'FG3',pairs:27,ieStages:[{name:'Thanh hinh 成型',seconds:5328}]}
]};
const ctx={state,window:{FactorySchedule:{selected:scheduled},FactoryIEPlanner:{calculate:()=>({valid:false})}},document:{getElementById:id=>id==='mixRecommendation'?host:{value:'2026-11-19'},addEventListener(){}},esc:x=>String(x),console};vm.createContext(ctx);
vm.runInContext(fs.readFileSync('mix-recommendation.js','utf8'),ctx);ctx.window.FactoryMixRecommendation.render();
assert(host.innerHTML.includes('JDB-1705'));assert(host.innerHTML.includes('SOB-1632'));assert(host.innerHTML.includes('新款／樣本不足'));
assert(host.innerHTML.includes('440'));assert(host.innerHTML.includes('73.5'));
assert(!host.innerHTML.includes('JDB-1705</td><td><strong>'));
console.log('PASS schedule includes new products with IE workload without invented historical recommendation');
