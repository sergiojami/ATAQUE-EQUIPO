/* Misiones - corrección de navegación y renderizado.
   Evita el doble montaje del apartado, la duplicación del menú y el formulario
   quedando detrás de otra vista. Se carga después de misiones-nav-fix.js. */
(function(){
  'use strict';

  const wait = (fn) => setTimeout(fn, 0);

  function dedupeMisionesNav(){
    const nav=document.querySelector('.side-nav');
    if(nav){
      const links=[...nav.querySelectorAll('.side-link')].filter(b=>b.textContent.trim()==='Misiones');
      links.slice(1).forEach(b=>b.remove());
    }
    const quick=document.querySelector('.quick-grid');
    if(quick){
      const links=[...quick.querySelectorAll('button')].filter(b=>b.textContent.includes('Misiones'));
      links.slice(1).forEach(b=>b.remove());
    }
  }

  function activateMissionNav(){
    const title=(document.querySelector('.topbar h1')?.textContent||'').trim();
    document.querySelectorAll('.side-link').forEach(b=>{
      if(b.textContent.trim()==='Misiones') b.classList.toggle('active',title==='Misiones');
    });
  }

  const previous=window.render;
  if(typeof previous!=='function') return;

  window.render=async function(page='inicio',...args){
    if(page==='misiones'){
      // Siempre reconstruimos la carcasa de la aplicación primero.
      // Esto evita que Misiones se monte encima de la página anterior.
      await previous('inicio',...args);
      if(typeof window.misionesPage==='function') await window.misionesPage();
      const h=document.querySelector('.topbar h1');
      if(h) h.textContent='Misiones';
      dedupeMisionesNav();
      activateMissionNav();
      return;
    }
    const result=await previous(page,...args);
    wait(()=>{dedupeMisionesNav();activateMissionNav();});
    return result;
  };

  wait(()=>{dedupeMisionesNav();activateMissionNav();});
})();
