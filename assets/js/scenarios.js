export function scopedRows(rows, state, { ignoreLevel=false, scenario=state.scenario, territory=state.territory, year=state.year }={}) {
  return rows.filter(r =>
    (!('escenario_id' in r) || r.escenario_id === scenario) &&
    (territory === 'all' || r.territorio_id === territory) &&
    (!('year' in r) || r.year === Number(year)) &&
    (ignoreLevel || state.level === 'all' || r.nivel === state.level || r.modalidad === state.level)
  );
}

export function sum(rows, field) { return rows.reduce((total, row) => total + (Number(row[field]) || 0), 0); }

export function metricsFor(data, state, overrides={}) {
  const params = { scenario:overrides.scenario ?? state.scenario, territory:overrides.territory ?? state.territory, year:overrides.year ?? state.year };
  const demand = scopedRows(data.demand, state, params);
  const capacity = scopedRows(data.capacity, state, { ...params });
  const ageRanges = { Inicial:[3,5], Primario:[6,11], Secundario:[12,17], ETP:[15,18], 'Formación profesional':[18,24] };
  const [minAge,maxAge] = ageRanges[state.level] || [3,18];
  const population = scopedRows(data.population, state, { ...params, ignoreLevel:true }).filter(r => r.edad >= minAge && r.edad <= maxAge);
  const projected = sum(demand,'matricula_proyectada');
  const cap = sum(capacity,'capacidad_estimada');
  const current = sum(capacity,'matricula_actual');
  return {
    schoolPopulation:sum(population,'poblacion'), projected, capacity:cap, current,
    gap:projected-cap, occupancy:cap ? projected/cap : 0,
    etp:sum(demand.filter(r=>r.nivel==='ETP'),'matricula_proyectada')
  };
}

export function territoryMetrics(data, state) {
  return data.territories.features.map(feature => {
    const id=feature.properties.territorio_id;
    return { ...feature.properties, ...metricsFor(data,state,{territory:id}) };
  }).sort((a,b)=>b.occupancy-a.occupancy);
}

export function simulateProductiveImpact(poles, controls, selectedTerritory='all') {
  const relevant = poles.features.filter(f => selectedTerritory==='all' || f.properties.territorio_id===selectedTerritory);
  const employmentField = `empleo_directo_${controls.employment}`;
  const direct = relevant.reduce((a,f)=>a+Number(f.properties[employmentField]||0),0);
  const totalJobs = direct*controls.multiplier;
  const schoolPopulation = totalJobs*controls.familyRate*.62*.31;
  return { direct, totalJobs, schoolPopulation, annualDemand:schoolPopulation*.91, poles:relevant.length };
}
