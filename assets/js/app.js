import {COLORS,DEFAULT_CAPACITY_THRESHOLDS,fmt,pct} from './config.js?v=2.13.0';
import {getState,setState,subscribe,resetState} from './state.js';
import {initRouter} from './router.js';
import {loadCoreData,loadDemographyData,loadCapacityData,loadProductionData} from './data.js?v=2.13.0';
import {renderDemographyMap} from './maps.js';
import {renderDemographyChart,renderPopulationPyramid,renderDepartmentShareChart,renderGrowthPolesChart} from './charts.js';
import {downloadCSV} from './exports.js';
import {demographyTerritoryName,demographySexLabel,demographyRows,demographyMapStats,populationTotal,totalForRange} from './demography.js';
import {POLICY_GROUPS,initialScenarioRates,currentRate,projectedSections,aggregateCapacity,groupForId} from './scenario-model.js';
import {renderSchoolCapacityMap,renderPotentialDemandEvolution,renderAttendanceDumbbell,renderOccupancyDistribution,renderDepartmentOccupancyComparison,schoolName,categorySummary} from './capacity.js';
import {initFloatingPanels,setPanelSummary} from './floating-panels.js';
import {filteredProductionRows,productionSummary,productionFilterOptions,renderProduction,activitySymbol} from './production.js?v=2.13.0';
import {productiveScenarioActivities,createProductiveScenarioChange,renderProductiveScenario} from './productive-scenario.js?v=2.13.0';

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
  $('#product-territory').addEventListener('change',event=>setState({territory:event.target.value,productInstallation:''}));
  $('#product-activity').addEventListener('change',event=>setState({productActivity:event.target.value,productInstallation:''}));
  $('#product-operator').addEventListener('change',event=>setState({productOperator:event.target.value,productInstallation:''}));
  $('#product-status').addEventListener('change',event=>setState({productStatus:event.target.value,productInstallation:''}));
  $('#production-table').addEventListener('click',event=>{const button=event.target.closest('[data-product-installation]');if(button)setState({productInstallation:button.dataset.productInstallation});});
  productionControlsReady=true;
}

function setupProductiveScenarioControls(){
  if(productiveScenarioControlsReady||!data.productionInstallations)return;
  const department=$('#scenario-product-department');
  department.innerHTML='<option value="">Seleccionar departamento</option>'+territories().map(item=>`<option value="${item.value}">${item.label}</option>`).join('');
  $('#scenario-product-activities').innerHTML=productiveScenarioActivities(data).map(item=>`<label style="--activity-color:${item.color}"><input type="radio" name="scenario-product-activity" value="${item.id}"><span>${activitySymbol(item.id)}<strong>${item.label}</strong></span></label>`).join('');
  department.addEventListener('change',event=>setState({scenarioProductDepartment:event.target.value}));
  $('#scenario-product-activities').addEventListener('change',event=>{if(event.target.matches('[name="scenario-product-activity"]'))setState({scenarioProductActivity:event.target.value});});
  document.querySelectorAll('[name="scenario-product-change-type"]').forEach(input=>input.addEventListener('change',event=>{if(event.target.checked)setState({scenarioProductChangeType:event.target.value});}));
  $('#scenario-product-capacity').addEventListener('input',event=>setState({scenarioProductCapacityMw:event.target.value}));
  document.querySelectorAll('[data-scenario-capacity-step]').forEach(button=>button.addEventListener('click',()=>{const current=Number(getState().scenarioProductCapacityMw)||0,delta=Number(button.dataset.scenarioCapacityStep)||0;setState({scenarioProductCapacityMw:Math.max(0,Math.round((current+delta)*10)/10)});}));
  $('#scenario-product-year').addEventListener('input',event=>setState({scenarioProductYear:Number(event.target.value)}));
  $('#scenario-product-jobs').addEventListener('input',event=>setState({scenarioProductJobsPerMw:event.target.value}));
  $('#scenario-clear-coefficient').addEventListener('click',()=>setState({scenarioProductJobsPerMw:''}));
  $('#scenario-add-change').addEventListener('click',()=>{const state=getState(),result=createProductiveScenarioChange(data,state);if(result.change)setState({scenarioProductChanges:[...(state.scenarioProductChanges||[]),result.change],scenarioProductCapacityMw:''});});
  $('#scenario-product-table').addEventListener('click',event=>{const button=event.target.closest('[data-remove-productive-change]');if(button)setState({scenarioProductChanges:(getState().scenarioProductChanges||[]).filter(change=>change.id!==button.dataset.removeProductiveChange)});});
  $('#scenario-clear-changes').addEventListener('click',()=>setState({scenarioProductChanges:[]}));
  productiveScenarioControlsReady=true;
}

function setPlaybackUI(running){const b=$('#shared-year-play');b.setAttribute('aria-pressed',String(running));b.textContent=running?'❚❚ Pausar':'▶ Reproducir años';}
function stopPlayback(){if(timer)clearInterval(timer);timer=null;setPlaybackUI(false);}
const minimumYear=module=>module==='oferta'?2024:2022;
function togglePlayback(){if(timer){stopPlayback();return;}if(getState().year>=2050)setState({year:minimumYear(getState().module)});setPlaybackUI(true);timer=setInterval(()=>{const next=Math.min(2050,getState().year+1);setState({year:next});if(next===2050)stopPlayback();},600);}
function placeYearControl(route){const slot=$(route==='oferta'?'#capacity-year-slot':'#demography-year-slot'),control=$('#shared-year-control'),min=minimumYear(route),input=$('#shared-year');if(slot&&!slot.contains(control))slot.appendChild(control);input.min=String(min);$('#shared-year-min').textContent=String(min);if(getState().year<min){stopPlayback();setState({year:min});}}
function resetRates(territory=getState().territory,sex=getState().sex){return data.attendanceRates?initialScenarioRates(data,territory,sex):{};}

function setupControls(){
  populateTerritory($('#demography-territory'));populateTerritory($('#capacity-territory'));$('#age-group').innerHTML=selectOptions();$('#capacity-education').innerHTML=selectOptions();
  const changeTerritory=e=>setState({territory:e.target.value,capacitySchool:'all',capacityRates:resetRates(e.target.value,getState().sex)});
  $('#demography-territory').addEventListener('change',changeTerritory);$('#capacity-territory').addEventListener('change',changeTerritory);
  const changeSelection=e=>setState({educationSelection:e.target.value,capacitySchool:'all'});
  $('#age-group').addEventListener('change',changeSelection);$('#capacity-education').addEventListener('change',changeSelection);
  const changeSex=e=>setState({sex:e.target.value,capacitySchool:'all',capacityRates:resetRates(getState().territory,e.target.value)});
  $('#demography-sex').addEventListener('change',changeSex);$('#capacity-sex').addEventListener('change',changeSex);
  $('#demography-map-metric').addEventListener('change',e=>setState({demographyMapMetric:e.target.value}));
  $('#shared-year').addEventListener('input',e=>setState({year:Number(e.target.value)}));$('#shared-year-play').addEventListener('click',togglePlayback);
  $('#capacity-comparison-mode').addEventListener('change',e=>{const mode=e.target.value;setState({capacityMode:mode,capacityComparisonMode:mode,...(mode==='trend'?{capacityRates:resetRates()}: {})});});$('#capacity-trend-view').addEventListener('change',e=>setState({capacityTrendView:e.target.value}));$('#capacity-distribution-mode').addEventListener('change',e=>setState({capacityDistributionMode:e.target.value}));$('#capacity-department-level').addEventListener('change',e=>setState({capacityDepartmentLevel:e.target.value}));
  $('#capacity-attendance-levels').addEventListener('change',e=>{if(!e.target.matches('[data-attendance-level]'))return;const level=e.target.dataset.attendanceLevel,current=new Set(getState().capacityAttendanceLevels);e.target.checked?current.add(level):current.delete(level);setState({capacityAttendanceLevels:['INI','PRI','SEC','AGE18'].filter(id=>current.has(id))});});
  $('#reset-filters').addEventListener('click',()=>{stopPlayback();resetState();if(data.attendanceRates)setState({capacityRates:resetRates()});});$('#download-csv').addEventListener('click',exportFiltered);
  syncControls(getState());
}
function renderRateSliders(){
  const c=$('#capacity-rate-sliders');c.innerHTML=POLICY_GROUPS.map(g=>`<label class="rate-slider" style="--group-color:${g.color}"><span><strong>${g.levelLabel}</strong> · ${g.label}</span><output id="rate-output-${g.id}">—</output><input data-rate-group="${g.id}" type="range" max="100" step="0.1"></label>`).join('');
  c.addEventListener('input',e=>{if(!e.target.matches('[data-rate-group]'))return;setState({capacityRates:{...getState().capacityRates,[e.target.dataset.rateGroup]:Number(e.target.value)/100}});});capacityControlsReady=true;
}
function renderThresholdControls(){const c=$('#capacity-threshold-controls'),levels=[['INI','Inicial'],['PRI','Primario'],['SEC','Secundario']];c.innerHTML=levels.map(([id,label])=>`<label><span>${label}</span><span class="threshold-input"><input data-capacity-threshold="${id}" type="number" min="1" max="60" step="1"><small>estudiantes</small></span></label>`).join('');c.addEventListener('change',e=>{if(!e.target.matches('[data-capacity-threshold]'))return;const value=Math.max(1,Math.min(60,Math.round(Number(e.target.value)||DEFAULT_CAPACITY_THRESHOLDS[e.target.dataset.capacityThreshold])));setState({capacityThresholds:{...getState().capacityThresholds,[e.target.dataset.capacityThreshold]:value},capacitySchool:'all'});});}
function syncRateSliders(state){if(!capacityControlsReady||!data.attendanceRates)return;const trend=state.capacityMode==='trend';$('#rate-policy').classList.toggle('is-disabled',trend);POLICY_GROUPS.forEach(g=>{const sex=state.sex==='all'?'T':state.sex,current=currentRate(data,state.territory,g.id,sex),min=Number(current.tasa_asistencia)||0,value=Math.max(min,Math.min(1,Number(state.capacityRates?.[g.id]??min))),input=$(`[data-rate-group="${g.id}"]`),output=$(`#rate-output-${g.id}`);input.min=(min*100).toFixed(1);input.value=(value*100).toFixed(1);input.disabled=trend;output.textContent=`${(value*100).toLocaleString('es-AR',{minimumFractionDigits:1,maximumFractionDigits:1})}%`;output.title=`Tasa actual ${pct.format(min)} · ${current.source}`;});}
function syncThresholdControls(state){document.querySelectorAll('[data-capacity-threshold]').forEach(input=>{input.value=state.capacityThresholds?.[input.dataset.capacityThreshold]??DEFAULT_CAPACITY_THRESHOLDS[input.dataset.capacityThreshold];});}
function syncControls(s){
  const territory=s.territory==='all'?'Toda la provincia':data.territoryById?.[s.territory]?.territorio_nombre||'Departamento';
  $('#demography-territory').value=s.territory;$('#capacity-territory').value=s.territory;
  $('#age-group').value=s.educationSelection;$('#capacity-education').value=s.educationSelection;
  $('#demography-sex').value=s.sex;$('#capacity-sex').value=s.sex;$('#demography-map-metric').value=s.demographyMapMetric;
  $('#shared-year').value=s.year;$('#shared-year-output').textContent=s.year;
  $('#capacity-comparison-mode').value=s.capacityComparisonMode;$('#capacity-trend-view').value=s.capacityTrendView;$('#capacity-distribution-mode').value=s.capacityDistributionMode;
  $('#capacity-department-level').value=['all','INI','PRI','SEC','AGE18'].includes(s.capacityDepartmentLevel)?s.capacityDepartmentLevel:'all';
  document.querySelectorAll('[data-attendance-level]').forEach(input=>input.checked=s.capacityAttendanceLevels.includes(input.dataset.attendanceLevel));
  if(productionControlsReady){$('#product-territory').value=s.territory;$('#product-activity').value=s.productActivity;$('#product-operator').value=s.productOperator;$('#product-status').value=s.productStatus;}
  if(productiveScenarioControlsReady){
    $('#scenario-product-department').value=s.scenarioProductDepartment||'';
    document.querySelectorAll('[name="scenario-product-activity"]').forEach(input=>input.checked=input.value===s.scenarioProductActivity);
    document.querySelectorAll('[name="scenario-product-change-type"]').forEach(input=>input.checked=input.value===s.scenarioProductChangeType);
    $('#scenario-product-capacity').value=s.scenarioProductCapacityMw??'';
    $('#scenario-product-year').value=s.scenarioProductYear;$('#scenario-product-year-output').textContent=s.scenarioProductYear;
    $('#scenario-product-jobs').value=s.scenarioProductJobsPerMw??'';
  }
  setPanelSummary('demografia',`${s.demographyYear} · ${territory} · ${selectionLabel(s.educationSelection)} · ${demographySexLabel(s.sex)}`);
  setPanelSummary('oferta',`${s.capacityYear} · ${s.capacityComparisonMode==='trend'?'Tendencial':'Escenario'} · ${territory} · ${selectionLabel(s.educationSelection)}`);
  setPanelSummary('productivos',`${territory} · ${s.productActivity==='all'?'Todas las actividades':data.productionInstallations?.find(row=>row.actividad_id===s.productActivity)?.actividad_nombre||s.productActivity} · ${s.productStatus==='all'?'Todos los estados':data.productionInstallations?.find(row=>row.estado_id===s.productStatus)?.estado_nombre||s.productStatus}`);
  syncRateSliders(s);syncThresholdControls(s);
}
function renderMetadata(){if(!data.metadata)return;$('#data-date').textContent=`Actualización ${new Date(`${data.metadata.fecha_actualizacion}T12:00:00`).toLocaleDateString('es-AR')}`;$('#footer-warning').textContent=data.metadata.advertencia_datos;}

function renderSidebar(){
  const s=getState();
  if(s.module==='oferta'&&data.capacitySections){
    const rows=projectedSections(data,s),m=aggregateCapacity(rows),territory=s.territory==='all'?'Toda la provincia':data.territoryById[s.territory]?.territorio_nombre;
    $('#active-scenario').textContent='Capacidad modelada';$('#active-selection').textContent=`${s.capacitySchool!=='all'?schoolName(data,s.capacitySchool):territory} · ${selectionLabel(s.educationSelection)} · ${s.year}`;
    const items=[['Secciones',fmt.format(m.sections),'Secciones-grado-oferta',COLORS.primary],['Ocupación proyectada',pct.format(m.occupancy),`Base 2024: ${pct.format(m.baseOccupancy)}`,COLORS.coral],['Capacidad modelada',fmt.format(m.capacity),'Umbrales por nivel',COLORS.yellow],['Holgura modelada',fmt.format(m.availablePlaces),'Suma de holguras por sección',COLORS.support]];
    $('#sidebar-kpi-list').innerHTML=items.map(([l,v,t,c])=>`<article class="sidebar-kpi" style="--kpi-color:${c}"><div class="kpi-line"><span class="kpi-label">${l}</span><strong>${v}</strong></div><small>${t}</small></article>`).join('');return;
  }
  if(s.module==='demografia'&&data.demographyMetadata){
    $('#active-scenario').textContent=data.demographyMetadata.serie_nombre;$('#active-selection').textContent=`${demographyTerritoryName(data,s.territory)} · ${selectionLabel(s.educationSelection)} · ${s.year}`;
    const value=totalForRange(data,s,s.demographyAgeRange);$('#sidebar-kpi-list').innerHTML=`<article class="sidebar-kpi" style="--kpi-color:${COLORS.primary}"><div class="kpi-line"><span class="kpi-label">Población seleccionada</span><strong>${fmt.format(value)}</strong></div><small>${demographySexLabel(s.sex)}</small></article>`;return;
  }
  if(s.module==='productivos'&&data.productionInstallations){
    const rows=filteredProductionRows(data,s),summary=productionSummary(rows),territory=s.territory==='all'?'Toda la provincia':data.territoryById[s.territory]?.territorio_nombre;
    $('#active-scenario').textContent='Inventario productivo';$('#active-selection').textContent=`${territory} · ${rows.length} instalaciones`;
    const items=[['Instalaciones',fmt.format(summary.installations),'Inventario filtrado',COLORS.primary],['Capacidad instalada',`${summary.installed.toLocaleString('es-AR',{maximumFractionDigits:2})} MW`,`${summary.withInstalled} con dato`,COLORS.support],['Potencia de proyecto',`${summary.projectPower.toLocaleString('es-AR',{maximumFractionDigits:2})} MW`,'No sumada como instalada',COLORS.yellow],['Proyectos futuros',fmt.format(summary.future),'Construcción no iniciada',COLORS.coral]];
    $('#sidebar-kpi-list').innerHTML=items.map(([l,v,t,c])=>`<article class="sidebar-kpi" style="--kpi-color:${c}"><div class="kpi-line"><span class="kpi-label">${l}</span><strong>${v}</strong></div><small>${t}</small></article>`).join('');return;
  }
  $('#active-scenario').textContent='Módulo pendiente';$('#active-selection').textContent='Sin datos disponibles';$('#sidebar-kpi-list').innerHTML='';
}
function renderTable(){const s=getState(),rows=demographyRows(data,s,{year:'all'}),byYear=new Map();rows.forEach(r=>byYear.set(r.year,(byYear.get(r.year)||0)+r.poblacion));const base=byYear.get(2022)||0,territory=demographyTerritoryName(data,s.territory);$('#demography-table').innerHTML=[2022,2025,2030,2040,2050,s.year].filter((y,i,a)=>a.indexOf(y)===i).sort().map(y=>`<tr><td>${y}</td><td>${y===2022?'Año inicial ajustado':y<=2040?'Proyección ajustada · referencia INDEC':'Extensión provista'}</td><td>${territory}</td><td class="number">${fmt.format(byYear.get(y)||0)}</td><td class="number">${base?pct.format((byYear.get(y)||0)/base-1):'—'}</td></tr>`).join('');}
function renderDemography(){const s=getState(),territory=demographyTerritoryName(data,s.territory),sex=demographySexLabel(s.sex),stats=demographyMapStats(data,s);renderDemographyMap(data,s,stats,id=>setState({territory:id,capacitySchool:'all',capacityRates:resetRates(id,s.sex)}));renderDemographyChart(data,s,y=>{stopPlayback();setState({year:y});});renderPopulationPyramid(data,s);renderDepartmentShareChart(data,s);renderGrowthPolesChart(data,s);$('#demography-map-title').textContent=s.demographyMapMetric==='variation'?'Cambio desde 2022 por departamento':'Población por departamento';$('#demography-map-caption').textContent=`${s.year} · ${selectionLabel(s.educationSelection)} · ${sex}`;$('#pyramid-caption').textContent=`${territory} · ${s.year} · estructura M/F${s.year===2022?'':' · silueta punteada: 2022'}`;$('#department-share-caption').textContent=`${s.year} · ${selectionLabel(s.educationSelection)} · ${sex}`;$('#growth-poles-caption').textContent=`2022–${s.year} · población total · ambos sexos`;renderTable();const c=data.demographyMetadata.controles;$('#demography-source').textContent=`${data.demographyMetadata.metodo} ${data.demographyMetadata.advertencia} Total provincial 2022: ${fmt.format(c.total_2022)} personas.`;}
function renderCapacity(){const s=getState(),rows=projectedSections(data,s),territory=s.territory==='all'?'Toda la provincia':data.territoryById[s.territory]?.territorio_nombre,select=id=>setState({territory:id,capacitySchool:'all',capacityRates:resetRates(id,s.sex)}),departmentLevelLabel={all:'Todos los niveles',INI:'Inicial',PRI:'Primario',SEC:'Secundario',AGE18:'18 años'}[s.capacityDepartmentLevel]||'Todos los niveles';renderSchoolCapacityMap(data,s,id=>setState({capacitySchool:id}),select);renderPotentialDemandEvolution(data,s,y=>setState({year:y}));renderAttendanceDumbbell(data,s,select);renderDepartmentOccupancyComparison(data,s,select);renderOccupancyDistribution(data,s,select);$('#capacity-map-caption').textContent=`${territory} · ${s.year} · ${selectionLabel(s.educationSelection)}`;$('#capacity-trend-caption').textContent=`${territory} · demanda = población proyectada × tasa · continua tendencial · punteada escenario`;$('#capacity-attendance-caption').textContent=`${s.year} · ${demographySexLabel(s.sex)} · tasas equivalentes ponderadas por nivel`;$('#capacity-distribution-caption').textContent=`${s.year} · ${selectionLabel(s.educationSelection)}`;$('#capacity-department-caption').textContent=`2024 → ${s.year} · ${s.capacityComparisonMode==='trend'?'Tendencial':'Escenario'} · ${departmentLevelLabel}`;$('#capacity-source').innerHTML=`Universo: Educación Común, niveles Inicial, Primario y Secundario. La demanda potencial usa la misma población proyectada del módulo Demografía y la multiplica por la tasa de asistencia correspondiente. La ocupación parte de cada sección-grado-oferta observada en 2024 y aplica proporcionalmente el factor de variación de esa demanda dentro del mismo departamento, grupo y sexo. Capacidades modeladas activas: Inicial ${s.capacityThresholds.INI}, Primario ${s.capacityThresholds.PRI} y Secundario ${s.capacityThresholds.SEC} estudiantes por sección. <strong>${categorySummary(rows)}</strong>`;}
function renderProductivos(){const s=getState(),signature=[s.territory,s.productActivity,s.productOperator,s.productStatus,s.productInstallation].join('|');if(signature!==lastProductionSignature){renderProduction(data,s,{onTerritorySelect:id=>setState({territory:id,productInstallation:''}),onInstallationSelect:id=>setState({productInstallation:id})});lastProductionSignature=signature;}renderProductiveScenario(data,s);}
function exportFiltered(){
  const s=getState();
  if(s.module==='oferta'&&data.capacitySections){const rows=projectedSections(data,s),headers=['seccion_id','departamento_id','departamento_nombre','cue_anexo','establecimiento_nombre','nivel_id','grupo_edad_id','grupo_tasa_id','matricula_actual','matricula_varones_actual','matricula_mujeres_actual','capacidad','matricula_base_seleccionada','ocupacion_base_2024_pct','demanda_potencial_2024_varones','demanda_potencial_2024_mujeres','demanda_potencial_proyectada_varones','demanda_potencial_proyectada_mujeres','factor_demanda_varones','factor_demanda_mujeres','factor_demanda_ponderado','carga_equivalente_proyectada','ocupacion_pct','holgura_modelada','sobreocupacion_modelada','categoria_ocupacion'];downloadCSV(`chubut_ocupacion_${s.territory}_${s.year}.csv`,headers,rows.map(r=>headers.map(h=>r[h]??'')));return;}
  if(s.module==='demografia'){const rows=demographyRows(data,s),headers=['departamento_id','departamento_nombre','year','edad','sexo_id','poblacion'];downloadCSV(`chubut_demografia_${s.territory}_${s.year}.csv`,headers,rows.map(r=>[r.territorio_id,r.territorio_nombre,r.year,r.edad,r.sexo,r.poblacion]));return;}
  if(s.module==='productivos'&&data.productionInstallations){const rows=filteredProductionRows(data,s),headers=['instalacion_id','nombre_instalacion','actividad_id','actividad_nombre','operador','departamento_id','departamento_nombre','latitud','longitud','estado_id','estado_nombre','condicion_informacion','anio_referencia','capacidad_instalada_mw','potencia_declarada_proyecto_mw','fuente_primaria_id','calidad_registro'];downloadCSV(`chubut_productivos_${s.territory}.csv`,headers,rows.map(row=>headers.map(header=>row[header]??'')));}
}
function renderCurrent(){const route=getState().module;renderSidebar();if(route==='demografia'&&data.demographyPopulation)renderDemography();if(route==='oferta'&&data.capacitySections)renderCapacity();if(route==='productivos'&&data.productionInstallations)renderProductivos();}
function scheduleRender(){if(renderFrame)cancelAnimationFrame(renderFrame);renderFrame=requestAnimationFrame(()=>{renderFrame=null;renderCurrent();});}
async function activateRoute(route){
  const token=++routeToken;
  if(route==='demografia'||route==='oferta')placeYearControl(route);
  $('#loading-state').hidden=false;
  $('#loading-state').querySelector('span').textContent=route==='oferta'?'Preparando capacidad educativa…':route==='productivos'?'Preparando inventario energético…':'Preparando demografía…';
  if(route==='oferta'){
    Object.assign(data,await loadDemographyData(),await loadCapacityData());
    if(!capacityControlsReady){renderRateSliders();renderThresholdControls();}
    if(!Object.keys(getState().capacityRates||{}).length)setState({capacityRates:resetRates()},{persist:false});
  }else if(route==='demografia')Object.assign(data,await loadDemographyData());
  else if(route==='productivos'){Object.assign(data,await loadProductionData());setupProductionControls();setupProductiveScenarioControls();}
  if(token!==routeToken)return;
  $('#loading-state').hidden=true;syncControls(getState());scheduleRender();
}
async function init(){try{data=await loadCoreData();renderMetadata();setupControls();subscribe((s)=>{syncControls(s);scheduleRender();});initRouter(route=>activateRoute(route));initFloatingPanels();}catch(error){$('#loading-state').hidden=true;const p=$('#error-state');p.hidden=false;p.innerHTML=`<strong>No se pudo iniciar la V2.</strong><span>${error.message}</span>`;console.error(error);}}
init();
