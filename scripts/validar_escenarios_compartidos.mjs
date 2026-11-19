import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {buildFutureTerritories} from '../assets/js/future-territories.js?v=2.29.0';
import {scenarioPopulation,presetPatch} from '../assets/js/scenario-population.js?v=2.29.0';
import {capacityComparison,potentialDemandSeries} from '../assets/js/scenario-model.js?v=2.29.0';
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
  departmentBoundaries:boundaries,productionInstallations:installations.features.map(f=>f.properties),migrationProfiles:profiles,futurePresets:presets,
  demographyPopulation:csv(population).map(r=>({territorio_id:r.departamento_id,year:Number(r.year),edad:Number(r.edad),sexo:r.sexo_id,poblacion:Number(r.poblacion)})),
  attendanceRates:csv(rates).map(r=>({...r,tasa_asistencia:r.tasa_asistencia===''?null:Number(r.tasa_asistencia)}))};

data.capacitySections=csv(await readFile(new URL('secciones_capacidad_2024.csv',root),'utf8')).map(r=>({...r,matricula_actual:Number(r.matricula_actual),matricula_varones_actual:Number(r.matricula_varones_actual),matricula_mujeres_actual:Number(r.matricula_mujeres_actual),capacidad:Number(r.capacidad)}));
const base={year:2050,territory:'all',sex:'all',educationSelection:'all',capacitySchool:'all',capacityMode:'scenario',capacityRates:{},capacityRateProgress:{}};
const close=(a,b,message)=>assert.ok(Math.abs(a-b)<1e-6,`${message}: ${a} != ${b}`);
let capacity;
for(const key of ['tendencial','moderado','intensivo','total']){
 const state={...base,...presetPatch(data,key)},model=buildFutureTerritories(data,state),rows=scenarioPopulation(data,state).rows;
 for(const year of [2024,2038,2048,2050]){
  const current={...state,year};const result=capacityComparison(data,current);
  capacity??=result.current.capacity;assert.equal(result.current.capacity,capacity,'Capacidad fija entre años y escenarios');
  assert.equal(result.current.sections,7612);assert.equal(new Set(result.scenario.map(r=>r.seccion_id)).size,7612);
  close(rows.filter(r=>r.year===year).reduce((s,r)=>s+r.poblacion,0),model.scenarios[key].territories.all.series.find(r=>r.year===year).people,'Población adicional entre módulos');
  const demand=potentialDemandSeries(data,{...current,capacityTrendView:'level'}).reduce((s,r)=>s+r.scenario.find(p=>p.year===year).demand,0);
  close(demand,model.scenarios[key].territories.all.series.find(r=>r.year===year).educationTotal,'Demanda educativa entre módulos');
  assert.ok(result.current.load>=result.withoutProjects.load-1e-7,'Los proyectos no reducen demanda frente a idénticas tasas');
  if(key==='tendencial')close(result.current.load,result.withoutProjects.load,'Tendencial sin efecto de proyectos');
 }
 const stateRates={...state,capacityRateProgress:{'0_3':.5,'4_5':.5,'6_11':.5,'12_14':.5,'15_17':.5,'18_SEC':.5}};
 const raised=capacityComparison(data,stateRates),normal=capacityComparison(data,state);
 assert.equal(raised.current.capacity,capacity);assert.ok(raised.current.load>=normal.current.load);
 const raisedModel=buildFutureTerritories(data,stateRates);
 close(potentialDemandSeries(data,{...stateRates,capacityTrendView:'level'}).reduce((sum,r)=>sum+r.scenario.find(p=>p.year===2050).demand,0),raisedModel.scenarios[key].territories.all.final.educationTotal,'Tasas compartidas');
 const secondary=capacityComparison(data,state,{level:'SEC'});
 assert.equal(secondary.current.sections,2700,'Secundario incluye 18 años exactamente una vez');
}
const custom={...base,activeScenario:'personalizado',scenarioProjects:{[data.productionInstallations.find(r=>r.tecnologia_impacto_id==='HID_GRANDE'&&r.estado_id==='PROYECTADO').instalacion_id]:2026},scenarioIncludeConstruction:true,scenarioIncludeRelated:true,scenarioIncludePeople:true,scenarioExternalPercent:100};
assert.ok(scenarioPopulation(data,custom).rows.every(r=>r.year>=2026),'Los escenarios preservan la referencia histórica anterior a 2026');
const customModel=buildFutureTerritories(data,custom);
assert.equal(customModel.scenarios.personalizado.territories.all.series.find(r=>r.year===2024).people,0);
assert.equal(capacityComparison(data,{...base,...presetPatch(data,'total'),capacityThresholds:{INI:60,PRI:60,SEC:60}}).current.capacity,capacity,'La capacidad actual no cambia con parámetros antiguos guardados');
const storage=new Map();globalThis.localStorage={getItem:k=>storage.get(k)||null,setItem:(k,v)=>storage.set(k,v)};globalThis.location={hash:'#escenarios'};
const {getState,setState}=await import('../assets/js/state.js?v=2.29.0');
setState({...presetPatch(data,'total'),year:2048,territory:'26007'});
for(const module of ['demografia','oferta','productivos','escenarios']){
 setState({module});const state=getState();assert.equal(state.activeScenario,'total');assert.equal(state.year,2048);assert.equal(state.demographyYear,2048);assert.equal(state.capacityYear,2048);assert.equal(state.scenarioImpactYear,2048);assert.equal(state.scenarioPopulationDepartment,'26007');
}
console.log('INTEGRACIÓN OK: cuatro escenarios, años y territorio compartidos, población y demanda coherentes entre módulos, capacidad fija, asistencia editable, Secundario sin duplicaciones.');
