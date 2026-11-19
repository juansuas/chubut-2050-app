import {scheduledProjects,projectImpact,IMPACT} from './productive-scenario.js?v=2.30.0';

export const SCENARIO_NAMES={tendencial:'Tendencial',moderado:'Moderado',intensivo:'Intensivo',total:'Total',personalizado:'Personalizado'};
export function scenarioOptions(data,state){
  return state.activeScenario==='personalizado'
    ?{includeConstruction:state.scenarioIncludeConstruction,includeRelated:state.scenarioIncludeRelated,includePeople:state.scenarioIncludePeople,externalShare:state.scenarioExternalPercent/100}
    :data.futurePresets?.parametros||{};
}
export function scenarioProjects(data,state){
  const key=state.activeScenario||'tendencial';
  return scheduledProjects(data.productionInstallations||[],key==='personalizado'?state.scenarioProjects:data.futurePresets?.selecciones[key]||{});
}
export function presetPatch(data,key){
  const p=data.futurePresets.parametros;
  return {activeScenario:key,capacityMode:'scenario',capacityComparisonMode:'scenario',scenarioProjects:{...data.futurePresets.selecciones[key]},scenarioIncludeConstruction:p.includeConstruction,
    scenarioIncludeRelated:p.includeRelated,scenarioIncludePeople:p.includePeople,scenarioExternalPercent:p.externalShare*100};
}
const caches=new WeakMap();
export function scenarioPopulation(data,state){
  const projects=scenarioProjects(data,state),options=scenarioOptions(data,state);
  const signature=JSON.stringify([state.activeScenario,projects.map(p=>[p.instalacion_id,p.operationYear]),options]);
  let cache=caches.get(data);
  if(cache?.signature===signature)return cache;
  const sums=new Map(),groups=new Map();
  for(const project of projects)for(let year=2026;year<=2050;year++){
    const impact=projectImpact(project,year,options),people=(impact.buildPeople||0)+(impact.operatePeople||0);
    if(!people)continue;
    const arrival=impact.buildPeople>0?project.operationYear-Math.ceil(IMPACT[project.tecnologia_impacto_id].years):project.operationYear;
    for(const {edad,sexo,peso} of data.migrationProfiles.confluencia.edades){
      const age=Math.min(100,edad+year-arrival),value=people*peso;
      const key=`${project.departamento_id}|${year}|${age}|${sexo}`;
      sums.set(key,(sums.get(key)||0)+value);
      if(age<=18){
        const group=age<=3?'0_3':age<=5?'4_5':age<=11?'6_11':age<=14?'12_14':age<=17?'15_17':'18_SEC';
        const k=`${project.departamento_id}|${year}|${group}|${sexo}`;
        groups.set(k,(groups.get(k)||0)+value);
      }
    }
  }
  const rows=[...sums].map(([key,poblacion])=>{const [territorio_id,year,edad,sexo]=key.split('|');return {territorio_id,territorio_nombre:data.territoryById[territorio_id].territorio_nombre,year:Number(year),edad:Number(edad),sexo,poblacion};});
  cache={signature,rows,groups,view:{...data,baselineDemographyPopulation:data.demographyPopulation,demographyPopulation:[...data.demographyPopulation,...rows],activeScenarioName:SCENARIO_NAMES[state.activeScenario]}};
  caches.set(data,cache);return cache;
}
export function additionalGroupPopulation(data,state,id,year,group,sex){
  const groups=scenarioPopulation(data,state).groups;
  return id==='all'?Object.keys(data.territoryById).reduce((sum,id)=>sum+(groups.get(`${id}|${year}|${group}|${sex}`)||0),0):groups.get(`${id}|${year}|${group}|${sex}`)||0;
}
