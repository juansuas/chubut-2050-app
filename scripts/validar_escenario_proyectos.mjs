import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {readFile} from 'node:fs/promises';
import {scheduledProjects,departmentImpact,projectImpact,populationImpactSeries,IMPACT} from '../assets/js/productive-scenario.js';

const root=new URL('../',import.meta.url);
const rows=JSON.parse(await readFile(new URL('data/instalaciones_energeticas.geojson',root),'utf8')).features.map(f=>f.properties);
assert.equal(rows.length,92);
assert.equal(rows.filter(r=>r.estado_id==='PROYECTADO').length,22);
assert.ok(rows.filter(r=>r.estado_id!=='OPERATIVO').every(r=>r.capacidad_instalada_mw===null));
assert.ok(rows.filter(r=>r.estado_id==='OPERATIVO').every(r=>r.capacidad_instalada_mw>0));
const project=rows.find(r=>r.nombre_instalacion==='P.E Aires de Manantiales');
const frontera=rows.find(r=>r.nombre_instalacion==='Frontera II');
const aluar=rows.find(r=>r.nombre_instalacion==='Parque Eólico Aluar – Etapa II');
assert.equal(frontera.potencia_declarada_proyecto_mw,80);
assert.equal(frontera.fuente_potencia_proyecto_id,'PLAHE_FRONTERA');
assert.equal(aluar.potencia_declarada_proyecto_mw,96);
assert.equal(scheduledProjects(rows,{[frontera.instalacion_id]:2030,[aluar.instalacion_id]:2030}).length,2);
const b=rows.find(r=>r.nombre_instalacion==='Baggilt');
const selection={[project.instalacion_id]:2032,[b.instalacion_id]:2034};
const scheduled=scheduledProjects(rows,selection);
assert.equal(scheduled.length,2);
const expected=(actual,value)=>assert.ok(Math.abs(actual-value)<1e-8,actual+' != '+value);
const p=scheduled.find(r=>r.instalacion_id===project.instalacion_id);
const construction={includeConstruction:true};
assert.equal(projectImpact(p,2030).buildJobs,0);
assert.equal(projectImpact(p,2029,construction).buildJobs,0);
expected(projectImpact(p,2030,construction).buildJobs,58);
expected(projectImpact(p,2030,construction).buildRelated,93.786);
expected(projectImpact(p,2030,{...construction,includeRelated:false}).buildPeople,58*3.093*0.31);
expected(projectImpact(p,2031,construction).buildJobs,58);
expected(projectImpact(p,2031,construction).buildPeople,58*2.617*3.093*0.31);
assert.equal(projectImpact(p,2031).mw,0);
expected(projectImpact(p,2032).operatePeople,6*2.617*3.093*0.31);
assert.equal(projectImpact(p,2032).mw,20);
const withoutPeople=projectImpact(p,2032,{includePeople:false});
assert.equal(withoutPeople.operatePeople,0);
expected(withoutPeople.operateRelated,9.702);
assert.equal(projectImpact(p,2031,{...construction,includePeople:false}).buildPeople,0);
const withoutRelated=projectImpact(p,2032,{includeRelated:false});
assert.equal(withoutRelated.operateRelated,0);
expected(withoutRelated.operatePeople,6*3.093*0.31);
assert.equal(projectImpact(p,2032,construction).buildJobs,0);
assert.equal(departmentImpact(rows,selection,2034).find(r=>r.department==='Futaleufú').addedMw,5);
assert.equal(projectImpact({...p,tecnologia_impacto_id:'TER_CC'},2032).operateJobs,2.4);
assert.equal(Object.keys(IMPACT).length,4);
const provincial=populationImpactSeries(scheduled,'all',construction);
const escalante=populationImpactSeries(scheduled,project.departamento_id,construction);
const futaleufu=populationImpactSeries(scheduled,b.departamento_id,construction);
const at=(series,year)=>series.find(point=>point.year===year);
expected(at(escalante,2030).construction,58*2.617*3.093*0.31);
expected(at(escalante,2032).construction,0);
expected(at(escalante,2032).operation,6*2.617*3.093*0.31);
expected(at(provincial,2032).total,at(escalante,2032).total+at(futaleufu,2032).total);
assert.ok(at(provincial,2032).construction>0);
assert.ok(populationImpactSeries(scheduled,'all',{includePeople:false}).every(point=>point.total===0));
console.log('MODELO Y DATOS OK');


for(const technology of Object.keys(IMPACT)){
 const sample={...p,tecnologia_impacto_id:technology};
 const full=projectImpact(sample,2032);
 for(const externalShare of [0,0.25,0.5,1]){
  const part=projectImpact(sample,2032,{externalShare});
  expected(part.operatePeople,full.operatePeople*externalShare);
  expected(part.operateJobs,full.operateJobs);
  expected(part.operateRelated,full.operateRelated);
  const building=projectImpact(sample,2031,{...construction,externalShare});
  expected(building.buildPeople,projectImpact(sample,2031,construction).buildPeople*externalShare);
 }
}
assert.throws(()=>projectImpact(p,2032,{externalShare:1.1}),RangeError);
const profiles=JSON.parse(await readFile(new URL('data/perfiles_migrantes.json',root),'utf8'));
assert.deepEqual(Object.keys(profiles),['confluencia']);
const {educationImpact}=await import('../assets/js/migration-education.js');
const fullDemand=educationImpact(scheduled,'all',2034,{},profiles.confluencia,()=>1);
const halfDemand=educationImpact(scheduled,'all',2034,{externalShare:0.5},profiles.confluencia,()=>1);
for(const level of Object.keys(fullDemand))expected(halfDemand[level],fullDemand[level]*0.5);
console.log('PROPORCION EXTRAPROVINCIAL Y EDUCACION OK');
