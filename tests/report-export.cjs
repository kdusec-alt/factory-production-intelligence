const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');
const state={demo:false,daily:[
 {date:'2026-10-01',gcNormal:100,gcHC:20,gcHours:8,asmNormal:120,asmHC:30,asmHours:8},
 {date:'2026-10-02',gcNormal:110,gcHC:20,gcHours:8,asmNormal:130,asmHC:30,asmHours:8},
 {date:'2026-10-03',gcNormal:140,gcHC:20,gcHours:8,asmNormal:140,asmHC:30,asmHours:8},
 {date:'2026-10-04',gcNormal:150,gcHC:20,gcHours:8,asmNormal:160,asmHC:30,asmHours:8},
 {date:'2026-10-05',gcNormal:999,gcHC:20,gcHours:8,asmNormal:999,asmHC:30,asmHours:8}
 ],models:[{date:'2026-10-02',model:'<S4>',gcNormal:110,asmNormal:130}]};
const calls=[];const calculate=(p,d,a,b,ieDate)=>{calls.push(ieDate||d.date);return {valid:d.date!=='2026-10-02',availableHours:d[p+'HC']*8,earnedHours:d[p+'Normal']*.8,efficiency:d[p+'Normal']*.8/(d[p+'HC']*8)}};
const analyze=(p,date,members)=>({members,best:{samples:5,planningEff:.65,total:200,allocation:[{model:'BBB-1698',pairs:200,share:1}]}});
const context={window:{},document:{addEventListener(){}},state};vm.runInNewContext(fs.readFileSync('report-export.js','utf8'),context);
const api=context.window.FactoryReportExport,before=JSON.stringify(state);
for(const lang of ['zh','en','vn']){
 const {html,report}=api.buildReport({state,start:'2026-10-01',end:'2026-10-04',lang,calculate,analyze});
 assert.equal(report.days.length,4);assert.equal(report.processes.gc.output,500);assert.equal(report.processes.gc.ieDays,3);assert.equal(report.processes.gc.missingIE,1);assert.equal(report.processes.gc.rate,500/640);
 assert.match(html,/BBB-1698/);assert.match(html,/bar-fill gc/);assert.match(html,/bar-fill asm/);assert.match(html,/&lt;S4&gt;/);assert.doesNotMatch(html,/>999</);assert.match(html,new RegExp(lang==='en'?'Early vs late':lang==='vn'?'So sánh nửa đầu':'前半與後半'));
}
assert.throws(()=>api.collect({state,start:'2026-10-05',end:'2026-10-01',lang:'zh',calculate,analyze}));
assert.throws(()=>api.collect({state,start:'2026-09-01',end:'2026-09-05',lang:'zh',calculate,analyze}));
assert.equal(JSON.stringify(state),before);assert(calls.includes('2026-10-04'),'phase uses same cutoff IE date');
console.log('PASS interval boundaries, separate processes, IE coverage, chart, phases, three languages, escaping and read-only state');
