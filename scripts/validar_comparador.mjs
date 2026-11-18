import {buildFutureTerritories,futurePhase} from '../assets/js/future-territories.js';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildFutureModel} from '../assets/js/future-model.js';
const root=new URL('../data/',import.meta.url);
const json=async name=>JSON.parse(await readFile(new URL(name,root),'utf8'));
function csv(text){
  const rows=[];let row=[],field='',quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(c==='"'){if(quoted&&text[i+1]==='"'){field+='"';i++;}else quoted=!quoted;}
    else if(c===','&&!quoted){row.push(field);field='';}
    else if(c==='\n'&&!quoted){row.push(field.replace(/\r$/,''));if(row.some(Boolean))rows.push(row);row=[];field='';}
    else field+=c;
  }
  if(field||row.length){row.push(field);rows.push(row);}
  const headers=rows.shift().map(key=>key.replace(/^\ufeff/,''));
  return rows.map(values=>Object.fromEntries(headers.map((key,i)=>[key,values[i]])));
}
const [boundaries,installations,profiles,presets,population,rates]=await Promise.all([
  json('departamentos_chubut.geojson'),json('instalaciones_energeticas.geojson'),json('perfiles_migrantes.json'),json('escenarios_futuro.json'),
  readFile(new URL('poblacion_demografica.csv',root),'utf8'),readFile(new URL('tasas_asistencia_grupo.csv',root),'utf8')
]);
const data={territoryById:Object.fromEntries(boundaries.features.map(f=>[String(f.properties.territorio_id),f.properties])),
  productionInstallations:installations.features.map(f=>f.properties),migrationProfiles:profiles,futurePresets:presets,
  demographyPopulation:csv(population).map(r=>({territorio_id:r.departamento_id,year:Number(r.year),edad:Number(r.edad),sexo:r.sexo_id,poblacion:Number(r.poblacion)})),
  attendanceRates:csv(rates).map(r=>({...r,tasa_asistencia:r.tasa_asistencia===''?null:Number(r.tasa_asistencia)}))};

import {comparisonSeries,comparisonMetric,comparisonDifference,comparisonMaximum} from '../assets/js/comparator-model.js';
const model=buildFutureTerritories(data),before=JSON.stringify(model);
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
const a=comparisonSeries(model,'moderado','all').at(-1),b=comparisonSeries(model,'intensivo','all').at(-1);
const diff=comparisonDifference(a,b);
near(diff.mw,494);near(diff.education,90.2359769547956);
const reverse=comparisonDifference(b,a);for(const key of Object.keys(diff))near(diff[key],-reverse[key]);
assert.deepEqual(comparisonDifference(a,a),{mw:0,people:0,education:0});
for(const scenario of ['tendencial','moderado','intensivo','total'])for(const year of model.years){
 const provincial=comparisonSeries(model,scenario,'all').find(r=>r.year===year);
 const local=model.ids.map(id=>comparisonSeries(model,scenario,id).find(r=>r.year===year));
 for(const key of ['populationTotal','educationTotal','addedMw'])near(local.reduce((sum,r)=>sum+r[key],0),provincial[key]);
 if(scenario==='tendencial'){near(provincial.people,0);near(provincial.education,0);near(provincial.addedMw,0);near(provincial.populationTotal,provincial.base.population);}
}
for(const metric of ['mw','population','education'])for(const level of ['all','INI','PRI','SEC','AGE18']){
 const maximum=comparisonMaximum(model,metric,level);
 for(const scenario of ['tendencial','moderado','intensivo','total'])for(const id of model.ids)for(const row of comparisonSeries(model,scenario,id))assert.ok(comparisonMetric(row,metric,level)<=maximum+1e-7);
}
for(const project of model.scenarios.intensivo.territories.all.projects){
 const scope=model.scenarios.intensivo.territories[project.departamento_id];
 const previous=scope.series.find(r=>r.year===project.operationYear-1),online=scope.series.find(r=>r.year===project.operationYear);
 const entering=scope.projects.filter(p=>p.operationYear===project.operationYear).reduce((sum,p)=>sum+p.potencia_declarada_proyecto_mw,0);
 near(online.addedMw-previous.addedMw,entering);
}
assert.equal(JSON.stringify(model),before);
console.log('COMPARADOR OK: referencia tendencial, diferencias B-A, identidad, simetría, sumas territoriales, escalas comunes, MW por fecha y modelo preservado.');
