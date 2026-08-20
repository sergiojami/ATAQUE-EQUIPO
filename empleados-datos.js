/* Gestión de empleados: altas, edición, baja definitiva y puesto. Solo administrador. */
(function(){
  const baseRender=window.render;
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const preferred=['De Benito','Angulo','Pajarillo','Sergio','Raul','Roldán','Paloma','Rubén','De Porras','Salvatierra','Castillo','Campos'];
  const norm=v=>String(v||'').trim().toLocaleLowerCase('es');
  const sortPeople=a=>[...(a||[])].sort((x,y)=>{
    const px=Number(x.puesto),py=Number(y.puesto);
    if(Number.isFinite(px)&&Number.isFinite(py)&&px!==py)return px-py;
    if(Number.isFinite(px)&&!Number.isFinite(py))return -1;
    if(!Number.isFinite(px)&&Number.isFinite(py))return 1;
    const ix=preferred.findIndex(n=>norm(n)===norm(x.nombre)),iy=preferred.findIndex(n=>norm(n)===norm(y.nombre));
    if(ix>=0&&iy>=0)return ix-iy;if(ix>=0)return -1;if(iy>=0)return 1;
    return norm(x.nombre).localeCompare(norm(y.nombre),'es');
  });
  const adminOk=()=>window.__ATAQUE_ADMIN===true || window.admin===true;
  const loadPeople=async()=>{
    const r=await db.from('empleados').select('id,nombre,telefono,pafas,hps,turnos,rol,puesto,created_at').neq('rol','admin');
    if(r.error)throw r.error;
    return sortPeople(r.data||[]);
  };
  async function page(){
    const c=document.getElementById('content'); if(!c)return;
    if(!adminOk()){c.innerHTML='<div class="panel error-state"><h3>Acceso restringido</h3><p>Este apartado solo está disponible para el administrador.</p></div>';return;}
    let people;
    try{people=await loadPeople();}catch(e){c.innerHTML=`<div class="panel error-state"><h3>No se pudo cargar Gestión de Empleados</h3><p>${esc(e.message)}</p><button class="btn primary" onclick="window.render('empleados')">Reintentar</button></div>`;return;}
    c.innerHTML=`<div class="employee-admin-page"><div class="calendar-toolbar"><div><span class="eyebrow">ADMINISTRACIÓN</span><h3>Gestión de Empleados</h3><p class="muted">Añade, edita o elimina empleados. El Puesto determina el orden.</p></div><div class="toolbar-actions"><span class="month-badge">${people.length} empleados</span><button class="btn primary" onclick="window.openEmployeeEditor()">+ Añadir empleado</button></div></div><div class="panel employee-admin-panel"><div class="table-scroll"><table class="employee-admin-table"><thead><tr><th>Puesto</th><th>Empleado</th><th>Teléfono</th><th>PAFAS</th><th>HPS</th><th>Acciones</th></tr></thead><tbody>${people.map(e=>`<tr data-emp="${esc(e.id)}"><td><input class="field emp-position" type="number" min="1" max="99" value="${e.puesto??''}" aria-label="Puesto ${esc(e.nombre)}"></td><td><div class="employee-cell"><span class="avatar-small">${esc((e.nombre||'').split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase())}</span><strong>${esc(e.nombre)}</strong></div></td><td><input class="field emp-phone" value="${esc(e.telefono||'')}" placeholder="Teléfono" inputmode="tel"></td><td><input class="field emp-date" type="date" value="${esc(e.pafas||'')}" aria-label="PAFAS ${esc(e.nombre)}"></td><td><input class="field emp-date" type="date" value="${esc(e.hps||'')}" aria-label="HPS ${esc(e.nombre)}"></td><td><button class="btn primary small" onclick="window.saveEmployee('${esc(e.id)}')">Guardar</button><button class="btn danger small" onclick="window.deleteEmployee('${esc(e.id)}')">Eliminar</button></td></tr>`).join('')}</tbody></table></div><div class="table-footer"><span>PAFAS: <b>fecha</b> · HPS: <b>fecha</b></span><span>El puesto es el orden maestro.</span></div></div></div>`;
  }
  window.openEmployeeEditor=function(){
    document.getElementById('employee-editor-modal')?.remove();
    document.getElementById('screen').insertAdjacentHTML('beforeend',`<div class="modal" id="employee-editor-modal"><div class="card" style="max-width:520px;margin:8vh auto;padding:24px"><button class="close" onclick="document.getElementById('employee-editor-modal').remove()">×</button><span class="eyebrow">PERSONAL</span><h3>Añadir empleado</h3><form onsubmit="window.createEmployee(event)"><label>Nombre completo<input id="new-emp-name" required maxlength="80"></label><label>Puesto<input id="new-emp-position" type="number" min="1" max="99" required></label><label>Teléfono<input id="new-emp-phone" maxlength="30" inputmode="tel"></label><label>PAFAS<input id="new-emp-pafas" type="date"></label><label>HPS<input id="new-emp-hps" type="date"></label><div style="display:flex;gap:10px;justify-content:flex-end;margin-top:18px"><button type="button" class="btn secondary" onclick="document.getElementById('employee-editor-modal').remove()">Cancelar</button><button type="submit" class="btn primary">Añadir empleado</button></div></form></div></div>`);
  };
  window.createEmployee=async function(event){
    event.preventDefault();if(!adminOk())return;
    const nombre=document.getElementById('new-emp-name')?.value.trim();const puesto=Number(document.getElementById('new-emp-position')?.value);const telefono=document.getElementById('new-emp-phone')?.value.trim()||null;const pafas=document.getElementById('new-emp-pafas')?.value||null;const hps=document.getElementById('new-emp-hps')?.value||null;
    if(!nombre||!Number.isInteger(puesto)||puesto<1)return alert('Nombre y puesto son obligatorios.');
    const current=await loadPeople();if(current.some(e=>Number(e.puesto)===puesto))return alert(`El puesto ${puesto} ya está asignado a ${current.find(e=>Number(e.puesto)===puesto)?.nombre||'otro empleado'}.`);
    const r=await db.from('empleados').insert({nombre,telefono,pafas,hps,puesto,rol:'empleado'});
    if(r.error){alert(r.error.message);return;}document.getElementById('employee-editor-modal')?.remove();await page();
  };
  window.saveEmployee=async function(id){
    if(!adminOk())return;const row=document.querySelector(`tr[data-emp="${CSS.escape(String(id))}"]`);if(!row)return;
    const puesto=Number(row.querySelector('.emp-position')?.value);const telefono=row.querySelector('.emp-phone')?.value.trim()||null;const dates=row.querySelectorAll('.emp-date');const pafas=dates[0]?.value||null;const hps=dates[1]?.value||null;
    if(!Number.isInteger(puesto)||puesto<1)return alert('El puesto debe ser un número entero mayor que 0.');
    const people=await loadPeople();const duplicate=people.find(e=>String(e.id)!==String(id)&&Number(e.puesto)===puesto);if(duplicate)return alert(`El puesto ${puesto} ya está asignado a ${duplicate.nombre}.`);
    const r=await db.from('empleados').update({puesto,telefono,pafas,hps}).eq('id',id);if(r.error){alert(r.error.message);return;}if(typeof toast==='function')toast('Empleado guardado');await page();
  };
  window.deleteEmployee=async function(id){
    if(!adminOk())return;const people=await loadPeople();const e=people.find(x=>String(x.id)===String(id));if(!e)return;
    if(!confirm(`¿Eliminar definitivamente a ${e.nombre}? Esta acción no se puede deshacer.`))return;
    const r=await db.from('empleados').delete().eq('id',id);if(r.error){alert(`No se puede eliminar a ${e.nombre}. ${r.error.message}`);return;}if(typeof toast==='function')toast('Empleado eliminado');await page();
  };
  window.saveEmployeeDates=window.saveEmployee;
  window.render=async function(pageName='inicio'){if(pageName==='empleados')return page();return baseRender(pageName);};
})();