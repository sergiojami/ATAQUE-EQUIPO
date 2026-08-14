/* Ejercicios / Comisiones — versión estable con contador de noches */
(function(){
  const getEmployees=()=>Array.isArray(window.employees)?window.employees:[];
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const name=e=>e?.nombre||e?.full_name||'';
  const isAdmin=()=>window.admin===true;
  const nights=(start,end)=>{
    if(!start||!end)return 0;
    const a=new Date(start+'T00:00:00');
    const b=new Date(end+'T00:00:00');
    return Math.max(0,Math.round((b-a)/86400000));
  };
  const fmt=d=>d?new Date(d+'T00:00:00').toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric'}):'—';

  async function loadRows(){
    const r=await db.from('comisiones_servicio')
      .select('id,ejercicio,fecha,fecha_inicio,fecha_fin,lugar,created_at,updated_at')
      .order('fecha_inicio',{ascending:false,nullsFirst:false})
      .order('ejercicio',{ascending:true});
    if(r.error)throw r.error;
    const rows=r.data||[];
    if(!rows.length){window.__comisionesCache=[];return rows;}
    const ar=await db.from('comisiones_personal')
      .select('comision_id,empleado_id')
      .in('comision_id',rows.map(x=>x.id));
    if(ar.error&&ar.code!=='PGRST205')throw ar.error;
    const byId=new Map(getEmployees().map(e=>[String(e.id),e]));
    rows.forEach(x=>{
      x.fecha_inicio=x.fecha_inicio||x.fecha||'';
      x.fecha_fin=x.fecha_fin||x.fecha_inicio||'';
      x.noches=nights(x.fecha_inicio,x.fecha_fin);
      x.personal=(ar.data||[])
        .filter(a=>String(a.comision_id)===String(x.id))
        .map(a=>byId.get(String(a.empleado_id)))
        .filter(Boolean);
    });
    window.__comisionesCache=rows;
    return rows;
  }

  function buildSummary(rows){
    const totals=new Map();
    rows.forEach(r=>(r.personal||[]).forEach(p=>{
      const id=String(p.id);
      totals.set(id,(totals.get(id)||0)+Number(r.noches||0));
    }));
    const summary=[...totals.entries()]
      .map(([id,total])=>({empleado:getEmployees().find(e=>String(e.id)===id),total}))
      .filter(x=>x.empleado)
      .sort((a,b)=>{
        const diff=b.total-a.total;
        return diff||name(a.empleado).localeCompare(name(b.empleado),'es');
      });
    return {summary,totalNoches:[...totals.values()].reduce((s,n)=>s+n,0)};
  }

  async function renderComisionesPage(){
    const c=document.getElementById('content');
    if(!c)return;
    try{
      const rows=await loadRows();
      const {summary,totalNoches}=buildSummary(rows);
      c.innerHTML=`
        <div class="calendar-toolbar">
          <div>
            <span class="eyebrow">ACTIVIDAD OPERATIVA</span>
            <h3>Ejercicios / Comisiones</h3>
            <p class="muted">Gestiona ejercicios, fechas, lugar, personal asignado y noches acumuladas.</p>
          </div>
          ${isAdmin()?'<button class="btn primary" onclick="comisionForm()">+ Añadir registro</button>':''}
        </div>

        <div class="commission-night-dashboard">
          <div class="commission-night-kpi">
            <span class="summary-label">TOTAL ACUMULADO</span>
            <strong>${totalNoches}</strong>
            <span>noches-persona</span>
          </div>
          <div class="commission-night-info">
            <div>
              <span class="eyebrow">NOCHES POR EMPLEADO</span>
              <h3>Resumen acumulado</h3>
              <p class="muted">La cifra de cada empleado suma las noches de todos los ejercicios en los que está asignado.</p>
            </div>
            <div class="commission-night-list">
              ${summary.length?summary.map(x=>`<div class="commission-night-row"><span>${esc(name(x.empleado))}</span><strong>${x.total}</strong><small>${x.total===1?'noche':'noches'}</small></div>`).join(''):'<span class="muted">Todavía no hay personal con noches asignadas.</span>'}
            </div>
          </div>
        </div>

        <div class="panel commission-panel">
          <div class="table-scroll">
            <table class="commission-table">
              <thead>
                <tr>
                  <th>Ejercicio / Misión</th>
                  <th>Periodo</th>
                  <th>Lugar</th>
                  <th>Personal asignado</th>
                  <th>Noches por empleado</th>
                  ${isAdmin()?'<th>Acciones</th>':''}
                </tr>
              </thead>
              <tbody>
                ${rows.length?rows.map(x=>`
                  <tr>
                    <td><strong>${esc(x.ejercicio)}</strong></td>
                    <td>
                      <span class="date-chip">${fmt(x.fecha_inicio)}${x.fecha_fin!==x.fecha_inicio?` – ${fmt(x.fecha_fin)}`:''}</span>
                      <div class="night-badge">${x.noches} ${x.noches===1?'noche':'noches'}</div>
                    </td>
                    <td>${esc(x.lugar)}</td>
                    <td>${x.personal?.length?x.personal.map(p=>`<span class="person-chip">${esc(name(p))}</span>`).join(' '):'<span class="muted">Sin personal asignado</span>'}</td>
                    <td>${x.personal?.length?x.personal.map(p=>`<span class="night-person-chip"><strong>${esc(name(p))}</strong><span>${x.noches}</span></span>`).join(' '):'—'}</td>
                    ${isAdmin()?`<td><button class="table-action" onclick="comisionForm('${x.id}')">✎ Editar</button><button class="table-action danger" onclick="deleteComision('${x.id}')">🗑 Eliminar</button></td>`:''}
                  </tr>`).join(''):`<tr><td colspan="${isAdmin()?6:5}"><div class="empty-state compact"><h3>No hay registros todavía</h3><p>Añade un ejercicio, comisión o misión para empezar.</p></div></td></tr>`}
              </tbody>
            </table>
          </div>
        </div>`;
    }catch(e){
      c.innerHTML=`<div class="panel error-state"><h3>No se pudieron cargar los ejercicios / comisiones</h3><p>${esc(e.message||e)}</p></div>`;
    }
  }

  function ensureNav(activePage=''){
    const nav=document.querySelector('.side-nav');
    if(!nav)return;
    let link=Array.from(nav.querySelectorAll('.side-link')).find(x=>x.dataset.comisiones==='1');
    if(!link){
      link=document.createElement('button');
      link.className='side-link';
      link.dataset.comisiones='1';
      link.innerHTML='<span class="side-icon">✈</span><span>Ejercicios / Comisiones</span>';
      link.onclick=()=>window.render('comisiones');
      nav.appendChild(link);
    }
    link.classList.toggle('active',activePage==='comisiones');
  }

  window.ensureComisionesNav=ensureNav;
  window.comisionesPage=renderComisionesPage;

  window.comisionForm=async function(id=''){
    if(!isAdmin())return;
    try{
      if(!getEmployees().length&&typeof window.loadEmployees==='function')await window.loadEmployees();
      const ex=(window.__comisionesCache||[]).find(x=>String(x.id)===String(id))||{ejercicio:'',fecha:'',fecha_inicio:'',fecha_fin:'',lugar:'',personal:[]};
      const selected=new Set((ex.personal||[]).map(p=>String(p.id)));
      const em=[...getEmployees()].sort((a,b)=>name(a).localeCompare(name(b),'es'));
      openModal(`
        <div class="modal-head"><div><span class="eyebrow">ACTIVIDAD OPERATIVA</span><h3>${id?'Editar':'Nuevo'} ejercicio / comisión</h3></div><button class="icon-btn" onclick="closeModal()">×</button></div>
        <label>Ejercicio / misión<input id="comEjercicio" class="field" value="${esc(ex.ejercicio)}" placeholder="Ejercicio o misión"></label>
        <div class="date-range"><label>Fecha inicio<input id="comFechaInicio" class="field" type="date" value="${esc(ex.fecha_inicio||ex.fecha||'')}"></label><label>Fecha fin<input id="comFechaFin" class="field" type="date" value="${esc(ex.fecha_fin||ex.fecha_inicio||ex.fecha||'')}"></label></div>
        <div id="comNochesPreview" class="night-preview">Noches calculadas: <strong>0</strong></div>
        <label>Lugar<input id="comLugar" class="field" value="${esc(ex.lugar)}" placeholder="Lugar"></label>
        <div class="assign-box"><div class="assign-title">PERSONAL ASIGNADO</div><div class="employee-select-list">${em.length?em.map(e=>`<label class="employee-option"><input type="checkbox" class="com-person" value="${esc(e.id)}" ${selected.has(String(e.id))?'checked':''}><span>${esc(name(e))}</span></label>`).join(''):'<div class="empty-state compact"><p>No hay empleados cargados.</p></div>'}</div><p class="muted">Marca uno o varios empleados. A cada uno se le acumularán las noches del periodo.</p></div>
        <div class="modal-actions"><button class="btn secondary" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="saveComision('${id}')">Guardar</button></div>`);
      const updatePreview=()=>{
        const n=nights(document.getElementById('comFechaInicio')?.value,document.getElementById('comFechaFin')?.value);
        const el=document.getElementById('comNochesPreview');
        if(el)el.innerHTML=`Noches calculadas: <strong>${n}</strong>`;
      };
      document.getElementById('comFechaInicio')?.addEventListener('change',updatePreview);
      document.getElementById('comFechaFin')?.addEventListener('change',updatePreview);
      updatePreview();
    }catch(e){toast(e.message||'No se pudo abrir el formulario','error');}
  };

  window.saveComision=async function(id=''){
    if(!isAdmin())return;
    const ejercicio=document.getElementById('comEjercicio')?.value.trim();
    const inicio=document.getElementById('comFechaInicio')?.value;
    const fin=document.getElementById('comFechaFin')?.value;
    const lugar=document.getElementById('comLugar')?.value.trim();
    const empleadosSeleccionados=[...document.querySelectorAll('.com-person:checked')].map(x=>x.value);
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
      if(empleadosSeleccionados.length){
        const r=await db.from('comisiones_personal').insert(empleadosSeleccionados.map(empleado_id=>({comision_id:cid,empleado_id})));
        if(r.error)throw r.error;
      }
      closeModal();
      await renderComisionesPage();
      toast(id?'Registro actualizado':'Registro añadido');
    }catch(e){toast(e.message||'No se pudo guardar el registro','error');}
  };

  window.deleteComision=async function(id){
    if(!isAdmin())return;
    const x=(window.__comisionesCache||[]).find(r=>String(r.id)===String(id));
    if(!x||!confirm(`¿Eliminar "${x.ejercicio}"?`))return;
    const r=await db.from('comisiones_servicio').delete().eq('id',id);
    if(r.error){toast(r.error.message,'error');return;}
    await renderComisionesPage();
    toast('Registro eliminado');
  };
})();