import {annualPopulationTotals} from './demography.js?v=2.30.0';

export const START_YEAR=2026;
export const END_YEAR=2050;
export const IMPACT=Object.freeze({
  EOL:{label:'Eólica', build:2.9, operate:0.3, years:2, family:3.093, related:1.617, migrantShare:0.31},
  TER_CC:{label:'Térmica (ciclo combinado)', build:2, operate:0.12, years:3, family:3.110, related:1.367, migrantShare:0.325},
  HID_PAH:{label:'Hidro PAH (pequeña)', build:11, operate:1.1, years:3, family:3.110, related:2.026, migrantShare:0.278},
  HID_GRANDE:{label:'Hidro grande', build:6, operate:0.35, years:5, family:3.143, related:2.467, migrantShare:0.29}
});

const html=value=>String(value??'').replace(/[&<>'"]/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char]));
const decimal=value=>value==null?'—':value.toLocaleString('es-AR',{maximumFractionDigits:3});
const years=Array.from({length:END_YEAR-START_YEAR+1},(_,i)=>START_YEAR+i);
const validYear=year=>Number.isInteger(year)&&year>=START_YEAR&&year<=END_YEAR;
export const eligibleProject=row=>row.estado_id==='PROYECTADO'&&!row.nota_conciliacion&&Number.isFinite(row.potencia_declarada_proyecto_mw)&&row.potencia_declarada_proyecto_mw>0;

export function scheduledProjects(rows, selection={}){
  return rows.filter(row=>eligibleProject(row)&&Object.hasOwn(selection,row.instalacion_id)&&validYear(selection[row.instalacion_id]))
    .map(row=>({...row,operationYear:selection[row.instalacion_id]}));
}

export function projectImpact(row,year,{includeConstruction=false,includeRelated=true,includePeople=true,externalShare=1}={}){
  if(!Number.isFinite(externalShare)||externalShare<0||externalShare>1){
    throw new RangeError('La proporción extraprovincial debe estar entre 0 y 1.');
  }
  const coeff=IMPACT[row.tecnologia_impacto_id];
  const mw=row.potencia_declarada_proyecto_mw, online=year>=row.operationYear;
  if(!coeff)return {mw:online?mw:0,impactKnown:false};
  const building=includeConstruction&&!online&&year>=row.operationYear-Math.ceil(coeff.years);
  const buildJobs=building?mw*coeff.build:0, operateJobs=online?mw*coeff.operate:0;
  const related=includeRelated?coeff.related:0;
  const peoplePerJob=includePeople?(1+related)*coeff.family*coeff.migrantShare*externalShare:0;
  return {mw:online?mw:0,impactKnown:true,buildJobs,operateJobs,
    buildRelated:buildJobs*related,operateRelated:operateJobs*related,
    buildPeople:buildJobs*peoplePerJob,
    operatePeople:operateJobs*peoplePerJob};
}

export function departmentImpact(rows,selection,year,options){
  const groups=new Map();
  for(const row of scheduledProjects(rows,selection)){
    const key=row.departamento_id+'|'+row.actividad_id;
    if(!groups.has(key))groups.set(key,{department:row.departamento_nombre,activity:row.actividad_nombre,baseMw:null,
      addedMw:0,buildJobs:0,operateJobs:0,buildRelated:0,operateRelated:0,buildPeople:0,operatePeople:0,unmodeled:0});
    const group=groups.get(key), result=projectImpact(row,year,options);
    group.addedMw+=result.mw;
    if(!result.impactKnown)group.unmodeled++;
    else for(const field of ['buildJobs','operateJobs','buildRelated','operateRelated','buildPeople','operatePeople'])group[field]+=result[field];
  }
  for(const row of rows){
    const group=groups.get(row.departamento_id+'|'+row.actividad_id);
    if(group&&row.estado_id==='OPERATIVO'&&Number.isFinite(row.capacidad_instalada_mw)){
      group.baseMw=(group.baseMw??0)+row.capacidad_instalada_mw;
    }
  }
  return [...groups.values()].sort((a,b)=>a.department.localeCompare(b.department,'es')||a.activity.localeCompare(b.activity,'es'));
}

export function populationImpactSeries(projects,departmentId,impactOptions){
  const scoped=departmentId==='all'?projects:projects.filter(project=>project.departamento_id===departmentId);
  return years.map(year=>{
    let operation=0, construction=0;
    for(const project of scoped){
      const result=projectImpact(project,year,impactOptions);
      if(!result.impactKnown)continue;
      operation+=result.operatePeople;
      construction+=result.buildPeople;
    }
    return {year,operation,construction,total:operation+construction};
  });
}

export function comparePopulation(baseTotals,impacts){
  return impacts.map(({year,total})=>{
    const base=baseTotals?.get(year)??null;
    return {year,base,increment:total,withProjects:base===null?null:base+total};
  });
}

function renderPopulationComparison(points,selectedYear){
  const chart=document.getElementById('scenario-population-comparison');
  const traces=[
    ['withProjects','Población con proyectos','#106c60','solid',4],
    ['base','Población base','#647587','dash',2]
  ];
  Plotly.react(chart,traces.map(([field,name,color,dash,width])=>({
    type:'scatter',mode:'lines',name,x:years,y:points.map(point=>point[field]),
    text:points.map(point=>decimal(point[field])),
    line:{color,dash,width},
    hovertemplate:'%{text} personas<extra>%{fullData.name}</extra>'
  })),{
    autosize:true,height:325,margin:{l:72,r:18,t:16,b:80},
    paper_bgcolor:'transparent',plot_bgcolor:'transparent',
    font:{family:'Inter, sans-serif',size:11,color:'#465761'},
    hovermode:'x unified',
    xaxis:{title:{text:'Año'},dtick:4},
    yaxis:{title:{text:'Personas'},gridcolor:'#e5e9e8'},
    legend:{orientation:'h',x:0,y:-0.29},
    shapes:[{type:'line',xref:'x',yref:'paper',x0:selectedYear,x1:selectedYear,y0:0,y1:1,line:{color:'#78838b',width:1,dash:'dot'}}]
  },{displayModeBar:false,responsive:true});
  document.getElementById('scenario-population-comparison-table').innerHTML=points.map(point=>
    `<tr${point.year===selectedYear?' class="is-selected"':''}><th scope="row">${point.year}</th><td class="number">${decimal(point.base)}</td><td class="number">${decimal(point.withProjects)}</td><td class="number">${decimal(point.increment)}</td></tr>`
  ).join('');
}

function renderPopulationEvolution(points,hasProjects,selectedYear,impactOptions){
  const chart=document.getElementById('scenario-population-chart');
  const message=document.getElementById('scenario-population-empty');
  const show=impactOptions.includePeople&&hasProjects;
  chart.hidden=!show;
  message.hidden=show;
  if(!show){
    if(chart.data)Plotly.purge(chart);
    message.textContent=!impactOptions.includePeople
      ? 'Activá Incluir migración externa para calcular la evolución.'
      : 'No hay proyectos seleccionados para este territorio.';
    return;
  }
  const traces=[['total','Total anual','#184e61','solid',3]];
  if(impactOptions.includeConstruction){
    traces.push(['operation','Operación','#0c786d','dash',2],['construction','Construcción','#a44624','dot',2]);
  }
  Plotly.react(chart,traces.map(([field,name,color,dash,width])=>({
    type:'scatter',mode:'lines',name,x:years,y:points.map(point=>point[field]),
    text:points.map(point=>decimal(point[field])),
    line:{color,dash,width,shape:'hv'},
    hovertemplate:'%{text} personas<extra>%{fullData.name}</extra>'
  })),{
    autosize:true,height:325,margin:{l:65,r:18,t:16,b:80},
    paper_bgcolor:'transparent',plot_bgcolor:'transparent',
    font:{family:'Inter, sans-serif',size:11,color:'#465761'},
    hovermode:'x unified',
    xaxis:{title:{text:'Año'},dtick:4},
    yaxis:{title:{text:'Personas'},rangemode:'tozero',gridcolor:'#e5e9e8'},
    legend:{orientation:'h',x:0,y:-0.29},
    shapes:[{type:'line',xref:'x',yref:'paper',x0:selectedYear,x1:selectedYear,y0:0,y1:1,line:{color:'#78838b',width:1,dash:'dot'}}]
  },{displayModeBar:false,responsive:true});
}

function renderImpactCharts(impacts,options){
  const grouped=new Map();
  for(const row of impacts){
    if(!grouped.has(row.department))grouped.set(row.department,{base:null,added:0,operate:0,build:0,related:0,buildRelated:0});
    const group=grouped.get(row.department);
    if(row.baseMw!==null)group.base=(group.base??0)+row.baseMw;
    group.added+=row.addedMw;
    group.operate+=row.operateJobs;group.build+=row.buildJobs;
    group.related+=row.operateRelated;group.buildRelated+=row.buildRelated;
  }
  const names=[...grouped.keys()],values=[...grouped.values()];
  const render=(id,traces,title)=>{
    const el=document.getElementById(id);
    if(!names.length){Plotly.purge(el);el.innerHTML='<p class="empty-chart">Los resultados aparecerán al seleccionar proyectos en este territorio.</p>';return;}
    if(el.querySelector('.empty-chart')){Plotly.purge(el);el.innerHTML='';}
    Plotly.react(el,traces.map(([name,field,color])=>({type:'bar',orientation:'h',name,y:names,x:values.map(row=>row[field]),marker:{color},hovertemplate:'%{y}<br>%{x:,.2f}<extra>%{fullData.name}</extra>'})),{
      height:Math.max(300,names.length*34+100),barmode:'stack',paper_bgcolor:'transparent',plot_bgcolor:'transparent',
      font:{family:'Inter, system-ui, sans-serif',color:'#1F2933',size:12},margin:{l:115,r:18,t:20,b:85},
      xaxis:{title,gridcolor:'#EEF0EE',rangemode:'tozero'},yaxis:{automargin:true,autorange:'reversed'},
      legend:{orientation:'h',y:-0.3,x:0}
    },{displayModeBar:false,responsive:true});
  };
  render('scenario-capacity-chart',[['Base conocida','base','#63A6B1'],['Incorporada','added','#247C8C']],'Capacidad conocida (MW)');
  render('scenario-jobs-chart',[
    ['Directo · operación','operate','#247C8C'],
    ...(options.includeRelated?[['Asociado · operación','related','#63A6B1']]:[]),
    ...(options.includeConstruction?[['Directo · construcción','build','#FF6B35'],...(options.includeRelated?[['Asociado · construcción','buildRelated','#FFC928']]:[])]:[])
  ],'Puestos de trabajo');
}

let lastCatalog='';
const options=(items,current)=>items.map(year=>'<option'+(year===current?' selected':'')+'>'+year+'</option>').join('');
const projectType=row=>IMPACT[row.tecnologia_impacto_id]?.label||row.actividad_nombre;
export function renderProductiveScenario(data,state,{editorOnly=false}={}){
  const rows=data.productionInstallations||[], selection=state.scenarioProjects||{}, year=state.scenarioImpactYear;
  const scheduled=scheduledProjects(rows,selection);
  const departmentId=state.scenarioPopulationDepartment||'all';
  const scopedRows=departmentId==='all'?rows:rows.filter(row=>row.departamento_id===departmentId);
  const scopedProjects=scheduled.filter(row=>departmentId==='all'||row.departamento_id===departmentId);
  const filter=state.scenarioProjectFilter||'all';
  const activities=['EOL','HID','TER'];
  const catalog=scopedRows.filter(row=>row.estado_id==='PROYECTADO'&&(filter==='all'||row.actividad_id===filter))
    .sort((a,b)=>a.actividad_nombre.localeCompare(b.actividad_nombre,'es')||a.nombre_instalacion.localeCompare(b.nombre_instalacion,'es'));
  const signature=JSON.stringify([departmentId,filter,selection]);
  if(signature!==lastCatalog){
    const list=document.getElementById('scenario-projects');
    const focused=document.activeElement;
    const focusAttr=focused?.hasAttribute('data-project-year')?'data-project-year':'data-project-check';
    const focusKey=list.contains(focused)?focused.getAttribute(focusAttr):null;
    list.innerHTML=catalog.map(row=>{
      const id=html(row.instalacion_id), name=html(row.nombre_instalacion), ready=eligibleProject(row);
      const checked=ready&&Object.hasOwn(selection,row.instalacion_id)&&validYear(selection[row.instalacion_id]);
      const located=Number.isFinite(row.latitud)&&Number.isFinite(row.longitud);
      return `<tr class="${checked?'is-included':''}"><td><label class="production-project-label"><input data-project-check="${id}" type="checkbox"${ready?'':' disabled'}${checked?' checked':''}><span><strong>${name}</strong><small>${html(row.departamento_nombre)} · ${html(projectType(row))}${located?'':' · Sin coordenadas'}</small></span></label><button type="button" class="production-project-detail" data-product-installation="${id}" aria-label="Ver ficha de ${name}">Ver ficha</button>${row.nota_conciliacion?`<small class="project-pending">${html(row.nota_conciliacion)}</small>`:''}</td><td class="number">${decimal(row.potencia_declarada_proyecto_mw)}</td><td>${ready?`<select aria-label="Año de entrada: ${name}" data-project-year="${id}"${checked?'':' disabled'}>${options(years,checked?selection[row.instalacion_id]:2030)}</select>`:'—'}</td></tr>`;
    }).join('')||(filter==='TER'&&!rows.some(row=>row.estado_id==='PROYECTADO'&&row.actividad_id==='TER')
      ?'<tr><td colspan="3" class="scenario-empty-row">La cartera auditada no incluye proyectos térmicos. Las instalaciones térmicas existentes se consultan en Inventario.<br><button type="button" class="text-button" data-inventory-activity="TER">Ver inventario térmico</button></td></tr>'
      :'<tr><td colspan="3" class="scenario-empty-row">No hay proyectos para este departamento y energía. Cambiar la vista no modifica tu selección.</td></tr>');
    if(focusKey)[...list.querySelectorAll('['+focusAttr+']')].find(el=>el.getAttribute(focusAttr)===focusKey)?.focus();
    lastCatalog=signature;
  }
  document.getElementById('scenario-project-filter').value=activities.includes(filter)?filter:'all';
  if(document.getElementById('scenario-impact-year'))document.getElementById('scenario-impact-year').value=year;
  document.getElementById('scenario-clear-changes').disabled=!scheduled.length;
  const includeConstruction=state.scenarioIncludeConstruction===true;
  const includeRelated=state.scenarioIncludeRelated!==false;
  const includePeople=state.scenarioIncludePeople!==false;
  document.getElementById('scenario-include-construction').setAttribute('aria-pressed',String(includeConstruction));
  document.getElementById('scenario-include-related').checked=includeRelated;
  document.getElementById('scenario-include-people').checked=includePeople;
  const externalPercent=state.scenarioExternalPercent??100;
  document.getElementById('scenario-external-percent').value=externalPercent;
  const impactOptions={includeConstruction,includeRelated,includePeople,externalShare:externalPercent/100};
  const outside=scheduled.length-scopedProjects.length;
  const hiddenByEnergy=scopedProjects.filter(project=>filter!=='all'&&project.actividad_id!==filter).length;
  const noCoordinates=scopedProjects.filter(project=>!Number.isFinite(project.latitud)||!Number.isFinite(project.longitud)).length;
  document.getElementById('scenario-selection-note').textContent=
    `${scopedProjects.length} seleccionados en este territorio · ${scheduled.length} en todo el escenario`+
    (outside?` · ${outside} fuera de este territorio`:'')+
    (hiddenByEnergy?` · ${hiddenByEnergy} ocultos por el filtro de energía`:'')+
    (noCoordinates?` · ${noCoordinates} sin coordenadas, incluidos en el cálculo`:'');
  document.getElementById('scenario-coefficients').innerHTML=Object.values(IMPACT).map(c=>`<tr><td>${c.label}</td>${[c.build,c.operate,c.years,c.family,c.related].map(v=>`<td class="number">${decimal(v)}</td>`).join('')}<td class="number">${decimal(c.migrantShare*100)} %</td></tr>`).join('');
  if(editorOnly)return {scheduled,departmentId,year,impactOptions};
  const empty=document.getElementById('scenario-results-empty');
  empty.hidden=scopedProjects.length>0;
  empty.textContent=scheduled.length?'No hay proyectos seleccionados en este territorio. Los proyectos de otros departamentos siguen guardados.':'Seleccioná al menos un proyecto para explorar sus resultados. La población base permanece disponible.';
  const populationImpacts=populationImpactSeries(scheduled,departmentId,impactOptions);
  const hasProjects=scheduled.some(project=>departmentId==='all'||project.departamento_id===departmentId);
  const baseTotals=annualPopulationTotals(data.demographyPopulation,departmentId);
  renderPopulationComparison(comparePopulation(baseTotals,populationImpacts),year);
  renderPopulationEvolution(populationImpacts,hasProjects,year,impactOptions);
  const impacts=departmentImpact(scopedRows,selection,year,impactOptions);
  renderImpactCharts(impacts,impactOptions);
  const total=field=>impacts.reduce((sum,row)=>sum+row[field],0);
  const hasConstruction=includeConstruction&&total('buildJobs')>0;
  const phaseColumns=(prefix,label)=>[
    [prefix+'Jobs','Empleo directo',label],
    ...(includeRelated?[[prefix+'Related','Empleo asociado',label]]:[]),
    ...(includePeople?[[prefix+'People','Migrantes externos',label]]:[])
  ];
  const metrics=[
    ...phaseColumns('operate','Operación'),
    ...(hasConstruction?phaseColumns('build','Construcción'):[])
  ];
  const annualMetric=(label,operation,construction)=>{
    const breakdown=hasConstruction
      ? `${decimal(operation)} en operación · ${decimal(construction)} en construcción`
      : `Operación en ${year}`;
    return [label,decimal(operation+construction),breakdown];
  };
  document.getElementById('scenario-summary').innerHTML=[
    ['Proyectos incluidos',scopedProjects.length,`${scopedProjects.filter(p=>p.operationYear<=year).length} en operación en ${year}`],
    ['Capacidad incorporada',`${decimal(total('addedMw'))} MW`,`Acumulada hasta ${year}`],
    annualMetric('Empleo directo',total('operateJobs'),total('buildJobs')),
    ...(includeRelated?[annualMetric('Empleo asociado',total('operateRelated'),total('buildRelated'))]:[]),
    ...(includePeople?[annualMetric('Incremento poblacional total',total('operatePeople'),total('buildPeople'))]:[])
  ].map(([label,value,note])=>`<article><span>${label}</span><strong>${value}</strong><small>${note}</small></article>`).join('');
  const populationTotalColumn=includePeople&&hasConstruction&&total('operatePeople')>0;
  document.getElementById('scenario-product-head').innerHTML='<th scope="col">Departamento</th><th scope="col">Energía</th><th scope="col">Base conocida (MW)</th><th scope="col">Nuevos (MW)</th><th scope="col">Total conocido (MW)</th>'+
    metrics.map(([,label,phase])=>`<th scope="col">${label} · ${phase}</th>`).join('')+
    (populationTotalColumn?'<th scope="col">Incremento poblacional total</th>':'');
  document.getElementById('scenario-product-table').innerHTML=impacts.map(row=>{
    const capacity=row.baseMw===null?(row.addedMw||null):row.baseMw+row.addedMw;
    const cells=[row.baseMw,row.addedMw,capacity,...metrics.map(([field])=>row[field])];
    if(populationTotalColumn)cells.push(row.operatePeople+row.buildPeople);
    return `<tr><td>${html(row.department)}</td><td>${html(row.activity)}${row.unmodeled?' · impacto parcial':''}</td>${cells.map(value=>`<td class="number">${decimal(value)}</td>`).join('')}</tr>`;
  }).join('')||`<tr><td colspan="${5+metrics.length+Number(populationTotalColumn)}" class="scenario-empty-row">Marcá un proyecto para estimar su impacto.</td></tr>`;
  return {scheduled,departmentId,year,impactOptions};
}
