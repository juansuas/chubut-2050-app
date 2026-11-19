import {presetPatch,scenarioPopulation,SCENARIO_NAMES} from './scenario-population.js?v=2.29.0';
import {renderFutureCapacity} from './future-capacity.js?v=2.29.0';
import {initPageLayout,closeMobileSidebar} from './page-layout.js?v=2.29.0';
import {renderComparator} from './comparator.js?v=2.29.0';
import {renderFuture} from './future.js?v=2.29.0';
import {COLORS,DEFAULT_CAPACITY_THRESHOLDS,fmt,pct} from './config.js?v=2.29.0';
import {getState,setState,subscribe,resetState} from './state.js?v=2.29.0';
import {initRouter} from './router.js?v=2.29.0';
import {loadCoreData,loadDemographyData,loadCapacityData,loadProductionData,loadMigrationEducationData,loadFutureScenarioData} from './data.js?v=2.29.0';
import {renderDemographyMap} from './maps.js?v=2.29.0';
import {renderDemographyChart,renderPopulationPyramid,renderDepartmentShareChart,renderGrowthPolesChart} from './charts.js?v=2.29.0';
import {downloadCSV} from './exports.js?v=2.29.0';
import {demographyTerritoryName,demographySexLabel,demographyRows,demographyMapStats,populationTotal,totalForRange} from './demography.js?v=2.29.0';
import {POLICY_GROUPS,initialScenarioRates,currentRate,parameterRate,projectedSections,aggregateCapacity,groupForId} from './scenario-model.js?v=2.29.0';
import {renderSchoolCapacityMap,renderPotentialDemandEvolution,renderAttendanceDumbbell,renderOccupancyDistribution,renderDepartmentOccupancyComparison,schoolName,categorySummary} from './capacity.js?v=2.29.0';
import {initFloatingPanels,setPanelSummary} from './floating-panels.js?v=2.29.0';
import {filteredProductionRows,productionFilterOptions,renderProduction} from './production.js?v=2.29.0';
import {renderProductiveScenario,eligibleProject,START_YEAR,END_YEAR} from './productive-scenario.js?v=2.29.0';
import {initProductionWorkspace,productionView,syncProductionWorkspace} from './production-workspace.js?v=2.29.0';
import {renderMigrationEducation} from './migration-education.js?v=2.29.0';

let data={},timer=null,renderFrame=null,routeToken=0,capacityControlsReady=false,productionControlsReady=false,productiveScenarioControlsReady=false,lastProductionSignature='';
const $=s=>document.querySelector(s);
const selections=[
  ['all','Total / todos'],['level:INI','Inicial · nivel completo'],['group:0_3','↳ 0–3 años'],['group:4_5','↳ 4–5 años'],
  ['level:PRI','Primario · nivel completo'],['group:6_11','↳ 6–11 años'],['level:SEC','Secundario · nivel completo'],
  ['group:12_14','↳ 12–14 años'],['group:15_17','↳ 15–17 años'],['group:18_SEC','18 años']
];
const selectionLabel=value=>(selections.find(x=>x[0]===value)?.[1]||'Todos').replace(/^↳\s*/, '');
const selectOptions=()=>`<option value="all">Total / todos</option>
  <optgroup label="Inicial"><option class="level-total-option" value="level:INI">Inicial · total del nivel</option><option value="group:0_3">↳ 0–3 años</option><option value="group:4_5">↳ 4–5 años</option></optgroup>
  <optgroup label="Primario"><option class="level-total-option" value="level:PRI">Primario · total del nivel</option><option value="group:6_11">↳ 6–11 años</option></optgroup>
  <optgroup label="Secundario"><option class="level-total-option" value="level:SEC">Secundario · total del nivel</option><option value="group:12_14">↳ 12–14 años</option><option value="group:15_17">↳ 15–17 años</option></optgroup>
  <option value="group:18_SEC">18 años</option>`;
const territories=()=>Object.entries(data.territoryById).map(([value,x])=>({value,label:x.territorio_nombre})).sort((a,b)=>a.label.localeCompare(b.label,'es'));
function populateTerritory(el){el.innerHTML='<option value="all">Toda la provincia</option>'+territories().map(x=>`<option value="${x.value}">${x.label}</option>`).join('');}
function fillSelect(el,firstLabel,options,{includeMissing=false}={}){el.innerHTML='';const first=document.createElement('option');first.value='all';first.textContent=firstLabel;el.appendChild(first);if(includeMissing){const missing=document.createElement('option');missing.value='__missing__';missing.textContent='Sin informar';el.appendChild(missing);}options.forEach(item=>{const option=document.createElement('option');option.value=item.value;option.textContent=item.label;el.appendChild(option);});}

function setupProductionControls(){
  if(productionControlsReady||!data.productionInstallations)return;
  populateTerritory($('#product-territory'));
  const options=productionFilterOptions(data);
  fillSelect($('#product-activity'),'Todas las actividades',options.activities);
  fillSelect($('#product-operator'),'Todos los operadores',options.operators,{includeMissing:true});
  fillSelect($('#product-status'),'Todos los estados',options.statuses);
  $('#product-territory').addEventListener('change',event=>setState({scenarioPopulationDepartment:event.target.value,productInstallation:''}));
  $('#product-activity').addEventListener('change',event=>setState({productActivity:event.target.value,productInstallation:''}));
  $('#product-operator').addEventListener('change',event=>setState({productOperator:event.target.value,productInstallation:''}));
  $('#product-status').addEventListener('change',event=>setState({productStatus:event.target.value,productInstallation:''}));
  $('#production-table').addEventListener('click',event=>{const button=event.target.closest('[data-product-installation]');if(button)setState({productInstallation:button.dataset.productInstallation});});
  $('#scenario-projects').addEventListener('click',event=>{
    const inventory=event.target.closest('[data-inventory-activity]');
    if(inventory){setState({productActivity:inventory.dataset.inventoryActivity,productOperator:'all',productStatus:'all',productInstallation:''});$('#production-tab-inventory').click();return;}
    const button=event.target.closest('[data-product-installation]');
    if(button)setState({productInstallation:button.dataset.productInstallation});
  });
  $('#production-close-detail').addEventListener('click',()=>setState({productInstallation:''}));
  $('#production-clear-filters').addEventListener('click',()=>setState({productActivity:'all',productOperator:'all',productStatus:'all',productInstallation:''}));
  $('#production-download').addEventListener('click',exportFiltered);
  initProductionWorkspace(()=>{lastProductionSignature='';scheduleRender();});
  productionControlsReady=true;
}

function setupProductiveScenarioControls(){
  if(productiveScenarioControlsReady||!data.productionInstallations)return;
  const resultsYear=$('#scenario-impact-year');
  for(let year=START_YEAR;year<=END_YEAR;year++)resultsYear.add(new Option(year,year));
  resultsYear.addEventListener('change',event=>setState({scenarioImpactYear:Number(event.target.value)}));
  $('#scenario-include-construction').addEventListener('click',()=>setState({activeScenario:'personalizado',scenarioIncludeConstruction:!getState().scenarioIncludeConstruction}));
  $('#scenario-include-related').addEventListener('change',event=>setState({activeScenario:'personalizado',scenarioIncludeRelated:event.target.checked}));
  $('#scenario-include-people').addEventListener('change',event=>setState({activeScenario:'personalizado',scenarioIncludePeople:event.target.checked}));
  $('#scenario-external-percent').addEventListener('change',event=>{
    const input=event.target;
    if(input.value===''||!input.checkValidity()){
      input.reportValidity();
      return;
    }
    setState({activeScenario:'personalizado',scenarioExternalPercent:Number(input.value)});
  });
  $('#scenario-project-filter').addEventListener('change',event=>setState({scenarioProjectFilter:event.target.value}));
  $('#scenario-projects').addEventListener('change',event=>{
    const input=event.target,id=input.dataset.projectCheck||input.dataset.projectYear;
    const row=data.productionInstallations.find(row=>row.instalacion_id===id);
    if(!row||!eligibleProject(row))return;
    const scenarioProjects={...getState().scenarioProjects};
    if(input.dataset.projectCheck&&!input.checked)delete scenarioProjects[id];
    else if(input.dataset.projectCheck)scenarioProjects[id]=2030;
    else {
      const year=Number(input.value);
      if(!Object.hasOwn(scenarioProjects,id)||!Number.isInteger(year)||year<START_YEAR||year>END_YEAR)return;
      scenarioProjects[id]=year;
    }
    setState({activeScenario:'personalizado',scenarioProjects});
  });
  $('#scenario-clear-changes').addEventListener('click',()=>setState({activeScenario:'personalizado',scenarioProjects:{}}));
  productiveScenarioControlsReady=true;
}

function setPlaybackUI(running){const b=$('#shared-year-play');b.setAttribute('aria-pressed',String(running));b.textContent=running?'❚❚ Pausar':'▶ Reproducir años';}
function stopPlayback(){if(timer)clearInterval(timer);timer=null;setPlaybackUI(false);}
const minimumYear=module=>module==='oferta'?2024:2022;
function togglePlayback(){if(timer){stopPlayback();return;}if(getState().year>=2050)setState({year:minimumYear(getState().module)});setPlaybackUI(true);timer=setInterval(()=>{const next=Math.min(2050,getState().year+1);setState({year:next});if(next===2050)stopPlayback();},600);}
function placeYearControl(route){const slot=$(route==='oferta'?'#capacity-year-slot':'#demography-year-slot'),control=$('#shared-year-control'),min=minimumYear(route),input=$('#shared-year');if(slot&&!slot.contains(control))slot.appendChild(control);input.min=String(min);$('#shared-year-min').textContent=String(min);if(getState().year<min){stopPlayback();setState({year:min});}}
function resetRates(territory=getState().territory,sex=getState().sex){return data.attendanceRates?initialScenarioRates(data,territory,sex):{};}

function setupSharedScenarioControls(){
 populateTerritory($('#future-territory'));
 for(let year=2022;year<=2050;year++)$('#future-year').add(new Option(year,year));
 document.querySelectorAll('#future-sidebar [data-scenario]').forEach(button=>button.addEventListener('click',()=>{setState(presetPatch(data,button.dataset.scenario));if(getState().module==='productivos')$('#production-tab-projects').click();}));
 $('#future-territory').addEventListener('change',e=>setState({territory:e.target.value,capacitySchool:'all',productInstallation:''}));
 $('#future-year').addEventListener('change',e=>setState({year:Number(e.target.value)}));
 $('#future-reset-territory').addEventListener('click',()=>setState({territory:'all',capacitySchool:'all',productInstallation:''}));
 $('#future-horizon').addEventListener('click',()=>setState({year:2050}));
 $('#future-peak-year').addEventListener('click',e=>setState({year:Number(e.currentTarget.dataset.peakYear)}));
 $('#future-rates-reset').addEventListener('click',()=>setState({capacityRateProgress:{},capacityRates:{}}));
}
function syncSharedControls(s){
 $('#future-territory').value=s.territory;$('#future-year').value=s.year;
 $('#future-reset-territory').hidden=s.territory==='all';$('#future-peak-year').hidden=s.module!=='escenarios';
 document.querySelectorAll('#future-sidebar [data-scenario]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.scenario===s.activeScenario)));
 const name=s.territory==='all'?'Toda la provincia':data.territoryById[s.territory]?.territorio_nombre;
 $('#future-context-caption').textContent=`${SCENARIO_NAMES[s.activeScenario]} · ${name} · ${s.year}`;
 $('#shared-scenario-note').textContent=s.activeScenario==='personalizado'?'Personalizado: modificaste la cartera o sus supuestos. Elegí un botón para volver a un escenario prefijado.':'La selección se mantiene al cambiar de módulo. Cambiar de escenario conserva el zoom del mapa.';
 setPanelSummary('escenarios',`${SCENARIO_NAMES[s.activeScenario]} · ${name} · ${s.year}`);
}
function setupControls(){
  populateTerritory($('#demography-territory'));populateTerritory($('#capacity-territory'));$('#age-group').innerHTML=selectOptions();$('#capacity-education').innerHTML=selectOptions();
  const changeTerritory=e=>setState({territory:e.target.value,capacitySchool:'all'});
  $('#demography-territory').addEventListener('change',changeTerritory);$('#capacity-territory').addEventListener('change',changeTerritory);
  const changeSelection=e=>setState({educationSelection:e.target.value,capacitySchool:'all'});
  $('#age-group').addEventListener('change',changeSelection);$('#capacity-education').addEventListener('change',changeSelection);
  const changeSex=e=>setState({sex:e.target.value,capacitySchool:'all'});
  $('#demography-sex').addEventListener('change',changeSex);$('#capacity-sex').addEventListener('change',changeSex);
  $('#demography-map-metric').addEventListener('change',e=>setState({demographyMapMetric:e.target.value}));
  $('#shared-year').addEventListener('input',e=>setState({year:Number(e.target.value)}));$('#shared-year-play').addEventListener('click',togglePlayback);
  $('#capacity-comparison-mode').addEventListener('change',e=>{const mode=e.target.value;setState({capacityMode:mode,capacityComparisonMode:mode});});$('#capacity-trend-view').addEventListener('change',e=>setState({capacityTrendView:e.target.value}));$('#capacity-distribution-mode').addEventListener('change',e=>setState({capacityDistributionMode:e.target.value}));$('#capacity-department-level').addEventListener('change',e=>setState({capacityDepartmentLevel:e.target.value}));
  $('#capacity-attendance-levels').addEventListener('change',e=>{if(!e.target.matches('[data-attendance-level]'))return;const level=e.target.dataset.attendanceLevel,current=new Set(getState().capacityAttendanceLevels);e.target.checked?current.add(level):current.delete(level);setState({capacityAttendanceLevels:['INI','PRI','SEC','AGE18'].filter(id=>current.has(id))});});
  $('#reset-filters').addEventListener('click',()=>{stopPlayback();resetState();});$('#download-csv').addEventListener('click',exportFiltered);
  syncControls(getState());
}
function renderRateSliders(){
 for(const id of ['capacity-rate-sliders','future-rate-sliders']){
  const c=$('#'+id);c.innerHTML=POLICY_GROUPS.map(g=>`<label class="rate-slider" style="--group-color:${g.color}"><span><strong>${g.levelLabel}</strong> · ${g.label}</span><output>—</output><input aria-label="Asistencia ${g.label}" data-rate-group="${g.id}" type="range" max="100" step="0.1"></label>`).join('');
  c.addEventListener('input',e=>{if(!e.target.matches('[data-rate-group]'))return;const state=getState(),group=e.target.dataset.rateGroup,sex=e.target.closest('#future-rate-sliders')?'T':state.sex==='all'?'T':state.sex,base=Number(currentRate(data,state.territory,group,sex).tasa_asistencia)||0,chosen=Number(e.target.value)/100;setState({capacityRateProgress:{...state.capacityRateProgress,[group]:base<1?Math.max(0,Math.min(1,(chosen-base)/(1-base))):0}});});
 }
 capacityControlsReady=true;
}
function renderThresholdControls(){const c=$('#capacity-threshold-controls');c.innerHTML=[['INI','Inicial'],['PRI','Primario'],['SEC','Secundario']].map(([id,label])=>`<label><span>${label}</span><span class="threshold-input"><input aria-label="Capacidad fija ${label}" data-capacity-threshold="${id}" type="number" disabled value="${DEFAULT_CAPACITY_THRESHOLDS[id]}"><small>estudiantes</small></span></label>`).join('');}
function syncRateSliders(state){
 if(!capacityControlsReady)return;
 $('#rate-policy').classList.remove('is-disabled');
 document.querySelectorAll('[data-rate-group]').forEach(input=>{
  const group=input.dataset.rateGroup,sex=input.closest('#future-rate-sliders')?'T':state.sex==='all'?'T':state.sex,current=currentRate(data,state.territory,group,sex),min=Number(current.tasa_asistencia)||0,value=parameterRate(data,state,state.territory,group,sex);
  input.min=(min*100).toFixed(1);input.value=(value*100).toFixed(1);input.disabled=false;
  const output=input.closest('label').querySelector('output');output.textContent=pct.format(value);output.title=`Censo ${pct.format(min)} · ${current.source}`;
 });
}
function syncThresholdControls(state){document.querySelectorAll('[data-capacity-threshold]').forEach(input=>{input.value=DEFAULT_CAPACITY_THRESHOLDS[input.dataset.capacityThreshold];input.disabled=true;});}
function syncControls(s){
  syncSharedControls(s);
  const territory=s.territory==='all'?'Toda la provincia':data.territoryById?.[s.territory]?.territorio_nombre||'Departamento';
  $('#demography-territory').value=s.territory;$('#capacity-territory').value=s.territory;
  $('#age-group').value=s.educationSelection;$('#capacity-education').value=s.educationSelection;
  $('#demography-sex').value=s.sex;$('#capacity-sex').value=s.sex;$('#demography-map-metric').value=s.demographyMapMetric;
  $('#shared-year').value=s.year;$('#shared-year-output').textContent=s.year;
  $('#capacity-comparison-mode').value=s.capacityComparisonMode;$('#capacity-trend-view').value=s.capacityTrendView;$('#capacity-distribution-mode').value=s.capacityDistributionMode;
  $('#capacity-department-level').value=['all','INI','PRI','SEC','AGE18'].includes(s.capacityDepartmentLevel)?s.capacityDepartmentLevel:'all';
  document.querySelectorAll('[data-attendance-level]').forEach(input=>input.checked=s.capacityAttendanceLevels.includes(input.dataset.attendanceLevel));
  if(productionControlsReady){$('#product-territory').value=s.scenarioPopulationDepartment||'all';$('#product-activity').value=s.productActivity;$('#product-operator').value=s.productOperator;$('#product-status').value=s.productStatus;}
  setPanelSummary('demografia',`${s.demographyYear} · ${territory} · ${selectionLabel(s.educationSelection)} · ${demographySexLabel(s.sex)}`);
  setPanelSummary('oferta',`${s.capacityYear} · ${s.capacityComparisonMode==='trend'?'Tendencial':'Escenario'} · ${territory} · ${selectionLabel(s.educationSelection)}`);
  setPanelSummary('productivos',`${territory} · ${s.productActivity==='all'?'Todas las actividades':data.productionInstallations?.find(row=>row.actividad_id===s.productActivity)?.actividad_nombre||s.productActivity} · ${s.productStatus==='all'?'Todos los estados':data.productionInstallations?.find(row=>row.estado_id===s.productStatus)?.estado_nombre||s.productStatus}`);
  syncRateSliders(s);syncThresholdControls(s);
}
function renderMetadata(){if(!data.metadata)return;$('#data-date').textContent=`Actualización ${new Date(`${data.metadata.fecha_actualizacion}T12:00:00`).toLocaleDateString('es-AR')}`;$('#footer-warning').textContent=data.metadata.advertencia_datos;}

function renderSidebar(){
  const s=getState();
  $('#future-sidebar').hidden=s.module==='comparador';
  $('#future-sidebar').classList.toggle('scenario-controls-compact',['demografia','oferta','productivos'].includes(s.module));
  $('#sidebar-standard-context').hidden=s.module!=='comparador';
  $('#sidebar-standard-kpis').hidden=!['demografia','oferta'].includes(s.module);
  $('#sidebar-standard-actions').hidden=!['demografia','oferta'].includes(s.module);
  $('#sidebar-page-guide').hidden=!['productivos','comparador'].includes(s.module);
  $('#active-context-title').textContent=s.module==='oferta'?'Escenario educativo':s.module==='productivos'?'Producción':s.module==='comparador'?'Comparación':'Serie';
  if(s.module==='escenarios')return;
  if(s.module==='oferta'&&data.capacitySections){
    const rows=projectedSections(data,s),m=aggregateCapacity(rows),territory=s.territory==='all'?'Toda la provincia':data.territoryById[s.territory]?.territorio_nombre;
    $('#active-scenario').textContent='Capacidad estimada';$('#active-selection').textContent=`${s.capacitySchool!=='all'?schoolName(data,s.capacitySchool):territory} · ${selectionLabel(s.educationSelection)} · ${s.year}`;
    const items=[['Cursos registrados',fmt.format(m.sections),'Secciones por grado y oferta',COLORS.primary],['Ocupación estimada',pct.format(m.occupancy),`Base 2024: ${pct.format(m.baseOccupancy)}`,COLORS.coral],['Capacidad de referencia',fmt.format(m.capacity),'Cursos registrados en 2024',COLORS.yellow],['Lugares disponibles estimados',fmt.format(m.availablePlaces),'Suma de lugares libres por curso',COLORS.support]];
    $('#sidebar-kpi-list').innerHTML=items.map(([l,v,t,c])=>`<article class="sidebar-kpi" style="--kpi-color:${c}"><div class="kpi-line"><span class="kpi-label">${l}</span><strong>${v}</strong></div><small>${t}</small></article>`).join('');return;
  }
  if(s.module==='demografia'&&data.demographyMetadata){
    $('#active-scenario').textContent='Población estimada por departamento';$('#active-selection').textContent=`${demographyTerritoryName(data,s.territory)} · ${selectionLabel(s.educationSelection)} · ${s.year}`;
    const value=totalForRange(scenarioPopulation(data,s).view,s,s.demographyAgeRange);$('#sidebar-kpi-list').innerHTML=`<article class="sidebar-kpi" style="--kpi-color:${COLORS.primary}"><div class="kpi-line"><span class="kpi-label">Población seleccionada</span><strong>${fmt.format(value)}</strong></div><small>${demographySexLabel(s.sex)}</small></article>`;return;
  }
  if(s.module==='productivos'){$('#active-scenario').textContent='Producción y energía';$('#active-selection').textContent='Inventario y escenario editable';$('#sidebar-kpi-list').innerHTML='';$('#sidebar-guide-links').innerHTML='<button type="button" data-page-section="production-map">Mapa e inventario</button><button type="button" data-page-section="production-results-title">Resultados del escenario</button>';return;}
  if(s.module==='comparador'){$('#active-scenario').textContent='Comparador de escenarios';$('#active-selection').textContent='Año, territorio y capas sincronizados';$('#sidebar-guide-links').innerHTML='<button type="button" data-page-section="cmp-diff-title">Diferencia entre escenarios</button><button type="button" data-page-section="cmp-map-title-a">Mapas e indicadores</button>';return;}
  $('#active-scenario').textContent='Módulo pendiente';$('#active-selection').textContent='Sin datos disponibles';$('#sidebar-kpi-list').innerHTML='';
}
function renderTable(){const s=getState(),rows=demographyRows(scenarioPopulation(data,s).view,s,{year:'all'}),byYear=new Map();rows.forEach(r=>byYear.set(r.year,(byYear.get(r.year)||0)+r.poblacion));const base=byYear.get(2022)||0,territory=demographyTerritoryName(data,s.territory);$('#demography-table').innerHTML=[2022,2025,2030,2040,2050,s.year].filter((y,i,a)=>a.indexOf(y)===i).sort().map(y=>`<tr><td>${y}</td><td>${y===2022?'Año inicial ajustado':y<=2040?'Proyección ajustada · referencia INDEC':'Extensión provista'}</td><td>${territory}</td><td class="number">${fmt.format(byYear.get(y)||0)}</td><td class="number">${base?pct.format((byYear.get(y)||0)/base-1):'—'}</td></tr>`).join('');}
function renderDemography(){const s=getState(),view=scenarioPopulation(data,s).view,territory=demographyTerritoryName(data,s.territory),sex=demographySexLabel(s.sex),stats=demographyMapStats(view,s);renderDemographyMap(view,s,stats,id=>setState({territory:id,capacitySchool:'all'}));renderDemographyChart(view,s,y=>{stopPlayback();setState({year:y});});renderPopulationPyramid(view,s);renderDepartmentShareChart(view,s);renderGrowthPolesChart(view,s);$('#demography-map-title').textContent=s.demographyMapMetric==='variation'?'Cambio desde 2022 por departamento':'Población por departamento';$('#demography-map-caption').textContent=`${SCENARIO_NAMES[s.activeScenario]} · ${s.year} · ${selectionLabel(s.educationSelection)} · ${sex}`;$('#pyramid-caption').textContent=`${territory} · ${s.year} · mujeres y varones${s.year===2022?'':' · silueta punteada: 2022'}`;$('#department-share-caption').textContent=`${SCENARIO_NAMES[s.activeScenario]} · ${s.year} · ${selectionLabel(s.educationSelection)} · ${sex}`;$('#growth-poles-caption').textContent=`2022–${s.year} · población total · ambos sexos`;renderTable();const c=data.demographyMetadata.controles;$('#demography-source').textContent=`${data.demographyMetadata.metodo} ${data.demographyMetadata.advertencia} Total provincial 2022: ${fmt.format(c.total_2022)} personas.`;}
function renderCapacity(){const s=getState(),rows=projectedSections(data,s),territory=s.territory==='all'?'Toda la provincia':data.territoryById[s.territory]?.territorio_nombre,select=id=>setState({territory:id,capacitySchool:'all'}),departmentLevelLabel={all:'Todos los niveles',INI:'Inicial',PRI:'Primario',SEC:'Secundario',AGE18:'18 años'}[s.capacityDepartmentLevel]||'Todos los niveles';renderSchoolCapacityMap(data,s,id=>setState({capacitySchool:id}),select);renderPotentialDemandEvolution(data,s,y=>setState({year:y}));renderAttendanceDumbbell(data,s,select);renderDepartmentOccupancyComparison(data,s,select);renderOccupancyDistribution(data,s,select);$('#capacity-map-caption').textContent=`${s.capacityMode==='trend'?'Sin proyectos · mismas tasas':SCENARIO_NAMES[s.activeScenario]} · ${territory} · ${s.year} · ${selectionLabel(s.educationSelection)}`;$('#capacity-trend-caption').textContent=`${territory} · línea continua: sin proyectos · punteada: escenario elegido · ambas con las mismas tasas de asistencia`;$('#capacity-attendance-caption').textContent=`${s.year} · ${demographySexLabel(s.sex)} · porcentaje de asistencia de cada nivel`;$('#capacity-distribution-caption').textContent=`${s.year} · ${selectionLabel(s.educationSelection)}`;$('#capacity-department-caption').textContent=`2024 → ${s.year} · ${s.capacityComparisonMode==='trend'?'Tendencial':'Escenario'} · ${departmentLevelLabel}`;$('#capacity-source').innerHTML=`Se incluyen Inicial, Primario y Secundario de Educación Común. Para estimar cuántas personas podrían asistir se parte de la población del módulo Demografía y del porcentaje de asistencia de cada grupo. Después se toma la ocupación de los cursos de 2024 y se ajusta según cuánto cambia esa demanda en el mismo departamento, grupo de edad y sexo. La capacidad de referencia de los cursos se mantiene fija: Inicial ${s.capacityThresholds.INI}, Primario ${s.capacityThresholds.PRI} y Secundario ${s.capacityThresholds.SEC} estudiantes por sección. <strong>${categorySummary(rows)}</strong>`;}
function renderProductivos(){
  const s=getState(),departmentId=s.scenarioPopulationDepartment||'all';
  const viewState={...s,territory:departmentId,productionView:productionView()};
  const signature=JSON.stringify([departmentId,s.productActivity,s.productOperator,s.productStatus,s.productInstallation,s.scenarioProjects,viewState.productionView]);
  if(signature!==lastProductionSignature){
    renderProduction(data,viewState,{
      onTerritorySelect:id=>setState({scenarioPopulationDepartment:id,productInstallation:''}),
      onInstallationSelect:id=>setState({productInstallation:id})
    });
    lastProductionSignature=signature;
  }
  const result=renderProductiveScenario(data,s);
  renderMigrationEducation(data,result.scheduled,result.departmentId,result.year,result.impactOptions,s);
  $('#scenario-education-disabled').hidden=result.impactOptions.includePeople;
  const territory=departmentId==='all'?'Toda la provincia':data.territoryById[departmentId]?.territorio_nombre||'Departamento';
  $('#production-context-caption').textContent=`${territory} · ${result.year} · ${viewState.productionView==='inventory'?'Inventario energético':'Escenario de proyectos'}`;
  $('#scenario-results-caption').textContent=`${territory} · ${result.year}`;
  syncProductionWorkspace();
}
function exportFiltered(){
  const s=getState();
  if(s.module==='oferta'&&data.capacitySections){const rows=projectedSections(data,s),headers=['seccion_id','departamento_id','departamento_nombre','cue_anexo','establecimiento_nombre','nivel_id','grupo_edad_id','grupo_tasa_id','matricula_actual','matricula_varones_actual','matricula_mujeres_actual','capacidad','matricula_base_seleccionada','ocupacion_base_2024_pct','demanda_potencial_2024_varones','demanda_potencial_2024_mujeres','demanda_potencial_proyectada_varones','demanda_potencial_proyectada_mujeres','factor_demanda_varones','factor_demanda_mujeres','factor_demanda_ponderado','carga_equivalente_proyectada','ocupacion_pct','holgura_modelada','sobreocupacion_modelada','categoria_ocupacion'];downloadCSV(`chubut_ocupacion_${s.territory}_${s.year}.csv`,headers,rows.map(r=>headers.map(h=>r[h]??'')));return;}
  if(s.module==='demografia'){const rows=demographyRows(scenarioPopulation(data,s).view,s),headers=['departamento_id','departamento_nombre','year','edad','sexo_id','poblacion'];downloadCSV(`chubut_demografia_${s.territory}_${s.year}.csv`,headers,rows.map(r=>[r.territorio_id,r.territorio_nombre,r.year,r.edad,r.sexo,r.poblacion]));return;}
  if(s.module==='productivos'&&data.productionInstallations){const rows=filteredProductionRows(data,{...s,territory:s.scenarioPopulationDepartment||'all'}),headers=['instalacion_id','nombre_instalacion','actividad_id','actividad_nombre','operador','departamento_id','departamento_nombre','latitud','longitud','estado_id','estado_nombre','condicion_informacion','anio_referencia','capacidad_instalada_mw','capacidad_historica_mw','potencia_declarada_proyecto_mw','tecnologia_impacto_id','referencia_localizacion','fuente_localizacion_id','url_localizacion','precision_localizacion','nota_conciliacion','fila_auditoria','fuente_primaria_id','fuente_estado_id','fuente_capacidad_instalada_id','fuente_potencia_proyecto_id','calidad_registro'];downloadCSV(`chubut_productivos_${s.scenarioPopulationDepartment||'all'}.csv`,headers,rows.map(row=>headers.map(header=>row[header]??'')));}
}
function renderCurrent(){const route=getState().module;renderSidebar();if(route==='escenarios'&&data.futurePresets){renderFuture(data);renderFutureCapacity(data,getState());}if(route==='comparador'&&data.futurePresets)renderComparator(data);if(route==='demografia'&&data.demographyPopulation)renderDemography();if(route==='oferta'&&data.capacitySections)renderCapacity();if(route==='productivos'&&data.productionInstallations)renderProductivos();}
function scheduleRender(){if(renderFrame)cancelAnimationFrame(renderFrame);renderFrame=requestAnimationFrame(()=>{renderFrame=null;renderCurrent();});}
async function activateRoute(route){
  const token=++routeToken;
  closeMobileSidebar();
  window.scrollTo({top:0,left:0,behavior:'instant'});
  document.querySelector('.app-shell').classList.toggle('production-workspace-active',route==='productivos');
  document.querySelector('.app-shell').classList.toggle('future-workspace-active',['escenarios','comparador'].includes(route));
  $('#error-state').hidden=true;
  if(route==='demografia'||route==='oferta')placeYearControl(route);
  if(route==='productivos'&&getState().year<2026)setState({year:2026});
  $('#loading-state').hidden=false;
  $('#loading-state').querySelector('span').textContent=['escenarios','comparador'].includes(route)?'Calculando escenarios de demanda educativa…':route==='oferta'?'Preparando capacidad educativa…':route==='productivos'?'Preparando inventario energético…':'Preparando demografía…';
  if(route==='oferta'){
    Object.assign(data,await loadDemographyData(),await loadCapacityData());
    if(!capacityControlsReady){renderRateSliders();renderThresholdControls();}
  }else if(route==='escenarios'||route==='comparador'){
    try{
      const layers=await Promise.all([loadProductionData(),loadDemographyData(),loadMigrationEducationData(),loadFutureScenarioData()]);
      if(token!==routeToken)return;
      Object.assign(data,...layers);
    }catch(error){
      if(token===routeToken){$('#loading-state').hidden=true;$('#error-state').hidden=false;$('#error-state').textContent=`No se pudieron cargar los escenarios: ${error.message}`;}
      return;
    }
  }else if(route==='demografia')Object.assign(data,await loadDemographyData());
  else if(route==='productivos'){
    const layers=await Promise.all([loadProductionData(),loadDemographyData(),loadMigrationEducationData()]);
    Object.assign(data,...layers);
    setupProductionControls();
    setupProductiveScenarioControls();
  }
  if(token!==routeToken)return;
  $('#loading-state').hidden=true;syncControls(getState());scheduleRender();
}
async function init(){try{
 data=await loadCoreData();
 const layers=await Promise.all([loadDemographyData(),loadCapacityData(),loadProductionData(),loadMigrationEducationData(),loadFutureScenarioData()]);Object.assign(data,...layers);
 const state=getState();if(state.activeScenario!=='personalizado')setState({...presetPatch(data,state.activeScenario),year:state.year,territory:state.territory});
 renderMetadata();initPageLayout();setupSharedScenarioControls();setupControls();renderRateSliders();renderThresholdControls();setupProductionControls();setupProductiveScenarioControls();
 subscribe(s=>{syncControls(s);scheduleRender();});initRouter(route=>activateRoute(route));initFloatingPanels();
 }catch(error){$('#loading-state').hidden=true;const p=$('#error-state');p.hidden=false;p.textContent=`No se pudo iniciar la aplicación: ${error.message}`;console.error(error);}}
init();
