export const COMPARISON_SCENARIOS={tendencial:'Tendencial',moderado:'Moderado',intensivo:'Intensivo'};
export function comparisonSeries(model,scenario,territory){
  if(scenario!=='tendencial')return model.scenarios[scenario].territories[territory].series;
  return model.years.map(year=>{
    const base=model.bases[territory][year],zero=Object.fromEntries(Object.keys(base.levels).map(key=>[key,0]));
    return {year,base,people:0,education:0,educationLevels:zero,addedMw:0,populationTotal:base.population,educationTotal:base.education};
  });
}
export function comparisonMetric(row,metric,level='all'){
  return metric==='mw'?row.addedMw:metric==='population'?row.people:level==='all'?row.education:row.educationLevels[level];
}
export function comparisonDifference(a,b){
  return {mw:b.addedMw-a.addedMw,people:b.populationTotal-a.populationTotal,education:b.educationTotal-a.educationTotal};
}
// The same fixed department scale applies to every scenario and year.
export function comparisonMaximum(model,metric,level='all'){
  return Math.max(0,...Object.values(model.scenarios).flatMap(scenario=>model.ids.flatMap(id=>scenario.territories[id].series.map(row=>comparisonMetric(row,metric,level)))));
}
