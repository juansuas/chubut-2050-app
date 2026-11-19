import {capacityComparison,potentialDemandSeries,aggregateSchools} from './scenario-model.js?v=2.29.0';
import {renderCapacityMap} from './capacity-map.js?v=2.29.0';
import {getState,setState} from './state.js?v=2.29.0';
import {openFloatingPanel} from './floating-panels.js?v=2.29.0';
import {SCENARIO_NAMES,scenarioProjects} from './scenario-population.js?v=2.29.0';
import {fmt,pct} from './config.js?v=2.29.0';
const $=id=>document.getElementById(id),pp=new Intl.NumberFormat('es-AR',{maximumFractionDigits:2,signDisplay:'always'});
let ready=false,level='all',metric='occupancy',school='all',highlightProjects=false;
export function renderFutureCapacity(data,state){
 state={...state,sex:'all'};
 if(!ready){
  $('future-capacity-level').addEventListener('change',e=>{level=e.target.value;school='all';renderFutureCapacity(data,getState());});
  $('future-capacity-metric').addEventListener('change',e=>{metric=e.target.value;renderFutureCapacity(data,getState());});
  $('future-edit-rates').addEventListener('click',()=>openFloatingPanel('future-attendance-panel'));
  $('future-capacity-departments').addEventListener('click',e=>{const b=e.target.closest('[data-capacity-territory]');if(b)setState({territory:getState().territory===b.dataset.capacityTerritory?'all':b.dataset.capacityTerritory});});
  ready=true;
 }
 const result=capacityComparison(data,state,{level}),{current,withoutProjects,base}=result;
 const schools=aggregateSchools(result.scenario);$('future-capacity-map-note').textContent=`El mapa representa ${schools.filter(s=>Number.isFinite(s.lat)&&Number.isFinite(s.lng)).length} de ${schools.length} escuelas de la selección. Los registros sin coordenadas también se incluyen en los indicadores y la tabla.`;
 const selected=SCENARIO_NAMES[state.activeScenario],place=state.territory==='all'?'Toda la provincia':data.territoryById[state.territory].territorio_nombre;
 $('future-capacity-context').textContent=`${selected} · ${place} · ${state.year}. Se conserva la oferta registrada en 2024 y su capacidad de referencia.`;
 const pressure=(current.categories.ALTA_PRESION||0)+(current.categories.SATURADA||0);
 $('future-capacity-summary').innerHTML=[['Ocupación en 2024',pct.format(base.baseOccupancy)],['Sin proyectos · mismas tasas',pct.format(withoutProjects.occupancy)],[selected,pct.format(current.occupancy)],['Lugares disponibles estimados',fmt.format(current.availablePlaces)],['Cursos con alta presión o saturados',fmt.format(pressure)],['Capacidad actual de referencia',fmt.format(current.capacity)]].map(([title,value])=>`<article><span>${title}</span><strong>${current.sections?value:'Sin oferta registrada'}</strong></article>`).join('');
 const delta=(current.occupancy-base.baseOccupancy)*100,projectDelta=(current.occupancy-withoutProjects.occupancy)*100;
 $('future-capacity-story').textContent=current.sections?`En ${state.year}, la ocupación estimada ${delta<0?'bajaría':'aumentaría'} ${Math.abs(delta).toLocaleString('es-AR',{maximumFractionDigits:1})} puntos respecto de 2024. El efecto de los proyectos, comparando con las mismas tasas de asistencia, es de ${pp.format(projectDelta)} puntos. Los lugares disponibles y los cursos exigidos se cuentan por separado: pueden coexistir dentro del mismo departamento.`:'No hay oferta educativa registrada para esta selección. Esto no equivale a capacidad disponible.';
 const mapRows=result.reference;
 const projectDepartments=new Set(scenarioProjects(data,state).map(p=>String(p.departamento_id)));
 renderCapacityMap(data,{...state,capacitySchool:school},{id:'future-capacity-map',rows:result.scenario,referenceRows:mapRows,metric,projectHighlight:{departments:projectDepartments,enabled:highlightProjects,onToggle:()=>{highlightProjects=!highlightProjects;renderFutureCapacity(data,getState());}},onTerritorySelect:territory=>{school='all';setState({territory});},onSchoolSelect:id=>{school=id;renderFutureCapacity(data,getState());}});
 const rows=Object.keys(data.territoryById).map(id=>({id,name:data.territoryById[id].territorio_nombre,...capacityComparison(data,state,{territory:id,level})}));
 $('future-capacity-departments').innerHTML=rows.map(r=>{const change=(r.current.occupancy-r.base.baseOccupancy)*100;return `<tr class="${r.id===state.territory?'is-selected':''}"><th><button type="button" data-capacity-territory="${r.id}">${r.name}</button></th><td>${r.current.sections?pct.format(r.base.baseOccupancy):'—'}</td><td>${r.current.sections?pct.format(r.withoutProjects.occupancy):'—'}</td><td>${r.current.sections?pct.format(r.current.occupancy):'Sin oferta'}</td><td class="${change<0?'capacity-reduced':'capacity-increased'}">${r.current.sections?pp.format(change)+' pp':'—'}</td><td>${r.current.sections?fmt.format(r.current.availablePlaces):'—'}</td><td>${r.current.sections?(r.current.categories.ALTA_PRESION||0)+(r.current.categories.SATURADA||0):'—'}</td></tr>`;}).join('');
 const rates=potentialDemandSeries(data,{...state,educationSelection:'all',capacityTrendView:'group'});
 $('future-attendance-rates').innerHTML=rates.map(r=>`<span><b>${r.label}</b> ${pct.format(r.scenario.find(p=>p.year===Number(state.year)).rate)}</span>`).join('');
}
