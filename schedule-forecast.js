'use strict';
/* Planning forecast is independent of actual production and cloud Excel imports. */
(()=>{
 const SHEET='1+2 Sinhquan 生產排程 ',STORE='factory-schedule-forecast-v1';
 const L=(zh,vn,en)=>state.lang==='vn'?vn:state.lang==='en'?en:zh;
 let plan=null;
 try{const saved=JSON.parse(localStorage.getItem(STORE)||'null');if(saved?.version===1&&Array.isArray(saved.rows))plan=saved;}catch{}
 const valid=n=>Number.isInteger(n)&&n>=0&&n<=20000;
 function parse(rows,filename){
  if(!Array.isArray(rows))throw Error('Missing schedule sheet');
  const result=[],seen=new Set(),months=new Set();
  for(let i=0;i<rows.length;i++){
   const h=rows[i];if(String(h?.[0]||'').trim()!=='組別'||String(h?.[1]||'').trim()!=='底模')continue;
   const stages=[];for(let j=38;j<=50;j++){const name=String(rows[i+1]?.[j]||'').replace(/\s+/g,' ').trim();if(name)stages.push([j,name]);}
   const dates=[];for(let j=8;j<=34;j++){
    const m=String(h[j]||'').trim().match(/^(\d{1,2})\/(\d{1,2})$/);if(!m)continue;
    const yr=Number(rows[i+2]?.[4])||Number(rows[i+3]?.[4]),year=Math.floor(yr/100);
    if(year<2020||year>2100)throw Error('Invalid schedule year');
    const date=`${year}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}`;
    if(!validDate(date)||new Date(date+'T00:00:00Z').getUTCMonth()+1!==Number(m[1]))throw Error('Invalid schedule date '+date);
    dates.push([j,date]);
   }
   if(!dates.length)continue;
   for(let k=i+1;k<rows.length;k++){
    const r=rows[k];if(['小計','合計','組別'].includes(String(r?.[0]||'').trim()))break;
    const model=String(r?.[1]||'').trim().toUpperCase(),fg=String(r?.[3]||'').trim(),orderMonth=Number(r?.[4]);
    if(!model||!fg)continue;
    if(!/^20\d{4}$/.test(String(orderMonth))||orderMonth!==Number(dates[0][1].slice(0,7).replace('-','')))throw Error('Schedule month mismatch: '+model);
    const ieStages=stages.map(([idx,name])=>({name,seconds:nval(r[idx])})).filter(s=>s.seconds!==null);
    if(ieStages.some(s=>!Number.isFinite(s.seconds)||s.seconds<0||s.seconds>100000))throw Error('Invalid stage IE '+model);
    for(const [column,date] of dates){const qty=nval(r[column]);if(qty===null)continue;if(!valid(qty))throw Error('Invalid planned pairs '+date+' / '+model);
     const key=date+'|'+fg;if(seen.has(key))throw Error('Duplicate schedule '+key);seen.add(key);
     result.push({date,model,fg,style:String(r[2]||'').trim(),pairs:qty,ieStages});
    }
   }
   months.add(dates[0][1].slice(0,7));
  }
  if(!result.length)throw Error('No dated model schedule found');
  return {version:1,filename,rows:result,months:[...months].sort(),importedAt:new Date().toISOString()};
 }
 function ie(row,date,p){
  const model=row.model;
  const name=model.replace(/-1[MW]$/,'-1');
  const entries=(state.ieStandards||[]).filter(x=>String(x.model||'').trim().toUpperCase()===name&&(!x.effectiveDate||x.effectiveDate<=date)).sort((a,b)=>String(b.effectiveDate||'').localeCompare(String(a.effectiveDate||'')));
  const value=nval(entries[0]?.[p+'Cycle']);if(value>0)return {value,source:'system'};
  const stage=row.ieStages?.find(s=>p==='gc'?/GCD|底加/i.test(s.name):/Thanh hinh|成型/i.test(s.name));
  return stage?.seconds>0?{value:stage.seconds,source:'schedule'}:null;
 }
 function render(){
  const host=document.getElementById('scheduleForecast');if(!host)return;
  const title=L('預計排程 × IE 產能','Kế hoạch × công suất IE','Schedule × IE capacity');
  const control='<div class="panel-head"><div><h3>'+title+'</h3><p>'+L('獨立預測：匯入排程後在此瀏覽器保存，不改寫實際產量或IE標準。','Dự báo riêng: lưu lịch trong trình duyệt, không sửa sản lượng thực tế hoặc IE.','Separate forecast: saved in this browser; actual output and IE standards remain unchanged.')+'</p></div><label class="outline upload-label" for="scheduleFile">'+L('匯入排程 Excel','Nhập Excel kế hoạch','Import schedule Excel')+'</label><input id="scheduleFile" type="file" accept=".xlsx" hidden></div><div id="scheduleStatus" role="status"></div>';
  host.innerHTML=control+'<div id="scheduleResults"></div>';
  host.querySelector('#scheduleFile').addEventListener('change',async e=>{const f=e.target.files?.[0];if(!f)return;const status=host.querySelector('#scheduleStatus');try{
   if(f.size>12*1024*1024)throw Error('File exceeds 12 MB');
   status.textContent=L('正在核對排程…','Đang kiểm tra kế hoạch…','Checking schedule…');
   const parsed=await readXlsx(await f.arrayBuffer()),next=parse(parsed.sheets[SHEET],f.name);
   localStorage.setItem(STORE,JSON.stringify(next));plan=next;render();window.FactoryMixRecommendation?.render();
  }catch(error){status.textContent=L('匯入失敗：','Lỗi nhập: ','Import failed: ')+error.message;}finally{e.target.value='';}});
  if(!plan){host.querySelector('#scheduleResults').innerHTML='<p class="ie-mix-note">'+L('請匯入生管排程檔，系統只擷取日期、底模、型體、FG料號及每日雙數。','Nhập lịch sản xuất; chỉ lấy ngày, mã, FG và số đôi.','Import the schedule; only dates, models, FG codes and planned pairs are retained.')+'</p>';return;}
  const dates=[...new Set(plan.rows.map(r=>r.date))].sort(),selected=host.dataset.date&&dates.includes(host.dataset.date)?host.dataset.date:dates[0];
  const out=host.querySelector('#scheduleResults');
  const draw=()=>{const date=host.dataset.date,rows=plan.rows.filter(r=>r.date===date&&r.pairs>0),pairs=rows.reduce((s,r)=>s+r.pairs,0);
   const summaries=['gc','asm'].map(p=>{const relevant=rows.filter(r=>p!=='gc'||r.model!=='SOB-1632');let seconds=0;const missing=[];
    for(const r of relevant){const v=ie(r,date,p);if(v===null)missing.push(r.model);else seconds+=r.pairs*v.value;}
    const hc=window.FactoryPlanning?.reference(p),hours=8,required=missing.length?null:seconds/3600,load=required!==null&&hc>0?required/(hc*hours):null;
    return {p,pairs:relevant.reduce((s,r)=>s+r.pairs,0),required,load,hc,missing:[...new Set(missing)]};});
   const work=new Map();for(const r of rows)for(const s of r.ieStages||[])work.set(s.name,(work.get(s.name)||0)+r.pairs*s.seconds/3600);
   const stageRows=[...work].sort((a,b)=>b[1]-a[1]);const max=stageRows[0]?.[1]||1;
   detail.innerHTML='<p class="ie-mix-note">'+esc(plan.filename)+' · '+plan.months.join(', ')+' · '+L('預計排程。系統IE優先；缺少時採本檔同製程IE並標記來源。人員採管理參考值，假設8H；未含換型及設備限制。','Kế hoạch dự kiến. Ưu tiên IE hệ thống, thiếu thì dùng IE trong tệp. Nhân lực tham chiếu, ca 8H; chưa tính đổi mã và thiết bị.','Forecast only. System IE takes priority; workbook IE fills gaps with source labels. Reference members and 8H; changeovers and equipment limits excluded.')+'</p><div class="kpi-grid">'+summaries.map(s=>'<div class="kpi"><div class="label">'+(s.p==='gc'?'Stockfit / GCĐ':'Assembly / TH')+'</div><div class="value">'+int(s.pairs)+' '+L('雙','đôi','pairs')+'</div><div class="foot">'+L('IE標準人時','Giờ công chuẩn','IE labor-hours')+' '+fmt(s.required,1)+' / '+int(s.hc*8)+' · '+L('負荷','Tải','Load')+' '+pct(s.load,1)+(s.missing.length?' · '+L('IE缺漏：','Thiếu IE: ','Missing IE: ')+esc(s.missing.join(', ')):'')+'</div></div>').join('')+'</div><h4>'+L('各階段預計標準人時','Giờ công chuẩn theo công đoạn','Planned standard labor-hours by stage')+'</h4><p class="ie-mix-note">'+L('依各款預計雙數 × 本檔各階段IE秒值 ÷ 3600。不同階段不可直接相加當作整線產能；尚無階段實際人力，無法判定瓶頸。','Đôi dự kiến × giây IE từng công đoạn ÷ 3600; chưa có nhân lực thực tế từng công đoạn để xác định nút thắt.','Planned pairs × workbook IE seconds per stage ÷ 3600. No stage staffing data to identify bottlenecks.')+'</p><div class="table-scroll"><table class="data-table"><thead><tr><th>'+L('階段','Công đoạn','Stage')+'</th><th>'+L('標準人時','Giờ công chuẩn','Standard labor-hours')+'</th><th>'+L('工作量比較','So sánh tải','Workload comparison')+'</th></tr></thead><tbody>'+stageRows.map(([name,h])=>'<tr><td>'+esc(name)+'</td><td>'+fmt(h,1)+'</td><td><div style="height:12px;background:#dce6fa;border-radius:6px;min-width:120px"><div style="height:12px;width:'+Math.min(100,h/max*100).toFixed(1)+'%;background:#4169e1;border-radius:6px"></div></div></td></tr>').join('')+'</tbody></table></div><h4>'+L('型體配單','Cơ cấu mã','Model schedule')+'</h4><div class="table-scroll"><table class="data-table"><thead><tr><th>'+L('底模','Mã đế','Bottom model')+'</th><th>FG</th><th>'+L('預計雙數','Đôi dự kiến','Planned pairs')+'</th><th>GCĐ IE</th><th>TH IE</th></tr></thead><tbody>'+rows.map(r=>{const a=ie(r,date,'gc'),b=ie(r,date,'asm');return '<tr><td>'+esc(r.model)+'</td><td>'+esc(r.fg)+'</td><td>'+int(r.pairs)+'</td><td>'+(r.model==='SOB-1632'?'—':fmt(a?.value,0)+(a?' ('+a.source+')':''))+'</td><td>'+fmt(b?.value,0)+(b?' ('+b.source+')':'')+'</td></tr>';}).join('')+'</tbody></table></div>';
  };
  const select=document.createElement('select');select.setAttribute('aria-label',L('排程日期','Ngày kế hoạch','Schedule date'));for(const d of dates){const o=document.createElement('option');o.value=d;o.textContent=d;select.append(o);}select.value=selected;host.dataset.date=selected;
  const label=document.createElement('label');label.textContent=L('排程日期 ','Ngày kế hoạch ','Schedule date ');label.append(select);out.append(label);const detail=document.createElement('div');out.append(detail);
  select.addEventListener('change',()=>{host.dataset.date=select.value;draw();window.FactoryMixRecommendation?.render();});draw();
 }
 window.FactorySchedule=Object.freeze({parse,render,get selected(){return plan?{date:document.getElementById('scheduleForecast')?.dataset.date||plan.rows[0]?.date,rows:plan.rows}:null;}});
 const previous=window.render;window.render=function(){previous();render();};
})();
