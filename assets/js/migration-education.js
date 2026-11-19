import {currentRate,parameterRate} from './scenario-model.js?v=2.30.0';
import {IMPACT,projectImpact} from './productive-scenario.js?v=2.30.0';

export const EDUCATION_LEVELS=[
  ['INI','Inicial'],['PRI','Primario'],['SEC','Secundario (12–17)'],['AGE18','Secundario (18 años)']
];

function educationGroup(age){
  if(age<=3)return ['INI','0_3'];
  if(age<=5)return ['INI','4_5'];
  if(age<=11)return ['PRI','6_11'];
  if(age<=14)return ['SEC','12_14'];
  if(age<=17)return ['SEC','15_17'];
  if(age===18)return ['AGE18','18_SEC'];
  return null;
}

export function educationImpact(projects,departmentId,year,options,profile,rateFor){
  const result=Object.fromEntries(EDUCATION_LEVELS.map(([id])=>[id,0]));
  for(const project of projects){
    if(departmentId!=='all'&&project.departamento_id!==departmentId)continue;
    const impact=projectImpact(project,year,options);
    if(!impact.impactKnown)continue;
    const population=impact.operatePeople+impact.buildPeople;
    if(!population)continue;
    const arrival=impact.buildPeople>0
      ?project.operationYear-Math.ceil(IMPACT[project.tecnologia_impacto_id].years)
      :project.operationYear;
    for(const {edad,sexo,peso} of profile.edades){
      const group=educationGroup(edad+year-arrival);
      if(!group)continue;
      const [level,ageGroup]=group;
      result[level]+=population*peso*rateFor(project.departamento_id,ageGroup,sexo);
    }
  }
  return result;
}

const decimal=value=>value.toLocaleString('es-AR',{maximumFractionDigits:1});

export function renderMigrationEducation(data,projects,departmentId,year,options,state=null){
  const section=document.getElementById('scenario-education-comparison');
  section.hidden=!options.includePeople;
  if(section.hidden)return;
  const profiles=[data.migrationProfiles.confluencia];
  const rate=(department,group,sex)=>state?parameterRate(data,state,department,group,sex):currentRate(data,department,group,sex).tasa_asistencia;
  const estimate=profile=>educationImpact(projects,departmentId,year,options,profile,rate);
  const estimates=profiles.map(estimate);
  const row=(label,values)=>
    `<tr><th scope="row">${label}</th>${values.map(value=>`<td class="number">${decimal(value)}</td>`).join('')}</tr>`;
  const sum=values=>Object.values(values).reduce((total,value)=>total+value,0);
  document.getElementById('scenario-education-comparison-table').innerHTML=
    EDUCATION_LEVELS.map(([id,label])=>row(label,estimates.map(result=>result[id]))).join('')+
    row('Total',estimates.map(sum));
  const ranges=profiles.map(profile=>{
    const values=Object.values(profile.sensibilidad).map(variant=>estimate(variant).INI);
    return `${profile.nombre}, de ${decimal(Math.min(...values))} a ${decimal(Math.max(...values))}`;
  });
  document.getElementById('scenario-education-sensitivity').textContent=
    `Demanda adicional en Inicial en ${year} al variar ±25 % la estimación de menores de 5 al ingreso: ${ranges.join(' · ')}.`;
}
