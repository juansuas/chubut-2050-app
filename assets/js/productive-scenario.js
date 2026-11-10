import {COLORS,fmt} from './config.js';
import {ACTIVITY_COLORS,activitySymbol} from './production.js?v=2.11.0';

export const PRODUCTIVE_SCENARIO_START_YEAR=2026;
export const PRODUCTIVE_SCENARIO_END_YEAR=2050;

const number=value=>value===null||value===''||value===undefined?null:Number(value);
const finite=value=>Number.isFinite(Number(value));
const formatDecimal=value=>value===null||!finite(value)?'—':Number(value).toLocaleString('es-AR',{maximumFractionDigits:2});
const escapeHTML=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));

export function productiveScenarioActivities(data){
  const rows=data.productionInstallations||[];
  const ids=[...new Set(rows.map(row=>row.actividad_id).filter(Boolean))];
  return ids.map(id=>{
    const row=rows.find(item=>item.actividad_id===id);
    return {id,label:row?.actividad_nombre||id,color:ACTIVITY_COLORS[id]||COLORS.muted};
  }).sort((a,b)=>a.label.localeCompare(b.label,'es'));
}

export function productiveScenarioBase(data,departmentId,activityId){
  const rows=(data.productionInstallations||[]).filter(row=>
    row.departamento_id===departmentId&&row.actividad_id===activityId&&
    (activityId!=='EOL'||row.estado_id==='OPERATIVO')
  );
  const documented=rows.filter(row=>
    number(row.capacidad_instalada_mw)!==null&&(activityId!=='TER'||row.estado_id==='OPERATIVO')
  );
  return {
    capacityMw:documented.reduce((sum,row)=>sum+Number(row.capacidad_instalada_mw),0),
    installations:rows.length,
    documented:documented.length,
    incomplete:rows.length>documented.length
  };
}

function signedCapacity(change){
  const value=Number(change.capacityMw)||0;
  return change.changeType==='REDUCCION'?-value:value;
}

function previousScenarioDelta(state,departmentId,activityId,year){
  return (state.scenarioProductChanges||[])
    .filter(change=>change.departmentId===departmentId&&change.activityId===activityId&&Number(change.operationYear)<=Number(year))
    .reduce((sum,change)=>sum+signedCapacity(change),0);
}

export function productiveScenarioPreview(data,state){
  const departmentId=state.scenarioProductDepartment||'';
  const activityId=state.scenarioProductActivity||'';
  const changeType=state.scenarioProductChangeType==='REDUCCION'?'REDUCCION':'AMPLIACION';
  const capacityMw=number(state.scenarioProductCapacityMw);
  const operationYear=Number(state.scenarioProductYear);
  const jobsPerMw=number(state.scenarioProductJobsPerMw);
  const base=productiveScenarioBase(data,departmentId,activityId);
  const previousDelta=departmentId&&activityId?previousScenarioDelta(state,departmentId,activityId,operationYear):0;
  const capacityBefore=Math.max(0,base.capacityMw+previousDelta);
  const deltaMw=capacityMw===null?null:(changeType==='REDUCCION'?-capacityMw:capacityMw);
  const capacityAfter=deltaMw===null?null:capacityBefore+deltaMw;
  const errors=[];
  if(!departmentId)errors.push('Seleccioná un departamento.');
  if(!activityId)errors.push('Seleccioná una tecnología.');
  if(capacityMw===null||!finite(capacityMw)||capacityMw<=0)errors.push('Ingresá una modificación de capacidad mayor que cero.');
  if(!Number.isInteger(operationYear)||operationYear<PRODUCTIVE_SCENARIO_START_YEAR||operationYear>PRODUCTIVE_SCENARIO_END_YEAR)errors.push(`El año debe estar entre ${PRODUCTIVE_SCENARIO_START_YEAR} y ${PRODUCTIVE_SCENARIO_END_YEAR}.`);
  if(jobsPerMw===null||!finite(jobsPerMw)||jobsPerMw<0)errors.push('Ingresá un coeficiente de empleo permanente no negativo.');
  if(changeType==='REDUCCION'&&capacityMw!==null&&capacityMw>capacityBefore)errors.push(`La reducción supera la capacidad disponible antes del cambio (${formatDecimal(capacityBefore)} MW).`);
  const ready=errors.length===0;
  const departmentName=data.territoryById?.[departmentId]?.territorio_nombre||'';
  const activity=productiveScenarioActivities(data).find(item=>item.id===activityId);
  return {
    departmentId,departmentName,activityId,activityName:activity?.label||activityId,activityColor:activity?.color||COLORS.muted,
    changeType,capacityMw,operationYear,jobsPerMw,base,previousDelta,capacityBefore,deltaMw,capacityAfter,
    employmentDelta:ready?deltaMw*jobsPerMw:null,errors,ready
  };
}

export function createProductiveScenarioChange(data,state){
  const preview=productiveScenarioPreview(data,state);
  if(!preview.ready)return {change:null,errors:preview.errors};
  return {change:{
    id:`cambio-${Date.now()}-${(state.scenarioProductChanges||[]).length+1}`,
    departmentId:preview.departmentId,
    departmentName:preview.departmentName,
    activityId:preview.activityId,
    activityName:preview.activityName,
    changeType:preview.changeType,
    capacityMw:preview.capacityMw,
    operationYear:preview.operationYear,
    jobsPerMw:preview.jobsPerMw,
    employmentDelta:preview.employmentDelta,
    assumptionStatus:'SUPUESTO_USUARIO'
  },errors:[]};
}

export function productiveScenarioSummary(state){
  const changes=state.scenarioProductChanges||[];
  const netCapacityMw=changes.reduce((sum,change)=>sum+signedCapacity(change),0);
  const employmentDelta=changes.reduce((sum,change)=>sum+(Number(change.employmentDelta)||0),0);
  const years=changes.map(change=>Number(change.operationYear)).filter(Number.isFinite);
  return {
    changes:changes.length,
    departments:new Set(changes.map(change=>change.departmentId)).size,
    netCapacityMw,
    employmentDelta,
    firstYear:years.length?Math.min(...years):null
  };
}

function previewCards(preview){
  const employment=preview.employmentDelta===null?'—':`${preview.employmentDelta>=0?'+':''}${formatDecimal(preview.employmentDelta)}`;
  const thermal=preview.activityId==='TER';
  const baseLabel=thermal?'Piso térmico verificado':'Capacidad base verificada';
  const baseDetail=thermal?'CAMMESA · operación confirmada en 09/2026':'instalaciones con dato';
  return `<div class="productive-preview-grid">
    <article><span>${baseLabel}</span><strong>${preview.departmentId&&preview.activityId?`${formatDecimal(preview.base.capacityMw)} MW`:'—'}</strong><small>${preview.departmentId&&preview.activityId?`${preview.base.documented} de ${preview.base.installations} · ${baseDetail}`:'Seleccioná territorio y tecnología'}</small></article>
    <article><span>Capacidad antes del cambio</span><strong>${preview.departmentId&&preview.activityId?`${formatDecimal(preview.capacityBefore)} MW`:'—'}</strong><small>${preview.previousDelta?`Incluye ${preview.previousDelta>0?'+':''}${formatDecimal(preview.previousDelta)} MW previos del escenario`:'Sin cambios anteriores aplicables'}</small></article>
    <article><span>Capacidad resultante</span><strong>${preview.capacityAfter===null?'—':`${formatDecimal(preview.capacityAfter)} MW`}</strong><small>${preview.deltaMw===null?'Ingresá una modificación':`${preview.deltaMw>=0?'+':''}${formatDecimal(preview.deltaMw)} MW en ${preview.operationYear}`}</small></article>
    <article><span>Empleo permanente</span><strong>${employment}</strong><small>${preview.jobsPerMw===null?'Coeficiente pendiente':`${formatDecimal(preview.jobsPerMw)} puestos por MW`}</small></article>
  </div>`;
}

function renderChangesTable(state){
  const changes=state.scenarioProductChanges||[];
  if(!changes.length)return '<tr><td colspan="7" class="scenario-empty-row">Todavía no se agregaron cambios productivos.</td></tr>';
  return [...changes].sort((a,b)=>a.operationYear-b.operationYear||a.departmentName.localeCompare(b.departmentName,'es')).map(change=>{
    const sign=change.changeType==='REDUCCION'?'−':'+';
    const employment=Number(change.employmentDelta)||0;
    return `<tr><td>${escapeHTML(change.departmentName)}</td><td><span class="scenario-activity" style="--activity-color:${ACTIVITY_COLORS[change.activityId]||COLORS.muted}">${activitySymbol(change.activityId)} ${escapeHTML(change.activityName)}</span></td><td class="number">${sign}${formatDecimal(change.capacityMw)} MW</td><td>${change.operationYear}</td><td class="number">${formatDecimal(change.jobsPerMw)}</td><td class="number">${employment>=0?'+':''}${formatDecimal(employment)}</td><td><button type="button" class="scenario-remove" data-remove-productive-change="${escapeHTML(change.id)}" aria-label="Quitar cambio de ${escapeHTML(change.departmentName)}">Quitar</button></td></tr>`;
  }).join('');
}

export function renderProductiveScenario(data,state){
  const preview=productiveScenarioPreview(data,state);
  const summary=productiveScenarioSummary(state);
  document.getElementById('scenario-product-preview').innerHTML=previewCards(preview);
  const message=document.getElementById('scenario-product-message');
  if(preview.errors.length){message.className='scenario-form-message';message.textContent=preview.errors[0];}
  else if(preview.activityId==='TER'&&!preview.base.documented){message.className='scenario-form-message warning';message.textContent='Sin centrales térmicas verificadas en este departamento. El cálculo sólo refleja los MW simulados.';}
  else if(preview.activityId==='TER'){message.className='scenario-form-message warning';message.textContent='Piso térmico parcial. Incluye sólo centrales conciliadas con generación en septiembre de 2026.';}
  else if(preview.base.incomplete){message.className='scenario-form-message warning';message.textContent=`La capacidad base es parcial: ${preview.base.documented} de ${preview.base.installations} instalaciones tienen capacidad documentada.`;}
  else {message.className='scenario-form-message valid';message.textContent='Parámetros completos. El cambio puede incorporarse al escenario.';}
  document.getElementById('scenario-add-change').disabled=!preview.ready;
  document.getElementById('scenario-clear-changes').disabled=!summary.changes;
  document.getElementById('scenario-product-table').innerHTML=renderChangesTable(state);
  document.getElementById('scenario-summary').innerHTML=`<article><span>Cambios</span><strong>${fmt.format(summary.changes)}</strong><small>${summary.departments} departamentos</small></article><article><span>Variación neta</span><strong>${summary.netCapacityMw>=0?'+':''}${formatDecimal(summary.netCapacityMw)} MW</strong><small>Capacidad eléctrica del escenario</small></article><article><span>Empleo permanente</span><strong>${summary.employmentDelta>=0?'+':''}${formatDecimal(summary.employmentDelta)}</strong><small>Puestos estimados</small></article><article><span>Primera entrada</span><strong>${summary.firstYear||'—'}</strong><small>${summary.firstYear?'Año de operación':'Sin cambios cargados'}</small></article>`;
}
