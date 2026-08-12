(function(){
  const originalRender = window.render;

  async function comisionesPage(){
    const content = document.getElementById('content');
    if(!content) return;
    const r = await db.from('comisiones_servicio').select('id,ejercicio,fecha,lugar,created_at,updated_at').order('fecha',{ascending:false}).order('ejercicio');
    if(r.error){ content.innerHTML = `<div class="panel error-state"><h3>No se pudieron cargar las comisiones</h3><p>${esc(r.error.message)}</p></div>`; return; }
    const rows = r.data || [];
    window.__comisionesCache = rows;
    content.innerHTML = `<div class="calendar-toolbar"><div><span class="eyebrow">ACTIVIDAD OPERATIVA</span><h3>Comisiones de Servicio / Ejercicios / Misiones</h3><p class="muted">Registro centralizado de ejercicio, fecha y lugar. ${admin ? 'Solo el administrador puede añadir, editar o eliminar registros.' : 'Modo consulta.'}</p></div>${admin ? '<button class="btn primary" onclick="comisionForm()">+ Añadir registro</button>' : ''}</div><div class="panel commission-panel"><div class="commission-summary"><div><span class="summary-label">REGISTROS</span><strong>${rows.length}</strong></div><div><span class="summary-label">ÚLTIMA FECHA</span><strong>${rows.length ? new Date(rows[0].fecha+'T00:00:00').toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric'}) : '—'}</strong></div><div class="summary-note">${admin ? 'Mantén actualizado el calendario operativo desde este apartado.' : 'La información está disponible para todo el equipo.'}</div></div><div class="table-scroll"><table class="commission-table"><thead><tr><th>Ejercicio / Misión</th><th>Fecha</th><th>Lugar</th>${admin ? '<th>Acciones</th>' : ''}</tr></thead><tbody>${rows.length ? rows.map(x => `<tr><td><strong>${esc(x.ejercicio)}</strong></td><td><span class="date-chip">${new Date(x.fecha+'T00:00:00').toLocaleDateString('es-ES',{weekday:'short',day:'2-digit',month:'2-digit',year:'numeric'})}</span></td><td>${esc(x.lugar)}</td>${admin ? `<td><button class="table-action" onclick="comisionForm('${x.id}')">✎ Editar</button><button class="table-action danger" onclick="deleteComision('${x.id}')">🗑 Eliminar</button></td>` : ''}</tr>`).join('') : `<tr><td colspan="${admin ? 4 : 3}"><div class="empty-state compact"><div>✈</div><h3>No hay registros todavía</h3><p>${admin ? 'Añade el primer ejercicio, fecha y lugar.' : 'Todavía no hay actividades registradas.'}</p></div></td></tr>`}</tbody></table></div></div>`;
  }

  function ensureNav(page){
    const nav = document.querySelector('.side-nav');
    if(!nav) return;
    let link = Array.from(nav.querySelectorAll('.side-link')).find(el => el.dataset.comisiones === '1');
    if(!link){
      link = document.createElement('button');
      link.className = 'side-link';
      link.dataset.comisiones = '1';
      link.innerHTML = '<span class="side-icon">✈</span><span>Comisiones de Servicio / Ejercicios / Misiones</span>';
      link.onclick = () => window.render('comisiones');
      const special = Array.from(nav.querySelectorAll('.side-link')).find(el => el.textContent.includes('Especiales'));
      if(special) special.insertAdjacentElement('afterend',link); else nav.appendChild(link);
    }
    nav.querySelectorAll('.side-link').forEach(el => el.classList.remove('active'));
    if(page === 'comisiones') link.classList.add('active');
  }

  window.comisionForm = function(id=''){
    if(!admin) return;
    const existing = (window.__comisionesCache || []).find(x => x.id === id) || {ejercicio:'',fecha:'',lugar:''};
    openModal(`<div class="modal-head"><div><span class="eyebrow">ACTIVIDAD OPERATIVA</span><h3>${id ? 'Editar registro' : 'Nuevo registro'}</h3></div><button class="icon-btn" onclick="closeModal()">×</button></div><label>Ejercicio / misión<input id="comEjercicio" class="field" value="${esc(existing.ejercicio)}" placeholder="Ej. Ejercicio Ala 11"></label><label>Fecha<input id="comFecha" class="field" type="date" value="${esc(existing.fecha || '')}"></label><label>Lugar<input id="comLugar" class="field" value="${esc(existing.lugar)}" placeholder="Lugar / base / localidad"></label><div class="modal-actions"><button class="btn secondary" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="saveComision('${id}')">Guardar</button></div>`);
  };

  window.saveComision = async function(id){
    if(!admin) return;
    const ejercicio = document.getElementById('comEjercicio')?.value.trim();
    const fecha = document.getElementById('comFecha')?.value;
    const lugar = document.getElementById('comLugar')?.value.trim();
    if(!ejercicio || !fecha || !lugar){ toast('Completa ejercicio, fecha y lugar','warn'); return; }
    const r = id ? await db.from('comisiones_servicio').update({ejercicio,fecha,lugar,updated_at:new Date().toISOString()}).eq('id',id) : await db.from('comisiones_servicio').insert({ejercicio,fecha,lugar});
    if(r.error){ toast(r.error.message,'error'); return; }
    closeModal(); await comisionesPage(); toast(id ? 'Registro actualizado' : 'Registro añadido');
  };

  window.deleteComision = async function(id){
    if(!admin) return;
    const row = (window.__comisionesCache || []).find(x => x.id === id);
    if(!row || !confirm(`¿Eliminar el registro "${row.ejercicio}"?`)) return;
    const r = await db.from('comisiones_servicio').delete().eq('id',id);
    if(r.error){ toast(r.error.message,'error'); return; }
    await comisionesPage(); toast('Registro eliminado');
  };

  window.render = function(page='inicio'){
    originalRender(page === 'comisiones' ? 'inicio' : page);
    setTimeout(async () => {
      ensureNav(page);
      if(page === 'comisiones'){
        const title = document.querySelector('.topbar-left h1');
        if(title) title.textContent = 'Comisiones de Servicio / Ejercicios / Misiones';
        await comisionesPage();
      }
    }, 200);
  };
})();
