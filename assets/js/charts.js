import { COLORS } from './config.js';
import { metricsFor, sum } from './scenarios.js';
import { demographyRows, demographyMapStats, populationTotal } from './demography.js';

const layoutBase = {
  paper_bgcolor:COLORS.surface, plot_bgcolor:COLORS.surface, font:{family:'Inter, system-ui, sans-serif',color:COLORS.ink,size:12},
  margin:{l:55,r:20,t:28,b:48}, hoverlabel:{bgcolor:COLORS.surface,bordercolor:COLORS.line,font:{color:COLORS.ink}},
  xaxis:{gridcolor:'#EEF0EE',zeroline:false}, yaxis:{gridcolor:'#EEF0EE',zeroline:false, separatethousands:true},
  legend:{orientation:'h',y:1.12,x:0}
};
const config={displayModeBar:false,responsive:true};

function plot(id,traces,layout={}) {
  const el=document.getElementById(id);
  if(!el)return;
  Plotly.react(el,traces,{...layoutBase,...layout,autosize:true},config);
  requestAnimationFrame(()=>Plotly.Plots.resize(el));
}

export function renderDemographyChart(data,state,onYearSelect) {
  const rows=demographyRows(data,state,{year:'all'});
  const years=Array.from({length:29},(_,index)=>2022+index);
  const values=years.map(year=>populationTotal(rows.filter(row=>row.year===year)));
  const traces=[{
    type:'scatter',mode:'lines+markers',name:'Proyección departamental',x:years,y:values,
    line:{color:COLORS.primary,width:3},marker:{color:COLORS.primary,size:5},hovertemplate:'%{x}<br>%{y:,.0f} personas<br>Clic para seleccionar el año<extra></extra>'
  }];
  if(state.demographyTerritory==='all'&&state.demographyAgeRange==='0-100') {
    const referenceSex=state.demographySex==='all'?'T':state.demographySex;
    const reference=data.demographyIndec.filter(row=>row.sexo===referenceSex);
    traces.push({
      type:'scatter',mode:'lines+markers',name:'Referencia INDEC provincial',x:reference.map(row=>row.year),y:reference.map(row=>row.poblacion),
      line:{color:COLORS.muted,width:2,dash:'dot'},marker:{color:COLORS.muted,size:4},hovertemplate:'Referencia INDEC %{x}<br>%{y:,.0f} personas<extra></extra>'
    });
  }
  const activeYear=Number(state.demographyYear),activeValue=values[activeYear-2022];
  traces.push({
    type:'scatter',mode:'markers',name:'Año seleccionado',showlegend:false,x:[activeYear],y:[activeValue],
    marker:{color:COLORS.yellow,size:12,line:{color:COLORS.primaryDark,width:2}},
    hovertemplate:`Año seleccionado ${activeYear}<br>%{y:,.0f} personas<extra></extra>`
  });
  plot('demography-chart',traces,{yaxis:{...layoutBase.yaxis,title:'Población'},hovermode:'x unified',clickmode:'event+select',shapes:[{type:'line',x0:activeYear,x1:activeYear,y0:0,y1:1,yref:'paper',line:{color:COLORS.yellow,width:1.5,dash:'dot'}}]});
  const chart=document.getElementById('demography-chart');
  if(chart&&onYearSelect) {
    if(chart._demographyYearClickHandler)chart.removeListener?.('plotly_click',chart._demographyYearClickHandler);
    chart._demographyYearClickHandler=event=>{
      const year=Math.round(Number(event.points?.[0]?.x));
      if(Number.isInteger(year)&&year>=2022&&year<=2050)onYearSelect(year);
    };
    chart.on('plotly_click',chart._demographyYearClickHandler);
    chart.style.cursor='pointer';
  }
}

export function renderPopulationPyramid(data,state) {
  const rows=demographyRows(data,state,{ageRange:'0-100',sex:'all'});
  const groups=[...Array.from({length:20},(_,index)=>({min:index*5,max:index*5+4,label:`${index*5}–${index*5+4}`})),{min:100,max:100,label:'100+'}];
  const male=groups.map(group=>-populationTotal(rows.filter(row=>row.sexo==='M'&&row.edad>=group.min&&row.edad<=group.max)));
  const female=groups.map(group=>populationTotal(rows.filter(row=>row.sexo==='F'&&row.edad>=group.min&&row.edad<=group.max)));
  const baselineRows=Number(state.demographyYear)===2022?[]:demographyRows(data,state,{year:2022,ageRange:'0-100',sex:'all'});
  const baselineMale=groups.map(group=>-populationTotal(baselineRows.filter(row=>row.sexo==='M'&&row.edad>=group.min&&row.edad<=group.max)));
  const baselineFemale=groups.map(group=>populationTotal(baselineRows.filter(row=>row.sexo==='F'&&row.edad>=group.min&&row.edad<=group.max)));
  const maxValue=Math.max(1,...female,...male.map(Math.abs),...baselineFemale,...baselineMale.map(Math.abs));
  const step=Math.max(100,Math.ceil(maxValue/4/1000)*1000);
  const ticks=Array.from({length:9},(_,i)=>(i-4)*step);
  const traces=[
    {type:'bar',orientation:'h',name:'Varones',y:groups.map(group=>group.label),x:male,marker:{color:COLORS.primary},customdata:male.map(Math.abs),hovertemplate:'Edad %{y}<br>Varones: %{customdata:,.0f}<extra></extra>'},
    {type:'bar',orientation:'h',name:'Mujeres',y:groups.map(group=>group.label),x:female,marker:{color:COLORS.coral},hovertemplate:'Edad %{y}<br>Mujeres: %{x:,.0f}<extra></extra>'}
  ];
  if(baselineRows.length){
    traces.push(
      {type:'scatter',mode:'lines',name:'Silueta 2022',legendgroup:'baseline2022',y:groups.map(group=>group.label),x:baselineMale,customdata:baselineMale.map(Math.abs),line:{color:COLORS.ink,width:1.3,dash:'dot',shape:'hv'},hovertemplate:'Referencia 2022<br>Edad %{y}<br>Varones: %{customdata:,.0f}<extra></extra>'},
      {type:'scatter',mode:'lines',name:'Silueta 2022',legendgroup:'baseline2022',showlegend:false,y:groups.map(group=>group.label),x:baselineFemale,line:{color:COLORS.ink,width:1.3,dash:'dot',shape:'hv'},hovertemplate:'Referencia 2022<br>Edad %{y}<br>Mujeres: %{x:,.0f}<extra></extra>'}
    );
  }
  plot('population-pyramid',traces,{barmode:'relative',margin:{l:58,r:20,t:34,b:48},xaxis:{gridcolor:'#EEF0EE',zeroline:true,zerolinecolor:COLORS.primaryDark,tickvals:ticks,ticktext:ticks.map(x=>Math.abs(x).toLocaleString('es-AR')),title:'Población'},yaxis:{gridcolor:'transparent',title:'Grupo de edad'},legend:{orientation:'h',y:1.13,x:.18}});
}

export function renderDepartmentShareChart(data,state) {
  const stats=demographyMapStats(data,state);
  const total=Math.max(1,stats.reduce((acc,item)=>acc+item.value,0));
  const ordered=[...stats]
    .map(item=>({...item,share:item.value/total}))
    .sort((a,b)=>b.share-a.share);
  const palette=['#14586A','#247C8C','#3C919F','#63A6B1','#8ABBC2','#FF6B35','#E98645','#FFC928','#D5A92A','#8A5A44','#A87359','#6D7880','#899297','#A8AFB2','#C8CDCE'];
  const traces=ordered.map((item,index)=>{
    const percentage=item.share*100;
    return {
      type:'bar',orientation:'h',name:item.territorio_nombre,x:[percentage],y:['Total provincial'],
      customdata:[[item.value,percentage]],
      marker:{
        color:palette[index%palette.length],
        line:{color:state.demographyTerritory===item.territorio_id?COLORS.ink:COLORS.surface,width:state.demographyTerritory===item.territorio_id?3:1}
      },
      text:[percentage>=3?`${percentage.toLocaleString('es-AR',{minimumFractionDigits:1,maximumFractionDigits:1})}%`:'' ],
      textposition:'inside',textangle:0,insidetextanchor:'middle',textfont:{color:index<5?COLORS.surface:COLORS.ink},
      hovertemplate:`<b>${item.territorio_nombre}</b><br>%{customdata[0]:,.0f} personas<br>%{customdata[1]:.1f}% del total provincial<extra></extra>`
    };
  });
  plot('department-share-chart',traces,{
    barmode:'stack',barnorm:'percent',margin:{l:18,r:18,t:35,b:150},
    xaxis:{gridcolor:'#EEF0EE',zeroline:false,title:'Participación en el total provincial (%)',ticksuffix:'%',range:[0,100],dtick:20},
    yaxis:{gridcolor:'transparent',showticklabels:false,fixedrange:true},
    legend:{orientation:'h',y:-.28,x:0,xanchor:'left',yanchor:'top',font:{size:10},traceorder:'normal'},
    bargap:.45,uniformtext:{mode:'hide',minsize:10}
  });
}

export function renderGrowthPolesChart(data,state) {
  const selectedYear=Number(state.demographyYear);
  const stats=demographyMapStats(data,{
    ...state,demographyYear:selectedYear,demographyAgeRange:'0-100',demographySex:'all'
  });
  const ordered=[...stats].sort((a,b)=>a.variation-b.variation);
  const values=ordered.map(item=>item.variation*100);
  const minimum=Math.min(...values,-1),maximum=Math.max(...values,1);
  plot('growth-poles-chart',[{
    type:'bar',orientation:'h',x:values,y:ordered.map(item=>item.territorio_nombre),
    customdata:ordered.map(item=>[item.base,item.value]),
    marker:{
      color:values.map(value=>value<0?COLORS.critical:COLORS.primary),
      line:{
        color:ordered.map(item=>state.demographyTerritory===item.territorio_id?COLORS.ink:COLORS.surface),
        width:ordered.map(item=>state.demographyTerritory===item.territorio_id?2:1)
      }
    },
    text:values.map(value=>`${value>0?'+':''}${value.toLocaleString('es-AR',{minimumFractionDigits:1,maximumFractionDigits:1})}%`),
    textposition:values.map(value=>value<0?'inside':'outside'),
    insidetextanchor:'middle',textfont:{color:values.map(value=>value<0?COLORS.surface:COLORS.ink)},cliponaxis:false,
    hovertemplate:`%{y}<br>2022: %{customdata[0]:,.0f}<br>${selectedYear}: %{customdata[1]:,.0f}<br>Cambio: %{x:.1f}%<extra></extra>`
  }],{
    margin:{l:130,r:58,t:10,b:45},showlegend:false,
    xaxis:{gridcolor:'#EEF0EE',zeroline:true,zerolinecolor:COLORS.ink,zerolinewidth:1.5,title:`Cambio 2022–${selectedYear} (%)`,ticksuffix:'%',range:[minimum-5,maximum+5]},
    yaxis:{gridcolor:'transparent',automargin:true}
  });
}

export function renderSummaryChart(territoryStats) {
  const ordered=[...territoryStats].sort((a,b)=>a.occupancy-b.occupancy);
  plot('summary-chart',[{type:'bar',orientation:'h',x:ordered.map(x=>x.occupancy*100),y:ordered.map(x=>x.territorio_nombre),marker:{color:ordered.map(x=>x.gap>0&&x.occupancy>1?COLORS.critical:x.gap>0||x.occupancy>=.85?COLORS.coral:x.occupancy>=.60?COLORS.yellow:COLORS.support)},text:ordered.map(x=>`${Math.round(x.occupancy*100)}%`),textposition:'outside',cliponaxis:false,hovertemplate:'%{y}<br>Ocupación %{x:.0f}%<extra></extra>'}],{margin:{l:104,r:38,t:10,b:36},xaxis:{gridcolor:'#EEF0EE',zeroline:false,title:'Ocupación estimada (%)'},yaxis:{gridcolor:'transparent'},showlegend:false,shapes:[{type:'line',x0:85,x1:85,y0:-.5,y1:ordered.length-.5,line:{color:COLORS.yellow,dash:'dot'}},{type:'line',x0:100,x1:100,y0:-.5,y1:ordered.length-.5,line:{color:COLORS.coral,dash:'dot'}}]});
}

export function renderCapacityChart(data,state,territoryIds) {
  const labels=territoryIds.map(id=>data.territoryById[id].territorio_nombre);
  const demand=territoryIds.map(id=>metricsFor(data,state,{territory:id}).projected);
  const capacity=territoryIds.map(id=>metricsFor(data,state,{territory:id}).capacity);
  plot('capacity-chart',[{type:'bar',name:'Matrícula proyectada',x:labels,y:demand,marker:{color:COLORS.coral}},{type:'bar',name:'Capacidad',x:labels,y:capacity,marker:{color:COLORS.support}}],{barmode:'group',margin:{...layoutBase.margin,b:90},yaxis:{...layoutBase.yaxis,title:'Personas'}});
}

export function renderProductivityChart(base, controls) {
  const years=Array.from({length:26},(_,i)=>2025+i);
  const values=years.map(year=>{
    if(year<controls.start)return 0;
    return base.annualDemand*Math.min(1,(year-controls.start+1)/controls.duration);
  });
  plot('productivity-chart',[{type:'scatter',mode:'lines',fill:'tozeroy',name:'Demanda educativa inducida',x:years,y:values,line:{color:COLORS.primary,width:3},fillcolor:'rgba(36,124,140,.15)'}],{yaxis:{...layoutBase.yaxis,title:'Matrícula adicional estimada'},shapes:[{type:'line',x0:controls.start,x1:controls.start,y0:0,y1:Math.max(...values),line:{color:COLORS.yellow,dash:'dot'}}]});
}

export function renderComparisonChart(a,b) {
  const labels=['Población escolar','Matrícula','Capacidad','Brecha'];
  plot('comparison-chart',[{type:'bar',name:'Referencia A',x:labels,y:[a.schoolPopulation,a.projected,a.capacity,a.gap],marker:{color:COLORS.primary}},{type:'bar',name:'Referencia B',x:labels,y:[b.schoolPopulation,b.projected,b.capacity,b.gap],marker:{color:COLORS.coral}}],{barmode:'group',margin:{...layoutBase.margin,b:80},yaxis:{...layoutBase.yaxis,title:'Personas'}});
}
