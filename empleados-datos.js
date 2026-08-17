/* Gestión de empleados: teléfono + fechas PAFAS/HPS. Solo administrador. */
(function(){
  const baseRender=window.render;
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const preferred=['De Benito','Angulo','Pajarillo','Sergio','Raul','Roldán','Paloma','Rubén','De Porras','Salvatierra','Castillo','Campos'];
  const norm=v=>String(v||'').trim().toLocaleLowerCase('es');
  const sortPeople=a=>[...(a||[])].sort((x,y)=>{const ix=preferred.findIndex(n=>norm(n)===norm(x.nombre)),iy=preferred.findIndex(n=>norm(n)===norm(y.nombre));if(ix>=0&&iy>=0)return ix-iy;if(ix>=0)return -1;if(iy>=0)return 1;return norm(x.nombre).localeCompare(norm(y.nombre),'es')});
  const adminOk=()=>window.__ATAQUE_ADMIN===true || window.admin===true;
  async function page(){
    const c=document.getElementById('content'); if(!c)return;
    if(!adminOk()){c.innerHTML='<div class="panel error-state"><h3>Acceso restringido</h3><p>Este apartado solo está disponible para el administrador.</p></div>';return;}
    const r=await db.from('empleados').select('id,nombre,telefono,pafas,hps,turnos,rol,created_at').neq('rol','admin');
    if(r.error){c.innerHTML=`<div class="panel error-state"><h3>No se pudo cargar Gestión de Empleados</h3><p>${esc(r.error.message)}</p><button class="btn primary" onclick="window.render('empleados')">Reintentar</button></div>`;return;}
    const people=sortPeople(r.data||[]);
    c.innerHTML=`<div class="employee-admin-page"><div class="calendar-toolbar"><div><span class="eyebrow">ADMINISTRACIÓN</span><h3>Gestión de Empleados</h3><p class="muted">Teléfono, PAFAS y HPS. PAFAS y HPS son fechas y pueden quedar en blanco.</p></div><div class="toolbar-actions"><span class="month-badge">${people.length} empleados</span></div></div><div class="panel employee-admin-panel"><div class="table-scroll"><table class="employee-admin-table"><thead><tr><th>Empleado</th><th>Teléfono</th><th>PAFAS</th><th>HPS</th><th>Acciones</th></tr></thead><tbody>${people.map(e=>`<tr data-emp="${esc(e.id)}"><td><div class="employee-cell"><span class="avatar-small">${esc((e.nombre||'').split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase())}</span><strong>${esc(e.nombre)}</strong></div></td><td><input class="field emp-phone" value="${esc(e.telefono||'')}" placeholder="Teléfono" inputmode="tel"></td><td><input class="field emp-date" type="date" value="${esc(e.pafas||'')}" aria-label="PAFAS ${esc(e.nombre)}"></td><td><input class="field emp-date" type="date" value="${esc(e.hps||'')}" aria-label="HPS ${esc(e.nombre)}"></td><td><button class="btn primary small" onclick="window.saveEmployeeDates('${esc(e.id)}')">Guardar</button></td></tr>`).join('')}</tbody></table></div><div class="table-footer"><span>PAFAS: <b>fecha</b> · HPS: <b>fecha</b></span><span>Formato: <b>dd/mm/aaaa</b></span></div></div></div>`;
  }
  window.saveEmployeeDates=async function(id){
    if(!adminOk())return;
    const row=document.querySelector(`tr[data-emp="${CSS.escape(String(id))}"]`);if(!row)return;
    const telefono=row.querySelector('.emp-phone')?.value.trim()||null;
    const dates=row.querySelectorAll('.emp-date');
    const pafas=dates[0]?.value||null;
    const hps=dates[1]?.value||null;
    const r=await db.from('empleados').update({telefono,pafas,hps}).eq('id',id);
    if(r.error){if(typeof toast==='function')toast(r.error.message,'error');return;}
    if(typeof toast==='function')toast('Datos del empleado guardados');
  };
  window.render=async function(pageName='inicio'){if(pageName==='empleados')return page();return baseRender(pageName);};
})();
