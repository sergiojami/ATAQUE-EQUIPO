/* Misiones — apartado independiente con las mismas funciones operativas que Ejercicios / Comisiones. */
(function(){
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const name=e=>e?.nombre||'';
  const admin=()=>window.__ATAQUE_ADMIN===true||window.admin===true;
  const employees=()=>Array.isArray(window.__ATAQUE_EMPLOYEES)?window.__ATAQUE_EMPLOYEES:[];
  const nights=(start,end)=>{
    if(!start||!end)return 0;
    const a=new Date(start+'T00:00:00'); const b=new Date(end+'T00:00:00');
    return Math.max(0,Math.round((b-a)/86400000));
  };
  const fmt=d=>d?new Date(d+'T00:00:00').toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric'}):'—';
  const sortPeople=list=>[...(list||[])].sort((a,b)=>String(a.nombre||'').localeCompare(String(b.nombre||''),'es'));

  async function load(){
    const r=await db.from('misiones').select('id,ejercicio,fecha,fecha_inicio,fecha_fin,lugar,created_at,updated_at').order('fecha_inicio',{ascending:false,nullsFirst:false}).order('fecha',{ascending:false,nullsFirst:false}).order('ejercicio',{ascending:true});
    if(r.error)throw r.error;
    const rows=r.data||[];
    if(!rows.length){window.__MISIONES_ROWS=[];return rows;}
    const ids=rows.map(x=>x.id);
    const ar=await db.from('misiones_personal').select('mision_id,empleado_id').in('mision_id',ids);
    if(ar.error)throw ar.error;
    const byId=new Map(employees().map(e=>[String(e.id),e]));
    rows.forEach(x=>{
      x.fecha_inicio=x.fecha_inicio||x.fecha||'';
      x.fecha_fin=x.fecha_fin||x.fecha_inicio||'';
      x.noches=nights(x.fecha_inicio,x.fecha_fin);
      x.personal=(ar.data||[]).filter(a=>String(a.mision_id)===String(x.id)).map(a=>byId.get(String(a.empleado_id))).filter(Boolean);
    });
    window.__MISIONES_ROWS=rows;
    return rows;
  }

  function summary(rows){
    const totals=new Map(employees().map(e=>[String(e.id),0]));
    rows.forEach(r=>(r.personal||[]).forEach(p=>totals.set(String(p.id),(totals.get(String(p.id))||0)+Number(r.noches||0))));
    const preferred=['De Benito','Angulo','Pajarillo','Sergio','Raul','Roldán','Paloma','Rubén','De Porras','Salvatierra','Castillo','Campos'];
    const norm=v=>String(v||'').trim().toLocaleLowerCase('es');
    const list=[...totals.entries()].map(([id,total])=>({empleado:employees().find(e=>String(e.id)===id),total})).filter(x=>x.empleado).sort((a,b)=>{const ai=preferred.findIndex(n=>norm(n)===norm(name(a.empleado))),bi=preferred.findIndex(n=>norm(n)===norm(name(b.empleado)));if(ai>=0&&bi>=0)return ai-bi;if(ai>=0)return -1;if(bi>=0)return 1;return norm(name(a.empleado)).localeCompare(norm(name(b.empleado)),'es');});
    return {list,total:list.reduce((s,x)=>s+x.total,0)};
  }

  function style(){
    if(document.getElementById('misiones-style'))return;
    const s=document.createElement('style');s.id='misiones-style';s.textContent=`
      .mission-dashboard{display:grid;grid-template-columns:170px 1fr;background:#fff;border:1px solid #dce6ef;border-radius:18px;overflow:hidden;margin:18px 0}
      .mission-kpi{padding:28px 22px;background:linear-gradient(180deg,#edf7fb,#f8fbfd);display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center}
      .mission-kpi strong{font-size:40px;line-height:1;color:#183b5b;margin:7px 0}.mission-kpi span:last-child{color:#7890a6;font-size:12px}.mission-info{padding:24px}.mission-list{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin-top:18px}.mission-person-total{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:10px 12px;border:1px solid #e1e9f0;border-radius:10px;background:#f8fbfd}.mission-person-total strong:last-of-type{font-size:18px;color:#183b5b}.mission-person-total small{color:#7890a6}.mission-actions{white-space:nowrap}.mission-date-range{display:grid;grid-template-columns:1fr 1fr;gap:12px}.mission-night-preview{margin:12px 0;padding:10px 12px;border-radius:10px;background:#edf7fb;color:#235b7c}.mission-assign{max-height:260px;overflow:auto;border:1px solid #dce6ef;border-radius:10px;padding:8px}.mission-option{display:flex;align-items:center;gap:10px;padding:8px 6px}.mission-option input{width:18px;height:18px}.mission-person-chip,.mission-night-chip{display:inline-flex;align-items:center;gap:7px;border-radius:999px;padding:5px 9px;margin:2px;background:#eef7fb;color:#175879;font-size:12px}.mission-night-chip span{font-weight:800}.mission-table td,.mission-table th{vertical-align:middle}.mission-table .date-chip{white-space:nowrap}.mission-table .night-badge{display:inline-flex;min-width:28px;justify-content:center;padding:5px 8px;border-radius:999px;background:#edf4f9;font-weight:800;color:#183b5b}
      @media(max-width:900px){.mission-list{grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:650px){.mission-dashboard{grid-template-columns:1fr}.mission-list{grid-template-columns:1fr}.mission-date-range{grid-template-columns:1fr}}
    `;document.head.appendChild(s);
  }

  async function render(){
    style();
    const c=document.getElementById('content');if(!c)return;
    try{
      const rows=await load(),s=summary(rows);
      c.innerHTML=`
        <div class="calendar-toolbar"><div><span class="eyebrow">ACTIVIDAD OPERATIVA</span><h3>Misiones</h3><p class="muted">Fecha de inicio, fecha de fin, noches por empleado y acumulado total.</p></div>${admin()?'<button class="btn primary" onclick="missionForm()">+ Añadir misión</button>':''}</div>
        <div class="mission-dashboard"><div class="mission-kpi"><span class="summary-label">TOTAL ACUMULADO</span><strong>${s.total}</strong><span>noches-persona</span></div><div class="mission-info"><span class="eyebrow">NOCHES TOTALES POR EMPLEADO</span><h3>Acumulado de todas las misiones</h3><p class="muted">El contador suma automáticamente las noches de todas las misiones en las que está asignado cada empleado.</p><div class="mission-list">${s.list.length?s.list.map(x=>`<div class="mission-person-total"><strong>${esc(name(x.empleado))}</strong><strong>${x.total}</strong><small>${x.total===1?'noche':'noches'}</small></div>`).join(''):'<span class="muted">No hay empleados cargados.</span>'}</div></div></div>
        <div class="panel"><div class="table-scroll"><table class="commission-table mission-table"><thead><tr><th>Misión</th><th>Fecha inicio</th><th>Fecha fin</th><th>Nº noches</th><th>Lugar</th><th>Personal asignado</th><th>Noches por empleado</th>${admin()?'<th>Acciones</th>':''}</tr></thead><tbody>${rows.length?rows.map(x=>`<tr><td><strong>${esc(x.ejercicio)}</strong></td><td><span class="date-chip">${fmt(x.fecha_inicio)}</span></td><td><span class="date-chip">${fmt(x.fecha_fin)}</span></td><td><span class="night-badge">${x.noches}</span></td><td>${esc(x.lugar)}</td><td>${x.personal?.length?x.personal.map(p=>`<span class="mission-person-chip">${esc(name(p))}</span>`).join(' '):'<span class="muted">Sin personal asignado</span>'}</td><td>${x.personal?.length?x.personal.map(p=>`<span class="mission-night-chip"><strong>${esc(name(p))}</strong><span>${x.noches}</span></span>`).join(' '):'—'}</td>${admin()?`<td class="mission-actions"><button class="table-action" onclick="missionForm('${x.id}')">✎ Editar</button><button class="table-action danger" onclick="deleteMission('${x.id}')">🗑 Eliminar</button></td>`:''}</tr>`).join(''):`<tr><td colspan="${admin()?8:7}"><div class="empty-state compact"><h3>No hay misiones todavía</h3><p>Añade una misión para empezar.</p></div></td></tr>`}</tbody></table></div></div>`;
    }catch(e){c.innerHTML=`<div class="panel error-state"><h3>No se pudieron cargar las misiones</h3><p>${esc(e.message||e)}</p></div>`;}
  }

  window.missionForm=async function(id=''){
    if(!admin())return;
    try{
      const rows=window.__MISIONES_ROWS||await load(),x=rows.find(r=>String(r.id)===String(id))||{ejercicio:'',fecha_inicio:'',fecha_fin:'',lugar:'',personal:[]};
      const selected=new Set((x.personal||[]).map(p=>String(p.id)));
      const em=sortPeople(employees());
      openModal(`<div class="modal-head"><div><span class="eyebrow">ACTIVIDAD OPERATIVA</span><h3>${id?'Editar':'Nueva'} misión</h3></div><button class="icon-btn" onclick="closeModal()">×</button></div><label>Misión<input id="misEj" class="field" value="${esc(x.ejercicio)}" placeholder="Nombre de la misión"></label><div class="mission-date-range"><label>Fecha inicio<input id="misInicio" class="field" type="date" value="${esc(x.fecha_inicio||'')}"></label><label>Fecha fin<input id="misFin" class="field" type="date" value="${esc(x.fecha_fin||'')}"></label></div><div id="misPreview" class="mission-night-preview">Noches calculadas: <strong>0</strong></div><label>Lugar<input id="misLugar" class="field" value="${esc(x.lugar)}" placeholder="Lugar"></label><div class="assign-box"><div class="assign-title">PERSONAL ASIGNADO</div><div class="mission-assign">${em.map(e=>`<label class="mission-option"><input type="checkbox" class="mis-person" value="${esc(e.id)}" ${selected.has(String(e.id))?'checked':''}><span>${esc(name(e))}</span></label>`).join('')}</div><p class="muted">Marca uno o varios empleados. A cada uno se le acumularán las noches del periodo.</p></div><div class="modal-actions"><button class="btn secondary" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="saveMission('${id}')">Guardar</button></div>`);
      const update=()=>{const n=nights(document.getElementById('misInicio')?.value,document.getElementById('misFin')?.value),el=document.getElementById('misPreview');if(el)el.innerHTML=`Noches calculadas: <strong>${n}</strong>`;};
      document.getElementById('misInicio')?.addEventListener('change',update);document.getElementById('misFin')?.addEventListener('change',update);update();
    }catch(e){toast(e.message||'No se pudo abrir el formulario','error');}
  };

  window.saveMission=async function(id=''){
    if(!admin())return;
    const ejercicio=document.getElementById('misEj')?.value.trim(),inicio=document.getElementById('misInicio')?.value,fin=document.getElementById('misFin')?.value,lugar=document.getElementById('misLugar')?.value.trim(),ids=[...document.querySelectorAll('.mis-person:checked')].map(x=>x.value);
    if(!ejercicio||!inicio||!fin||!lugar){toast('Completa misión, fecha inicio, fecha fin y lugar','warn');return;}
    if(fin<inicio){toast('La fecha fin no puede ser anterior a la fecha de inicio','warn');return;}
    try{
      let mid=id;
      if(id){const r=await db.from('misiones').update({ejercicio,fecha:inicio,fecha_inicio:inicio,fecha_fin:fin,lugar,updated_at:new Date().toISOString()}).eq('id',id).select('id').single();if(r.error)throw r.error;mid=r.data.id;const d=await db.from('misiones_personal').delete().eq('mision_id',mid);if(d.error)throw d.error;}
      else{const r=await db.from('misiones').insert({ejercicio,fecha:inicio,fecha_inicio:inicio,fecha_fin:fin,lugar}).select('id').single();if(r.error)throw r.error;mid=r.data.id;}
      if(ids.length){const r=await db.from('misiones_personal').insert(ids.map(empleado_id=>({mision_id:mid,empleado_id})));if(r.error)throw r.error;}
      closeModal();await render();toast(id?'Misión actualizada':'Misión añadida');
    }catch(e){toast(e.message||'No se pudo guardar la misión','error');}
  };

  window.deleteMission=async function(id){if(!admin())return;const x=(window.__MISIONES_ROWS||[]).find(r=>String(r.id)===String(id));if(!x||!confirm(`¿Eliminar la misión "${x.ejercicio}"?`))return;const r=await db.from('misiones').delete().eq('id',id);if(r.error){toast(r.error.message,'error');return;}await render();toast('Misión eliminada');};

  const baseRender=window.render;
  window.render=async function(page='inicio',...args){
    if(page==='misiones'){
      await baseRender('comisiones');
      const title=document.querySelector('.topbar h1');if(title)title.textContent='Misiones';
      document.querySelectorAll('.side-link').forEach(b=>{if(b.textContent.trim().includes('Ejercicios / Comisiones'))b.classList.remove('active');});
      const side=[...document.querySelectorAll('.side-link')].find(b=>b.textContent.trim()==='Misiones');if(side)side.classList.add('active');
      await render();return;
    }
    await baseRender(page);
    if(page==='inicio')addHomeEntry();
  };

  function addHomeEntry(){
    const grid=document.querySelector('.quick-grid');if(!grid||grid.querySelector('.quick-missions'))return;
    const b=document.createElement('button');b.className='quick-missions';b.onclick=()=>window.render('misiones');b.innerHTML='<strong>✈ Misiones</strong><span>Fechas, lugares, personal asignado y noches.</span>';grid.appendChild(b);
    const nav=[...document.querySelectorAll('.side-link')];if(!nav.some(x=>x.textContent.trim()==='Misiones')){const target=nav.find(x=>x.textContent.trim()==='Ejercicios / Comisiones');if(target){const b2=target.cloneNode(true);b2.classList.remove('active');b2.querySelector('span:last-child').textContent='Misiones';b2.querySelector('.side-icon').textContent='✈';b2.setAttribute('onclick',"render('misiones')");target.insertAdjacentElement('afterend',b2);}}
  }
  window.misionesPage=render;
})();
