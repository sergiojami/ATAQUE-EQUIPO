/* Router estable: una sola entrada de navegación para evitar que los parches anteriores se pisen. */
(function(){
  const screen = () => document.getElementById('screen');
  const content = () => document.getElementById('content');
  const preferred = ['De Benito','Angulo','Pajarillo','Sergio','Raul','Roldán','Paloma','Rubén','De Porras','Salvatierra','Castillo','Campos'];
  const norm = v => String(v||'').trim().toLocaleLowerCase('es');
  const escS = v => String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const nameOf = e => e?.nombre || e?.full_name || '';
  const sortEmployees = list => [...(list||[])].sort((a,b)=>{
    const ai=preferred.findIndex(x=>norm(x)===norm(nameOf(a))), bi=preferred.findIndex(x=>norm(x)===norm(nameOf(b)));
    if(ai>=0 && bi>=0) return ai-bi;
    if(ai>=0) return -1;
    if(bi>=0) return 1;
    return norm(nameOf(a)).localeCompare(norm(nameOf(b)),'es');
  });
  const notify = (m,t='ok') => typeof window.toast==='function' ? window.toast(m,t) : console.log(m);

  async function stableLoadEmployees(){
    const r=await db.from('empleados').select('id,nombre,telefono,turnos,rol,created_at').neq('rol','admin');
    if(r.error) throw r.error;
    window.employees=sortEmployees(r.data||[]);
    return window.employees;
  }

  async function stableChoose(){
    window.admin=false; window.current=null;
    const s=screen();
    try{
      await stableLoadEmployees();
      s.innerHTML=`<div class="login-screen"><div class="login-watermark"></div><section class="login-intro"><img class="login-logo" src="${window.ATAQUE_LOGO||''}" alt="ATAQUE EQUIPO"><div class="eyebrow">PORTAL DE GESTIÓN</div><h1>ATAQUE EQUIPO</h1><p>Cuadrantes, especiales, novedades y gestión del equipo en un único lugar.</p></section><section class="login-card"><div class="login-card-head"><span class="eyebrow">ACCESO</span><h2>Selecciona tu nombre</h2><p>Accede al portal del equipo.</p></div><select id="employeeSelect" class="field"><option value="">Seleccionar empleado...</option>${window.employees.map(e=>`<option value="${escS(e.id)}">${escS(nameOf(e))}</option>`).join('')}</select><button class="btn primary wide" onclick="enterSelected()">Entrar</button><div class="divider"><span>o</span></div><button class="btn secondary wide" onclick="showAdminLogin()">Acceso administrador</button></section></div>`;
    }catch(e){
      s.innerHTML=`<div class="login-error"><div class="login-card"><div class="logo-circle">AE</div><h1>ATAQUE EQUIPO</h1><p>No se ha podido conectar con la base de datos.</p><small>${escS(e.message||e)}</small><button class="btn primary" onclick="choose()">Reintentar</button></div></div>`;
    }
  }

  window.ensureSpecialRows = window.ensureSpecialRows || (async()=>true);
  window.stableChoose = stableChoose;
  window.choose = stableChoose;

  window.enterSelected = function(){
    const id=document.getElementById('employeeSelect')?.value;
    if(!id) return notify('Selecciona un empleado','warn');
    window.current=window.employees.find(e=>String(e.id)===String(id))||null;
    window.admin=false;
    window.render('inicio');
  };

  function nav(page,icon,label,active){return `<button type="button" class="side-link ${page===active?'active':''}" onclick="render('${page}')"><span class="side-icon">${icon}</span><span>${label}</span></button>`;}
  function shell(page){
    const titles={inicio:'Inicio',cuadrantes:'Cuadrante de Turnos',especiales:'Especiales',empleados:'Gestión de Empleados',novedades:'Novedades',comisiones:'Ejercicios / Comisiones'};
    const s=screen();
    s.innerHTML=`<div class="app-shell"><aside class="sidebar" id="sidebar"><div class="sidebar-brand"><img src="${window.ATAQUE_LOGO||''}" alt="ATAQUE EQUIPO"><div><b>ATAQUE EQUIPO</b><span>Compromiso · Trabajo · Seguridad</span></div></div><nav class="side-nav">${nav('inicio','⌂','Inicio',page)}${nav('cuadrantes','▦','Cuadrante de Turnos',page)}${nav('especiales','★','Especiales',page)}${window.admin?nav('empleados','♟','Gestión de Empleados',page):''}${nav('comisiones','✈','Ejercicios / Comisiones',page)}${nav('novedades','✦','Novedades',page)}</nav><div class="sidebar-bottom"><div class="sidebar-help">Solo el administrador puede modificar el cuadrante y gestionar empleados.</div><button class="side-link" onclick="showHelp()"><span class="side-icon">?</span><span>Ayuda</span></button><button class="side-link logout-side" onclick="choose()"><span class="side-icon">↪</span><span>Cerrar sesión</span></button><div class="sidebar-mark"><img src="${window.ATAQUE_LOGO||''}" alt=""></div><div class="sidebar-footer">ATAQUE EQUIPO</div></div></aside><main class="main-area"><header class="topbar"><div class="topbar-left"><button class="mobile-menu" onclick="toggleSidebar()">☰</button><div><span class="eyebrow">ATAQUE EQUIPO</span><h1>${titles[page]||'Portal'}</h1></div></div><div class="topbar-right"><div class="user-chip"><div class="avatar">${window.admin?'AD':(typeof window.ini==='function'?window.ini(window.current?.nombre):'')}</div><div><b>${window.admin?'Administrador':escS(nameOf(window.current))}</b><span>${window.admin?'Control total':'Empleado'}</span></div></div><button class="icon-btn" title="Cerrar sesión" onclick="choose()">↪</button></div></header><div class="page-content" id="content"></div></main></div>`;
  }

  async function safePage(fn){try{await fn();}catch(e){const c=content();if(c)c.innerHTML=`<div class="panel error-state"><h3>No se pudo cargar este apartado</h3><p>${escS(e.message||e)}</p><button class="btn secondary" onclick="render('inicio')">Volver a Inicio</button></div>`;}}

  async function stableEmployees(){
    if(!window.admin){return window.render('inicio');}
    const r=await db.from('empleados').select('id,nombre,telefono,turnos,rol,created_at').neq('rol','admin');
    if(r.error) throw r.error;
    window.__stableEmpCache=sortEmployees(r.data||[]);
    window.employees=window.__stableEmpCache;
    const c=content();
    c.innerHTML=`<div class="calendar-toolbar"><div><span class="eyebrow">CONTROL DE PERSONAL</span><h3>Gestión de Empleados</h3><p class="muted">Añade, edita o elimina personal. El orden operativo se conserva.</p></div><button class="btn primary" onclick="stableEmployeeForm()">+ Añadir empleado</button></div><div class="panel"><div class="table-scroll"><table class="employee-table"><thead><tr><th>#</th><th>Empleado</th><th>Teléfono</th><th>Turnos / puesto</th><th>Acciones</th></tr></thead><tbody>${window.__stableEmpCache.map((e,i)=>`<tr><td><b>${i+1}</b></td><td><div class="employee-cell"><span class="avatar-small">${escS((nameOf(e)||'').split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase())}</span><div><strong>${escS(nameOf(e))}</strong></div></div></td><td>${escS(e.telefono||'—')}</td><td>${escS(e.turnos||'—')}</td><td><button class="table-action" onclick="stableEmployeeForm('${e.id}')">✎ Editar</button><button class="table-action danger" onclick="stableDeleteEmployee('${e.id}')">🗑 Eliminar</button></td></tr>`).join('')}</tbody></table></div></div>`;
  }

  window.stableEmployeeForm=function(id=''){
    if(!window.admin)return notify('Solo el administrador puede gestionar empleados','warn');
    const e=(window.__stableEmpCache||[]).find(x=>String(x.id)===String(id))||{nombre:'',telefono:'',turnos:''};
    openModal(`<div class="modal-head"><div><span class="eyebrow">GESTIÓN DE PERSONAL</span><h3>${id?'Editar empleado':'Nuevo empleado'}</h3></div><button class="icon-btn" onclick="closeModal()">×</button></div><label>Nombre<input id="stableEmpNombre" class="field" value="${escS(e.nombre)}" placeholder="Nombre y apellidos"></label><label>Teléfono<input id="stableEmpTelefono" class="field" value="${escS(e.telefono||'')}" placeholder="Teléfono"></label><label>Turnos / puesto<input id="stableEmpTurnos" class="field" value="${escS(e.turnos||'')}" placeholder="Ej. Técnico"></label><div class="modal-actions"><button class="btn secondary" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="stableSaveEmployee('${id}')">Guardar</button></div>`);
  };
  window.stableSaveEmployee=async function(id=''){
    if(!window.admin)return;
    const nombre=document.getElementById('stableEmpNombre')?.value.trim();
    const telefono=document.getElementById('stableEmpTelefono')?.value.trim()||null;
    const turnos=document.getElementById('stableEmpTurnos')?.value.trim()||null;
    if(!nombre)return notify('El nombre es obligatorio','warn');
    const r=id?await db.from('empleados').update({nombre,telefono,turnos}).eq('id',id):await db.from('empleados').insert({nombre,telefono,turnos,rol:'empleado'});
    if(r.error)return notify(r.error.message,'error');
    closeModal();await stableLoadEmployees();notify(id?'Empleado actualizado':'Empleado añadido');await window.render('empleados');
  };
  window.stableDeleteEmployee=async function(id){
    if(!window.admin)return;
    const e=(window.__stableEmpCache||[]).find(x=>String(x.id)===String(id));
    if(!e||!confirm(`¿Eliminar a ${nameOf(e)}?`))return;
    const r=await db.from('empleados').delete().eq('id',id);if(r.error)return notify(r.error.message,'error');
    await stableLoadEmployees();notify('Empleado eliminado');await window.render('empleados');
  };

  async function stableNews(){
    const r=await db.from('novedades').select('id,titulo,contenido,autor,created_at,updated_at').order('created_at',{ascending:false});
    if(r.error)throw r.error;
    window.__stableNews=r.data||[];
    const c=content();
    c.innerHTML=`<div class="calendar-toolbar"><div><span class="eyebrow">COMUNICACIÓN INTERNA</span><h3>Novedades</h3><p class="muted">Todos los empleados pueden añadir, editar y eliminar.</p></div><button class="btn primary" onclick="stableNewsForm()">+ Añadir novedad</button></div><div class="news-list">${window.__stableNews.length?window.__stableNews.map(n=>`<article class="news-card"><div class="news-icon">✦</div><div class="news-body"><div class="news-top"><div><h4>${escS(n.titulo)}</h4><span>${escS(n.autor||'Equipo')} · ${n.created_at?new Date(n.created_at).toLocaleDateString('es-ES'):''}</span></div></div><p>${escS(n.contenido)}</p><div class="news-actions"><button class="table-action" onclick="stableNewsForm('${n.id}')">✎ Editar</button><button class="table-action danger" onclick="stableDeleteNews('${n.id}')">🗑 Eliminar</button></div></div></article>`).join(''):`<div class="empty-state"><div>✦</div><h3>No hay novedades todavía</h3><p>Añade la primera comunicación del equipo.</p></div>`}</div>`;
  }
  window.stableNewsForm=function(id=''){
    const n=(window.__stableNews||[]).find(x=>String(x.id)===String(id))||{titulo:'',contenido:''};
    openModal(`<div class="modal-head"><div><span class="eyebrow">COMUNICACIÓN</span><h3>${id?'Editar novedad':'Nueva novedad'}</h3></div><button class="icon-btn" onclick="closeModal()">×</button></div><label>Título<input id="stableNewsTitle" class="field" value="${escS(n.titulo)}" placeholder="Título"></label><label>Contenido<textarea id="stableNewsBody" class="field textarea" rows="7" placeholder="Escribe la novedad...">${escS(n.contenido)}</textarea></label><div class="modal-actions"><button class="btn secondary" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="stableSaveNews('${id}')">Guardar</button></div>`);
  };
  window.stableSaveNews=async function(id=''){
    const titulo=document.getElementById('stableNewsTitle')?.value.trim();const contenido=document.getElementById('stableNewsBody')?.value.trim();
    if(!titulo||!contenido)return notify('Completa título y contenido','warn');
    const autor=window.admin?'Administrador':nameOf(window.current)||'Empleado';
    const r=id?await db.from('novedades').update({titulo,contenido,autor,updated_at:new Date().toISOString()}).eq('id',id):await db.from('novedades').insert({titulo,contenido,autor});
    if(r.error)return notify(r.error.message,'error');closeModal();notify(id?'Novedad actualizada':'Novedad añadida');await window.render('novedades');
  };
  window.stableDeleteNews=async function(id){if(!confirm('¿Eliminar esta novedad?'))return;const r=await db.from('novedades').delete().eq('id',id);if(r.error)return notify(r.error.message,'error');notify('Novedad eliminada');await window.render('novedades');};

  async function stableRender(page='inicio'){
    shell(page);
    const jobs={
      inicio: async()=>{ if(typeof window.inicio==='function') await window.inicio(); },
      cuadrantes: async()=>{ if(typeof window.cuadrantes==='function') await window.cuadrantes(); },
      especiales: async()=>{ if(typeof window.especiales==='function') await window.especiales(); },
      empleados: stableEmployees,
      novedades: stableNews,
      comisiones: async()=>{ if(typeof window.comisionesPage==='function') await window.comisionesPage(); else throw new Error('El módulo de Ejercicios / Comisiones no está disponible.'); }
    };
    if(!jobs[page])page='inicio';
    await safePage(jobs[page]);
  }

  window.render=stableRender;
  window.toggleSidebar=window.toggleSidebar||(()=>document.getElementById('sidebar')?.classList.toggle('open'));
  window.changeMonth=window.changeMonth||((delta)=>{const d=window.calendarDate||new Date();window.calendarDate=new Date(d.getFullYear(),d.getMonth()+delta,1);window.render('cuadrantes');});
  window.unifiedMonth=(delta)=>{const d=window.calendarDate||new Date();window.calendarDate=new Date(d.getFullYear(),d.getMonth()+delta,1);window.render('cuadrantes');};
  window.choose=stableChoose;

  // Evita que los antiguos módulos vuelvan a pintar un router distinto.
  window.ensureComisionesNav=()=>{};

  // Si el documento ya está listo, dejamos la pantalla inicial bajo el router estable.
  if(document.readyState!=='loading') stableChoose();
  else document.addEventListener('DOMContentLoaded',stableChoose,{once:true});
})();
