import {buildFutureModel,FUTURE_LEVELS} from './future-model.js?v=2.17.0';
import {educationImpact} from './migration-education.js?v=2.15.0';
import {projectImpact,IMPACT} from './productive-scenario.js?v=2.16.0';
import {currentRate} from './scenario-model.js';

export {FUTURE_LEVELS};
const levels=()=>Object.fromEntries(FUTURE_LEVELS.map(([key])=>[key,0]));
const sum=value=>Object.values(value).reduce((a,b)=>a+b,0);
const add=(a,b)=>Object.fromEntries(FUTURE_LEVELS.map(([key])=>[key,a[key]+b[key]]));
const group=age=>age<=3?'0_3':age<=5?'4_5':age<=11?'6_11':age<=14?'12_14':age<=17?'15_17':'18_SEC';
const level=age=>age<=5?'INI':age<=11?'PRI':age<=17?'SEC':'AGE18';
export const futurePhase=(project,year)=>year>=project.operationYear?'operation':year>=project.startYear?'construction':'planned';

export function buildFutureTerritories(data){
  const original=buildFutureModel(data),years=Object.keys(original.annual).map(Number);
  const ids=Object.keys(data.territoryById),scopes=['all',...ids];
  const bases=Object.fromEntries(scopes.map(id=>[id,Object.fromEntries(years.map(year=>[year,{population:0,education:0,levels:levels(),ages:levels()}]))]));
  for(const row of data.demographyPopulation){
    if(!bases.all[row.year])continue;
    for(const id of ['all',row.territorio_id]){
      const point=bases[id][row.year];point.population+=row.poblacion;
      if(row.edad<=18){
        const key=level(row.edad),rate=currentRate(data,row.territorio_id,group(row.edad),row.sexo).tasa_asistencia;
        if(!Number.isFinite(rate))throw new Error('Falta una tasa de asistencia para el escenario.');
        point.ages[key]+=row.poblacion;point.levels[key]+=row.poblacion*rate;
      }
    }
  }
  for(const scope of Object.values(bases))for(const point of Object.values(scope))point.education=sum(point.levels);
  const scenarios={};
  const rate=(id,groupId,sex)=>currentRate(data,id,groupId,sex).tasa_asistencia;
  for(const [key,scenario] of Object.entries(original.scenarios)){
    const calendar=scenario.projects.map(project=>({...project,startYear:project.operationYear-Math.ceil(IMPACT[project.tecnologia_impacto_id].years)}));
    const territories={};
    for(const id of scopes){
      const projects=calendar.filter(project=>id==='all'||project.departamento_id===id);
      const series=years.map(year=>{
        const base=bases[id][year],educationLevels=educationImpact(projects,id,year,original.config.parametros,data.migrationProfiles.confluencia,rate);
        // Same cohort ageing and phase rules; unit attendance recovers school-age population.
        const ageLevels=educationImpact(projects,id,year,original.config.parametros,data.migrationProfiles.confluencia,()=>1);
        const phases=projects.map(project=>projectImpact(project,year,original.config.parametros));
        const total=field=>phases.reduce((a,b)=>a+(b[field]??0),0);
        const education=sum(educationLevels),people=total('buildPeople')+total('operatePeople');
        return {year,base,educationLevels,ageLevels,education,people,constructionPeople:total('buildPeople'),operationPeople:total('operatePeople'),
          educationTotal:base.education+education,populationTotal:base.population+people,
          scenarioLevels:add(base.levels,educationLevels),scenarioAges:add(base.ages,ageLevels),
          addedMw:total('mw'),directConstruction:total('buildJobs'),directOperation:total('operateJobs'),
          relative:base.education>0?education/base.education:null};
      });
      const maximum=Math.max(...series.map(point=>point.education));
      const peak=series.find(point=>Math.abs(point.education-maximum)<1e-7);
      const events=new Map();
      for(const project of projects)for(const [year,phase] of [[project.startYear,'construction'],[project.operationYear,'operation']]){
        if(!events.has(year))events.set(year,[]);
        events.get(year).push({project,phase});
      }
      territories[id]={projects,series,peak,final:series.at(-1),events:[...events.entries()].sort((a,b)=>a[0]-b[0]).map(([year,items])=>({year,items}))};
    }
    scenarios[key]={...scenario,territories};
  }
  return {...original,bases,years,ids,scenarios};
}
