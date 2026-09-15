const clamp=(value,min,max)=>Math.max(min,Math.min(max,value));

function storageKey(panel){return `chubut2050.panel.${panel.dataset.panelModule||panel.id}`;}
function readSession(panel){try{return JSON.parse(sessionStorage.getItem(storageKey(panel)))||{};}catch{return{};}}
function writeSession(panel){
  const rect=panel.getBoundingClientRect();
  sessionStorage.setItem(storageKey(panel),JSON.stringify({
    floating:panel.classList.contains('is-floating'),
    minimized:panel.classList.contains('is-minimized'),
    left:Math.round(rect.left),top:Math.round(rect.top)
  }));
}
function controls(panel){return{
  float:panel.querySelector('[data-panel-float-toggle]'),
  minimize:panel.querySelector('[data-panel-minimize]')
};}
function syncButtons(panel){
  const {float,minimize}=controls(panel),floating=panel.classList.contains('is-floating'),minimized=panel.classList.contains('is-minimized');
  if(float){float.setAttribute('aria-pressed',String(floating));float.textContent=floating?'↙ Volver a su lugar':'↗ Mantener visible';}
  if(minimize){minimize.hidden=!floating;minimize.setAttribute('aria-expanded',String(!minimized));minimize.textContent=minimized?'□ Restaurar':'— Minimizar';}
}
function constrain(panel,left,top){
  const margin=12,rect=panel.getBoundingClientRect(),maxLeft=Math.max(margin,innerWidth-rect.width-margin),maxTop=Math.max(margin,innerHeight-rect.height-margin);
  panel.style.left=`${clamp(left,margin,maxLeft)}px`;panel.style.top=`${clamp(top,margin,maxTop)}px`;
}
function restorePosition(panel,saved={}){
  requestAnimationFrame(()=>{
    const rect=panel.getBoundingClientRect(),fallbackLeft=Math.max(12,innerWidth-rect.width-24),fallbackTop=Math.min(118,Math.max(12,innerHeight-rect.height-12));
    constrain(panel,Number.isFinite(saved.left)?saved.left:fallbackLeft,Number.isFinite(saved.top)?saved.top:fallbackTop);
  });
}
function setFloating(panel,enabled,{persist=true}={}){
  panel.classList.toggle('is-floating',enabled);
  if(!enabled){panel.classList.remove('is-minimized');panel.style.left='';panel.style.top='';}
  else restorePosition(panel,readSession(panel));
  syncButtons(panel);if(persist)requestAnimationFrame(()=>writeSession(panel));
}
function setMinimized(panel,enabled){
  if(!panel.classList.contains('is-floating'))return;
  panel.classList.toggle('is-minimized',enabled);syncButtons(panel);
  if(!enabled){const rect=panel.getBoundingClientRect();constrain(panel,rect.left,rect.top);}
  writeSession(panel);
}
function enableDrag(panel){
  const handle=panel.querySelector('[data-panel-drag-handle]');if(!handle)return;
  let drag=null;
  handle.addEventListener('pointerdown',event=>{
    if(matchMedia('(max-width: 680px)').matches||!panel.classList.contains('is-floating')||event.target.closest('button,input,select,label'))return;
    const rect=panel.getBoundingClientRect();drag={pointer:event.pointerId,dx:event.clientX-rect.left,dy:event.clientY-rect.top};
    handle.setPointerCapture(event.pointerId);panel.classList.add('is-dragging');event.preventDefault();
  });
  handle.addEventListener('pointermove',event=>{if(!drag||event.pointerId!==drag.pointer)return;constrain(panel,event.clientX-drag.dx,event.clientY-drag.dy);});
  const finish=event=>{
    if(!drag||event.pointerId!==drag.pointer)return;drag=null;panel.classList.remove('is-dragging');
    const rect=panel.getBoundingClientRect(),edge=28;
    if(rect.left<edge)panel.style.left='12px';
    else if(innerWidth-rect.right<edge)panel.style.left=`${Math.max(12,innerWidth-rect.width-12)}px`;
    writeSession(panel);
  };
  handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',finish);
}

export function initFloatingPanels(){
  const panels=[...document.querySelectorAll('[data-floating-panel]')];
  panels.forEach(panel=>{
    const saved=readSession(panel),{float,minimize}=controls(panel);
    float?.addEventListener('click',()=>setFloating(panel,!panel.classList.contains('is-floating')));
    minimize?.addEventListener('click',()=>setMinimized(panel,!panel.classList.contains('is-minimized')));
    enableDrag(panel);syncButtons(panel);
    if(saved.floating&&!panel.closest('[hidden]')){
      setFloating(panel,true,{persist:false});
      if(saved.minimized){panel.classList.add('is-minimized');syncButtons(panel);}
      requestAnimationFrame(()=>writeSession(panel));
    }
  });
  addEventListener('resize',()=>panels.filter(panel=>panel.classList.contains('is-floating')).forEach(panel=>{const rect=panel.getBoundingClientRect();constrain(panel,rect.left,rect.top);}));
  document.addEventListener('keydown',event=>{if(event.key!=='Escape')return;const active=panels.find(panel=>panel.classList.contains('is-floating')&&!panel.closest('[hidden]'));if(active)setFloating(active,false);});
  return panels;
}

export function setPanelSummary(module,text){
  const output=document.querySelector(`[data-floating-panel][data-panel-module="${module}"] [data-panel-summary]`);
  if(output)output.textContent=text;
}
