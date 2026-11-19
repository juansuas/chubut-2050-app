import {MODULES} from './config.js?v=2.30.0';
import {getState,setState} from './state.js?v=2.30.0';

export function initRouter(onRoute){
  const activate=()=>{
    const requested=location.hash.slice(1);
    const canonical=requested==='resumen'?'escenarios':requested;
    const route=MODULES.includes(canonical)?canonical:'demografia';
    if(requested!==route)history.replaceState(null,'',`#${route}`);
    if(getState().module!==route)setState({module:route});
    document.querySelectorAll('[data-module]').forEach(element=>{element.hidden=element.dataset.module!==route;});
    document.querySelectorAll('[data-route]').forEach(element=>element.classList.toggle('active',element.dataset.route===route));
    onRoute?.(route);
  };
  addEventListener('hashchange',activate);
  activate();
}
