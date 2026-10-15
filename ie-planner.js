'use strict';
/* V1.16 — IE manual-work-content 人員 ↔ output planner.
 * Seconds = sum of human work-content across stations per pair; NOT line takt.
 * Scenario values are estimates, never approved staffing/production targets.
 * This module is read-only and never mutates cloud or daily production records. */
(() => {
 const original=window.renderIEModels;
 const id=x=>document.getElementById(x);
 const L=(zh,vn,en)=>state.lang==='vn'?vn:state.lang==='en'?en:zh;
 const n=x=>x===null||x===undefined||String(x).trim()===''?null:Number.isFinite(Number(x))?Number(x):null;
 const positive=x=>Number.isFinite(x)&&x>0;
 const integer=x=>Number.isFinite(x)?Math.round(x).toLocaleString(state.lang==='vn'?'vi-VN':state.lang==='en'?'en-US':'zh-TW'):'—';
 const decimal=(x,d=1)=>Number.isFinite(x)?x.toLocaleString(state.lang==='vn'?'vi-VN':state.lang==='en'?'en-US':'zh-TW',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
 const safe=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const key=x=>String(x||'').trim().toUpperCase();
 const ieAt=(model,date)=>{
  const all=Array.isArray(state.ieStandards)?state.ieStandards:[];
  return all.filter(x=>key(x.model)===key(model)&&(!x.effectiveDate||x.effectiveDate<=date))
   .sort((a,b)=>String(b.effectiveDate||'').localeCompare(String(a.effectiveDate||'')))[0]||null;
 };
 function workload(p,day){
  const hours=n(day?.[p+'Hours']),dayPairs=n(day?.[p+'Normal']),hc=n(day?.[p+'人員']);
  const ms=state.models.filter(m=>m.date===day?.date);
  let pairsKnown=0,seconds=0;const unknown=[],missingIE=[],invalid=[];
  for(const m of ms){
   const pairs=n(m[p+'Normal']);
   if(pairs===null){unknown.push(key(m.model));continue;}
   if(pairs<0){invalid.push(key(m.model));continue;}
   pairsKnown+=pairs;
   if(!pairs)continue;
   const sec=n(ieAt(m.model,m.date)?.[p+'Cycle']);
   if(!positive(sec)){missingIE.push(key(m.model));continue;}
   seconds+=pairs*sec;
  }
  const reconciled=dayPairs!==null&&dayPairs>0&&Math.abs(pairsKnown-dayPairs)<0.5;
  const provisional=reconciled&&unknown.length>0;
  const valid=positive(hours)&&ms.length>0&&reconciled&&!invalid.length&&!missingIE.length&&positive(seconds);
  const reasons=[];
  if(!ms.length)reasons.push(L('缺少型體日報','Thiếu dữ liệu mã giày','Missing model records'));
  if(!positive(hours))reasons.push(L('正常班工時不足','Thiếu giờ ca chính','Missing regular-shift hours'));
  if(!positive(dayPairs))reasons.push(L('正常班雙數不足','Thiếu số đôi ca chính','Missing regular-shift pairs'));
  if(!reconciled&&positive(dayPairs))reasons.push(L('型體雙數與日報不一致','Sản lượng mã giày không khớp báo cáo','Model pairs do not reconcile'));
  if(missingIE.length)reasons.push(L('缺IE秒值：','Thiếu giây IE: ','Missing IE seconds: ')+[...new Set(missingIE)].join(', '));
  if(invalid.length)reasons.push(L('型體雙數異常','Số đôi không hợp lệ','Invalid model pairs'));
  if(provisional)reasons.push(L('部分型體未填雙數；已知型體合計等於日報，暫以其他型體0雙試算，請補登確認。',
    'Một số mã thiếu số đôi; tổng đã biết khớp báo cáo, tạm giả định các mã khác 0 đôi. Cần xác nhận.',
    'Some model pairs are blank; known pairs reconcile, so zero is assumed for the remaining models in this preview only. Confirm source data.'));
  return {p,date:day?.date||'',hours,dayPairs,hc:positive(hc)?hc:null,seconds,avgSeconds:valid?seconds/dayPairs:null,valid,provisional,reasons,unknown};
 }
 function historical(p,before){
  const days=[...state.daily].filter(d=>d.date<before).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,180);
  const values=[];let excluded=0;
  for(const day of days){
   const w=workload(p,day);
   if(!w.valid||w.provisional||!positive(w.hc))continue;
   const eff=w.seconds/(w.hc*w.hours*3600);
   if(eff>0&&eff<=1){values.push(eff);if(values.length===20)break;}else excluded++;
  }
  if(values.length<3)return {eff:null,samples:values.length,excluded};
  values.sort((a,b)=>a-b);const m=Math.floor(values.length/2);
  return {eff:values.length%2?values[m]:(values[m-1]+values[m])/2,samples:values.length,excluded};
 }
 const sessions={};
 let currentDate='',current={};
 function derive(p,day){
  const w=workload(p,day),history=historical(p,day.date);
  if(!w.valid)return {...w,history,ideal:null,reasonable:null,capacity:null};
  const ideal=Math.ceil(w.seconds/(w.hours*3600));
  const reasonable=history.eff?Math.ceil(w.seconds/(w.hours*3600*history.eff)):null;
  const capacity=w.hc!==null&&history.eff?Math.floor(w.hc*w.hours*3600*history.eff/w.avgSeconds):null;
  return {...w,history,ideal,reasonable,capacity};
 }
 const labelStatus=s=>!s.valid?L('資料待補','Thiếu dữ liệu','Incomplete data'):
  s.provisional?L('暫估・待確認','Ước tính tạm','Provisional'):
  s.history.eff?L('歷史效率推估','Theo hiệu suất lịch sử','History-based estimate'):
  L('情境試算','Mô phỏng','Scenario only');
 function makeSummary(s,p){
  const title=p==='gc'?'Stockfit / GCĐ':'Assembly / TH';
  if(!s.valid)return '<small>'+title+' · '+labelStatus(s)+'</small><b>—</b><p>'+safe(s.reasons.join('；'))+'</p>';
  const eff=s.history.eff;
  const headline=eff?integer(s.reasonable)+' 人員':integer(s.ideal)+' 人員*';
  const sub=eff?L('合理人員・歷史效率','人員 ước tính · hiệu suất lịch sử','Estimated 人員 · historical efficiency')+' '+decimal(eff*100,1)+'% ('+integer(s.history.samples)+L('天',' ngày',' days')+')':
   L('100%理論人力下限*；尚無可靠歷史效率','Mức 人員 tối thiểu ở 100%*; chưa đủ hiệu suất lịch sử','100% theoretical minimum*; no reliable historical efficiency');
  const cap=s.capacity!==null?integer(s.capacity)+' '+L('雙','đôi','pairs'):
   s.hc!==null?integer(Math.floor(s.hc*s.hours*3600*.8/s.avgSeconds))+'–'+integer(Math.floor(s.hc*s.hours*3600*.9/s.avgSeconds))+' '+L('雙（80–90%情境）','đôi (giả định 80–90%)','pairs (80–90% scenario)'):'—';
  return '<small>'+title+' · '+labelStatus(s)+'</small><b>'+headline+'</b><p>'+sub+'</p>'+
   '<p>'+L('實績','Thực tế','Actual')+' '+integer(s.dayPairs)+' '+L('雙','đôi','pairs')+
   ' · '+L('100%理論人員','人員 lý thuyết 100%','100% theoretical 人員')+' '+integer(s.ideal)+
   ' · '+L('實際人員','人員 thực tế','Actual 人員')+' '+(s.hc===null?'—':decimal(s.hc,0))+'</p>'+
   '<p>'+L('以現有人員推估產量','Sản lượng ước tính theo 人員 hiện có','Estimated output with actual 人員')+'：'+cap+'</p>'+
   (s.provisional?'<p class="ie-plan-warning">'+safe(s.reasons.join('；'))+'</p>':'');
 }
 const metric=(title,value,small)=>'<div class="ie-plan-metric"><small>'+title+'</small><strong>'+value+'</strong>'+(small?'<span>'+small+'</span>':'')+'</div>';
 function makeCard(p,s){
  const name=p==='gc'?'Stockfit / GCĐ':'Assembly / TH',eff=s.history.eff;
  const vHC=s.hc===null?'':String(s.hc),vPairs=positive(s.dayPairs)?String(s.dayPairs):'';
  const theoretical=s.valid?integer(s.ideal)+' 人員':'—';
  const historyHC=s.valid&&eff?integer(s.reasonable)+' 人員':'—';
  const target=s.valid&&eff?integer(s.capacity)+' '+L('雙','đôi','pairs'):'—';
  const note=!s.valid?s.reasons.join('；'):
   eff?L('採用過往','Dùng','Based on ')+integer(s.history.samples)+L('個完整歷史日的中位數效率',' ngày hợp lệ, hiệu suất trung vị',' complete historical days (median efficiency)')+' '+decimal(eff*100,1)+'%':
   L('歷史樣本不足：只顯示100%理論值與80–90%假設情境，不當作正式目標。',
     'Chưa đủ dữ liệu: chỉ hiển thị lý thuyết 100% và kịch bản 80–90%, không phải mục tiêu chính thức.',
     'Insufficient history: only 100% theory and 80–90% illustrative scenarios, not approved targets.');
  return '<section class="ie-plan-card" data-ie-process="'+p+'">'+
   '<div class="ie-plan-card-head"><h4>'+name+'</h4><span>'+labelStatus(s)+'</span></div>'+
   '<div class="ie-plan-metrics">'+
    metric(L('IE 100%理論人員','人員 lý thuyết 100%','100% theoretical 人員'),theoretical,L('依當日實際雙數','Theo sản lượng thực tế','For actual output'))+
    metric(L('IE推估合理人員','人員 ước tính','Estimated reasonable 人員'),historyHC,eff?decimal(eff*100,1)+'%':'—')+
    metric(L('實際正常班人員','人員 ca chính thực tế','Actual regular-shift 人員'),s.hc===null?'—':decimal(s.hc,0)+' 人員','')+
    metric(L('現有人數參考產量','Sản lượng tham chiếu','Reference output with actual 人員'),target,eff?L('同型體比例','Cùng cơ cấu mã','Same model mix'):'')+
   '</div>'+
   '<div class="ie-plan-inputs">'+
    '<label><span>'+L('投入人數 人員（可修改試算）','Nhân lực 人員 (có thể chỉnh)','Available 人員 (editable)')+'</span><input type="number" min="1" max="20000" step="1" inputmode="numeric" data-ie-input="hc" data-ie-process="'+p+'" value="'+safe(vHC)+'" placeholder="人員"></label>'+
    '<label><span>'+L('目標8H雙數（可修改試算）','Số đôi mục tiêu ca 8H','Target 8H pairs (editable)')+'</span><input type="number" min="1" max="1000000" step="1" inputmode="numeric" data-ie-input="pairs" data-ie-process="'+p+'" value="'+safe(vPairs)+'" placeholder="'+L('雙數','Đôi','Pairs')+'"></label>'+
   '</div><div class="ie-plan-answer" id="ie-plan-result-'+p+'"></div>'+
   '<p class="ie-plan-context">'+safe(note)+'</p>'+
   (s.valid?'<p class="ie-plan-formula">'+L('本日人工IE工作量','Khối lượng công IE','IE labor workload')+' '+decimal(s.seconds/3600,1)+
    ' '+L('人時','giờ công','labor-hours')+' · '+L('每雙加權人工秒值','Giây lao động bình quân/đôi','Weighted manual seconds/pair')+' '+decimal(s.avgSeconds,0)+'s'+
    ' · '+decimal(s.hours,1)+'H</p>':'')+
   (s.provisional?'<p class="ie-plan-warning">'+safe(s.reasons.join('；'))+'</p>':'')+
   '</section>';
 }
 function updateAnswers(p){
  const s=current[p],box=id('ie-plan-result-'+p);if(!box||!s)return;
  if(!s.valid){box.textContent=L('請先補齊IE與正常班型體資料，避免使用錯誤的人員或產量推估。','Cần bổ sung IE và dữ liệu mã giày ca chính.','Complete IE and regular-shift model data before estimating 人員/output.');return;}
  const hc=n(sessions[p]?.hc),pairs=n(sessions[p]?.pairs),eff=s.history.eff;
  const blocks=[];
  if(positive(pairs)&&Number.isInteger(pairs)){
   const work=pairs*s.avgSeconds;
   const ideal=Math.ceil(work/(s.hours*3600));
   let rhs='';
   if(eff){rhs=L('歷史效率合理人員','人員 theo hiệu suất lịch sử','History-based 人員')+' <strong>'+integer(Math.ceil(work/(s.hours*3600*eff)))+' 人員</strong>';}
   else rhs=L('80–90%假設人員','人員 giả định 80–90%','80–90% scenario 人員')+' <strong>'+
    integer(Math.ceil(work/(s.hours*3600*.9)))+'–'+integer(Math.ceil(work/(s.hours*3600*.8)))+' 人員</strong>';
   blocks.push('<div><span>'+L('生產','Sản xuất','To produce')+' <strong>'+integer(pairs)+' '+L('雙','đôi','pairs')+'</strong> → </span>'+rhs+
    '<small>'+L('100%理論下限','Tối thiểu lý thuyết 100%','100% theoretical minimum')+' '+integer(ideal)+' 人員</small></div>');
  }
  if(positive(hc)&&Number.isInteger(hc)){
   const max=Math.floor(hc*s.hours*3600/s.avgSeconds);
   let rhs='';
   if(eff)rhs=L('歷史效率參考產量','Sản lượng theo hiệu suất lịch sử','History-based output')+' <strong>'+
    integer(Math.floor(hc*s.hours*3600*eff/s.avgSeconds))+' '+L('雙','đôi','pairs')+'</strong>';
   else rhs=L('80–90%情境產量','Sản lượng giả định 80–90%','80–90% scenario output')+' <strong>'+
    integer(Math.floor(hc*s.hours*3600*.8/s.avgSeconds))+'–'+integer(Math.floor(hc*s.hours*3600*.9/s.avgSeconds))+' '+L('雙','đôi','pairs')+'</strong>';
   blocks.push('<div><span>'+L('投入','Nhân lực','With')+' <strong>'+integer(hc)+' 人員</strong> → </span>'+rhs+
    '<small>'+L('100%理論產量上限','Sản lượng tối đa lý thuyết 100%','100% theoretical labor-only ceiling')+' '+integer(max)+' '+L('雙','đôi','pairs')+'</small></div>');
  }
  box.innerHTML=blocks.length?blocks.join(''):
   L('輸入人數或目標雙數，系統會立即雙向計算。','Nhập 人員 hoặc số đôi mục tiêu để tính ngay.','Enter 人員 or target pairs for immediate two-way estimates.');
 }
 function renderPlanner(){
  const compare=periods().compare,summary=id('ieMixSummary');
  if(!summary)return;
  let holder=id('ieCapacityPlanner');
  if(!holder){holder=document.createElement('div');holder.id='ieCapacityPlanner';holder.className='ie-capacity-planner';summary.insertAdjacentElement('afterend',holder);
   holder.addEventListener('input',event=>{
    const el=event.target;if(!el.matches('input[data-ie-input]'))return;
    const p=el.dataset.ieProcess;if(!sessions[p])return;
    sessions[p][el.dataset.ieInput]=el.value;updateAnswers(p);
   });
  }
  if(compare.length!==1){
   holder.innerHTML='<p class="ie-plan-warning">'+L('目前僅支援單日8H型體組合的雙向試算。','Chỉ hỗ trợ mô phỏng một ngày.','Two-way estimates currently require a single comparison day.')+'</p>';return;
  }
  const day=compare[0];
  if(currentDate!==day.date){currentDate=day.date;delete sessions.gc;delete sessions.asm;}
  current={gc:derive('gc',day),asm:derive('asm',day)};
  const cards=summary.querySelectorAll('.ie-summary-card');
  if(cards.length>=2){cards[0].innerHTML=makeSummary(current.gc,'gc');cards[1].innerHTML=makeSummary(current.asm,'asm');}
  holder.innerHTML='<div class="ie-plan-heading"><h4>'+L('IE合理人力 × 8H產量雙向試算','Mô phỏng 人員 × sản lượng 8H theo IE','IE 人員 × 8H output planner')+'</h4>'+
   '<p>'+L('直接修改人員或目標雙數，即時計算；預設取當日日報。效率由歷史資料自動推估，沒有歷史效率就顯示情境區間。',
    'Sửa 人員 hoặc số đôi mục tiêu để tính ngay; mặc định dùng dữ liệu ngày. Hiệu suất lấy từ lịch sử, thiếu thì hiển thị khoảng giả định.',
    'Change 人員 or target pairs to recalculate instantly. Defaults to daily actuals; efficiency comes from validated history or labeled scenarios.')+'</p></div>'+
   '<div class="ie-plan-grid">'+makeCard('gc',current.gc)+makeCard('asm',current.asm)+'</div>'+
   '<p class="ie-plan-caution">'+L('注意：此為人工工作量與相同型體比例的線性推估，尚未包含線平衡、瓶頸、Pass 1/2、返修、等待與設備限制；不得直接作為裁員或正式產能承諾。',
    'Lưu ý: ước tính tuyến tính theo giờ công và cơ cấu mã giày; chưa tính cân bằng chuyền, nút thắt, Pass 1/2, sửa hàng và dừng chờ. Không dùng làm định biên chính thức.',
    'Labor-workload, same-mix linear estimates only. Line balance, bottlenecks, Pass 1/2, rework and downtime are not modeled; not an approved staffing or production commitment.')+'</p>';
  for(const p of ['gc','asm']){
   const s=current[p];
   if(!sessions[p])sessions[p]={hc:s.hc===null?'':String(s.hc),pairs:positive(s.dayPairs)?String(s.dayPairs):''};
   const hcInput=holder.querySelector('input[data-ie-process="'+p+'"][data-ie-input="hc"]');
   const pairsInput=holder.querySelector('input[data-ie-process="'+p+'"][data-ie-input="pairs"]');
   if(hcInput)hcInput.value=sessions[p].hc;
   if(pairsInput)pairsInput.value=sessions[p].pairs;
   updateAnswers(p);
  }
 }
 window.renderIEModels=function(){if(typeof original==='function')original();renderPlanner();};
 window.FactoryIEPlanner=Object.freeze({workload,historical,derive,renderPlanner});
})();
