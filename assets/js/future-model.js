import {scenarioOptions} from './scenario-population.js?v=2.29.0';
import {scheduledProjects,projectImpact,populationImpactSeries,IMPACT} from './productive-scenario.js?v=2.29.0';
import {educationImpact} from './migration-education.js?v=2.29.0';
import {currentRate,parameterRate} from './scenario-model.js?v=2.29.0';

export const FUTURE_LEVELS=[['INI','Inicial'],['PRI','Primario'],['SEC','Secundario 12–17'],['AGE18','Secundario 18 años']];
const emptyLevels=()=>Object.fromEntries(FUTURE_LEVELS.map(([key])=>[key,0]));
const sum=values=>Object.values(values).reduce((total,value)=>total+value,0);
const groupForAge=age=>age<=3?'0_3':age<=5?'4_5':age<=11?'6_11':age<=14?'12_14':age<=17?'15_17':'18_SEC';
const levelForAge=age=>age<=5?'INI':age<=11?'PRI':age<=17?'SEC':'AGE18';

export function buildFutureModel(data,state=null){
  const config=data.futurePresets,years=Array.from({length:state?29:25},(_,i)=>(state?2022:2026)+i);
  const ids=Object.keys(data.territoryById),rows=data.productionInstallations;
  const annual=Object.fromEntries(years.map(year=>[year,{population:0,levels:emptyLevels(),education:0}]));
  const rate=(id,group,sex)=>{
    const value=state?parameterRate(data,state,id,group,sex):currentRate(data,id,group,sex).tasa_asistencia;
    if(!Number.isFinite(value))throw new Error(`Falta tasa de asistencia: ${id}, ${group}, ${sex}.`);
    return value;
  };
  for(const row of data.demographyPopulation){
    if(!annual[row.year])continue;
    annual[row.year].population+=row.poblacion;
    if(row.edad<=18)annual[row.year].levels[levelForAge(row.edad)]+=row.poblacion*rate(row.territorio_id,groupForAge(row.edad),row.sexo);
  }
  for(const point of Object.values(annual))point.education=sum(point.levels);
  const installed=rows.filter(row=>row.estado_id==='OPERATIVO').reduce((total,row)=>total+(row.capacidad_instalada_mw??0),0);
  const portfolio=rows.filter(row=>row.estado_id==='PROYECTADO'&&!row.nota_conciliacion).reduce((total,row)=>total+(row.potencia_declarada_proyecto_mw??0),0);
  if(Math.abs(portfolio-config.cartera_mw)>1e-6)throw new Error('La cartera cambió: revisar los escenarios prefijados antes de usarlos.');
  const scenarios={};
  for(const key of [...(state?['tendencial']:[]),'moderado','intensivo','total',...(state?.activeScenario==='personalizado'?['personalizado']:[])]){
    const selection=key==='personalizado'?state.scenarioProjects:config.selecciones[key],projects=scheduledProjects(rows,selection);
    const parameters=key==='personalizado'?scenarioOptions(data,state):config.parametros;
    if(projects.length!==Object.keys(selection).length)throw new Error(`Hay proyectos inválidos en el escenario ${key}.`);
    for(const project of projects)if(!IMPACT[project.tecnologia_impacto_id])throw new Error(`Faltan coeficientes para ${project.nombre_instalacion}.`);
    const educationSeries=years.map(year=>{
      const levels=educationImpact(year<2026?[]:projects,'all',year,parameters,data.migrationProfiles.confluencia,rate);
      return {year,levels,additional:sum(levels),base:annual[year].education,total:annual[year].education+sum(levels)};
    });
    const departments=Object.fromEntries(ids.map(id=>[id,sum(educationImpact(projects,id,2050,parameters,data.migrationProfiles.confluencia,rate))]));
    const population=populationImpactSeries(projects,'all',parameters);
    const energy=projects.reduce((total,project)=>total+project.potencia_declarada_proyecto_mw,0);
    const peak=Math.max(...educationSeries.map(row=>row.additional));
    scenarios[key]={parameters,projects,educationSeries,departments,energy,fraction:energy/portfolio,
      people:population.at(-1).total,education:educationSeries.at(-1).additional,
      demand:educationSeries.at(-1).levels,
      peak:{value:peak,years:educationSeries.filter(row=>Math.abs(row.additional-peak)<1e-7).map(row=>row.year)},
      calendar:projects.map(project=>({...project,startYear:project.operationYear-Math.ceil(IMPACT[project.tecnologia_impacto_id].years)})).sort((a,b)=>a.operationYear-b.operationYear||a.nombre_instalacion.localeCompare(b.nombre_instalacion,'es'))};
    // The final population is the operational phase; temporary construction has ended.
    const final=projects.map(project=>projectImpact(project,2050,parameters));
    if(key!=='personalizado'&&final.some(row=>row.buildJobs>0))throw new Error('El calendario deja obras pendientes después del horizonte 2050.');
  }
  for(const [id,year] of Object.entries(config.selecciones.moderado))if(config.selecciones.intensivo[id]!==year)throw new Error('Los proyectos comunes deben mantener su calendario.');
  const eligible=rows.filter(row=>row.estado_id==='PROYECTADO'&&!row.nota_conciliacion);
  if(scenarios.total.projects.length!==eligible.length||eligible.some(row=>!Object.hasOwn(config.selecciones.total,row.instalacion_id)))throw new Error('Total debe incorporar toda la cartera habilitada.');
  for(const [id,year] of Object.entries(config.selecciones.intensivo))if(config.selecciones.total[id]!==year)throw new Error('Total debe conservar las fechas de Intensivo.');
  return {annual,installed,portfolio,scenarios,config};
}
