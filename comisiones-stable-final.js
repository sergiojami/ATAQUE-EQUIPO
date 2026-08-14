/* Módulo final y aislado para Ejercicios / Comisiones. Se carga al final para evitar conflictos con routers anteriores. */
(function(){
  const previousRender=window.render;
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const people=()=>window.__ATAQUE_EMPLOYEES||window.employees||[];
  const adminNow=()=>window.__ATAQUE_ADMIN===true||window.admin===true;
  const name=e=>e?.nombre||e?.full_name||'';
  async function load(){
    const r=await db.from('comisiones_servicio').select('id,ejercicio,fecha,lugar,created_at,updated_at').order('fecha',{ascending:false}).order('ejercicio');
    if(r.error)throw r.error;
    const rows=r.data||[];
    if(rows.length){
      const a=await db.from('comisiones_personal').select('comision_id,empleado_id').in('comision_id',rows.map(x=>x.id));
      if(a.error&&a.code!=='PGRST205')throw a.error;
      const map=new Map(people().map(e=>[String(e.id),e]));
      rows.forEach(x=>x.personal=(a.data||[]).filter(z=>String(z.comision_id)===String(x.id)).map(z=>map.get(String(z.empleado_id))).filter(Boolean));
    }
    window.__COMISIONES_STABLE=rows;
    return rows;
  }
  async function page(){
    const c=document.getElementById('content'); if(!c)return;
    const rows=await load();
    c.innerHTML=`<div class="calendar-toolbar"><div><span class="eyebrow">ACTIVIDAD OPERATIVA</span><h3>Ejercicios / Comisiones</h3><p class="muted">Ejercicio, fecha, lugar y personal asignado.</p></div>${adminNow()?'<button class="btn primary" onclick="stableComisionForm()">+ Añadir registro</button>':''}</div><div class="panel commission-panel"><div class="table-scroll"><table class="commission-table"><thead><tr><th>Ejercicio / Misión</th><th>Fecha</th><th>Lugar</th><th>Personal asignado</th>${adminNow()?'<th>Acciones</th>':''}</tr></thead><tbody>${rows.length?rows.map(r=>`<tr><td><strong>${esc(r.ejercicio)}</strong></td><td>${r.fecha?new Date(r.fecha+'T00:00:00').toLocaleDateString('es-ES'):''}</td><td>${esc(r.lugar)}</td><td>${r.personal?.length?r.personal.map(p=>`<span class="person-chip">${esc(name(p))}</span>`).join(' '):'<span class="muted">Sin personal asignado</span>'}</td>${adminNow()?`<td><button class="table-action" onclick="stableComisionForm('${r.id}')">✎ Editar</button><button class="table-action danger" onclick="stableDeleteComision('${r.id}')">🗑 Eliminar</button></td>`:''}</tr>`).join(''):`<tr><td colspan="${adminNow()?5:4}"><div class="empty-state compact"><h3>No hay registros todavía</h3><p>Añade un ejercicio, comisión o misión.</p></div></td></tr>`}</tbody></table></div></div>`;
  }
  window.stableComisionForm=async function(id=''){
    if(!adminNow())return;
    let em=people();
    if(!em.length&&typeof window.loadPeople==='function'){try{em=await window.loadPeople();}catch(e){}}
    const old=(window.__COMISIONES_STABLE||[]).find(x=>String(x.id)===String(id))||{ejercicio:'',fecha:'',lugar:'',personal:[]};
    const selected=new Set((old.personal||[]).map(p=>String(p.id)));
    em=[...em].sort((a,b)=>name(a).localeCompare(name(b),'es'));
    openModal(`<div class="modal-head"><div><span class="eyebrow">ACTIVIDAD OPERATIVA</span><h3>${id?'Editar':'Nuevo'} ejercicio / comisión</h3></div><button class="icon-btn" onclick="closeModal()">×</button></div><label>Ejercicio / misión<input id="stableComEjercicio" class="field" value="${esc(old.ejercicio)}" placeholder="Ejercicio o misión"></label><label>Fecha<input id="stableComFecha" class="field" type="date" value="${esc(old.fecha||'')}"></label><label>Lugar<input id="stableComLugar" class="field" value="${esc(old.lugar)}" placeholder="Lugar"></label><div class="assign-box"><div class="assign-title">PERSONAL ASIGNADO</div><div class="employee-select-list">${em.length?em.map(e=>`<label class="employee-option"><input type="checkbox" class="stable-com-person" value="${esc(e.id)}" ${selected.has(String(e.id))?'checked':''}><span>${esc(name(e))}</span></label>`).join(''):'<p class="muted">No hay empleados disponibles.</p>'}</div><p class="muted">Puedes marcar uno o varios empleados.</p></div><div class="modal-actions"><button class="btn secondary" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="stableSaveComision('${id}')">Guardar</button></div>`);
  };
  window.stableSaveComision=async function(id=''){
    if(!adminNow())return;
    const ejercicio=document.getElementById('stableComEjercicio')?.value.trim();
    const fecha=document.getElementById('stableComFecha')?.value;
    const lugar=document.getElementById('stableComLugar')?.value.trim();
    const selected=[...document.querySelectorAll('.stable-com-person:checked')].map(x=>x.value);
    if(!ejercicio||!fecha||!lugar){toast('Completa ejercicio, fecha y lugar','warn');return;}
    try{
      let cid=id;
      if(id){const r=await db.from('comisiones_servicio').update({ejercicio,fecha,lugar,updated_at:new Date().toISOString()}).eq('id',id).select('id').single();if(r.error)throw r.error;cid=r.data.id;const d=await db.from('comisiones_personal').delete().eq('comision_id',cid);if(d.error&&d.code!=='PGRST205')throw d.error;}
      else{const r=await db.from('comisiones_servicio').insert({ejercicio,fecha,lugar}).select('id').single();if(r.error)throw r.error;cid=r.data.id;}
      if(selected.length){const r=await db.from('comisiones_personal').insert(selected.map(empleado_id=>({comision_id:cid,empleado_id})));if(r.error)throw r.error;}
      closeModal();await page();toast(id?'Registro actualizado':'Registro añadido');
    }catch(e){toast(e.message||'No se pudo guardar el registro','error');}
  };
  window.stableDeleteComision=async function(id){if(!adminNow())return;const r=await db.from('comisiones_servicio').delete().eq('id',id);if(r.error){toast(r.error.message,'error');return;}await page();toast('Registro eliminado');};
  window.render=async function(p='inicio'){
    if(p!=='comisiones')return previousRender(p);
    await previousRender('comisiones');
    const title=document.querySelector('.topbar h1');if(title)title.textContent='Ejercicios / Comisiones';
    await page();
  };
})();
