/* Cuadrante: selector desplegable por casilla, incluido estado en blanco. */
(function(){
  const TYPES=['','M','T','M/T','C','V','CS','AP','B'];
  const LABEL={"":'Sin asignar',M:'Mañana',T:'Tarde','M/T':'Mañana y tarde',C:'Compensación',V:'Vacaciones',CS:'Comisión de servicio',AP:'Asuntos propios',B:'Baja'};
  const SPECIAL=['C','V','CS','AP','B'];
  const esc=v=>String(v??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#039;'}[m]));
  const options=v=>TYPES.map(t=>`<option value="${t}" ${t===v?'selected':''}>${t||'—'}</option>`).join('');
  const isAdmin=()=>window.__ATAQUE_ADMIN===true;
  async function save(eid,date,value){
    if(!isAdmin())return;
    try{
      const [a,b]=await Promise.all([
        db.from('turnos_cuadrante').delete().eq('empleado_id',eid).eq('fecha',date),
        db.from('especiales_calendario').delete().eq('empleado_id',eid).eq('fecha',date)
      ]);
      if(a.error)throw a.error;
      if(b.error && b.error.code!=='PGRST205')throw b.error;
      if(value){
        if(SPECIAL.includes(value)){
          const r=await db.from('especiales_calendario').upsert({empleado_id:eid,fecha:date,tipo:value},{onConflict:'fecha,empleado_id'});
          if(r.error)throw r.error;
        }else{
          const turns=value==='M/T'?['M','T']:[value];
          for(const turno of turns){
            const r=await db.from('turnos_cuadrante').upsert({empleado_id:eid,fecha:date,turno},{onConflict:'fecha,empleado_id,turno'});
            if(r.error)throw r.error;
          }
        }
      }
      if(typeof toast==='function')toast(value?LABEL[value]:'Casilla dejada en blanco');
      const original=window.__ATAQUE_RENDER_ORIGINAL;
      if(original)await original('cuadrantes');
      setTimeout(patch,0);
    }catch(err){
      if(typeof toast==='function')toast(err.message||'No se pudo guardar','error');
    }
  }
  window.cuadranteDropdownSelect=save;
  function patch(){
    const buttons=document.querySelectorAll('.unified-day-button');
    if(!buttons.length)return;
    buttons.forEach(btn=>{
      if(btn.dataset.dropdownFixed==='1')return;
      const td=btn.closest('td');
      const onclick=btn.getAttribute('onclick')||'';
      const match=onclick.match(/stableCycle\('([^']*)','([^']*)','([^']*)'\)/);
      if(!match)return;
      const eid=match[1],date=match[2],value=match[3]||'';
      const select=document.createElement('select');
      select.className='unified-day-select dropdown-fixed';
      select.disabled=!isAdmin();
      select.setAttribute('aria-label',`Turno de ${date}`);
      select.innerHTML=options(value);
      select.value=value;
      select.onchange=()=>save(eid,date,select.value);
      td.innerHTML='';
      td.appendChild(select);
      td.classList.add('has-dropdown');
      btn.dataset.dropdownFixed='1';
    });
  }
  function install(){
    if(window.__ATAQUE_RENDER_ORIGINAL)return;
    const original=window.render;
    if(typeof original!=='function')return setTimeout(install,100);
    window.__ATAQUE_RENDER_ORIGINAL=original;
    window.render=async function(page='inicio'){
      const result=await original(page);
      if(page==='cuadrantes')setTimeout(patch,0);
      return result;
    };
    setTimeout(patch,0);
  }
  const style=document.createElement('style');
  style.textContent=`
    .unified-day-cell.has-dropdown{padding:3px!important;min-width:44px;height:48px;box-sizing:border-box}
    .unified-day-select.dropdown-fixed{width:100%;height:38px;border:1px solid #d8e2eb;border-radius:8px;background:#fff;font:700 12px/1 Arial,sans-serif;text-align:center;text-align-last:center;color:#17324d;cursor:pointer;padding:0 2px}
    .unified-day-select.dropdown-fixed:focus{outline:2px solid #1694c7;outline-offset:-1px}
    .unified-day-select.dropdown-fixed:disabled{cursor:default;opacity:.9;background:#f7f9fb}
    .unified-day-cell.weekend-col .unified-day-select.dropdown-fixed{background:#f0f2f4}
  `;
  document.head.appendChild(style);
  install();
})();
