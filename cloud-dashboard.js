'use strict';
/* V1.13 manager-only live dashboard; credentials remain in URL fragment, never in source or storage. */
(()=>{
 const fragment=new URLSearchParams(location.hash.slice(1));
 const isAdmin=fragment.has('admin');
 const isViewer=!isAdmin&&fragment.has('viewer');
 const enabled=isAdmin||isViewer;
 const accessKey=fragment.get(isAdmin?'admin':'viewer')||'';
 const accessHeader=isAdmin?'X-Admin-Key':'X-Viewer-Key';
 const endpoint=String(window.FACTORY_CLOUD_CONFIG?.endpoint||'').trim();
 let active=false,busy=false,lastSuccess=0,refreshButton=null;
 const $=id=>document.getElementById(id);
 function feedback(message,kind='pending'){
  const pill=$('cloudTopStatus'),db=$('dbStatus');
  if(pill){pill.textContent='Supabase: '+message;pill.dataset.state=kind;}
  if(db)db.textContent=message;
  const box=$('message');
  if(box){if(kind==='error'){const stale=lastSuccess?' 畫面保留上次成功同步於 '+new Date(lastSuccess).toLocaleString()+' 的雲端資料，請勿視為最新。':' 不會顯示本機舊資料冒充雲端。';box.textContent='雲端資料讀取失敗：'+message+'。'+stale;box.classList.remove('hidden');box.classList.add('error');}
   else{box.classList.add('hidden');box.classList.remove('error');}}
 }

 function transform(rows,excelDays){
  if(!Array.isArray(rows)||rows.length>2000||!Array.isArray(excelDays)||excelDays.length>2000)throw Error('Unexpected report list');
  const selected=new Map(),dates=new Map(),models=new Map(),seen=new Set();
  let manualCount=0,excelCount=0;
  for(const r of rows){
   if(r.plant!=='NBY'||!/^20\d\d-\d\d-\d\d$/.test(r.production_date)||!['gc','asm'].includes(r.process))throw Error('Invalid cloud process record');
   const key=r.production_date+'|'+r.process;
   if(seen.has(key))throw Error('Duplicate cloud process record: '+key);
   seen.add(key);selected.set(key,{source:'manual',time:r.updated_at||'',row:r});
  }
  for(const entry of excelDays){
   const d=entry.daily,date=entry.production_date;
   if(!d||d.date!==date||!/^20\d\d-\d\d-\d\d$/.test(date)||!Array.isArray(entry.models))throw Error('Invalid Excel cloud day');
   for(const p of ['gc','asm']){
    if(d[p+'Total']===null||d[p+'Total']===undefined)continue;
    const key=date+'|'+p,prior=selected.get(key);
    if(!prior||String(entry.updated_at||'')>String(prior.time||''))
     selected.set(key,{source:'excel',time:entry.updated_at||'',row:entry,process:p});
   }
  }
  for(const [key,selection] of selected){
   const [date,p]=key.split('|'),excel=selection.source==='excel';
   const row=selection.row,d=excel?row.daily:null;
   const total=excel?d[p+'Total']:row.output_total;
   const ot=excel?d[p+'OT']:row.ot_output;
   const hc=excel?d[p+'HC']:row.normal_hc;
   const hours=excel?d[p+'Hours']:row.normal_hours;
   const otHC=excel?d[p+'OTHC']:row.ot_hc;
   const otHours=excel?d.otHours:row.ot_hours;
   if(total===null||total===undefined)continue;
   let daily=dates.get(date);
   if(!daily){daily={date,gcTotal:null,gcHC:null,gcOT:null,gcOTHC:null,gcHours:null,asmTotal:null,asmHC:null,asmOT:null,asmOTHC:null,asmHours:null,otHours:null};dates.set(date,daily);}
   daily[p+'Total']=Number(total);daily[p+'HC']=hc===null?null:Number(hc);
   daily[p+'Hours']=hours===null?null:Number(hours);
   daily[p+'OT']=ot===null?null:Number(ot);
   daily[p+'OTHC']=otHC===null?null:Number(otHC);
   if(otHours!==null&&otHours!==undefined){const h=Number(otHours);daily.otHours=daily.otHours===null?h:Math.max(daily.otHours,h);}
   const list=excel?row.models:row.models;
   if(!Array.isArray(list))throw Error('Missing model detail '+key);
   let sum=0,otSum=0,hasOT=true,modelCount=0;
   for(const item of list){
    const code=String(excel?item.model:item.code||'').trim();
    const qty=excel?item[p+'Total']:item.total;
    const mo=excel?item[p+'OT']:item.ot;
    if(qty===null||qty===undefined)continue;
    if(!code)throw Error('Empty model code');
    const mk=date+'|'+code;let m=models.get(mk);
    if(!m){m={date,model:code,gcTotal:null,gcOT:null,asmTotal:null,asmOT:null};models.set(mk,m);}
    m[p+'Total']=Number(qty);m[p+'OT']=mo===null||mo===undefined?null:Number(mo);
    sum+=Number(qty);modelCount++;
    if(mo===null||mo===undefined)hasOT=false;else otSum+=Number(mo);
   }
   if(modelCount>0&&(sum!==Number(total)||(hasOT&&ot!==null&&ot!==undefined&&otSum!==Number(ot))))
    throw Error('Cloud model total mismatch '+key);
   if(excel)excelCount++;else manualCount++;
  }
  for(const m of models.values())for(const p of ['gc','asm']){
   const d=dates.get(m.date);
   if(d[p+'Total']!==null&&m[p+'Total']===null){m[p+'Total']=0;m[p+'OT']=0;}
  }
  return {daily:[...dates.values()],models:[...models.values()],manualCount,excelCount};
 }
 async function refresh(){
  if(busy)return;
  busy=true;if(refreshButton)refreshButton.disabled=true;
  feedback('正在讀取雲端…');
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
  try{
   if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/functions\/v1\/factory-api\/?$/.test(endpoint)||accessKey.length<32)throw Error('請使用主管私人網址開啟本頁');
   const response=await fetch(endpoint,{method:'POST',mode:'cors',cache:'no-store',signal:controller.signal,headers:{'Content-Type':'application/json',[accessHeader]:accessKey},body:JSON.stringify({action:'dashboard'})});
   const json=await response.json().catch(()=>({}));
   if(!response.ok||json.ok!==true)throw Error(json.error||'HTTP '+response.status);
   const normalized=transform(json.rows,json.excel_days||[]);
   if(typeof window.applyFactoryCloudData!=='function')throw Error('Analysis engine not ready');
   window.applyFactoryCloudData({...normalized,quality:Array.isArray(json.excel_quality?.quality)?json.excel_quality.quality:Array.isArray(json.legacy_quality)?json.legacy_quality:[],ieStandards:Array.isArray(json.ie_standards)?json.ie_standards:Array.isArray(json.legacy_ie_standards)?json.legacy_ie_standards:[],latestImport:json.excel_latest||null});
   lastSuccess=Date.now();
   const time=new Date().toLocaleString(document.documentElement.lang==='en'?'en-US':document.documentElement.lang==='vi'?'vi-VN':'zh-TW');
   feedback('已同步 '+time+' · '+normalized.manualCount+' 筆填報 / '+normalized.excelCount+' 筆 Excel'+(json.truncated?' · 超過2000筆，請聯絡管理員':''));
   return true;
  }catch(error){feedback(error.name==='AbortError'?'連線逾時':String(error.message||error),'error');return false;}
  finally{clearTimeout(timeout);busy=false;if(refreshButton)refreshButton.disabled=false;}
 }

 async function post(body,timeoutMs=30000){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{
   const response=await fetch(endpoint,{method:'POST',mode:'cors',cache:'no-store',signal:controller.signal,
    headers:{'Content-Type':'application/json',[accessHeader]:accessKey},body:JSON.stringify(body)});
   const obj=await response.json().catch(()=>({}));
   if(!response.ok||obj.ok!==true)throw new Error(obj.error||'HTTP '+response.status);
   return obj;
  }finally{clearTimeout(timer);}
 }
 async function importFiles(files,parser){
  if(!isAdmin)throw new Error('只有管理員可以匯入 Excel；主管唯讀連結只能查看資料。');
  const input=$('fileInput');if(input)input.disabled=true;
  const message=$('message');
  const announce=(txt,error=false)=>{if(message){message.textContent=txt;message.classList.remove('hidden');message.classList.toggle('error',error);}};
  try{
   announce('正在解析 Excel 並核對資料，完成後會自動寫入 Supabase…');
   const {payload,filenames}=await parser(files);
   const body={action:'import_excel',payload,filenames};
   const bytes=new TextEncoder().encode(JSON.stringify(body)).length;
   if(bytes>1400000)throw new Error('匯入資料超過 1.4 MB，請分批匯入');
   feedback('Excel 正在上傳雲端…');
   announce('正在儲存至雲端，請勿關閉頁面…');
   const result=await post(body,45000);
   const refreshed=await refresh();
   const note='Excel 已寫入雲端：'+result.daily_count+' 個生產日、'+result.model_count+' 筆型體、'+result.quality_count+' 筆品質資料。';
   if(!refreshed){announce(note+' 儲存已成功，但畫面重新讀取失敗，請稍後按「更新雲端」。',true);return;}
   announce(note+' 所有主管重新開啟頁面即可看到，已開啟頁面最多五分鐘自動更新。');
  }catch(error){feedback('Excel 匯入失敗：'+String(error.message||error),'error');throw error;}
  finally{if(input)input.disabled=false;}
 }

 async function saveIE(standard){
  if(!isAdmin)throw new Error('只有管理員可更新IE標準');
  const result=await post({action:'save_ie',standard},15000);
  if(!await refresh())throw new Error('IE標準已儲存雲端，但畫面同步失敗，請手動更新雲端');
  return result;
 }
 async function deleteIE(record){
  if(!isAdmin)throw new Error('只有管理員可刪除IE標準');
  await post({action:'delete_ie',model:record.model,effectiveDate:record.effectiveDate||''},15000);
  if(!await refresh())throw new Error('IE已從雲端刪除，但畫面同步失敗，請手動更新');
 }
 async function migrateLocalIE(){
  if(!isAdmin)return;
  try{
   if(typeof window.readLocalIEStandards!=='function')throw new Error('本機資料庫讀取尚未準備好');
   const local=await window.readLocalIEStandards();
   const usable=local.filter(r=>r&&(Number(r.gcCycle)>0||Number(r.asmCycle)>0));
   if(!usable.length){window.alert('此瀏覽器找不到已儲存的IE人工秒值。請確認之前曾按「儲存IE標準」，或直接在雲端IE管理頁重新輸入。');return;}
   if(usable.length>100)throw new Error('本機IE超過100筆，請分批整理');
   const confirmed=window.confirm('偵測到此瀏覽器 '+usable.length+' 筆已儲存的IE標準。請先確認「IE節拍」欄位實際填入的是各人工工站秒值加總（非產線出雙節拍），並確認允許覆蓋雲端相同型體及生效日的IE標準。確定要同步嗎？');
   if(!confirmed)return;
   const result=await post({action:'upsert_ie_batch',standards:usable},30000);
   if(!await refresh())throw new Error('已成功寫入雲端，但重新讀取失敗，請按更新雲端');
   window.alert('已將 '+result.count+' 筆本機IE人工秒值同步至雲端。其他主管更新頁面即可看到。');
  }catch(e){window.alert('同步本機IE失敗：'+String(e.message||e));}
 }
 async function createViewer(){
  if(!isAdmin)return;
  const label=window.prompt('請輸入主管姓名或識別名稱（只用於權限管理）：');
  if(!label)return;
  try{
   const result=await post({action:'create_viewer',label:label.trim()},15000);
   const link=new URL('./index.html#viewer='+encodeURIComponent(result.viewer_key),location.href).href;
   window.prompt('主管唯讀網址已建立。請複製以下完整網址並私下傳送。關閉後無法再查詢原始網址：',link);
  }catch(error){window.alert('建立主管連結失敗：'+String(error.message||error));}
 }
 async function manageViewers(){
  if(!isAdmin)return;
  try{
   const obj=await post({action:'list_viewers'},15000);
   const active=obj.viewers.filter(v=>v.active);
   if(!active.length){window.alert('目前沒有主管唯讀連結。');return;}
   const lines=active.map((v,i)=>(i+1)+'. '+v.label+' ('+new Date(v.created_at).toLocaleDateString()+')');
   const input=window.prompt('已建立的主管唯讀連結：\n'+lines.join('\n')+'\n\n如需停用，輸入對應編號；直接取消則不變更：');
   if(!input)return;
   const n=Number(input);
   if(!Number.isInteger(n)||n<1||n>active.length){window.alert('編號無效，未變更。');return;}
   if(!window.confirm('確定停用「'+active[n-1].label+'」的主管唯讀網址？'))return;
   await post({action:'revoke_viewer',key_hash:active[n-1].key_hash},15000);
   window.alert('已停用該主管的唯讀網址。');
  }catch(error){window.alert('權限管理失敗：'+String(error.message||error));}
 }

 function activate(){
  if(active)return;active=true;
  document.body.classList.add('cloud-manager');
  if(isViewer)document.body.classList.add('cloud-viewer');
  if(isAdmin){
   const upload=document.querySelector('label[for="fileInput"] [data-i18n="upload"]');
   if(upload){upload.removeAttribute('data-i18n');
    const updateLabel=()=>{const l=document.documentElement.lang;upload.textContent=l==='vi'?'Nhập Excel (tự động lưu đám mây)':l==='en'?'Import Excel (auto-save to cloud)':'匯入 Excel（自動存雲端）';};
    updateLabel();$('langBtn')?.addEventListener('change',updateLabel);
   }
  }
  const actions=document.querySelector('.headline-actions');
  if(actions){
   refreshButton=document.createElement('button');refreshButton.type='button';refreshButton.id='refreshCloud';refreshButton.className='primary';refreshButton.textContent='↻ 更新雲端';
   refreshButton.addEventListener('click',()=>{void refresh();});actions.prepend(refreshButton);
   const link=document.createElement('a');link.className='outline';link.textContent='雲端製程明細';link.href='./manager.html#'+(isAdmin?'admin':'viewer')+'='+encodeURIComponent(accessKey);
   link.style.cssText='text-decoration:none;display:inline-flex;align-items:center';actions.append(link);
   if(isAdmin){const add=document.createElement('button');add.type='button';add.className='outline';add.textContent='建立主管唯讀網址';add.addEventListener('click',()=>{void createViewer();});actions.append(add);
    const manage=document.createElement('button');manage.type='button';manage.className='outline';manage.textContent='管理主管權限';manage.addEventListener('click',()=>{void manageViewers();});actions.append(manage);
    const ieManage=document.createElement('button');ieManage.type='button';ieManage.className='outline';ieManage.textContent='IE人工秒值／HC管理';
    ieManage.addEventListener('click',()=>{window.switchEntryTab?.('ie');setView('entry');document.getElementById('ieForm')?.scrollIntoView({block:'start',behavior:'smooth'});});actions.append(ieManage);
    const migrate=document.createElement('button');migrate.type='button';migrate.className='outline';migrate.textContent='同步本機IE至雲端';
    migrate.addEventListener('click',()=>{void migrateLocalIE();});actions.append(migrate);
   }
  }
  if(isAdmin){
   const nav=document.querySelector('.nav-link[data-view="entry"]');
   const navText=nav?.lastElementChild,heading=document.querySelector('#view-entry .section-head h2'),sub=document.querySelector('#view-entry .section-head p');
   for(const el of [navText,heading,sub])el?.removeAttribute('data-i18n');
   const localizeIE=()=>{
    const lang=document.documentElement.lang;
    const vi=lang==='vi',en=lang==='en';
    if(navText)navText.textContent=vi?'Quản lý IE':en?'IE Standards':'IE 標準管理';
    if(heading)heading.textContent=vi?'Định mức IE và nhân lực':en?'Manual IE standards and HC':'IE 人工總秒值與合理 HC';
    if(sub)sub.textContent=vi?'Lưu tự động lên đám mây. Tính nhân lực theo tổng giây thao tác và hiệu suất lịch sử.':en?'Cloud-saved manual work-content seconds, automatic HC estimates and history-based efficiency.':'人工總秒值自動儲存雲端；依型體組合、實際HC與歷史效率估算合理人力。';
    if(document.getElementById('view-entry')?.classList.contains('active'))document.getElementById('pageTitle').textContent=navText?.textContent||'IE';
   };
   localizeIE();document.getElementById('langBtn')?.addEventListener('change',localizeIE);
   nav?.addEventListener('click',()=>{window.switchEntryTab?.('ie');});
  }
  feedback('準備連線…');
  setInterval(()=>{if(document.visibilityState==='visible')void refresh();},300000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&lastSuccess&&Date.now()-lastSuccess>300000)void refresh();});
  void refresh();
 }
 window.FactoryCloudDashboard=Object.freeze({enabled,isAdmin,activate,refresh,importFiles,saveIE,deleteIE,migrateLocalIE});
})();
