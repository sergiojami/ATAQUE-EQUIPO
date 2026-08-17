/* Ajuste de navegación de Misiones: garantiza acceso desde menú lateral en todas las pantallas. */
(function(){
  const previous=window.render;
  function ensureNav(){
    const nav=[...document.querySelectorAll('.side-link')];
    if(nav.some(x=>x.textContent.trim()==='Misiones'))return;
    const target=nav.find(x=>x.textContent.trim()==='Ejercicios / Comisiones');
    if(!target)return;
    const b=target.cloneNode(true);
    b.classList.remove('active');
    const spans=b.querySelectorAll('span');
    if(spans[spans.length-1])spans[spans.length-1].textContent='Misiones';
    if(spans[0])spans[0].textContent='✈';
    b.setAttribute('onclick',"render('misiones')");
    target.insertAdjacentElement('afterend',b);
  }
  window.render=async function(page='inicio',...args){
    await previous(page,...args);
    ensureNav();
    if(page==='misiones'){
      document.querySelectorAll('.side-link').forEach(x=>x.classList.remove('active'));
      const m=[...document.querySelectorAll('.side-link')].find(x=>x.textContent.trim()==='Misiones');
      if(m)m.classList.add('active');
    }
  };
})();
