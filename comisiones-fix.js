/* Restauración estable del apartado Ejercicios / Comisiones. Debe cargarse después de funciones-fix.js. */
(function(){
  const baseRender=window.render;
  const showComisiones=async function(){
    await baseRender('inicio');
    const title=document.querySelector('.topbar h1');
    if(title) title.textContent='Ejercicios / Comisiones';
    if(typeof window.ensureComisionesNav==='function') window.ensureComisionesNav();
    if(typeof window.comisionesPage==='function') await window.comisionesPage();
  };
  window.render=async function(page='inicio'){
    if(page==='comisiones') return showComisiones();
    const result=await baseRender(page);
    setTimeout(()=>{if(typeof window.ensureComisionesNav==='function') window.ensureComisionesNav();},0);
    return result;
  };
  setTimeout(()=>{if(typeof window.ensureComisionesNav==='function') window.ensureComisionesNav();},0);
})();
