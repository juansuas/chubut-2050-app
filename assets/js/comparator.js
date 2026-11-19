import {buildFutureTerritories,FUTURE_LEVELS} from './future-territories.js?v=2.30.0';
import {COMPARISON_SCENARIOS,comparisonSeries,comparisonMetric,comparisonDifference,comparisonMaximum} from './comparator-model.js?v=2.30.0';
const $=id=>document.getElementById(id),nf=new Intl.NumberFormat('es-AR',{maximumFractionDigits:0}),df=new Intl.NumberFormat('es-AR',{maximumFractionDigits:1}),sf=new Intl.NumberFormat('es-AR',{maximumFractionDigits:1,signDisplay:'exceptZero'});
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const KEY='chubut2050.comparator.v2',maps={},layers={},scaleCache=new Map();
let owner,model,ready=false,mapTerritory=null,syncing=false;
const SLOTS=['a','b','c','d'];
const visibleSlots=()=>ui.columns===4?SLOTS:['a','d'];
let ui={columns:4,a:'tendencial',b:'moderado',c:'intensivo',d:'total',territory:'all',year:2050,layer:'productive',impact:'population',level:'all'};
function change(patch){Object.assign(ui,patch);try{localStorage.setItem(KEY,JSON.stringify(ui));}catch{}renderComparator(owner);}
const metric=()=>ui.layer==='productive'?'mw':ui.impact;
const unit=()=>metric()==='mw'?'MW':metric()==='population'?'personas':'estudiantes potenciales';
const selectedLevel=()=>ui.level==='all'?'Todos los niveles':FUTURE_LEVELS.find(([key])=>key===ui.level)[1];
const metricTitle=()=>metric()==='mw'?'MW adicionales en operación':metric()==='population'?'Población adicional':`Demanda educativa adicional · ${selectedLevel()}`;
function init(data){
 try{const saved=JSON.parse(localStorage.getItem(KEY)||localStorage.getItem('chubut2050.comparator.v1'))||{};if([2,4].includes(saved.columns)){ui.columns=saved.columns;for(const side of SLOTS)if(Object.hasOwn(COMPARISON_SCENARIOS,saved[side]))ui[side]=saved[side];}if(saved.territory==='all'||Object.hasOwn(data.territoryById,saved.territory))ui.territory=saved.territory;if(Number.isInteger(saved.year)&&saved.year>=2026&&saved.year<=2050)ui.year=saved.year;if(['productive','impact'].includes(saved.layer))ui.layer=saved.layer;if(['population','education'].includes(saved.impact))ui.impact=saved.impact;if(['all',...FUTURE_LEVELS.map(([key])=>key)].includes(saved.level))ui.level=saved.level;}catch{}
 for(const [id,r] of Object.entries(data.territoryById).sort((a,b)=>a[1].territorio_nombre.localeCompare(b[1].territorio_nombre,'es')))$('cmp-territory').add(new Option(r.territorio_nombre,id));
 for(const year of model.years)$('cmp-year').add(new Option(year,year));
 for(const side of SLOTS)$('cmp-scenario-'+side).addEventListener('change',e=>change({[side]:e.target.value}));
 for(const key of ['territory','year','layer','impact','level'])$('cmp-'+key).addEventListener('change',e=>change({[key]:key==='year'?Number(e.target.value):e.target.value}));
 $('cmp-columns').addEventListener('change',e=>change({columns:Number(e.target.value)}));
 $('cmp-reset').addEventListener('click',()=>change({territory:'all'}));ready=true;
}
function renderMaps(data){
 const m=metric(),key=m+':'+ui.level;
 if(!scaleCache.has(key))scaleCache.set(key,comparisonMaximum(model,m,ui.level));
 const maximum=scaleCache.get(key);
 for(const side of visibleSlots()){
  if(!maps[side]){
   const map=maps[side]=L.map('cmp-map-'+side,{scrollWheelZoom:false});
   L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap',maxZoom:16}).addTo(map);
   new ResizeObserver(()=>map.invalidateSize()).observe($('cmp-map-'+side));
   map.on('moveend',()=>{if(syncing)return;const center=map.getCenter();syncing=true;try{for(const [otherSide,other] of Object.entries(maps)){if(otherSide===side)continue;if(other.getZoom()===map.getZoom()&&other.getCenter().equals(center,1e-7))continue;other.setView(center,map.getZoom(),{animate:false});}}finally{syncing=false;}});
  }
  if(layers[side])maps[side].removeLayer(layers[side]);
  const rows=Object.fromEntries(model.ids.map(id=>[id,comparisonSeries(model,ui[side],id).find(r=>r.year===ui.year)]));
  layers[side]=L.geoJSON(data.departmentBoundaries,{
   style:f=>{const id=String(f.properties.territorio_id),v=comparisonMetric(rows[id],m,ui.level);return {fillColor:v>0?'#247C8C':'#F4F4EF',fillOpacity:v>0?.2+.65*v/(maximum||1):.6,color:id===ui.territory?'#B07437':'#75878C',weight:id===ui.territory?3:1};},
   onEachFeature:(f,polygon)=>{const id=String(f.properties.territorio_id),v=comparisonMetric(rows[id],m,ui.level);polygon.bindTooltip(`<strong>${esc(f.properties.territorio_nombre)}</strong><br>${esc(COMPARISON_SCENARIOS[ui[side]])} · ${ui.year}<br>${sf.format(v)} ${unit()} respecto del tendencial`);polygon.on('click',()=>change({territory:ui.territory===id?'all':id}));}
  }).addTo(maps[side]);
  $('cmp-map-title-'+side).textContent=COMPARISON_SCENARIOS[ui[side]]+' · '+metricTitle()+' · '+ui.year;
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
 document.body.classList.toggle('comparator-wide',ui.columns===4);
 $('cmp-columns').value=ui.columns;$('cmp-columns-grid').dataset.columns=ui.columns;
 for(const side of SLOTS)document.querySelector(`[data-cmp-side="${side}"]`).hidden=!visibleSlots().includes(side);
 $('cmp-difference').hidden=ui.columns===4;
 $('cmp-context').textContent=`${name} · ${ui.year} · ${metricTitle()}. Los ${ui.columns===4?'cuatro':'dos'} mapas comparten escala y posición. Las cifras adicionales se comparan con el tendencial.`;
 const points=Object.fromEntries(visibleSlots().map(side=>[side,comparisonSeries(model,ui[side],ui.territory).find(r=>r.year===ui.year)]));
 const names=visibleSlots().map(side=>COMPARISON_SCENARIOS[ui[side]]);
 $('active-scenario').textContent=names.join(' / ');$('active-selection').textContent=`${name} · ${ui.year}`;
 if(ui.columns===2){
  const diff=comparisonDifference(points.a,points.d);
  $('cmp-difference-values').innerHTML=[[diff.mw,'MW en operación'],[diff.people,'personas'],[diff.education,'estudiantes potenciales']].map(([v,title])=>`<div><strong>${sf.format(v)}</strong><span>${title}</span></div>`).join('');
  $('cmp-difference-story').textContent=ui.a===ui.d?`Los dos lados muestran ${names[0]}. Sus indicadores coinciden.`:`${names[1]} menos ${names[0]} · ${name} · ${ui.year}. La comparación educativa reúne todos los niveles.`;
 }
 const eduMax=Math.max(1,...Object.values(points).flatMap(p=>Object.values(p.educationLevels)));
 for(const side of visibleSlots()){
  const point=points[side],color={a:'#247C8C',b:'#416AA3',c:'#8A5A44',d:'#7E4C81'}[side],projects=ui[side]==='tendencial'?[]:model.scenarios[ui[side]].territories[ui.territory].projects;
  const title=COMPARISON_SCENARIOS[ui[side]];
  $('cmp-scenario-'+side).value=ui[side];$('cmp-title-'+side).textContent=title;
  $('cmp-scenario-'+side).parentElement.firstChild.textContent='Escenario de la columna '+(visibleSlots().indexOf(side)+1);
  document.querySelector(`[data-cmp-side="${side}"]`).style.setProperty('--comparison-color',color);
  $('cmp-map-'+side).setAttribute('aria-label',`Mapa departamental · ${title}`);
  $('cmp-education-'+side).setAttribute('aria-label',`Demanda adicional por nivel · ${title}`);
  const portfolio=projects.reduce((sum,r)=>sum+r.potencia_declarada_proyecto_mw,0);
  $('cmp-cart-'+side).textContent=`Cartera: ${projects.length} proyectos · ${df.format(portfolio)} MW. En operación: ${projects.filter(r=>r.operationYear<=ui.year).length}.`;
  $('cmp-indicators-'+side).innerHTML=`<div><small>MW incorporados en operación</small><strong>${sf.format(point.addedMw)}</strong><span>respecto del tendencial</span></div><div><small>Población total</small><strong>${nf.format(point.populationTotal)}</strong><span>${sf.format(point.people)} respecto del tendencial</span></div><div><small>Demanda educativa total</small><strong>${nf.format(point.educationTotal)}</strong><span>${sf.format(point.education)} respecto del tendencial</span></div>`;
  $('cmp-education-'+side).innerHTML=FUTURE_LEVELS.map(([key,label])=>`<div class="cmp-level-row"><div><span>${label}</span><strong>${sf.format(point.educationLevels[key])}</strong></div><div class="cmp-level-track"><span style="width:${point.educationLevels[key]/eduMax*100}%;background:${color}"></span></div></div>`).join('');
 }
 renderMaps(data);
 requestAnimationFrame(()=>{for(const side of visibleSlots())maps[side].invalidateSize({pan:false});});
}
