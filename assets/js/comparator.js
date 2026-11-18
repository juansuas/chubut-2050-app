import {buildFutureTerritories,FUTURE_LEVELS} from './future-territories.js?v=2.24.0';
import {COMPARISON_SCENARIOS,comparisonSeries,comparisonMetric,comparisonDifference,comparisonMaximum} from './comparator-model.js?v=2.24.0';
const $=id=>document.getElementById(id),nf=new Intl.NumberFormat('es-AR',{maximumFractionDigits:0}),df=new Intl.NumberFormat('es-AR',{maximumFractionDigits:1}),sf=new Intl.NumberFormat('es-AR',{maximumFractionDigits:1,signDisplay:'exceptZero'});
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='chubut2050.comparator.v1',maps={},layers={},scaleCache=new Map();
let owner,model,ready=false,mapTerritory=null,syncing=false;
let ui={a:'moderado',b:'intensivo',territory:'all',year:2050,layer:'productive',impact:'population',level:'all'};
function change(patch){Object.assign(ui,patch);try{localStorage.setItem(KEY,JSON.stringify(ui));}catch{}renderComparator(owner);}
const metric=()=>ui.layer==='productive'?'mw':ui.impact;
const unit=()=>metric()==='mw'?'MW':metric()==='population'?'personas':'estudiantes potenciales';
const selectedLevel=()=>ui.level==='all'?'Todos los niveles':FUTURE_LEVELS.find(([key])=>key===ui.level)[1];
const metricTitle=()=>metric()==='mw'?'MW adicionales en operación':metric()==='population'?'Población adicional':`Demanda educativa adicional · ${selectedLevel()}`;
function init(data){
 try{const saved=JSON.parse(localStorage.getItem(KEY))||{};for(const side of ['a','b'])if(Object.hasOwn(COMPARISON_SCENARIOS,saved[side]))ui[side]=saved[side];if(saved.territory==='all'||Object.hasOwn(data.territoryById,saved.territory))ui.territory=saved.territory;if(Number.isInteger(saved.year)&&saved.year>=2026&&saved.year<=2050)ui.year=saved.year;if(['productive','impact'].includes(saved.layer))ui.layer=saved.layer;if(['population','education'].includes(saved.impact))ui.impact=saved.impact;if(['all',...FUTURE_LEVELS.map(([key])=>key)].includes(saved.level))ui.level=saved.level;}catch{}
 for(const [id,r] of Object.entries(data.territoryById).sort((a,b)=>a[1].territorio_nombre.localeCompare(b[1].territorio_nombre,'es')))$('cmp-territory').add(new Option(r.territorio_nombre,id));
 for(const year of model.years)$('cmp-year').add(new Option(year,year));
 for(const side of ['a','b'])$('cmp-scenario-'+side).addEventListener('change',e=>change({[side]:e.target.value}));
 for(const key of ['territory','year','layer','impact','level'])$('cmp-'+key).addEventListener('change',e=>change({[key]:key==='year'?Number(e.target.value):e.target.value}));
 $('cmp-reset').addEventListener('click',()=>change({territory:'all'}));ready=true;
}
function renderMaps(data){
 const m=metric(),key=m+':'+ui.level;
 if(!scaleCache.has(key))scaleCache.set(key,comparisonMaximum(model,m,ui.level));
 const maximum=scaleCache.get(key);
 for(const side of ['a','b']){
  if(!maps[side]){
   const map=maps[side]=L.map('cmp-map-'+side,{scrollWheelZoom:false});
   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap',maxZoom:16}).addTo(map);
   new ResizeObserver(()=>map.invalidateSize()).observe($('cmp-map-'+side));
   map.on('moveend',()=>{const other=maps[side==='a'?'b':'a'];if(syncing||!other)return;const center=map.getCenter();if(other.getZoom()===map.getZoom()&&other.getCenter().equals(center,1e-7))return;syncing=true;other.setView(center,map.getZoom(),{animate:false});syncing=false;});
  }
  if(layers[side])maps[side].removeLayer(layers[side]);
  const rows=Object.fromEntries(model.ids.map(id=>[id,comparisonSeries(model,ui[side],id).find(r=>r.year===ui.year)]));
  layers[side]=L.geoJSON(data.departmentBoundaries,{
   style:f=>{const id=String(f.properties.territorio_id),v=comparisonMetric(rows[id],m,ui.level);return {fillColor:v>0?'#247C8C':'#F4F4EF',fillOpacity:v>0?.2+.65*v/(maximum||1):.6,color:id===ui.territory?'#B07437':'#75878C',weight:id===ui.territory?3:1};},
   onEachFeature:(f,polygon)=>{const id=String(f.properties.territorio_id),v=comparisonMetric(rows[id],m,ui.level);polygon.bindTooltip(`<strong>${esc(f.properties.territorio_nombre)}</strong><br>${esc(COMPARISON_SCENARIOS[ui[side]])} · ${ui.year}<br>${sf.format(v)} ${unit()} respecto del tendencial`);polygon.on('click',()=>change({territory:id}));}
  }).addTo(maps[side]);
  $('cmp-map-title-'+side).textContent=metricTitle()+' · '+ui.year;
  $('cmp-legend-'+side).innerHTML=`<span class="cmp-zero-key"></span><span>0</span><span class="cmp-scale"></span><span>${df.format(maximum)} ${unit()}</span>`;
 }
 if(mapTerritory!==ui.territory){const geometry=ui.territory==='all'?data.departmentBoundaries:data.departmentBoundaries.features.find(f=>String(f.properties.territorio_id)===ui.territory);const bounds=L.geoJSON(geometry).getBounds();syncing=true;for(const map of Object.values(maps))map.fitBounds(bounds,{padding:[15,15],maxZoom:9,animate:false});syncing=false;mapTerritory=ui.territory;}
}
export function renderComparator(data){
 if(owner!==data||!model){owner=data;model=buildFutureTerritories(data);scaleCache.clear();}
 if(!ready)init(data);
 for(const key of ['territory','year','layer','impact','level'])$('cmp-'+key).value=ui[key];
 $('cmp-impact-control').hidden=ui.layer!=='impact';$('cmp-level-control').hidden=ui.layer!=='impact'||ui.impact!=='education';$('cmp-reset').hidden=ui.territory==='all';
 const name=ui.territory==='all'?'Toda la provincia':data.territoryById[ui.territory].territorio_nombre;
 $('cmp-context').textContent=`${name} · ${ui.year} · ${metricTitle()}. Ambos mapas comparten escala, vista y selección territorial.`;
 const series=Object.fromEntries(['a','b'].map(side=>[side,comparisonSeries(model,ui[side],ui.territory)]));
 const points=Object.fromEntries(['a','b'].map(side=>[side,series[side].find(r=>r.year===ui.year)]));
 const diff=comparisonDifference(points.a,points.b);
 $('cmp-difference-values').innerHTML=[[diff.mw,'MW en operación'],[diff.people,'personas'],[diff.education,'estudiantes potenciales']].map(([v,title])=>`<div><strong>${sf.format(v)}</strong><span>${title}</span></div>`).join('');
 const names=['a','b'].map(side=>COMPARISON_SCENARIOS[ui[side]]);
 $('active-scenario').textContent=names.join(' / ');$('active-selection').textContent=`${name} · ${ui.year}`;
 $('cmp-difference-story').textContent=ui.a===ui.b?`Ambos lados muestran ${names[0]}. Sus indicadores coinciden.`:`${names[1]} menos ${names[0]} · ${name} · ${ui.year}. Los indicadores educativos comparan el total de niveles.`;
 const educationDiffs=FUTURE_LEVELS.map(([key,title])=>({title,value:points.b.educationLevels[key]-points.a.educationLevels[key]}));
 const strongest=[...educationDiffs].sort((a,b)=>Math.abs(b.value)-Math.abs(a.value))[0];
 if(Math.abs(diff.education)>1e-7)$('cmp-difference-story').textContent+=` La mayor diferencia por nivel está en ${strongest.title}: ${sf.format(strongest.value)}.`;
 const popMax=Math.max(1,...Object.values(series).flatMap(rows=>rows.flatMap(r=>[r.base.population,r.populationTotal])))*1.06;
 const eduMax=Math.max(1,...Object.values(points).flatMap(p=>Object.values(p.educationLevels)))*1.25;
 for(const side of ['a','b']){
  const point=points[side],color=side==='a'?'#247C8C':'#A5662D',projects=ui[side]==='tendencial'?[]:model.scenarios[ui[side]].territories[ui.territory].projects;
  $('cmp-scenario-'+side).value=ui[side];
  const portfolio=projects.reduce((sum,r)=>sum+r.potencia_declarada_proyecto_mw,0);
  $('cmp-cart-'+side).textContent=`Cartera del período: ${projects.length} proyectos · ${df.format(portfolio)} MW. En operación en ${ui.year}: ${projects.filter(r=>r.operationYear<=ui.year).length} proyectos.`;
  $('cmp-indicators-'+side).innerHTML=`<div><small>MW incorporados en operación</small><strong>+${df.format(point.addedMw)}</strong><span>respecto del tendencial</span></div><div><small>Población total</small><strong>${nf.format(point.populationTotal)}</strong><span>+${df.format(point.people)} respecto del tendencial</span></div><div><small>Demanda educativa total</small><strong>${nf.format(point.educationTotal)}</strong><span>+${df.format(point.education)} estudiantes potenciales respecto del tendencial</span></div>`;
  const chart=$('cmp-population-'+side);
  Plotly.react(chart,[{name:'Tendencial',x:model.years,y:series[side].map(r=>r.base.population),line:{color:'#879197',width:2}},{name:names[side==='a'?0:1],x:model.years,y:series[side].map(r=>r.populationTotal),line:{color,width:3,dash:ui[side]==='tendencial'?'dot':'solid'}}].map(trace=>({type:'scatter',mode:'lines',hovertemplate:'%{x}: %{y:,.1f}<extra>%{fullData.name}</extra>',...trace})),{height:235,margin:{l:55,r:14,t:12,b:35},paper_bgcolor:'transparent',plot_bgcolor:'transparent',font:{family:'system-ui',size:11,color:'#465761'},showlegend:false,hovermode:'x unified',xaxis:{tickvals:[2026,2038,2050],tickformat:'d'},yaxis:{range:[0,popMax],title:'Personas',gridcolor:'#E5E0D6'},shapes:[{type:'line',x0:ui.year,x1:ui.year,y0:0,y1:popMax,line:{color:'#B07437',width:1,dash:'dot'}}]},{responsive:true,displayModeBar:false}).then(()=>{if(chart._comparisonClick)chart.removeListener('plotly_click',chart._comparisonClick);chart._comparisonClick=e=>{const year=Math.round(e.points?.[0]?.x);if(model.years.includes(year))change({year});};chart.on('plotly_click',chart._comparisonClick);});
  Plotly.react($('cmp-education-'+side),[{type:'bar',orientation:'h',x:FUTURE_LEVELS.map(([key])=>point.educationLevels[key]),y:FUTURE_LEVELS.map(([,title])=>title),marker:{color},text:FUTURE_LEVELS.map(([key])=>'+'+df.format(point.educationLevels[key])),textposition:'outside',textangle:0,cliponaxis:false,hovertemplate:'%{y}: +%{x:,.1f}<extra>Estudiantes potenciales</extra>'}],{height:220,margin:{l:145,r:42,t:10,b:30},paper_bgcolor:'transparent',plot_bgcolor:'transparent',font:{family:'system-ui',size:11,color:'#465761'},xaxis:{range:[0,eduMax],gridcolor:'#E5E0D6'},yaxis:{autorange:'reversed'}},{responsive:true,displayModeBar:false});
 }
 renderMaps(data);
}
