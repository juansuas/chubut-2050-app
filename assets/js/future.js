import {renderFutureStory} from './future-story.js?v=2.22.0';
import {futureValues,futurePeak,futureEducationTraces,futureChartRange,toggleFutureTerritory} from './future-view.js?v=2.22.0';
import {buildFutureTerritories,FUTURE_LEVELS,futurePhase} from './future-territories.js?v=2.18.0';
import {activitySymbol} from './production.js?v=2.16.0';

const nf=new Intl.NumberFormat('es-AR',{maximumFractionDigits:0}),df=new Intl.NumberFormat('es-AR',{maximumFractionDigits:2}),ef=new Intl.NumberFormat('es-AR',{maximumFractionDigits:1});
const colors={INI:'#D5A92A',PRI:'#63A6B1',SEC:'#247C8C',AGE18:'#8A5A44'};
const KEY='chubut2050.future.workspace';
const $=id=>document.getElementById(id),text=(id,value)=>{$(id).textContent=value;};
const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const percent=value=>value===null?'—':`+${df.format(value*100)} %`;
let model,owner,ready=false,map,territoryLayer,markers,mapScope=null,installation=null;
let ui={scenario:'moderado',territory:'all',year:2050,mode:'population',expanded:false,educationLevels:['INI','PRI','SEC','AGE18'],level:'all',eventMode:'both',tab:'territories',installations:false,rank:'current',mapMetric:'absolute'};
const current=()=>model.scenarios[ui.scenario].territories[ui.territory];
const point=()=>current().series.find(row=>row.year===ui.year);
const label=()=>ui.scenario==='moderado'?'Moderado':'Intensivo';
function save(){try{localStorage.setItem(KEY,JSON.stringify(ui));localStorage.setItem('chubut2050.future.preset',ui.scenario);}catch{}}
function change(patch){Object.assign(ui,patch);save();renderFuture(owner);}

function init(data){
  try{
    const saved=JSON.parse(localStorage.getItem(KEY))||{},preset=localStorage.getItem('chubut2050.future.preset');
    if(['moderado','intensivo'].includes(saved.scenario??preset))ui.scenario=saved.scenario??preset;
    if(saved.territory==='all'||data.territoryById[saved.territory])ui.territory=saved.territory;
    if(Number.isInteger(saved.year)&&saved.year>=2026&&saved.year<=2050)ui.year=saved.year;
    // The story opens with population; the comparison switch stays available.
    if(['all',...Object.keys(colors)].includes(saved.level))ui.level=saved.level;
    if(typeof saved.expanded==='boolean')ui.expanded=saved.expanded;
    if(Array.isArray(saved.educationLevels))ui.educationLevels=saved.educationLevels.filter(key=>key in colors);
    if(['both','construction','operation','none'].includes(saved.eventMode))ui.eventMode=saved.eventMode;
    if(['current','relative','peak'].includes(saved.rank))ui.rank=saved.rank;
    if(['absolute','relative'].includes(saved.mapMetric))ui.mapMetric=saved.mapMetric;
  }catch{}
  for(const [id,value] of Object.entries(data.territoryById).sort((a,b)=>a[1].territorio_nombre.localeCompare(b[1].territorio_nombre,'es'))) $('future-territory').add(new Option(value.territorio_nombre,id));
  for(const year of model.years)$('future-year').add(new Option(year,year));
  document.querySelectorAll('#escenarios [data-scenario]').forEach(button=>button.addEventListener('click',()=>change({scenario:button.dataset.scenario})));
  $('future-territory').addEventListener('change',event=>{installation=null;change({territory:event.target.value});});
  $('future-year').addEventListener('change',event=>change({year:Number(event.target.value)}));
  $('future-peak-year').addEventListener('click',()=>change({year:futurePeak(current().series,ui.mode,ui.level).year}));
  $('future-horizon').addEventListener('click',()=>change({year:2050}));
  document.querySelectorAll('[data-future-mode]').forEach(button=>button.addEventListener('click',()=>change({mode:button.dataset.futureMode})));
  $('future-expand-range').addEventListener('change',event=>change({expanded:event.target.checked}));
  document.querySelectorAll('[data-story-level]').forEach(input=>input.addEventListener('change',()=>change({educationLevels:[...document.querySelectorAll('[data-story-level]:checked')].map(el=>el.dataset.storyLevel)})));
  $('future-level').addEventListener('change',event=>change({level:event.target.value}));
  $('future-event-mode').addEventListener('change',event=>change({eventMode:event.target.value}));
  $('future-show-installations').addEventListener('change',event=>{installation=null;change({installations:event.target.checked});});
  $('future-reset-territory').addEventListener('click',()=>{installation=null;change({territory:'all'});});
  document.querySelectorAll('[data-future-tab]').forEach(button=>button.addEventListener('click',()=>change({tab:button.dataset.futureTab})));
  $('future-ranking-bars').addEventListener('click',event=>{const button=event.target.closest('[data-future-department]');if(button){installation=null;change({territory:button.dataset.futureDepartment,...(button.dataset.futureYear?{year:Number(button.dataset.futureYear)}:{})});}});
  $('future-rank').addEventListener('change',event=>change({rank:event.target.value}));
  $('future-map-metric').addEventListener('change',event=>change({mapMetric:event.target.value}));
  $('future-events').addEventListener('click',event=>{const button=event.target.closest('[data-future-year]');if(button)change({year:Number(button.dataset.futureYear)});});
  $('future-departments').addEventListener('click',event=>{
    const button=event.target.closest('[data-future-department]');if(!button)return;
    installation=null;change({territory:button.dataset.futureDepartment,...(button.dataset.futureYear?{year:Number(button.dataset.futureYear)}:{})});
  });
  $('future-installation-detail').addEventListener('click',event=>{const button=event.target.closest('[data-future-year]');if(button)change({year:Number(button.dataset.futureYear)});});
  ready=true;
}

function renderChart(data){
  const scope=current(),series=scope.series,values=series.map(row=>futureValues(row,ui.mode,ui.level));
  const unit=ui.mode==='population'?'Personas':'Estudiantes potenciales';
  const peak=futurePeak(series,ui.mode,ui.level),peakValue=futureValues(peak,ui.mode,ui.level).delta;
  const traces=[
    {name:'Tendencial',y:values.map(v=>v.base),line:{color:'#78848B',width:2}},
    {name:label()+' · con proyectos',y:values.map(v=>v.total),line:{color:'#176B7C',width:2.5,dash:'dot'},fill:'tonexty',fillcolor:'rgba(36,124,140,.14)'},
    {name:'Diferencia adicional',y:values.map(v=>v.delta),yaxis:'y2',line:{color:'#176B7C',width:2},fill:'tozeroy',fillcolor:'rgba(36,124,140,.16)'}
  ].map(trace=>({type:'scatter',mode:'lines',x:model.years,hovertemplate:'%{y:,.1f}<extra>%{fullData.name}</extra>',...trace}));
  if(ui.mode==='education'){const selected=FUTURE_LEVELS.filter(([key])=>ui.level==='all'||key===ui.level);traces.splice(0,2,...futureEducationTraces(series,selected,label()).map(t=>({...t,hovertemplate:'%{x}: %{y:,.1f}<extra>%{fullData.name}</extra>'})));}
  const plotted=traces.filter(t=>!t.yaxis).flatMap(t=>t.y);
  $('future-chart-legend').innerHTML=(ui.mode==='population'?'<span class="future-key base">Tendencial</span><span class="future-key scenario">Con proyectos · punteada</span>':FUTURE_LEVELS.filter(([key])=>ui.level==='all'||key===ui.level).map(([key,title])=>`<span class="future-level-key" style="--level-color:${colors[key]}">${title}</span>`).join('')+'<span>Continua: tendencial · punteada: escenario</span>')+(ui.eventMode==='none'?'':`${['both','construction'].includes(ui.eventMode)?'<span class="future-event-key construction">◆ Inicio de obra</span>':''}${['both','operation'].includes(ui.eventMode)?'<span class="future-event-key operation">▲ Entrada en operación</span>':''}`);
  const shapes=[{type:'line',xref:'x',yref:'paper',x0:ui.year,x1:ui.year,y0:0,y1:1,line:{color:'#1F2933',width:1.5}}];
  for(const phase of ['construction','operation']){
    if(ui.eventMode==='none'||!['both',phase].includes(ui.eventMode))continue;
    const groups=scope.events.map(event=>({...event,items:event.items.filter(item=>item.phase===phase)})).filter(event=>event.items.length);
    for(const event of groups)shapes.push({type:'line',xref:'x',yref:'paper',x0:event.year,x1:event.year,y0:0,y1:1,line:{color:phase==='construction'?'rgba(176,116,55,.3)':'rgba(36,124,140,.3)',width:1,dash:phase==='construction'?'dot':'dash'},layer:'below'});
    traces.push({type:'scatter',mode:'markers',x:groups.map(e=>e.year),y:groups.map(()=>phase==='construction'?.3:.75),yaxis:'y3',name:phase==='construction'?'Inicio de obra':'Entrada en operación',marker:{size:8,symbol:phase==='construction'?'diamond':'triangle-up',color:phase==='construction'?'#B07437':'#247C8C'},text:groups.map(e=>e.items.map(i=>escape(i.project.nombre_instalacion)+' · '+escape(i.project.departamento_nombre)).join('<br>')),hovertemplate:'%{x}<br>%{text}<extra>%{fullData.name}</extra>'});
  }
  const chart=$('future-coordinated-chart');
  Plotly.react(chart,traces,{
    height:480,margin:{l:72,r:22,t:25,b:42},paper_bgcolor:'transparent',plot_bgcolor:'transparent',font:{family:'Inter, system-ui, sans-serif',color:'#1F2933',size:12},hovermode:'x unified',showlegend:false,
    xaxis:{range:[2025.6,2050.4],tickvals:[2026,2030,2035,2040,2045,2050],tickformat:'d',anchor:'y2',title:'Año · seleccioná un punto para consultar'},
    yaxis:{domain:[.43,1],...futureChartRange(plotted,ui.expanded),gridcolor:'#E5E0D6',automargin:true,title:unit},
    yaxis2:{domain:[0,.23],rangemode:'tozero',gridcolor:'#E5E0D6',automargin:true,title:'Adicional'},
    yaxis3:{domain:[.31,.38],range:[0,1],visible:false,fixedrange:true},shapes,
    annotations:[{xref:'paper',yref:'paper',x:0,y:.27,xanchor:'left',showarrow:false,text:'Diferencia respecto del tendencial',font:{size:12,color:'#14586A'}},...(peakValue>0?[{xref:'x',yref:'y2',x:peak.year,y:peakValue,text:'Máximo +'+nf.format(peakValue)+' · '+peak.year,showarrow:true,arrowhead:2,ax:peak.year>2042?-65:60,ay:-22,bgcolor:'#ffffff'}]:[])]
  },{responsive:true,displayModeBar:false}).then(()=>{
    if(chart._futureClick)chart.removeListener('plotly_click',chart._futureClick);
    chart._futureClick=event=>{const year=Math.round(Number(event.points?.[0]?.x));if(year>=2026&&year<=2050)change({year});};chart.on('plotly_click',chart._futureClick);
  });
  $('future-events').innerHTML=scope.events.map(event=>`<button type="button" class="text-button" data-future-year="${event.year}" aria-pressed="${event.year===ui.year}">${event.year} · ${event.items.length} ${event.items.length===1?'hito':'hitos'}</button>`).join('')||'<p>No hay hitos productivos en este territorio.</p>';
  const events=scope.events.find(event=>event.year===ui.year)?.items||[];
  const active=scope.projects.filter(project=>futurePhase(project,ui.year)==='construction'),online=scope.projects.filter(project=>futurePhase(project,ui.year)==='operation');
  $('future-event-detail').innerHTML=`<strong>${ui.year}: ${active.length} proyectos en obra y ${online.length} en operación.</strong>`+(events.length?'<ul>'+events.map(item=>`<li>${item.phase==='construction'?'Empieza la obra':'Entra en operación'}: ${escape(item.project.nombre_instalacion)} · ${escape(item.project.departamento_nombre)} · ${df.format(item.project.potencia_declarada_proyecto_mw)} MW.</li>`).join('')+'</ul>':' No hay un inicio de obra o entrada en operación programado en este año.');
}

function renderMap(data){
  if(!map){
    map=L.map('fp-map',{scrollWheelZoom:false});L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{attribution:'© OpenStreetMap',maxZoom:16}).addTo(map);
    new ResizeObserver(()=>map.invalidateSize()).observe($('fp-map'));
  }
  if(territoryLayer)map.removeLayer(territoryLayer);if(markers)map.removeLayer(markers);
  const scopes=model.scenarios[ui.scenario].territories;
  const values=Object.fromEntries(model.ids.map(id=>{const p=scopes[id].series.find(row=>row.year===ui.year);return [id,ui.mapMetric==='absolute'?p.education:p.relative];}));
  const maximum=Math.max(0,...Object.values(model.scenarios).flatMap(scenario=>model.ids.flatMap(id=>scenario.territories[id].series.map(p=>(ui.mapMetric==='absolute'?p.education:p.relative)??0))));
  territoryLayer=L.geoJSON(data.departmentBoundaries,{
    style:feature=>{const id=String(feature.properties.territorio_id),value=values[id];return {fillColor:'#247C8C',fillOpacity:value===null||value===0?.04:.13+.7*value/(maximum||1),color:id===ui.territory?'#B9472F':'#697780',weight:id===ui.territory?3:1};},
    onEachFeature:(feature,polygon)=>{const id=String(feature.properties.territorio_id),p=scopes[id].series.find(row=>row.year===ui.year);
      polygon.bindTooltip(`<strong>${escape(feature.properties.territorio_nombre)} · ${ui.year}</strong><br>+${ef.format(p.education)} estudiantes potenciales<br>${percent(p.relative)} frente al tendencial local`);
      polygon.on('click',()=>{installation=null;change({territory:toggleFutureTerritory(ui.territory,id)});});
    }
  }).addTo(map);
  markers=L.layerGroup().addTo(map);
  const projects=new Map(model.scenarios[ui.scenario].territories.all.projects.map(project=>[project.instalacion_id,project]));
  const scopedRows=data.productionInstallations.filter(row=>(ui.territory==='all'||row.departamento_id===ui.territory)&&(row.estado_id==='OPERATIVO'||projects.has(row.instalacion_id)));
  let missingProjects=0,located=0;
  for(const row of scopedRows){
    const project=projects.get(row.instalacion_id);
    if(!Number.isFinite(row.latitud)||!Number.isFinite(row.longitud)){if(project)missingProjects++;continue;}
    located++;
    if(!ui.installations)continue;
    const phase=project?futurePhase(project,ui.year):'observed';
    const color=phase==='construction'?'#FF6B35':phase==='operation'?'#247C8C':phase==='planned'?'#14586A':'#78888C';
    const phaseLabel={construction:'En construcción',operation:'En operación',planned:'Proyecto futuro',observed:'Base operativa'}[phase];
    const icon=L.divIcon({className:'future-div-icon',html:`<span class="future-marker phase-${phase}" style="--future-marker:${color}">${activitySymbol(row.actividad_id)}</span>`,iconSize:[25,25],iconAnchor:[12,12]});
    L.marker([row.latitud,row.longitud],{icon,title:`${row.nombre_instalacion} · ${phaseLabel}`,keyboard:true}).bindTooltip(`<strong>${escape(row.nombre_instalacion)}</strong><br>${phaseLabel} · ${escape(row.departamento_nombre)}${project?`<br>Obra ${project.startYear}–${project.operationYear-1} · operación ${project.operationYear}`:''}`).on('click',()=>{const repeated=installation===row.instalacion_id;installation=repeated?null:row.instalacion_id;change({territory:repeated?'all':row.departamento_id});}).addTo(markers);
  }
  if(mapScope!==ui.territory){const geometry=ui.territory==='all'?data.departmentBoundaries:data.departmentBoundaries.features.find(feature=>String(feature.properties.territorio_id)===ui.territory);const bounds=L.geoJSON(geometry).getBounds();if(bounds.isValid())map.fitBounds(bounds,{padding:[16,16],maxZoom:9});mapScope=ui.territory;}
  const p=point();text('fp-local',`${ui.territory==='all'?'Toda la provincia':data.territoryById[ui.territory].territorio_nombre} · ${ui.year}: tendencial ${ef.format(p.base.education)}, escenario ${ef.format(p.educationTotal)}, diferencia +${ef.format(p.education)} (${percent(p.relative)}).`);
  text('future-map-note',`${ui.installations?`${located} instalaciones y proyectos localizados. ${missingProjects} proyectos seleccionados sin coordenadas permanecen en los cálculos y el calendario. `:''}Escala de color fija entre escenarios y años: ${ui.mapMetric==='absolute'?`0–${ef.format(maximum)} estudiantes adicionales`:`0–${df.format(maximum*100)} % de variación local`}.`);
  $('future-map-legend').hidden=!ui.installations;
  const record=installation?data.productionInstallations.find(row=>row.instalacion_id===installation):null;
  $('future-installation-detail').hidden=!record;
  if(record){const project=projects.get(record.instalacion_id);$('future-installation-detail').innerHTML=`<strong>${escape(record.nombre_instalacion)}</strong><p>${escape(record.actividad_nombre)} · ${escape(record.departamento_nombre)} · ${project?`${df.format(project.potencia_declarada_proyecto_mw)} MW de proyecto`:`${df.format(record.capacidad_instalada_mw)} MW instalados conocidos`}</p>`+(project?`<p>Obra: ${project.startYear}–${project.operationYear-1}. Operación: ${project.operationYear}.</p><button type="button" class="text-button" data-future-year="${project.startYear}">Ver inicio de obra</button> <button type="button" class="text-button" data-future-year="${project.operationYear}">Ver operación</button>`:'');}
  requestAnimationFrame(()=>map.invalidateSize());
}

function renderRanking(data){
  const scopes=model.scenarios[ui.scenario].territories;
  const ranking=model.ids.map(id=>({id,scope:scopes[id],p:scopes[id].series.find(row=>row.year===ui.year)}));
  const order=row=>ui.rank==='relative'?(row.p.relative??-1):ui.rank==='peak'?row.scope.peak.education:row.p.education;
  ranking.sort((a,b)=>order(b)-order(a)||data.territoryById[a.id].territorio_nombre.localeCompare(data.territoryById[b.id].territorio_nombre,'es'));
  const max=Math.max(...ranking.map(order),1);
  $('future-ranking-bars').innerHTML=ranking.map(({id,scope,p})=>{const v=order({id,scope,p});return `<button type="button" class="future-bar-row ${id===ui.territory?'is-selected':''}" data-future-department="${id}" ${ui.rank==='peak'&&scope.peak.education>0?`data-future-year="${scope.peak.year}"`:''}><span>${escape(data.territoryById[id].territorio_nombre)}</span><span class="future-bar-track"><i style="width:${Math.max(0,v)/max*100}%"></i></span><strong>${ui.rank==='relative'?percent(p.relative):'+'+ef.format(v)}${ui.rank==='peak'&&v>0?' · '+scope.peak.year:''}</strong></button>`;}).join('');
  $('future-departments').innerHTML=ranking.map(({id,scope,p})=>`<tr class="${id===ui.territory?'is-selected':''}"><th scope="row"><button type="button" data-future-department="${id}">${escape(data.territoryById[id].territorio_nombre)}</button></th><td class="number">${ef.format(p.base.education)}</td><td class="number">+${ef.format(p.education)}</td><td class="number">${percent(p.relative)}</td><td>${scope.peak.education>0?`<button type="button" data-future-department="${id}" data-future-year="${scope.peak.year}">+${ef.format(scope.peak.education)} · ${scope.peak.year}</button>`:'Sin incremento'}</td></tr>`).join('');
  const scope=current(),p=point(),name=ui.territory==='all'?'La provincia':data.territoryById[ui.territory].territorio_nombre;
  text('future-department-story',`${name}, ${ui.year}: +${ef.format(p.education)} estudiantes potenciales (${percent(p.relative)} sobre su tendencial). ${scope.peak.education>0?`Máximo local: +${ef.format(scope.peak.education)} en ${scope.peak.year} (${percent(scope.peak.relative)} sobre el tendencial de ese año).`:`Sin incremento por proyectos durante el período.`} Estos valores no son estudiantes nuevos acumulados entre años.`);
}

export function renderFuture(data){
  if(owner!==data||!model){owner=data;model=buildFutureTerritories(data);}
  if(!ready)init(data);
  const scope=current(),p=point(),name=ui.territory==='all'?'Toda la provincia':data.territoryById[ui.territory].territorio_nombre;
  $('future-expand-range').checked=ui.expanded;
  document.querySelectorAll('[data-story-level]').forEach(input=>input.checked=ui.educationLevels.includes(input.dataset.storyLevel));
  $('future-territory').value=ui.territory;$('future-year').value=ui.year;
  $('future-rank').value=ui.rank;$('future-map-metric').value=ui.mapMetric;
  $('future-level').value=ui.level;$('future-level-control').hidden=ui.mode!=='education';$('future-event-mode').value=ui.eventMode;
  $('future-show-installations').checked=ui.installations;$('future-reset-territory').hidden=ui.territory==='all';
  document.querySelectorAll('[data-future-mode]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.futureMode===ui.mode)));
  document.querySelectorAll('[data-future-tab]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.futureTab===ui.tab)));
  document.querySelectorAll('[data-future-panel]').forEach(panel=>panel.hidden=panel.dataset.futurePanel!==ui.tab);
  document.querySelectorAll('#escenarios [data-scenario]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.scenario===ui.scenario)));
  document.querySelectorAll('#escenarios .fp-scenario-name').forEach(element=>element.textContent=label());
  const view=futureValues(p,ui.mode,ui.level),peak=futurePeak(scope.series,ui.mode,ui.level),peakView=futureValues(peak,ui.mode,ui.level);
  const unit=ui.mode==='population'?'personas':'estudiantes potenciales';
  const title=ui.mode==='population'?'Población total':`Demanda educativa · ${ui.level==='all'?'todos los niveles':FUTURE_LEVELS.find(([key])=>key===ui.level)[1]}`;
  text('future-context-caption',`${name} · ${label()} · año de lectura ${ui.year}`);
  text('future-detail-context',`${name} · ${ui.year} · ${label()}. Comparación territorial: todos los departamentos y niveles educativos. La apertura por nivel corresponde al territorio seleccionado.`);
  const selectedDelta=ef.format(view.delta),selectedBase=nf.format(view.base);
  text('future-overlap-note',view.delta===0?`En ${ui.year} las curvas coinciden: el incremento calculado es cero. ${ui.expanded?'El eje vertical está ampliado y no comienza necesariamente en cero.':''}`:`En ${ui.year}: +${selectedDelta} sobre ${selectedBase} (${percent(view.relative)}). Las diferencias pequeñas pueden quedar superpuestas a esta escala; consultá la franja adicional. ${ui.expanded?'El eje vertical está ampliado y no comienza necesariamente en cero.':''}`);
  text('future-chart-title',title);text('future-reading-title',`${name} · ${ui.year} · ${unit}`);
  text('fp-education-base',nf.format(view.base));text('fp-education',nf.format(view.total));text('fp-education-delta','+'+ef.format(view.delta));text('future-relative',percent(view.relative)+' sobre el tendencial');
  $('future-peak-year').disabled=peakView.delta<=0;
  text('future-peak-caption',peakView.delta>0?`Máximo adicional: +${ef.format(peakView.delta)} ${unit} en ${peak.year}. En 2050: +${ef.format(futureValues(scope.final,ui.mode,ui.level).delta)}.`:'Sin incremento por proyectos en esta selección.');
  text('future-project-context',`${scope.projects.length} proyectos del escenario en ${name}. En ${ui.year}: +${nf.format(p.people)} personas y ${df.format(p.addedMw)} MW incorporados en operación. Calendario hipotético.`);
  const levelMax=Math.max(1,...Object.values(p.educationLevels));
  $('future-level-bars').innerHTML=FUTURE_LEVELS.map(([key,title])=>`<div class="future-bar-row"><span>${title}</span><span class="future-bar-track"><i style="width:${p.educationLevels[key]/levelMax*100}%"></i></span><strong>+${ef.format(p.educationLevels[key])}</strong></div>`).join('');
  $('fp-levels').innerHTML=FUTURE_LEVELS.map(([key,title])=>`<tr><th scope="row">${title}</th><td class="number">${nf.format(p.base.ages[key])}</td><td class="number">${p.base.ages[key]>0?df.format(p.base.levels[key]/p.base.ages[key]*100)+' %':'—'}</td><td class="number">${ef.format(p.base.levels[key])}</td><td class="number">${ef.format(p.scenarioLevels[key])}</td><td class="number">+${ef.format(p.educationLevels[key])}</td></tr>`).join('');
  $('fp-project-detail').innerHTML=scope.projects.slice().sort((a,b)=>a.operationYear-b.operationYear).map(project=>`<tr><td>${escape(project.nombre_instalacion)}</td><td>${escape(project.departamento_nombre)}</td><td class="number">${df.format(project.potencia_declarada_proyecto_mw)}</td><td>${project.startYear}–${project.operationYear-1}</td><td>${project.operationYear}</td></tr>`).join('')||'<tr><td colspan="5">No hay proyectos del escenario en este territorio.</td></tr>';
  renderChart(data);renderMap(data);renderRanking(data);renderFutureStory(data,model,ui,change);
}
