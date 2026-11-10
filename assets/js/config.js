export const DATA_PATHS = {
  demographyPopulation:'data/poblacion_demografica.csv?v=2.8.0',
  demographyIndec:'data/poblacion_indec_provincial.csv',
  demographyMetadata:'data/demografia_metadata.json',
  attendanceRates:'data/tasas_asistencia_grupo.csv?v=2.8.0',
  capacitySections:'data/secciones_capacidad_2024.csv?v=2.8.0',
  capacityMetadata:'data/capacidad_metadata.json?v=2.8.0',
  productionInstallations:'data/instalaciones_energeticas.geojson?v=2.13.0',
  productionIndicators:'data/indicadores_productivos_departamento.csv?v=2.13.0',
  productionMetadata:'data/productivo_metadata.json?v=2.13.0',
  productionSources:'data/fuentes_productivas.csv?v=2.13.0',
  departmentBoundaries:'data/departamentos_chubut.geojson',
  metadata:'data/metadata.json?v=2.13.0'
};

export const YEARS=Array.from({length:29},(_,index)=>2022+index);
export const DEFAULT_CAPACITY_THRESHOLDS=Object.freeze({INI:18,PRI:22,SEC:26});
export const MODULES=['resumen','demografia','oferta','productivos','comparador'];
export const COLORS={
  primary:'#247C8C',primaryDark:'#14586A',coral:'#FF6B35',yellow:'#FFC928',support:'#63A6B1',critical:'#B9472F',brown:'#8A5A44',
  blue:'#14586A',green:'#247C8C',greenAlt:'#63A6B1',magenta:'#FF6B35',amber:'#FFC928',red:'#B9472F',
  ink:'#1F2933',muted:'#5B6470',line:'#E5E0D6',surface:'#FFFFFF',soft:'#FAF8F2'
};
export const fmt=new Intl.NumberFormat('es-AR',{maximumFractionDigits:0});
export const pct=new Intl.NumberFormat('es-AR',{style:'percent',maximumFractionDigits:1});

export function occupancyStatus(value){
  if(value>1)return{label:'Saturada',className:'critical',color:COLORS.red};
  if(value>=.85)return{label:'Alta presión',className:'warn',color:COLORS.coral};
  if(value>=.60)return{label:'Equilibrio',className:'balanced',color:COLORS.yellow};
  return{label:'Capacidad disponible',className:'available',color:COLORS.support};
}
