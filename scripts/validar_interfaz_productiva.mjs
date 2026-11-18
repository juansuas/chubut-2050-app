import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {renderProductiveScenario,scheduledProjects,departmentImpact} from '../assets/js/productive-scenario.js';
import {initProductionWorkspace,syncProductionWorkspace,productionView} from '../assets/js/production-workspace.js';

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
const context=new Node(),header=new Node(),results=new Node();
const groups=['productionTab','resultTab'].map(key=>{const list=new Node();list.children=[...nodes.values()].filter(x=>key in x.dataset);return list;});
globalThis.document={
  activeElement:null,
  getElementById:id=>{assert.ok(nodes.has(id),`Falta ${id}`);return nodes.get(id);},
  querySelector:selector=>selector==='.site-header'?header:results,
  querySelectorAll:selector=>selector==='[data-production-tab]'?groups[0].children:selector==='[data-result-tab]'?groups[1].children:selector.includes('[role="tablist"]')?groups:[]
};
globalThis.ResizeObserver=class{observe(){}};
globalThis.requestAnimationFrame=callback=>callback();
const saved=new Map();
globalThis.sessionStorage={getItem:key=>saved.get(key),setItem:(key,value)=>saved.set(key,value)};
const plots=new Map();
globalThis.Plotly={react:(el,traces,layout)=>{el.data=traces;plots.set(el.id,{traces,layout});},purge:el=>{el.data=null;},Plots:{resize(){}}};

let changes=0;initProductionWorkspace(()=>changes++);
assert.equal(productionView(),'projects');
assert.equal(nodes.get('production-inventory-view').hidden,true);
groups[0].handlers.click({target:nodes.get('production-tab-inventory')});
assert.equal(productionView(),'inventory');
assert.equal(nodes.get('production-inventory-analysis').hidden,false);
assert.equal(results.hidden,true);
assert.equal(changes,1);
groups[0].handlers.click({target:nodes.get('production-tab-projects')});
groups[1].handlers.click({target:nodes.get('production-tab-population')});
assert.equal(nodes.get('production-population-results').hidden,false);
assert.equal(nodes.get('production-energy-results').hidden,true);
document.activeElement=nodes.get('production-tab-population');
groups[1].handlers.keydown({key:'ArrowRight',preventDefault(){}});
assert.equal(nodes.get('production-education-results').hidden,false);
assert.equal(document.activeElement,nodes.get('production-tab-education'));
syncProductionWorkspace();
assert.equal(nodes.get('production-tab-education').getAttribute('aria-selected'),'true');

const rows=JSON.parse(await readFile(new URL('data/instalaciones_energeticas.geojson',root),'utf8')).features.map(f=>f.properties);
const a=rows.find(x=>x.nombre_instalacion==='P.E Aires de Manantiales');
const b=rows.find(x=>x.nombre_instalacion==='Baggilt');
const selection={[a.instalacion_id]:2030,[b.instalacion_id]:2034};
const snapshot=JSON.stringify(selection);
const data={productionInstallations:rows,demographyPopulation:[]};
for(const project of [a,b])for(let year=2026;year<=2050;year++)data.demographyPopulation.push({territorio_id:project.departamento_id,year,poblacion:1000});
const state={scenarioProjects:selection,scenarioImpactYear:2030,scenarioProjectFilter:'all',scenarioExternalPercent:100,scenarioIncludeConstruction:true};
let result=renderProductiveScenario(data,state);
assert.equal(result.scheduled.length,2);
assert.ok(nodes.get('scenario-projects').innerHTML.includes(a.nombre_instalacion));
assert.ok(nodes.get('scenario-projects').innerHTML.includes(b.nombre_instalacion));
const all=departmentImpact(rows,selection,2030,{includeConstruction:true,includeRelated:true,includePeople:true,externalShare:1});
assert.equal(plots.get('scenario-capacity-chart').traces[1].x.reduce((x,y)=>x+y,0),all.reduce((x,y)=>x+y.addedMw,0));
result=renderProductiveScenario(data,{...state,scenarioPopulationDepartment:a.departamento_id});
assert.equal(result.departmentId,a.departamento_id);
assert.equal(result.scheduled.length,2,'Cambiar de territorio debe preservar todo el escenario');
assert.ok(!nodes.get('scenario-projects').innerHTML.includes(b.nombre_instalacion));
assert.ok(nodes.get('scenario-selection-note').textContent.includes('1 fuera de este territorio'));
assert.deepEqual(plots.get('scenario-capacity-chart').traces[1].x,[20]);
assert.deepEqual(plots.get('scenario-jobs-chart').traces[0].x,[6]);
assert.ok(nodes.get('scenario-product-table').innerHTML.includes(a.departamento_nombre));
assert.ok(!nodes.get('scenario-product-table').innerHTML.includes(b.departamento_nombre));
renderProductiveScenario(data,{...state,scenarioPopulationDepartment:a.departamento_id,scenarioProjectFilter:'HID'});
assert.ok(nodes.get('scenario-projects').innerHTML.includes('No hay proyectos'));
assert.deepEqual(plots.get('scenario-capacity-chart').traces[1].x,[20],'Filtrar el catálogo no debe cambiar los resultados');
assert.equal(JSON.stringify(selection),snapshot);
renderProductiveScenario(data,{...state,scenarioProjectFilter:'TER'});
assert.ok(nodes.get('scenario-projects').innerHTML.includes('La cartera auditada no incluye proyectos térmicos'));
assert.ok(nodes.get('scenario-projects').innerHTML.includes('data-inventory-activity="TER"'));
assert.equal(rows.filter(row=>row.actividad_id==='TER').length,45);
renderProductiveScenario(data,{...state,scenarioPopulationDepartment:'sin-proyectos'});
assert.equal(nodes.get('scenario-results-empty').hidden,false);
renderProductiveScenario(data,{...state,scenarioProjects:{}});
assert.equal(scheduledProjects(rows,selection).length,2);
assert.ok(nodes.get('scenario-summary').innerHTML.includes('0'));
assert.equal(nodes.get('scenario-clear-changes').disabled,true);
console.log('INTERFAZ PRODUCTIVA OK: pestañas, teclado, territorio común, catálogo filtrado sin pérdida de selección, resultados del modelo y estados vacíos.');
