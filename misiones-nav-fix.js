/* Misiones - integración final estable.
   Se carga al final de index.html para garantizar que el apartado aparezca
   en el menú lateral, Inicio y la navegación, aunque otros routers redefinan render(). */
(function(){
  'use strict';

  const injectNavAndHome = () => {
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
    const title = (document.querySelector('.topbar h1')?.textContent || '').trim();
    document.querySelectorAll('.side-link').forEach(b => {
      if (b.textContent.trim() === 'Misiones') b.classList.toggle('active', title === 'Misiones');
    });
  };

  const previous = window.render;
  if (typeof previous === 'function') {
    window.render = async function(page='inicio', ...args) {
      if (page === 'misiones') {
        if (typeof window.misionesPage === 'function') {
          await window.misionesPage();
        } else {
          await previous('comisiones', ...args);
          const c = document.getElementById('content');
          if (c) c.innerHTML = '<div class="panel error-state"><h3>Misiones no disponible</h3><p>El módulo de Misiones no se ha podido cargar.</p></div>';
        }
        const h = document.querySelector('.topbar h1');
        if (h) h.textContent = 'Misiones';
        injectNavAndHome();
        markActive();
        return;
      }

      const result = await previous(page, ...args);
      setTimeout(() => { injectNavAndHome(); markActive(); }, 0);
      return result;
    };
  }

  injectNavAndHome();
  setTimeout(injectNavAndHome, 100);
  setTimeout(injectNavAndHome, 500);
})();
