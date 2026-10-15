'use strict';
/* Read-only IE KPI dashboard. Uses existing persisted IE standards and daily records. */
(()=>{
 const id=x=>document.getElementById(x);
 const lang=(zh,vn,en)=>state.lang==='vn'?vn:state.lang==='en'?en:zh;
 const fmt=(n,d=1)=>Number.isFinite(n)?n.toLocaleString(state.lang==='vn'?'vi-VN':state.lang==='en'?'en-US':'zh-TW',{maximumFractionDigits:d,minimumFractionDigits:d}):'—';
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function render(){
  const target=id('ieKpiPanel');if(!target)return;
  const date=id('compStart')?.value,day=state.daily.find(x=>x.date===date);
  if(!day){target.innerHTML='<p>'+lang('所選日期沒有日報。','Không có báo cáo ngày.','No daily report for this date.')+'</p>';return;}
  const core=window.FactoryIEKPI;
  if(!core){target.textContent='IE calculation unavailable';return;}
  const headings='<tr><th>'+lang('製程／形體','Công đoạn / Mã','Process / Model')+'</th><th>'+lang('人員','Nhân viên','Member')+'</th><th>'+lang('IE 應產（雙）','Sản lượng IE','IE target (pairs)')+'</th><th>'+lang('實際（雙）','Thực tế','Actual (pairs)')+'</th><th>'+lang('差異（雙）','Chênh lệch','Variance (pairs)')+'</th><th>'+lang('達成率','Tỷ lệ đạt','Attainment')+'</th></tr>';
  const lines=[];
  for(const [p,name] of [['gc','Stockfit'],['asm','Assembly']]){
   const rows=state.models.filter(m=>m.date===date);
   // Actual output mix is the only available per-model allocation when no plan exists.
   // Never treat a retrospective mix as a pre-shift committed target.
   const calc=core.calculateProcess({day,models:rows,standards:state.ieStandards,process:p});
   if(!calc.valid){lines.push('<tr><td>'+name+'</td><td colspan="5">'+lang('無法計算：請核對 IE、正常班雙數及人員資料','Không đủ dữ liệu IE / sản lượng / nhân viên','Cannot calculate: check IE, regular output and Member records')+' ('+esc(calc.reasons.join(', '))+')</td></tr>');continue;}
   const plan=core.sharedLinePlan({date,process:p,hc:calc.hc,hours:calc.hours,standards:state.ieStandards,
     models:calc.details.filter(x=>x.actualPairs>0).map(x=>({model:x.model,weight:x.actualPairs})),mixSource:'ACTUAL_OUTPUT_MIX'});
   if(!plan.valid){lines.push('<tr><td>'+name+'</td><td colspan="5">'+esc(plan.reasons.join(', '))+'</td></tr>');continue;}
   const pairActual=new Map(calc.details.map(x=>[x.model,x.actualPairs]));
   const all=[{model:name,ieStandardPairs:plan.ieStandardPairs,actualPairs:calc.actualPairs,total:true},
    ...plan.details.map(x=>({...x,actualPairs:pairActual.get(x.model)}))];
   for(const row of all){
    const delta=row.actualPairs-row.ieStandardPairs,att=row.actualPairs/row.ieStandardPairs*100;
    lines.push('<tr><td>'+esc(row.model)+(row.total?' · '+lang('共線合計','Tổng chuyền','Line total'):'')+'</td><td>'+(row.total?fmt(calc.hc,0):'—')+'</td><td>'+fmt(row.ieStandardPairs)+'</td><td>'+fmt(row.actualPairs,0)+'</td><td>'+fmt(delta)+'</td><td>'+fmt(att)+'%</td></tr>');
   }
  }
  target.innerHTML='<div class="panel-head"><div><h3>'+lang('IE 標準產能與實際達成','Năng suất IE và thực tế','IE capacity vs actual')+'</h3><p>'+lang('依現有 IE 與當日實際型體比例回推；同線共用人員，兩製程不相加。此為100%人工工時理論值，非瓶頸驗證產能。','Theo IE và cơ cấu thực tế; dùng chung nhân viên, không cộng hai công đoạn.','Based on saved IE and actual mix; shared members, processes not added. 100% theoretical labor capacity.')+'</p></div></div><div class="table-scroll"><table class="data-table"><thead>'+headings+'</thead><tbody>'+lines.join('')+'</tbody></table></div>';
 }
 // app.js invokes this after each render and on cloud refresh.
 document.addEventListener('DOMContentLoaded',render);
 window.renderFactoryIEKPI=render;
})();
