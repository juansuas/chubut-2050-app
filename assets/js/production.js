import {COLORS,fmt} from './config.js';

export const ACTIVITY_COLORS={EOL:COLORS.primary,HID:COLORS.support,TER:COLORS.coral,PET:COLORS.primaryDark,GAS:COLORS.brown,H2:COLORS.yellow,OTR:COLORS.muted};
const STATE_ORDER=['OPERATIVO','EN_CONSTRUCCION','PROYECTADO','FUERA_SERVICIO','SIN_INFO'];
const STATE_COLORS={OPERATIVO:COLORS.primary,EN_CONSTRUCCION:COLORS.coral,PROYECTADO:COLORS.yellow,FUERA_SERVICIO:COLORS.critical,SIN_INFO:'#8B9499'};
const ACTIVITY_SYMBOLS={
  EOL:'<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="10" r="1.7"/><path d="M12 11.5v8M9.4 20h5.2M12 8.3 8.1 3.8M13.6 9.1l6.2-1.2M10.8 10.9l-2.4 5.8"/></svg>',
  HID:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2.8c-2.5 4-6.3 8.1-6.3 12.1a6.3 6.3 0 0 0 12.6 0C18.3 10.9 14.5 6.8 12 2.8Z"/><path d="M9.1 15.2c.4 1.5 1.3 2.3 2.9 2.5"/></svg>',
  TER:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m13.7 2.7-7.2 10h4.7l-1 8.6 7.3-11h-4.6l.8-7.6Z"/></svg>',
  PET:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 20h10M9 20l3-15 3 15M8.6 11h6.8M7.8 15h8.4M5.5 7.5h9M14.5 5v5M14.5 7.5H19l-2.5 3"/></svg>',
  GAS:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M13.2 2.8c.8 3-1.2 4.4-2.4 6.1-1.1 1.5-1.5 2.9-.4 4.6.1-2.2 1.4-3.2 2.7-4.5 2.7 2 4.2 4.3 4.2 6.7a5.3 5.3 0 0 1-10.6 0c0-3.5 2.5-6.1 6.5-12.9Z"/></svg>',
  H2:'<span class="production-h2-symbol">H<sub>2</sub></span>',
  OTR:'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M12 5v14"/></svg>'
};
const plotConfig={displayModeBar:false,responsive:true};
let mapEntry=null;

const number=value=>value===null||value===''||value===undefined?null:Number(value);
const formatDecimal=value=>value===null||!Number.isFinite(Number(value))?'—':Number(value).toLocaleString('es-AR',{maximumFractionDigits:2});
const escapeHTML=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const operatorLabel=value=>value||'Sin informar';

export function filteredProductionRows(data,state){
  return (data.productionInstallations||[]).filter(row=>
    (state.territory==='all'||row.departamento_id===state.territory)&&
    (state.productActivity==='all'||row.actividad_id===state.productActivity)&&
    (state.productStatus==='all'||row.estado_id===state.productStatus)&&
    (state.productOperator==='all'||(state.productOperator==='__missing__'?!row.operador:row.operador===state.productOperator))
  );
}

export function productionSummary(rows){
  const installed=rows.reduce((sum,row)=>sum+(number(row.capacidad_instalada_mw)||0),0);
  const projectPower=rows.reduce((sum,row)=>sum+(number(row.potencia_declarada_proyecto_mw)||0),0);
  const withInstalled=rows.filter(row=>number(row.capacidad_instalada_mw)!==null).length;
  const future=rows.filter(row=>row.condicion_informacion==='proyecto_futuro').length;
  return {installations:rows.length,installed,projectPower,withInstalled,future,coverage:rows.length?withInstalled/rows.length:0};
}

export function productionFilterOptions(data){
  const rows=data.productionInstallations||[];
  const unique=(field,filter=()=>true)=>[...new Set(rows.filter(filter).map(row=>row[field]).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));
  return {
    activities:unique('actividad_id').map(value=>({value,label:rows.find(row=>row.actividad_id===value)?.actividad_nombre||value})),
    operators:unique('operador').map(value=>({value,label:value})),
    statuses:unique('estado_id').sort((a,b)=>STATE_ORDER.indexOf(a)-STATE_ORDER.indexOf(b)).map(value=>({value,label:rows.find(row=>row.estado_id===value)?.estado_nombre||value}))
  };
}

function ensureMap(){
  if(mapEntry){setTimeout(()=>mapEntry.map.invalidateSize(),0);return mapEntry;}
  const map=L.map('production-map',{zoomControl:true,scrollWheelZoom:false,attributionControl:true}).setView([-43.8,-68.3],6);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© OpenStreetMap'}).addTo(map);
  mapEntry={map,layers:[],legend:null};
  return mapEntry;
}

function resetMap(entry){
  entry.layers.forEach(layer=>entry.map.removeLayer(layer));
  entry.layers=[];
  if(entry.legend){entry.map.removeControl(entry.legend);entry.legend=null;}
}

export function activitySymbol(activityId){
  return ACTIVITY_SYMBOLS[activityId]||ACTIVITY_SYMBOLS.OTR;
}

function activityIcon(row,selected=false){
  const size=selected?32:28;
  const activityClass=`activity-${String(row.actividad_id||'OTR').toLowerCase()}`;
  const stateClass=`state-${String(row.estado_id||'SIN_INFO').toLowerCase()}`;
  return L.divIcon({
    className:'production-div-icon',
    html:`<span class="production-map-symbol ${activityClass} ${stateClass}${selected?' is-selected':''}" style="--marker-size:${size}px;--activity-color:${ACTIVITY_COLORS[row.actividad_id]||COLORS.muted};--state-color:${STATE_COLORS[row.estado_id]||COLORS.muted}">${activitySymbol(row.actividad_id)}</span>`,
    iconSize:[size,size],
    iconAnchor:[size/2,size/2],
    tooltipAnchor:[0,-size/2]
  });
}

function addMapLegend(entry){
  const legend=L.control({position:'bottomright'});
  legend.onAdd=()=>{
    const div=L.DomUtil.create('div','map-legend production-map-legend');
    div.innerHTML=`<strong>Actividad</strong>
      <span><b class="production-legend-icon activity-eol" style="--activity-color:${ACTIVITY_COLORS.EOL}">${activitySymbol('EOL')}</b>Eólica</span>
      <span><b class="production-legend-icon activity-hid" style="--activity-color:${ACTIVITY_COLORS.HID}">${activitySymbol('HID')}</b>Hidroeléctrica</span>
      <span><b class="production-legend-icon activity-ter" style="--activity-color:${ACTIVITY_COLORS.TER}">${activitySymbol('TER')}</b>Térmica</span>
      <strong class="legend-subtitle">Estado</strong>
      <span><i class="legend-ring operative"></i>Operativo</span>
      <span><i class="legend-ring projected"></i>Proyectado</span>
      <span><i class="legend-ring unknown"></i>Estado sin informar</span>`;
    return div;
  };
  legend.addTo(entry.map);entry.legend=legend;
}

function renderProductionMap(data,state,rows,onTerritorySelect,onInstallationSelect){
  const entry=ensureMap();resetMap(entry);
  const selectedId=state.productInstallation;
  const boundaries=L.geoJSON(data.departmentBoundaries,{
    style:feature=>{
      const selected=state.territory===String(feature.properties.territorio_id);
      return {color:selected?COLORS.primaryDark:COLORS.ink,weight:selected?3:1.1,fillColor:COLORS.primary,fillOpacity:selected?.12:.025};
    },
    onEachFeature:(feature,layer)=>{
      layer.bindTooltip(`<div class="map-tooltip"><strong>${escapeHTML(feature.properties.territorio_nombre)}</strong><br>Clic para filtrar</div>`);
      layer.on('click',()=>onTerritorySelect?.(String(feature.properties.territorio_id)));
    }
  }).addTo(entry.map);
  const markers=L.layerGroup().addTo(entry.map);
  rows.forEach(row=>{
    const selected=row.instalacion_id===selectedId;
    const marker=L.marker([row.latitud,row.longitud],{
      icon:activityIcon(row,selected),
      title:`${row.nombre_instalacion} · ${row.actividad_nombre} · ${row.estado_nombre}`,
      alt:`${row.nombre_instalacion}, ${row.actividad_nombre}, ${row.estado_nombre}`,
      keyboard:true,
      riseOnHover:true,
      zIndexOffset:selected?1000:0
    });
    const capacity=number(row.capacidad_instalada_mw);
    const project=number(row.potencia_declarada_proyecto_mw);
    marker.bindTooltip(`<div class="map-tooltip"><strong>${escapeHTML(row.nombre_instalacion)}</strong><br>${escapeHTML(row.actividad_nombre)} · ${escapeHTML(row.estado_nombre)}<br>${capacity!==null?`${formatDecimal(capacity)} MW instalados`:project!==null?`${formatDecimal(project)} MW declarados de proyecto`:'Capacidad sin informar'}</div>`);
    marker.on('click',()=>onInstallationSelect?.(row.instalacion_id));
    marker.addTo(markers);
  });
  entry.layers=[boundaries,markers];addMapLegend(entry);
  const selectedBoundary=state.territory==='all'?data.departmentBoundaries:data.departmentBoundaries.features.find(feature=>String(feature.properties.territorio_id)===state.territory);
  const bounds=L.geoJSON(selectedBoundary||data.departmentBoundaries).getBounds();
  if(bounds.isValid())entry.map.fitBounds(bounds,{padding:[24,24],maxZoom:state.territory==='all'?7:9});
}

function baseLayout(extra={}){
  return {paper_bgcolor:COLORS.surface,plot_bgcolor:COLORS.surface,font:{family:'Inter, system-ui, sans-serif',color:COLORS.ink,size:12},margin:{l:55,r:18,t:20,b:48},hoverlabel:{bgcolor:COLORS.surface,bordercolor:COLORS.line,font:{color:COLORS.ink}},legend:{orientation:'h',y:1.13,x:0},...extra};
}

function renderDepartmentChart(rows,onTerritorySelect){
  const el=document.getElementById('production-department-chart');
  const grouped=new Map();
  rows.forEach(row=>{
    if(!grouped.has(row.departamento_id))grouped.set(row.departamento_id,{id:row.departamento_id,name:row.departamento_nombre,total:0,documented:0,activities:{}});
    const value=number(row.capacidad_instalada_mw);
    if(value===null)return;
    const group=grouped.get(row.departamento_id);
    group.total+=value;group.documented+=1;
    group.activities[row.actividad_id]=(group.activities[row.actividad_id]||0)+value;
  });
  const departments=[...grouped.values()].filter(row=>row.total>0).sort((a,b)=>b.total-a.total||a.name.localeCompare(b.name,'es'));
  if(!departments.length){Plotly.purge(el);el.innerHTML='<p class="empty-chart">No hay capacidad instalada documentada para la selección.</p>';return;}
  if(el.querySelector('.empty-chart')){el.innerHTML='';Plotly.purge(el);}
  const activities=[...new Set(departments.flatMap(row=>Object.keys(row.activities)))].sort((a,b)=>a.localeCompare(b));
  const traces=activities.map(activity=>({type:'bar',orientation:'h',name:rows.find(row=>row.actividad_id===activity)?.actividad_nombre||activity,y:departments.map(row=>row.name),x:departments.map(row=>row.activities[activity]||0),customdata:departments.map(row=>[row.id,row.documented]),marker:{color:ACTIVITY_COLORS[activity]||COLORS.muted},hovertemplate:'%{y}<br>%{x:,.2f} MW<extra>%{fullData.name}</extra>'}));
  Plotly.react(el,traces,baseLayout({barmode:'stack',margin:{l:135,r:24,t:20,b:45},xaxis:{title:'Capacidad instalada conocida (MW)',gridcolor:'#EEF0EE'},yaxis:{automargin:true,categoryorder:'array',categoryarray:departments.map(row=>row.name).reverse()}}),plotConfig);
  if(el._productionDepartmentClick)el.removeListener?.('plotly_click',el._productionDepartmentClick);
  el._productionDepartmentClick=event=>{const id=event.points?.[0]?.customdata?.[0];if(id)onTerritorySelect?.(String(id));};
  el.on('plotly_click',el._productionDepartmentClick);el.style.cursor='pointer';
}

function renderFutureComparisonChart(rows,onTerritorySelect){
  const el=document.getElementById('production-future-chart');
  const grouped=new Map();
  rows.forEach(row=>{
    if(!grouped.has(row.departamento_id))grouped.set(row.departamento_id,{id:row.departamento_id,name:row.departamento_nombre,current:0,future:0});
    const group=grouped.get(row.departamento_id),installed=number(row.capacidad_instalada_mw),project=number(row.potencia_declarada_proyecto_mw);
    if(installed!==null)group.current+=installed;
    if(row.condicion_informacion==='proyecto_futuro'&&project!==null)group.future+=project;
  });
  const departments=[...grouped.values()].filter(row=>row.current>0||row.future>0).sort((a,b)=>(b.current+b.future)-(a.current+a.future)||a.name.localeCompare(b.name,'es'));
  if(!departments.length){Plotly.purge(el);el.innerHTML='<p class="empty-chart">No hay capacidad actual ni proyectos futuros documentados para la selección.</p>';return;}
  if(el.querySelector('.empty-chart')){el.innerHTML='';Plotly.purge(el);}
  const traces=[
    {type:'bar',orientation:'h',name:'Capacidad instalada',y:departments.map(row=>row.name),x:departments.map(row=>row.current),customdata:departments.map(row=>row.id),marker:{color:COLORS.primary},hovertemplate:'%{y}<br>%{x:,.2f} MW instalados<extra></extra>'},
    {type:'bar',orientation:'h',name:'Proyectos futuros',y:departments.map(row=>row.name),x:departments.map(row=>row.future),customdata:departments.map(row=>row.id),marker:{color:COLORS.yellow},hovertemplate:'%{y}<br>%{x:,.2f} MW declarados<extra></extra>'}
  ];
  Plotly.react(el,traces,baseLayout({barmode:'group',margin:{l:120,r:18,t:20,b:45},xaxis:{title:'MW documentados',gridcolor:'#EEF0EE'},yaxis:{automargin:true,categoryorder:'array',categoryarray:departments.map(row=>row.name).reverse()}}),plotConfig);
  if(el._productionFutureClick)el.removeListener?.('plotly_click',el._productionFutureClick);
  el._productionFutureClick=event=>{const id=event.points?.[0]?.customdata;if(id)onTerritorySelect?.(String(id));};
  el.on('plotly_click',el._productionFutureClick);el.style.cursor='pointer';
}

function renderMatrixChart(rows){
  const el=document.getElementById('production-matrix-chart');
  const grouped=new Map();
  rows.forEach(row=>{const value=number(row.capacidad_instalada_mw);if(value!==null)grouped.set(row.actividad_id,{name:row.actividad_nombre,value:(grouped.get(row.actividad_id)?.value||0)+value,color:ACTIVITY_COLORS[row.actividad_id]||COLORS.muted});});
  const values=[...grouped.values()].sort((a,b)=>b.value-a.value);
  if(!values.length){Plotly.purge(el);el.innerHTML='<p class="empty-chart">No hay capacidad instalada documentada para la selección.</p>';return;}
  if(el.querySelector('.empty-chart')){el.innerHTML='';Plotly.purge(el);}
  Plotly.react(el,[{type:'pie',hole:.58,labels:values.map(row=>row.name),values:values.map(row=>row.value),marker:{colors:values.map(row=>row.color),line:{color:COLORS.surface,width:2}},textinfo:'label+percent',hovertemplate:'%{label}<br>%{value:,.2f} MW<br>%{percent}<extra></extra>',sort:false}],baseLayout({margin:{l:20,r:20,t:20,b:45},legend:{orientation:'h',y:-.04,x:.5,xanchor:'center'}}),plotConfig);
}


function renderKpis(rows){
  const summary=productionSummary(rows);
  const cards=[
    ['Instalaciones',fmt.format(summary.installations),'Unidades georreferenciadas'],
    ['Capacidad instalada',`${formatDecimal(summary.installed)} MW`,`${summary.withInstalled} instalaciones con dato`],
    ['Potencia de proyecto',`${formatDecimal(summary.projectPower)} MW`,'Valor documental; no se suma como instalada'],
    ['Proyectos futuros',fmt.format(summary.future),'Construcción no iniciada según SPIA']
  ];
  document.getElementById('production-kpis').innerHTML=cards.map(([label,value,note])=>`<article><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`).join('');
}

function renderTable(rows,state){
  const body=document.getElementById('production-table');
  body.innerHTML=[...rows].sort((a,b)=>a.departamento_nombre.localeCompare(b.departamento_nombre,'es')||a.nombre_instalacion.localeCompare(b.nombre_instalacion,'es')).map(row=>`<tr class="${row.instalacion_id===state.productInstallation?'is-selected':''}"><td><button type="button" data-product-installation="${escapeHTML(row.instalacion_id)}">${escapeHTML(row.nombre_instalacion)}</button></td><td>${escapeHTML(row.departamento_nombre)}</td><td>${escapeHTML(row.actividad_nombre)}</td><td><span class="production-status status-${escapeHTML(row.estado_id.toLowerCase())}">${escapeHTML(row.estado_nombre)}</span></td><td class="number">${formatDecimal(number(row.capacidad_instalada_mw))}</td><td class="number">${formatDecimal(number(row.potencia_declarada_proyecto_mw))}</td><td>${escapeHTML(operatorLabel(row.operador))}</td></tr>`).join('');
}

function renderDetail(data,state,rows){
  const container=document.getElementById('production-detail');
  const row=rows.find(item=>item.instalacion_id===state.productInstallation);
  if(!row){container.innerHTML='<div class="production-detail-empty"><span>↖</span><h4>Seleccioná una instalación</h4><p>El mapa y la tabla abren una ficha con capacidad, estado, operador y fuente. Los campos sin respaldo permanecen vacíos.</p></div>';return;}
  const source=data.productionSourceById?.[row.fuente_primaria_id];
  const sourceLink=source?.url?`<a href="${escapeHTML(source.url)}" target="_blank" rel="noopener">${escapeHTML(source.titulo||source.fuente_id)}</a>`:escapeHTML(row.fuente_primaria_id);
  const thermalEvidence=(row.fuentes_secundarias_ids||'').split('|')
    .filter(id=>id.startsWith('CAMMESA_POTENCIA_TERMICA_')||id.startsWith('CAMMESA_GENERACION_LOCAL_'))
    .map(id=>data.productionSourceById?.[id])
    .filter(Boolean);
  container.innerHTML=`<article class="installation-card">
    <div class="installation-card-heading"><span style="--activity-color:${ACTIVITY_COLORS[row.actividad_id]||COLORS.muted}">${escapeHTML(row.actividad_nombre)}</span><h4>${escapeHTML(row.nombre_instalacion)}</h4><p>${escapeHTML(row.departamento_nombre)} · ${escapeHTML(row.estado_nombre)}</p></div>
    <dl>
      <div><dt>Capacidad instalada</dt><dd>${number(row.capacidad_instalada_mw)!==null?`${formatDecimal(row.capacidad_instalada_mw)} MW`:'Sin dato verificado'}</dd></div>
      <div><dt>Potencia declarada de proyecto</dt><dd>${number(row.potencia_declarada_proyecto_mw)!==null?`${formatDecimal(row.potencia_declarada_proyecto_mw)} MW`:'Sin dato'}</dd></div>
      <div><dt>Operador / agente</dt><dd>${escapeHTML(operatorLabel(row.operador))}</dd></div>
      <div><dt>Empleo de construcción</dt><dd>Sin dato observado</dd></div>
      <div><dt>Empleo de operación</dt><dd>Sin dato observado</dd></div>
      <div><dt>Año declarado</dt><dd>${escapeHTML(row.anio_referencia||'Sin informar')}</dd></div>
    </dl>
    <footer><strong>Fuente primaria</strong>${sourceLink}<small>${escapeHTML(source?.institucion||'')} ${source?.fecha_actualizacion_declarada?`· actualización declarada ${escapeHTML(source.fecha_actualizacion_declarada)}`:'· fecha de corte no informada'}</small>${thermalEvidence.map(item=>`<a href="${escapeHTML(item.url)}" target="_blank" rel="noopener">${escapeHTML(item.titulo)}</a>`).join('')}</footer>
  </article>`;
}

export function renderProduction(data,state,callbacks={}){
  const rows=filteredProductionRows(data,state);
  renderKpis(rows);
  renderProductionMap(data,state,rows,callbacks.onTerritorySelect,callbacks.onInstallationSelect);
  renderDepartmentChart(rows,callbacks.onTerritorySelect);
  renderFutureComparisonChart(rows,callbacks.onTerritorySelect);
  renderMatrixChart(rows);
  renderTable(rows,state);
  renderDetail(data,state,rows);
  const territory=state.territory==='all'?'Toda la provincia':data.territoryById?.[state.territory]?.territorio_nombre||'Departamento';
  document.getElementById('production-map-caption').textContent=`${territory} · ${rows.length} instalaciones visibles`;
  document.getElementById('production-department-caption').textContent='MW verificados · clic para filtrar';
  document.getElementById('production-future-caption').textContent='Valores separados; los proyectos no se suman a la capacidad actual';
  document.getElementById('production-matrix-caption').textContent='Sólo capacidad instalada documentada; excluye potencia declarada de proyectos';
  document.getElementById('production-source-note').textContent=(data.productionMetadata?.advertencias||[]).join(' ');
}
