export const DEMOGRAPHY_BASE_YEAR=2022;
export const DEMOGRAPHY_ANCHORS=[2022,2040,2050];

export function demographyTerritories(data) {
  const unique=new Map();
  data.demographyPopulation.forEach(row=>unique.set(row.territorio_id,row.territorio_nombre));
  return [...unique].map(([value,label])=>({value,label})).sort((a,b)=>a.label.localeCompare(b.label,'es'));
}

export function demographyTerritoryName(data,id) {
  if(id==='all') return 'Toda la provincia';
  return data.demographyPopulation.find(row=>row.territorio_id===id)?.territorio_nombre || 'Toda la provincia';
}

export function parseAgeRange(ageRange) {
  const [min,max]=String(ageRange).split('-').map(Number);
  return {min,max};
}

export function demographySexLabel(sex) {
  return sex==='M'?'Varones':sex==='F'?'Mujeres':'Ambos sexos';
}

export function demographyRows(data,state,{year=state.demographyYear,ageRange=state.demographyAgeRange,sex=state.demographySex||'all'}={}) {
  const {min,max}=parseAgeRange(ageRange);
  return data.demographyPopulation.filter(row=>(
    (state.demographyTerritory==='all'||row.territorio_id===state.demographyTerritory)&&
    (year==='all'||row.year===Number(year))&&row.edad>=min&&row.edad<=max&&
    (sex==='all'||row.sexo===sex)
  ));
}

export function demographyMapStats(data,state) {
  const {min,max}=parseAgeRange(state.demographyAgeRange);
  const selectedSex=state.demographySex||'all';
  const years=new Set([DEMOGRAPHY_BASE_YEAR,Number(state.demographyYear)]);
  const totals=new Map();
  data.demographyPopulation.forEach(row=>{
    if(!years.has(row.year)||row.edad<min||row.edad>max||(selectedSex!=='all'&&row.sexo!==selectedSex))return;
    const key=`${row.territorio_id}:${row.year}`;
    totals.set(key,(totals.get(key)||0)+Number(row.poblacion||0));
  });
  return data.departmentBoundaries.features.map(feature=>{
    const id=String(feature.properties.territorio_id);
    const value=totals.get(`${id}:${Number(state.demographyYear)}`)||0;
    const base=totals.get(`${id}:${DEMOGRAPHY_BASE_YEAR}`)||0;
    return {
      territorio_id:id,
      territorio_nombre:feature.properties.territorio_nombre,
      value,
      base,
      variation:base?value/base-1:null
    };
  });
}

export function populationTotal(rows) {
  return rows.reduce((total,row)=>total+Number(row.poblacion||0),0);
}

export function totalForRange(data,state,ageRange,year=state.demographyYear) {
  return populationTotal(demographyRows(data,state,{year,ageRange}));
}

export function demographyMetrics(data,state) {
  const year=Number(state.demographyYear);
  const total=totalForRange(data,state,'0-100',year);
  const base=totalForRange(data,state,'0-100',DEMOGRAPHY_BASE_YEAR);
  return {
    total,
    age0to14:totalForRange(data,state,'0-14',year),
    age15to64:totalForRange(data,state,'15-64',year),
    age65plus:totalForRange(data,state,'65-100',year),
    schoolAge:totalForRange(data,state,'3-17',year),
    variation:base?total/base-1:0
  };
}
