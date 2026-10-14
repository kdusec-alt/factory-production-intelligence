'use strict';
/* Factory Production Intelligence V1.3: browser-local CRUD + audit history.
   GitHub Pages is static. Data is stored in this browser's IndexedDB only. */
(() => {
const tzh = {
 entry:'每日登錄',entryTitle:'每日生產資料登錄',entrySub:'直接輸入並儲存，儀表板、HC產能模擬與異常分析即時更新。',quickEntry:'＋ 新增日報',localDB:'本機資料庫',tabDaily:'每日總產量',tabModel:'型體明細',tabQuality:'品質改善追蹤',tabBackup:'資料備份與紀錄',dailyFormTitle:'日產量與HC登錄',dailyFormSub:'8H正常班產量＝當日總產量－OT完成雙數；缺少OT資料請留空，勿填假0。',date:'生產日期',entryOperator:'登錄人員／備註',totalPairs:'當日總完成雙數',normalHC:'正常班 HC',otPairs:'OT完成雙數',otHC:'OT HC',normalHours:'正常班工時',otHours:'OT工時（如有）',noOT:'確認當日完全沒有OT（OT產量設為0）',saveDaily:'儲存當日紀錄',newRecord:'新增／清空表單',recentRecords:'最近生產紀錄',editHint:'按「編輯」修改既有資料，分析自動重算。',modelFormTitle:'型體產量登錄',modelFormSub:'同一日期、同一型體為一筆紀錄；共用HC不分攤到各型體。',modelName:'型體代碼',saveModel:'儲存型體資料',recentModels:'最近型體紀錄',qualityFormTitle:'品質異常與改善追蹤',qualityFormSub:'記錄問題、當責人、改善措施、追蹤狀態與期限。',area:'區域',affected:'影響雙數',directOwner:'當責幹部',seniorOwner:'高階幹部',qualityStatus:'改善狀態',dueDate:'改善期限',issueDescription:'問題描述',actionTaken:'改善措施／追蹤紀錄',saveQuality:'儲存品質問題',recentQuality:'品質改善紀錄',backupTitle:'資料庫備份與復原',backupSub:'資料保存在此瀏覽器。換電腦或清除瀏覽資料前，請先下載JSON備份。',exportBackup:'下載完整JSON備份',importBackup:'還原JSON備份',undoChange:'回復上次修改',storageLimitTitle:'儲存限制',storageLimit:'這是單一瀏覽器資料庫，無跨電腦自動同步，也不是多人共用雲端資料庫；清除瀏覽器資料可能導致紀錄遺失。',changeLog:'最近修改紀錄',downloadVN:'匯出備份',upload:'匯入舊Excel',clear:'資料管理',demo:'恢復初始資料',localProcessing:'本機紀錄與分析',localNote:'每日輸入自動保存到目前瀏覽器。換裝置請使用JSON備份／還原。',footer:'本機IndexedDB自動儲存 · 尚未接入多人共用資料庫',overviewSub:'直接輸入日產量、HC與品質問題，系統自動儲存並分析。'
};
const tvn = {
 entry:'Nhập dữ liệu',entryTitle:'Nhập dữ liệu sản xuất hằng ngày',entrySub:'Nhập và lưu trực tiếp; các biểu đồ, kế hoạch nhân lực và cảnh báo cập nhật ngay.',quickEntry:'＋ Nhập báo cáo ngày',localDB:'Cơ sở dữ liệu trên thiết bị',tabDaily:'Sản lượng hằng ngày',tabModel:'Chi tiết mã giày',tabQuality:'Theo dõi cải tiến chất lượng',tabBackup:'Sao lưu và lịch sử',dailyFormTitle:'Nhập sản lượng và nhân lực',dailyFormSub:'Sản lượng 8H = tổng thành phẩm ngày − sản lượng OT; nếu thiếu số liệu OT hãy để trống, không nhập số 0 giả.',date:'Ngày sản xuất',entryOperator:'Người nhập / ghi chú',totalPairs:'Tổng số đôi hoàn thành',normalHC:'Nhân lực ca chính',otPairs:'Số đôi hoàn thành OT',otHC:'Nhân lực OT',normalHours:'Giờ làm ca chính',otHours:'Số giờ OT (nếu có)',noOT:'Xác nhận ngày này hoàn toàn không có OT (sản lượng OT = 0)',saveDaily:'Lưu báo cáo ngày',newRecord:'Tạo mới / xóa biểu mẫu',recentRecords:'Báo cáo sản xuất gần đây',editHint:'Nhấn “Sửa” để chỉnh sửa số liệu đã lưu; kết quả phân tích được tính lại.',modelFormTitle:'Nhập sản lượng theo mã giày',modelFormSub:'Mỗi ngày và mã giày là một bản ghi; không phân bổ nhân lực dùng chung.',modelName:'Mã giày',saveModel:'Lưu dữ liệu mã giày',recentModels:'Bản ghi mã giày gần đây',qualityFormTitle:'Theo dõi vấn đề và cải tiến chất lượng',qualityFormSub:'Ghi nhận vấn đề, người phụ trách, biện pháp, trạng thái và thời hạn.',area:'Khu vực',affected:'Số đôi ảnh hưởng',directOwner:'Cán bộ trực tiếp',seniorOwner:'Cán bộ cấp cao',qualityStatus:'Trạng thái cải tiến',dueDate:'Hạn hoàn thành',issueDescription:'Mô tả vấn đề',actionTaken:'Biện pháp cải tiến / theo dõi',saveQuality:'Lưu vấn đề chất lượng',recentQuality:'Lịch sử cải tiến chất lượng',backupTitle:'Sao lưu và khôi phục dữ liệu',backupSub:'Dữ liệu nằm trong trình duyệt này. Trước khi đổi máy hoặc xóa dữ liệu trình duyệt, hãy tải bản sao lưu JSON.',exportBackup:'Tải sao lưu JSON đầy đủ',importBackup:'Khôi phục từ JSON',undoChange:'Hoàn tác lần sửa gần nhất',storageLimitTitle:'Giới hạn lưu trữ',storageLimit:'Đây là cơ sở dữ liệu của một trình duyệt, không tự đồng bộ giữa các máy và không phải cơ sở dữ liệu chung nhiều người. Xóa dữ liệu trình duyệt có thể làm mất bản ghi.',changeLog:'Lịch sử thay đổi gần đây',downloadVN:'Xuất bản sao lưu',upload:'Nhập Excel cũ',clear:'Quản lý dữ liệu',demo:'Khôi phục dữ liệu gốc',localProcessing:'Ghi nhận tại thiết bị',localNote:'Dữ liệu nhập hằng ngày được tự động lưu trong trình duyệt này. Dùng sao lưu JSON để chuyển máy.',footer:'Tự động lưu bằng IndexedDB · Chưa có cơ sở dữ liệu dùng chung',overviewSub:'Nhập trực tiếp sản lượng, nhân lực và vấn đề chất lượng; hệ thống tự lưu và phân tích.'
};
Object.assign(translations.zh,tzh); Object.assign(translations.vn,tvn);
const DB_NAME='factory-production-intelligence-v13';
const DB_VERSION=1;
let db=null, currentTab='daily', editingDaily=null, editingModel=null, editingQuality=null, revisions=[];
let busy=false;
const today=()=>{const d=new Date();return new Date(d.getTime()-d.getTimezoneOffset()*60000).toISOString().slice(0,10);};
const deep=x=>JSON.parse(JSON.stringify(x));
const allState=()=>deep({daily:state.daily,models:state.models,quality:state.quality,ieStandards:state.ieStandards||[],files:state.files,importNotes:state.importNotes,demo:false,hosted:false});
window.captureFactoryState=allState;
const applyState=s=>{
 if(!s||!Array.isArray(s.daily)||!Array.isArray(s.models)||!Array.isArray(s.quality))throw new Error('Invalid backup schema');
 if(s.daily.length>100000||s.models.length>500000||s.quality.length>100000)throw new Error('Backup too large');
 const dates=new Set();
 state.daily=s.daily.map(r=>{
  if(!r||!validDate(r.date)||dates.has(r.date))throw new Error('Invalid or duplicated daily date');
  dates.add(r.date);return normDaily(r);
 }).sort((a,b)=>a.date.localeCompare(b.date));
 state.models=s.models.map(r=>{
  if(!r||!validDate(r.date)||!String(r.model||'').trim())throw new Error('Invalid model record');
  const gcTotal=nval(r.gcTotal),gcOT=nval(r.gcOT),asmTotal=nval(r.asmTotal),asmOT=nval(r.asmOT);
  return {...r,gcTotal,gcOT,asmTotal,asmOT,gcNormal:gcTotal===null||gcOT===null?null:gcTotal-gcOT,asmNormal:asmTotal===null||asmOT===null?null:asmTotal-asmOT};
 });
 state.quality=s.quality.map((q,i)=>({...q,id:q.id||`legacy-${i}`}));
 state.ieStandards=Array.isArray(s.ieStandards)?s.ieStandards.map(x=>({...x})):[];
 state.files=Array.isArray(s.files)?s.files:['Browser Database'];
 state.importNotes=Array.isArray(s.importNotes)?s.importNotes:[];
 state.demo=false;state.hosted=false;
};
const request=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error||new Error('IndexedDB request failed'));});
function openDB(){return new Promise((resolve,reject)=>{
 if(!('indexedDB' in window)){reject(new Error('Browser IndexedDB unavailable'));return;}
 const r=indexedDB.open(DB_NAME,DB_VERSION);
 r.onupgradeneeded=()=>{const d=r.result;if(!d.objectStoreNames.contains('snapshots'))d.createObjectStore('snapshots');if(!d.objectStoreNames.contains('revisions'))d.createObjectStore('revisions',{keyPath:'id',autoIncrement:true});};
 r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error||new Error('Cannot open IndexedDB'));
});}
function getStoredSnapshot(){return request(db.transaction('snapshots','readonly').objectStore('snapshots').get('active'));}
function getRevisions(){return request(db.transaction('revisions','readonly').objectStore('revisions').getAll());}
async function persist(action,before=null){
 if(!db)throw new Error('Local database not ready');
 const snapshot=allState();const now=new Date().toISOString();
 await new Promise((resolve,reject)=>{
  const tx=db.transaction(['snapshots','revisions'],'readwrite');
  tx.objectStore('snapshots').put({snapshot,savedAt:now,version:13},'active');
  if(before)tx.objectStore('revisions').add({at:now,action,before});
  tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||new Error('Database write failed'));tx.onabort=()=>reject(tx.error||new Error('Database write aborted'));
 });
 revisions=(await getRevisions()).slice(-30).reverse();
 $('dbStatus').textContent=tr('已儲存於此瀏覽器','Đã lưu trên trình duyệt này')+' · '+new Date(now).toLocaleString(state.lang==='zh'?'zh-TW':'vi-VN')+' · '+state.daily.length+' '+tr('生產日','ngày sản xuất');
}
window.commitFactoryMutation=commit;
window.persistFactoryState=async(action='External import',before=null)=>{
 try{await persist(action,before);render();}catch(e){showMessage(tr('本機儲存失敗：','Lưu trên thiết bị thất bại: ')+e.message,true);throw e;}
};
async function commit(action,mutate){
 if(busy)return;busy=true;const before=allState();
 try{mutate();state.files=['Browser Database · '+tr('每日登錄','Nhập hằng ngày')];state.hosted=false;state.demo=false;await persist(action,before);render();showMessage(tr('已成功儲存並更新分析：','Đã lưu và cập nhật phân tích: ')+action);}
 catch(e){applyState(before);render();showMessage(tr('儲存失敗，已復原原資料：','Lưu thất bại, đã khôi phục dữ liệu trước: ')+String(e.message||e),true);}
 finally{busy=false;}
}
const v=id=>$(id).value.trim();
const nv=id=>nval(v(id));
function validNonNegative(n){return n===null||(Number.isInteger(n)&&n>=0);}
function checkTotals(total,ot,hc,hours,otHC,label){
 if(!Number.isInteger(total)||total<0)throw new Error(label+': '+tr('總產量需為非負整數','Tổng sản lượng phải là số nguyên không âm'));
 if(!Number.isInteger(hc)||hc<1)throw new Error(label+': '+tr('HC需大於0','Nhân lực phải lớn hơn 0'));
 if(!Number.isFinite(hours)||hours<=0||hours>24)throw new Error(label+': '+tr('正常工時需介於0–24','Giờ làm chính phải từ 0 đến 24'));
 if(!validNonNegative(ot)||!validNonNegative(otHC))throw new Error(label+': '+tr('OT雙數／人數不得為負數或小數','Sản lượng / nhân lực OT phải là số nguyên không âm'));
 if(ot!==null&&ot>total)throw new Error(label+': '+tr('OT產量不得超過當日總產量','Sản lượng OT không thể lớn hơn tổng sản lượng'));
}
function dailyFormData(){
 const date=v('entryDate');if(!validDate(date))throw new Error(tr('請選擇有效日期','Chọn ngày hợp lệ'));
 const noOT=$('entryNoOT').checked;
 const gcTotal=nv('entryGcTotal'),asmTotal=nv('entryAsmTotal'),gcHC=nv('entryGcHC'),asmHC=nv('entryAsmHC');
 const gcOT=noOT?0:nv('entryGcOT'),asmOT=noOT?0:nv('entryAsmOT');
 const gcOTHC=noOT?null:nv('entryGcOTHC'),asmOTHC=noOT?null:nv('entryAsmOTHC');
 const gcHours=nv('entryGcHours'),asmHours=nv('entryAsmHours');
 checkTotals(gcTotal,gcOT,gcHC,gcHours,gcOTHC,'GCĐ');checkTotals(asmTotal,asmOT,asmHC,asmHours,asmOTHC,'TH');
 const otHours=noOT?0:nv('entryOtHours');if(otHours!==null&&(!Number.isFinite(otHours)||otHours<0||otHours>16))throw new Error(tr('OT工時不正確','Số giờ OT không hợp lệ'));
 return normDaily({date,gcTotal,gcHC,gcOT,gcOTHC,gcHours,asmTotal,asmHC,asmOT,asmOTHC,asmHours,otHours,operator:v('entryOperator')});
}
function clearDaily(){editingDaily=null;$('dailyForm').reset();$('entryDate').value=today();$('entryGcHours').value=8;$('entryAsmHours').value=8;$('dailyEditingHint').textContent='';livePreview();}
function editDaily(date){const r=state.daily.find(x=>x.date===date);if(!r)return;editingDaily=date;
 const fields={entryDate:r.date,entryGcTotal:r.gcTotal,entryGcHC:r.gcHC,entryGcOT:r.gcOT,entryGcOTHC:r.gcOTHC,entryGcHours:r.gcHours,entryAsmTotal:r.asmTotal,entryAsmHC:r.asmHC,entryAsmOT:r.asmOT,entryAsmOTHC:r.asmOTHC,entryAsmHours:r.asmHours,entryOtHours:r.otHours,entryOperator:r.operator};
 Object.entries(fields).forEach(([id,val])=>$(id).value=val===null||val===undefined?'':val);
 $('entryNoOT').checked=r.gcOT===0&&r.asmOT===0&&r.otHours===0;
 $('dailyEditingHint').textContent=tr('正在編輯','Đang sửa')+' '+date;switchTab('daily');setView('entry');livePreview();$('dailyForm').scrollIntoView({behavior:'smooth',block:'start'});
}
function livePreview(){for(const [prefix,key] of [['entryGc','gcLivePreview'],['entryAsm','asmLivePreview']]){
 const total=nv(prefix+'Total'),hc=nv(prefix+'HC'),ot=$('entryNoOT').checked?0:nv(prefix+'OT'),hours=nv(prefix+'Hours');
 const normal=total!==null&&ot!==null&&ot<=total?total-ot:null;
 const rate=normal!==null&&hc>0&&hours>0?normal/(hc*hours):null;
 $(key).textContent=tr('8H完成產量','Sản lượng 8H')+': '+(normal===null?'—':int(normal))+' '+tr('雙','đôi')+' · '+tr('人時產出','Đôi/giờ công')+': '+(rate===null?'—':fmt(rate,3));
}}
function saveDaily(e){e.preventDefault();try{
 const r=dailyFormData();const exists=state.daily.find(x=>x.date===r.date);
 if(exists&&editingDaily!==r.date&&!confirm(tr('此日期已有資料。確定覆蓋？','Ngày này đã có dữ liệu. Bạn muốn ghi đè?')))return;
 void commit('Daily '+r.date,()=>{if(editingDaily&&editingDaily!==r.date){state.daily=state.daily.filter(x=>x.date!==editingDaily);state.models=state.models.map(x=>x.date===editingDaily?{...x,date:r.date}:x);}state.daily=state.daily.filter(x=>x.date!==r.date);state.daily.push(r);state.daily.sort((a,b)=>a.date.localeCompare(b.date));setDefaultPeriods();}).then(()=>{clearDaily();});
 }catch(e){showMessage(e.message,true);}}
function deleteDaily(date){if(!confirm(tr('確定刪除','Xác nhận xóa')+' '+date+tr('及其型體明細？',' và tất cả dữ liệu mã giày của ngày đó?')))return;
 void commit('Delete daily '+date,()=>{state.daily=state.daily.filter(r=>r.date!==date);state.models=state.models.filter(r=>r.date!==date);if(state.daily.length)setDefaultPeriods();});}
function modelFormData(){const date=v('modelDate'),model=v('modelName').toUpperCase();if(!validDate(date)||!model)throw new Error(tr('請填日期與型體','Nhập ngày và mã giày'));
 const gcTotal=nv('modelGcTotal'),gcOT=nv('modelGcOT'),asmTotal=nv('modelAsmTotal'),asmOT=nv('modelAsmOT');
 if([gcTotal,gcOT,asmTotal,asmOT].some(x=>!validNonNegative(x)))throw new Error(tr('產量必須為非負整數','Sản lượng phải là số nguyên không âm'));
 if(gcTotal===null&&asmTotal===null)throw new Error(tr('至少填一個製程產量','Cần nhập sản lượng của ít nhất một công đoạn'));
 if(gcTotal!==null&&gcOT!==null&&gcOT>gcTotal||asmTotal!==null&&asmOT!==null&&asmOT>asmTotal)throw new Error(tr('OT不得超過總產量','OT không được vượt tổng sản lượng'));
 return {date,model,gcTotal,gcOT,gcNormal:gcTotal===null||gcOT===null?null:gcTotal-gcOT,asmTotal,asmOT,asmNormal:asmTotal===null||asmOT===null?null:asmTotal-asmOT};}
function clearModel(){editingModel=null;$('modelForm').reset();$('modelDate').value=v('entryDate')||today();$('modelEditingHint').textContent='';}
function editModel(date,model){const r=state.models.find(x=>x.date===date&&x.model===model);if(!r)return;editingModel=date+'|'+model;const fields={modelDate:r.date,modelName:r.model,modelGcTotal:r.gcTotal,modelGcOT:r.gcOT,modelAsmTotal:r.asmTotal,modelAsmOT:r.asmOT};Object.entries(fields).forEach(([id,val])=>$(id).value=val===null||val===undefined?'':val);$('modelEditingHint').textContent=tr('正在編輯','Đang sửa')+' '+date+' / '+model;switchTab('model');setView('entry');$('modelForm').scrollIntoView({behavior:'smooth'});}
function saveModel(e){e.preventDefault();try{const r=modelFormData();const key=r.date+'|'+r.model;
 if(!state.daily.some(x=>x.date===r.date)&&!confirm(tr('此日期尚無每日總產量，仍要儲存型體明細？','Chưa có tổng sản lượng ngày này. Vẫn lưu dữ liệu mã giày?')))return;
 if(state.models.some(x=>x.date+'|'+x.model===key)&&editingModel!==key&&!confirm(tr('同日期型體已存在。確定覆蓋？','Mã giày đã tồn tại trong ngày. Ghi đè?')))return;
 void commit('Model '+key,()=>{state.models=state.models.filter(x=>x.date+'|'+x.model!==key&&x.date+'|'+x.model!==editingModel);state.models.push(r);state.models.sort((a,b)=>a.date.localeCompare(b.date)||a.model.localeCompare(b.model));}).then(clearModel);
 }catch(e){showMessage(e.message,true);}}
function deleteModel(date,model){if(!confirm(tr('確定刪除此型體紀錄？','Xóa bản ghi mã giày này?')))return;void commit('Delete model '+date+' '+model,()=>{state.models=state.models.filter(r=>!(r.date===date&&r.model===model));});}
function clearQuality(){editingQuality=null;$('qualityForm').reset();$('qualityDate').value=today();$('qualityEditingHint').textContent='';}
function qualityFormData(){const date=v('qualityDate'),model=v('qualityModel').toUpperCase(),description=v('qualityDesc'),affected=nv('qualityAffected');const original=editingQuality?state.quality.find(x=>x.id===editingQuality):null;const undatedLegacy=original&&!original.date&&!date;if((!validDate(date)&&!undatedLegacy)||!model||!description)throw new Error(tr('請填日期、型體及問題描述','Nhập ngày, mã giày và mô tả vấn đề'));if(!validNonNegative(affected))throw new Error(tr('影響雙數需為非負整數','Số đôi ảnh hưởng phải là số nguyên không âm'));
 const area=v('qualityArea');return {id:editingQuality||('q-'+(crypto.randomUUID?.()||String(Date.now()))),date:date||null,model,area,areaVN:area,type:'Manual',page:null,issue:'Manual',descriptionZH:description,descriptionVN:description,affected,direct:v('qualityOwner'),senior:v('qualitySenior'),status:v('qualityStatus'),dueDate:v('qualityDue'),action:v('qualityAction')};}
function editQuality(id){const q=state.quality.find(x=>x.id===id);if(!q)return;editingQuality=id;const fields={qualityDate:q.date||'',qualityModel:q.model,qualityArea:q.area,qualityAffected:q.affected,qualityOwner:q.direct,qualitySenior:q.senior,qualityStatus:q.status||'open',qualityDue:q.dueDate,qualityDesc:q.descriptionZH||q.descriptionVN,qualityAction:q.action};if(q.area&&!Array.from($('qualityArea').options).some(x=>x.value===q.area))$('qualityArea').add(new Option(q.area,q.area));Object.entries(fields).forEach(([key,val])=>$(key).value=val===null||val===undefined?'':val);$('qualityEditingHint').textContent=tr('正在編輯品質紀錄','Đang sửa vấn đề chất lượng');switchTab('quality');setView('entry');$('qualityForm').scrollIntoView({behavior:'smooth'});}
function saveQuality(e){e.preventDefault();try{const q=qualityFormData();void commit('Quality '+q.model+' '+q.date,()=>{const i=state.quality.findIndex(x=>x.id===q.id);if(i>=0){const old=state.quality[i];state.quality[i]={...old,...q,page:old.page,type:old.type,issue:old.issue,areaVN:old.areaVN,descriptionVN:q.descriptionZH===old.descriptionZH?old.descriptionVN:q.descriptionZH};}else state.quality.push(q);}).then(clearQuality);}catch(e){showMessage(e.message,true);}}
function deleteQuality(id){if(!confirm(tr('確定刪除品質紀錄？','Xóa vấn đề chất lượng này?')))return;void commit('Delete quality '+id,()=>{state.quality=state.quality.filter(x=>x.id!==id);});}
function statusLabel(s){return {open:tr('待改善','Chưa xử lý'),progress:tr('改善中','Đang xử lý'),closed:tr('已結案','Đã đóng')}[s]||'—';}
function switchTab(tab){currentTab=tab;document.querySelectorAll('.entry-tab').forEach(b=>b.classList.toggle('active',b.dataset.entryTab===tab));document.querySelectorAll('.entry-pane').forEach(p=>p.classList.toggle('active',p.id==='entry-'+tab));renderWorkspace();}
window.switchEntryTab=switchTab;
const editButton=(kind,index)=>`<button type="button" class="entry-row-btn" data-entry-action="edit-${kind}" data-index="${index}">${tr('編輯','Sửa')}</button>`;
const delButton=(kind,index)=>`<button type="button" class="entry-row-btn danger" data-entry-action="delete-${kind}" data-index="${index}">${tr('刪除','Xóa')}</button>`;
function renderWorkspace(){
 if(!$('entryDailyTable'))return;
 const recent=[...state.daily].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,20);
 $('entryDailyTable').innerHTML=recent.length?`<table class="data-table"><thead><tr><th>${tr('日期','Ngày')}</th><th>GCĐ</th><th>GCĐ HC</th><th>GCĐ OT</th><th>TH</th><th>TH HC</th><th>TH OT</th><th>${tr('操作','Thao tác')}</th></tr></thead><tbody>${recent.map((r,i)=>`<tr><td class="highlight">${esc(r.date)}</td><td>${int(r.gcTotal)}</td><td>${int(r.gcHC)}</td><td>${int(r.gcOT)}</td><td>${int(r.asmTotal)}</td><td>${int(r.asmHC)}</td><td>${int(r.asmOT)}</td><td>${editButton('daily',i)}${delButton('daily',i)}</td></tr>`).join('')}</tbody></table>`:empty(tr('尚無日報紀錄','Chưa có báo cáo ngày'));
 const recentModels=[...state.models].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,25);
 $('entryModelTable').innerHTML=recentModels.length?`<table class="data-table"><thead><tr><th>${tr('日期','Ngày')}</th><th>Model</th><th>GCĐ</th><th>GCĐ OT</th><th>TH</th><th>TH OT</th><th>${tr('操作','Thao tác')}</th></tr></thead><tbody>${recentModels.map((r,i)=>`<tr><td>${esc(r.date)}</td><td class="highlight">${esc(r.model)}</td><td>${int(r.gcTotal)}</td><td>${int(r.gcOT)}</td><td>${int(r.asmTotal)}</td><td>${int(r.asmOT)}</td><td>${editButton('model',i)}${delButton('model',i)}</td></tr>`).join('')}</tbody></table>`:empty(tr('尚無型體紀錄','Chưa có bản ghi mã giày'));
 const recentQuality=[...state.quality].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))).slice(0,35);
 $('entryQualityTable').innerHTML=recentQuality.length?`<table class="data-table"><thead><tr><th>${tr('日期','Ngày')}</th><th>${tr('區域','Khu vực')}</th><th>Model</th><th>${tr('問題','Vấn đề')}</th><th>${tr('狀態','Trạng thái')}</th><th>${tr('當責','Phụ trách')}</th><th>${tr('操作','Thao tác')}</th></tr></thead><tbody>${recentQuality.map((q,i)=>`<tr><td>${esc(q.date||'—')}</td><td>${esc(q.area||'—')}</td><td>${esc(q.model||'—')}</td><td title="${esc(q.descriptionZH||q.descriptionVN||'')}">${esc(String(q.descriptionZH||q.descriptionVN||'').slice(0,60))}</td><td>${esc(statusLabel(q.status))}</td><td>${esc(q.direct||'—')}</td><td>${editButton('quality',i)}${delButton('quality',i)}</td></tr>`).join('')}</tbody></table>`:empty(tr('尚無品質紀錄','Chưa có bản ghi chất lượng'));
 $('revisionTable').innerHTML=revisions.length?`<table class="data-table"><thead><tr><th>${tr('時間','Thời gian')}</th><th>${tr('修改項目','Thao tác')}</th></tr></thead><tbody>${revisions.slice(0,15).map(r=>`<tr><td>${esc(new Date(r.at).toLocaleString(state.lang==='zh'?'zh-TW':'vi-VN'))}</td><td>${esc(r.action)}</td></tr>`).join('')}</tbody></table>`:empty(tr('目前沒有修改紀錄','Chưa có lịch sử thay đổi'));
}
window.renderRecordWorkspace=renderWorkspace;
function exportBackup(){const data={format:'factory-production-intelligence',schemaVersion:14,exportedAt:new Date().toISOString(),snapshot:allState()};const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json;charset=utf-8'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='factory-production-backup-'+today()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1500);}
window.exportFactoryBackup=exportBackup;
async function importBackup(file){if(file.size>25*1024*1024)throw new Error('Backup exceeds 25MB');const raw=JSON.parse(await file.text());if(raw.format!=='factory-production-intelligence'||![13,14].includes(raw.schemaVersion)||!raw.snapshot)throw new Error('Invalid backup format');if(!confirm(tr('還原備份將取代目前本機資料，確定繼續？','Khôi phục bản sao lưu sẽ thay thế dữ liệu hiện tại. Tiếp tục?')))return;await commit('Restore JSON backup',()=>{applyState(raw.snapshot);setDefaultPeriods();});}
async function undo(){const last=revisions[0];if(!last||!last.before){showMessage(tr('沒有可回復的修改紀錄','Không có bản ghi để hoàn tác'),true);return;}if(!confirm(tr('確定回復上次修改前的資料？','Khôi phục dữ liệu trước lần sửa gần nhất?')))return;await commit('Undo '+last.action,()=>{applyState(last.before);setDefaultPeriods();});}
function bindWorkspace(){
 $('quickEntry').addEventListener('click',()=>{setView('entry');switchTab('daily');$('entryDate').focus();});
 $('goEntry').addEventListener('click',()=>{setView('entry');switchTab('daily');});
 document.querySelectorAll('.entry-tab').forEach(el=>el.addEventListener('click',()=>switchTab(el.dataset.entryTab)));
 $('dailyForm').addEventListener('submit',saveDaily);$('modelForm').addEventListener('submit',saveModel);$('qualityForm').addEventListener('submit',saveQuality);
 $('resetDaily').addEventListener('click',clearDaily);$('resetModel').addEventListener('click',clearModel);$('resetQuality').addEventListener('click',clearQuality);
 $('entryNoOT').addEventListener('change',()=>{const noOT=$('entryNoOT').checked;['entryGcOT','entryAsmOT','entryGcOTHC','entryAsmOTHC','entryOtHours'].forEach(id=>{$(id).disabled=noOT;if(noOT)$(id).value='';});livePreview();});
 $('dailyForm').addEventListener('input',livePreview);
 $('entryDate').addEventListener('change',()=>{const r=state.daily.find(x=>x.date===v('entryDate'));if(r)editDaily(r.date);else{editingDaily=null;$('dailyEditingHint').textContent='';}});
 for(const id of ['entryDailyTable','entryModelTable','entryQualityTable']){$(id).addEventListener('click',e=>{
  const b=e.target.closest('button[data-entry-action]');if(!b)return;
  const type=b.dataset.entryAction;const i=Number(b.dataset.index);
  if(id==='entryDailyTable'){const rows=[...state.daily].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,20);const r=rows[i];if(!r)return;if(type==='edit-daily')editDaily(r.date);else if(type==='delete-daily')deleteDaily(r.date);}
  if(id==='entryModelTable'){const rows=[...state.models].sort((a,b)=>b.date.localeCompare(a.date)).slice(0,25);const r=rows[i];if(!r)return;if(type==='edit-model')editModel(r.date,r.model);else if(type==='delete-model')deleteModel(r.date,r.model);}
  if(id==='entryQualityTable'){const rows=[...state.quality].sort((a,b)=>String(b.date||'').localeCompare(String(a.date||''))).slice(0,35);const r=rows[i];if(!r)return;if(type==='edit-quality')editQuality(r.id);else if(type==='delete-quality')deleteQuality(r.id);}
 });}
 $('exportBackup').addEventListener('click',exportBackup);
 $('importBackup').addEventListener('change',async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;try{await importBackup(file);}catch(err){showMessage(tr('還原失敗：','Khôi phục thất bại: ')+err.message,true);}});
 $('undoChange').addEventListener('click',()=>{void undo();});
}
window.initializeRecordSystem=async()=>{
 bindWorkspace();clearDaily();clearModel();clearQuality();window.initializeIESystem?.();
 try{
  db=await openDB();const stored=await getStoredSnapshot();
  if(stored?.snapshot){applyState(stored.snapshot);setDefaultPeriods();}
  else{await loadBundled();state.quality=state.quality.map((q,i)=>({...q,id:q.id||`legacy-${i}`}));state.files=['Browser Database · '+tr('歷史資料','Dữ liệu lịch sử')];state.hosted=false;await persist('Initialize published historical data');}
  revisions=(await getRevisions()).slice(-30).reverse();
  if(stored?.savedAt)$('dbStatus').textContent=tr('已儲存於此瀏覽器','Đã lưu trên trình duyệt này')+' · '+new Date(stored.savedAt).toLocaleString(state.lang==='zh'?'zh-TW':'vi-VN')+' · '+state.daily.length+' '+tr('生產日','ngày sản xuất');
  render();setView('entry');livePreview();
 }catch(e){$('dbStatus').textContent=tr('無法啟用本機資料庫，請勿輸入正式資料：','Không thể sử dụng cơ sở dữ liệu trên thiết bị: ')+e.message;showMessage(e.message,true);if(!state.daily.length)await loadBundled();}
};
})();
