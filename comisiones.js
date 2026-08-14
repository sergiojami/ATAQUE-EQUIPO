/* Ejercicios / Comisiones — módulo de noches integrado con el controlador estable. */
(function(){
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const name=e=>e?.nombre||e?.full_name||'';
  const admin=()=>window.__ATAQUE_ADMIN===true||window.admin===true;
  const employees=()=>Array.isArray(window.__ATAQUE_EMPLOYEES)?window.__ATAQUE_EMPLOYEES:(Array.isArray(window.employees)?window.employees:[]);
  const nights=(start,end)=>{
    if(!start||!end)return 0;
    const a=new Date(start+'T00:00:00');
    const b=new Date(end+'T00:00:00');
    return Math.max(0,Math.round((b-a)/86400000));
  };
  const fmt=d=>d?new Date(d+'T00:00:00').toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric'}):'—';

  async function load(){
    const r=await db.from('comisiones_servicio')
      .select('id,ejercicio,fecha,fecha_inicio,fecha_fin,lugar,created_at,updated_at')
      .order('fecha_inicio',{ascending:false,nullsFirst:false})
      .order('fecha',{ascending:false,nullsFirst:false})
      .order('ejercicio',{ascending:true});
    if(r.error)throw r.error;
    const rows=r.data||[];
    if(!rows.length){window.__COMISIONES_NIGHT_ROWS=[];return rows;}
    const ids=rows.map(x=>x.id);
    const ar=await db.from('comisiones_personal').select('comision_id,empleado_id').in('comision_id',ids);
    if(ar.error&&ar.code!=='PGRST205')throw ar.error;
    const byId=new Map(employees().map(e=>[String(e.id),e]));
    rows.forEach(x=>{
      x.fecha_inicio=x.fecha_inicio||x.fecha||'';
      x.fecha_fin=x.fecha_fin||x.fecha_inicio||'';
      x.noches=nights(x.fecha_inicio,x.fecha_fin);
      x.personal=(ar.data||[])
        .filter(a=>String(a.comision_id)===String(x.id))
        .map(a=>byId.get(String(a.empleado_id)))
        .filter(Boolean);
    });
    window.__COMISIONES_NIGHT_ROWS=rows;
    return rows;
  }

  function summary(rows){
    const totals=new Map(employees().map(e=>[String(e.id),0]));
    rows.forEach(r=>(r.personal||[]).forEach(p=>{
      const id=String(p.id);
      totals.set(id,(totals.get(id)||0)+Number(r.noches||0));
    }));
    const list=[...totals.entries()]
      .map(([id,total])=>({empleado:employees().find(e=>String(e.id)===id),total}))
      .filter(x=>x.empleado)
      .sort((a,b)=>b.total-a.total||name(a.empleado).localeCompare(name(b.empleado),'es'));
    return {list,total:list.reduce((s,x)=>s+x.total,0)};
  }

  async function renderEnhanced(){
    const c=document.getElementById('content');
    if(!c)return;
    try{
      const rows=await load();
      const s=summary(rows);
      c.innerHTML=`
        <div class="calendar-toolbar">
          <div>
            <span class="eyebrow">ACTIVIDAD OPERATIVA</span>
            <h3>Ejercicios / Comisiones</h3>
            <p class="muted">Fecha de inicio, fecha de fin, noches por empleado y acumulado total.</p>
          </div>
          ${admin()?'<button class="btn primary" onclick="commissionForm()">+ Añadir registro</button>':''}
        </div>

        <div class="commission-night-dashboard">
          <div class="commission-night-kpi">
            <span class="summary-label">TOTAL ACUMULADO</span>
            <strong>${s.total}</strong>
            <span>noches-persona</span>
          </div>
          <div class="commission-night-info">
            <div>
              <span class="eyebrow">NOCHES TOTALES POR EMPLEADO</span>
              <h3>Acumulado de todos los ejercicios</h3>
              <p class="muted">Cada cifra suma automáticamente las noches de todos los ejercicios, comisiones y misiones en los que está asignado cada empleado.</p>
            </div>
            <div class="commission-night-list">
              ${s.list.length?s.list.map(x=>`<div class="commission-night-row"><span title="${esc(name(x.empleado))}">${esc(name(x.empleado))}</span><strong>${x.total}</strong><small>${x.total===1?'noche':'noches'}</small></div>`).join(''):'<span class="muted">No hay empleados cargados.</span>'}
            </div>
          </div>
        </div>

        <div class="panel commission-panel">
          <div class="table-scroll">
            <table class="commission-table">
              <thead><tr>
                <th>Ejercicio / Misión</th>
                <th>Fecha inicio</th>
                <th>Fecha fin</th>
                <th>Nº noches</th>
                <th>Lugar</th>
                <th>Personal asignado</th>
                <th>Noches por empleado</th>
                ${admin()?'<th>Acciones</th>':''}
              </tr></thead>
              <tbody>
                ${rows.length?rows.map(x=>`<tr>
                  <td><strong>${esc(x.ejercicio)}</strong></td>
                  <td><span class="date-chip">${fmt(x.fecha_inicio)}</span></td>
                  <td><span class="date-chip">${fmt(x.fecha_fin)}</span></td>
                  <td><span class="night-badge">${x.noches}</span></td>
                  <td>${esc(x.lugar)}</td>
                  <td>${x.personal?.length?x.personal.map(p=>`<span class="person-chip">${esc(name(p))}</span>`).join(' '):'<span class="muted">Sin personal asignado</span>'}</td>
                  <td>${x.personal?.length?x.personal.map(p=>`<span class="night-person-chip"><strong>${esc(name(p))}</strong><span>${x.noches}</span></span>`).join(' '):'—'}</td>
                  ${admin()?`<td><button class="table-action" onclick="commissionForm('${x.id}')">✎ Editar</button><button class="table-action danger" onclick="deleteCommission('${x.id}')">🗑 Eliminar</button></td>`:''}
                </tr>`).join(''):`<tr><td colspan="${admin()?8:7}"><div class="empty-state compact"><h3>No hay registros todavía</h3><p>Añade un ejercicio, comisión o misión para empezar.</p></div></td></tr>`}
              </tbody>
            </table>
          </div>
        </div>`;
    }catch(e){
      c.innerHTML=`<div class="panel error-state"><h3>No se pudieron cargar los ejercicios / comisiones</h3><p>${esc(e.message||e)}</p></div>`;
    }
  }

  window.commissionForm=async function(id=''){
    if(!admin())return;
    try{
      const rows=window.__COMISIONES_NIGHT_ROWS||await load();
      const x=rows.find(r=>String(r.id)===String(id))||{ejercicio:'',fecha:'',fecha_inicio:'',fecha_fin:'',lugar:'',personal:[]};
      const selected=new Set((x.personal||[]).map(p=>String(p.id)));
      const em=[...employees()].sort((a,b)=>name(a).localeCompare(name(b),'es'));
      openModal(`
        <div class="modal-head"><div><span class="eyebrow">ACTIVIDAD OPERATIVA</span><h3>${id?'Editar':'Nuevo'} ejercicio / comisión</h3></div><button class="icon-btn" onclick="closeModal()">×</button></div>
        <label>Ejercicio / misión<input id="comEj" class="field" value="${esc(x.ejercicio)}" placeholder="Ejercicio o misión"></label>
        <div class="date-range">
          <label>Fecha inicio<input id="comInicio" class="field" type="date" value="${esc(x.fecha_inicio||x.fecha||'')}"></label>
          <label>Fecha fin<input id="comFin" class="field" type="date" value="${esc(x.fecha_fin||x.fecha_inicio||x.fecha||'')}"></label>
        </div>
        <div id="comPreview" class="night-preview">Noches calculadas: <strong>0</strong></div>
        <label>Lugar<input id="comLugar" class="field" value="${esc(x.lugar)}" placeholder="Lugar"></label>
        <div class="assign-box"><div class="assign-title">PERSONAL ASIGNADO</div><div class="employee-select-list">${em.length?em.map(e=>`<label class="employee-option"><input type="checkbox" class="com-person-stable" value="${esc(e.id)}" ${selected.has(String(e.id))?'checked':''}><span>${esc(name(e))}</span></label>`).join(''):'<div class="empty-state compact"><p>No hay empleados cargados.</p></div>'}</div><p class="muted">Marca uno o varios empleados. A cada uno se le acumularán las noches del periodo.</p></div>
        <div class="modal-actions"><button class="btn secondary" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="saveCommission('${id}')">Guardar</button></div>`);
      const update=()=>{const n=nights(document.getElementById('comInicio')?.value,document.getElementById('comFin')?.value);const el=document.getElementById('comPreview');if(el)el.innerHTML=`Noches calculadas: <strong>${n}</strong>`;};
      document.getElementById('comInicio')?.addEventListener('change',update);
      document.getElementById('comFin')?.addEventListener('change',update);
      update();
    }catch(e){if(typeof toast==='function')toast(e.message||'No se pudo abrir el formulario','error');}
  };

  window.saveCommission=async function(id=''){
    if(!admin())return;
    const ejercicio=document.getElementById('comEj')?.value.trim();
    const inicio=document.getElementById('comInicio')?.value;
    const fin=document.getElementById('comFin')?.value;
    const lugar=document.getElementById('comLugar')?.value.trim();
    const ids=[...document.querySelectorAll('.com-person-stable:checked')].map(x=>x.value);
    if(!ejercicio||!inicio||!fin||!lugar){toast('Completa ejercicio, fecha inicio, fecha fin y lugar','warn');return;}
    if(fin<inicio){toast('La fecha fin no puede ser anterior a la fecha de inicio','warn');return;}
    try{
      let cid=id;
      if(id){
        const r=await db.from('comisiones_servicio').update({ejercicio,fecha:inicio,fecha_inicio:inicio,fecha_fin:fin,lugar,updated_at:new Date().toISOString()}).eq('id',id).select('id').single();
        if(r.error)throw r.error;
        cid=r.data.id;
        const d=await db.from('comisiones_personal').delete().eq('comision_id',cid);
        if(d.error&&d.code!=='PGRST205')throw d.error;
      }else{
        const r=await db.from('comisiones_servicio').insert({ejercicio,fecha:inicio,fecha_inicio:inicio,fecha_fin:fin,lugar}).select('id').single();
        if(r.error)throw r.error;
        cid=r.data.id;
      }
      if(ids.length){
        const r=await db.from('comisiones_personal').insert(ids.map(empleado_id=>({comision_id:cid,empleado_id})));
        if(r.error)throw r.error;
      }
      closeModal();
      await renderEnhanced();
      toast(id?'Registro actualizado':'Registro añadido');
    }catch(e){toast(e.message||'No se pudo guardar el registro','error');}
  };

  window.deleteCommission=async function(id){
    if(!admin())return;
    const x=(window.__COMISIONES_NIGHT_ROWS||[]).find(r=>String(r.id)===String(id));
    if(!x||!confirm(`¿Eliminar "${x.ejercicio}"?`))return;
    const r=await db.from('comisiones_servicio').delete().eq('id',id);
    if(r.error){toast(r.error.message,'error');return;}
    await renderEnhanced();
    toast('Registro eliminado');
  };

  /* El controlador estable se carga antes que este archivo. Interceptamos solo esta ruta. */
  const baseRender=window.render;
  window.render=async function(page='inicio',...args){
    if(page!=='comisiones')return baseRender(page,...args);
    try{
      /* Conserva la carcasa, usuario y navegación del diseño estable. */
      await baseRender('comisiones');
      await renderEnhanced();
    }catch(e){
      const c=document.getElementById('content');
      if(c)c.innerHTML=`<div class="panel error-state"><h3>No se pudo cargar Ejercicios / Comisiones</h3><p>${esc(e.message||e)}</p></div>`;
    }
  };
  window.comisionesPage=renderEnhanced;
})();
