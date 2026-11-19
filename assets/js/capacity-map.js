import {aggregateSchools,projectedSections,OCCUPANCY_CATEGORIES} from './scenario-model.js?v=2.30.0';
import {occupancyStatus,pct,fmt} from './config.js?v=2.30.0';
const maps=new Map();
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
export function renderCapacityMap(data,state,{id='capacity-school-map',rows,referenceRows,metric='occupancy',projectHighlight,onSchoolSelect=()=>{},onTerritorySelect=()=>{}}={}){
 let entry=maps.get(id);
 if(!entry){
  const map=L.map(id,{scrollWheelZoom:false});L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap',maxZoom:18}).addTo(map);
  entry={map,markers:new Map(),layer:L.layerGroup().addTo(map)};maps.set(id,entry);
  new ResizeObserver(()=>map.invalidateSize()).observe(document.getElementById(id));
 }
 const schools=aggregateSchools(rows||projectedSections(data,state,{school:'all'}));
 const references=new Map(aggregateSchools(referenceRows||projectedSections(data,state,{school:'all',mode:'trend'})).map(r=>[r.cue_anexo,r]));
 entry.boundaries?.remove();
 entry.boundaries=L.geoJSON(data.departmentBoundaries,{style:f=>{const selected=String(f.properties.territorio_id)===state.territory,highlighted=projectHighlight?.enabled&&projectHighlight.departments.has(String(f.properties.territorio_id));return {fillColor:highlighted?'#D8AC54':'#9FB2B6',fillOpacity:highlighted?.19:.03,color:selected?'#14586A':highlighted?'#95651F':'#9FB2B6',weight:selected?3:highlighted?2:1};},onEachFeature:(f,l)=>{l.bindTooltip(`<strong>${esc(f.properties.territorio_nombre)}</strong>${projectHighlight?.departments.has(String(f.properties.territorio_id))?'<br>Con proyectos del escenario':''}<br>Clic para seleccionar; repetí el clic para quitar el filtro.`);l.on('click',()=>onTerritorySelect(state.territory===String(f.properties.territorio_id)?'all':String(f.properties.territorio_id)));}}).addTo(entry.map);
 entry.projectControl?.remove();
 if(projectHighlight){
  entry.projectControl=L.control({position:'topright'});entry.projectControl.onAdd=()=>{
   const div=L.DomUtil.create('div','capacity-project-control');
   const button=L.DomUtil.create('button','',div);button.type='button';button.id='future-capacity-projects';
   button.setAttribute('aria-pressed',String(projectHighlight.enabled));
   button.disabled=!projectHighlight.departments.size;
   button.textContent=projectHighlight.departments.size?'Departamentos con proyectos':'Sin departamentos con proyectos';
   button.title='Resaltar los departamentos con proyectos de la cartera elegida, sin cambiar las escuelas ni el zoom';
   const note=L.DomUtil.create('span','capacity-project-key',div);note.hidden=!projectHighlight.enabled||!projectHighlight.departments.size;
   note.textContent=`${projectHighlight.departments.size} departamentos · cartera completa`;
   L.DomEvent.disableClickPropagation(div);L.DomEvent.disableScrollPropagation(div);
   L.DomEvent.on(button,'click',()=>projectHighlight.onToggle());return div;
  };entry.projectControl.addTo(entry.map);
 }
 const active=new Set();
 for(const school of schools){
  if(!Number.isFinite(school.lat)||!Number.isFinite(school.lng))continue;
  active.add(school.cue_anexo);
  const reference=references.get(school.cue_anexo),delta=(school.occupancy-(metric==='change2024'?school.baseOccupancy:reference?.occupancy||0))*100;
  const color=metric==='occupancy'?occupancyStatus(school.occupancy).color:delta>1?'#B9472F':delta< -1?'#247C8C':'#B9C3C5';
  const style={radius:state.capacitySchool===school.cue_anexo?8:5,fillColor:color,fillOpacity:.9,color:state.capacitySchool===school.cue_anexo?'#1F2933':'#FFFFFF',weight:state.capacitySchool===school.cue_anexo?3:1};
  const projectionNote=state.module==='oferta'?`Proyección tendencial: ${pct.format(school.occupancy)}`:`Sin proyectos, mismas tasas: ${pct.format(reference?.occupancy||0)}<br>Escenario seleccionado: ${pct.format(school.occupancy)}`;
  const info=`<div class="map-tooltip"><strong>${esc(school.name)}</strong><br>${esc(school.department)} · ${esc(school.level)}<br>Ocupación 2024: ${pct.format(school.baseOccupancy)}<br>${projectionNote}<br>Capacidad actual de referencia: ${fmt.format(school.capacity)}<br>Lugares disponibles estimados: ${fmt.format(school.availablePlaces)}<br>Cursos con alta presión o saturados: ${(school.categories.ALTA_PRESION||0)+(school.categories.SATURADA||0)}<br><small>Estimación proporcional por departamento, edad y sexo; no asigna familias a una escuela.</small></div>`;
  let marker=entry.markers.get(school.cue_anexo);
  if(!marker){marker=L.circleMarker([school.lat,school.lng],style).addTo(entry.layer);entry.markers.set(school.cue_anexo,marker);}
  marker.setStyle(style).setRadius(style.radius).bringToFront().unbindTooltip().bindTooltip(info).unbindPopup().bindPopup(info);
  marker.off('click');marker.on('click',()=>onSchoolSelect(state.capacitySchool===school.cue_anexo?'all':school.cue_anexo));
 }
 for(const [key,marker] of entry.markers)if(!active.has(key)){marker.remove();entry.markers.delete(key);}
 entry.legend?.remove();entry.legend=L.control({position:'bottomright'});entry.legend.onAdd=()=>{
  const div=L.DomUtil.create('div','map-legend');
  div.innerHTML=metric==='occupancy'?'<strong>Ocupación estimada</strong>'+OCCUPANCY_CATEGORIES.map(c=>`<span><i style="background:${c.color}"></i>${c.label}</span>`).join(''):'<strong>Cambio de ocupación</strong><span><i style="background:#247C8C"></i>Menor presión</span><span><i style="background:#B9C3C5"></i>Cambio menor a ±1 punto</span><span><i style="background:#B9472F"></i>Mayor presión</span>';
  return div;
 };entry.legend.addTo(entry.map);
 if(entry.territory!==state.territory){
  const shape=state.territory==='all'?data.departmentBoundaries:data.departmentBoundaries.features.find(f=>String(f.properties.territorio_id)===state.territory);
  entry.map.fitBounds(L.geoJSON(shape).getBounds(),{padding:[18,18],maxZoom:state.territory==='all'?7:10});entry.territory=state.territory;
 }
 requestAnimationFrame(()=>entry.map.invalidateSize());
}
