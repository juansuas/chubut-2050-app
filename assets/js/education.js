import {COLORS,fmt} from './config.js';

let educationMap;
let educationLayer;

export const EDUCATION_LEVELS=[
  {value:'all',label:'Todos los niveles'},
  {value:'INI',label:'Inicial'},
  {value:'PRI',label:'Primario'},
  {value:'SEC_TOTAL',label:'Secundario total'},
  {value:'SEC_COMUN',label:'Secundario común'},
  {value:'SEC_ETP',label:'Secundario ETP'}
];

export const SECTOR_LABELS={all:'Todos los sectores',EST:'Estatal',PRI:'Privado',GSC:'Gestión social',SD:'Sin dato'};

function includesLevel(row,level){
  if(level==='all')return true;
  if(level==='SEC_TOTAL')return row.subnivel_id==='SEC_COMUN'||row.subnivel_id==='SEC_ETP';
  return row.subnivel_id===level;
}

export function educationRows(data,state,{year=state.educationYear,territory=state.educationTerritory,level=state.educationLevel,sector=state.educationSector}={}){
  return data.education.filter(row=>(year==='all'||row.year===year)&&(territory==='all'||row.departamento_id===territory)&&includesLevel(row,level)&&(sector==='all'||row.sector_id===sector));
}

export function educationTerritoryName(data,id){
  return id==='all'?'Toda la provincia':data.territoryById[id]?.territorio_nombre||id;
}

export function educationLevelName(level){return EDUCATION_LEVELS.find(item=>item.value===level)?.label||level;}
export function sumField(rows,field){return rows.reduce((sum,row)=>sum+(Number(row[field])||0),0);}
export function uniqueCount(rows,field){return new Set(rows.map(row=>row[field]).filter(Boolean)).size;}

export function educationMapStats(data,state){
  return Object.keys(data.territoryById).map(id=>{
    const rows=educationRows(data,state,{territory:id});
    return {id,name:data.territoryById[id].territorio_nombre,value:sumField(rows,'matricula'),sections:sumField(rows,'secciones_grado'),schools:uniqueCount(rows,'cue_anexo')};
  });
}

function breaks(values){
  const sorted=values.filter(value=>value>0).sort((a,b)=>a-b);
  if(!sorted.length)return [0,0,0,0];
  return [.2,.4,.6,.8].map(q=>sorted[Math.min(sorted.length-1,Math.floor(q*(sorted.length-1)))]);
}

function color(value,cuts){
  if(!value)return '#E8ECEB';
  const palette=['#D9EEF0','#A9D4D9','#70B2BB','#388B99','#14586A'];
  return palette[cuts.findIndex(cut=>value<=cut)===-1?4:cuts.findIndex(cut=>value<=cut)];
}

export function renderEducationMap(data,state,onSelect){
  const stats=educationMapStats(data,state);
  const byId=Object.fromEntries(stats.map(row=>[row.id,row]));
  const cuts=breaks(stats.map(row=>row.value));
  if(!educationMap){
    educationMap=L.map('education-map',{zoomControl:true,scrollWheelZoom:false}).setView([-43.9,-68.7],5);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:18,attribution:'© OpenStreetMap'}).addTo(educationMap);
  }
  if(educationLayer)educationLayer.remove();
  educationLayer=L.geoJSON(data.departmentBoundaries,{
    style:feature=>{
      const id=String(feature.properties.territorio_id);
      return {fillColor:color(byId[id]?.value||0,cuts),fillOpacity:.82,color:state.educationTerritory===id?'#FF6B35':'#FFFFFF',weight:state.educationTerritory===id?3:1};
    },
    onEachFeature:(feature,layer)=>{
      const id=String(feature.properties.territorio_id),row=byId[id]||{value:0,sections:0,schools:0};
      layer.bindTooltip(`<div class="map-tooltip"><strong>${feature.properties.territorio_nombre}</strong><br>Matrícula: ${fmt.format(row.value)}<br>Secciones-grado: ${fmt.format(row.sections)}<br>Establecimientos: ${fmt.format(row.schools)}</div>`);
      layer.on('click',()=>onSelect(id));
    }
  }).addTo(educationMap);
  educationMap.fitBounds(educationLayer.getBounds(),{padding:[12,12]});
  setTimeout(()=>{
    educationMap.invalidateSize();
    educationMap.fitBounds(educationLayer.getBounds(),{padding:[12,12]});
  },80);
}

const layout={paper_bgcolor:'rgba(0,0,0,0)',plot_bgcolor:'rgba(0,0,0,0)',font:{family:'Inter, Arial, sans-serif',size:11,color:'#5B6470'},margin:{l:62,r:18,t:20,b:48},xaxis:{gridcolor:'#ECE8DE',zeroline:false},yaxis:{gridcolor:'#ECE8DE',zeroline:false},hoverlabel:{bgcolor:'#FFFFFF',bordercolor:'#D8D4CA',font:{color:'#1F2933'}}};
const plot=(id,traces,extra={})=>Plotly.react(id,traces,{...layout,...extra},{displayModeBar:false,responsive:true});

export function renderEducationTrend(data,state){
  const years=Array.from({length:14},(_,index)=>2011+index);
  const all=educationRows(data,state,{year:'all'});
  const values=years.map(year=>sumField(all.filter(row=>row.year===year),'matricula'));
  plot('education-trend',[{type:'scatter',mode:'lines+markers',x:years,y:values,line:{color:COLORS.primary,width:3},marker:{size:6,color:years.map(year=>year===state.educationYear?COLORS.yellow:COLORS.primary)},hovertemplate:'%{x}: %{y:,.0f}<extra></extra>'}],{yaxis:{...layout.yaxis,title:'Matrícula'},xaxis:{...layout.xaxis,dtick:2}});
}

export function renderEducationComposition(data,state){
  const rows=educationRows(data,state,{level:'all'});
  const levels=['INI','PRI','SEC_COMUN','SEC_ETP'];
  const labels=['Inicial','Primario','Secundario común','Secundario ETP'];
  const values=levels.map(level=>sumField(rows.filter(row=>row.subnivel_id===level),'matricula'));
  plot('education-composition',[{type:'bar',x:labels,y:values,marker:{color:[COLORS.yellow,COLORS.support,COLORS.primary,COLORS.coral]},hovertemplate:'%{x}: %{y:,.0f}<extra></extra>'}],{yaxis:{...layout.yaxis,title:'Matrícula'},xaxis:{...layout.xaxis,tickangle:-15}});
}

export function renderTopEstablishments(data,state){
  const rows=educationRows(data,state);
  const grouped={};
  rows.forEach(row=>{const key=row.cue_anexo;grouped[key]??={name:row.establecimiento_nombre||key,value:0};grouped[key].value+=row.matricula;});
  const top=Object.values(grouped).sort((a,b)=>b.value-a.value).slice(0,12).reverse();
  plot('education-establishments',[{type:'bar',orientation:'h',x:top.map(row=>row.value),y:top.map(row=>row.name),marker:{color:COLORS.support},hovertemplate:'%{y}<br>%{x:,.0f}<extra></extra>'}],{margin:{...layout.margin,l:175},xaxis:{...layout.xaxis,title:'Matrícula'},yaxis:{...layout.yaxis,automargin:true}});
}

export function educationGradeRows(data,state){
  const rows=educationRows(data,state);
  const grouped={};
  rows.forEach(row=>{
    const key=`${row.subnivel_id}|${row.grado_id}`;
    grouped[key]??={subnivel:row.subnivel_nombre,grade:row.grado_nombre||row['año_grado'],order:row.grado_orden,matricula:0,sections:0,schools:new Set()};
    grouped[key].matricula+=row.matricula;grouped[key].sections+=row.secciones_grado;grouped[key].schools.add(row.cue_anexo);
  });
  return Object.values(grouped).sort((a,b)=>a.subnivel.localeCompare(b.subnivel)||a.order-b.order);
}
