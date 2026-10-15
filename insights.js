/* V1.11: evidence-led productivity intelligence, read-only analytics. */
(function insightModule(window) {
  'use strict';
  const num = v => typeof v === 'number' && Number.isFinite(v) ? v : null;
  const safeArray = v => Array.isArray(v) ? v : [];
  const pctDelta = (a,b) => a !== null && b !== null && a > 0 ? b/a-1 : null;
  const modelKey = m => String(m||'').trim().toUpperCase();
  const L = (lang,zh,vn,en) => lang === 'en' ? en : lang === 'vn' ? vn : zh;
  function analyze({state,a,b,dateA,dateB}) {
    const daily = safeArray(state.daily), models = safeArray(state.models);
    function coverage(date,p) {
      const day = daily.find(r=>r.date===date);
      const total = num(day?.[p+'Normal']);
      const rows = models.filter(r=>r.date===date && (num(r[p+'Normal'])!==null || num(r[p+'Total'])!==null));
      const invalid = rows.some(r=>num(r[p+'Normal'])===null || num(r[p+'Normal'])<0);
      const duplicates = new Set(rows.map(r=>modelKey(r.model))).size!==rows.length;
      const pairs = rows.reduce((sum,r)=>sum+(num(r[p+'Normal'])??0),0);
      return {total,rows,pairs,complete:total!==null && total>=0 && rows.length>0 && !invalid && !duplicates && Math.abs(pairs-total)<=1,invalid,duplicates};
    }
    function history(model,p) {
      const seen=new Set();
      const records=models.filter(r=>modelKey(r.model)===modelKey(model) && r.date<dateB && num(r[p+'Normal'])>0)
        .sort((x,y)=>y.date.localeCompare(x.date))
        .filter(r=>{if(seen.has(r.date))return false;seen.add(r.date);return true;})
        .slice(0,5);
      return {count:records.length,avg:records.length?records.reduce((s,r)=>s+r[p+'Normal'],0)/records.length:null};
    }
    function modelDiagnostic(p) {
      const current=coverage(dateB,p),base=coverage(dateA,p);
      const valid=current.rows.filter(r=>num(r[p+'Normal'])>0);
      const assessments=valid.map(r=>{
        const h=history(r.model,p),actual=r[p+'Normal'];
        return {model:r.model,actual,avg:h.avg,samples:h.count,change:h.count>=3?pctDelta(h.avg,actual):null,gap:h.count>=3?actual-h.avg:null};
      });
      const qualified=assessments.filter(x=>x.change!==null);
      const below=qualified.filter(x=>x.change<=-0.10).sort((x,y)=>x.gap-y.gap);
      const above=qualified.filter(x=>x.change>=0.10).sort((x,y)=>y.gap-x.gap);
      const oldMap=new Map(base.rows.filter(r=>num(r[p+'Normal'])>0).map(r=>[modelKey(r.model),r]));
      const newMap=new Map(valid.map(r=>[modelKey(r.model),r]));
      const added=[],removed=[],sharedDeclines=[],sharedIncreases=[];
      if(base.complete&&current.complete){
        for(const [key,row] of newMap){
          if(!oldMap.has(key))added.push(row.model);
          else {
            const before=oldMap.get(key)[p+'Normal'],now=row[p+'Normal'];
            if(now<before)sharedDeclines.push({model:row.model,from:before,to:now,delta:now-before});
            else if(now>before)sharedIncreases.push({model:row.model,from:before,to:now,delta:now-before});
          }
        }
        for(const [key,row] of oldMap)if(!newMap.has(key))removed.push(row.model);
        sharedDeclines.sort((x,y)=>x.delta-y.delta);
        sharedIncreases.sort((x,y)=>y.delta-x.delta);
      }
      return {current,base,assessments,qualified,below,above,added,removed,sharedDeclines,sharedIncreases};
    }
    const processes=[{p:'gc',label:'Stockfit / GCĐ',hc:'gcHC',output:'gcAvg',rate:'gcRate',hours:'gcHours'},
                     {p:'asm',label:'Assembly / TH',hc:'asmHC',output:'asmAvg',rate:'asmRate',hours:'asmHours'}]
      .map(cfg=>{
        const oldHC=num(a[cfg.hc]),newHC=num(b[cfg.hc]),oldOutput=num(a[cfg.output]),newOutput=num(b[cfg.output]);
        const oldRate=num(a[cfg.rate]),newRate=num(b[cfg.rate]);
        const hours=num(daily.find(r=>r.date===dateB)?.[cfg.hours]);
        const hcDelta=pctDelta(oldHC,newHC),outputDelta=pctDelta(oldOutput,newOutput),rateDelta=pctDelta(oldRate,newRate);
        const hcUp=oldHC!==null&&newHC!==null&&newHC>oldHC;
        const rateDown=rateDelta!==null&&rateDelta<-0.005;
        const rateUp=rateDelta!==null&&rateDelta>0.005;
        const kind=rateDelta===null?'caution':rateDown?'negative':rateUp?'positive':'neutral';
        const expected=oldRate!==null&&oldRate>0&&newHC>0&&hours>0?oldRate*newHC*hours:null;
        const shortfall=expected!==null&&newOutput!==null?expected-newOutput:null;
        return {...cfg,oldHC,newHC,oldOutput,newOutput,oldRate,newRate,hours,hcDelta,outputDelta,rateDelta,hcUp,rateDown,rateUp,kind,expected,shortfall,models:modelDiagnostic(cfg.p)};
      });
    const recordB=daily.find(r=>r.date===dateB);
    const missingOT=recordB&&(recordB.gcOT===null||recordB.asmOT===null||
      (recordB.gcOT===0&&recordB.asmOT===0&&recordB.gcOTHC==null&&recordB.asmOTHC==null&&recordB.otHours!==0));
    return {processes,missingOT:!!missingOT,dateA,dateB};
  }
  function render({state,a,b,dateA,dateB,dateLabel,esc,fmt,int}) {
    const lang=state.lang;
    const d=analyze({state,a,b,dateA,dateB});
    const pct=v=>v===null?'—':`${v>=0?'+':''}${(v*100).toFixed(1)}%`;
    const pctAbs=v=>v===null?'—':`${Math.abs(v*100).toFixed(1)}%`;
    const box=(title,desc,kind='neutral',details='')=>{
      const icon={negative:'↓',positive:'↑',caution:'!',neutral:'↔',summary:'≡',info:'i'}[kind]||'i';
      return `<div class="insight insight--${kind}"><div class="insight-mark" aria-hidden="true">${icon}</div><div class="insight-body"><strong>${esc(title)}</strong><p>${esc(desc)}</p>${details}</div></div>`;
    };
    function modelDetails(p) {
      const m=p.models,cur=m.current;
      if(!cur.complete){
        const coverage=cur.total!==null?`${int(cur.pairs)} / ${int(cur.total)}`:L(lang,'日報缺少正常班產量','Thiếu sản lượng ca chính','Regular-shift daily total is missing');
        return `<div class="insight-evidence"><b>${esc(L(lang,'型體資料檢核','Kiểm tra dữ liệu mã giày','Model data validation'))}</b><p>${esc(L(lang,
          `B日型體加總 ${coverage} 雙，資料尚未完整對齊；暫停型體歷史平均排名，避免誤判。`,
          `Tổng theo mã ngày B: ${coverage} đôi; dữ liệu chưa khớp. Tạm dừng xếp hạng theo trung bình lịch sử.`,
          `Day B model subtotal: ${coverage} pairs. Model data is missing or inconsistent; historical rankings are withheld.`))}</p></div>`;
      }
      const items=[];
      items.push(`<div class="insight-evidence-head">${esc(L(lang,'型體歷史平均檢核','Đối chiếu trung bình mã giày','Model historical-average check'))} · ${esc(L(lang,
        `${m.qualified.length}/${m.assessments.length} 款具備至少3筆歷史資料`,
        `${m.qualified.length}/${m.assessments.length} mã có ít nhất 3 bản ghi lịch sử`,
        `${m.qualified.length}/${m.assessments.length} models have at least 3 historical records`))}</div>`);
      if(m.below.length){
        const rows=m.below.slice(0,3).map(x=>`<div class="insight-model-row"><span class="insight-model-name">${esc(x.model)}</span><span>${esc(L(lang,
          `B日 ${int(x.actual)} / 前${x.samples}筆均 ${fmt(x.avg,0)} 雙`,
          `Ngày B ${int(x.actual)} / TB ${x.samples} lần: ${fmt(x.avg,0)} đôi`,
          `Day B ${int(x.actual)} / prior ${x.samples}-record avg ${fmt(x.avg,0)} pairs`))}</span><b class="insight-model-negative">${pct(x.change)}</b></div>`).join('');
        items.push(`<div class="insight-model-list">${rows}</div>`);
        if(m.below.length>3)items.push(`<div class="insight-evidence-note">${esc(L(lang,
          `另有 ${m.below.length-3} 款低於歷史平均10%以上，請至型體比較檢查。`,
          `Còn ${m.below.length-3} mã thấp hơn TB trên 10%.`,
          `${m.below.length-3} additional models are over 10% below their historical averages.`))}</div>`);
      }else if(m.qualified.length){
        items.push(`<div class="insight-evidence-note">${esc(L(lang,
          '有足夠歷史樣本的型體中，未發現低於各自歷史平均10%以上者。',
          'Trong các mã đủ dữ liệu, không có mã nào thấp hơn TB lịch sử trên 10%.',
          'No model with sufficient history is more than 10% below its own historical average.'))}</div>`);
      }else{
        items.push(`<div class="insight-evidence-note">${esc(L(lang,
          '目前型體歷史資料不足3筆，不能判定是否達到歷史平均。',
          'Mỗi mã có dưới 3 bản ghi lịch sử; chưa thể đánh giá so với trung bình.',
          'Fewer than 3 historical records per model; historical-average attainment cannot be evaluated.'))}</div>`);
      }
      if(m.base.complete){
        const changes=m.sharedDeclines.slice(0,2).map(x=>`${x.model} ${int(x.from)}→${int(x.to)} (${int(x.delta)})`);
        if(changes.length)items.push(`<div class="insight-evidence-note">${esc(L(lang,
          `A→B同款型體產量下降較多：${changes.join('；')}。此為產量變化，不代表型體人時效率下降。`,
          `Mã cùng sản xuất giảm nhiều A→B: ${changes.join('; ')}. Đây là biến động sản lượng, không phải hiệu suất riêng mã.`,
          `Largest A→B output declines among continuing models: ${changes.join('; ')}. Output changes do not establish model-level labor efficiency.`))}</div>`);
        if(m.added.length||m.removed.length){
          const added=m.added.slice(0,3).join(', ')||'—',removed=m.removed.slice(0,3).join(', ')||'—';
          items.push(`<div class="insight-evidence-note">${esc(L(lang,
            `型體組合變動：B日新增 ${added}；A日有但B日未生產 ${removed}。排程變更不能直接視為產效不良。`,
            `Thay đổi cơ cấu mã: mới ngày B ${added}; chỉ có ngày A ${removed}. Không coi thay đổi kế hoạch là lỗi hiệu suất.`,
            `Model-mix change: added on Day B: ${added}; produced on Day A only: ${removed}. Schedule changes are not evidence of poor productivity.`))}</div>`);
        }
      }else{
        items.push(`<div class="insight-evidence-note">${esc(L(lang,
          'A日型體明細未與日總量對齊，因此不進行A→B同款產量歸因。',
          'Dữ liệu mã ngày A chưa khớp tổng; không phân rã biến động A→B.',
          'Day A model totals are incomplete; A→B model-output attribution is withheld.'))}</div>`);
      }
      items.push(`<div class="insight-evidence-foot">${esc(L(lang,
        '歷史平均採B日前最近最多5筆「有生產」的同型體正常班完成量；這是產量參考值，不是IE目標、排程目標或型體人時效率。',
        'Trung bình dùng tối đa 5 ngày có sản xuất gần nhất trước ngày B; chỉ là tham chiếu sản lượng, không phải mục tiêu IE hay hiệu suất nhân lực riêng mã.',
        'Average uses up to 5 prior active production records before Day B; it is an output reference, not an IE target, planned quantity or model-specific labor productivity.'))}</div>`);
      return `<div class="insight-evidence">${items.join('')}</div>`;
    }
    const risks=d.processes.filter(p=>p.hcUp&&p.rateDown);
    const declining=d.processes.filter(p=>p.rateDown);
    const noModels=d.processes.filter(p=>!p.models.current.complete).map(p=>p.label);
    let summaryTitle,summaryDesc,summaryKind;
    if(risks.length){
      summaryKind='negative';
      summaryTitle=L(lang,'管理重點：增員未帶來相應人時產出','Trọng điểm: tăng người nhưng năng suất giảm','Management priority: HC increased while productivity fell');
      summaryDesc=L(lang,
        `${risks.map(p=>`${p.label} HC +${int(p.newHC-p.oldHC)}、人時產出 ${pct(p.rateDelta)}`).join('；')}。優先檢查當日型體完成量、型體組合與投入人時，再由現場確認WIP、返修及節拍原因。`,
        `${risks.map(p=>`${p.label} HC +${int(p.newHC-p.oldHC)}, đôi/giờ công ${pct(p.rateDelta)}`).join('; ')}. Ưu tiên kiểm tra sản lượng theo mã, cơ cấu mã và giờ công; xác minh WIP, sửa hàng và nhịp tại hiện trường.`,
        `${risks.map(p=>`${p.label}: HC +${int(p.newHC-p.oldHC)}, pairs/person-hour ${pct(p.rateDelta)}`).join('; ')}. Review model-level output, mix and person-hours first; verify WIP, rework and cycle-time causes on site.`);
    }else if(declining.length){
      summaryKind='caution';
      summaryTitle=L(lang,'管理重點：人時產出下降','Trọng điểm: năng suất giờ công giảm','Management priority: productivity decline');
      summaryDesc=L(lang,
        `${declining.map(p=>`${p.label} ${pct(p.rateDelta)}`).join('；')}。請對照HC、正常班完成量與型體歷史平均，勿直接認定根因。`,
        `${declining.map(p=>`${p.label} ${pct(p.rateDelta)}`).join('; ')}. Cần đối chiếu HC, sản lượng ca chính và trung bình theo mã.`,
        `${declining.map(p=>`${p.label} ${pct(p.rateDelta)}`).join('; ')}. Compare HC, regular-shift output and model historical averages before investigating root causes.`);
    }else{
      summaryKind=d.processes.some(p=>p.kind==='caution')?'caution':'info';
      summaryTitle=L(lang,'管理重點：投入與產出整合檢核','Trọng điểm: đối chiếu nhân lực và sản lượng','Management overview: HC and output alignment');
      summaryDesc=L(lang,
        '依序檢查HC、正常班完成量、人時產出與型體組合；未發現「增員且人時產出下降」的組合，仍須確認資料完整性。',
        'Đối chiếu HC, sản lượng ca chính, đôi/giờ công và cơ cấu mã; vẫn cần kiểm tra dữ liệu.',
        'Review HC, regular-shift output, pairs/person-hour and model mix. No simultaneous HC increase and productivity decline was detected; verify data completeness.');
    }
    if(noModels.length)summaryDesc+=' '+L(lang,
      `型體明細尚未對齊：${noModels.join('、')}，暫不能完成型體拆解。`,
      `Dữ liệu theo mã chưa khớp: ${noModels.join(', ')}.`,
      `Model-level data is incomplete for ${noModels.join(', ')}.`);
    const result=[box(summaryTitle,summaryDesc,summaryKind)];
    for(const p of d.processes){
      const valid=p.oldRate!==null&&p.newRate!==null&&p.oldHC!==null&&p.newHC!==null&&p.oldOutput!==null&&p.newOutput!==null;
      if(!valid){
        result.push(box(p.label+' · '+L(lang,'資料不足','Thiếu dữ liệu','Insufficient data'),
          L(lang,'HC、正常班產量或工時缺漏，暫不判讀人時產出。','Thiếu HC, sản lượng ca chính hoặc giờ công.','HC, regular-shift output or hours are missing; productivity cannot be assessed.'),
          'caution',modelDetails(p)));
        continue;
      }
      const headline=p.hcUp&&p.rateDown?L(lang,'增員但人時產出下降','Tăng người nhưng năng suất giảm','More HC, lower productivity')
        :p.rateDown?L(lang,'人時產出下降','Năng suất giảm','Productivity declined')
        :p.rateUp?L(lang,'人時產出提升','Năng suất tăng','Productivity improved')
        :L(lang,'人時產出大致持平','Năng suất gần như ổn định','Productivity approximately stable');
      let desc=L(lang,
        `HC ${fmt(p.oldHC,0)}→${fmt(p.newHC,0)}（${pct(p.hcDelta)}），正常班完成量 ${int(p.oldOutput)}→${int(p.newOutput)} 雙（${pct(p.outputDelta)}），人時產出 ${fmt(p.oldRate,3)}→${fmt(p.newRate,3)} 雙／人時（${pct(p.rateDelta)}）。`,
        `HC ${fmt(p.oldHC,0)}→${fmt(p.newHC,0)} (${pct(p.hcDelta)}), sản lượng ca chính ${int(p.oldOutput)}→${int(p.newOutput)} đôi (${pct(p.outputDelta)}), đôi/giờ công ${fmt(p.oldRate,3)}→${fmt(p.newRate,3)} (${pct(p.rateDelta)}).`,
        `HC ${fmt(p.oldHC,0)}→${fmt(p.newHC,0)} (${pct(p.hcDelta)}); regular-shift output ${int(p.oldOutput)}→${int(p.newOutput)} pairs (${pct(p.outputDelta)}); pairs/person-hour ${fmt(p.oldRate,3)}→${fmt(p.newRate,3)} (${pct(p.rateDelta)}).`);
      if(p.shortfall!==null&&p.shortfall>1){
        desc+=' '+L(lang,
          `若僅以A日人時產出對照B日投入工時，參考產量為${int(p.expected)}雙，與實際相差${int(p.shortfall)}雙；此為單日比較差額，不是已證實的產能損失。`,
          `Nếu dùng năng suất ngày A đối chiếu giờ công ngày B, tham chiếu ${int(p.expected)} đôi, chênh ${int(p.shortfall)} đôi; không phải tổn thất đã xác nhận.`,
          `At Day A's productivity and Day B's person-hours, the reference is ${int(p.expected)} pairs, ${int(p.shortfall)} above actual. This single-day comparison is not a verified production loss.`);
      }
      result.push(box(p.label+' · '+headline,desc,p.kind,modelDetails(p)));
    }
    if(d.missingOT){
      result.push(box(L(lang,'OT資料待確認','Cần xác nhận dữ liệu OT','OT data needs confirmation'),
        L(lang,'B日OT產量為0但未明確確認無加班，或OT資料缺漏；請先核實後再解讀正常班產效。',
          'OT ngày B bằng 0 nhưng chưa xác nhận không tăng ca, hoặc thiếu dữ liệu OT. Hãy kiểm tra trước khi kết luận.',
          'Day B has zero OT without explicit no-OT confirmation, or missing OT data. Verify this before relying on regular-shift productivity.'),
        'caution'));
    }
    result.push(box(L(lang,'判讀限制與現場驗證','Giới hạn phân tích & xác minh','Interpretation limits & on-site validation'),
      L(lang,'型體歷史平均是完成產量比較，不等於計畫量或IE標準。HC與產量的關聯只能定位異常；WIP、瓶頸、返修、品質及換型原因需結合現場與工序紀錄確認。',
        'Trung bình theo mã chỉ là sản lượng tham chiếu, không phải kế hoạch hay chuẩn IE. Cần dữ liệu WIP, công đoạn, sửa hàng và chất lượng để xác định nguyên nhân.',
        'Historical model averages are output references, not planned volumes or IE standards. HC and output data reveal deviations, not causes; validate WIP, bottlenecks, rework, quality and changeovers on site.'),
      'info'));
    return `<div class="analysis-date">${esc(dateLabel)}</div>`+result.join('');
  }
  window.FactoryInsightEngine={analyze,render};
})(window);
