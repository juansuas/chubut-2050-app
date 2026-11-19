import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {renderProductiveScenario,scheduledProjects,departmentImpact} from '../assets/js/productive-scenario.js';

// Prueba de coordinación de la vista con el inventario real, sin motor de navegador.
const root=new URL('../',import.meta.url);
const html=await readFile(new URL('index.html',root),'utf8');
const nodes=new Map();
class Node {
  constructor(attributes={}){this.attributes={...attributes};this.id=attributes.id;this.dataset={};this.hidden='hidden' in attributes;this.innerHTML='';this.textContent='';this.style={setProperty(){}};this.handlers={};this.children=[];
    for(const [key,value] of Object.entries(attributes))if(key.startsWith('data-'))this.dataset[key.slice(5).replace(/-([a-z])/g,(_,x)=>x.toUpperCase())]=value;
  }
  setAttribute(key,value){this.attributes[key]=value;}
  getAttribute(key){return this.attributes[key];}
  hasAttribute(key){return key in this.attributes;}
  addEventListener(key,handler){this.handlers[key]=handler;}
  getBoundingClientRect(){return {height:140};}
  getClientRects(){return [];}
  contains(){return false;}
  closest(){return this;}
  focus(){document.activeElement=this;}
  querySelectorAll(selector){return this.children;}
  querySelector(selector){return selector==='.empty-chart'?(this.innerHTML.includes('empty-chart')?{}:null):context;}
}
for(const match of html.matchAll(/<\w+\b([^>]*\bid="[^"]+"[^>]*)>/g)){
  const attributes=Object.fromEntries([...match[1].matchAll(/([\w-]+)="([^"]*)"/g)].map(x=>[x[1],x[2]]));
  assert.ok(!nodes.has(attributes.id),`ID duplicado: ${attributes.id}`);
  nodes.set(attributes.id,new Node(attributes));
}
globalThis.document={activeElement:null,getElementById:id=>nodes.get(id)||null};
const rows=JSON.parse(await readFile(new URL('data/instalaciones_energeticas.geojson',root),'utf8')).features.map(f=>f.properties);
const a=rows.find(x=>x.nombre_instalacion==='P.E Aires de Manantiales'),b=rows.find(x=>x.nombre_instalacion==='Baggilt');
const selection={[a.instalacion_id]:2030,[b.instalacion_id]:2034},snapshot=JSON.stringify(selection);
const data={productionInstallations:rows,demographyPopulation:[]};
const state={scenarioProjects:selection,scenarioImpactYear:2030,scenarioProjectFilter:'all',scenarioExternalPercent:100,scenarioIncludeConstruction:true};
let result=renderProductiveScenario(data,state,{editorOnly:true});
assert.equal(result.scheduled.length,2);
assert.ok(nodes.get('scenario-projects').innerHTML.includes(a.nombre_instalacion));assert.ok(nodes.get('scenario-projects').innerHTML.includes(b.nombre_instalacion));
assert.ok(nodes.get('scenario-coefficients').innerHTML.includes('Eólica'));
renderProductiveScenario(data,{...state,scenarioPopulationDepartment:a.departamento_id},{editorOnly:true});
assert.ok(nodes.get('scenario-projects').innerHTML.includes(a.nombre_instalacion));assert.ok(!nodes.get('scenario-projects').innerHTML.includes(b.nombre_instalacion));
renderProductiveScenario(data,{...state,scenarioPopulationDepartment:a.departamento_id,scenarioProjectFilter:'HID'},{editorOnly:true});
assert.ok(nodes.get('scenario-projects').innerHTML.includes('No hay proyectos'));
assert.equal(JSON.stringify(selection),snapshot,'Filtrar no modifica la cartera');
renderProductiveScenario(data,{...state,scenarioProjectFilter:'TER'},{editorOnly:true});
assert.ok(nodes.get('scenario-projects').innerHTML.includes('data-inventory-activity="TER"'));
renderProductiveScenario(data,{...state,scenarioProjects:{}},{editorOnly:true});assert.equal(nodes.get('scenario-clear-changes').disabled,true);
assert.equal(scheduledProjects(rows,selection).length,2);
console.log('INTERFAZ OK: editor y coeficientes trasladados a Escenarios, filtros sin pérdida de selección y cartera vacía.');
