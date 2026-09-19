import {DEFAULT_CAPACITY_THRESHOLDS,occupancyStatus} from './config.js';

export const POLICY_GROUPS=[
  {id:'0_3',label:'0–3 años',level:'INI',levelLabel:'Inicial',color:'#FFC928'},
  {id:'4_5',label:'4–5 años',level:'INI',levelLabel:'Inicial',color:'#D5A92A'},
  {id:'6_11',label:'6–11 años',level:'PRI',levelLabel:'Primario',color:'#63A6B1'},
  {id:'12_14',label:'12–14 años',level:'SEC',levelLabel:'Secundario',color:'#247C8C'},
  {id:'15_17',label:'15–17 años',level:'SEC',levelLabel:'Secundario',color:'#FF6B35'},
  {id:'18_SEC',label:'18 años',level:'AGE18',levelLabel:'18 años',color:'#8A5A44'}
];
export const CAPACITY_LEVELS=[{value:'all',label:'Todos'},{value:'INI',label:'Inicial'},{value:'PRI',label:'Primario'},{value:'SEC',label:'Secundario'},{value:'AGE18',label:'18 años'}];
export const OCCUPANCY_CATEGORIES=[
  {id:'CAPACIDAD_DISPONIBLE',label:'Capacidad disponible',color:'#63A6B1'},
  {id:'EQUILIBRIO',label:'Equilibrio',color:'#FFC928'},
  {id:'ALTA_PRESION',label:'Alta presión',color:'#FF6B35'},
  {id:'SATURADA',label:'Saturada',color:'#B9472F'}
];
const GROUP_META={
  '0_3':{min:0,max:3},'4_5':{min:4,max:5},'6_11':{min:6,max:11},
  '12_14':{min:12,max:14},'15_17':{min:15,max:17},'18_SEC':{min:18,max:18}
};
const LEVEL_GROUPS={INI:['0_3','4_5'],PRI:['6_11'],SEC:['12_14','15_17'],AGE18:['18_SEC']};
const LEVEL_META={INI:{label:'Inicial',color:'#FFC928'},PRI:{label:'Primario',color:'#63A6B1'},SEC:{label:'Secundario',color:'#247C8C'},AGE18:{label:'18 años',color:'#8A5A44'}};
let cacheOwner=null,indexCache=null,projectionCache=new Map(),factorCache=new Map();

function indexes(data){
  if(cacheOwner===data&&indexCache)return indexCache;
  const rates=new Map(),population=new Map();
  data.attendanceRates.forEach(r=>rates.set(`${r.ambito_tasa}|${r.territorio_id}|${r.grupo_edad_id}|${r.sexo_id}`,r));
  data.demographyPopulation.forEach(r=>{for(const [g,m] of Object.entries(GROUP_META)){if(r.edad>=m.min&&r.edad<=m.max){const k=`${r.territorio_id}|${r.year}|${g}|${r.sexo}`;population.set(k,(population.get(k)||0)+r.poblacion);}}});
  cacheOwner=data;projectionCache=new Map();factorCache=new Map();indexCache={rates,population};return indexCache;
}
export function currentRate(data,territory,group,sex='T'){
  const {rates}=indexes(data),scope=territory==='all'?'PROV':'DEP',id=territory==='all'?'26':territory;
  const direct=rates.get(`${scope}|${id}|${group}|${sex}`);if(Number.isFinite(direct?.tasa_asistencia))return {...direct,source:scope==='DEP'?'departamental':'provincial'};
  return {...rates.get(`PROV|26|${group}|${sex}`),source:'provincial (fallback)'};
}
export function initialScenarioRates(data,territory,sex='all'){const s=sex==='all'?'T':sex;return Object.fromEntries(POLICY_GROUPS.map(g=>[g.id,currentRate(data,territory,g.id,s).tasa_asistencia]));}
export function groupForId(id){return POLICY_GROUPS.find(g=>g.id===id);}
function population(data,territory,year,group,sex){const p=indexes(data).population;if(territory!=='all')return p.get(`${territory}|${year}|${group}|${sex}`)||0;return Object.keys(data.territoryById).reduce((t,id)=>t+(p.get(`${id}|${year}|${group}|${sex}`)||0),0);}
function progress(data,state,group){const sex=state.sex==='all'?'T':state.sex,base=Number(currentRate(data,state.territory,group,sex).tasa_asistencia)||0,chosen=Math.max(base,Math.min(1,Number(state.capacityRates?.[group]??base)));return base>=1?0:(chosen-base)/(1-base);}
export function parameterRate(data,state,territory,group,sex){const current=Number(currentRate(data,territory,group,sex).tasa_asistencia)||0;return current+progress(data,state,group)*(1-current);}
function sexProjection(data,state,territory,group,sex,year,mode){
  const chosen=mode==='trend'?'trend':Number(state.capacityRates?.[group]??-1),key=`${territory}|${group}|${sex}|${year}|${mode}|${chosen}|${state.territory}|${state.sex}`;
  if(factorCache.has(key))return factorCache.get(key);
  const currentInfo=currentRate(data,territory,group,sex),current=Number(currentInfo.tasa_asistencia)||0,basePopulation=population(data,territory,2024,group,sex),projectedPopulation=population(data,territory,year,group,sex),rate=mode==='trend'?current:parameterRate(data,state,territory,group,sex),baseDemand=basePopulation*current,projectedDemand=projectedPopulation*rate,factor=baseDemand>0?projectedDemand/baseDemand:1;
  const value={basePopulation,projectedPopulation,currentRate:current,projectedRate:rate,baseDemand,projectedDemand,factor,rateSource:currentInfo.source};factorCache.set(key,value);return value;
}
function categoryId(x){return x>1?'SATURADA':x>=.85?'ALTA_PRESION':x>=.60?'EQUILIBRIO':'CAPACIDAD_DISPONIBLE';}
export function projectSection(data,state,row,mode=state.capacityMode||'scenario',year=state.year){
  const maleInputs=sexProjection(data,state,row.departamento_id,row.grupo_tasa_id,'M',Number(year),mode),femaleInputs=sexProjection(data,state,row.departamento_id,row.grupo_tasa_id,'F',Number(year),mode),maleLoad=row.matricula_varones_actual*maleInputs.factor,femaleLoad=row.matricula_mujeres_actual*femaleInputs.factor;
  const baseEnrollment=state.sex==='M'?row.matricula_varones_actual:state.sex==='F'?row.matricula_mujeres_actual:row.matricula_actual,load=state.sex==='M'?maleLoad:state.sex==='F'?femaleLoad:maleLoad+femaleLoad,level=row.grupo_tasa_id==='18_SEC'?'SEC':row.nivel_id,capacity=Math.max(1,Number(state.capacityThresholds?.[level]??DEFAULT_CAPACITY_THRESHOLDS[level]??row.capacidad)),baseOccupancy=baseEnrollment/capacity,occupancy=load/capacity,factor=baseEnrollment>0?load/baseEnrollment:1;
  return {...row,capacidad_base:row.capacidad,capacidad:capacity,matricula_base_seleccionada:baseEnrollment,ocupacion_base_2024:baseOccupancy,ocupacion_base_2024_pct:baseOccupancy*100,demanda_potencial_2024_varones:maleInputs.baseDemand,demanda_potencial_2024_mujeres:femaleInputs.baseDemand,demanda_potencial_proyectada_varones:maleInputs.projectedDemand,demanda_potencial_proyectada_mujeres:femaleInputs.projectedDemand,factor_demanda_varones:maleInputs.factor,factor_demanda_mujeres:femaleInputs.factor,factor_demanda_ponderado:factor,carga_equivalente_proyectada:load,carga_equivalente_varones:maleLoad,carga_equivalente_mujeres:femaleLoad,ocupacion:occupancy,ocupacion_pct:occupancy*100,holgura_modelada:Math.max(0,capacity-load),sobreocupacion_modelada:Math.max(0,load-capacity),categoria_ocupacion:categoryId(occupancy)};
}
function selectedGroups(selection){if(selection==='all')return Object.keys(GROUP_META);if(selection.startsWith('group:'))return[selection.slice(6)];return LEVEL_GROUPS[selection.slice(6)]||[];}
function rowGroup(row){return row.grupo_tasa_id;}
export function projectedSections(data,state,options={}){
  const territory=options.territory??state.territory,selection=options.selection??state.educationSelection,mode=options.mode||state.capacityMode||'scenario',year=options.year??state.year,groups=selectedGroups(selection);
  const signature=[territory,selection,mode,year,state.sex,JSON.stringify(state.capacityRates),JSON.stringify(state.capacityThresholds)].join('|');
  let rows=projectionCache.get(signature);
  if(!rows){rows=data.capacitySections.filter(r=>(territory==='all'||r.departamento_id===territory)&&groups.includes(rowGroup(r))).map(r=>projectSection(data,state,r,mode,year));projectionCache.set(signature,rows);if(projectionCache.size>20)projectionCache.delete(projectionCache.keys().next().value);}
  const school=options.school===undefined?state.capacitySchool:options.school;return school&&school!=='all'?rows.filter(r=>r.cue_anexo===school):rows;
}
export function aggregateCapacity(rows){const r={sections:rows.length,baseEnrollment:0,load:0,capacity:0,availablePlaces:0,overcapacity:0,availableSections:0,overoccupiedSections:0,categories:{}};OCCUPANCY_CATEGORIES.forEach(c=>r.categories[c.id]=0);rows.forEach(x=>{r.baseEnrollment+=x.matricula_base_seleccionada;r.load+=x.carga_equivalente_proyectada;r.capacity+=x.capacidad;r.availablePlaces+=x.holgura_modelada;r.overcapacity+=x.sobreocupacion_modelada;if(x.carga_equivalente_proyectada<x.capacidad)r.availableSections++;if(x.carga_equivalente_proyectada>x.capacidad)r.overoccupiedSections++;r.categories[x.categoria_ocupacion]++;});r.baseOccupancy=r.capacity?r.baseEnrollment/r.capacity:0;r.occupancy=r.capacity?r.load/r.capacity:0;r.demandFactor=r.baseEnrollment?r.load/r.baseEnrollment:1;return r;}
export function aggregateSchools(rows){const g={};rows.forEach(r=>{g[r.cue_anexo]??={cue_anexo:r.cue_anexo,name:r.establecimiento_nombre,departmentId:r.departamento_id,department:r.departamento_nombre,locality:r.localidad,lat:r.latitud,lng:r.longitud,levels:new Set(),rows:[]};g[r.cue_anexo].levels.add(r.grupo_tasa_id==='18_SEC'?'18 años':r.nivel_nombre);g[r.cue_anexo].rows.push(r);});return Object.values(g).map(s=>({...s,level:[...s.levels].join(', '),...aggregateCapacity(s.rows)}));}
export function departmentCapacity(data,state){const all=projectedSections(data,state,{territory:'all',school:'all'}),g=Object.fromEntries(Object.keys(data.territoryById).map(id=>[id,[]]));all.forEach(r=>g[r.departamento_id].push(r));return Object.entries(g).map(([id,rows])=>({id,name:data.territoryById[id].territorio_nombre,...aggregateCapacity(rows)}));}
export function departmentLevelCapacity(data,state){
  const rows=projectedSections(data,state,{territory:'all',school:'all'}),groups=selectedGroups(state.educationSelection),levels=state.educationSelection.startsWith('level:')?[state.educationSelection.slice(6)]:state.educationSelection.startsWith('group:')?[groups[0]==='18_SEC'?'AGE18':groupForId(groups[0]).level]:['INI','PRI','SEC','AGE18'];
  const buckets=new Map();rows.forEach(r=>{const level=r.grupo_tasa_id==='18_SEC'?'AGE18':r.nivel_id;if(!levels.includes(level))return;const k=`${r.departamento_id}|${level}`;if(!buckets.has(k))buckets.set(k,[]);buckets.get(k).push(r);});
  return Object.keys(data.territoryById).flatMap(id=>levels.map(level=>({id,department:data.territoryById[id].territorio_nombre,level,levelLabel:LEVEL_META[level].label,...aggregateCapacity(buckets.get(`${id}|${level}`)||[])})));
}
function point(data,state,territory,components,year,mode){let pop=0,demand=0;const sources=new Set(),sexes=state.sex==='all'?['M','F']:[state.sex];components.forEach(group=>sexes.forEach(sex=>{const p=population(data,territory,year,group,sex),current=currentRate(data,territory,group,sex),rate=mode==='trend'?Number(current.tasa_asistencia)||0:parameterRate(data,state,territory,group,sex);pop+=p;demand+=p*rate;sources.add(mode==='trend'?current.source:'tasa de escenario');}));return{year,population:pop,rate:pop?demand/pop:0,demand,rateSource:[...sources].join(' / ')};}
export function potentialDemandSeries(data,state){
  const selection=state.educationSelection,groups=selectedGroups(selection);let defs;
  if(state.capacityTrendView==='level'&&!selection.startsWith('group:')){const levels=selection==='all'?['INI','PRI','SEC','AGE18']:[selection.slice(6)];defs=levels.map(id=>({id,label:LEVEL_META[id].label,color:LEVEL_META[id].color,components:LEVEL_GROUPS[id]}));}
  else defs=POLICY_GROUPS.filter(g=>groups.includes(g.id)).map(g=>({...g,components:[g.id]}));
  const years=Array.from({length:29},(_,i)=>2022+i);return defs.map(d=>({...d,trend:years.map(y=>point(data,state,state.territory,d.components,y,'trend')),scenario:years.map(y=>point(data,state,state.territory,d.components,y,'scenario'))}));
}
export function departmentAttendanceComparison(data,state,groups=selectedGroups(state.educationSelection)){
  const sexes=state.sex==='all'?['M','F']:[state.sex],year=Number(state.year);
  return Object.keys(data.territoryById).map(id=>{let populationTotal=0,currentEnrollment=0,scenarioEnrollment=0;const sources=new Set();groups.forEach(group=>sexes.forEach(sex=>{const p=population(data,id,year,group,sex),current=currentRate(data,id,group,sex),actual=Number(current.tasa_asistencia)||0,scenario=parameterRate(data,state,id,group,sex);populationTotal+=p;currentEnrollment+=p*actual;scenarioEnrollment+=p*scenario;sources.add(current.source);}));const current=populationTotal?currentEnrollment/populationTotal:0,scenario=populationTotal?scenarioEnrollment/populationTotal:0;return{id,name:data.territoryById[id].territorio_nombre,current,scenario,delta:scenario-current,population:populationTotal,source:[...sources].join(' / ')};}).sort((a,b)=>a.delta-b.delta||a.name.localeCompare(b.name,'es'));
}
export function attendanceComparisonPanels(data,state){
  return ['INI','PRI','SEC','AGE18'].map(id=>({id,label:LEVEL_META[id].label,color:LEVEL_META[id].color,groups:LEVEL_GROUPS[id],rows:departmentAttendanceComparison(data,state,LEVEL_GROUPS[id]).sort((a,b)=>a.name.localeCompare(b.name,'es'))}));
}
export function departmentPressure(data,state,mode=state.capacityComparisonMode||'scenario'){
  const rows=projectedSections(data,state,{territory:'all',school:'all',mode}),base=projectedSections(data,state,{territory:'all',school:'all',mode,year:2024}),levels=['INI','PRI','SEC','AGE18'];
  const make=items=>{const v=Object.fromEntries(levels.map(l=>[l,0]));items.forEach(r=>v[r.grupo_tasa_id==='18_SEC'?'AGE18':r.nivel_id]+=r.carga_equivalente_proyectada);return v;};
  return Object.keys(data.territoryById).map(id=>{const values=make(rows.filter(r=>r.departamento_id===id)),baseValues=make(base.filter(r=>r.departamento_id===id)),total=Object.values(values).reduce((a,b)=>a+b,0),baseTotal=Object.values(baseValues).reduce((a,b)=>a+b,0);return{id,name:data.territoryById[id].territorio_nombre,values,total,variation:baseTotal?total/baseTotal-1:0};}).sort((a,b)=>b.total-a.total);
}
export function occupancyLabel(id){return OCCUPANCY_CATEGORIES.find(x=>x.id===id)?.label||occupancyStatus(0).label;}
