/* Integración definitiva de Ejercicios Nacionales en el menú principal. */
(function () {
  function addComisionesNav() {
    const nav = document.querySelector('.side-nav');
    if (!nav) return;
    const existing = nav.querySelector('[data-comisiones-nav="1"]');
    if (existing) {
      const label = existing.querySelector('span:last-child');
      if (label) label.textContent = 'Ejercicios Nacionales';
      return;
    }
    const link = document.createElement('button');
    link.type = 'button';
    link.className = 'side-link';
    link.dataset.comisionesNav = '1';
    link.innerHTML = '<span class="side-icon">✈</span><span>Ejercicios Nacionales</span>';
    link.addEventListener('click', () => window.openComisionesFinal());
    nav.appendChild(link);
  }

  const renameVisibleLabels = () => {
    document.querySelectorAll('.side-nav span, .topbar h1, #content h3, #content th, #content p, #content .eyebrow').forEach(el => {
      if (el.childNodes.length === 1 && el.textContent.trim() === 'Ejercicios / Comisiones') el.textContent = 'Ejercicios Nacionales';
    });
  };

  const previousRender = window.render;
  window.openComisionesFinal = async function () {
    addComisionesNav();
    await previousRender('inicio');
    addComisionesNav();
    const title = document.querySelector('.topbar h1');
    if (title) title.textContent = 'Ejercicios Nacionales';
    const nav = document.querySelector('.side-nav');
    nav?.querySelector('[data-comisiones-nav="1"]')?.classList.add('active');
    if (typeof window.comisionesPage === 'function') {
      await window.comisionesPage();
      renameVisibleLabels();
    } else {
      const c = document.getElementById('content');
      if (c) c.innerHTML = '<div class="panel error-state"><h3>No se ha podido cargar Ejercicios Nacionales</h3><p>El módulo no está disponible en esta versión.</p></div>';
    }
  };

  window.render = async function (page = 'inicio') {
    if (page === 'comisiones') return window.openComisionesFinal();
    const result = await previousRender(page);
    addComisionesNav();
    renameVisibleLabels();
    return result;
  };

  const observer = new MutationObserver(() => { addComisionesNav(); renameVisibleLabels(); });
  observer.observe(document.body, { childList: true, subtree: true });
  setTimeout(() => { addComisionesNav(); renameVisibleLabels(); }, 100);
})();
