// Productive scenarios belong to Escenarios; the thematic modules use their baseline.
export function moduleState(state){
 if(!['demografia','oferta','productivos'].includes(state.module))return state;
 return {...state,activeScenario:'tendencial',scenarioProjects:{},capacityRateProgress:{},capacityRates:{},capacityMode:'trend',capacityComparisonMode:'trend',productionView:'inventory'};
}
