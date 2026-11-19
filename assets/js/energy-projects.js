import {eligibleProject,scheduledProjects,START_YEAR,END_YEAR} from './productive-scenario.js?v=2.30.0';
const esc=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const decimal=new Intl.NumberFormat('es-AR',{maximumFractionDigits:2});
let catalogSignature='';
export function energyProjection(data,selection,year,territory='all'){
 const projects=scheduledProjects(data.productionInstallations,selection).filter(p=>territory==='all'||String(p.departamento_id)===territory);
 const online=projects.filter(p=>p.operationYear<=year);
 const rows=Object.keys(data.territoryById).filter(id=>territory==='all'||id===territory).map(id=>{
  const installed=data.productionInstallations.filter(r=>String(r.departamento_id)===id&&r.estado_id==='OPERATIVO'&&Number.isFinite(r.capacidad_instalada_mw));
  const base=installed.reduce((sum,r)=>sum+r.capacidad_instalada_mw,0),added=online.filter(p=>String(p.departamento_id)===id).reduce((sum,p)=>sum+p.potencia_declarada_proyecto_mw,0);
  return {id,name:data.territoryById[id].territorio_nombre,base:installed.length?base:null,added,total:installed.length||added?base+added:null};
 });
 return {projects,online,rows,portfolio:projects.reduce((sum,p)=>sum+p.potencia_declarada_proyecto_mw,0),added:online.reduce((sum,p)=>sum+p.potencia_declarada_proyecto_mw,0)};
}
export function renderEnergyProjects(data,state){
 const territory=state.scenarioPopulationDepartment||'all',year=Math.max(START_YEAR,Math.min(END_YEAR,Number(state.year))),selection=state.energyProjects||{};
 const catalog=data.productionInstallations.filter(r=>eligibleProject(r)&&(territory==='all'||String(r.departamento_id)===territory)).sort((a,b)=>a.departamento_nombre.localeCompare(b.departamento_nombre,'es')||a.nombre_instalacion.localeCompare(b.nombre_instalacion,'es'));
 const signature=JSON.stringify([territory,selection]);
 if(signature!==catalogSignature){
  const container=document.getElementById('energy-projects'),focus=document.activeElement,focusId=container.contains(focus)?focus.dataset.energyProjectYear||focus.dataset.energyProjectCheck:null;
  container.innerHTML=catalog.map(r=>{
   const id=esc(r.instalacion_id),selected=Object.hasOwn(selection,r.instalacion_id),entry=selected?selection[r.instalacion_id]:2030;
   return `<tr><td><label class="production-project-label"><input type="checkbox" data-energy-project-check="${id}" ${selected?'checked':''}><span><strong>${esc(r.nombre_instalacion)}</strong><small>${esc(r.departamento_nombre)} · ${esc(r.actividad_nombre)}</small></span></label></td><td>${decimal.format(r.potencia_declarada_proyecto_mw)}</td><td><select data-energy-project-year="${id}" aria-label="Entrada en operación: ${esc(r.nombre_instalacion)}" ${selected?'':'disabled'}>${Array.from({length:END_YEAR-START_YEAR+1},(_,i)=>START_YEAR+i).map(y=>`<option ${y===entry?'selected':''}>${y}</option>`).join('')}</select></td></tr>`;
  }).join('')||'<tr><td colspan="3">No hay proyectos simulables en este departamento.</td></tr>';
  if(focusId)container.querySelector(`[${focus?.dataset.energyProjectYear?'data-energy-project-year':'data-energy-project-check'}="${CSS.escape(focusId)}"]`)?.focus({preventScroll:true});
  catalogSignature=signature;
 }
 const result=energyProjection(data,selection,year,territory);
 document.getElementById('energy-analysis-year').value=year;
 document.getElementById('energy-selection-note').textContent=`${result.projects.length} proyectos activados en la selección · ${result.online.length} en operación en ${year}. Cambiar el departamento no desactiva proyectos.`;
 document.getElementById('energy-clear-projects').disabled=!Object.keys(selection).length;
 document.getElementById('energy-results-context').textContent=`${territory==='all'?'Toda la provincia':data.territoryById[territory].territorio_nombre} · ${year}`;
 document.getElementById('energy-summary').innerHTML=[[result.projects.length,'Proyectos activados'],[decimal.format(result.portfolio)+' MW','Potencia de la cartera activada'],[result.online.length,'En operación en '+year],[decimal.format(result.added)+' MW','Potencia incorporada en '+year]].map(([value,label])=>`<article><span>${label}</span><strong>${value}</strong></article>`).join('');
 document.getElementById('energy-results-table').innerHTML=result.rows.map(r=>`<tr><th>${esc(r.name)}</th><td>${r.base===null?'Sin dato':decimal.format(r.base)}</td><td>${decimal.format(r.added)}</td><td>${r.total===null?'Sin dato':decimal.format(r.total)}</td></tr>`).join('');
}
