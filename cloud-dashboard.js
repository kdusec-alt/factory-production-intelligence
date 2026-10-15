'use strict';
/* V1.13 manager-only live dashboard; credentials remain in URL fragment, never in source or storage. */
(()=>{
 const fragment=new URLSearchParams(location.hash.slice(1));
 const enabled=fragment.has('admin');
 const adminKey=fragment.get('admin')||'';
 const endpoint=String(window.FACTORY_CLOUD_CONFIG?.endpoint||'').trim();
 let active=false,busy=false,lastSuccess=0,refreshButton=null;
 const $=id=>document.getElementById(id);
 function feedback(message,kind='pending'){
  const pill=$('cloudTopStatus'),db=$('dbStatus');
  if(pill){pill.textContent='Supabase: '+message;pill.dataset.state=kind;}
  if(db)db.textContent=message;
  const box=$('message');
  if(box){if(kind==='error'){box.textContent='雲端資料讀取失敗：'+message+'。為避免誤判，不會改用本機舊資料。';box.classList.remove('hidden');box.classList.add('error');}
   else{box.classList.add('hidden');box.classList.remove('error');}}
 }
 function transform(rows){
  if(!Array.isArray(rows)||rows.length>2000)throw Error('Unexpected report list');
  const dates=new Map(),models=new Map(),seen=new Set();
  for(const r of rows){
   if(r.plant!=='NBY'||!/^20\d\d-\d\d-\d\d$/.test(r.production_date)||!['gc','asm'].includes(r.process))throw Error('Invalid cloud process record');
   const date=r.production_date,p=r.process,key=date+'|'+p;
   if(seen.has(key))throw Error('Duplicate cloud process record: '+key);
   seen.add(key);
   let d=dates.get(date);
   if(!d){d={date,gcTotal:null,gcHC:null,gcOT:null,gcOTHC:null,gcHours:null,asmTotal:null,asmHC:null,asmOT:null,asmOTHC:null,asmHours:null,otHours:null};dates.set(date,d);}
   d[p+'Total']=Number(r.output_total);d[p+'HC']=Number(r.normal_hc);
   d[p+'Hours']=Number(r.normal_hours);d[p+'OT']=r.ot_output===null?null:Number(r.ot_output);
   d[p+'OTHC']=r.ot_hc===null?null:Number(r.ot_hc);
   if(r.ot_hours!==null){const h=Number(r.ot_hours);d.otHours=d.otHours===null?h:Math.max(d.otHours,h);}
   if(!Array.isArray(r.models))throw Error('Missing cloud model detail');
   const total=r.models.reduce((n,m)=>n+Number(m.total),0);
   if(total!==Number(r.output_total))throw Error('Model total mismatch: '+key);
   for(const item of r.models){
    const code=String(item.code||'').trim(),mk=date+'|'+code;
    if(!code)throw Error('Empty model code');
    let m=models.get(mk);
    if(!m){m={date,model:code,gcTotal:null,gcOT:null,asmTotal:null,asmOT:null};models.set(mk,m);}
    m[p+'Total']=Number(item.total);
    m[p+'OT']=item.ot===null?null:Number(item.ot);
   }
  }
  for(const m of models.values())for(const p of ['gc','asm']){
   const d=dates.get(m.date);
   if(d[p+'Total']!==null&&m[p+'Total']===null){m[p+'Total']=0;m[p+'OT']=0;}
  }
  return {daily:[...dates.values()],models:[...models.values()]};
 }
 async function refresh(){
  if(busy)return;
  busy=true;if(refreshButton)refreshButton.disabled=true;
  feedback('正在讀取雲端…');
  const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),20000);
  try{
   if(!/^https:\/\/[a-z0-9-]+\.supabase\.co\/functions\/v1\/factory-api\/?$/.test(endpoint)||adminKey.length<32)throw Error('請使用主管私人網址開啟本頁');
   const response=await fetch(endpoint,{method:'POST',mode:'cors',cache:'no-store',signal:controller.signal,headers:{'Content-Type':'application/json','X-Admin-Key':adminKey},body:JSON.stringify({action:'dashboard'})});
   const json=await response.json().catch(()=>({}));
   if(!response.ok||json.ok!==true)throw Error(json.error||'HTTP '+response.status);
   const normalized=transform(json.rows);
   if(typeof window.applyFactoryCloudData!=='function')throw Error('Analysis engine not ready');
   window.applyFactoryCloudData({...normalized,quality:Array.isArray(json.legacy_quality)?json.legacy_quality:[],ieStandards:Array.isArray(json.legacy_ie_standards)?json.legacy_ie_standards:[]});
   lastSuccess=Date.now();
   const time=new Date().toLocaleString(document.documentElement.lang==='en'?'en-US':document.documentElement.lang==='vi'?'vi-VN':'zh-TW');
   feedback('已同步 '+time+' · '+json.rows.length+' 筆製程紀錄'+(json.truncated?' · 超過2000筆，請聯絡管理員':''));
  }catch(error){feedback(error.name==='AbortError'?'連線逾時':String(error.message||error),'error');}
  finally{clearTimeout(timeout);busy=false;if(refreshButton)refreshButton.disabled=false;}
 }
 function activate(){
  if(active)return;active=true;
  document.body.classList.add('cloud-manager');
  const actions=document.querySelector('.headline-actions');
  if(actions){
   refreshButton=document.createElement('button');refreshButton.type='button';refreshButton.id='refreshCloud';refreshButton.className='primary';refreshButton.textContent='↻ 更新雲端';
   refreshButton.addEventListener('click',()=>{void refresh();});actions.prepend(refreshButton);
   const link=document.createElement('a');link.className='outline';link.textContent='雲端製程明細';link.href='./manager.html#admin='+encodeURIComponent(adminKey);
   link.style.cssText='text-decoration:none;display:inline-flex;align-items:center';actions.append(link);
  }
  feedback('準備連線…');
  setInterval(()=>{if(document.visibilityState==='visible')void refresh();},300000);
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'&&lastSuccess&&Date.now()-lastSuccess>300000)void refresh();});
  void refresh();
 }
 window.FactoryCloudDashboard=Object.freeze({enabled,activate,refresh});
})();
