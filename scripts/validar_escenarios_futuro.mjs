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
const source=JSON.stringify(presets),model=buildFutureModel(data);
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
close(model.scenarios.moderado.energy,589.17);close(model.scenarios.intensivo.energy,1083.17);
assert.equal(model.scenarios.moderado.projects.length,14);assert.equal(model.scenarios.intensivo.projects.length,19);
assert.equal(model.annual[2050].population,634804);close(model.annual[2050].education,107001.74558805054);
close(model.scenarios.moderado.education,37.03190029960098);close(model.scenarios.intensivo.education,127.26787725439658);
for(const scenario of Object.values(model.scenarios)){
  close(Object.values(scenario.departments).reduce((a,b)=>a+b,0),scenario.education);
  close(Object.values(scenario.demand).reduce((a,b)=>a+b,0),scenario.education);
  for(const point of scenario.educationSeries){close(point.total-point.base,point.additional);close(point.base,model.annual[point.year].education);}
  assert.ok(scenario.peak.value>scenario.education);
}
assert.deepEqual(model.scenarios.moderado.peak.years,[2038]);assert.deepEqual(model.scenarios.intensivo.peak.years,[2046]);
assert.equal(JSON.stringify(presets),source,'Construir la vista no debe modificar los escenarios.');
const invalid=structuredClone(presets);invalid.selecciones.moderado['ID_NO_EXISTENTE']=2030;
assert.throws(()=>buildFutureModel({...data,futurePresets:invalid}),/inválidos/);
console.log('ESCENARIOS FUTURO OK: cartera, calendario, referencia fija, sumas territoriales y por nivel, 25 años y máximos educativos.');

const territorial=buildFutureTerritories(data);
for(const [name,scenario] of Object.entries(territorial.scenarios)){
 for(const year of territorial.years){
  const provincial=scenario.territories.all.series.find(row=>row.year===year);
  const local=territorial.ids.map(id=>scenario.territories[id].series.find(row=>row.year===year));
  close(local.reduce((a,b)=>a+b.education,0),provincial.education);
  close(local.reduce((a,b)=>a+b.people,0),provincial.people);
  close(local.reduce((a,b)=>a+b.base.population,0),provincial.base.population);
  close(Object.values(provincial.educationLevels).reduce((a,b)=>a+b,0),provincial.education);
  assert.ok(Object.values(provincial.ageLevels).reduce((a,b)=>a+b,0)<=provincial.people+1e-7);
 }
 close(scenario.territories.all.final.education,model.scenarios[name].education);
 for(const project of scenario.territories.all.projects){
  assert.equal(futurePhase(project,project.startYear-1),'planned');
  assert.equal(futurePhase(project,project.startYear),'construction');
  assert.equal(futurePhase(project,project.operationYear),'operation');
 }
}
const languineo=territorial.scenarios.intensivo.territories['26056'];
assert.equal(languineo.peak.year,2045);
close(languineo.peak.education,890.9948265791594);
close(languineo.peak.relative*100,210.4100011640297);
close(languineo.final.education,53.057682356275116);
for(const scope of Object.values(territorial.scenarios.intensivo.territories)){
 for(const row of scope.series){close(row.educationTotal-row.base.education,row.education);close(row.populationTotal-row.base.population,row.people);}
}
console.log('TERRITORIOS FUTURO OK: 25 años, sumas departamentales, población por edades, fases e hitos, máximo local y denominador del mismo año.');

const total=model.scenarios.total;
assert.equal(total.projects.length,22);close(total.energy,1635.17);close(total.fraction,1);
assert.deepEqual(new Set(total.projects.map(p=>p.instalacion_id)),new Set(data.productionInstallations.filter(r=>r.estado_id==='PROYECTADO'&&!r.nota_conciliacion).map(p=>p.instalacion_id)));
for(const [id,year] of Object.entries(presets.selecciones.intensivo))assert.equal(presets.selecciones.total[id],year);
const extras=total.projects.filter(p=>!Object.hasOwn(presets.selecciones.intensivo,p.instalacion_id));
assert.equal(extras.length,3);assert.ok(extras.every(p=>p.operationYear===2050));
close(extras.reduce((sum,p)=>sum+p.potencia_declarada_proyecto_mw,0),552);
const totalFinal=territorial.scenarios.total.territories.all.final;
close(totalFinal.addedMw,1635.17);close(totalFinal.constructionPeople,0);
assert.ok(territorial.scenarios.total.territories.all.projects.every(p=>p.operationYear<=2050));
const incomplete=structuredClone(presets);delete incomplete.selecciones.total[extras[0].instalacion_id];
assert.throws(()=>buildFutureModel({...data,futurePresets:incomplete}),/toda la cartera/);
console.log('TOTAL OK: 22 proyectos, 1.635,17 MW en operación en 2050, calendario anidado y tres incorporaciones de 552 MW.');
console.log(JSON.stringify({poblacion_adicional_2050:totalFinal.people,demanda_adicional_2050:totalFinal.education,maximo_educativo:total.peak}));
