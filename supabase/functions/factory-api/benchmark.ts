export async function benchmark(supabase:any,date:string,process:string,wanted:string[]){
 const start=(days:number)=>new Date(Date.parse(date+'T00:00:00Z')-days*86400000).toISOString().slice(0,10);
 const [manual,excel]=await Promise.all([
  supabase.from('production_entries')
   .select('production_date,output_total,normal_hc,normal_hours,ot_output,models,updated_at')
   .eq('plant','NBY').eq('process',process)
   .gte('production_date',start(90)).lt('production_date',date)
   .order('production_date',{ascending:false}).limit(120),
  supabase.from('factory_excel_days')
   .select('production_date,daily,models,updated_at')
   .eq('plant','NBY').gte('production_date',start(90)).lt('production_date',date)
   .order('production_date',{ascending:false}).limit(120)
 ]);
 if(manual.error||excel.error)throw manual.error||excel.error;
 const effective=new Map<string,any>();
 for(const r of manual.data||[])effective.set(r.production_date,r);
 for(const entry of excel.data||[]){
  const d=entry.daily||{},total=d[process+'Total'];
  if(total===null||total===undefined)continue;
  const prev=effective.get(entry.production_date);
  if(prev&&String(prev.updated_at||'')>=String(entry.updated_at||''))continue;
  effective.set(entry.production_date,{
   production_date:entry.production_date,output_total:total,
   normal_hc:d[process+'HC'],normal_hours:d[process+'Hours'],
   ot_output:d[process+'OT'],updated_at:entry.updated_at,
   models:(entry.models||[]).filter((m:any)=>m[process+'Total']!==null&&m[process+'Total']!==undefined)
    .map((m:any)=>({code:m.model,total:m[process+'Total'],ot:m[process+'OT']}))
  });
 }
 type Sample={date:string,pairs:number,hours:number,codes:string[]};
 const samples:Sample[]=[...effective.values()]
  .sort((a:any,b:any)=>b.production_date.localeCompare(a.production_date))
  .filter((r:any)=>r.ot_output!==null&&r.normal_hc>0&&r.normal_hours>0&&r.output_total>=r.ot_output)
  .map((r:any)=>({
   date:r.production_date,pairs:r.output_total-r.ot_output,hours:r.normal_hc*r.normal_hours,
   codes:Array.isArray(r.models)?r.models.map((m:any)=>String(m.code||'')).sort():[]
  })).filter((r:Sample)=>r.pairs>0&&r.hours>0);
 const matched=samples.filter(r=>wanted.length>0&&r.codes.length===wanted.length&&r.codes.every((c,i)=>c===wanted[i]));
 let selected:Sample[]=[],source='none';
 if(matched.length>=5){selected=matched.slice(0,15);source='nby_model';}
 else if(samples.length>=5){selected=samples.slice(0,15);source='nby_process';}
 else{
  const {data:rows,error:err}=await supabase.from('historical_process_daily')
   .select('production_date,normal_output,normal_hc,normal_hours')
   .eq('plant','NBY').eq('process',process).gte('production_date',start(60)).lt('production_date',date)
   .order('production_date',{ascending:false}).limit(15);
  if(err)throw err;
  const ref:Sample[]=(rows||[]).map((r:any)=>({date:r.production_date,pairs:r.normal_output,hours:r.normal_hc*r.normal_hours,codes:[]}))
    .filter((r:Sample)=>r.pairs>0&&r.hours>0);
  if(ref.length>=5){selected=ref;source='nby_historical_process';}
 }
 if(!selected.length)return {ok:true,source:'none',rate:null,samples:0};
 const pairs=selected.reduce((sum,r)=>sum+r.pairs,0),hours=selected.reduce((sum,r)=>sum+r.hours,0);
 return {ok:true,plant:'NBY',source,rate:pairs/hours,samples:selected.length,method:'weighted_man_hour',
  history_start:selected[selected.length-1].date,history_end:selected[0].date};
}
