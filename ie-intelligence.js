'use strict';
/* Mixed-model assessment uses earned standard labor, never raw pairs alone.
 * Daily mix targets are retrospective equivalents, not an independent schedule. */
(()=>{
 const L=(zh,vn,en)=>state.lang==='vn'?vn:state.lang==='en'?en:zh;
 const f=(x,d=1)=>Number.isFinite(x)?x.toLocaleString(state.lang==='vn'?'vi-VN':state.lang==='en'?'en-US':'zh-TW',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
 const change=x=>Number.isFinite(x)?(x>0?'+':'')+f(x*100,1)+'%':'—';
 function analyze(p,day,baseDay){
  const calc=window.FactoryIEPlanner.calculate;
  const b=calc(p,day),a=baseDay?calc(p,baseDay,null,null,day.date):null;
  const comparison=!!(b.valid&&a?.valid);
  const history=state.daily.filter(d=>d.date<day.date).sort((x,y)=>y.date.localeCompare(x.date)).map(d=>calc(p,d,null,null,day.date)).filter(x=>x.valid).slice(0,20);
  const efficiencies=history.map(x=>x.efficiency).sort((x,y)=>x-y),mid=Math.floor(efficiencies.length/2);
  const median=efficiencies.length>=3?(efficiencies.length%2?efficiencies[mid]:(efficiencies[mid-1]+efficiencies[mid])/2):null;
  const diagnostics=comparison?{
   rawPairsChange:b.actual/a.actual-1,
   rawRateChange:(b.actual/b.availableHours)/(a.actual/a.availableHours)-1,
   standardWorkChange:b.work/a.work-1,
   memberChange:b.members-a.members,
   inputHoursChange:b.availableHours/a.availableHours-1,
   averageSecondsChange:b.avg/a.avg-1,
   efficiencyPoints:(b.efficiency-a.efficiency)*100,
   mixFactor:a.avg/b.avg,
   efficiencyFactor:b.efficiency/a.efficiency,
   referencePairs:a.efficiency*b.availableHours*3600/b.avg
  }:null;
  const mapA=new Map((a?.rows||[]).map(m=>[m.model,m]));
  const models=b.rows.map(m=>{
   const old=mapA.get(m.model),work=m.pairs>0&&m.seconds>0?m.pairs*m.seconds/3600:0;
   const oldWork=old?.pairs>0&&old.seconds>0?old.pairs*old.seconds/3600:0;
   const records=state.models.filter(r=>r.model.trim().toUpperCase()===m.model&&r.date<day.date&&Number(r[p+'Normal'])>0&&r[p+'Normal']!==null).sort((x,y)=>y.date.localeCompare(x.date));
   const unique=[...new Map(records.map(r=>[r.date,r])).values()].slice(0,5);
   const avg=unique.length>=3?unique.reduce((sum,r)=>sum+r[p+'Normal'],0)/unique.length:null;
   return {...m,work,oldWork,workChange:comparison?work-oldWork:null,historySamples:unique.length,historyAvg:avg};
  });
  const currentCodes=new Set(b.rows.filter(m=>m.pairs>0).map(m=>m.model));
  const added=comparison?b.rows.filter(m=>m.pairs>0&&!(mapA.get(m.model)?.pairs>0)).map(m=>m.model):[];
  const removed=comparison?a.rows.filter(m=>m.pairs>0&&!currentCodes.has(m.model)).map(m=>m.model):[];
  const currentQuality=state.quality.filter(q=>q.date===day.date);
  return {p,a,b,comparison,diagnostics,historyCount:history.length,median,models,added,removed,currentQuality};
 }
 function renderProcess(result){
  const {p,a,b,comparison,diagnostics:d,models}=result,name=p==='gc'?'Stockfit / GCĐ':'Assembly / TH';
  const box=(title,desc,kind='info',details='')=>'<div class="insight insight--'+kind+'"><div class="insight-mark" aria-hidden="true">'+(kind==='negative'?'↓':kind==='positive'?'↑':'i')+'</div><div class="insight-body"><strong>'+esc(title)+'</strong><p>'+esc(desc)+'</p>'+details+'</div></div>';
  if(!b.valid)return box(name+' · '+L('資料不足，暫停IE達標判定','Thiếu dữ liệu, chưa đánh giá IE','Incomplete data: IE judgment withheld'),b.errors.join('；'),'caution');
  const short=b.availableHours-b.earnedHours;
  let html=box(name+' · '+(b.efficiency>=1?L('達到100% IE基準','Đạt chuẩn IE 100%','Meets 100% IE standard'):L('未達100% IE基準','Chưa đạt chuẩn IE 100%','Below 100% IE standard')),
   L('完成標準工作量 ','Giờ công chuẩn hoàn thành ','Earned standard work ')+f(b.earnedHours)+' / '+L('投入人時 ','Giờ công đầu vào ','Input labor-hours ')+f(b.availableHours)+L('，混線效率 ','; hiệu suất hỗn hợp ','; mixed-model efficiency ')+f(b.efficiency*100)+'%'+L('。標準人時差額 ','; chênh lệch giờ công ','; standard-hour gap ')+f(short)+L(' 人時；這是標準差額，不能直接認定為閒置、浪費或減員空間。',' giờ; không đồng nghĩa thời gian nhàn rỗi hoặc số người cần giảm.',' hours; this does not establish idle time, waste or surplus staffing.'),b.efficiency>=1?'positive':'negative');
  html+=box(name+' · '+L('8H雙數隨型體組合改變','Số đôi 8H thay đổi theo cơ cấu mã','8H output depends on model mix'),
   L('當日加權IE為 ','Giây IE bình quân ngày ','Daily weighted IE ')+f(b.avg,0)+L(' 秒／雙，',' giây/đôi; ',' s/pair; ')+f(b.members,0)+L(' 人×8H，同組合100% IE應產 ',' người × 8H, chuẩn cùng cơ cấu ',' Member × 8H gives a same-mix 100% IE target of ')+f(b.target8)+L(' 雙。',' đôi.',' pairs.')+(b.hours!==8?L('實際正常班為 ',' Giờ ca chính thực tế ',' Actual regular-shift hours ')+f(b.hours)+L('H，實際班應產 ','H, chuẩn ca thực tế ','H; actual-shift target ')+f(b.target)+L(' 雙；達成率依實際班工時判定。',' đôi; đánh giá theo giờ thực tế.',' pairs; attainment uses actual shift hours.'):'')+L('此為事後同組合換算，不把每天或每款設定為固定雙數，也不代表當日既定生產計畫。','Đây là quy đổi sau sản xuất, không phải kế hoạch cố định.','This is a retrospective mix equivalent, not a fixed daily or model production schedule.'));
  if(comparison){
   let verdict;
   if(d.rawRateChange<0&&d.efficiencyPoints>=-2)verdict=L('原始人時雙數下降，但IE工作量校正後效率未明顯下降；不能僅因雙數下降判定退步。','Đôi/giờ giảm nhưng hiệu suất IE sau hiệu chỉnh chưa giảm rõ; không kết luận chỉ từ số đôi.','Raw pairs per labor-hour fell, while IE-adjusted efficiency did not materially fall; raw pairs alone do not establish deterioration.');
   else if(d.efficiencyPoints<-2)verdict=d.memberChange>0?L('人員增加但混線IE效率下降，增員沒有帶來相應標準工作量；需確認換型、瓶頸、返修與WIP。','Tăng người nhưng hiệu suất IE giảm; kiểm tra đổi mã, nút thắt, sửa hàng và WIP.','Members increased while mixed-model IE efficiency fell; verify changeovers, bottlenecks, rework and WIP.'):L('排除型體秒值差異後，混線IE效率仍下降；需以現場紀錄確認原因。','Sau hiệu chỉnh cơ cấu, hiệu suất IE vẫn giảm; cần xác minh tại hiện trường.','IE efficiency still fell after adjusting for model work content; site records are needed to establish the cause.');
   else if(d.efficiencyPoints>2)verdict=L('混線IE效率改善，代表每投入人時完成更多標準工作量。','Hiệu suất IE cải thiện, mỗi giờ công tạo thêm khối lượng chuẩn.','Mixed-model IE efficiency improved: more standard work was earned per input labor-hour.');
   else verdict=L('混線IE效率變化在±2個百分點內，暫列持平觀察。','Hiệu suất IE thay đổi trong ±2 điểm %, tạm theo dõi ổn định.','IE efficiency changed within ±2 percentage points; provisionally classified as stable.');
   html+=box(name+' · '+L('A／B日：人員、型體組合與效率交叉判讀','So sánh A/B: người, cơ cấu và hiệu suất','A/B analysis: members, model mix and efficiency'),
    L('人員 ','Nhân lực ','Member ')+f(a.members,0)+'→'+f(b.members,0)+L('；實際雙數 ','; số đôi ','; actual pairs ')+change(d.rawPairsChange)+L('；完成標準工作量 ','; khối lượng chuẩn ','; earned standard work ')+change(d.standardWorkChange)+L('；IE效率 ','; hiệu suất IE ','; IE efficiency ')+f(a.efficiency*100)+'%→'+f(b.efficiency*100)+'% ('+(d.efficiencyPoints>0?'+':'')+f(d.efficiencyPoints)+' ppt)。'+verdict,
    d.efficiencyPoints<-2?'negative':d.efficiencyPoints>2?'positive':'info');
   html+=box(name+' · '+L('拆開產品難度與效率影響','Tách ảnh hưởng độ khó và hiệu suất','Separating work content from efficiency'),
    L('加權IE秒值 ','Giây IE bình quân ','Weighted IE seconds ')+f(a.avg,0)+'→'+f(b.avg,0)+' ('+change(d.averageSecondsChange)+')；'+L('僅型體組合對每人時雙數的換算影響 ','Ảnh hưởng riêng cơ cấu đến đôi/giờ ','Mix-only conversion effect on pairs per labor-hour ')+change(d.mixFactor-1)+L('；IE效率因子 ','; hệ số hiệu suất IE ','; IE efficiency factor ')+change(d.efficiencyFactor-1)+L('，兩因子相乘後對應原始人時雙數變化 ','; tích hai hệ số khớp thay đổi đôi/giờ ','; multiplying both factors reconciles the raw pairs-per-hour change ')+change(d.rawRateChange)+L('。A/B比較統一採B日IE版本；±2ppt僅用於變化標籤，正式基準仍為100% IE。','So sánh dùng cùng phiên bản IE ngày B; ±2 điểm chỉ là nhãn thay đổi, chuẩn vẫn 100%.','A/B comparisons use Day B IE versions consistently; ±2pp labels changes only, while the IE standard remains 100%.'));
   html+=box(name+' · '+L('同效率對照，用於追查差異','Tham chiếu cùng hiệu suất','Constant-efficiency reference'),
    L('若維持A日IE效率，以B日人時與B日組合可對照 ','Giữ hiệu suất IE ngày A với giờ công và cơ cấu ngày B: ','At Day A IE efficiency with Day B input hours and mix, reference output is ')+f(d.referencePairs)+L(' 雙；實際 ',' đôi; thực tế ',' pairs; actual ')+f(b.actual,0)+L(' 雙。這是效率變化對照，並非IE目標或已證實損失。',' đôi. Đây là đối chiếu hiệu suất, không phải mục tiêu IE hay tổn thất đã xác nhận.',' pairs. This isolates efficiency change; it is not an IE target or proven loss.'));
  }else html+=box(name+' · '+L('A日資料不足，不推定效率升降','Thiếu ngày A, không kết luận xu hướng','Day A incomplete: no efficiency trend inferred'),a?.errors.join('；')||L('請選擇有完整資料的A日。','Chọn ngày A có dữ liệu đầy đủ.','Select a complete baseline day.'),'caution');
  const list=models.filter(m=>m.pairs>0).sort((x,y)=>y.work-x.work).map(m=>'<li>'+esc(m.model)+'：'+f(m.pairs,0)+L(' 雙 × ',' đôi × ',' pairs × ')+f(m.seconds,0)+L('秒＝',' giây = ','s = ')+f(m.work)+L(' 標準人時',' giờ công chuẩn',' standard labor-hours')+(comparison?'；A→B '+(m.workChange>0?'+':'')+f(m.workChange)+L(' 人時',' giờ',' hours'):'')+(m.historyAvg!==null?'；'+L('前','trước ','prior ')+m.historySamples+L('筆有生產日均 ',' ngày có sản xuất TB ',' active-day records average ')+f(m.historyAvg)+L('雙（僅產量參考）',' đôi (chỉ tham khảo)',' pairs (output reference only)'):'')+'</li>').join('');
  html+=box(name+' · '+L('各型體工作量與歷史觀察','Khối lượng từng mã và lịch sử','Model workload and historical evidence'),L('以下是各款對整線標準工作量的貢獻，不把共用人員重複配給每款，也不由單款完成量判定單款效率。','Đây là đóng góp giờ công chuẩn, không tính nhân lực chung nhiều lần hay kết luận hiệu suất riêng từng mã.','These are contributions to line standard work; shared members are not counted again and model efficiency is not inferred from pair counts.'),'info','<ul>'+list+'</ul>'+(result.added.length||result.removed.length?'<p>'+esc(L('新增生產型體：','Mã bắt đầu: ','Models started: ')+(result.added.join(', ')||'—')+L('；退出生產型體：','; mã dừng: ','; models stopped: ')+(result.removed.join(', ')||'—'))+'</p>':''));
  html+=box(name+' · '+L('歷史效率與待查證因素','Hiệu suất lịch sử và điểm cần xác minh','Historical efficiency and verification'),
   (result.median!==null?L('此前','Trước đó ','Prior ')+result.historyCount+L('個完整生產日，混線IE效率中位數 ',' ngày đầy đủ, trung vị hiệu suất IE ',' complete days have median mixed-model IE efficiency ')+f(result.median*100)+L('%；歷史水準不下修IE基準。','%; không dùng để hạ chuẩn IE.','%; history does not lower the IE standard.'):L('完整歷史效率樣本不足3日，暫不判斷歷史水準。','Chưa đủ 3 ngày để đánh giá lịch sử.','Fewer than 3 complete historical days: no historical efficiency benchmark.'))+
   L('OT已排除。',' Đã loại OT.',' OT is excluded.')+(result.currentQuality.length?L('當日有 ',' Có ',' There are ')+result.currentQuality.length+L('筆品質紀錄可交叉檢查，尚未證實影響此製程。',' ghi nhận chất lượng cần đối chiếu; chưa xác nhận ảnh hưởng công đoạn.',' dated quality records to inspect; their effect on this process is unconfirmed.'):L('尚無對應日期的品質紀錄可交叉驗證。',' Chưa có ghi nhận chất lượng cùng ngày để xác minh.',' No dated quality records are available for cross-checking.'))+
   L('換型、等待、返修、在製品及人員分時投入尚無完整紀錄，不能把全部差額歸因於效率或個人。',' Chưa đủ thời gian đổi mã, chờ, sửa, WIP và phân bổ người; không quy toàn bộ chênh lệch cho cá nhân.',' Changeover, waiting, rework, WIP and time-varying staffing are not fully recorded; the gap cannot be assigned wholly to execution or individuals.'));
  return html;
 }
 function render(day){
  const base=state.daily.find(d=>d.date===document.getElementById('baseStart').value);
  const outputs=['gc','asm'].map(p=>analyze(p,day,base));
  return '<div class="analysis-date">'+esc((base?.date||'—')+' → '+day.date)+' · '+L('混線IE工作量判讀','Phân tích khối lượng IE hỗn hợp','Mixed-model IE workload analysis')+'</div>'+outputs.map(renderProcess).join('');
 }
 window.FactoryMixInsight=Object.freeze({analyze,render});
})();
