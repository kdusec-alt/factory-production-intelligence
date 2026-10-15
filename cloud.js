'use strict';
/* V1.5 GitHub snapshot sync: explicit, token in JS memory only; no credential persistence. */
(() => {
  const REPO='kdusec-alt/factory-production-intelligence';
  const BRANCH='production-records';
  const PATH='data/live-snapshot.json';
  const API='https://api.github.com/repos/'+REPO;
  const FILE=API+'/contents/'+PATH;
  const MAX_BYTES=750*1024;
  const $=id=>document.getElementById(id);
  const zh={cloudTitle:'GitHub 雲端資料同步',cloudSub:'單人使用 · 獨立資料分支 · JSON版本歷史',cloudTokenLabel:'GitHub Fine-grained Token（僅保存在本頁記憶體）',cloudConnect:'連線 GitHub',cloudDisconnect:'斷線',cloudPush:'上傳目前資料',cloudPull:'下載雲端資料並還原',cloudAuto:'首次同步後，每次修改自動上傳',cloudCautionTitle:'GitHub 儲存說明',cloudCaution:'目前Repository為公開專案，雲端JSON也會公開。Token不寫入程式或本機資料庫，重新整理需再次連線。不同裝置修改時，系統會阻止舊版本覆蓋新版本。'};
  const vn={cloudTitle:'Đồng bộ dữ liệu lên GitHub',cloudSub:'Dùng cá nhân · Nhánh dữ liệu riêng · Lịch sử phiên bản JSON',cloudTokenLabel:'GitHub Fine-grained Token (chỉ giữ trong bộ nhớ trang)',cloudConnect:'Kết nối GitHub',cloudDisconnect:'Ngắt kết nối',cloudPush:'Đẩy dữ liệu hiện tại lên GitHub',cloudPull:'Tải dữ liệu từ GitHub và khôi phục',cloudAuto:'Tự động đẩy sau lần đồng bộ đầu tiên',cloudCautionTitle:'Lưu ý lưu trữ GitHub',cloudCaution:'Repository hiện công khai; tệp JSON trên GitHub cũng công khai. Token không lưu trong mã nguồn hoặc cơ sở dữ liệu cục bộ. Khi tải lại trang cần kết nối lại. Hệ thống từ chối ghi đè nếu dữ liệu từ thiết bị khác đã thay đổi.'};
  Object.assign(translations.zh,zh);Object.assign(translations.vn,vn);
Object.assign(translations.en,window.FACTORY_EN?.cloud||{});
  const trc=(a,b)=>state.lang==='zh'?a:state.lang==='vn'?b:(window.FACTORY_EN?.translate?.(a)??a);
  let token='',connected=false,ready=false,remoteSha=null,lastSynced='',syncing=false,queued=false,delay=null,suppress=false;
  function status(message,error=false){$('cloudMessage').textContent=message;$('cloudMessage').classList.toggle('error',error);}
  function badge(message,kind='idle'){$('cloudBadge').textContent=message;$('cloudTopStatus').textContent=trc('GitHub：','GitHub: ')+message;$('cloudTopStatus').dataset.status=kind;}
  function encodeUnicode(input){const bytes=new TextEncoder().encode(input);let s='';for(let i=0;i<bytes.length;i+=8192)s+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(s);}
  function decodeUnicode(input){const s=atob(input.replace(/\s/g,''));const bytes=Uint8Array.from(s,c=>c.charCodeAt(0));return new TextDecoder('utf-8',{fatal:true}).decode(bytes);}
  async function api(url,method='GET',body=null){
    const response=await fetch(url,{method,cache:'no-store',headers:{'Accept':'application/vnd.github+json','Authorization':'Bearer '+token,'X-GitHub-Api-Version':'2022-11-28',...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});
    if(response.status===404)return null;
    let data=null;try{data=await response.json();}catch{}
    if(!response.ok)throw new Error((data&&data.message)||'GitHub HTTP '+response.status);
    return data;
  }
  async function fetchRemote(){const data=await api(FILE+'?ref='+BRANCH);if(!data)return null;if(data.type!=='file'||typeof data.sha!=='string')throw new Error('Unexpected GitHub file response');return data;}
  function markConnected(){badge(ready?trc('已同步','Đã đồng bộ'):trc('已連線 · 待同步','Đã kết nối · Chưa đồng bộ'),ready?'ok':'pending');}
  async function connect(){
    const supplied=$('cloudToken').value.trim();$('cloudToken').value='';
    if(!supplied){status(trc('請輸入Fine-grained Token。','Vui lòng nhập Fine-grained Token.'),true);return;}
    token=supplied;connected=false;ready=false;badge(trc('連線中…','Đang kết nối…'));
    try{
      const repo=await api(API);
      if(!repo||repo.full_name!==REPO)throw new Error('Repository not accessible');
      const current=await fetchRemote();
      remoteSha=current?.sha||null;connected=true;markConnected();
      status(current?trc('GitHub已有備份。請選擇「下載雲端資料」或確認以本機資料覆蓋後上傳。','GitHub đã có bản sao lưu. Hãy tải về hoặc xác nhận ghi đè bằng dữ liệu trên thiết bị.'):trc('GitHub尚無雲端紀錄。按「上傳目前資料」建立第一份備份，之後可自動同步。','Chưa có bản sao lưu trên GitHub. Nhấn Đẩy dữ liệu để tạo bản đầu tiên, sau đó có thể tự động đồng bộ.'));
    }catch(e){token='';connected=false;badge(trc('連線失敗','Lỗi kết nối'),'error');status(trc('連線失敗：','Kết nối thất bại: ')+e.message,true);}
  }
  function disconnect(){clearTimeout(delay);token='';connected=false;ready=false;remoteSha=null;queued=false;badge(trc('未連線','Chưa kết nối'));status(trc('已斷線。本機資料仍會自動保存。','Đã ngắt kết nối. Dữ liệu cục bộ vẫn được lưu.'));}
  function payload(){const snapshot=window.captureFactoryState?.();if(!snapshot)throw new Error('Local database not ready');const content=JSON.stringify({format:'factory-production-intelligence',schemaVersion:14,exportedAt:new Date().toISOString(),snapshot});const bytes=new TextEncoder().encode(content);if(bytes.length>MAX_BYTES)throw new Error(trc('資料超過750KB，請改用正式資料庫或分檔。','Dữ liệu vượt 750KB. Hãy dùng cơ sở dữ liệu hoặc chia tệp.'));return {content,base64:encodeUnicode(content)};}
  async function push(automatic=false){
    if(!connected){if(!automatic)status(trc('請先連線GitHub。','Hãy kết nối GitHub trước.'),true);return;}
    if(automatic&&!ready)return;
    if(syncing){queued=true;return;}
    syncing=true;badge(trc('同步中…','Đang đồng bộ…'));
    try{
      const current=await fetchRemote();const currentSha=current?.sha||null;
      if(currentSha!==remoteSha){ready=false;remoteSha=currentSha;throw new Error(trc('雲端資料已由其他裝置修改，已停止覆蓋。請先下載JSON備份並檢查雲端版本。','Dữ liệu GitHub đã thay đổi trên thiết bị khác. Đã ngừng ghi đè. Hãy sao lưu JSON cục bộ và kiểm tra bản trên GitHub.'));}
      if(!ready&&currentSha&&!automatic&&!confirm(trc('GitHub已有雲端資料。確定要用目前瀏覽器資料覆蓋？建議先下載JSON備份。','GitHub đã có dữ liệu. Bạn có chắc muốn ghi đè bằng dữ liệu trên thiết bị này? Nên tải sao lưu JSON trước.'))){markConnected();return;}
      const currentPayload=payload();const result=await api(FILE,'PUT',{message:'data: sync factory production records '+new Date().toISOString(),content:currentPayload.base64,branch:BRANCH,...(currentSha?{sha:currentSha}:{})});
      if(!result?.content?.sha)throw new Error('GitHub did not return a content SHA');
      remoteSha=result.content.sha;ready=true;lastSynced=new Date().toISOString();markConnected();
      status(trc('已成功同步至GitHub：','Đã đồng bộ lên GitHub: ')+new Date(lastSynced).toLocaleString(state.lang==='vn'?'vi-VN':state.lang==='en'?'en-US':'zh-TW')+' · '+trc('分支','Nhánh')+' '+BRANCH);
    }catch(e){badge(trc('同步失敗','Lỗi đồng bộ'),'error');status(trc('GitHub同步失敗（本機已保留）：','Không đồng bộ được (dữ liệu cục bộ vẫn còn): ')+e.message,true);}
    finally{syncing=false;if(queued){queued=false;if(ready&&$('cloudAuto').checked)schedule();}}
  }
  async function pull(){
    if(!connected){status(trc('請先連線GitHub。','Hãy kết nối GitHub trước.'),true);return;}
    if(syncing){status(trc('正在同步，請稍候。','Đang đồng bộ, vui lòng chờ.'),true);return;}
    syncing=true;suppress=true;
    try{
      const current=await fetchRemote();if(!current){status(trc('GitHub目前尚無雲端備份。','Chưa có bản sao lưu trên GitHub.'),true);return;}
      if(!current.content)throw new Error('GitHub response missing file content');
      const obj=JSON.parse(decodeUnicode(current.content));
      if(obj.format!=='factory-production-intelligence'||![13,14].includes(obj.schemaVersion)||!obj.snapshot)throw new Error('Invalid GitHub snapshot schema');
      if(!confirm(trc('這將以GitHub資料取代目前瀏覽器紀錄。系統會先下載本機JSON備份。確定繼續？','Dữ liệu GitHub sẽ thay thế dữ liệu trên thiết bị. Hệ thống sẽ tải bản sao lưu cục bộ trước. Tiếp tục?')))return;
      window.exportFactoryBackup?.();
      await window.restoreFactoryCloudSnapshot(obj.snapshot);
      remoteSha=current.sha;ready=true;lastSynced=new Date().toISOString();markConnected();
      status(trc('已還原GitHub資料並保存在本機：','Đã khôi phục dữ liệu GitHub vào thiết bị: ')+new Date(lastSynced).toLocaleString(state.lang==='vn'?'vi-VN':state.lang==='en'?'en-US':'zh-TW'));
    }catch(e){badge(trc('還原失敗','Khôi phục lỗi'),'error');status(trc('無法還原GitHub資料：','Không thể khôi phục dữ liệu GitHub: ')+e.message,true);}
    finally{syncing=false;suppress=false;}
  }
  function schedule(){if(!connected||!ready||!$('cloudAuto').checked||suppress)return;clearTimeout(delay);delay=setTimeout(()=>{void push(true);},2000);}
  function initialize(){
    if(window.FactoryCloudDashboard?.enabled)return;
    $('cloudConnect').addEventListener('click',()=>{void connect();});
    $('cloudDisconnect').addEventListener('click',disconnect);
    $('cloudPush').addEventListener('click',()=>{void push(false);});
    $('cloudPull').addEventListener('click',()=>{void pull();});
    $('cloudToken').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();void connect();}});
    window.addEventListener('factory:local-saved',schedule);
    $('langBtn').addEventListener('change',()=>{markConnectedOrNot();});
    badge(trc('未連線','Chưa kết nối'));
    render();
  }
  function markConnectedOrNot(){if(connected)markConnected();else badge(trc('未連線','Chưa kết nối'));}
  document.addEventListener('DOMContentLoaded',initialize);
})();