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
