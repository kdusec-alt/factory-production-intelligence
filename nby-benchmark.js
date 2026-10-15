'use strict';
/* NBY V1.9: evidence-based 8H-equivalent productivity and OT-aware guidance.
   All verdicts are historical references, never official IE/SAM targets. */
(()=>{
 const $=id=>document.getElementById(id);
 const messages={
  vi:{
   title:'Phân tích hiệu suất theo chuẩn 8 giờ',expected:'Mốc tham chiếu 8H',actual:'Sản lượng quy đổi 8H',achievement:'So với mốc lịch sử',difference:'Chênh lệch 8H',
   none:'Thiếu dữ liệu lịch sử',loading:'Đang phân tích…',error:'Không tải được mốc lịch sử',above:'Cao hơn mức lịch sử',met:'Đạt mốc tham chiếu',near:'Gần mức tham chiếu',below:'Dưới mức tham chiếu',
   plantSource:'Trung bình lịch sử toàn công đoạn NBY',processSource:'Các báo cáo NBY cùng công đoạn',modelSource:'Cùng công đoạn và nhóm mã giày',
   unknown:'Chưa xác nhận OT: chưa thể đánh giá ca chính.',needInput:'Nhập HC, giờ làm, sản lượng và xác nhận OT để hệ thống đánh giá.',
   noHistory:'Chưa đủ ít nhất 5 ngày dữ liệu lịch sử. Không tự đặt mục tiêu hoặc đánh giá đạt/chưa đạt.',
   noOtMet:'Không tăng ca và ca chính đã đạt hoặc vượt mốc tham chiếu 8H.',noOtBelow:'Không tăng ca nhưng ca chính thấp hơn mốc tham chiếu 8H; nên kiểm tra mã giày, nhân lực và gián đoạn sản xuất.',
   otMet:'Ca chính đạt mốc tham chiếu 8H; sản lượng OT được tách riêng.',otBelow:'Ca chính thấp hơn mốc tham chiếu 8H; không tính sản lượng OT vào hiệu suất ca chính.',
   high:'Hiệu suất ca chính cao hơn mốc lịch sử ít nhất 10%.',nearHint:'Chênh lệch nhỏ hơn 10%; nên theo dõi xu hướng thêm.',
   hoursNote:'Sản lượng thực tế đã được quy đổi về 8H từ số giờ ca chính.',reference:'Mốc này chỉ mang tính tham khảo, không phải KPI/định mức IE chính thức.',
   noModel:'Khác mã giày có thể làm thay đổi năng suất; cần kiểm tra trước khi kết luận.',samples:'ngày dữ liệu',unit:'đôi',
   formula:'Mốc 8H = đôi/người-giờ lịch sử × HC × 8; thực tế 8H = (tổng đôi − đôi OT) ÷ giờ ca chính × 8.'
  },
  zh:{
   title:'8小時標準化產效智能判讀',expected:'歷史8H參考值',actual:'正常班8H等效',achievement:'相對歷史達成率',difference:'8H產量差異',
   none:'歷史樣本不足',loading:'正在分析…',error:'歷史資料讀取失敗',above:'高於歷史參考',met:'達到歷史參考',near:'接近歷史參考',below:'低於歷史參考',
   plantSource:'NBY同製程歷史總量平均',processSource:'NBY同製程填報平均',modelSource:'同製程且相同型體組合',
   unknown:'OT尚未確認，暫不判定正常班產效。',needInput:'請填寫HC、正常班工時、完成雙數及OT狀態，系統才會判讀。',
   noHistory:'有效歷史資料不足5天，不自行設定產效目標或判定達成。',
   noOtMet:'當日沒有加班，正常班已達到或超過歷史8H參考值，屬正向效率表現。',
   noOtBelow:'當日沒有加班，但正常班低於歷史8H參考值；建議確認型體、HC及停機／返修情況。',
   otMet:'正常班本身已達歷史8H參考值，OT產量另行列示，不混入正常班效率。',
   otBelow:'正常班低於歷史8H參考值；加班產量不能用來掩蓋正常班產效差距。',
   high:'正常班效率高於歷史參考至少10%。',nearHint:'差距在10%內，建議持續觀察趨勢。',
   hoursNote:'已依實際正常班工時換算8H等效，非實際完成雙數。',
   reference:'僅供管理參考，並非正式IE／SAM標準或考核KPI。',
   noModel:'歷史型體可能不同，不能直接歸因為效率好壞。',samples:'筆歷史紀錄',unit:'雙',
   formula:'歷史8H＝歷史加權雙／人時 × 當日HC × 8；實際8H＝（總雙數－OT雙數）÷ 正常班工時 × 8。'
  },
  en:{
   title:'Smart productivity review · 8-hour basis',expected:'Historical 8H reference',actual:'Actual 8H equivalent',achievement:'Vs. historical reference',difference:'8H output gap',
   none:'Insufficient history',loading:'Analyzing…',error:'Historical data unavailable',above:'Above historical reference',met:'Meets historical reference',near:'Near historical reference',below:'Below historical reference',
   plantSource:'NBY process-wide historical average',processSource:'Prior NBY reports for the same process',modelSource:'Same process and model-code mix',
   unknown:'OT is unconfirmed. Regular-shift productivity cannot be assessed.',needInput:'Enter HC, regular hours, output and OT status to enable the assessment.',
   noHistory:'Fewer than 5 valid historical days. No target or pass/fail verdict is inferred.',
   noOtMet:'No overtime was needed: regular-shift productivity met or exceeded the historical 8H reference.',
   noOtBelow:'No overtime, but regular-shift productivity is below the historical 8H reference. Review model mix, staffing and interruptions.',
   otMet:'The regular shift met the historical 8H reference; OT output is reported separately.',
   otBelow:'Regular-shift productivity is below the 8H reference. OT output is not counted toward regular-shift efficiency.',
   high:'Regular-shift productivity is at least 10% above the historical reference.',nearHint:'The gap is within 10%; monitor the trend.',
   hoursNote:'Output has been normalized to 8 hours from the actual regular-shift hours.',
   reference:'Reference only: not an official IE/SAM standard or performance KPI.',
   noModel:'Model mix may differ from history, so this is not a like-for-like model assessment.',samples:'historical days',unit:'pairs',
   formula:'8H reference = weighted historical pairs/person-hour × HC × 8; 8H actual = (total pairs − OT pairs) ÷ regular hours × 8.'
  }
 };
 const language=()=>{const v=document.documentElement.lang;return v==='zh-Hant'||v==='zh'?'zh':v==='en'?'en':'vi';};
 const tr=k=>messages[language()][k]||k;
 const number=n=>Math.round(n).toLocaleString(language()==='vi'?'vi-VN':language()==='zh'?'zh-TW':'en-US');
 let baseline=null,fetchState='loading',sequence=0,timer=null;
 function localize(){
  const set=(selector,value)=>{const el=document.querySelector(selector);if(el)el.textContent=value;};
  set('[data-t="benchmarkTitle"]',tr('title'));set('[data-t="benchmarkExpected"]',tr('expected'));
  set('[data-t="benchmarkActual"]',tr('actual'));set('[data-t="benchmarkAchievement"]',tr('achievement'));
  set('[data-t="benchmarkDifference"]',tr('difference'));
 }
 const numeric=id=>{const value=$(id)?.value||'';return /^\d+$/.test(value)?Number(value):null;};
 const codes=()=>[...document.querySelectorAll('[data-field="modelCode"]')].map(el=>el.value.trim().toUpperCase()).filter(Boolean).sort();
 function render(){
  const box=$('benchmark');if(!box)return;
  const tag=$('benchmarkTag'),detail=$('benchmarkDetail'),insight=$('benchmarkInsight');
  box.className='benchmark neutral';
  const hc=numeric('hc'),hours=Number($('hours').value),total=numeric('total');
  const mode=document.querySelector('[name="otMode"]:checked')?.value;
  const ot=mode==='none'?0:mode==='yes'?numeric('otPairs'):null;
  const valid=hc>0&&Number.isFinite(hours)&&hours>0&&total!==null&&ot!==null&&ot<=total;
  const actual8=valid?(total-ot)/hours*8:null;
  $('benchmarkActual8h').textContent=actual8===null?'—':number(actual8)+' '+tr('unit');
  $('benchmarkExpected').textContent=$('benchmarkAchievement').textContent=$('benchmarkDifference').textContent='—';
  if(fetchState==='loading'){tag.textContent=tr('loading');detail.textContent=tr('formula');insight.textContent=mode==='unknown'?tr('unknown'):tr('needInput');return;}
  if(fetchState==='error'){tag.textContent=tr('error');detail.textContent=tr('formula');insight.textContent=tr('noHistory');return;}
  if(!baseline||!Number.isFinite(baseline.rate)||baseline.rate<=0||baseline.samples<5){
   tag.textContent=tr('none');detail.textContent=tr('formula');insight.textContent=tr('noHistory');return;
  }
  const expected8=hc>0?baseline.rate*hc*8:null;
  if(expected8!==null)$('benchmarkExpected').textContent=number(expected8)+' '+tr('unit');
  const source=baseline.source==='nby_model'?tr('modelSource'):baseline.source==='nby_process'?tr('processSource'):tr('plantSource');
  const caveat=baseline.source==='nby_model'?'':tr('noModel')+' ';
  detail.textContent=source+' · '+baseline.samples+' '+tr('samples')+' · '+Number(baseline.rate).toFixed(3)+' '+tr('unit')+'/HC·h · '+baseline.history_start+'–'+baseline.history_end+'. '+tr('formula')+' '+caveat+tr('reference');
  if(!valid){tag.textContent=tr('none');insight.textContent=mode==='unknown'?tr('unknown'):tr('needInput');return;}
  const ratio=(total-ot)/(hc*hours*baseline.rate);
  const gap=actual8-expected8;
  $('benchmarkAchievement').textContent=(ratio*100).toFixed(1)+'%';
  $('benchmarkDifference').textContent=(gap>0?'+':'')+number(gap)+' '+tr('unit');
  const grade=ratio>=1.10?'above':ratio>=1?'met':ratio>=.90?'near':'below';
  tag.textContent=tr(grade);
  box.className='benchmark '+(ratio>=1?'ready':ratio<.9?'low':'neutral');
  let interpretation=mode==='none'?(ratio>=1?tr('noOtMet'):tr('noOtBelow')):(ratio>=1?tr('otMet'):tr('otBelow'));
  if(ratio>=1.1)interpretation+=' '+tr('high');
  else if(ratio>=.9&&ratio<1)interpretation+=' '+tr('nearHint');
  if(Math.abs(hours-8)>.001)interpretation+=' '+tr('hoursNote');
  insight.textContent=interpretation+' '+(baseline.source==='nby_model'?'':tr('reference'));
 }
 function schedule(){
  clearTimeout(timer);baseline=null;fetchState='loading';render();const id=++sequence;
  timer=setTimeout(async()=>{
   const endpoint=String(window.FACTORY_CLOUD_CONFIG?.endpoint||'');
   const key=new URLSearchParams(location.hash.slice(1)).get('key')||'';
   if(!endpoint||key.length<32){fetchState='error';render();return;}
   try{
    const response=await fetch(endpoint,{method:'POST',mode:'cors',cache:'no-store',headers:{'Content-Type':'application/json','X-Staff-Key':key},body:JSON.stringify({action:'benchmark',production_date:$('date').value,process:$('process').value,models:codes()})});
    if(!response.ok)throw new Error('Benchmark unavailable');
    const data=await response.json();if(id!==sequence)return;
    baseline=data.ok?data:null;fetchState='ready';render();
   }catch{if(id!==sequence)return;baseline=null;fetchState='error';render();}
  },350);
 }
 document.addEventListener('DOMContentLoaded',()=>{
  localize();render();schedule();
  for(const id of ['date','process'])$(id).addEventListener('change',schedule);
  $('reportForm').addEventListener('input',e=>{render();if(e.target?.dataset?.field==='modelCode')schedule();});
  $('reportForm').addEventListener('change',render);
  $('addModel').addEventListener('click',()=>setTimeout(schedule,0));
  $('models').addEventListener('click',e=>{if(e.target?.classList?.contains('remove'))setTimeout(schedule,0);});
  $('lang').addEventListener('change',()=>{localize();render();});
 });
})();
