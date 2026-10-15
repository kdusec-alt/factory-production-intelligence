'use strict';
/* IE standard target: shared process members counted once. Model mix is based on
 * regular-shift pair shares, never each model receiving the full line headcount. */
(()=>{
 const L=(zh,vn,en)=>state.lang==='vn'?vn:state.lang==='en'?en:zh;
 const num=x=>x===null||x===undefined||String(x).trim()===''?null:Number.isFinite(Number(x))?Number(x):null;
 const key=x=>String(x||'').trim().toUpperCase();
 const number=(x,d=1)=>Number.isFinite(x)?x.toLocaleString(state.lang==='vn'?'vi-VN':state.lang==='en'?'en-US':'zh-TW',{minimumFractionDigits:d,maximumFractionDigits:d}):'—';
 const standard=(model,date)=>(state.ieStandards||[]).filter(x=>key(x.model)===key(model)&&(!x.effectiveDate||x.effectiveDate<=date)).sort((a,b)=>String(b.effectiveDate||'').localeCompare(String(a.effectiveDate||'')))[0];
 function calculate(p,day,membersOverride=null,hoursOverride=null){
  const members=membersOverride??num(day?.[p+'HC']),hours=hoursOverride??num(day?.[p+'Hours']);
  const actual=num(day?.[p+'Normal']),date=day?.date;
  const rows=state.models.filter(m=>m.date===date).map(m=>{
   const total=num(m[p+'Total']),pairs=num(m[p+'Normal']);
   return {model:key(m.model),pairs,seconds:num(standard(m.model,date)?.[p+'Cycle']),total};
  }).filter(m=>m.total!==null||m.pairs!==null);
  const errors=[];
  if(!(members>0))errors.push(L('缺少正常班人員','Thiếu nhân lực ca chính','Regular-shift members missing'));
  if(!(hours>0))errors.push(L('缺少正常班工時','Thiếu giờ ca chính','Regular-shift hours missing'));
  if(actual===null||actual<0)errors.push(L('正常班產量／OT拆分待補','Thiếu sản lượng ca chính / OT','Regular output / OT breakdown missing'));
  if(!rows.length)errors.push(L('缺少型體明細','Thiếu chi tiết mã giày','Model breakdown missing'));
  const missing=rows.filter(m=>m.pairs===null||m.pairs<0);
  if(missing.length)errors.push(L('型體正常班雙數待補：','Thiếu số đôi ca chính: ','Missing model regular pairs: ')+missing.map(m=>m.model).join(', '));
  if(!missing.length&&rows.length&&actual!==null&&Math.abs(rows.reduce((s,m)=>s+m.pairs,0)-actual)>.001)errors.push(L('型體合計與日報不符','Tổng mã không khớp báo cáo','Model totals do not reconcile'));
  const missingIE=rows.filter(m=>m.pairs>0&&!(m.seconds>0));
  if(missingIE.length)errors.push(L('缺少有效IE秒值：','Thiếu giây IE: ','Missing effective IE seconds: ')+missingIE.map(m=>m.model).join(', '));
  const work=rows.reduce((s,m)=>s+(m.pairs>0&&m.seconds>0?m.pairs*m.seconds:0),0);
  if(actual===0)errors.push(L('當日0雙，無型體比例可配比','Ngày 0 đôi, chưa có cơ cấu mã','Zero output: model mix unavailable'));
  const valid=!errors.length&&work>0;
  const avg=valid?work/actual:null,target8=valid?members*8*3600/avg:null,target=valid?members*hours*3600/avg:null;
  const efficiency=valid?actual/target:null,delta=valid?actual-target:null;
  return {p,date,members,hours,actual,rows,errors,valid,work,avg,target8,target,efficiency,delta,variance:valid?delta/target:null,
   allocations:valid?rows.map(m=>({...m,share:m.pairs/actual,target:m.pairs/actual*target,target8:m.pairs/actual*target8,
    singleModel8:m.seconds>0?members*8*3600/m.seconds:null})):[]};
 }
 const card=(label,value,foot)=>'<div class="kpi"><div class="label">'+esc(label)+'</div><div class="value">'+esc(value)+'</div><div class="foot">'+esc(foot||'')+'</div></div>';
 function summary(s){
  const name=s.p==='gc'?'Stockfit / GCĐ':'Assembly / TH';
  if(!s.valid)return card(name+' · IE', '—',s.errors.join('；'));
  return card(name+' · '+L('正常班人員','Nhân lực ca chính','Regular-shift Member'),number(s.members,0),number(s.hours,1)+'H')+
   card(name+' · '+L('IE應產雙數','Sản lượng chuẩn IE','IE target pairs'),number(s.target,1),L('固定8H應產 ','Chuẩn 8H ','8H target ')+number(s.target8,1))+
   card(name+' · '+L('實際完成','Thực tế','Actual output'),number(s.actual,0),L('差異 ','Chênh lệch ','Gap ')+(s.delta>0?'+':'')+number(s.delta,1)+' '+L('雙','đôi','pairs'))+
   card(name+' · '+L('效率達成','Đạt hiệu suất','Efficiency attainment'),number(s.efficiency*100,1)+'%',L('差異率 ','Tỷ lệ chênh ','Variance ')+(s.variance>0?'+':'')+number(s.variance*100,1)+'%');
 }
 function table(s){
  if(!s.valid)return '<p class="ie-plan-warning">'+esc(s.errors.join('；'))+'</p>';
  const th=[L('型體','Mã giày','Model'),L('IE秒／雙','Giây IE/đôi','IE s/pair'),L('當日配比','Tỷ trọng ngày','Daily mix'),L('8H配比應產','Chuẩn phân bổ 8H','Allocated 8H target'),L('正常班應產','Chuẩn ca chính','Regular target'),L('正常班實際','Thực tế ca chính','Regular actual'),L('差異雙數','Chênh lệch đôi','Pair gap'),L('效率達成','Đạt hiệu suất','Attainment')];
  return '<div class="table-scroll"><table class="data-table"><thead><tr>'+th.map(t=>'<th>'+t+'</th>').join('')+'</tr></thead><tbody>'+s.allocations.map(m=>'<tr><td>'+esc(m.model)+'</td><td>'+number(m.seconds,0)+'</td><td>'+number(m.share*100,1)+'%</td><td>'+number(m.target8,1)+'</td><td>'+number(m.target,1)+'</td><td>'+number(m.pairs,0)+'</td><td>'+number(m.pairs-m.target,1)+'</td><td>'+(m.target>0?number(m.pairs/m.target*100,1)+'%':'—')+'</td></tr>').join('')+'<tr class="highlight"><td>'+L('整線合計','Tổng chuyền','Line total')+'</td><td>—</td><td>100%</td><td>'+number(s.target8,1)+'</td><td>'+number(s.target,1)+'</td><td>'+number(s.actual,0)+'</td><td>'+number(s.delta,1)+'</td><td>'+number(s.efficiency*100,1)+'%</td></tr></tbody></table></div>';
 }
 function note(){return L('IE應產＝人員×工時×3600÷加權IE秒值。三款共用人員只計一次；依當日正常班雙數比例配比，底加與成型分開計算。差異率＝（實際−應產）÷應產；效率達成＝實際÷應產。配比為當日組合基準，各款相同比例的達成率不代表獨立型體效率。',
  'Chuẩn IE = nhân lực × giờ × 3600 ÷ giây IE bình quân. Nhân lực chung chỉ tính một lần; phân bổ theo tỷ trọng đôi ca chính. GCĐ và TH tính riêng. Chênh lệch = (thực tế − chuẩn) ÷ chuẩn; đạt = thực tế ÷ chuẩn. Tỷ lệ theo cơ cấu ngày không phải hiệu suất riêng từng mã.',
  'IE target = Member × hours × 3600 / weighted IE seconds. Shared members are counted once; targets use regular-shift model pair shares. Processes are separate. Variance = (actual − target) / target; attainment = actual / target. Mix-based model attainment is not independently measured model efficiency.');}
 function renderTargets(){
  const compare=periods().compare,grid=document.getElementById('kpiGrid');
  document.getElementById('ieCapacityPlanner')?.remove();
  if(compare.length!==1){if(grid)grid.innerHTML=card(L('請選擇單一生產日','Chọn một ngày sản xuất','Select one production day'),'—','');return;}
  const day=compare[0],gc=calculate('gc',day),asm=calculate('asm',day);
  if(grid)grid.innerHTML=summary(gc)+summary(asm);
  const insight=document.getElementById('insights');if(insight)insight.innerHTML=[gc,asm].map(s=>'<div class="insight-item"><strong>'+(s.p==='gc'?'Stockfit / GCĐ':'Assembly / TH')+' · IE</strong><p>'+esc(s.valid?L('當日人員 ','Nhân lực ngày ','Daily Member ')+number(s.members,0)+' · '+number(s.hours,1)+'H · '+L('IE應產 ','Chuẩn IE ','IE target ')+number(s.target,1)+' · '+L('實際 ','Thực tế ','Actual ')+number(s.actual,0)+' · '+L('差異 ','Chênh lệch ','Gap ')+number(s.delta,1)+' · '+L('效率達成 ','Đạt hiệu suất ','Attainment ')+number(s.efficiency*100,1)+'%':s.errors.join('；'))+'</p></div>').join('');
  let panel=document.getElementById('ieOverviewTargets');
  if(!panel){panel=document.createElement('article');panel.id='ieOverviewTargets';panel.className='panel ie-overview-targets';grid.insertAdjacentElement('afterend',panel);}
  panel.innerHTML='<div class="panel-head"><h3>'+L('各型體 IE 8H應產與實績','Chuẩn IE 8H và thực tế theo mã','Model IE 8H targets and actuals')+' · '+esc(day.date)+'</h3></div><h4>Stockfit / GCĐ</h4>'+table(gc)+'<h4>Assembly / TH</h4>'+table(asm)+'<p class="ie-mix-note">'+note()+'</p>';
  const mix=document.getElementById('ieMixSummary'),mixTable=document.getElementById('ieMixTable');
  if(mix){mix.className='kpi-grid';mix.innerHTML=summary(gc)+summary(asm);}
  if(mixTable)mixTable.innerHTML='<h4>Stockfit / GCĐ</h4>'+table(gc)+'<h4>Assembly / TH</h4>'+table(asm)+'<p class="ie-mix-note">'+note()+'</p>';
 }
 const oldModels=window.renderIEModels;
 window.renderIEModels=function(){if(typeof oldModels==='function')oldModels();renderTargets();};
 window.FactoryIEPlanner=Object.freeze({calculate,renderTargets});
 let plannerDate='';
 const oldPlanner=window.renderPlanner;
 window.renderPlanner=function(){
  if(typeof oldPlanner==='function')oldPlanner();
  const day=periods().compare[0];if(!day)return;
  if(plannerDate!==day.date){plannerDate=day.date;for(const p of ['gc','asm']){document.getElementById(p+'HC').value=day[p+'HC']??'';document.getElementById(p+'Hours').value=8;}}
  document.getElementById('plannerPeriod').textContent=L('採用當日型體組合：','Cơ cấu mã ngày: ','Daily model mix: ')+day.date;
  for(const p of ['gc','asm'])document.getElementById(p+'Target').closest('label').hidden=true;
  for(const p of ['gc','asm']){
   const members=num(document.getElementById(p+'HC').value),hours=num(document.getElementById(p+'Hours').value);
   const s=calculate(p,day,members,hours),el=document.getElementById(p+'Plan');
   if(el)el.innerHTML='<div class="kpi-grid">'+summary(s)+'</div>'+table(s)+'<p class="ie-mix-note">'+note()+'</p>';
  }
 };
 const oldRender=window.render;
 window.render=function(){if(window.FactoryCloudDashboard?.enabled){const sets={zh:{localProcessing:'雲端共用資料',localNote:'Excel匯入與IE儲存會自動寫入雲端；成功後可跨裝置讀取。',footer:'雲端資料庫儲存 · 每五分鐘自動更新',overviewSub:'依IE標準、實際人員與正常班產量，對照應產、差異及效率。'},vn:{localProcessing:'Dữ liệu đám mây',localNote:'Nhập Excel và lưu IE tự động ghi lên đám mây.',footer:'Lưu đám mây · cập nhật mỗi 5 phút',overviewSub:'Đối chiếu chuẩn IE, nhân lực và sản lượng ca chính.'},en:{localProcessing:'Shared cloud data',localNote:'Excel imports and saved IE standards are automatically written to the cloud.',footer:'Cloud database · refreshes every 5 minutes',overviewSub:'Compare IE targets, actual Member, regular output, gaps and attainment.'}};for(const lang of Object.keys(sets))Object.assign(translations[lang],sets[lang]);}oldRender();const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);let node;const word=state.lang==='zh'?'人員':state.lang==='vn'?'Nhân lực':'Member';while((node=walker.nextNode())){if(!node.parentElement?.closest('script,style,textarea')&&/(?<![a-zA-Z0-9_])HC(?![a-zA-Z0-9_])/.test(node.nodeValue))node.nodeValue=node.nodeValue.replace(/(?<![a-zA-Z0-9_])HC(?![a-zA-Z0-9_])/g,word);}};
 const texts={overviewKpisSub:['依IE標準、實際人員與正常班工時，直接對照應產、實績、差異及效率。','Đối chiếu chuẩn IE với nhân lực, giờ ca chính và thực tế.','IE targets, actual members, regular hours, gaps and attainment.'],ieMixSub:['共用人員計一次，依當日型體組合分配IE應產；不套用歷史效率或假設折扣。','Nhân lực chung tính một lần; phân bổ theo cơ cấu mã trong ngày.','Shared members counted once; IE targets allocated by daily model mix.'],capacityTitle:['IE人員與產能計算','Tính nhân lực và công suất IE','IE Member and capacity'],capacitySub:['依已登錄IE標準及所選日期型體組合計算。','Theo định mức IE và cơ cấu ngày đã chọn.','Based on saved IE and selected daily model mix.']};
 for(const [k,v] of Object.entries(texts)){translations.zh[k]=v[0];translations.vn[k]=v[1];translations.en[k]=v[2];}
})();
