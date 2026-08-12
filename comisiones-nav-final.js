/* Integración definitiva de Ejercicios / Comisiones en el menú principal. */
(function () {
  function addComisionesNav() {
    const nav = document.querySelector('.side-nav');
    if (!nav) return;
    if (nav.querySelector('[data-comisiones-nav="1"]')) return;

    const link = document.createElement('button');
    link.type = 'button';
    link.className = 'side-link';
    link.dataset.comisionesNav = '1';
    link.innerHTML = '<span class="side-icon">✈</span><span>Ejercicios / Comisiones</span>';
    link.addEventListener('click', () => window.openComisionesFinal());
    nav.appendChild(link);
  }

  const previousRender = window.render;
  window.openComisionesFinal = async function () {
    addComisionesNav();
    await previousRender('inicio');
    addComisionesNav();
    const title = document.querySelector('.topbar h1');
    if (title) title.textContent = 'Ejercicios / Comisiones';
    const nav = document.querySelector('.side-nav');
    nav?.querySelector('[data-comisiones-nav="1"]')?.classList.add('active');
    if (typeof window.comisionesPage === 'function') {
      await window.comisionesPage();
    } else {
      const c = document.getElementById('content');
      if (c) c.innerHTML = '<div class="panel error-state"><h3>No se ha podido cargar Ejercicios / Comisiones</h3><p>El módulo no está disponible en esta versión.</p></div>';
    }
  };

  window.render = async function (page = 'inicio') {
    if (page === 'comisiones') return window.openComisionesFinal();
    const result = await previousRender(page);
    addComisionesNav();
    return result;
  };

  const observer = new MutationObserver(() => addComisionesNav());
  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(addComisionesNav, 100);
})();
