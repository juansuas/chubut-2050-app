import {renderCapacityMap} from './capacity-map.js?v=2.30.0';
import {COLORS,fmt,pct,occupancyStatus} from './config.js?v=2.30.0';
import {OCCUPANCY_CATEGORIES,aggregateSchools,attendanceComparisonPanels,departmentCapacity,departmentLevelCapacity,potentialDemandSeries,occupancyLabel,projectedSections} from './scenario-model.js?v=2.30.0';
const layout={paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'rgba(0,0,0,0)',font:{family:'Inter, Arial, sans-serif',size:11,color:'#5B6470'},margin:{l:70,r:24,t:34,b:48},xaxis:{gridcolor:'#ECE8DE',zeroline:false},yaxis:{gridcolor:'#ECE8DE',zeroline:false},hoverlabel:{bgcolor:'#FBF8F1',bordercolor:'#D8D4CA',font:{color:'#1F2933'}},legend:{orientation:'h',y:1.12,x:0}};
const plot=(id,traces,extra={})=>Plotly.react(id,traces,{...layout,...extra},{displayModeBar:false,responsive:true});
function bindPlotClick(id,handler){const el=document.getElementById(id);if(!el)return;el.removeAllListeners?.('plotly_click');if(handler){el.on('plotly_click',handler);el.style.cursor='pointer';}}

export function renderSchoolCapacityMap(data,state,onSchoolSelect,onTerritorySelect){return renderCapacityMap(data,state,{onSchoolSelect,onTerritorySelect});}
export function renderPotentialDemandEvolution(data,state,onYearSelect){
  const traces=[];potentialDemandSeries(data,state).forEach(g=>{for(const [mode,dash,label] of (state.module==='oferta'?[['trend','solid','Proyección tendencial']]:[['trend','solid','Sin proyectos · mismas tasas'],['scenario','dot','Escenario']])){const points=g[mode];traces.push({type:'scatter',mode:'lines',name:g.label,legendgroup:g.id,showlegend:mode==='trend',x:points.map(p=>p.year),y:points.map(p=>p.demand),customdata:points.map(p=>[p.population,p.rate,label,p.rateSource]),line:{color:g.color,width:3,dash},hovertemplate:`<b>${g.label}</b><br>%{customdata[2]} · %{x}<br>Población proyectada: %{customdata[0]:,.0f}<br>Tasa equivalente: %{customdata[1]:.1%}<br>Demanda potencial: %{y:,.0f}<br>Fuente de tasa: %{customdata[3]}<br><i>Demanda = población × tasa</i><extra></extra>`});}});
  plot('capacity-enrollment-trend',traces,{hovermode:'closest',yaxis:{...layout.yaxis,title:'Demanda potencial'},xaxis:{...layout.xaxis,dtick:4},shapes:[{type:'line',x0:state.year,x1:state.year,y0:0,y1:1,yref:'paper',line:{color:COLORS.ink,width:1,dash:'dot'}}]}).then(()=>requestAnimationFrame(()=>{const chart=document.getElementById('capacity-enrollment-trend');if(chart?.offsetParent)Plotly.Plots.resize(chart);}));bindPlotClick('capacity-enrollment-trend',e=>{const y=Math.round(Number(e.points?.[0]?.x));if(y>=2022&&y<=2050)onYearSelect(y);});
}
export function renderAttendanceDumbbell(data,state,onTerritorySelect){
  const definitions=attendanceComparisonPanels(data,state).filter(definition=>state.capacityAttendanceLevels.includes(definition.id)),traces=[];
  if(!definitions.length){plot('capacity-attendance-dumbbell',[],{xaxis:{visible:false},yaxis:{visible:false},annotations:[{text:'Seleccioná al menos un nivel para mostrar la comparación.',showarrow:false,font:{size:14,color:COLORS.muted}}]});return;}
  const names=definitions[0].rows.map(r=>r.name),offsets=definitions.length===1?[0]:definitions.length===2?[-.12,.12]:definitions.length===3?[-.18,0,.18]:[-.24,-.08,.08,.24];
  definitions.forEach((definition,index)=>{
    const rows=definition.rows,offset=offsets[index],positions=rows.map((_,rowIndex)=>rowIndex+offset),lineX=[],lineY=[];rows.forEach((r,rowIndex)=>{lineX.push(r.current*100,r.scenario*100,null);lineY.push(rowIndex+offset,rowIndex+offset,null);});const customdata=rows.map(r=>[r.id,r.name,definition.label,r.current,r.scenario,r.delta,r.population,r.source]),markerSize=rows.map(r=>r.id===state.territory?11:8),markerWidth=rows.map(r=>r.id===state.territory?3:1.5);
    traces.push({type:'scatter',mode:'markers',name:definition.label,legendgroup:definition.id,x:rows.map(r=>r.current*100),y:positions,customdata,marker:{size:markerSize,color:definition.color,symbol:'circle',line:{color:'#fff',width:markerWidth}},hovertemplate:'<b>%{customdata[1]}</b><br>Nivel: %{customdata[2]}<br>Asistencia de referencia: %{customdata[3]:.1%}<br>Población de referencia: %{customdata[6]:,.0f}<br>Fuente: %{customdata[7]}<extra></extra>'});
  });
  const selectedIndex=state.territory==='all'?-1:definitions[0].rows.findIndex(r=>r.id===state.territory),shapes=selectedIndex<0?[]:[{type:'rect',xref:'x',yref:'y',x0:0,x1:100,y0:selectedIndex-.43,y1:selectedIndex+.43,fillcolor:'rgba(36,124,140,.07)',line:{width:0},layer:'below'}];
  plot('capacity-attendance-dumbbell',traces,{margin:{...layout.margin,l:130,t:46},xaxis:{...layout.xaxis,title:'Tasa de asistencia (%)',range:[0,100],ticksuffix:'%',anchor:'free',position:0,side:'bottom'},yaxis:{gridcolor:'transparent',zeroline:false,showline:false,tickmode:'array',tickvals:names.map((_,i)=>i),ticktext:names,range:[names.length-.55,-.55],automargin:true},legend:{...layout.legend,traceorder:'normal',itemclick:false,itemdoubleclick:false},shapes});bindPlotClick('capacity-attendance-dumbbell',e=>{const id=e.points?.[0]?.customdata?.[0];if(id)onTerritorySelect(id);});
}
export function renderOccupancyDistribution(data,state,onTerritorySelect){
  const container=document.getElementById('capacity-occupancy-distribution'),rows=departmentLevelCapacity(data,state),percent=state.capacityDistributionMode==='percent',levelOrder=['INI','PRI','SEC','AGE18'],levels=levelOrder.filter(level=>rows.some(r=>r.level===level&&r.sections>0));
  container.querySelectorAll('[data-distribution-level]').forEach(panel=>{if(!levels.includes(panel.dataset.distributionLevel)){const chart=panel.querySelector('.chart');if(chart)Plotly.purge(chart);panel.remove();}});
  levels.forEach(level=>{
    const levelRows=rows.filter(r=>r.level===level&&r.sections>0).sort((a,b)=>b.department.localeCompare(a.department,'es')),panelId=`capacity-distribution-${level}`;let panel=container.querySelector(`[data-distribution-level="${level}"]`);
    if(!panel){panel=document.createElement('section');panel.className='capacity-level-panel';panel.dataset.distributionLevel=level;panel.innerHTML=`<h4>${levelRows[0]?.levelLabel||level}</h4><div id="${panelId}" class="chart capacity-level-chart"></div>`;}container.appendChild(panel);
    const traces=OCCUPANCY_CATEGORIES.map(c=>({type:'bar',orientation:'h',name:c.label,legendgroup:c.id,showlegend:false,x:levelRows.map(r=>percent?(r.categories[c.id]||0)/r.sections*100:(r.categories[c.id]||0)),y:levelRows.map(r=>r.department),customdata:levelRows.map(r=>[r.id,r.levelLabel,r.availablePlaces,r.baseOccupancy,r.occupancy]),marker:{color:c.color},hovertemplate:`Nivel: %{customdata[1]}<br>Capacidad disponible: %{customdata[2]:,.0f}<br>Ocupación 2024: %{customdata[3]:.1%}<br>Ocupación ${state.year}: %{customdata[4]:.1%}<extra></extra>`}));
    plot(panelId,traces,{barmode:'stack',showlegend:false,margin:{...layout.margin,l:112,t:12,b:45},xaxis:{...layout.xaxis,title:percent?'Distribución (%)':'Secciones',range:percent?[0,100]:undefined},yaxis:{gridcolor:'transparent',automargin:true}});bindPlotClick(panelId,e=>{const id=e.points?.[0]?.customdata?.[0];if(id)onTerritorySelect(id);});
  });
  if(!levels.length)container.innerHTML='<p class="empty-chart">No hay secciones para la selección activa.</p>';
}
export function renderDepartmentOccupancyComparison(data,state,onTerritorySelect){
  const departmentLevel=['INI','PRI','SEC','AGE18'].includes(state.capacityDepartmentLevel)?state.capacityDepartmentLevel:'all',selection=departmentLevel==='all'?'all':`level:${departmentLevel}`,chartState={...state,educationSelection:selection},rows=departmentCapacity(data,chartState).filter(r=>r.sections>0).sort((a,b)=>a.occupancy-b.occupancy||b.name.localeCompare(a.name,'es')),lineX=[],lineY=[];
  rows.forEach(r=>{lineX.push(r.baseOccupancy*100,r.occupancy*100,null);lineY.push(r.name,r.name,null);});
  const customdata=rows.map(r=>[r.id,r.name,r.baseOccupancy,r.occupancy,(r.occupancy-r.baseOccupancy)*100,r.availablePlaces]),selected=id=>rows.map(r=>r.id===state.territory?id[0]:id[1]),maxOccupancy=Math.max(100,...rows.map(r=>Math.max(r.baseOccupancy,r.occupancy)*100)),maxX=Math.max(110,Math.ceil((maxOccupancy+5)/10)*10);
  const hover=`<b>%{customdata[1]}</b><br>Base 2024: %{customdata[2]:.1%}<br>Año seleccionado (${state.year}): %{customdata[3]:.1%}<br>Variación: %{customdata[4]:+.1f} p.p.<br>Capacidad disponible: %{customdata[5]:,.0f}<extra></extra>`;
  const traces=[
    {type:'scatter',mode:'lines',name:'Cambio',showlegend:false,x:lineX,y:lineY,line:{color:'#B8C4C6',width:3},hoverinfo:'skip'},
    {type:'scatter',mode:'markers',name:'Base 2024',x:rows.map(r=>r.baseOccupancy*100),y:rows.map(r=>r.name),customdata,marker:{size:selected([15,12]),color:'#FFFFFF',symbol:'circle',line:{color:COLORS.primaryDark,width:selected([3,2])}},hovertemplate:hover},
    {type:'scatter',mode:'markers',name:`Año seleccionado (${state.year})`,x:rows.map(r=>r.occupancy*100),y:rows.map(r=>r.name),customdata,marker:{size:selected([10,8]),color:COLORS.coral,symbol:'circle',line:{color:'#FFFFFF',width:selected([2,1])}},hovertemplate:hover}
  ];
  const thresholds=[
    {value:60,label:'60% · equilibrio',color:'#63A6B1'},
    {value:85,label:'85% · alta presión',color:'#D5A92A'},
    {value:100,label:'100% · saturación',color:'#B9472F'}
  ];
  plot('capacity-department-enrollment',traces,{hovermode:'closest',margin:{...layout.margin,l:130,t:62},legend:{...layout.legend,traceorder:'normal'},xaxis:{...layout.xaxis,title:'Ocupación de la capacidad modelada (%)',range:[0,maxX],ticksuffix:'%'},yaxis:{gridcolor:'transparent',automargin:true},shapes:thresholds.map(t=>({type:'line',xref:'x',yref:'paper',x0:t.value,x1:t.value,y0:0,y1:1,line:{color:t.color,width:1.5,dash:'dot'},layer:'below'})),annotations:thresholds.map(t=>({xref:'x',yref:'paper',x:t.value,y:1.03,text:t.label,showarrow:false,xanchor:'left',font:{size:9,color:t.color}}))});bindPlotClick('capacity-department-enrollment',e=>{const id=e.points?.[0]?.customdata?.[0];if(id)onTerritorySelect(id);});
}
export function schoolName(data,id){return !id||id==='all'?'':data.capacitySections.find(r=>r.cue_anexo===id)?.establecimiento_nombre||id;}
export function categorySummary(rows){const c=Object.fromEntries(OCCUPANCY_CATEGORIES.map(x=>[x.id,0]));rows.forEach(r=>c[r.categoria_ocupacion]++);return OCCUPANCY_CATEGORIES.map(x=>`${occupancyLabel(x.id)}: ${fmt.format(c[x.id])}`).join(' · ');}
