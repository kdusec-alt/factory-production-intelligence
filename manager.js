'use strict';
/* NBY V1.9 manager: trilingual cloud reports, 8H normalization and evidence-based insights. */
(()=>{
 const $=id=>document.getElementById(id);
 const endpoint=String(window.FACTORY_CLOUD_CONFIG?.endpoint||'').trim();
 const adminKey=new URLSearchParams(location.hash.slice(1)).get('admin')||'';
 const messages={"zh":{"back":"完整智能儀表板","title":"NBY雲端產效管理","subtitle":"自動分析正常班8H產效、OT狀態及歷史參考。底加與成型獨立計算，不合併成品雙數。","loading":"正在讀取雲端…","compareTitle":"日期比較與8H產效","compareDesc":"正常班8H等效＝（總雙數－OT雙數）÷ 正常班工時 × 8；底加與成型分開比較。","dayA":"A日（基準）","dayB":"B日（比較）","reload":"↻ 更新雲端","csv":"↓ 匯出 CSV","insightTitle":"自動管理判讀","insightDesc":"對照所選B日的歷史8H參考值，辨識無OT達成、正常班效率變化與型體差異。僅供管理參考。","insightNote":"歷史參考不是正式IE／SAM標準；樣本不足、OT未確認或型體不同時不作武斷結論。","recordsTitle":"NBY每日製程紀錄","recordsDesc":"正常班完成雙數、8H等效、人時產出、OT狀態與型體明細。","gc":"底加 GCĐ","asm":"成型 TH","pairs":"雙","people":"人","rateUnit":"雙／人時","date":"日期","factory":"工廠","process":"製程","total":"總雙數","hc":"正常班HC","ot":"OT雙數","normal":"正常班雙數","equiv8":"正常班8H等效","rate":"人時產出","models":"型體","operator":"填報者","updated":"更新時間","change":"變化","metric":"指標","kpiGc8":"底加 B日8H等效","kpiGcRate":"底加 B日人時產出","kpiAsm8":"成型 B日8H等效","kpiAsmRate":"成型 B日人時產出","noData":"尚無當日填報","noDataDetail":"所選B日尚未填報這個製程，無法判讀。","unknown":"OT資料待確認","unknownDetail":"無法區分正常班與OT雙數，因此不判定正常班效率。","analyzing":"正在查詢歷史參考…","benchmarkError":"歷史參考讀取失敗","benchmarkErrorDetail":"可查看已填報的實際產量，但暫不給出歷史達成判定。","noHistory":"歷史樣本不足","noHistoryDetail":"有效歷史紀錄不足5筆，不自動產生產效目標或達成判定。","noOtMet":"無OT達到歷史8H參考","noOtBelow":"無OT但低於歷史8H參考","otMet":"正常班達歷史8H參考；OT另計","otBelow":"正常班低於歷史8H參考；OT另計","reference8":"歷史8H參考","actual8":"正常班8H等效","achievement":"相對歷史","gap":"8H差異","source":"依據","samples":"筆歷史資料","historicalProcess":"NBY同製程歷史總量","processHistory":"NBY同製程填報紀錄","modelHistory":"同製程同型體組合","caution":"僅為歷史平均參考，非正式IE／SAM考核標準。","mixCaution":"與A日型體組合不同，效率變化不能直接視為同型體改善或退步。","fallbackCaution":"參考資料並非同型體組合，不適合直接作個別型體考核。","hoursNote":"依實際正常班工時換算8H，並非當日實際完成雙數。","trendUp":"較A日人時效率上升","trendDown":"較A日人時效率下降","trendFlat":"與A日人時效率大致持平，變化","noOT":"無OT","yesOT":"有OT","pendingOT":"待確認","readSuccess":"雲端讀取成功","records":"筆製程紀錄","readError":"讀取失敗：","missingKey":"雲端尚未設定或未使用主管專用連結。","tooMany":"已達2000筆上限，請注意資料範圍","review":"建議確認型體、HC、停機及返修紀錄，不直接推斷原因。","noOtPraise":"正常班不依賴OT即可達到歷史參考，屬正向表現。","otSeparate":"OT雙數不列入正常班人時效率。","highAbove":"正常班高於歷史參考至少10%，可檢視是否有可複製的良好做法。","lowBelow":"正常班低於歷史參考超過10%，建議優先追蹤。"},"en":{"back":"Full intelligence dashboard","title":"NBY cloud productivity management","subtitle":"Automatic review of 8-hour regular-shift productivity, overtime and historical references. Stockfit and Assembly are assessed separately.","loading":"Loading cloud reports…","compareTitle":"Date comparison and 8H productivity","compareDesc":"8H equivalent = (total pairs − OT pairs) ÷ regular-shift hours × 8. Stockfit and Assembly are compared separately.","dayA":"Day A (baseline)","dayB":"Day B (comparison)","reload":"↻ Refresh cloud","csv":"↓ Export CSV","insightTitle":"Automatic management insights","insightDesc":"Compare Day B against its historical 8H reference, recognizing no-OT achievement, productivity changes and model-mix differences.","insightNote":"Historical averages are not official IE/SAM standards. No definitive verdict is made with missing history, unknown OT or noncomparable models.","recordsTitle":"NBY daily process records","recordsDesc":"Regular-shift pairs, 8H equivalent, productivity, OT status and model breakdown.","gc":"Stockfit GCĐ","asm":"Assembly TH","pairs":"pairs","people":"people","rateUnit":"pairs/person-hour","date":"Date","factory":"Factory","process":"Process","total":"Total pairs","hc":"Regular HC","ot":"OT pairs","normal":"Regular-shift pairs","equiv8":"Regular 8H equivalent","rate":"Productivity","models":"Models","operator":"Reported by","updated":"Updated at","change":"Change","metric":"Metric","kpiGc8":"Stockfit Day B 8H equivalent","kpiGcRate":"Stockfit Day B productivity","kpiAsm8":"Assembly Day B 8H equivalent","kpiAsmRate":"Assembly Day B productivity","noData":"No report for this day","noDataDetail":"No Day B report exists for this process. No assessment can be made.","unknown":"OT not confirmed","unknownDetail":"Regular-shift and OT pairs cannot be separated, so productivity is not assessed.","analyzing":"Checking historical reference…","benchmarkError":"Historical reference unavailable","benchmarkErrorDetail":"Actual output is still shown, but no historical achievement verdict is made.","noHistory":"Insufficient history","noHistoryDetail":"Fewer than 5 valid historical records. No productivity target or pass/fail result is inferred.","noOtMet":"No OT: meets historical 8H reference","noOtBelow":"No OT: below historical 8H reference","otMet":"Regular shift meets 8H reference; OT separate","otBelow":"Regular shift below 8H reference; OT separate","reference8":"Historical 8H reference","actual8":"Regular 8H equivalent","achievement":"Vs. history","gap":"8H gap","source":"Based on","samples":"historical days","historicalProcess":"NBY process-wide history","processHistory":"Prior NBY reports, same process","modelHistory":"Same process and model-code mix","caution":"Historical reference only; not an official IE/SAM performance standard.","mixCaution":"The model mix differs from Day A. Productivity change is not a like-for-like model comparison.","fallbackCaution":"Reference data may have a different model mix; do not use it as a model-specific performance KPI.","hoursNote":"Normalized from actual regular-shift hours; this is not the number of pairs physically completed.","trendUp":"Person-hour productivity rose vs. Day A by","trendDown":"Person-hour productivity fell vs. Day A by","trendFlat":"Broadly flat vs. Day A; person-hour productivity changed by","noOT":"No OT","yesOT":"OT reported","pendingOT":"Unconfirmed","readSuccess":"Cloud reports loaded","records":"process records","readError":"Load failed: ","missingKey":"Cloud is not configured or the manager-only link is missing.","tooMany":"2,000-record limit reached; narrow the date range","review":"Review model mix, HC, downtime and rework before drawing conclusions.","noOtPraise":"The regular shift met the historical reference without overtime.","otSeparate":"OT pairs are excluded from regular-shift productivity.","highAbove":"Regular-shift productivity is at least 10% above the historical reference; review repeatable good practices.","lowBelow":"Regular-shift productivity is over 10% below the historical reference; prioritize follow-up."},"vi":{"back":"Bảng phân tích đầy đủ","title":"Quản lý hiệu suất NBY trên đám mây","subtitle":"Tự động phân tích hiệu suất ca chính quy đổi 8 giờ, OT và dữ liệu lịch sử. GCĐ và TH được đánh giá riêng.","loading":"Đang tải dữ liệu…","compareTitle":"So sánh ngày và hiệu suất 8H","compareDesc":"Sản lượng 8H = (tổng đôi − đôi OT) ÷ giờ ca chính × 8. GCĐ và TH được so sánh riêng.","dayA":"Ngày A (gốc)","dayB":"Ngày B (so sánh)","reload":"↻ Tải lại","csv":"↓ Xuất CSV","insightTitle":"Nhận định quản lý tự động","insightDesc":"So sánh ngày B với mốc 8H lịch sử, nhận biết đạt không OT, biến động năng suất và khác biệt mã giày.","insightNote":"Mốc lịch sử không phải định mức IE/SAM chính thức. Không kết luận khi thiếu dữ liệu, chưa rõ OT hoặc mã giày khác nhau.","recordsTitle":"Báo cáo công đoạn NBY hằng ngày","recordsDesc":"Đôi ca chính, sản lượng quy đổi 8H, năng suất, tình trạng OT và chi tiết mã giày.","gc":"Gia công đế GCĐ","asm":"Thành hình TH","pairs":"đôi","people":"người","rateUnit":"đôi/người-giờ","date":"Ngày","factory":"Nhà máy","process":"Công đoạn","total":"Tổng đôi","hc":"HC ca chính","ot":"Đôi OT","normal":"Đôi ca chính","equiv8":"Quy đổi 8H","rate":"Năng suất","models":"Mã giày","operator":"Người nhập","updated":"Cập nhật","change":"Thay đổi","metric":"Chỉ số","kpiGc8":"GCĐ ngày B quy đổi 8H","kpiGcRate":"GCĐ ngày B năng suất","kpiAsm8":"TH ngày B quy đổi 8H","kpiAsmRate":"TH ngày B năng suất","noData":"Chưa có báo cáo","noDataDetail":"Chưa có dữ liệu ngày B cho công đoạn này, không thể đánh giá.","unknown":"Chưa xác nhận OT","unknownDetail":"Chưa tách được đôi ca chính và đôi OT nên không đánh giá năng suất.","analyzing":"Đang tra cứu dữ liệu lịch sử…","benchmarkError":"Không tải được dữ liệu lịch sử","benchmarkErrorDetail":"Vẫn hiển thị sản lượng thực tế nhưng không kết luận đạt/chưa đạt.","noHistory":"Thiếu dữ liệu lịch sử","noHistoryDetail":"Ít hơn 5 báo cáo hợp lệ. Không tự đặt mốc hoặc đánh giá đạt/chưa đạt.","noOtMet":"Không OT: đạt mốc 8H lịch sử","noOtBelow":"Không OT: dưới mốc 8H lịch sử","otMet":"Ca chính đạt mốc 8H; OT tách riêng","otBelow":"Ca chính dưới mốc 8H; OT tách riêng","reference8":"Mốc lịch sử 8H","actual8":"Quy đổi ca chính 8H","achievement":"So với lịch sử","gap":"Chênh lệch 8H","source":"Nguồn","samples":"ngày dữ liệu","historicalProcess":"Lịch sử toàn công đoạn NBY","processHistory":"Báo cáo NBY cùng công đoạn","modelHistory":"Cùng công đoạn và nhóm mã giày","caution":"Chỉ là mức tham khảo, không phải định mức IE/SAM chính thức.","mixCaution":"Nhóm mã giày khác ngày A; không thể so sánh như cùng một mã giày.","fallbackCaution":"Dữ liệu tham khảo có thể khác mã giày; không dùng để đánh giá KPI từng mã.","hoursNote":"Đã quy đổi từ giờ ca chính thực tế, không phải số đôi hoàn thành thực tế.","trendUp":"Năng suất người-giờ tăng so với ngày A","trendDown":"Năng suất người-giờ giảm so với ngày A","trendFlat":"Năng suất gần như ổn định so với ngày A, thay đổi","noOT":"Không OT","yesOT":"Có OT","pendingOT":"Chưa rõ","readSuccess":"Đã tải dữ liệu đám mây","records":"báo cáo công đoạn","readError":"Tải thất bại: ","missingKey":"Chưa cấu hình đám mây hoặc thiếu liên kết riêng của quản lý.","tooMany":"Đã đạt giới hạn 2.000 báo cáo","review":"Cần kiểm tra mã giày, HC, dừng máy và sửa hàng trước khi kết luận nguyên nhân.","noOtPraise":"Ca chính đạt mức lịch sử mà không cần tăng ca.","otSeparate":"Đôi OT không được tính vào năng suất ca chính.","highAbove":"Năng suất ca chính cao hơn mốc lịch sử ít nhất 10%; có thể xem xét cách làm tốt để áp dụng lại.","lowBelow":"Năng suất ca chính thấp hơn mốc lịch sử trên 10%; cần ưu tiên theo dõi."}};
 const supported=['zh','en','vi'];
 let preference='';try{preference=localStorage.getItem('nby-manager-language')||'';}catch{}
 const queryLang=new URLSearchParams(location.search).get('lang');
 let lang=supported.includes(queryLang)?queryLang:supported.includes(preference)?preference:'zh';
 const t=k=>messages[lang][k]||k;
 const locale=()=>lang==='zh'?'zh-TW':lang==='vi'?'vi-VN':'en-US';
 const fmt=(n,d=0)=>typeof n==='number'&&Number.isFinite(n)?n.toLocaleString(locale(),{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const today=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);};
 const isKnown=r=>r&&(r.no_ot===true&&r.ot_output===0||Number.isInteger(r.ot_output)&&r.ot_output>=0&&r.ot_output<=r.output_total);
 const normal=r=>isKnown(r)?Number(r.output_total)-Number(r.ot_output):null;
 const productivity=r=>{const pairs=normal(r),hc=Number(r?.normal_hc),hours=Number(r?.normal_hours);return pairs!==null&&hc>0&&hours>0?pairs/(hc*hours):null;};
 const equivalent8=r=>{const pairs=normal(r),hours=Number(r?.normal_hours);return pairs!==null&&hours>0?pairs/hours*8:null;};
 const rowFor=(date,process)=>rows.find(r=>r.production_date===date&&r.process===process)||null;
 const modelCodes=r=>Array.isArray(r?.models)?r.models.map(m=>String(m.code||'').trim().toUpperCase()).filter(Boolean).sort():[];
 const sameModels=(a,b)=>{const x=modelCodes(a),y=modelCodes(b);return x.length===y.length&&x.every((v,i)=>v===y[i]);};
 const delta=(a,b)=>typeof a==='number'&&a!==0&&Number.isFinite(a)&&typeof b==='number'&&Number.isFinite(b)?(b/a-1)*100:null;
 let rows=[],loading=false,benchmarks={},benchmarkState='idle',benchmarkSeq=0;
 const status=(ok,message)=>{$('status').className='status '+(ok?'ok':'error');$('statusText').textContent=message;};
 function localize(){document.documentElement.lang=lang==='zh'?'zh-Hant':lang;$('lang').value=lang;try{localStorage.setItem('nby-manager-language',lang);}catch{}
  document.querySelectorAll('[data-t]').forEach(el=>el.textContent=t(el.dataset.t));render();}
 function render(){
  const a=$('dateA').value,b=$('dateB').value;
  const ga=rowFor(a,'gc'),gb=rowFor(b,'gc'),aa=rowFor(a,'asm'),ab=rowFor(b,'asm');
  const cards=[[t('kpiGc8'),equivalent8(gb),t('pairs'),0],[t('kpiGcRate'),productivity(gb),t('rateUnit'),3],[t('kpiAsm8'),equivalent8(ab),t('pairs'),0],[t('kpiAsmRate'),productivity(ab),t('rateUnit'),3]];
  $('kpis').innerHTML=cards.map(x=>'<div class="kpi"><small>'+esc(x[0])+'</small><strong>'+fmt(x[1],x[3])+'</strong><p>'+esc(x[2])+' · '+esc(b)+'</p></div>').join('');
  const comparison=[['gc',ga,gb],['asm',aa,ab]].flatMap(([process,oldRow,newRow])=>
   [['normal',normal(oldRow),normal(newRow),t('pairs'),0],['hc',oldRow?Number(oldRow.normal_hc):null,newRow?Number(newRow.normal_hc):null,t('people'),0],['equiv8',equivalent8(oldRow),equivalent8(newRow),t('pairs'),0],['rate',productivity(oldRow),productivity(newRow),t('rateUnit'),3],['ot',isKnown(oldRow)?Number(oldRow.ot_output):null,isKnown(newRow)?Number(newRow.ot_output):null,t('pairs'),0]]
    .map(([metric,v1,v2,unit,precision])=>{const d=delta(v1,v2);return '<tr><td>'+esc(t(process)+' · '+t(metric))+'</td><td>'+fmt(v1,precision)+' '+esc(unit)+'</td><td>'+fmt(v2,precision)+' '+esc(unit)+'</td><td class="'+(d===null?'muted':d>=0?'positive':'negative')+'">'+(d===null?'—':(d>0?'+':'')+fmt(d,1)+'%')+'</td></tr>';})).join('');
  $('compare').innerHTML='<table class="table"><thead><tr><th>'+esc(t('metric'))+'</th><th>'+esc(t('dayA'))+' '+esc(a)+'</th><th>'+esc(t('dayB'))+' '+esc(b)+'</th><th>'+esc(t('change'))+'</th></tr></thead><tbody>'+comparison+'</tbody></table>';
  const columns=['date','factory','process','total','normal','hc','ot','equiv8','rate','models','operator','updated'];
  const items=rows.slice().sort((x,y)=>y.production_date.localeCompare(x.production_date)||x.process.localeCompare(y.process));
  const tableRows=items.map(r=>{
   const values=[r.production_date,r.plant||'NBY',t(r.process),fmt(Number(r.output_total)),fmt(normal(r)),fmt(Number(r.normal_hc)),isKnown(r)?fmt(Number(r.ot_output)):t('pendingOT'),fmt(equivalent8(r)),fmt(productivity(r),3),
    Array.isArray(r.models)?r.models.map(m=>String(m.code||'')+':'+String(m.total||0)).join(' / '):'',r.operator_name,new Date(r.updated_at).toLocaleString(locale())];
   return '<tr>'+values.map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>';
  }).join('');
  $('records').innerHTML='<table class="table"><thead><tr>'+columns.map(c=>'<th>'+esc(t(c))+'</th>').join('')+'</tr></thead><tbody>'+tableRows+'</tbody></table>';
  renderInsights();
 }
 function renderInsights(){
  const date=$('dateB').value,prior=$('dateA').value;
  $('insights').innerHTML=['gc','asm'].map(process=>{
   const r=rowFor(date,process),a=rowFor(prior,process);
   const name=t(process);
   if(!r)return '<article class="insight-card"><h3>'+esc(name)+'</h3><strong class="muted">'+esc(t('noData'))+'</strong><p>'+esc(t('noDataDetail'))+'</p></article>';
   if(!isKnown(r))return '<article class="insight-card"><h3>'+esc(name)+'</h3><strong class="warn">'+esc(t('unknown'))+'</strong><p>'+esc(t('unknownDetail'))+'</p></article>';
   const rate=productivity(r),actual8=equivalent8(r);
   if(benchmarkState==='loading')return '<article class="insight-card"><h3>'+esc(name)+'</h3><strong class="muted">'+esc(t('analyzing'))+'</strong><p>'+esc(t('actual8'))+': '+fmt(actual8)+' '+esc(t('pairs'))+'</p></article>';
   const item=benchmarks[process];
   if(benchmarkState==='error'||item?.error)return '<article class="insight-card"><h3>'+esc(name)+'</h3><strong class="warn">'+esc(t('benchmarkError'))+'</strong><p>'+esc(t('benchmarkErrorDetail'))+'</p></article>';
   if(!item||!Number.isFinite(item.rate)||item.rate<=0||item.samples<5)return '<article class="insight-card"><h3>'+esc(name)+'</h3><strong class="muted">'+esc(t('noHistory'))+'</strong><p>'+esc(t('noHistoryDetail'))+' '+esc(t('actual8'))+': '+fmt(actual8)+' '+esc(t('pairs'))+'</p></article>';
   const expected8=item.rate*Number(r.normal_hc)*8,ratio=rate/item.rate,gap=actual8-expected8;
   const noOT=r.no_ot===true;
   const verdict=noOT?(ratio>=1?t('noOtMet'):t('noOtBelow')):(ratio>=1?t('otMet'):t('otBelow'));
   const color=ratio>=1?'positive':ratio<.9?'negative':'warn';
   const source=item.source==='nby_model'?t('modelHistory'):item.source==='nby_process'?t('processHistory'):t('historicalProcess');
   const notes=[];
   if(noOT&&ratio>=1)notes.push(t('noOtPraise'));
   if(ratio<1)notes.push(t('review'));
   if(!noOT)notes.push(t('otSeparate'));
   if(ratio>=1.10)notes.push(t('highAbove'));
   if(ratio<.90)notes.push(t('lowBelow'));
   if(a&&isKnown(a)){
    const change=delta(productivity(a),rate);
    if(change!==null){
     const label=change>5?t('trendUp'):change< -5?t('trendDown'):t('trendFlat');
     notes.push(label+' '+(change>0?'+':'')+fmt(change,1)+'%.');
    }
    if(!sameModels(a,r))notes.push(t('mixCaution'));
   }
   if(item.source!=='nby_model')notes.push(t('fallbackCaution'));
   if(Math.abs(Number(r.normal_hours)-8)>.001)notes.push(t('hoursNote'));
   notes.push(t('caution'));
   const metrics=[[t('reference8'),fmt(expected8)+' '+t('pairs')],[t('actual8'),fmt(actual8)+' '+t('pairs')],[t('achievement'),fmt(ratio*100,1)+'%'],[t('gap'),(gap>0?'+':'')+fmt(gap)+' '+t('pairs')]];
   const metricsHtml=metrics.map(([label,value])=>'<div><small>'+esc(label)+'</small><strong>'+esc(value)+'</strong></div>').join('');
   const evidence=source+' · '+item.samples+' '+t('samples')+' · '+item.history_start+'–'+item.history_end;
   return '<article class="insight-card"><h3>'+esc(name)+' <span class="insight-ot">'+esc(noOT?t('noOT'):t('yesOT'))+'</span></h3><strong class="'+color+'">'+esc(verdict)+'</strong><div class="insight-metrics">'+metricsHtml+'</div><p>'+esc(notes.join(' '))+'</p><small class="insight-source">'+esc(t('source')+': '+evidence)+'</small></article>';
  }).join('');
 }
 async function loadBenchmarks(){
  const id=++benchmarkSeq;benchmarks={};benchmarkState='loading';renderInsights();
  const date=$('dateB').value;
  const processes=['gc','asm'].filter(p=>rowFor(date,p)&&isKnown(rowFor(date,p)));
  if(!processes.length){benchmarkState='ready';renderInsights();return;}
  const results=await Promise.all(processes.map(async process=>{
   const r=rowFor(date,process);
   try{
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
    try{
     const response=await fetch(endpoint,{method:'POST',mode:'cors',cache:'no-store',signal:controller.signal,headers:{'Content-Type':'application/json','X-Admin-Key':adminKey},body:JSON.stringify({action:'benchmark',production_date:date,process,models:modelCodes(r)})});
     if(!response.ok)throw new Error('HTTP '+response.status);
     const data=await response.json();if(!data.ok)throw new Error('Benchmark failed');
     return [process,data];
    }finally{clearTimeout(timeout);}
   }catch{return [process,{error:true}];}
  }));
  if(id!==benchmarkSeq||date!==$('dateB').value)return;
  benchmarks=Object.fromEntries(results);benchmarkState='ready';renderInsights();
 }
 async function reload(){
  if(loading)return;loading=true;$('reload').disabled=true;$('status').className='status pending';$('statusText').textContent=t('loading');
  try{
   const start=new Date();start.setFullYear(start.getFullYear()-2);
   const from=start.toISOString().slice(0,10),to='2099-12-31';
   const response=await fetch(endpoint,{method:'POST',cache:'no-store',headers:{'Content-Type':'application/json','X-Admin-Key':adminKey},body:JSON.stringify({action:'list',date_from:from,date_to:to})});
   const obj=await response.json();if(!response.ok||!obj.ok)throw new Error(obj.error||'HTTP '+response.status);
   rows=obj.rows||[];const dates=[...new Set(rows.map(r=>r.production_date))].sort();
   if(dates.length){if(!dates.includes($('dateB').value))$('dateB').value=dates.at(-1);if(!dates.includes($('dateA').value))$('dateA').value=dates.at(-2)||dates.at(-1);}
   render();status(true,t('readSuccess')+' · '+rows.length+' '+t('records')+' · '+new Date().toLocaleString(locale())+(obj.truncated?' · '+t('tooMany'):''));
   void loadBenchmarks();
  }catch(e){status(false,t('readError')+e.message);}
  finally{loading=false;$('reload').disabled=false;}
 }
 function exportCsv(){
  if(!rows.length)return;
  const keys=['production_date','plant','process','output_total','normal_output','output_8h_equivalent','manhour_rate','normal_hc','normal_hours','ot_output','ot_hc','ot_hours','operator_name','models','notes','revision','updated_at'];
  const cell=value=>{let x=String(value??'');if(/^\s*[=+@-]/.test(x))x="'"+x;return '"'+x.replace(/"/g,'""')+'"';};
  const lines=rows.map(r=>keys.map(k=>{
   const value=k==='models'?JSON.stringify(r.models||[]):k==='normal_output'?normal(r):k==='output_8h_equivalent'?equivalent8(r):k==='manhour_rate'?productivity(r):r[k];
   return cell(value);
  }).join(','));
  const csv='\ufeff'+[keys.join(','),...lines].join('\r\n');
  const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');
  a.href=url;a.download='nby-process-cloud-'+today()+'.csv';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
 }
 function init(){
  const d=today();$('dateB').value=d;const yesterday=new Date(d+'T00:00:00Z');yesterday.setUTCDate(yesterday.getUTCDate()-1);$('dateA').value=yesterday.toISOString().slice(0,10);
  $('dateA').addEventListener('change',render);
  $('dateB').addEventListener('change',()=>{render();void loadBenchmarks();});
  $('reload').addEventListener('click',reload);$('csv').addEventListener('click',exportCsv);
  $('lang').addEventListener('change',()=>{lang=$('lang').value;localize();});
  localize();
  const dashboardLink=document.querySelector('.back-link');
  if(dashboardLink&&adminKey.length>=32)dashboardLink.href='./index.html#admin='+encodeURIComponent(adminKey);
  if(!endpoint||adminKey.length<32){status(false,t('missingKey'));return;}
  void reload();
  setInterval(()=>{if(document.visibilityState==='visible')void reload();},300000);
 }
 document.addEventListener('DOMContentLoaded',init);
})();
