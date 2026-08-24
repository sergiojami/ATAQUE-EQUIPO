/* Navegación móvil: evita que el menú/capas queden por encima del contenido. */
(function(){
  const isMobile=()=>window.matchMedia('(max-width:900px)').matches;
  function ensureBackdrop(){
    if(document.getElementById('mobileNavBackdrop')) return;
    const b=document.createElement('div');
    b.id='mobileNavBackdrop';
    b.setAttribute('aria-hidden','true');
    b.addEventListener('click',()=>closeSidebar());
    document.body.appendChild(b);
  }
  function closeSidebar(){
    document.getElementById('sidebar')?.classList.remove('open');
    document.getElementById('mobileNavBackdrop')?.classList.remove('visible');
    document.body.classList.remove('mobile-nav-open');
  }
  function openSidebar(){
    if(!isMobile()) return;
    ensureBackdrop();
    document.getElementById('sidebar')?.classList.add('open');
    document.getElementById('mobileNavBackdrop')?.classList.add('visible');
    document.body.classList.add('mobile-nav-open');
  }
  window.toggleSidebar=function(){
    const sidebar=document.getElementById('sidebar');
    if(!sidebar) return;
    if(sidebar.classList.contains('open')) closeSidebar(); else openSidebar();
  };
  window.closeMobileSidebar=closeSidebar;
  document.addEventListener('click',e=>{
    const link=e.target.closest?.('.side-link');
    if(link && isMobile()) setTimeout(closeSidebar,0);
  },true);
  window.addEventListener('resize',()=>{if(!isMobile()) closeSidebar();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape') closeSidebar();});
  ensureBackdrop();
})();
