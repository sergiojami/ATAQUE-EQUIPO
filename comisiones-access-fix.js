/* Fix final de acceso a Ejercicios / Comisiones. Deja que el módulo estable gestione la pantalla completa. */
(function(){
  const baseRender=window.render;
  if(typeof baseRender!=='function') return;
  window.render=async function(page='inicio',...args){
    if(page!=='comisiones') return baseRender(page,...args);
    try{
      // El router estable ya renderiza el módulo con edición, personal y contador de noches.
      await baseRender('comisiones',...args);
      if(typeof window.ensureComisionesNav==='function') window.ensureComisionesNav('comisiones');
    }catch(e){
      const c=document.getElementById('content');
      if(c)c.innerHTML='<div class="panel error-state"><h3>No se pudo cargar Ejercicios / Comisiones</h3><p>'+String(e?.message||e).replace(/[&<>]/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[m]))+'</p><button class="btn secondary" onclick="render(\'inicio\')">Volver a Inicio</button></div>';
    }
  };
})();
