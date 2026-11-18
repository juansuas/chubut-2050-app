// A viewport-fixed sidebar, with the same controls available in a mobile drawer.
let sidebar,toggle,backdrop,closeButton,mobile,open=false;
function syncSidebar(){
  if(!sidebar)return;
  const compact=mobile.matches;
  document.body.classList.toggle('sidebar-open',compact&&open);
  sidebar.inert=compact&&!open;
  sidebar.setAttribute('aria-hidden',String(compact&&!open));
  toggle.hidden=!compact;
  closeButton.hidden=!compact;
  toggle.setAttribute('aria-expanded',String(compact&&open));
  backdrop.hidden=!compact||!open;
}
export function closeMobileSidebar(){open=false;syncSidebar();}
export function initPageLayout(){
  sidebar=document.getElementById('module-sidebar');
  toggle=document.getElementById('sidebar-toggle');
  backdrop=document.getElementById('sidebar-backdrop');
  closeButton=document.getElementById('sidebar-close');
  mobile=matchMedia('(max-width:980px)');
  const measure=()=>document.documentElement.style.setProperty('--header-height',`${Math.ceil(document.querySelector('.site-header').getBoundingClientRect().height)}px`);
  new ResizeObserver(measure).observe(document.querySelector('.site-header'));
  measure();
  toggle.addEventListener('click',()=>{open=!open;syncSidebar();if(open)closeButton.focus();});
  closeButton.addEventListener('click',()=>{closeMobileSidebar();toggle.focus();});
  backdrop.addEventListener('click',closeMobileSidebar);
  mobile.addEventListener('change',()=>{open=false;syncSidebar();});
  document.addEventListener('keydown',event=>{
    if(!mobile.matches||!open)return;
    if(event.key==='Escape'){closeMobileSidebar();toggle.focus();}
    if(event.key==='Tab'){
      const focusable=[...sidebar.querySelectorAll('button,select,input,a[href],summary')].filter(el=>!el.disabled&&el.getClientRects().length);
      const first=focusable[0],last=focusable.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    }
  });
  document.getElementById('sidebar-guide-links').addEventListener('click',event=>{
    const button=event.target.closest('[data-page-section]');
    if(!button)return;
    closeMobileSidebar();
    document.getElementById(button.dataset.pageSection)?.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion:reduce)').matches?'instant':'smooth',block:'start'});
  });
  syncSidebar();
}
