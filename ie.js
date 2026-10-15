'use strict';
/* V1.4: Model IE standards and capacity planning. IndexedDB persistence is provided by records.js. */
(() => {
const zh={
 tabIE:'IE 標準設定',ieFormTitle:'IE 型體標準工時登錄',ieFormSub:'只需輸入每雙鞋所有人工工站標準秒數加總；不含機器與等待。人員與產能依實績自動反算，缺值不推估。',
 ieDisplayName:'型體名稱（選填）',ieEffectiveDate:'IE生效日（留空＝適用所有歷史日期）',ieShiftHours:'模擬工時（小時）',ieSAM:'SAM 標準人分鐘／雙',ieCycle:'人工總秒值（秒／雙）',ieTarget:'試算雙數（選填）',ieDedicatedHC:'IE 專用人員（模擬）',ieEfficiency:'目標效率 %',ieNotes:'IE備註／版本來源',ieSave:'儲存IE標準／新增型體',
 ieRegistryTitle:'型體與IE標準資料庫',ieRegistrySub:'可新增型體及IE生效版本；刪除IE標準不會刪除產量或品質紀錄。',ieMixTitle:'IE標準工時 × 實際型體組合',ieMixSub:'按各型體人工總秒值與正常班實際雙數計算工作負荷；歷史效率足夠才推估合理人員，缺值不補零。',ieEdit:'新增／編輯IE標準'
};
const vn={
 tabIE:'Tiêu chuẩn IE',ieFormTitle:'Nhập định mức IE theo mã giày',ieFormSub:'Chỉ nhập tổng giây thao tác thủ công của tất cả công đoạn cho mỗi đôi, không gồm máy hoặc chờ. Tự tính nhân lực theo dữ liệu thực tế.',
 ieDisplayName:'Tên mã giày (không bắt buộc)',ieEffectiveDate:'Ngày hiệu lực IE (để trống = áp dụng từ trước)',ieShiftHours:'Giờ mô phỏng',ieSAM:'SAM phút công / đôi',ieCycle:'Tổng giây lao động / đôi',ieTarget:'Số đôi mô phỏng (tùy chọn)',ieDedicatedHC:'Nhân lực riêng theo IE',ieEfficiency:'Hiệu suất mục tiêu %',ieNotes:'Ghi chú / nguồn định mức IE',ieSave:'Lưu IE / thêm mã giày',
 ieRegistryTitle:'Danh mục mã giày và định mức IE',ieRegistrySub:'Thêm mã giày và phiên bản IE theo ngày hiệu lực; xóa IE không xóa dữ liệu sản xuất.',ieMixTitle:'Định mức IE × Cơ cấu mã giày thực tế',ieMixSub:'Tính khối lượng công từ tổng giây thủ công và sản lượng ca chính; chỉ dự báo nhân lực khi đủ dữ liệu hiệu suất lịch sử.',ieEdit:'Thêm / sửa tiêu chuẩn IE'
};
Object.assign(translations.zh,zh);Object.assign(translations.vn,vn);
Object.assign(translations.en,window.FACTORY_EN?.ie||{});
let editingKey=null,registryRows=[],initialized=false;
const ieKey=x=>String(x.model||'').toUpperCase()+'|'+String(x.effectiveDate||'');
const allIE=()=>Array.isArray(state.ieStandards)?state.ieStandards:[];
const numeric=v=>v===null||v===undefined||v===''?null:(Number.isFinite(Number(v))?Number(v):null);
const positive=v=>Number.isFinite(v)&&v>0;
const validHC=v=>Number.isInteger(v)&&v>0;
const validEff=v=>Number.isFinite(v)&&v>0&&v<=100;
const code=v=>String(v||'').trim().toUpperCase();
const field=id=>$(id).value.trim();
const nfield=id=>numeric(field(id));
const label=(a,b,c)=>tr(a,b,c);
const dateFor=(m,d)=>allIE().filter(x=>code(x.model)===code(m)&&(!x.effectiveDate||x.effectiveDate<=d)).sort((a,b)=>String(b.effectiveDate||'').localeCompare(String(a.effectiveDate||'')))[0]||null;
const currentIE=m=>dateFor(m,'9999-12-31');
function modelCodes(){return [...new Set([...state.models.map(x=>code(x.model)),...allIE().map(x=>code(x.model))].filter(Boolean))].sort();}
function syncModels(){const list=$('modelOptions');if(!list)return;list.replaceChildren(...modelCodes().map(x=>new Option(x,x)));}

const manualSeconds=(record,p)=>numeric(record?.[p+'Cycle']);
function historicalEff(p,beforeDate){
 const days=[...state.daily].filter(d=>d.date<beforeDate).sort((a,b)=>b.date.localeCompare(a.date)).slice(0,180);
 const samples=[];let excluded=0;
 for(const d of days){
  const hc=numeric(d[p+'人員']),hours=numeric(d[p+'Hours']),total=numeric(d[p+'Normal']);
  if(!positive(hc)||!positive(hours)||total===null||total<=0)continue;
  const ms=state.models.filter(m=>m.date===d.date),known=ms.map(m=>numeric(m[p+'Normal']));
  if(!ms.length||known.some(n=>n===null||n<0)||Math.abs(known.reduce((a,b)=>a+b,0)-total)>1)continue;
  let seconds=0,complete=true;
  for(const m of ms){
   const pairs=numeric(m[p+'Normal']);if(!pairs)continue;
   const s=manualSeconds(dateFor(m.model,d.date),p);
   if(!positive(s)){complete=false;break;}seconds+=pairs*s;
  }
  if(!complete||seconds<=0)continue;
  const eff=seconds/(hc*hours*3600);
  if(eff>0&&eff<=1){samples.push({date:d.date,eff});if(samples.length>=20)break;}
  else excluded++;
 }
 if(samples.length<3)return {eff:null,samples:samples.length,excluded};
 const values=samples.map(s=>s.eff).sort((a,b)=>a-b);
 const middle=Math.floor(values.length/2);
 return {eff:values.length%2?values[middle]:(values[middle-1]+values[middle])/2,samples:samples.length,excluded};
}
function iePreview(p){
 const prefix=p==='gc'?'Gc':'Asm',el=$('ie'+prefix+'Preview');
 const s=nfield('ie'+prefix+'Cycle'),hours=nfield('ieShiftHours');
 if(!positive(s)||!positive(hours)){el.textContent=label('請填入人工總秒值，系統會自動反算所需人力。','Nhập tổng giây lao động để tự tính nhân lực.','Enter total manual seconds to calculate 人員 automatically.');return;}
 const model=code(field('ieModel')),entered=nfield('ie'+prefix+'TargetPairs');
 const recent=[...state.models].filter(m=>code(m.model)===model&&positive(numeric(m[p+'Normal']))).sort((a,b)=>b.date.localeCompare(a.date))[0];
 const reference=positive(entered)?entered:recent?numeric(recent[p+'Normal']):100;
 const source=positive(entered)?label('輸入的試算雙數','Số đôi nhập để mô phỏng','Entered scenario pairs'):
  recent?label('最近同款8H正常班實績','Sản lượng ca chính gần nhất cùng mã','Latest regular-shift output for this model'):
  label('每100雙示例（非生產目標）','Ví dụ 100 đôi (không phải mục tiêu)','100-pair illustration (not a target)');
 const ideal=Math.ceil(reference*s/(hours*3600));
 const hist=historicalEff(p,'9999-12-31');
 const use=hist.eff??0.85,est=Math.ceil(reference*s/(hours*3600*use));
 const type=hist.eff?label('歷史參考效率','Hiệu suất tham chiếu lịch sử','Historical reference efficiency'):
  label('85%情境假設（非正式標準）','Giả định 85% (không phải định mức)','85% scenario only (not an approved standard)');
 el.textContent=source+' '+int(reference)+label('雙：',' đôi: ',' pairs: ')+
  label('100%理論','Lý thuyết 100%','100% theoretical')+' '+int(ideal)+' 人員；'+
  type+' '+fmt(use*100,1)+'% → '+int(est)+' 人員。'+
  label('這是人工工時推算，不是產線節拍或已驗證的實際產能。','Đây là ước tính lao động, không phải nhịp chuyền hay công suất đã xác minh.','This is a labor-workload estimate, not line takt or validated output capacity.');
}
function preview(){iePreview('gc');iePreview('asm');}

function clearForm(){editingKey=null;$('ieForm').reset();$('ieShiftHours').value='8';$('ieEditingHint').textContent='';preview();}

function readForm(){
 const model=code(field('ieModel'));
 if(!model||model.length>70||!(/^[\p{L}\p{N}._+\-\s/]+$/u).test(model))
  throw new Error(label('請輸入有效型體代碼','Nhập mã giày hợp lệ','Enter a valid model code'));
 const effectiveDate=field('ieEffectiveDate');
 if(effectiveDate&&!validDate(effectiveDate))throw new Error(label('IE生效日不正確','Ngày hiệu lực IE không hợp lệ','Invalid IE effective date'));
 const record={model,name:field('ieDisplayName'),effectiveDate,notes:field('ieNotes'),standardKind:'manual-work-content',updatedAt:new Date().toISOString()};
 for(const p of ['gc','asm']){
  const v=nfield('ie'+(p==='gc'?'Gc':'Asm')+'Cycle');
  if(v!==null&&(!positive(v)||v>300000))throw new Error(label('人工總秒值需大於0','Tổng giây lao động phải dương','Manual seconds must be positive'));
  record[p+'Cycle']=v;
 }
 if(record.gcCycle===null&&record.asmCycle===null)throw new Error(label('至少填寫一個製程的人工總秒值','Nhập ít nhất một công đoạn','Enter manual seconds for at least one process'));
 return record;
}

async function saveIE(e){e.preventDefault();let record;try{record=readForm();}catch(err){showMessage(err.message,true);return;}
 const newKey=ieKey(record),existing=allIE().find(x=>ieKey(x)===newKey);
 if(existing&&editingKey!==newKey&&!confirm(label('相同型體及生效日已存在IE標準，確定覆蓋？','Đã có định mức IE cùng mã và ngày hiệu lực. Ghi đè?')))return;
 if(window.FactoryCloudDashboard?.enabled){
  if(!window.FactoryCloudDashboard.isAdmin){showMessage(label('只有管理員可以儲存IE標準','Chỉ quản trị viên được lưu IE','Only admins may save IE standards'),true);return;}
  try{await window.FactoryCloudDashboard.saveIE(record);clearForm();showMessage(label('IE人工標準秒值已自動儲存雲端','Đã lưu định mức IE lên đám mây','IE manual seconds saved to cloud'));}catch(err){showMessage(String(err.message||err),true);}
  return;
 }
 await window.commitFactoryMutation('IE standard '+newKey,()=>{state.ieStandards=allIE().filter(x=>ieKey(x)!==newKey&&ieKey(x)!==editingKey);state.ieStandards.push(record);});
 clearForm();
}

function editIE(r){
 editingKey=ieKey(r);
 const vals={ieModel:r.model,ieDisplayName:r.name,ieEffectiveDate:r.effectiveDate,ieNotes:r.notes,ieGcCycle:r.gcCycle,ieAsmCycle:r.asmCycle};
 for(const [id,val]of Object.entries(vals))$(id).value=val??'';
 $('ieEditingHint').textContent=label('編輯IE版本：','Sửa phiên bản IE: ','Editing IE version: ')+editingKey;
 preview();window.switchEntryTab?.('ie');setView('entry');$('ieForm').scrollIntoView({behavior:'smooth',block:'start'});
}


async function deleteIE(r){
 if(!confirm(label('確定刪除此型體的IE標準版本？生產紀錄不受影響。','Xóa phiên bản IE này? Dữ liệu sản xuất không bị xóa.','Delete this IE standard? Production records will remain.')))return;
 if(window.FactoryCloudDashboard?.enabled){
  if(!window.FactoryCloudDashboard.isAdmin)return;
  try{await window.FactoryCloudDashboard.deleteIE(r);if(editingKey===ieKey(r))clearForm();}catch(err){showMessage(String(err.message||err),true);}
  return;
 }
 await window.commitFactoryMutation('Delete IE '+ieKey(r),()=>{state.ieStandards=allIE().filter(x=>ieKey(x)!==ieKey(r));});
 if(editingKey===ieKey(r))clearForm();
}


function renderRegistry(){
 syncModels();
 const rows=[...allIE()].sort((a,b)=>code(a.model).localeCompare(code(b.model))||String(b.effectiveDate||'').localeCompare(String(a.effectiveDate||'')));
 registryRows=rows;
 const notConfigured=modelCodes().filter(m=>!rows.some(r=>code(r.model)===m));
 const renderRow=(r,i)=>`<tr><td class="highlight">${esc(r.model)}</td><td>${esc(r.name||'—')}</td><td>${esc(r.effectiveDate||label('歷史通用','Từ đầu','All dates'))}</td><td class="numeric">${fmt(manualSeconds(r,'gc'),1)}</td><td class="numeric">${fmt(manualSeconds(r,'asm'),1)}</td><td class="ie-registry-controls"><button type="button" class="entry-row-btn" data-ie-action="edit" data-ie-index="${i}">${label('編輯','Sửa','Edit')}</button><button type="button" class="entry-row-btn danger" data-ie-action="delete" data-ie-index="${i}">${label('刪除','Xóa','Delete')}</button></td></tr>`;
 const blank=notConfigured.map(m=>`<tr><td class="highlight">${esc(m)}</td><td colspan="4" class="ie-pending">${label('尚未輸入人工IE秒值','Chưa có giây IE','No manual IE seconds')}</td><td><button type="button" class="entry-row-btn" data-ie-action="new" data-ie-model="${esc(m)}">${label('建立IE','Tạo IE','Add IE')}</button></td></tr>`);
 $('ieRegistryTable').innerHTML=rows.length||blank.length?
  `<table class="data-table"><thead><tr><th>Model</th><th>${label('名稱','Tên','Name')}</th><th>${label('生效日','Hiệu lực','Effective')}</th><th class="numeric">GCĐ ${label('人工秒/雙','Giây công/đôi','Manual s/pair')}</th><th class="numeric">TH ${label('人工秒/雙','Giây công/đôi','Manual s/pair')}</th><th>${label('操作','Thao tác','Actions')}</th></tr></thead><tbody>${rows.map(renderRow).join('')}${blank.join('')}</tbody></table>`:
  empty(label('尚無型體IE人工標準秒值。','Chưa có định mức IE thủ công.','No manual IE standards yet.'));
}


function renderMix(){
 const compare=periods().compare;
 const before=compare.length?[...compare].sort((a,b)=>a.date.localeCompare(b.date))[0].date:'9999-12-31';
 $('iePeriodLabel').textContent=label('IE分析比較期間：','Kỳ so sánh IE: ','IE comparison period: ')+compare.map(d=>displayDate(d.date)).join(' · ');
 const dates=new Set(compare.map(r=>r.date)),records=state.models.filter(m=>dates.has(m.date)),rows=[];
 const names=[...new Set([...records.map(r=>code(r.model)),...allIE().map(r=>code(r.model))].filter(Boolean))].sort();
 for(const model of names){
  const ms=records.filter(r=>code(r.model)===model);
  const ie=dateFor(model,before==='9999-12-31'?before:[...compare].sort((a,b)=>b.date.localeCompare(a.date))[0].date);
  const item={model,name:ie?.name||'',gcPairs:0,asmPairs:0,gcSeconds:0,asmSeconds:0,gcMissing:false,asmMissing:false,ie};
  for(const p of ['gc','asm'])for(const m of ms){
   const pairs=numeric(m[p+'Normal']);
   if(pairs===null||pairs<0){item[p+'Missing']=true;continue;}
   item[p+'Pairs']+=pairs;
   if(!pairs)continue;
   const sec=manualSeconds(dateFor(model,m.date),p);
   if(!positive(sec)){item[p+'Missing']=true;continue;}
   item[p+'Seconds']+=pairs*sec;
  }
  rows.push(item);
 }
 const cells=rows.map(r=>{
  const segment=p=>{
   const sec=manualSeconds(r.ie,p);
   return `<td class="numeric">${int(r[p+'Pairs'])}</td><td class="numeric">${fmt(sec,0)}</td><td class="numeric">${r[p+'Missing']?'—':fmt(r[p+'Seconds']/3600,1)}</td>`;
  };
  return `<tr><td class="highlight">${esc(r.model)}${r.name?`<small class="ie-small"> · ${esc(r.name)}</small>`:''}</td>${segment('gc')}${segment('asm')}</tr>`;
 }).join('');
 $('ieMixTable').innerHTML=rows.length?`<table class="data-table"><thead><tr><th>Model</th><th class="numeric">GCĐ 8H ${label('雙數','Đôi','Pairs')}</th><th class="numeric">GCĐ ${label('人工秒/雙','Giây/đôi','Manual s/pair')}</th><th class="numeric">GCĐ ${label('IE工時','Giờ công IE','IE labor hours')}</th><th class="numeric">TH 8H ${label('雙數','Đôi','Pairs')}</th><th class="numeric">TH ${label('人工秒/雙','Giây/đôi','Manual s/pair')}</th><th class="numeric">TH ${label('IE工時','Giờ công IE','IE labor hours')}</th></tr></thead><tbody>${cells}</tbody></table><p class="ie-mix-note">${label('人工秒值為所有人工工站加總，不是產線節拍。IE工時＝正常班雙數×人工秒值÷3600；缺少標準或OT拆分則不估算。','Tổng giây thao tác thủ công không phải nhịp chuyền; thiếu IE hoặc OT thì không dự báo.','Manual seconds are total station work content, not line takt. Missing IE or OT breakdown blocks estimates.')}</p>`:
  empty(label('所選期間沒有型體資料。','Không có dữ liệu mã giày.','No model records in this period.'));
 const summaries=[];
 for(const [p,title] of [['gc','Stockfit / GCĐ'],['asm','Assembly / TH']]){
  let work=0,normalPairs=0,laborSeconds=0,availableShiftHours=0,complete=compare.length>0,missing=[],reconcile=true;
  for(const d of compare){
   const dayPairs=numeric(d[p+'Normal']),hc=numeric(d[p+'人員']),hours=numeric(d[p+'Hours']);
   const ms=records.filter(m=>m.date===d.date),nums=ms.map(m=>numeric(m[p+'Normal']));
   if(dayPairs===null||!positive(hc)||!positive(hours)||!ms.length||nums.some(n=>n===null||n<0)||Math.abs(nums.reduce((a,b)=>a+(b||0),0)-dayPairs)>1){
    complete=false;reconcile=false;continue;
   }
   normalPairs+=dayPairs;laborSeconds+=hc*hours*3600;availableShiftHours+=hours;
   for(const m of ms){
    const pairs=numeric(m[p+'Normal']);if(!pairs)continue;
    const seconds=manualSeconds(dateFor(m.model,m.date),p);
    if(!positive(seconds)){missing.push(m.model+' '+m.date);complete=false;continue;}
    work+=pairs*seconds;
   }
  }
  const hist=historicalEff(p,before),ideal=complete&&availableShiftHours>0&&work>0?Math.ceil(work/(availableShiftHours*3600)):null;
  const required=ideal!==null&&hist.eff?Math.ceil(work/(availableShiftHours*3600*hist.eff)):null;
  const actual=availableShiftHours>0?laborSeconds/(availableShiftHours*3600):null;
  const observed=complete&&laborSeconds>0?work/laborSeconds:null;
  const scenarioLow=ideal!==null?Math.ceil(work/(availableShiftHours*3600*.9)):null;
  const scenarioHigh=ideal!==null?Math.ceil(work/(availableShiftHours*3600*.8)):null;
  const capacity=required!==null&&laborSeconds>0&&work>0?Math.floor(laborSeconds*hist.eff/(work/normalPairs)):null;
  const status=!complete?label('IE或日報資料不足','Thiếu IE hoặc báo cáo','Missing IE or daily data'):
   hist.eff?label('歷史效率推估','Ước tính theo hiệu suất lịch sử','History-based estimate'):
   label('歷史樣本不足','Thiếu dữ liệu lịch sử','Insufficient history');
  const main=required!==null?int(required)+' 人員':ideal!==null?int(ideal)+' 人員*':'—';
  const explanation=!complete?label('須補齊IE人工秒值、正常班OT拆分與型體總數；不將缺值視為0。','Cần đủ IE, OT và đối chiếu tổng mã giày.','IE seconds, OT split and reconciled model totals required.'):
   hist.eff?label('參考效率','Hiệu suất tham chiếu','Reference efficiency')+' '+fmt(hist.eff*100,1)+'% · '+int(hist.samples)+' '+label('個歷史日','ngày lịch sử','historical days'):
   label('僅提供100%理論下限*；80–90%情境約','Chỉ có mức tối thiểu 100%*; kịch bản 80–90%:','100% theoretical minimum*; 80–90% scenario:')+' '+int(scenarioLow)+'–'+int(scenarioHigh)+' 人員';
  const comparison=complete&&actual!==null?
   label('實際平均人員','人員 thực tế TB','Actual average 人員')+' '+fmt(actual,1)+
   (required!==null?' · '+label('與IE推估差','Chênh so với IE','Vs IE estimate')+' '+fmt(actual-required,1)+' 人員':'')+
   (capacity!==null?' · '+label('同型體比例線性產能參考','Công suất tham chiếu cùng cơ cấu','Same-mix linear capacity reference')+' '+int(capacity)+' '+label('雙','đôi','pairs'):''):
   label('尚無可比實際人員','Chưa có 人員 thực tế hợp lệ','No comparable actual 人員');
  const warning=observed!==null&&observed>1?
   '<p class="ie-flag">'+label('警示：當期IE工作量／人員工時超過100%，請核對IE秒值與人數口徑。','Cảnh báo: tải IE / giờ công >100%; cần kiểm tra.','Warning: observed IE workload exceeds 100% of reported labor hours.')+'</p>':'';
  summaries.push(`<div class="ie-summary-card"><small>${title} · ${status}</small><b>${main}</b><p>${explanation}</p><p>${comparison}</p>${warning}${missing.length?`<p>${label('缺IE：','Thiếu IE: ','Missing IE: ')}${esc([...new Set(missing)].slice(0,4).join(', '))}</p>`:''}${!reconcile?`<p>${label('型體總數與日報未核對，不能產生合理人員。','Tổng mã giày không khớp báo cáo ngày.','Model totals do not reconcile with daily reports.')}</p>`:''}</div>`);
 }
 summaries.push(`<div class="ie-summary-card"><small>${label('IE人工秒值資料庫','Danh mục giây IE','Manual IE standards')}</small><b>${int(allIE().length)} ${label('筆','bản ghi','records')}</b><p>${int(modelCodes().length)} ${label('種型體','mã giày','models')} · ${int(compare.length)} ${label('個比較生產日','ngày so sánh','comparison days')}</p><p>${label('無需手動填目標效率；至少3個完整歷史日才採用自動參考效率。','Không nhập hiệu suất thủ công; cần ít nhất 3 ngày đủ dữ liệu.','No manual efficiency entry; at least 3 complete history days needed.')}</p></div>`);
 $('ieMixSummary').innerHTML=summaries.join('');
}

window.renderIEModels=renderMix;
window.renderIEWorkspace=renderRegistry;
window.initializeIESystem=()=>{
 if(initialized)return;initialized=true;
 $('ieForm').addEventListener('submit',e=>{void saveIE(e);});
 $('ieReset').addEventListener('click',clearForm);
 $('ieForm').addEventListener('input',preview);
 $('goIE').addEventListener('click',()=>{window.switchEntryTab?.('ie');setView('entry');$('ieModel').focus();});
 $('ieRegistryTable').addEventListener('click',e=>{const b=e.target.closest('button[data-ie-action]');if(!b)return;const action=b.dataset.ieAction;if(action==='new'){clearForm();$('ieModel').value=b.dataset.ieModel||'';$('ieModel').focus();return;}const row=registryRows[Number(b.dataset.ieIndex)];if(!row)return;if(action==='edit')editIE(row);else if(action==='delete')void deleteIE(row);});
 clearForm();renderRegistry();
};
})();