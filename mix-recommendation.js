'use strict';
/* Historical mix recommendations. Read-only, process-specific, no schedule writes.
 * All historical work is revalued at the selected date's IE standards.
 * Nearby observed mixes are compared by lower-quartile earned-labor efficiency.
 * This is observational evidence, not an estimated causal changeover effect. */
(()=>{
 const L=(zh,vn,en)=>state.lang==='vn'?vn:state.lang==='en'?en:zh;
 const fmt=(n,d=0)=>Number.isFinite(n)?n.toLocaleString(state.lang==='vn'?'vi-VN':state.lang==='en'?'en-US':'zh-TW',{maximumFractionDigits:d,minimumFractionDigits:d}):'—';
 const quantile=(values,q)=>{const a=[...values].sort((x,y)=>x-y);if(!a.length)return null;const i=(a.length-1)*q,k=Math.floor(i);return a[k]+(a[Math.ceil(i)]-a[k])*(i-k);};
 const defaults=Object.freeze({windowDays:90,minDays:3,mixTolerance:.1,memberTolerance:.2});
 let scenarioDate='',scenario={gc:null,asm:null,minDays:3};
 function analyze(p,date,members,options={}){
  const cfg={...defaults,...options},calc=window.FactoryIEPlanner.calculate;
  const result={p,date,members,hours:8,cfg,eligible:0,excluded:0,groups:[],best:null};
  if(!Number.isFinite(members)||members<=0||!Number.isInteger(members)||!/^\d{4}-\d{2}-\d{2}$/.test(date)||state.demo)return result;
  const cutoff=new Date(Date.parse(date+'T00:00:00Z')-(cfg.windowDays-1)*86400000).toISOString().slice(0,10);
  const days=state.daily.filter(d=>d.date>=cutoff&&d.date<=date).sort((a,b)=>a.date.localeCompare(b.date));
  const counts=new Map();for(const d of days)counts.set(d.date,(counts.get(d.date)||0)+1);
  const samples=[];
  for(const d of days){
   const r=calc(p,d,null,null,date);
   if(counts.get(d.date)!==1||!r.valid||!r.hasMix||!(r.efficiency>0)||Math.abs(r.hours-8)>.01||Math.abs(r.members/members-1)>cfg.memberTolerance){result.excluded++;continue;}
   const rows=r.rows.filter(m=>m.pairs>0).sort((a,b)=>a.model.localeCompare(b.model));
   // A single-model day cannot establish an optimum for mixed-model production.
   if(rows.length<2){result.excluded++;continue;}
   samples.push({date:d.date,members:r.members,efficiency:r.efficiency,rows,
    models:rows.map(m=>m.model).join('|'),shares:rows.map(m=>m.pairs/r.actual)});
  }
  result.eligible=samples.length;
  const seen=new Set();
  for(const seed of samples){
   const support=samples.filter(x=>x.models===seed.models&&x.shares.every((v,i)=>Math.abs(v-seed.shares[i])<=cfg.mixTolerance+1e-10));
   if(support.length<cfg.minDays)continue;
   const signature=support.map(x=>x.date).join('|');if(seen.has(signature))continue;seen.add(signature);
   const representative=seed; // Observed mix; every support day is within 10 percentage points.
   const effs=support.map(x=>x.efficiency),q25=quantile(effs,.25),median=quantile(effs,.5),q75=quantile(effs,.75);
   const planningEff=Math.min(1,q25),avg=representative.rows.reduce((s,m,i)=>s+m.seconds*representative.shares[i],0);
   const budget=members*8*3600*planningEff,rawTotal=budget/avg;
   // Floor each model independently so integer rounding can never overbook labor.
   const allocation=representative.rows.map((m,i)=>({model:m.model,seconds:m.seconds,share:representative.shares[i],pairs:Math.floor(rawTotal*representative.shares[i]+1e-10),minShare:Math.min(...support.map(x=>x.shares[i])),maxShare:Math.max(...support.map(x=>x.shares[i]))}));
   result.groups.push({samples:support.length,dates:support.map(x=>x.date),memberMin:Math.min(...support.map(x=>x.members)),memberMax:Math.max(...support.map(x=>x.members)),q25,median,q75,planningEff,capped:q25>1,representativeDate:representative.date,allocation,total:allocation.reduce((s,m)=>s+m.pairs,0),standardHours:allocation.reduce((s,m)=>s+m.pairs*m.seconds/3600,0),budgetHours:budget/3600});
  }
  result.groups.sort((a,b)=>b.planningEff-a.planningEff||b.samples-a.samples||b.median-a.median||a.representativeDate.localeCompare(b.representativeDate));
  result.best=result.groups[0]||null;return result;
 }
 function card(r){
  const b=r.best,name=r.p==='gc'?'Stockfit / GCĐ':'Assembly / TH';
  let html='<article class="mix-rec-card"><div class="mix-rec-process"><h4>'+name+'</h4><label>'+L('試算人員','Nhân lực mô phỏng','Scenario members')+' <input data-mix-members="'+r.p+'" aria-label="'+name+' '+L('配單試算人員','nhân lực cơ cấu','mix scenario members')+'" type="number" min="1" step="1" value="'+(Number.isFinite(r.members)?r.members:'')+'"></label></div>';
  if(!b)return html+'<p class="mix-rec-empty">'+L('尚無足夠相近配比，暫不推薦雙數。','Chưa đủ cơ cấu tương tự để đề xuất số đôi.','Not enough comparable mixes to recommend quantities.')+'</p><p class="subtle">'+L('完整可比日 ','Ngày hợp lệ ','Comparable days ')+r.eligible+' · '+L('每組至少 ','Tối thiểu mỗi nhóm ','Minimum per group ')+r.cfg.minDays+L(' 日；請累積資料或調整試算人員。',' ngày; thêm dữ liệu hoặc điều chỉnh nhân lực.',' days; collect more data or adjust scenario members.')+'</p></article>';
  html+='<div class="mix-rec-metrics"><div><span>'+L('8H參考配單合計','Tổng đôi tham khảo 8H','8H reference total')+'</span><strong>'+fmt(b.total)+L(' 雙',' đôi',' pairs')+'</strong></div><div><span>'+L('歷史IE效率中位數','Trung vị hiệu suất IE','Median historical IE efficiency')+'</span><strong>'+fmt(b.median*100,1)+'%</strong></div><div><span>'+L('相近配比樣本','Ngày cơ cấu tương tự','Comparable mix sample')+'</span><strong>'+b.samples+L(' 日',' ngày',' days')+'</strong></div></div>';
  html+='<div class="table-scroll"><table class="data-table"><thead><tr><th>Model</th><th>'+L('建議雙數','Số đôi đề xuất','Suggested pairs')+'</th><th>'+L('參考配比','Tỷ trọng tham khảo','Reference share')+'</th></tr></thead><tbody>'+b.allocation.map(m=>'<tr><td>'+esc(m.model)+'</td><td><strong>'+fmt(m.pairs)+'</strong></td><td>'+fmt(m.share*100,1)+'%</td></tr>').join('')+'</tbody></table></div>';
  html+='<p class="mix-rec-basis">'+L('雙數採歷史較保守效率 ','Số đôi theo hiệu suất thận trọng ','Quantities use conservative historical efficiency ')+fmt(b.planningEff*100,1)+'%'+L('（第25百分位），不是100% IE目標。',' (phân vị 25), không phải chuẩn IE 100%.',' (25th percentile), not the 100% IE target.')+'</p>';
  html+='<details><summary>'+L('計算依據與歷史配比區間','Cơ sở tính và khoảng tỷ trọng lịch sử','Calculation basis and historical share ranges')+'</summary><p>'+L('參考人員 ','Nhân lực tham khảo ','Historical members ')+b.memberMin+'–'+b.memberMax+' · '+L('IE效率中間50%區間 ','Khoảng 50% giữa của hiệu suất IE ','Middle 50% IE efficiency range ')+fmt(b.q25*100,1)+'–'+fmt(b.q75*100,1)+'% · '+L('代表配比日期 ','Ngày cơ cấu đại diện ','Representative mix date ')+b.representativeDate+'</p><p>'+b.allocation.map(m=>esc(m.model)+' '+fmt(m.minShare*100,1)+'–'+fmt(m.maxShare*100,1)+'%').join(' / ')+'</p><p>'+L('參考生產日：','Ngày tham khảo: ','Reference production dates: ')+b.dates.join(', ')+'</p><p>'+L('建議完成標準人時 ','Giờ công chuẩn đề xuất ','Suggested earned standard hours ')+fmt(b.standardHours,1)+' / '+fmt(r.members*8)+L(' 投入人時。',' giờ công đầu vào.',' input labor-hours.')+'</p>'+(b.capped?'<p>'+L('歷史效率高於100%，配單試算上限採100% IE；請確認標準版本與紀錄。','Hiệu suất lịch sử vượt 100%; dự báo giới hạn 100% IE, cần kiểm tra định mức.','Historical efficiency exceeds 100%; forecast capped at 100% IE pending standard verification.')+'</p>':'')+'</details></article>';
  return html;
 }
 function render(){
  const host=document.getElementById('mixRecommendation');if(!host)return;
  const day=state.daily.find(d=>d.date===document.getElementById('compStart')?.value);
  if(day&&scenarioDate!==day.date){scenarioDate=day.date;scenario.gc=Number(day.gcHC)>0?Number(day.gcHC):null;scenario.asm=Number(day.asmHC)>0?Number(day.asmHC):null;}
  host.innerHTML='<div class="panel-head"><div><h3>'+L('建議最佳配單組合','Cơ cấu phối đơn đề xuất','Recommended production mix')+'</h3><p>'+L('依歷史混線IE效率選出較佳配比；底加與成型獨立試算。','Chọn cơ cấu theo hiệu suất IE lịch sử; GCĐ và TH tính riêng.','Historical IE efficiency identifies promising mixes; each process is estimated independently.')+'</p></div><span class="tag muted">'+L('歷史參考','THAM KHẢO','HISTORICAL REFERENCE')+'</span></div>';
  if(!day||state.demo){host.innerHTML+='<p class="mix-rec-empty">'+L('請選擇有正式實績的B日，才能建立歷史配比建議。','Chọn ngày B có dữ liệu thực tế.','Select a Day B with real production records.')+'</p>';return;}
  host.innerHTML+='<div class="mix-rec-controls"><span>'+L('截至 ','Đến ','As of ')+esc(day.date)+L(' · 近90日 · 8H · 人員相差不超過20%',' · 90 ngày · 8H · nhân lực trong ±20%',' · 90-day window · 8H · members within ±20%')+'</span><label>'+L('最低樣本','Số ngày tối thiểu','Minimum sample')+' <select id="mixMinDays">'+[3,5,7].map(n=>'<option value="'+n+'"'+(scenario.minDays===n?' selected':'')+'>'+n+L('日',' ngày',' days')+'</option>').join('')+'</select></label></div><div class="mix-rec-grid">'+['gc','asm'].map(p=>card(analyze(p,day.date,scenario[p],{minDays:scenario.minDays}))).join('')+'</div><p class="mix-rec-note">'+L('歷史完成配比不等於已驗證的最佳排程。相同型體組合、各款比例相差不超過10個百分點列為相近樣本，以效率第25百分位較高者優先；所有樣本統一按B日IE版本重算。尚未納入訂單、交期、備料、WIP與切換順序；兩工段建議不可直接合併成整廠派工。此處只作試算，不修改實績。','Cơ cấu hoàn thành lịch sử không phải lịch tối ưu đã xác minh. Cùng bộ mã, tỷ trọng từng mã trong ±10 điểm phần trăm; ưu tiên phân vị hiệu suất 25 cao hơn, cùng định mức IE ngày B. Chưa xét đơn hàng, giao hạn, vật tư, WIP hay thứ tự đổi mã; không gộp hai công đoạn thành kế hoạch nhà máy. Chỉ mô phỏng, không sửa dữ liệu.','Observed completed mixes are not validated optimal schedules. Comparable days use the same model set and shares within 10 percentage points. Rank by the 25th percentile of efficiency, revalued at Day B IE standards. Orders, deadlines, materials, WIP and changeover sequence are not modeled; do not combine process recommendations into a factory dispatch. Scenarios never change actual records.')+'</p>';
 }
 document.addEventListener('DOMContentLoaded',()=>{
  const host=document.getElementById('mixRecommendation');
  host?.addEventListener('change',e=>{if(e.target.matches('[data-mix-members]')){const value=Number(e.target.value);scenario[e.target.dataset.mixMembers]=e.target.value!==''&&Number.isInteger(value)&&value>0?value:null;render();}else if(e.target.id==='mixMinDays'){scenario.minDays=Number(e.target.value);render();}});
 });
 window.FactoryMixRecommendation=Object.freeze({analyze,render,quantile,defaults});
})();
