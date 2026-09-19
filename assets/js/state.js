const STORAGE_KEY='chubut2050.v2.filters';
const DEFAULTS_REVISION=2;
import {DEFAULT_CAPACITY_THRESHOLDS} from './config.js';
const defaults={defaultsRevision:DEFAULTS_REVISION,module:'demografia',year:2050,demographyYear:2050,capacityYear:2024,territory:'all',educationSelection:'all',sex:'all',demographyMapMetric:'variation',capacitySchool:'all',capacityMode:'scenario',capacityComparisonMode:'scenario',capacityTrendView:'group',capacityDistributionMode:'count',capacityDepartmentLevel:'all',capacityAttendanceLevels:['INI','PRI','SEC','AGE18'],capacityRates:{},capacityThresholds:{...DEFAULT_CAPACITY_THRESHOLDS}};
const listeners=new Set();
const ranges={all:'0-100','level:INI':'0-5','group:0_3':'0-3','group:4_5':'4-5','level:PRI':'6-11','group:6_11':'6-11','level:SEC':'12-17','group:12_14':'12-14','group:15_17':'15-17','group:18_SEC':'18-18'};
function saved(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY))||{};}catch{return{};}}
function migrate(value){
  const territory=value.territory??value.capacityTerritory??value.demographyTerritory??'all';
  const hasCurrentDefaults=Number(value.defaultsRevision||0)>=DEFAULTS_REVISION;
  const module=location.hash.slice(1)||value.module||defaults.module,demographyYear=Number(hasCurrentDefaults?(value.demographyYear??defaults.demographyYear):defaults.demographyYear),capacityYear=Math.max(2024,Number(value.capacityYear??defaults.capacityYear)),year=module==='oferta'?capacityYear:module==='demografia'?demographyYear:Number(value.year??demographyYear);
  const demographyMapMetric=hasCurrentDefaults?(value.demographyMapMetric??defaults.demographyMapMetric):defaults.demographyMapMetric;
  const sex=value.sex??value.capacitySex??value.demographySex??'all';
  let educationSelection=value.educationSelection;
  if(!educationSelection){if(value.capacityGroup&&value.capacityGroup!=='all')educationSelection=`group:${value.capacityGroup}`;else if(value.capacityLevel&&value.capacityLevel!=='all')educationSelection=`level:${value.capacityLevel}`;else educationSelection='all';}
  const capacityAttendanceLevels=Array.isArray(value.capacityAttendanceLevels)?value.capacityAttendanceLevels.filter(id=>['INI','PRI','SEC','AGE18'].includes(id)):[...defaults.capacityAttendanceLevels];
  const capacityDepartmentLevel=['all','INI','PRI','SEC','AGE18'].includes(value.capacityDepartmentLevel)?value.capacityDepartmentLevel:defaults.capacityDepartmentLevel;
  return {...defaults,...value,defaultsRevision:DEFAULTS_REVISION,territory,year,demographyYear,capacityYear,sex,educationSelection,demographyMapMetric,capacityAttendanceLevels,capacityDepartmentLevel,capacityThresholds:{...DEFAULT_CAPACITY_THRESHOLDS,...(value.capacityThresholds||{})},module};
}
let state=migrate(saved());
function aliases(){
  const selection=state.educationSelection;
  const group=selection.startsWith('group:')?selection.slice(6):'all';
  const level=selection.startsWith('level:')?selection.slice(6):(group==='18_SEC'?'all':({'0_3':'INI','4_5':'INI','6_11':'PRI','12_14':'SEC','15_17':'SEC'}[group]||'all'));
  return {...state,demographyTerritory:state.territory,capacityTerritory:state.territory,demographySex:state.sex,capacitySex:state.sex,demographyAgeRange:ranges[selection]||'0-100',demographyAgeMode:'preset',capacityGroup:group,capacityLevel:level};
}
export function getState(){return aliases();}
export function setState(patch,{persist=true}={}){
  const next={...patch};
  if('demographyTerritory'in next||'capacityTerritory'in next)next.territory=next.capacityTerritory??next.demographyTerritory;
  if('demographySex'in next||'capacitySex'in next)next.sex=next.capacitySex??next.demographySex;
  const targetModule=next.module??state.module;
  if('demographyYear'in next){next.demographyYear=Number(next.demographyYear);if(targetModule==='demografia'&&!('year'in next))next.year=next.demographyYear;}
  if('capacityYear'in next){next.capacityYear=Math.max(2024,Number(next.capacityYear));if(targetModule==='oferta'&&!('year'in next))next.year=next.capacityYear;}
  if('module'in next&&!('year'in next))next.year=next.module==='oferta'?state.capacityYear:next.module==='demografia'?state.demographyYear:state.year;
  if('year'in next){next.year=Number(next.year);if(targetModule==='oferta')next.capacityYear=Math.max(2024,next.year);else if(targetModule==='demografia')next.demographyYear=next.year;}
  state={...state,...next};
  if(persist)localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
  listeners.forEach(listener=>listener(getState(),next));
}
export function subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);}
export function resetState(){const module=state.module,year=module==='oferta'?defaults.capacityYear:defaults.demographyYear;state={...defaults,year,capacityAttendanceLevels:[...defaults.capacityAttendanceLevels],capacityThresholds:{...DEFAULT_CAPACITY_THRESHOLDS},module};setState({},{});}
