import {MODULES} from './config.js';
import {getState,setState} from './state.js';

export function initRouter(onRoute){
  const activate=()=>{
    const requested=location.hash.replace('#','');
    const route=MODULES.includes(requested)?requested:'demografia';
    if(getState().module!==route)setState({module:route});
    document.querySelectorAll('[data-module]').forEach(element=>{element.hidden=element.dataset.module!==route;});
    document.querySelectorAll('[data-route]').forEach(element=>element.classList.toggle('active',element.dataset.route===route));
    onRoute?.(route);
  };
  addEventListener('hashchange',activate);
  if(!MODULES.includes(location.hash.slice(1)))history.replaceState(null,'','#demografia');
  activate();
}
