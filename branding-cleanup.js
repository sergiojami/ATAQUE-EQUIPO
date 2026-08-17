/* Identidad visual estable: no carga ni observa logotipos. */
(function () {
  'use strict';
  function applyBrand() {
    if (document.title) document.title = 'AVIÓNICA DE ATAQUE';
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', applyBrand, { once: true });
  } else {
    applyBrand();
  }
})();
