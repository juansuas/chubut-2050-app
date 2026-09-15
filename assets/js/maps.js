import { COLORS, fmt, pct, occupancyStatus } from './config.js';

const registry={};

function ensure(id) {
  if (registry[id]) {
    setTimeout(()=>registry[id].map.invalidateSize(),0);
    return registry[id];
  }
  const map=L.map(id,{zoomControl:true,scrollWheelZoom:false,attributionControl:true}).setView([-43.8,-68.3],6);
  const base=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© OpenStreetMap'}).addTo(map);
  registry[id]={map,base,layers:[],control:null,legend:null};
  return registry[id];
}

function reset(entry) {
  entry.layers.forEach(layer=>entry.map.removeLayer(layer));
  entry.layers=[];
  if (entry.control) entry.map.removeControl(entry.control);
  if (entry.legend) entry.map.removeControl(entry.legend);
}

function pressure(m) {
  if (m.gap>0 && m.occupancy>1) return {label:'Presión crítica',color:COLORS.critical};
  if (m.gap>0 || m.occupancy>=.85) return {label:'Presión alta',color:COLORS.coral};
  if (m.occupancy>=.60) return {label:'Presión media',color:COLORS.yellow};
  return {label:'Presión baja',color:COLORS.support};
}

function territoryPopup(feature,m) {
  return `<strong>${feature.properties.territorio_nombre}</strong><br>
    ${pressure(m).label}<br>
    Matrícula proyectada: ${fmt.format(m.projected)}<br>
    Capacidad: ${fmt.format(m.capacity)}<br>
    Brecha: ${fmt.format(m.gap)}`;
}

function schoolIcon(isETP) {
  return L.divIcon({className:'school-div-icon',html:`<div class="school-symbol ${isETP?'etp':''}"><span>${isETP?'T':'E'}</span></div>`,iconSize:[27,27],iconAnchor:[13,13],popupAnchor:[0,-14]});
}

function sectorSymbol(sector='') {
  const value=sector.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if (value.includes('hidrocarburo')) return '●';
  if (value.includes('mineria')) return '⛏';
  if (value.includes('logistica')) return '⇄';
  if (value.includes('renovable')) return '☀';
  if (value.includes('energia') || value.includes('eolico')) return '⚡';
  return '◆';
}

function sectorColor(sector='') {
  const value=sector.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  if (value.includes('hidrocarburo')) return COLORS.primaryDark;
  if (value.includes('mineria')) return COLORS.brown;
  if (value.includes('logistica')) return COLORS.support;
  if (value.includes('renovable') || value.includes('energia') || value.includes('eolico')) return COLORS.yellow;
  return COLORS.primary;
}

function poleIcon(sector) {
  return L.divIcon({className:'pole-div-icon',html:`<div class="pole-symbol" style="--pole-color:${sectorColor(sector)}" title="${sector}">${sectorSymbol(sector)}</div>`,iconSize:[31,31],iconAnchor:[15,15],popupAnchor:[0,-16]});
}

function addLegend(entry) {
  const legend=L.control({position:'bottomright'});
  legend.onAdd=()=>{
    const div=L.DomUtil.create('div','map-legend');
    div.innerHTML=`<strong>Presión territorial</strong>
      <div class="legend-row"><span class="legend-swatch" style="background:${COLORS.critical}"></span>Crítica</div>
      <div class="legend-row"><span class="legend-swatch" style="background:${COLORS.coral}"></span>Alta</div>
      <div class="legend-row"><span class="legend-swatch" style="background:${COLORS.yellow}"></span>Media</div>
      <div class="legend-row"><span class="legend-swatch" style="background:${COLORS.support}"></span>Baja / disponible</div>
      <div class="legend-row"><span class="school-symbol etp" style="width:12px;height:12px;outline:0;border:0"><span style="font-size:7px">T</span></span>Escuela ETP</div>
      <div class="legend-row"><span class="pole-symbol" style="width:13px;height:13px;outline:0;border:0;font-size:8px">◆</span>Polo productivo</div>`;
    return div;
  };
  legend.addTo(entry.map);entry.legend=legend;
}

function jenksBreaks(inputValues,requestedClasses=5) {
  const values=inputValues.filter(Number.isFinite).sort((a,b)=>a-b);
  if(!values.length)return [0,0];
  const classCount=Math.min(requestedClasses,new Set(values).size,values.length);
  if(classCount<=1)return [values[0],values[values.length-1]];

  const lower=Array.from({length:values.length+1},()=>Array(classCount+1).fill(0));
  const variance=Array.from({length:values.length+1},()=>Array(classCount+1).fill(Infinity));
  for(let column=1;column<=classCount;column++) {
    lower[1][column]=1;variance[1][column]=0;
  }

  for(let length=2;length<=values.length;length++) {
    let sum=0,sumSquares=0,weight=0,currentVariance=0;
    for(let offset=1;offset<=length;offset++) {
      const lowerLimit=length-offset+1;
      const value=values[lowerLimit-1];
      weight++;sum+=value;sumSquares+=value*value;
      currentVariance=sumSquares-(sum*sum)/weight;
      const previous=lowerLimit-1;
      if(previous!==0) {
        for(let column=2;column<=classCount;column++) {
          const candidate=currentVariance+variance[previous][column-1];
          if(candidate<=variance[length][column]) {
            lower[length][column]=lowerLimit;
            variance[length][column]=candidate;
          }
        }
      }
    }
    lower[length][1]=1;variance[length][1]=currentVariance;
  }

  const breaks=Array(classCount+1).fill(0);
  breaks[0]=values[0];breaks[classCount]=values[values.length-1];
  let valueIndex=values.length;
  for(let column=classCount;column>1;column--) {
    const breakIndex=Math.max(0,Math.floor(lower[valueIndex][column])-2);
    breaks[column-1]=values[breakIndex];
    valueIndex=Math.max(1,Math.floor(lower[valueIndex][column])-1);
  }
  return breaks;
}

function populationScale(stats) {
  const breaks=jenksBreaks(stats.map(item=>item.value),5);
  const palette=['#E3F0F2','#BBD9DE','#86B9C2',COLORS.primary,COLORS.primaryDark];
  const classCount=breaks.length-1;
  return {breaks,colors:palette.slice(palette.length-classCount)};
}

function populationColor(value,scale) {
  for(let index=1;index<scale.breaks.length;index++) {
    if(value<=scale.breaks[index])return scale.colors[index-1];
  }
  return scale.colors[scale.colors.length-1];
}

function variationBand(value) {
  if(value===null||!Number.isFinite(value))return {color:'#D9DEDF',label:'Sin dato'};
  if(value<-.10)return {color:'#A64032',label:'Disminuye más de 10%'};
  if(value<-.02)return {color:'#E59A82',label:'Disminuye entre 2% y 10%'};
  if(value<=.02)return {color:'#E1E2DE',label:'Sin cambio relevante (±2%)'};
  if(value<=.10)return {color:'#8FC1C8',label:'Aumenta entre 2% y 10%'};
  return {color:COLORS.primaryDark,label:'Aumenta más de 10%'};
}

function variationColor(value) {
  return variationBand(value).color;
}

function variationText(value) {
  if(value===null||!Number.isFinite(value))return 'Sin dato';
  if(value<-.02)return `Disminuye ${pct.format(Math.abs(value))}`;
  if(value>.02)return `Aumenta ${pct.format(value)}`;
  return `Sin cambio relevante (${pct.format(value)})`;
}

function demographySexLabel(sex) {
  return sex==='M'?'Varones':sex==='F'?'Mujeres':'Ambos sexos';
}

function addDemographyLegend(entry,state,scale) {
  const legend=L.control({position:'bottomright'});
  legend.onAdd=()=>{
    const div=L.DomUtil.create('div','map-legend');
    if(state.demographyMapMetric==='variation') {
      div.innerHTML=`<strong>Cambio desde 2022</strong>
        <div class="legend-row"><span class="legend-swatch" style="background:#A64032"></span>Disminuye &gt;10%</div>
        <div class="legend-row"><span class="legend-swatch" style="background:#E59A82"></span>Disminuye 2%–10%</div>
        <div class="legend-row"><span class="legend-swatch" style="background:#E1E2DE"></span>Estable (±2%)</div>
        <div class="legend-row"><span class="legend-swatch" style="background:#8FC1C8"></span>Aumenta 2%–10%</div>
        <div class="legend-row"><span class="legend-swatch" style="background:${COLORS.primaryDark}"></span>Aumenta &gt;10%</div>`;
    } else {
      const labels=scale.colors.map((_,index)=>{
        const minimum=index===0?scale.breaks[0]:scale.breaks[index]+1;
        const maximum=scale.breaks[index+1];
        return minimum===maximum?fmt.format(minimum):`${fmt.format(minimum)}–${fmt.format(maximum)}`;
      });
      div.innerHTML=`<strong>Población · cortes naturales</strong>${labels.map((label,index)=>`<div class="legend-row"><span class="legend-swatch" style="background:${scale.colors[index]}"></span>${label}</div>`).join('')}`;
    }
    return div;
  };
  legend.addTo(entry.map);entry.legend=legend;
}

function renderAnalyticalMap(id,data,state,territoryStats,capacityRows,onTerritorySelect,defaults=[]) {
  const entry=ensure(id);reset(entry);
  const {map}=entry;
  const byTerritory=Object.fromEntries(territoryStats.map(x=>[x.territorio_id,x]));
  const byCue=Object.fromEntries(capacityRows.map(r=>[r.cue,r]));

  const boundaries=L.geoJSON(data.territories,{
    style:f=>({color:state.territory===f.properties.territorio_id?COLORS.primary:COLORS.ink,weight:state.territory===f.properties.territorio_id?3:1.4,fillOpacity:0}),
    onEachFeature:(f,l)=>{const m=byTerritory[f.properties.territorio_id];l.bindTooltip(`<div class="map-tooltip"><strong>${f.properties.territorio_nombre}</strong><br>${pressure(m).label}</div>`);l.bindPopup(territoryPopup(f,m));l.on('click',()=>onTerritorySelect?.(f.properties.territorio_id));}
  });
  const pressureLayer=L.geoJSON(data.territories,{
    style:f=>{const m=byTerritory[f.properties.territorio_id],p=pressure(m);return{color:COLORS.surface,weight:1.2,fillColor:p.color,fillOpacity:.62};},
    onEachFeature:(f,l)=>{const m=byTerritory[f.properties.territorio_id];l.bindTooltip(`<div class="map-tooltip"><strong>${f.properties.territorio_nombre}</strong><br>${pressure(m).label} · brecha ${fmt.format(m.gap)}</div>`);l.bindPopup(territoryPopup(f,m));l.on('click',()=>onTerritorySelect?.(f.properties.territorio_id));}
  });
  const availableLayer=L.geoJSON(data.territories,{
    style:f=>{const m=byTerritory[f.properties.territorio_id],available=Math.max(0,-m.gap),ratio=m.capacity?available/m.capacity:0;return{color:COLORS.support,weight:1,fillColor:COLORS.support,fillOpacity:Math.min(.72,.12+ratio)};},
    onEachFeature:(f,l)=>{const m=byTerritory[f.properties.territorio_id];l.bindTooltip(`<div class="map-tooltip"><strong>${f.properties.territorio_nombre}</strong><br>Capacidad disponible: ${fmt.format(Math.max(0,-m.gap))}</div>`);l.bindPopup(territoryPopup(f,m));l.on('click',()=>onTerritorySelect?.(f.properties.territorio_id));}
  });
  const schools=L.geoJSON(data.schools,{
    filter:f=>Boolean(byCue[f.properties.cue])&&(state.territory==='all'||f.properties.territorio_id===state.territory),
    pointToLayer:(f,ll)=>L.marker(ll,{icon:schoolIcon(f.properties.modalidad==='ETP'||f.properties.nivel==='ETP')}),
    onEachFeature:(f,l)=>{const r=byCue[f.properties.cue],s=occupancyStatus(r.occupacion);l.bindTooltip(`<div class="map-tooltip"><strong>${f.properties.nombre}</strong><br>${f.properties.nivel} · ${s.label}</div>`);l.bindPopup(`<strong>${f.properties.nombre}</strong><br>${f.properties.localidad} · ${f.properties.gestion}<br>${f.properties.nivel} · ${f.properties.modalidad}<br>Matrícula: ${fmt.format(r.matricula_actual)} · capacidad: ${fmt.format(r.capacidad_estimada)}<br>${s.label}: ${Math.round(r.ocupacion*100)}%`);}
  });
  const poles=L.geoJSON(data.poles,{
    filter:f=>state.territory==='all'||f.properties.territorio_id===state.territory,
    pointToLayer:(f,ll)=>L.marker(ll,{icon:poleIcon(f.properties.sector)}),
    onEachFeature:(f,l)=>{const p=f.properties;l.bindTooltip(`<div class="map-tooltip"><strong>${p.nombre}</strong><br>${p.sector} · desde ${p.inicio_estimado}</div>`);l.bindPopup(`<strong>${p.nombre}</strong><br>Sector: ${p.sector}<br>Tipo: ${p.tipo}<br>Empleo estimado: ${fmt.format(p.empleo_directo_bajo)}–${fmt.format(p.empleo_directo_alto)}<br>Inicio estimado: ${p.inicio_estimado}`);}
  });

  const overlays={'Límites territoriales':boundaries,'Presión / brecha':pressureLayer,'Capacidad disponible':availableLayer,'Escuelas':schools,'Polos productivos':poles};
  entry.layers=Object.values(overlays);
  defaults.forEach(name=>overlays[name]?.addTo(map));
  entry.control=L.control.layers(null,overlays,{collapsed:true,position:'topright'}).addTo(map);
  addLegend(entry);

  const selected=state.territory==='all'?data.territories:data.territories.features.find(f=>f.properties.territorio_id===state.territory);
  const bounds=L.geoJSON(selected).getBounds();
  if (bounds.isValid()) map.fitBounds(bounds,{padding:[24,24],maxZoom:state.territory==='all'?7:9});
}

export function renderSummaryMap(data,state,territoryStats,capacityRows,onSelect) {
  renderAnalyticalMap('summary-map',data,state,territoryStats,capacityRows,onSelect,['Presión / brecha','Límites territoriales']);
}

export function renderSchoolsMap(data,state,territoryStats,rows,onSelect) {
  renderAnalyticalMap('schools-map',data,state,territoryStats,rows,onSelect,['Límites territoriales','Escuelas']);
}

export function renderPolesMap(data,state,territoryStats,capacityRows,onSelect) {
  renderAnalyticalMap('poles-map',data,state,territoryStats,capacityRows,onSelect,['Límites territoriales','Polos productivos']);
}

export function renderDemographyMap(data,state,stats,onSelect) {
  const entry=ensure('demography-map');reset(entry);
  const byTerritory=Object.fromEntries(stats.map(item=>[item.territorio_id,item]));
  const scale=populationScale(stats);
  const selectedId=state.demographyTerritory;
  const metric=state.demographyMapMetric;
  const layer=L.geoJSON(data.departmentBoundaries,{
    style:feature=>{
      const item=byTerritory[String(feature.properties.territorio_id)];
      const selected=selectedId===String(feature.properties.territorio_id);
      return {
        color:selected?COLORS.ink:COLORS.surface,
        weight:selected?3:1.2,
        fillColor:metric==='variation'?variationColor(item?.variation):populationColor(item?.value||0,scale),
        fillOpacity:.78
      };
    },
    onEachFeature:(feature,featureLayer)=>{
      const item=byTerritory[String(feature.properties.territorio_id)];
      const variation=variationText(item?.variation);
      const context=`${state.demographyYear} · edades ${state.demographyAgeRange.replace('-', '–')} · ${demographySexLabel(state.demographySex)}`;
      const population=`${fmt.format(item?.value||0)} personas`;
      const tooltipDetail=metric==='variation'?`${variation} desde 2022 · ${population}`:`${population} · ${variation} desde 2022`;
      featureLayer.bindTooltip(`<div class="map-tooltip"><strong>${feature.properties.territorio_nombre}</strong><br>${tooltipDetail}</div>`);
      featureLayer.bindPopup(`<strong>${feature.properties.territorio_nombre}</strong><br>${context}<br>Población: ${population}<br>Cambio desde 2022: ${variation}`);
      featureLayer.on('click',()=>onSelect?.(String(feature.properties.territorio_id)));
    }
  }).addTo(entry.map);
  entry.layers=[layer];
  addDemographyLegend(entry,state,scale);

  const selected=selectedId==='all'
    ? data.departmentBoundaries
    : data.departmentBoundaries.features.find(feature=>String(feature.properties.territorio_id)===selectedId);
  const bounds=L.geoJSON(selected||data.departmentBoundaries).getBounds();
  if(bounds.isValid())entry.map.fitBounds(bounds,{padding:[24,24],maxZoom:selectedId==='all'?7:9});
}

export function expandVisibleLayerControl() {
  const section=document.querySelector('.module:not([hidden])');
  const control=section?.querySelector('.leaflet-control-layers');
  if (!control) return false;
  control.classList.add('leaflet-control-layers-expanded','layer-control-highlight');
  setTimeout(()=>control.classList.remove('layer-control-highlight'),900);
  control.scrollIntoView({behavior:'smooth',block:'center'});
  return true;
}
