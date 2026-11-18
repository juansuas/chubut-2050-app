const SESSION_KEY='chubut2050.production.workspace';
let view='projects',result='energy';

export const productionView=()=>view;

function resizeVisibleCharts(){
  requestAnimationFrame(()=>{
    document.querySelectorAll('#productivos .js-plotly-plot').forEach(chart=>{
      if(chart.getClientRects().length)Plotly.Plots.resize(chart);
    });
  });
}

function applyTabs(selector,active){
  document.querySelectorAll(selector).forEach(button=>{
    const selected=button.dataset.productionTab===active||button.dataset.resultTab===active;
    button.setAttribute('aria-selected',String(selected));
    button.tabIndex=selected?0:-1;
    document.getElementById(button.getAttribute('aria-controls')).hidden=!selected;
  });
}

export function syncProductionWorkspace(){
  applyTabs('[data-production-tab]',view);
  applyTabs('[data-result-tab]',result);
  document.getElementById('production-inventory-analysis').hidden=view!=='inventory';
  document.querySelector('#productivos .production-results').hidden=view!=='projects';
  document.getElementById('production-download').hidden=view!=='inventory';
  resizeVisibleCharts();
}

export function initProductionWorkspace(onViewChange){
  const root=document.getElementById('productivos');
  const header=document.querySelector('.site-header');
  const context=root.querySelector('.production-context');
  const observeLayout=()=>{
    root.style.setProperty('--production-sticky-top',`${header.getBoundingClientRect().height}px`);
    root.style.setProperty('--production-context-height',`${context.getBoundingClientRect().height}px`);
  };
  const observer=new ResizeObserver(observeLayout);
  observer.observe(header);observer.observe(context);observeLayout();
  try{
    const saved=JSON.parse(sessionStorage.getItem(SESSION_KEY))||{};
    if(['projects','inventory'].includes(saved.view))view=saved.view;
    if(['energy','population','education'].includes(saved.result))result=saved.result;
  }catch{}
  const choose=button=>{
    const changesView=!!button.dataset.productionTab;
    if(changesView)view=button.dataset.productionTab;
    else result=button.dataset.resultTab;
    try{sessionStorage.setItem(SESSION_KEY,JSON.stringify({view,result}));}catch{}
    syncProductionWorkspace();
    if(changesView)onViewChange();
  };
  document.querySelectorAll('#productivos [role="tablist"]').forEach(list=>{
    list.addEventListener('click',event=>{
      const button=event.target.closest('[role="tab"]');
      if(button)choose(button);
    });
    list.addEventListener('keydown',event=>{
      if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
      const buttons=[...list.querySelectorAll('[role="tab"]')];
      const current=buttons.indexOf(document.activeElement);
      if(current<0)return;
      event.preventDefault();
      const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:
        (current+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;
      choose(buttons[next]);buttons[next].focus();
    });
  });
  syncProductionWorkspace();
}
