/* Módulo final y aislado para Ejercicios / Comisiones. */
(function(){
  const previousRender=window.render;
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const people=()=>window.__ATAQUE_EMPLOYEES||window.employees||[];
  const adminNow=()=>window.__ATAQUE_ADMIN===true||window.admin===true;
  const name=e=>e?.nombre||e?.full_name||'';
  const nights=(a,b)=>{if(!a||!b)return 0;const x=new Date(a+'T00:00:00'),y=new Date(b+'T00:00:00');return Math.max(0,Math.round((y-x)/86400000));};
  const fmt=d=>d?new Date(d+'T00:00:00').toLocaleDateString('es-ES'):'—';
  async function load(){
    const r=await db.from('comisiones_servicio').select('id,ejercicio,fecha,fecha_inicio,fecha_fin,lugar,created_at,updated_at').order('fecha_inicio',{ascending:false,nullsFirst:false}).order('ejercicio');
    if(r.error)throw r.error;
    const rows=r.data||[];
    if(rows.length){
      const a=await db.from('comisiones_personal').select('comision_id,empleado_id').in('comision_id',rows.map(x=>x.id));
      if(a.error&&a.code!=='PGRST205')throw a.error;
      const map=new Map(people().map(e=>[String(e.id),e]));
      rows.forEach(x=>{x.fecha_inicio=x.fecha_inicio||x.fecha;x.fecha_fin=x.fecha_fin||x.fecha;x.noches=nights(x.fecha_inicio,x.fecha_fin);x.personal=(a.data||[]).filter(z=>String(z.comision_id)===String(x.id)).map(z=>map.get(String(z.empleado_id))).filter(Boolean);});
    }
    window.__COMISIONES_STABLE=rows;return rows;
  }
  async function page(){
    const c=document.getElementById('content');if(!c)return;const rows=await load();
    const totals=new Map();
    rows.forEach(r=>(r.personal||[]).forEach(p=>totals.set(String(p.id),(totals.get(String(p.id))||0)+r.noches));
    const totalAcumulado=[...totals.values()].reduce((sum,n)=>sum+n,0);
    const totalEmpleados=totals.size;
    const resumen=[...totals.entries()].map(([id,total])=>({empleado:people().find(p=>String(p.id)===id),total})).filter(x=>x.empleado).sort((a,b)=>b.total-a.total||name(a.empleado).localeCompare(name(b.empleado),'es'));
    c.innerHTML=`<div class="calendar-toolbar"><div><span class="eyebrow">ACTIVIDAD OPERATIVA</span><h3>Ejercicios / Comisiones</h3><p class="muted">Fecha de inicio – fecha de fin y contador de noches por empleado.</p></div>${adminNow()?'<button class="btn primary" onclick="stableComisionForm()">+ Añadir registro</button>':''}</div>
    <div class="panel commission-summary" style="margin-bottom:18px"><div style="display:flex;justify-content:space-between;align-items:flex-start;gap:18px;flex-wrap:wrap"><div><span class="eyebrow">RESUMEN ACUMULADO</span><h3 style="margin:4px 0 2px">TOTAL noches acumuladas</h3><p class="muted" style="margin:0">Suma de las noches asignadas a todo el personal en todos los ejercicios y misiones.</p></div><div style="min-width:180px;text-align:center;padding:12px 20px;border-radius:14px;background:#eef6fb"><strong style="display:block;font-size:34px;line-height:1">${totalAcumulado}</strong><span class="muted">noches-persona</span></div></div>
    <div style="display:flex;flex-wrap:wrap;gap:9px;margin-top:16px">${resumen.length?resumen.map(x=>`<span class="person-chip" style="padding:9px 13px"><strong>${esc(name(x.empleado))}</strong>: ${x.total} ${x.total===1?'noche':'noches'}</span>`).join(''):'<span class="muted">Todavía no hay noches asignadas a empleados.</span>'}</div>
    ${totalEmpleados?`<p class="muted" style="margin:12px 0 0">${totalEmpleados} empleado${totalEmpleados===1?'':'s'} con noches acumuladas · ${rows.length} ejercicio${rows.length===1?'':'s'} registrado${rows.length===1?'':'s'}.</p>`:''}</div>
    <div class="panel commission-panel"><div class="table-scroll"><table class="commission-table"><thead><tr><th>Ejercicio / Misión</th><th>Fecha</th><th>Lugar</th><th>Personal asignado</th><th>Noches por empleado</th>${adminNow()?'<th>Acciones</th>':''}</tr></thead><tbody>${rows.length?rows.map(r=>`<tr><td><strong>${esc(r.ejercicio)}</strong></td><td>${fmt(r.fecha_inicio)}${r.fecha_fin&&r.fecha_fin!==r.fecha_inicio?` – ${fmt(r.fecha_fin)}`:''}<br><small>${r.noches} ${r.noches===1?'noche':'noches'}</small></td><td>${esc(r.lugar)}</td><td>${r.personal?.length?r.personal.map(p=>`<span class="person-chip">${esc(name(p))}</span>`).join(' '):'<span class="muted">Sin personal asignado</span>'}</td><td>${r.personal?.length?r.personal.map(p=>`<span class="person-chip"><strong>${esc(name(p))}</strong>: ${r.noches}</span>`).join(' '):'—'}</td>${adminNow()?`<td><button class="table-action" onclick="stableComisionForm('${r.id}')">✎ Editar</button><button class="table-action danger" onclick="stableDeleteComision('${r.id}')">🗑 Eliminar</button></td>`:''}</tr>`).join(''):`<tr><td colspan="${adminNow()?6:5}"><div class="empty-state compact"><h3>No hay registros todavía</h3><p>Añade un ejercicio, comisión o misión.</p></div></td></tr>`}</tbody></table></div></div>`;
  }
  window.stableComisionForm=async function(id=''){
    if(!adminNow())return;let em=people();if(!em.length&&typeof window.loadPeople==='function'){try{em=await window.loadPeople();}catch(e){}}
    const old=(window.__COMISIONES_STABLE||[]).find(x=>String(x.id)===String(id))||{ejercicio:'',fecha:'',fecha_inicio:'',fecha_fin:'',lugar:'',personal:[]};const selected=new Set((old.personal||[]).map(p=>String(p.id)));em=[...em].sort((a,b)=>name(a).localeCompare(name(b),'es'));
    openModal(`<div class="modal-head"><div><span class="eyebrow">ACTIVIDAD OPERATIVA</span><h3>${id?'Editar':'Nuevo'} ejercicio / comisión</h3></div><button class="icon-btn" onclick="closeModal()">×</button></div><label>Ejercicio / misión<input id="stableComEjercicio" class="field" value="${esc(old.ejercicio)}" placeholder="Ejercicio o misión"></label><div class="date-range"><label>Fecha inicio<input id="stableComInicio" class="field" type="date" value="${esc(old.fecha_inicio||old.fecha||'')}"></label><label>Fecha fin<input id="stableComFin" class="field" type="date" value="${esc(old.fecha_fin||old.fecha||'')}"></label></div><div id="stableNochesPreview" class="muted" style="margin:6px 0 12px">Noches: 0</div><label>Lugar<input id="stableComLugar" class="field" value="${esc(old.lugar)}" placeholder="Lugar"></label><div class="assign-box"><div class="assign-title">PERSONAL ASIGNADO</div><div class="employee-select-list">${em.length?em.map(e=>`<label class="employee-option"><input type="checkbox" class="stable-com-person" value="${esc(e.id)}" ${selected.has(String(e.id))?'checked':''}><span>${esc(name(e))}</span></label>`).join(''):'<p class="muted">No hay empleados disponibles.</p>'}</div><p class="muted">Marca uno o varios empleados. Cada uno tendrá el mismo número de noches del periodo.</p></div><div class="modal-actions"><button class="btn secondary" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="stableSaveComision('${id}')">Guardar</button></div>`);
    const upd=()=>{const n=nights(document.getElementById('stableComInicio')?.value,document.getElementById('stableComFin')?.value);const p=document.getElementById('stableNochesPreview');if(p)p.textContent=`Noches: ${n}`;};document.getElementById('stableComInicio')?.addEventListener('change',upd);document.getElementById('stableComFin')?.addEventListener('change',upd);upd();
  };
  window.stableSaveComision=async function(id=''){
    if(!adminNow())return;const ejercicio=document.getElementById('stableComEjercicio')?.value.trim(),inicio=document.getElementById('stableComInicio')?.value,fin=document.getElementById('stableComFin')?.value,lugar=document.getElementById('stableComLugar')?.value.trim(),selected=[...document.querySelectorAll('.stable-com-person:checked')].map(x=>x.value);
    if(!ejercicio||!inicio||!fin||!lugar){toast('Completa ejercicio, fecha inicio, fecha fin y lugar','warn');return;}if(fin<inicio){toast('La fecha fin no puede ser anterior a la fecha de inicio','warn');return;}
    try{let cid=id;if(id){const r=await db.from('comisiones_servicio').update({ejercicio,fecha:inicio,fecha_inicio:inicio,fecha_fin:fin,lugar,updated_at:new Date().toISOString()}).eq('id',id).select('id').single();if(r.error)throw r.error;cid=r.data.id;const d=await db.from('comisiones_personal').delete().eq('comision_id',cid);if(d.error&&d.code!=='PGRST205')throw d.error;}else{const r=await db.from('comisiones_servicio').insert({ejercicio,fecha:inicio,fecha_inicio:inicio,fecha_fin:fin,lugar}).select('id').single();if(r.error)throw r.error;cid=r.data.id;}if(selected.length){const r=await db.from('comisiones_personal').insert(selected.map(empleado_id=>({comision_id:cid,empleado_id})));if(r.error)throw r.error;}closeModal();await page();toast(id?'Registro actualizado':'Registro añadido');}catch(e){toast(e.message||'No se pudo guardar el registro','error');}
  };
  window.stableDeleteComision=async function(id){if(!adminNow())return;const r=await db.from('comisiones_servicio').delete().eq('id',id);if(r.error){toast(r.error.message,'error');return;}await page();toast('Registro eliminado');};
  window.render=async function(p='inicio'){if(p!=='comisiones')return previousRender(p);await previousRender('comisiones');const title=document.querySelector('.topbar h1');if(title)title.textContent='Ejercicios / Comisiones';await page();};
})();