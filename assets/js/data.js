import {DATA_PATHS} from './config.js?v=2.13.0';

async function fetchJSON(path){const response=await fetch(path);if(!response.ok)throw new Error(`No se pudo cargar ${path} (${response.status})`);return response.json();}
async function fetchCSV(path){
  const response=await fetch(path);if(!response.ok)throw new Error(`No se pudo cargar ${path} (${response.status})`);
  const text=await response.text();
  return new Promise((resolve,reject)=>Papa.parse(text,{header:true,skipEmptyLines:true,dynamicTyping:true,complete:r=>r.errors.length?reject(new Error(`CSV inválido: ${path}`)):resolve(r.data),error:reject}));
}
const pending=new Map();
function once(key,loader){if(!pending.has(key))pending.set(key,loader());return pending.get(key);}

export async function loadCoreData(){
  return once('core',async()=>{
    const [departmentBoundaries,metadata]=await Promise.all([fetchJSON(DATA_PATHS.departmentBoundaries),fetchJSON(DATA_PATHS.metadata)]);
    const territoryById=Object.fromEntries(departmentBoundaries.features.map(f=>[String(f.properties.territorio_id),f.properties]));
    return {departmentBoundaries,metadata,territoryById};
  });
}
export async function loadDemographyData(){
  return once('demography',async()=>{
    const [population,demographyIndec,demographyMetadata]=await Promise.all([fetchCSV(DATA_PATHS.demographyPopulation),fetchCSV(DATA_PATHS.demographyIndec),fetchJSON(DATA_PATHS.demographyMetadata)]);
    return {demographyPopulation:population.map(r=>({territorio_id:String(r.departamento_id).padStart(5,'0'),territorio_nombre:r.departamento_nombre,year:Number(r.year),edad:Number(r.edad),sexo:r.sexo_id,poblacion:Number(r.poblacion)||0})),demographyIndec:demographyIndec.map(r=>({...r,year:Number(r.year),poblacion:Number(r.poblacion)})),demographyMetadata};
  });
}
export async function loadCapacityData(){
  return once('capacity',async()=>{
    const [attendanceRaw,capacityRaw,capacityMetadata]=await Promise.all([fetchCSV(DATA_PATHS.attendanceRates),fetchCSV(DATA_PATHS.capacitySections),fetchJSON(DATA_PATHS.capacityMetadata)]);
    return {attendanceRates:attendanceRaw.map(r=>({...r,territorio_id:String(r.territorio_id),tasa_asistencia:r.tasa_asistencia===''||r.tasa_asistencia==null?null:Number(r.tasa_asistencia),numerador:r.numerador===''||r.numerador==null?null:Number(r.numerador),denominador:r.denominador===''||r.denominador==null?null:Number(r.denominador)})),capacitySections:capacityRaw.map(r=>({...r,departamento_id:String(r.departamento_id).padStart(5,'0'),cue_anexo:String(r.cue_anexo).padStart(9,'0'),matricula_actual:Number(r.matricula_actual)||0,matricula_varones_actual:Number(r.matricula_varones_actual)||0,matricula_mujeres_actual:Number(r.matricula_mujeres_actual)||0,capacidad:Number(r.capacidad)||0,longitud:r.longitud==null?null:Number(r.longitud),latitud:r.latitud==null?null:Number(r.latitud)})),capacityMetadata};
  });
}

export async function loadProductionData(){
  return once('production',async()=>{
    const [installationGeoJSON,indicatorRows,productionMetadata,sourceRows]=await Promise.all([
      fetchJSON(DATA_PATHS.productionInstallations),
      fetchCSV(DATA_PATHS.productionIndicators),
      fetchJSON(DATA_PATHS.productionMetadata),
      fetchCSV(DATA_PATHS.productionSources),
    ]);
    const productionInstallations=installationGeoJSON.features.map(feature=>({
      ...feature.properties,
      departamento_id:String(feature.properties.departamento_id).padStart(5,'0'),
      latitud:Number(feature.geometry.coordinates[1]),
      longitud:Number(feature.geometry.coordinates[0]),
      capacidad_instalada_mw:feature.properties.capacidad_instalada_mw==null?null:Number(feature.properties.capacidad_instalada_mw),
      potencia_declarada_proyecto_mw:feature.properties.potencia_declarada_proyecto_mw==null?null:Number(feature.properties.potencia_declarada_proyecto_mw),
      turbinas_unidades:feature.properties.turbinas_unidades==null?null:Number(feature.properties.turbinas_unidades),
    }));
    const productionIndicators=indicatorRows.map(row=>({...row,departamento_id:String(row.departamento_id).padStart(5,'0'),instalaciones_total:Number(row.instalaciones_total)||0,instalaciones_con_capacidad:Number(row.instalaciones_con_capacidad)||0,capacidad_instalada_mw_conocida:row.capacidad_instalada_mw_conocida==null||row.capacidad_instalada_mw_conocida===''?null:Number(row.capacidad_instalada_mw_conocida),potencia_declarada_proyecto_mw:row.potencia_declarada_proyecto_mw==null||row.potencia_declarada_proyecto_mw===''?null:Number(row.potencia_declarada_proyecto_mw)}));
    const productionSourceById=Object.fromEntries(sourceRows.map(row=>[row.fuente_id,row]));
    return {productionInstallationGeoJSON:installationGeoJSON,productionInstallations,productionIndicators,productionMetadata,productionSources:sourceRows,productionSourceById};
  });
}
