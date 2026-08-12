(function(){
  const originalRender = window.render;

  async function loadCommissionRows(){
    const r = await db.from('comisiones_servicio').select('id,ejercicio,fecha,lugar,created_at,updated_at').order('fecha',{ascending:false}).order('ejercicio');
    if(r.error) throw r.error;
    const rows=r.data||[];
    if(!rows.length) return [];
    const ids=rows.map(x=>x.id);
    const ar=await db.from('comisiones_personal').select('comision_id,empleado_id').in('comision_id',ids);
    if(ar.error && ar.code!=='PGRST205') throw ar.error;
    const assignments=ar.data||[];
    const em=(window.employees||[]);
    const byId=new Map(em.map(e=>[String(e.id),e]));
    rows.forEach(x=>x.personal=assignments.filter(a=>String(a.comision_id)===String(x.id)).map(a=>byId.get(String(a.empleado_id))).filter(Boolean));
    return rows;
  }

  async function comisionesPage(){
    const content=document.getElementById('content'); if(!content)return;
    try{
      const rows=await loadCommissionRows(); window.__comisionesCache=rows;
      content.innerHTML=`<div class="calendar-toolbar"><div><span class="eyebrow">ACTIVIDAD OPERATIVA</span><h3>Comisiones de Servicio / Ejercicios / Misiones</h3><p class="muted">Ejercicio, fecha, lugar y personal asignado. ${admin?'Solo el administrador puede modificar.':'Modo consulta.'}</p></div>${admin?'<button class="btn primary" onclick="comisionForm()">+ Añadir registro</button>':''}</div><div class="panel commission-panel"><div class="table-scroll"><table class="commission-table"><thead><tr><th>Ejercicio / Misión</th><th>Fecha</th><th>Lugar</th><th>Personal asignado</th>${admin?'<th>Acciones</th>':''}</tr></thead><tbody>${rows.length?rows.map(x=>`<tr><td><strong>${esc(x.ejercicio)}</strong></td><td><span class="date-chip">${new Date(x.fecha+'T00:00:00').toLocaleDateString('es-ES',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'})}</span></td><td>${esc(x.lugar)}</td><td>${x.personal?.length?x.personal.map(p=>`<span class="person-chip">${esc(p.nombre||p.full_name)}</span>`).join(' '):'<span class="muted">Sin personal asignado</span>'}</td>${admin?`<td><button class="table-action" onclick="comisionForm('${x.id}')">✎ Editar</button><button class="table-action danger" onclick="deleteComision('${x.id}')">🗑 Eliminar</button></td>`:''}</tr>`).join(''):`<tr><td colspan="${admin?5:4}"><div class="empty-state compact"><div>✈</div><h3>No hay registros todavía</h3><p>${admin?'Añade el primer ejercicio, fecha, lugar y personal asignado.':'Todavía no hay actividades registradas.'}</p></div></td></tr>`}</tbody></table></div></div>`;
    }catch(e){content.innerHTML=`<div class="panel error-state"><h3>No se pudieron cargar las comisiones</h3><p>${esc(e.message||e)}</p></div>`;}
  }

  function ensureNav(page){
    const nav=document.querySelector('.side-nav'); if(!nav)return;
    let link=Array.from(nav.querySelectorAll('.side-link')).find(el=>el.dataset.comisiones==='1');
    if(!link){link=document.createElement('button');link.className='side-link';link.dataset.comisiones='1';link.innerHTML='<span class="side-icon">✈</span><span>Comisiones de Servicio / Ejercicios / Misiones</span>';link.onclick=()=>window.render('comisiones');const special=Array.from(nav.querySelectorAll('.side-link')).find(el=>el.textContent.includes('Especiales'));if(special)special.insertAdjacentElement('afterend',link);else nav.appendChild(link);}
    nav.querySelectorAll('.side-link').forEach(el=>el.classList.remove('active'));if(page==='comisiones')link.classList.add('active');
  }

  window.comisionForm=async function(id=''){
    if(!admin)return;
    const existing=(window.__comisionesCache||[]).find(x=>String(x.id)===String(id))||{ejercicio:'',fecha:'',lugar:'',personal:[]};
    const selected=new Set((existing.personal||[]).map(p=>String(p.id)));
    const employees=[...(window.employees||[])].sort((a,b)=>String(a.nombre||a.full_name).localeCompare(String(b.nombre||b.full_name),'es'));
    openModal(`<div class="modal-head"><div><span class="eyebrow">ACTIVIDAD OPERATIVA</span><h3>${id?'Editar registro':'Nuevo registro'}</h3></div><button class="icon-btn" onclick="closeModal()">×</button></div><label>Ejercicio / misión<input id="comEjercicio" class="field" value="${esc(existing.ejercicio)}" placeholder="Ej. Ejercicio Ala 11"></label><label>Fecha<input id="comFecha" class="field" type="date" value="${esc(existing.fecha||'')}"></label><label>Lugar<input id="comLugar" class="field" value="${esc(existing.lugar)}" placeholder="Lugar / base / localidad"></label><div class="assign-box"><div class="assign-title">PERSONAL ASIGNADO</div><div class="employee-select-list">${employees.map(e=>`<label class="employee-option"><input type="checkbox" class="com-person" value="${esc(e.id)}" ${selected.has(String(e.id))?'checked':''}><span>${esc(e.nombre||e.full_name)}</span></label>`).join('')}</div></div><div class="modal-actions"><button class="btn secondary" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="saveComision('${id}')">Guardar</button></div>`);
  };

  window.saveComision=async function(id){
    if(!admin)return;
    const ejercicio=document.getElementById('comEjercicio')?.value.trim(),fecha=document.getElementById('comFecha')?.value,lugar=document.getElementById('comLugar')?.value.trim();
    const empleados=[...document.querySelectorAll('.com-person:checked')].map(x=>x.value);
    if(!ejercicio||!fecha||!lugar){toast('Completa ejercicio, fecha y lugar','warn');return;}
    try{
      let cid=id;
      if(id){const r=await db.from('comisiones_servicio').update({ejercicio,fecha,lugar,updated_at:new Date().toISOString()}).eq('id',id).select('id').single();if(r.error)throw r.error;cid=r.data.id;await db.from('comisiones_personal').delete().eq('comision_id',cid);}
      else{const r=await db.from('comisiones_servicio').insert({ejercicio,fecha,lugar}).select('id').single();if(r.error)throw r.error;cid=r.data.id;}
      if(empleados.length){const r=await db.from('comisiones_personal').insert(empleados.map(eid=>({comision_id:cid,empleado_id:eid})));if(r.error)throw r.error;}
      closeModal();await comisionesPage();toast(id?'Registro actualizado':'Registro añadido');
    }catch(e){toast(e.message||'No se pudo guardar','error');}
  };

  window.deleteComision=async function(id){if(!admin)return;const row=(window.__comisionesCache||[]).find(x=>String(x.id)===String(id));if(!row||!confirm(`¿Eliminar el registro "${row.ejercicio}"?`))return;const r=await db.from('comisiones_servicio').delete().eq('id',id);if(r.error){toast(r.error.message,'error');return;}await comisionesPage();toast('Registro eliminado');};
  window.render=function(page='inicio'){originalRender(page==='comisiones'?'inicio':page);setTimeout(async()=>{ensureNav(page);if(page==='comisiones'){const title=document.querySelector('.topbar-left h1');if(title)title.textContent='Comisiones de Servicio / Ejercicios / Misiones';await comisionesPage();}},200);};
})();
