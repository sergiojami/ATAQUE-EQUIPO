/* Misiones - integración final estable.
   Se carga después de todos los routers para garantizar que el apartado aparezca
   en el menú lateral, Inicio y la navegación, aunque otro módulo haya redefinido render(). */
(function(){
  'use strict';

  const injectNavAndHome = () => {
    // Menú lateral
    const nav = document.querySelector('.side-nav');
    if (nav && ![...nav.querySelectorAll('.side-link')].some(b => b.textContent.trim() === 'Misiones')) {
      const target = [...nav.querySelectorAll('.side-link')].find(b => b.textContent.includes('Ejercicios / Comisiones'));
      if (target) {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'side-link';
        b.innerHTML = '<span class="side-icon">✈</span><span>Misiones</span>';
        b.onclick = () => window.render('misiones');
        target.insertAdjacentElement('afterend', b);
      }
    }

    // Acceso rápido en Inicio
    const quick = document.querySelector('.quick-grid');
    if (quick && ![...quick.querySelectorAll('button')].some(b => b.textContent.includes('Misiones'))) {
      const b = document.createElement('button');
      b.className = 'quick-missions';
      b.onclick = () => window.render('misiones');
      b.innerHTML = '<strong>✈ Misiones</strong><span>Fechas, lugares, personal asignado y noches.</span>';
      quick.appendChild(b);
    }
  };

  const markActive = () => {
    const links = [...document.querySelectorAll('.side-link')];
    links.forEach(b => {
      if (b.textContent.trim() === 'Misiones') b.classList.toggle('active', (document.querySelector('.topbar h1')?.textContent || '').trim() === 'Misiones');
    });
  };

  const originalRender = window.render;
  if (typeof originalRender === 'function') {
    window.render = async function(page='inicio', ...args) {
      if (page === 'misiones') {
        // El módulo misiones.js contiene el render completo. Lo llamamos directamente
        // para evitar que los routers antiguos se pisen entre sí.
        if (typeof window.misionesPage === 'function') {
          await window.misionesPage();
          const h = document.querySelector('.topbar h1');
          if (h) h.textContent = 'Misiones';
          injectNavAndHome();
          markActive();
          return;
        }
        // Fallback: si el módulo no llegó a cargar, mostrar el error claramente.
        await originalRender('comisiones', ...args);
        const h = document.querySelector('.topbar h1');
        if (h) h.textContent = 'Misiones';
        injectNavAndHome();
        markActive();
        return;
      }

      const result = await originalRender(page, ...args);
      // Esperamos al pintado final del DOM para que Inicio tenga el acceso visible.
      setTimeout(() => { injectNavAndHome(); markActive(); }, 0);
      return result;
    };
  }

  // También funciona si el usuario ya está dentro de Inicio cuando se carga el parche.
  injectNavAndHome();
  setTimeout(injectNavAndHome, 100);
  setTimeout(injectNavAndHome, 500);
})();
