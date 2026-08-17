/* Identidad visual: sin logotipo y con la denominación oficial AVIÓNICA DE ATAQUE. */
(function () {
  'use strict';

  const BRAND = 'AVIÓNICA DE ATAQUE';
  const OLD = 'ATAQUE EQUIPO';

  function clean() {
    // Eliminar cualquier elemento de logotipo sin observar cambios continuamente.
    document.querySelectorAll('.login-logo,.sidebar-brand img,.sidebar-mark img,.hero-card img').forEach(function (el) {
      if (el && el.parentNode) el.parentNode.removeChild(el);
    });
    document.querySelectorAll('.login-watermark').forEach(function (el) {
      el.style.backgroundImage = 'none';
    });

    // Sustituir únicamente textos que todavía contengan la denominación antigua.
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    const nodes = [];
    let node;
    while ((node = walker.nextNode())) {
      if (node.nodeValue && node.nodeValue.indexOf(OLD) !== -1) nodes.push(node);
    }
    nodes.forEach(function (textNode) {
      textNode.nodeValue = textNode.nodeValue.split(OLD).join(BRAND);
    });
    document.title = BRAND;
  }

  // La aplicación pinta varias vistas dinámicamente. Un observador con debounce evita
  // bucles de renderizado y mantiene la identidad al cambiar de apartado.
  let timer = null;
  function scheduleClean() {
    if (timer) return;
    timer = setTimeout(function () {
      timer = null;
      clean();
    }, 50);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', clean, { once: true });
  } else {
    clean();
  }

  const root = document.documentElement;
  if (root && window.MutationObserver) {
    new MutationObserver(scheduleClean).observe(root, {
      subtree: true,
      childList: true,
      characterData: true
    });
  }
})();
