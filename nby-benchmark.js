'use strict';
/* NBY-only factory label and historical man-hour production guidance. */
(()=>{
 const $=id=>document.getElementById(id);
 const t={
 vi:{plant:'Nhà máy',building:'Tòa nhà',line:'Chuyền',description:'Nhà máy NBY · chọn tòa nhà và chuyền',title:'Sản lượng dự kiến theo dữ liệu trước đây',expected:'Dự kiến ca chính',achievement:'Tỷ lệ đạt',difference:'Chênh lệch',none:'Chưa đủ dữ liệu lịch sử',reference:'Chỉ tham khảo',below:'Dưới mức lịch sử',near:'Gần mức lịch sử',above:'Trên mức lịch sử',plantSource:'Trung bình toàn nhà máy NBY (không dùng để đánh giá chuyền)',lineSource:'Trung bình cùng chuyền / công đoạn (mã giày có thể khác)',modelSource:'Trung bình cùng chuyền / công đoạn / nhóm mã giày',unknown:'Chưa xác nhận OT: chưa thể tính kết quả ca chính',hint:'Dự kiến = trung bình đôi/người-giờ × HC × giờ làm chính. Không đủ dữ liệu sẽ không tự đặt mục tiêu.',note:'Chỉ tham khảo, không phải tiêu chuẩn KPI chính thức.',samples:'ngày dữ liệu',unit:'đôi'},
 zh:{plant:'工廠',building:'棟別',line:'線別',description:'NBY工廠 · 選擇棟別及線別',title:'依歷史人時效率推算合理產量',expected:'正常班預期雙數',achievement:'預期達成率',difference:'與預期差異',none:'歷史資料不足',reference:'僅供參考',below:'低於歷史水準',near:'接近歷史水準',above:'高於歷史水準',plantSource:'NBY全廠同製程平均（不可用來考核個別線別）',lineSource:'同線同製程平均（型體可能不同，僅供參考）',modelSource:'同線、同製程、同型體組合平均',unknown:'OT尚未確認，無法判讀正常班實績',hint:'預期雙數＝歷史每人時平均產出 × 今日HC × 正常班工時。資料不足不會捏造目標。',note:'此為參考預估，並非正式績效考核。',samples:'筆歷史紀錄',unit:'雙'}
 };
 const language=()=>document.documentElement.lang==='zh'?'zh':'vi',tr=k=>t[language()][k];
 let baseline=null,sequence=0,timer=null;
 function localize(){
  const set=(selector,text)=>{const el=document.querySelector(selector);if(el)el.textContent=text;};
  set('label:has(#plant)>span',tr('plant'));set('label:has(#factory)>span',tr('building'));set('label:has(#line)>span',tr('line'));
  set('[data-t="locationDesc"]',tr('description'));
  for(const opt of $('factory').options)opt.textContent=(language()==='vi'?'Tòa ':'棟別 ')+opt.value;
  set('[data-t="benchmarkTitle"]',tr('title'));set('[data-t="benchmarkExpected"]',tr('expected'));
  set('[data-t="benchmarkAchievement"]',tr('achievement'));set('[data-t="benchmarkDifference"]',tr('difference'));
 }
 function intValue(id){const v=$(id)?.value||'';return /^\d+$/.test(v)?Number(v):null;}
 function render(){
  const box=$('benchmark');if(!box)return;const tag=$('benchmarkTag'),detail=$('benchmarkDetail');
  box.className='benchmark neutral';
  $('benchmarkExpected').textContent=$('benchmarkAchievement').textContent=$('benchmarkDifference').textContent='—';
  if(!baseline||!Number.isFinite(baseline.rate)||baseline.rate<=0){tag.textContent=tr('none');detail.textContent=tr('hint');return;}
  const hc=intValue('hc'),hours=Number($('hours').value),total=intValue('total');
  const mode=document.querySelector('[name="otMode"]:checked')?.value,ot=mode==='none'?0:mode==='yes'?intValue('otPairs'):null;
  const actual=total!==null&&ot!==null&&ot<=total?total-ot:null;
  const expected=hc>0&&hours>0?Math.round(baseline.rate*hc*hours):null;
  if(expected!==null)$('benchmarkExpected').textContent=expected.toLocaleString()+' '+tr('unit');
  tag.textContent=tr('reference');
  if(expected>0&&actual!==null){
   const ratio=actual/expected,delta=actual-expected;
   $('benchmarkAchievement').textContent=(ratio*100).toFixed(1)+'%';
   $('benchmarkDifference').textContent=(delta>0?'+':'')+delta.toLocaleString()+' '+tr('unit');
   if(baseline.source==='line_model'){
    const grade=ratio<0.9?'below':ratio>1.1?'above':'near';
    box.className='benchmark '+(grade==='below'?'low':grade==='above'?'high':'ready');tag.textContent=tr(grade);
   }
  }
  const source=baseline.source==='line_model'?tr('modelSource'):baseline.source==='line_process'?tr('lineSource'):tr('plantSource');
  detail.textContent=source+' · '+baseline.samples+' '+tr('samples')+' · '+Number(baseline.rate).toFixed(3)+' '+tr('unit')+'/HC·h · '+baseline.history_start+'–'+baseline.history_end+'. '+(mode==='unknown'?tr('unknown')+'. ':'')+(baseline.source==='line_model'?'':tr('note'));
 }
 const modelCodes=()=>[...document.querySelectorAll('[data-field="modelCode"]')].map(el=>el.value.trim().toUpperCase()).filter(Boolean).sort();
 function schedule(){clearTimeout(timer);baseline=null;render();const id=++sequence;
  timer=setTimeout(async()=>{
   const endpoint=String(window.FACTORY_CLOUD_CONFIG?.endpoint||''),key=new URLSearchParams(location.hash.slice(1)).get('key')||'';
   if(!endpoint||key.length<32)return;
   try{
    const response=await fetch(endpoint,{method:'POST',mode:'cors',cache:'no-store',headers:{'Content-Type':'application/json','X-Staff-Key':key},body:JSON.stringify({action:'benchmark',production_date:$('date').value,factory:$('factory').value,line:$('line').value,process:$('process').value,models:modelCodes()})});
    if(!response.ok)throw new Error('Benchmark unavailable');
    const data=await response.json();if(id!==sequence)return;baseline=data.ok?data:null;render();
   }catch{if(id!==sequence)return;baseline=null;render();}
  },350);
 }
 document.addEventListener('DOMContentLoaded',()=>{
  localize();render();schedule();
  for(const id of ['date','factory','line','process'])$(id).addEventListener('change',schedule);
  $('reportForm').addEventListener('input',e=>{render();if(e.target?.dataset?.field==='modelCode')schedule();});
  $('reportForm').addEventListener('change',render);
  $('addModel').addEventListener('click',()=>setTimeout(schedule,0));
  $('models').addEventListener('click',e=>{if(e.target?.classList?.contains('remove'))setTimeout(schedule,0);});
  $('lang').addEventListener('click',()=>queueMicrotask(()=>{localize();render();}));
 });
})();
