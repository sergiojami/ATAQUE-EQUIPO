/* Corrección estable de altas/edición/borrado. Mantiene el diseño existente. */
(function () {
  const escapeHtml = v => String(v ?? '').replace(/[&<>\"']/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;', '\"':'&quot;', "'":'&#039;' }[m]));
  const isAdminUI = () => /Administrador/i.test(document.querySelector('.user-chip b')?.textContent || '');
  const activeName = () => document.querySelector('.user-chip b')?.textContent?.trim() || 'Empleado';
  const notify = (msg, type='ok') => typeof toast === 'function' ? toast(msg, type) : alert(msg);
  const baseRender = window.render;

  async function showPage(title, builder) {
    await baseRender('inicio');
    const h = document.querySelector('.topbar h1');
    if (h) h.textContent = title;
    const content = document.getElementById('content');
    if (content) await builder(content);
  }

  async function renderNovedadesFixed(content) {
    const r = await db.from('novedades').select('id,titulo,contenido,autor,created_at,updated_at').order('created_at', { ascending:false });
    if (r.error) { content.innerHTML = `<div class="panel error-state"><h3>No se pudieron cargar las novedades</h3><p>${escapeHtml(r.error.message)}</p></div>`; return; }
    window.__newsFixCache = r.data || [];
    content.innerHTML = `<div class="calendar-toolbar"><div><span class="eyebrow">COMUNICACIÓN INTERNA</span><h3>Novedades</h3><p class="muted">Todos los empleados pueden añadir, editar y eliminar.</p></div><button class="btn primary" onclick="window.fixNewsForm()">+ Añadir novedad</button></div><div class="news-list">${window.__newsFixCache.length ? window.__newsFixCache.map(n => `<article class="news-card"><div class="news-icon">✦</div><div class="news-body"><div class="news-top"><div><h4>${escapeHtml(n.titulo)}</h4><span>${escapeHtml(n.autor || 'Equipo')} · ${n.created_at ? new Date(n.created_at).toLocaleDateString('es-ES') : ''}</span></div></div><p>${escapeHtml(n.contenido)}</p><div class="news-actions"><button class="table-action" onclick="window.fixNewsForm('${n.id}')">✎ Editar</button><button class="table-action danger" onclick="window.fixDeleteNews('${n.id}')">🗑 Eliminar</button></div></div></article>`).join('') : `<div class="empty-state"><div>✦</div><h3>No hay novedades todavía</h3><p>Añade la primera comunicación del equipo.</p></div>`}</div>`;
  }

  window.fixNewsForm = function(id='') {
    const n = (window.__newsFixCache || []).find(x => x.id === id) || { titulo:'', contenido:'' };
    openModal(`<div class="modal-head"><div><span class="eyebrow">COMUNICACIÓN</span><h3>${id ? 'Editar novedad' : 'Nueva novedad'}</h3></div><button class="icon-btn" onclick="closeModal()">×</button></div><label>Título<input id="fixNewsTitle" class="field" value="${escapeHtml(n.titulo)}" placeholder="Título"></label><label>Contenido<textarea id="fixNewsBody" class="field textarea" rows="7" placeholder="Escribe la novedad...">${escapeHtml(n.contenido)}</textarea></label><div class="modal-actions"><button class="btn secondary" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="window.fixSaveNews('${id}')">Guardar</button></div>`);
  };

  window.fixSaveNews = async function(id='') {
    const titulo = document.getElementById('fixNewsTitle')?.value.trim();
    const contenido = document.getElementById('fixNewsBody')?.value.trim();
    if (!titulo || !contenido) return notify('Completa título y contenido', 'warn');
    const payload = { titulo, contenido, autor: activeName(), updated_at: new Date().toISOString() };
    const r = id ? await db.from('novedades').update(payload).eq('id', id) : await db.from('novedades').insert({ titulo, contenido, autor: activeName() });
    if (r.error) return notify(`No se pudo guardar: ${r.error.message}`, 'error');
    closeModal(); notify(id ? 'Novedad actualizada' : 'Novedad añadida'); await window.render('novedades');
  };

  window.fixDeleteNews = async function(id) {
    if (!confirm('¿Eliminar esta novedad?')) return;
    const r = await db.from('novedades').delete().eq('id', id);
    if (r.error) return notify(`No se pudo eliminar: ${r.error.message}`, 'error');
    notify('Novedad eliminada'); await window.render('novedades');
  };

  async function renderEmpleadosFixed(content) {
    if (!isAdminUI()) { await window.render('inicio'); return; }
    const r = await db.from('empleados').select('id,nombre,telefono,turnos,rol,created_at').neq('rol','admin').order('nombre');
    if (r.error) { content.innerHTML = `<div class="panel error-state"><h3>No se pudieron cargar los empleados</h3><p>${escapeHtml(r.error.message)}</p></div>`; return; }
    window.__empFixCache = r.data || [];
    content.innerHTML = `<div class="calendar-toolbar"><div><span class="eyebrow">CONTROL DE PERSONAL</span><h3>Gestión de Empleados</h3><p class="muted">Los cambios se guardan directamente en Supabase.</p></div><button class="btn primary" onclick="window.fixEmployeeForm()">+ Añadir empleado</button></div><div class="panel"><div class="table-scroll"><table class="employee-table"><thead><tr><th>Empleado</th><th>Teléfono</th><th>Turnos / puesto</th><th>Acciones</th></tr></thead><tbody>${window.__empFixCache.map(e => `<tr><td><div class="employee-cell"><span class="avatar-small">${escapeHtml((e.nombre||'').split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase())}</span><div><strong>${escapeHtml(e.nombre)}</strong></div></div></td><td>${escapeHtml(e.telefono || '—')}</td><td>${escapeHtml(e.turnos || '—')}</td><td><button class="table-action" onclick="window.fixEmployeeForm('${e.id}')">✎ Editar</button><button class="table-action danger" onclick="window.fixDeleteEmployee('${e.id}')">🗑 Eliminar</button></td></tr>`).join('')}</tbody></table></div></div>`;
  }

  window.fixEmployeeForm = function(id='') {
    if (!isAdminUI()) return notify('Solo el administrador puede gestionar empleados', 'warn');
    const e = (window.__empFixCache || []).find(x => x.id === id) || { nombre:'', telefono:'', turnos:'' };
    openModal(`<div class="modal-head"><div><span class="eyebrow">GESTIÓN DE PERSONAL</span><h3>${id ? 'Editar empleado' : 'Nuevo empleado'}</h3></div><button class="icon-btn" onclick="closeModal()">×</button></div><label>Nombre<input id="fixEmpNombre" class="field" value="${escapeHtml(e.nombre)}" placeholder="Nombre y apellidos"></label><label>Teléfono<input id="fixEmpTelefono" class="field" value="${escapeHtml(e.telefono || '')}" placeholder="Teléfono"></label><label>Turnos / puesto<input id="fixEmpTurnos" class="field" value="${escapeHtml(e.turnos || '')}" placeholder="Ej. Técnico"></label><div class="modal-actions"><button class="btn secondary" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="window.fixSaveEmployee('${id}')">Guardar</button></div>`);
  };

  window.fixSaveEmployee = async function(id='') {
    if (!isAdminUI()) return notify('Solo el administrador puede gestionar empleados', 'warn');
    const nombre = document.getElementById('fixEmpNombre')?.value.trim();
    const telefono = document.getElementById('fixEmpTelefono')?.value.trim() || null;
    const turnos = document.getElementById('fixEmpTurnos')?.value.trim() || null;
    if (!nombre) return notify('El nombre es obligatorio', 'warn');
    const r = id ? await db.from('empleados').update({ nombre, telefono, turnos }).eq('id', id) : await db.from('empleados').insert({ nombre, telefono, turnos, rol:'empleado' });
    if (r.error) return notify(`No se pudo guardar el empleado: ${r.error.message}`, 'error');
    closeModal(); notify(id ? 'Empleado actualizado correctamente' : 'Empleado añadido correctamente'); await window.render('empleados');
  };

  window.fixDeleteEmployee = async function(id) {
    if (!isAdminUI()) return notify('Solo el administrador puede gestionar empleados', 'warn');
    const e = (window.__empFixCache || []).find(x => x.id === id);
    if (!e || !confirm(`¿Eliminar a ${e.nombre}?`)) return;
    const r = await db.from('empleados').delete().eq('id', id);
    if (r.error) return notify(`No se pudo eliminar: ${r.error.message}`, 'error');
    notify('Empleado eliminado'); await window.render('empleados');
  };

  const previousRender = window.render;
  window.render = async function(page='inicio') {
    if (page === 'novedades') return showPage('Novedades', renderNovedadesFixed);
    if (page === 'empleados') return showPage('Gestión de Empleados', renderEmpleadosFixed);
    return previousRender(page);
  };
})();
