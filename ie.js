'use strict';
/* V1.4: Model IE standards and capacity planning. IndexedDB persistence is provided by records.js. */
(() => {
const zh={
 tabIE:'IE 標準設定',ieFormTitle:'IE 型體標準工時登錄',ieFormSub:'新增任何型體；底加與成型分別輸入標準人分鐘、節拍、專用HC與目標效率。未提供的IE數值保持空白。',
 ieDisplayName:'型體名稱（選填）',ieEffectiveDate:'IE生效日（留空＝適用所有歷史日期）',ieShiftHours:'模擬工時（小時）',ieSAM:'SAM 標準人分鐘／雙',ieCycle:'IE節拍 秒／雙',ieDedicatedHC:'IE 專用HC（模擬）',ieEfficiency:'目標效率 %',ieNotes:'IE備註／版本來源',ieSave:'儲存IE標準／新增型體',
 ieRegistryTitle:'型體與IE標準資料庫',ieRegistrySub:'可新增型體及IE生效版本；刪除IE標準不會刪除產量或品質紀錄。',ieMixTitle:'IE標準工時 × 實際型體組合',ieMixSub:'依比較期間實際型體產量與生效IE標準計算人力需求，缺少IE資料時不推估。',ieEdit:'新增／編輯IE標準'
};
const vn={
 tabIE:'Tiêu chuẩn IE',ieFormTitle:'Nhập định mức IE theo mã giày',ieFormSub:'Thêm bất kỳ mã giày; nhập riêng SAM, nhịp chuyền, nhân lực và hiệu suất mục tiêu cho GCĐ và TH. Không tự điền giá trị IE chưa có.',
 ieDisplayName:'Tên mã giày (không bắt buộc)',ieEffectiveDate:'Ngày hiệu lực IE (để trống = áp dụng từ trước)',ieShiftHours:'Giờ mô phỏng',ieSAM:'SAM phút công / đôi',ieCycle:'Nhịp IE giây / đôi',ieDedicatedHC:'Nhân lực riêng theo IE',ieEfficiency:'Hiệu suất mục tiêu %',ieNotes:'Ghi chú / nguồn định mức IE',ieSave:'Lưu IE / thêm mã giày',
 ieRegistryTitle:'Danh mục mã giày và định mức IE',ieRegistrySub:'Thêm mã giày và phiên bản IE theo ngày hiệu lực; xóa IE không xóa dữ liệu sản xuất.',ieMixTitle:'Định mức IE × Cơ cấu mã giày thực tế',ieMixSub:'Tính nhân lực từ sản lượng từng mã và định mức IE có hiệu lực; không suy đoán khi thiếu dữ liệu.',ieEdit:'Thêm / sửa tiêu chuẩn IE'
};
Object.assign(translations.zh,zh);Object.assign(translations.vn,vn);
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
const label=(a,b)=>tr(a,b);
const dateFor=(m,d)=>allIE().filter(x=>code(x.model)===code(m)&&(!x.effectiveDate||x.effectiveDate<=d)).sort((a,b)=>String(b.effectiveDate||'').localeCompare(String(a.effectiveDate||'')))[0]||null;
const currentIE=m=>dateFor(m,'9999-12-31');
function modelCodes(){return [...new Set([...state.models.map(x=>code(x.model)),...allIE().map(x=>code(x.model))].filter(Boolean))].sort();}
function syncModels(){const list=$('modelOptions');if(!list)return;list.replaceChildren(...modelCodes().map(x=>new Option(x,x)));}
function processCalc(r,p,hours){
 const sam=numeric(r?.[p+'Sam']),cycle=numeric(r?.[p+'Cycle']),hc=numeric(r?.[p+'HC']),eff=numeric(r?.[p+'Eff']);
 const laborPace=positive(sam)&&validHC(hc)&&validEff(eff)?sam*60/(hc*eff/100):null;
 const interval=positive(cycle)&&positive(laborPace)?Math.max(cycle,laborPace):positive(laborPace)?laborPace:positive(cycle)?cycle:null;
 return {sam,cycle,hc,eff,laborPace,interval,pairs:positive(interval)&&positive(hours)?Math.floor(hours*3600/interval+1e-9):null,complete:positive(laborPace),cycleOnly:!positive(laborPace)&&positive(cycle)};
}
function iePreview(p){const hours=nfield('ieShiftHours');const r={};for(const k of ['Sam','Cycle','HC','Eff'])r[p+k]=nfield('ie'+(p==='gc'?'Gc':'Asm')+k);
 const v=processCalc(r,p,hours),el=$('ie'+(p==='gc'?'Gc':'Asm')+'Preview');
 if(!positive(v.interval)){el.textContent=label('請輸入SAM＋專用HC＋效率，或IE節拍，以計算標準每雙間隔。','Nhập SAM + HC + hiệu suất, hoặc nhịp IE, để tính khoảng cách giữa hai đôi.');return;}
 const status=v.cycleOnly?label('僅節拍理論上限；尚未驗證人力可行性','Chỉ giới hạn lý thuyết theo nhịp; chưa kiểm chứng nhân lực'):label('SAM人力限制與節拍限制取較慢者','Lấy nhịp chậm hơn giữa SAM và giới hạn chuyền');
 el.textContent=label('預估完成間隔：','Khoảng cách dự kiến: ')+fmt(v.interval,2)+label('秒／雙；',' giây/đôi; ')+label('模擬產量：','Sản lượng dự kiến: ')+int(v.pairs)+label('雙。',' đôi. ')+status;
}
function preview(){iePreview('gc');iePreview('asm');}
function clearForm(){editingKey=null;$('ieForm').reset();$('ieShiftHours').value='8';$('ieEditingHint').textContent='';preview();}
function readForm(){const model=code(field('ieModel'));if(!model||model.length>70||!(/^[\p{L}\p{N}._+\-\s/]+$/u).test(model))throw new Error(label('請輸入有效型體代碼（字母、數字、-、_等）','Nhập mã giày hợp lệ'));
 const effectiveDate=field('ieEffectiveDate');if(effectiveDate&&!validDate(effectiveDate))throw new Error(label('IE生效日不正確','Ngày hiệu lực IE không hợp lệ'));
 const record={model,name:field('ieDisplayName'),effectiveDate,notes:field('ieNotes'),updatedAt:new Date().toISOString()};
 for(const p of ['gc','asm'])for(const k of ['Sam','Cycle','HC','Eff']){const val=nfield('ie'+(p==='gc'?'Gc':'Asm')+k);if(val!==null){if(k==='HC'&&!validHC(val))throw new Error(label('IE HC須為正整數','Nhân lực IE phải là số nguyên dương'));if(k==='Eff'&&!validEff(val))throw new Error(label('目標效率需介於0至100%','Hiệu suất mục tiêu phải trên 0 và không quá 100%'));if(['Sam','Cycle'].includes(k)&&!positive(val))throw new Error(label('SAM與節拍必須大於0','SAM và nhịp phải lớn hơn 0'));}record[p+k]=val;}
 return record;
}
async function saveIE(e){e.preventDefault();let record;try{record=readForm();}catch(err){showMessage(err.message,true);return;}
 const newKey=ieKey(record),existing=allIE().find(x=>ieKey(x)===newKey);
 if(existing&&editingKey!==newKey&&!confirm(label('相同型體及生效日已存在IE標準，確定覆蓋？','Đã có định mức IE cùng mã và ngày hiệu lực. Ghi đè?')))return;
 await window.commitFactoryMutation('IE standard '+newKey,()=>{state.ieStandards=allIE().filter(x=>ieKey(x)!==newKey&&ieKey(x)!==editingKey);state.ieStandards.push(record);});
 clearForm();
}
function editIE(r){editingKey=ieKey(r);const vals={ieModel:r.model,ieDisplayName:r.name,ieEffectiveDate:r.effectiveDate,ieNotes:r.notes};for(const p of ['gc','asm'])for(const k of ['Sam','Cycle','HC','Eff'])vals['ie'+(p==='gc'?'Gc':'Asm')+k]=r[p+k];for(const [id,val]of Object.entries(vals))$(id).value=val??'';$('ieEditingHint').textContent=label('編輯IE版本：','Sửa phiên bản IE: ')+editingKey;preview();window.switchEntryTab?.('ie');setView('entry');$('ieForm').scrollIntoView({behavior:'smooth',block:'start'});}
async function deleteIE(r){if(!confirm(label('確定刪除此型體的IE標準版本？生產紀錄不受影響。','Xóa phiên bản IE này? Dữ liệu sản xuất không bị xóa.')))return;await window.commitFactoryMutation('Delete IE '+ieKey(r),()=>{state.ieStandards=allIE().filter(x=>ieKey(x)!==ieKey(r));});if(editingKey===ieKey(r))clearForm();}
function renderRegistry(){syncModels();const rows=[...allIE()].sort((a,b)=>code(a.model).localeCompare(code(b.model))||String(b.effectiveDate||'').localeCompare(String(a.effectiveDate||'')));registryRows=rows;
 const names=new Set(modelCodes());const notConfigured=[...names].filter(m=>!rows.some(r=>code(r.model)===m));
 const renderRow=(r,i)=>`<tr><td class="highlight">${esc(r.model)}</td><td>${esc(r.name||'—')}</td><td>${esc(r.effectiveDate||label('歷史通用','Từ đầu'))}</td><td class="numeric">${fmt(numeric(r.gcSam),2)}</td><td class="numeric">${fmt(numeric(r.gcCycle),1)}</td><td class="numeric">${fmt(numeric(r.asmSam),2)}</td><td class="numeric">${fmt(numeric(r.asmCycle),1)}</td><td class="ie-registry-controls"><button type="button" class="entry-row-btn" data-ie-action="edit" data-ie-index="${i}">${label('編輯','Sửa')}</button><button type="button" class="entry-row-btn danger" data-ie-action="delete" data-ie-index="${i}">${label('刪除','Xóa')}</button></td></tr>`;
 const blankRows=notConfigured.map(m=>`<tr><td class="highlight">${esc(m)}</td><td colspan="6" class="ie-pending">${label('尚未輸入IE標準','Chưa nhập định mức IE')}</td><td><button type="button" class="entry-row-btn" data-ie-action="new" data-ie-model="${esc(m)}">${label('建立IE','Tạo IE')}</button></td></tr>`);
 $('ieRegistryTable').innerHTML=rows.length||blankRows.length?`<table class="data-table"><thead><tr><th>Model</th><th>${label('名稱','Tên')}</th><th>${label('生效日','Hiệu lực')}</th><th class="numeric">GCĐ SAM</th><th class="numeric">GCĐ CT(s)</th><th class="numeric">TH SAM</th><th class="numeric">TH CT(s)</th><th>${label('操作','Thao tác')}</th></tr></thead><tbody>${rows.map(renderRow).join('')}${blankRows.join('')}</tbody></table>`:empty(label('尚無型體，請建立第一個型體IE標準。','Chưa có mã giày; hãy thêm tiêu chuẩn IE đầu tiên.'));
}
function renderMix(){const compare=periods().compare,dates=new Set(compare.map(r=>r.date)),records=state.models.filter(m=>dates.has(m.date)),names=new Set(modelCodes()),rows=[];
 for(const model of names){const parts=records.filter(r=>code(r.model)===model);const gcPairs=parts.reduce((s,r)=>s+(Number.isFinite(r.gcNormal)&&r.gcNormal>=0?r.gcNormal:0),0),asmPairs=parts.reduce((s,r)=>s+(Number.isFinite(r.asmNormal)&&r.asmNormal>=0?r.asmNormal:0),0);
 const ie=currentIE(model),gc=processCalc(ie,'gc',8),asm=processCalc(ie,'asm',8);
 rows.push({model,name:ie?.name||'',gcPairs,asmPairs,ie,gc,asm});}
 const body=rows.map(r=>`<tr><td class="highlight">${esc(r.model)}${r.name?`<small class="ie-small"> · ${esc(r.name)}</small>`:''}</td><td class="numeric">${int(r.gcPairs)}</td><td class="numeric">${fmt(r.gc.sam,2)}</td><td class="numeric">${fmt(r.gc.cycle,1)}</td><td class="numeric">${r.gc.complete?fmt(r.gc.interval,1):r.gc.cycleOnly?`${fmt(r.gc.interval,1)}*`:'—'}</td><td class="numeric">${r.gc.pairs!==null?int(r.gc.pairs):'—'}</td><td class="numeric">${int(r.asmPairs)}</td><td class="numeric">${fmt(r.asm.sam,2)}</td><td class="numeric">${fmt(r.asm.cycle,1)}</td><td class="numeric">${r.asm.complete?fmt(r.asm.interval,1):r.asm.cycleOnly?`${fmt(r.asm.interval,1)}*`:'—'}</td><td class="numeric">${r.asm.pairs!==null?int(r.asm.pairs):'—'}</td></tr>`).join('');
 $('ieMixTable').innerHTML=rows.length?`<table class="data-table"><thead><tr><th>Model</th><th class="numeric">GCĐ ${label('雙數','Đôi')}</th><th class="numeric">GCĐ SAM</th><th class="numeric">GCĐ CT(s)</th><th class="numeric">GCĐ ${label('秒/雙','Giây/đôi')}</th><th class="numeric">GCĐ ${label('8H目標','Mục tiêu 8H')}</th><th class="numeric">TH ${label('雙數','Đôi')}</th><th class="numeric">TH SAM</th><th class="numeric">TH CT(s)</th><th class="numeric">TH ${label('秒/雙','Giây/đôi')}</th><th class="numeric">TH ${label('8H目標','Mục tiêu 8H')}</th></tr></thead><tbody>${body}</tbody></table><p class="ie-mix-note">* ${label('只有節拍資料時為理論節拍上限，未確認HC與SAM，不能視為合理人力產能。表中8H目標使用IE專用HC與目標效率；缺值不推算。','Nếu chỉ có nhịp chuyền, đây là giới hạn lý thuyết; chưa xác nhận SAM và nhân lực. Mục tiêu 8H chỉ được tính khi đủ dữ liệu.')}</p>`:empty(label('請先新增型體。','Hãy thêm mã giày.'));
 const summary=[];
 for(const [p,name,normal,hours,hc] of [['gc','Stockfit / GCĐ','gcNormal','gcHours','gcHC'],['asm','Assembly / TH','asmNormal','asmHours','asmHC']]){
  let adjustedLaborMinutes=0,coveredPairs=0,allPairs=0,missing=[],unrecorded=[],reconcile=true,missingNormal=false;
  for(const day of compare){const ms=records.filter(m=>m.date===day.date),dailyTotal=numeric(day[normal]),modelTotal=ms.reduce((s,m)=>s+(Number.isFinite(m[normal])&&m[normal]>=0?m[normal]:0),0);
   if(dailyTotal===null||ms.some(m=>m[normal]===null||m[normal]===undefined)){missingNormal=true;reconcile=false;}
   if(dailyTotal!==null&&Math.abs(modelTotal-dailyTotal)>1){reconcile=false;unrecorded.push(day.date);}
   for(const m of ms){const pairs=numeric(m[normal]);if(pairs===null||pairs<0)continue;allPairs+=pairs;if(!pairs)continue;const standard=dateFor(m.model,m.date),sam=numeric(standard?.[p+'Sam']),eff=numeric(standard?.[p+'Eff']);if(!positive(sam)||!validEff(eff)){missing.push(m.model+' '+m.date);continue;}coveredPairs+=pairs;adjustedLaborMinutes+=pairs*sam/(eff/100);}
  }
  const availableHours=compare.reduce((s,d)=>s+(positive(numeric(d[hours]))?numeric(d[hours]):0),0);
  const complete=compare.length>0&&reconcile&&!missingNormal&&!missing.length&&availableHours>0&&allPairs>0;
  const avgRequiredHC=complete?Math.ceil(adjustedLaborMinutes/(availableHours*60)):null;
  const avgActualHC=compare.length?compare.reduce((s,d)=>s+(positive(numeric(d[hc]))?numeric(d[hc]):0),0)/compare.length:null;
  summary.push(`<div class="ie-summary-card"><small>${name} · ${label('IE型體組合','Cơ cấu IE')}</small><b>${complete?int(avgRequiredHC)+' HC':label('待補IE','Thiếu IE')}</b><p>${label('已覆蓋','Đã có định mức')} ${int(coveredPairs)} / ${int(allPairs)} ${label('雙','đôi')} · ${label('實際平均','HC thực tế TB')} ${fmt(avgActualHC,1)} HC</p><p>${complete?label('依SAM、目標效率與工時估算；不含WIP及品質損失','Tính theo SAM, hiệu suất và giờ công; chưa tính WIP và lỗi'):label('需補SAM／效率及核對型體與日報總數','Cần đủ SAM / hiệu suất và đối chiếu tổng ngày')}${!reconcile?` · ${label('總數不符','Tổng không khớp')}`:''}</p></div>`);
 }
 summary.push(`<div class="ie-summary-card"><small>${label('IE版本與型體擴充','Phiên bản IE & mã giày')}</small><b>${int(allIE().length)} ${label('筆','bản ghi')}</b><p>${int(modelCodes().length)} ${label('種型體','mã giày')} · ${int(compare.length)} ${label('個比較生產日','ngày so sánh')}</p><p>${label('可新增生效日期版本；不會變更歷史生產紀錄','Có thể thêm phiên bản theo ngày hiệu lực, không sửa dữ liệu sản xuất cũ')}</p></div>`);
 $('ieMixSummary').innerHTML=summary.join('');
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
