// Presentation selectors. The model and its assumptions remain unchanged.
export function futureValues(row, mode, level='all') {
  const population=mode==='population';
  const base=population?row.base.population:level==='all'?row.base.education:row.base.levels[level];
  const delta=population?row.people:level==='all'?row.education:row.educationLevels[level];
  return {base,delta,total:base+delta,relative:base>0?delta/base:null};
}
export function futurePeak(series,mode,level='all') {
  return series.reduce((best,row)=>futureValues(row,mode,level).delta>futureValues(best,mode,level).delta?row:best);
}
export const FUTURE_LEVEL_COLORS={INI:'#D5A92A',PRI:'#63A6B1',SEC:'#247C8C',AGE18:'#8A5A44'};
export const toggleFutureTerritory=(current,id)=>current===id?'all':id;
export function futureEducationTraces(series,levels,scenarioLabel){
  return levels.flatMap(([key,title])=>[
    {type:'scatter',mode:'lines',name:`${title} · tendencial`,legendgroup:key,x:series.map(r=>r.year),y:series.map(r=>r.base.levels[key]),line:{color:FUTURE_LEVEL_COLORS[key],width:3,dash:'solid'}},
    {type:'scatter',mode:'lines',name:`${title} · ${scenarioLabel}`,legendgroup:key,x:series.map(r=>r.year),y:series.map(r=>r.scenarioLevels[key]),line:{color:FUTURE_LEVEL_COLORS[key],width:2.5,dash:'dot'}}
  ]);
}
export function futureChartRange(values,expanded=false){
  if(!expanded||!values.length)return {rangemode:'tozero',autorange:true};
  const min=Math.min(...values),max=Math.max(...values),pad=Math.max((max-min)*.08,max*.001,1);
  return {range:[Math.max(0,min-pad),max+pad],autorange:false};
}
