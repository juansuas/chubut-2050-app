const STORAGE_KEY='chubut2050.v2.filters';
const DEFAULTS_REVISION=5;
import {DEFAULT_CAPACITY_THRESHOLDS} from './config.js?v=2.29.0';
const defaults={defaultsRevision:DEFAULTS_REVISION,module:'demografia',activeScenario:'moderado',capacityRateProgress:{},year:2050,demographyYear:2050,capacityYear:2024,territory:'all',educationSelection:'all',sex:'all',demographyMapMetric:'variation',capacitySchool:'all',capacityMode:'scenario',capacityComparisonMode:'scenario',capacityTrendView:'group',capacityDistributionMode:'count',capacityDepartmentLevel:'all',capacityAttendanceLevels:['INI','PRI','SEC','AGE18'],capacityRates:{},capacityThresholds:{...DEFAULT_CAPACITY_THRESHOLDS},productActivity:'all',productOperator:'all',productStatus:'all',productInstallation:'',scenarioProjects:{},scenarioProjectFilter:'all',scenarioImpactYear:2030,scenarioIncludeConstruction:false,scenarioIncludeRelated:true,scenarioIncludePeople:true,scenarioExternalPercent:100};
const listeners=new Set();
const ranges={all:'0-100','level:INI':'0-5','group:0_3':'0-3','group:4_5':'4-5','level:PRI':'6-11','group:6_11':'6-11','level:SEC':'12-17','group:12_14':'12-14','group:15_17':'15-17','group:18_SEC':'18-18'};
function saved(){try{return JSON.parse(localStorage.getItem(STORAGE_KEY))||{};}catch{return{};}}
function migrate(value){
  const territory=value.territory??value.capacityTerritory??value.demographyTerritory??'all';
  const hasCurrentDefaults=Number(value.defaultsRevision||0)>=DEFAULTS_REVISION;
  const activeScenario=['tendencial','moderado','intensivo','total','personalizado'].includes(value.activeScenario)?value.activeScenario:(localStorage.getItem('chubut2050.future.preset')||'moderado');
  const module=location.hash.slice(1)||value.module||defaults.module,demographyYear=Number(hasCurrentDefaults?(value.demographyYear??defaults.demographyYear):defaults.demographyYear),capacityYear=Math.max(2024,Number(value.capacityYear??defaults.capacityYear)),year=module==='oferta'?capacityYear:module==='demografia'?demographyYear:Number(value.year??demographyYear);
  const demographyMapMetric=hasCurrentDefaults?(value.demographyMapMetric??defaults.demographyMapMetric):defaults.demographyMapMetric;
  const sex=value.sex??value.capacitySex??value.demographySex??'all';
  let educationSelection=value.educationSelection;
  if(!educationSelection){if(value.capacityGroup&&value.capacityGroup!=='all')educationSelection=`group:${value.capacityGroup}`;else if(value.capacityLevel&&value.capacityLevel!=='all')educationSelection=`level:${value.capacityLevel}`;else educationSelection='all';}
  const capacityAttendanceLevels=Array.isArray(value.capacityAttendanceLevels)?value.capacityAttendanceLevels.filter(id=>['INI','PRI','SEC','AGE18'].includes(id)):[...defaults.capacityAttendanceLevels];
  const capacityDepartmentLevel=['all','INI','PRI','SEC','AGE18'].includes(value.capacityDepartmentLevel)?value.capacityDepartmentLevel:defaults.capacityDepartmentLevel;
  const scenarioProjects=value.scenarioProjects&&typeof value.scenarioProjects==='object'&&!Array.isArray(value.scenarioProjects)?value.scenarioProjects:{};
  const scenarioProjectFilter=['all','EOL','HID','TER'].includes(value.scenarioProjectFilter)?value.scenarioProjectFilter:'all';
  const scenarioIncludePeople=(value.scenarioIncludePeople??value.scenarioShowPeople)!==false;
  const externalValue=value.scenarioExternalPercent;
  const scenarioExternalPercent=typeof externalValue==='number'&&Number.isFinite(externalValue)
    ?Math.max(0,Math.min(100,externalValue)):100;
  const savedYear=Number(value.scenarioImpactYear);
  const scenarioImpactYear=Number.isInteger(savedYear)&&savedYear>=2026&&savedYear<=2050?savedYear:2030;
  return {...defaults,...value,capacityRates:Number(value.defaultsRevision||0)<5?{}:value.capacityRates||{},activeScenario,defaultsRevision:DEFAULTS_REVISION,territory,year,demographyYear,capacityYear,sex,educationSelection,demographyMapMetric,capacityAttendanceLevels,capacityDepartmentLevel,capacityThresholds:{...DEFAULT_CAPACITY_THRESHOLDS,...(value.capacityThresholds||{})},scenarioProjects,scenarioProjectFilter,scenarioImpactYear,scenarioIncludePeople,scenarioExternalPercent,module};
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
  if('scenarioImpactYear'in next&&!('year'in next))next.year=Number(next.scenarioImpactYear);
  if('scenarioPopulationDepartment'in next&&!('territory'in next))next.territory=next.scenarioPopulationDepartment;
  if('territory'in next)next.scenarioPopulationDepartment=next.territory;
  if('year'in next){next.year=Math.max(2022,Math.min(2050,Number(next.year)||2050));next.capacityYear=next.year;next.demographyYear=next.year;next.scenarioImpactYear=next.year;}
  state={...state,...next};
  if(persist)localStorage.setItem(STORAGE_KEY,JSON.stringify(state));
  listeners.forEach(listener=>listener(getState(),next));
}
export function subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);}
export function resetState(){const keep={module:state.module,year:state.year,activeScenario:state.activeScenario,scenarioProjects:state.scenarioProjects,scenarioIncludeConstruction:state.scenarioIncludeConstruction,scenarioIncludeRelated:state.scenarioIncludeRelated,scenarioIncludePeople:state.scenarioIncludePeople,scenarioExternalPercent:state.scenarioExternalPercent,capacityRateProgress:state.capacityRateProgress};state={...defaults,...keep,territory:'all',scenarioPopulationDepartment:'all',demographyYear:state.year,capacityYear:state.year,scenarioImpactYear:state.year};setState({});}
