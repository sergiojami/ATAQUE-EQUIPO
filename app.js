const db = supabase.createClient(AVIONICA_SUPABASE_URL, AVIONICA_SUPABASE_KEY);

let employees = [];
let current = null;
let admin = false;
let calendarDate = new Date();

const S = document.getElementById("screen");
const LOGO = () => getComputedStyle(document.documentElement).getPropertyValue("--logo").trim().replace(/^url\(["']?/, "").replace(/["']?\)$/, "");
window.ATAQUE_LOGO = LOGO();

const esc = (value) => String(value ?? "").replace(/[&<>"']/g, (m) => ({
  "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
}[m]));

const ini = (name) => String(name || "").trim().split(/\s+/).map(x => x[0] || "").slice(0,2).join("").toUpperCase();
const monthLabel = (date) => new Intl.DateTimeFormat("es-ES", {month:"long",year:"numeric"}).format(date);
const dateKey = (year, month, day) => `${year}-${String(month + 1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
const daysInMonth = (year, month) => new Date(year, month + 1, 0).getDate();
function toast(message, type="ok") { const node=document.getElementById("toast"); if(!node)return; node.innerHTML=`<div class="toast ${type}">${esc(message)}</div>`; setTimeout(()=>{node.innerHTML=""},2600); }
function isAdmin(){ return admin === true; }

async function loadEmployees(){
  const r=await db.from("empleados").select("id,nombre,telefono,turnos,rol,created_at").neq("rol","admin").order("nombre");
  if(r.error) throw r.error;
  employees=r.data||[];
  return employees;
}

async function choose(){
  admin=false; current=null;
  try { await loadEmployees(); await ensureSpecialRows(); }
  catch(e){
    S.innerHTML=`<div class="login-error"><div class="login-card"><div class="logo-circle">AE</div><h1>ATAQUE EQUIPO</h1><p>No se ha podido conectar con la base de datos.</p><small>${esc(e.message)}</small><button class="btn primary" onclick="choose()">Reintentar</button></div></div>`;
    return;
  }
  S.innerHTML=`
    <div class="login-screen">
      <div class="login-watermark"></div>
      <section class="login-intro">
        <img class="login-logo" src="${window.ATAQUE_LOGO||""}" alt="ATAQUE EQUIPO">
        <div class="eyebrow">PORTAL DE GESTIÓN</div><h1>ATAQUE EQUIPO</h1>
        <p>Cuadrantes, especiales, novedades y gestión del equipo en un único lugar.</p>
      </section>
      <section class="login-card">
        <div class="login-card-head"><span class="eyebrow">ACCESO</span><h2>Selecciona tu nombre</h2><p>Accede al portal del equipo.</p></div>
        <select id="employeeSelect" class="field"><option value="">Seleccionar empleado...</option>${employees.map(e=>`<option value="${e.id}">${esc(e.nombre)}</option>`).join("")}</select>
        <button class="btn primary wide" onclick="enterSelected()">Entrar</button>
        <div class="divider"><span>o</span></div>
        <button class="btn secondary wide" onclick="showAdminLogin()">Acceso administrador</button>
      </section>
    </div>`;
}

function enterSelected(){ const id=document.getElementById("employeeSelect")?.value; if(!id){toast("Selecciona un empleado","warn");return;} current=employees.find(e=>e.id===id)||null; admin=false; render("inicio"); }
function showAdminLogin(){
  openModal(`<div class="modal-head"><div><span class="eyebrow">CONTROL DE ACCESO</span><h3>Administración</h3></div><button class="icon-btn" onclick="closeModal()">×</button></div><p class="muted">Introduce el PIN de administrador.</p><input id="adminPin" class="field" type="password" inputmode="numeric" maxlength="6" placeholder="PIN"><div class="modal-actions"><button class="btn secondary" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="checkAdminPin()">Entrar</button></div>`);
  setTimeout(()=>document.getElementById("adminPin")?.focus(),50);
}
function checkAdminPin(){ const pin=document.getElementById("adminPin")?.value||""; if(pin!=="1234"){toast("PIN incorrecto","error");return;} admin=true; current={id:"admin",nombre:"Administrador",telefono:"",rol:"admin"}; closeModal(); render("inicio"); }

function navItem(page,icon,label,active){ return `<button class="side-link ${page===active?"active":""}" onclick="render('${page}')"><span class="side-icon">${icon}</span><span>${label}</span></button>`; }
function toggleSidebar(){ document.getElementById("sidebar")?.classList.toggle("open"); }

function render(page="inicio"){
  const titles={inicio:"Inicio",cuadrantes:"Cuadrante de Turnos",especiales:"Especiales",empleados:"Gestión de Empleados",novedades:"Novedades"};
  S.innerHTML=`<div class="app-shell">
    <aside class="sidebar" id="sidebar">
      <div class="sidebar-brand"><img src="${window.ATAQUE_LOGO||""}" alt="ATAQUE EQUIPO"><div><b>ATAQUE EQUIPO</b><span>Compromiso · Trabajo · Seguridad</span></div></div>
      <nav class="side-nav">${navItem("inicio","⌂","Inicio",page)}${navItem("cuadrantes","▦","Cuadrante de Turnos",page)}${navItem("especiales","★","Especiales",page)}${admin?navItem("empleados","♟","Gestión de Empleados",page):""}${navItem("novedades","✦","Novedades",page)}</nav>
      <div class="sidebar-bottom"><div class="sidebar-help">Solo el administrador puede modificar el cuadrante y gestionar empleados.</div><button class="side-link" onclick="showHelp()"><span class="side-icon">?</span><span>Ayuda</span></button><button class="side-link logout-side" onclick="choose()"><span class="side-icon">↪</span><span>Cerrar sesión</span></button><div class="sidebar-mark"><img src="${window.ATAQUE_LOGO||""}" alt=""></div><div class="sidebar-footer">ATAQUE EQUIPO</div></div>
    </aside>
    <main class="main-area">
      <header class="topbar"><div class="topbar-left"><button class="mobile-menu" onclick="toggleSidebar()">☰</button><div><span class="eyebrow">ATAQUE EQUIPO</span><h1>${titles[page]||"Portal"}</h1></div></div><div class="topbar-right"><div class="user-chip"><div class="avatar">${admin?"AD":ini(current?.nombre)}</div><div><b>${admin?"Administrador":esc(current?.nombre||"")}</b><span>${admin?"Control total":"Empleado"}</span></div></div><button class="icon-btn" title="Cerrar sesión" onclick="choose()">↪</button></div></header>
      <div class="page-content" id="content"></div>
    </main></div>`;
  const pages={inicio,cuadrantes,especiales,empleados:empleadosPage,novedades}; if(pages[page]) pages[page]();
}

async function inicio(){
  const [shifts,special,news]=await Promise.all([db.from("turnos_cuadrante").select("id"),db.from("especiales").select("id"),db.from("novedades").select("id")]);
  content.innerHTML=`<section class="hero-card"><div><span class="eyebrow">PORTAL OPERATIVO</span><h2>Hola, ${esc((admin?"Administrador":current?.nombre||"").split(" ")[0])} 👋</h2><p>Gestiona de forma clara y profesional los turnos del equipo.</p></div><img src="${window.ATAQUE_LOGO||""}" alt=""></section>
  <div class="stats-grid"><div class="stat-card"><span>Asignaciones de turno</span><b>${shifts.data?.length||0}</b><small>Registradas en el cuadrante</small></div><div class="stat-card"><span>Empleados</span><b>${employees.length}</b><small>Equipo activo</small></div><div class="stat-card"><span>Registros especiales</span><b>${special.data?.length||0}</b><small>Uno por empleado</small></div><div class="stat-card"><span>Novedades</span><b>${news.data?.length||0}</b><small>Comunicaciones del equipo</small></div></div>
  <div class="home-grid"><div class="panel"><div class="panel-head"><div><span class="eyebrow">ACCESO RÁPIDO</span><h3>Gestión diaria</h3></div></div><div class="quick-grid"><button onclick="render('cuadrantes')"><strong>▦ Cuadrante</strong><span>Consulta ${admin?"y edita":""} los turnos M / T.</span></button><button onclick="render('especiales')"><strong>★ Especiales</strong><span>Consulta los contadores C · V · CS · AP · B.</span></button><button onclick="render('novedades')"><strong>✦ Novedades</strong><span>Publica y consulta comunicaciones.</span></button>${admin?`<button onclick="render('empleados')"><strong>♟ Empleados</strong><span>Añade, edita o elimina personal.</span></button>`:""}</div></div><div class="panel notice-panel"><div class="panel-head"><div><span class="eyebrow">PERMISOS</span><h3>Control de acceso</h3></div></div><p><b>Cuadrante:</b> ${admin?"editable por ti como administrador.":"solo lectura para empleados."}</p><p><b>Novedades:</b> todos los empleados pueden crear, editar y eliminar.</p><p><b>Gestión de empleados:</b> disponible únicamente para el administrador.</p></div></div>`;
}

async function cuadrantes(){
  const year=calendarDate.getFullYear(), month=calendarDate.getMonth(), start=dateKey(year,month,1), end=dateKey(year,month,daysInMonth(year,month));
  const r=await db.from("turnos_cuadrante").select("id,fecha,empleado_id,turno,nota").gte("fecha",start).lte("fecha",end);
  if(r.error){content.innerHTML=`<div class="panel error-state"><h3>No se pudo cargar el cuadrante</h3><p>${esc(r.error.message)}</p></div>`;return;}
  const shifts=r.data||[], days=Array.from({length:daysInMonth(year,month)},(_,i)=>i+1), byKey=new Set(shifts.map(x=>`${x.fecha}|${x.empleado_id}|${x.turno}`));
  content.innerHTML=`<div class="calendar-toolbar"><div><span class="eyebrow">PLANIFICACIÓN MENSUAL</span><h3>Cuadrante de Turnos</h3><p class="muted">Marca <b>M</b> para mañana y <b>T</b> para tarde. ${admin?"Los cambios se guardan automáticamente.":"Modo consulta."}</p></div><div class="toolbar-actions"><button class="btn secondary" onclick="changeMonth(-1)">← Mes anterior</button><button class="month-badge">${esc(monthLabel(calendarDate))}</button><button class="btn secondary" onclick="changeMonth(1)">Mes siguiente →</button><button class="btn primary" onclick="window.print()">⇩ Exportar / Imprimir</button></div></div>
  <div class="calendar-legend"><span><i class="legend-swatch morning"></i>M · Mañana</span><span><i class="legend-swatch afternoon"></i>T · Tarde</span><span class="legend-note">${admin?"Solo administrador puede modificar.":"Las casillas son de solo lectura."}</span></div>
  <div class="calendar-wrap"><table class="shift-table"><thead><tr><th class="employee-col" rowspan="2">Empleado</th>${days.map(d=>{const dt=new Date(year,month,d),wd=new Intl.DateTimeFormat("es-ES",{weekday:"short"}).format(dt).replace(".","");return `<th colspan="2"><div class="day-head"><b>${wd.toUpperCase()}</b><span>${String(d).padStart(2,"0")} ${new Intl.DateTimeFormat("es-ES",{month:"short"}).format(dt).replace(".","")}</span></div></th>`}).join("")}</tr><tr>${days.map(()=>`<th class="subhead morning">M</th><th class="subhead afternoon">T</th>`).join("")}</tr></thead><tbody>${employees.map(e=>`<tr><th class="employee-name"><div class="employee-cell"><span class="avatar-small">${ini(e.nombre)}</span><div><strong>${esc(e.nombre)}</strong><small>${esc(e.telefono||"Sin teléfono")}</small></div></div></th>${days.map(d=>{const date=dateKey(year,month,d);return ["M","T"].map(t=>{const checked=byKey.has(`${date}|${e.id}|${t}`),cls=t==="M"?"morning":"afternoon";return `<td class="shift-cell ${cls} ${checked?"checked":""}"><label title="${checked?"Asignado":"Sin asignar"}"><input type="checkbox" ${checked?"checked":""} ${admin?"":"disabled"} onchange="toggleShift('${e.id}','${date}','${t}',this.checked)"><span>${checked?"✓":""}</span></label></td>`}).join("")}).join("")}</tr>`).join("")}</tbody></table></div><div class="table-footer"><span>${employees.length} empleados · ${days.length} días · ${days.length*2} casillas por empleado</span><span><b>M</b> Mañana · <b>T</b> Tarde</span></div>`;
}

async function toggleShift(employeeId,fecha,turno,checked){
  if(!admin)return;
  if(checked){const r=await db.from("turnos_cuadrante").upsert({empleado_id:employeeId,fecha,turno},{onConflict:"fecha,empleado_id,turno"});if(r.error){toast(r.error.message,"error");cuadrantes();return;}}
  else{const r=await db.from("turnos_cuadrante").delete().eq("empleado_id",employeeId).eq("fecha",fecha).eq("turno",turno);if(r.error){toast(r.error.message,"error");cuadrantes();return;}}
  const input=document.querySelector(`input[onchange*="${fecha}"][onchange*="${turno}"]`); if(input) input.closest(".shift-cell")?.classList.toggle("checked",checked); toast(checked?`Turno ${turno} asignado`:`Turno ${turno} quitado`);
}
function changeMonth(delta){ calendarDate=new Date(calendarDate.getFullYear(),calendarDate.getMonth()+delta,1); render("cuadrantes"); }

async function especiales(){
  const r=await db.from("especiales").select("id,empleado_id,c,v,cs,ap,b");
  if(r.error){content.innerHTML=`<div class="panel error-state"><h3>Error cargando Especiales</h3><p>${esc(r.error.message)}</p></div>`;return;}
  const map=new Map((r.data||[]).map(x=>[x.empleado_id,x]));
  content.innerHTML=`<div class="calendar-toolbar"><div><span class="eyebrow">CONTROL DE ACTIVIDADES</span><h3>Especiales</h3><p class="muted">Contador de veces registradas en <b>C · V · CS · AP · B</b>.</p></div>${admin?`<button class="btn secondary" onclick="resetSpecials()">↺ Restablecer contadores</button>`:""}</div><div class="panel specials-panel"><div class="specials-explain"><span class="special-pill">C</span> Comunicación <span class="special-pill">V</span> Vigilancia <span class="special-pill">CS</span> Cursos <span class="special-pill">AP</span> Apoyo <span class="special-pill">B</span> Baja</div><div class="table-scroll"><table class="specials-table"><thead><tr><th>Empleado</th><th>C</th><th>V</th><th>CS</th><th>AP</th><th>B</th><th>Total</th></tr></thead><tbody>${employees.map(e=>{const x=map.get(e.id)||{c:0,v:0,cs:0,ap:0,b:0},total=Number(x.c)+Number(x.v)+Number(x.cs)+Number(x.ap)+Number(x.b);return `<tr><th><div class="employee-cell"><span class="avatar-small">${ini(e.nombre)}</span><strong>${esc(e.nombre)}</strong></div></th>${specialCell(e.id,"c",x.c)}${specialCell(e.id,"v",x.v)}${specialCell(e.id,"cs",x.cs)}${specialCell(e.id,"ap",x.ap)}${specialCell(e.id,"b",x.b)}<td class="total-cell">${total}</td></tr>`}).join("")}</tbody></table></div></div>`;
}
function specialCell(id,field,value){ if(!admin)return `<td><span class="count readonly">${Number(value)||0}</span></td>`; return `<td><div class="counter"><button onclick="changeSpecial('${id}','${field}',-1)">−</button><span class="count">${Number(value)||0}</span><button onclick="changeSpecial('${id}','${field}',1)">+</button></div></td>`; }
async function changeSpecial(employeeId,field,delta){
  if(!admin)return; const allowed=["c","v","cs","ap","b"]; if(!allowed.includes(field))return;
  const q=await db.from("especiales").select(`id,${field}`).eq("empleado_id",employeeId).maybeSingle(); if(q.error){toast(q.error.message,"error");return;}
  if(!q.data){const insert={empleado_id:employeeId,c:0,v:0,cs:0,ap:0,b:0};insert[field]=Math.max(0,delta);const r=await db.from("especiales").insert(insert);if(r.error){toast(r.error.message,"error");return;}}
  else{const next=Math.max(0,Number(q.data[field]||0)+delta);const r=await db.from("especiales").update({[field]:next,updated_at:new Date().toISOString()}).eq("id",q.data.id);if(r.error){toast(r.error.message,"error");return;}}
  especiales();
}
async function resetSpecials(){ if(!admin||!confirm("¿Restablecer todos los contadores a 0?"))return;const r=await db.from("especiales").update({c:0,v:0,cs:0,ap:0,b:0,updated_at:new Date().toISOString()}).neq("id","00000000-0000-0000-0000-000000000000");if(r.error){toast(r.error.message,"error");return;}especiales();toast("Contadores restablecidos"); }

async function empleadosPage(){
  if(!admin){render("inicio");return;} await loadEmployees();
  content.innerHTML=`<div class="calendar-toolbar"><div><span class="eyebrow">CONTROL DE PERSONAL</span><h3>Gestión de Empleados</h3><p class="muted">Añade, edita o elimina empleados. Los cambios se reflejan en el portal.</p></div><button class="btn primary" onclick="employeeForm()">+ Añadir empleado</button></div><div class="panel"><div class="table-scroll"><table class="employee-table"><thead><tr><th>Empleado</th><th>Teléfono</th><th>Turnos / puesto</th><th>Acciones</th></tr></thead><tbody>${employees.map(e=>`<tr><td><div class="employee-cell"><span class="avatar-small">${ini(e.nombre)}</span><div><strong>${esc(e.nombre)}</strong><small>ID: ${esc(e.id.slice(0,8))}…</small></div></div></td><td>${esc(e.telefono||"—")}</td><td>${esc(e.turnos||"—")}</td><td><button class="table-action" onclick="employeeForm('${e.id}')">✎ Editar</button><button class="table-action danger" onclick="deleteEmployee('${e.id}')">🗑 Eliminar</button></td></tr>`).join("")}</tbody></table></div></div>`;
}
function employeeForm(id=""){ if(!admin)return;const e=employees.find(x=>x.id===id)||{nombre:"",telefono:"",turnos:""};openModal(`<div class="modal-head"><div><span class="eyebrow">GESTIÓN DE PERSONAL</span><h3>${id?"Editar empleado":"Nuevo empleado"}</h3></div><button class="icon-btn" onclick="closeModal()">×</button></div><label>Nombre<input id="empNombre" class="field" value="${esc(e.nombre)}" placeholder="Nombre y apellidos"></label><label>Teléfono<input id="empTelefono" class="field" value="${esc(e.telefono||"")}" placeholder="Teléfono"></label><label>Turnos / puesto<input id="empTurnos" class="field" value="${esc(e.turnos||"")}" placeholder="Ej. Técnico"></label><div class="modal-actions"><button class="btn secondary" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="saveEmployee('${id}')">Guardar</button></div>`); }
async function saveEmployee(id){ const nombre=document.getElementById("empNombre")?.value.trim(),telefono=document.getElementById("empTelefono")?.value.trim()||null,turnos=document.getElementById("empTurnos")?.value.trim()||null;if(!nombre){toast("El nombre es obligatorio","warn");return;}let r=id?await db.from("empleados").update({nombre,telefono,turnos}).eq("id",id):await db.from("empleados").insert({id:crypto.randomUUID(),nombre,telefono,turnos,rol:"empleado"});if(r.error){toast(r.error.message,"error");return;}closeModal();await loadEmployees();await ensureSpecialRows();empleadosPage();toast(id?"Empleado actualizado":"Empleado añadido"); }
async function deleteEmployee(id){ if(!admin)return;const e=employees.find(x=>x.id===id);if(!e||!confirm(`¿Eliminar a ${e.nombre}? Esta acción también eliminará sus turnos y especiales.`))return;const r=await db.from("empleados").delete().eq("id",id);if(r.error){toast(r.error.message,"error");return;}await loadEmployees();empleadosPage();toast("Empleado eliminado"); }
async function ensureSpecialRows(){ const {data}=await db.from("especiales").select("empleado_id");const set=new Set((data||[]).map(x=>x.empleado_id));const missing=employees.filter(e=>!set.has(e.id)).map(e=>({empleado_id:e.id,c:0,v:0,cs:0,ap:0,b:0}));if(missing.length)await db.from("especiales").insert(missing); }

async function novedades(){
  const r=await db.from("novedades").select("id,titulo,contenido,autor,created_at,updated_at").order("created_at",{ascending:false});
  if(r.error){content.innerHTML=`<div class="panel error-state"><h3>No se pudieron cargar las novedades</h3><p>${esc(r.error.message)}</p></div>`;return;}
  const news=r.data||[]; window.__newsCache=news;
  content.innerHTML=`<div class="calendar-toolbar"><div><span class="eyebrow">COMUNICACIÓN INTERNA</span><h3>Novedades</h3><p class="muted">Este apartado es editable por todos los empleados.</p></div><button class="btn primary" onclick="newsForm()">+ Añadir novedad</button></div><div class="news-list">${news.length?news.map(n=>`<article class="news-card"><div class="news-icon">✦</div><div class="news-body"><div class="news-top"><div><h4>${esc(n.titulo)}</h4><span>${esc(n.autor||"Equipo")} · ${n.created_at?new Date(n.created_at).toLocaleDateString("es-ES"):""}</span></div></div><p>${esc(n.contenido)}</p><div class="news-actions"><button class="table-action" onclick="newsForm('${n.id}')">✎ Editar</button><button class="table-action danger" onclick="deleteNews('${n.id}')">🗑 Eliminar</button></div></div></article>`).join(""):`<div class="empty-state"><div>✦</div><h3>No hay novedades todavía</h3><p>Añade la primera comunicación del equipo.</p></div>`}</div>`;
}
function newsForm(id=""){ const existing=window.__newsCache?.find(x=>x.id===id); if(id&&!existing){db.from("novedades").select("*").eq("id",id).single().then(r=>{if(!r.error){window.__newsCache=[r.data];newsForm(id);}});return;}const n=existing||{titulo:"",contenido:""};openModal(`<div class="modal-head"><div><span class="eyebrow">COMUNICACIÓN</span><h3>${id?"Editar novedad":"Nueva novedad"}</h3></div><button class="icon-btn" onclick="closeModal()">×</button></div><label>Título<input id="newsTitle" class="field" value="${esc(n.titulo)}" placeholder="Título"></label><label>Contenido<textarea id="newsBody" class="field textarea" rows="6" placeholder="Escribe la novedad...">${esc(n.contenido)}</textarea></label><div class="modal-actions"><button class="btn secondary" onclick="closeModal()">Cancelar</button><button class="btn primary" onclick="saveNews('${id}')">Guardar</button></div>`); }
async function saveNews(id){ const titulo=document.getElementById("newsTitle")?.value.trim(),contenido=document.getElementById("newsBody")?.value.trim();if(!titulo||!contenido){toast("Completa título y contenido","warn");return;}const autor=admin?"Administrador":current?.nombre||"Empleado";const r=id?await db.from("novedades").update({titulo,contenido,autor,updated_at:new Date().toISOString()}).eq("id",id):await db.from("novedades").insert({titulo,contenido,autor});if(r.error){toast(r.error.message,"error");return;}closeModal();window.__newsCache=null;novedades();toast("Novedad guardada"); }
async function deleteNews(id){ if(!confirm("¿Eliminar esta novedad?"))return;const r=await db.from("novedades").delete().eq("id",id);if(r.error){toast(r.error.message,"error");return;}novedades();toast("Novedad eliminada"); }

function showHelp(){ openModal(`<div class="modal-head"><div><span class="eyebrow">AYUDA</span><h3>Cómo utilizar el portal</h3></div><button class="icon-btn" onclick="closeModal()">×</button></div><div class="help-list"><p><b>Cuadrante:</b> cada día dispone de dos casillas, <b>M</b> (mañana) y <b>T</b> (tarde). Solo el administrador puede marcarlas.</p><p><b>Especiales:</b> muestra los contadores C, V, CS, AP y B. El administrador puede incrementarlos o reducirlos.</p><p><b>Novedades:</b> todos los empleados pueden crear, editar y eliminar comunicaciones.</p><p><b>Empleados:</b> el administrador puede incorporar o quitar personal desde Gestión de Empleados.</p></div>`); }
function openModal(body){ let modal=document.getElementById("modal");if(modal)modal.remove();document.body.insertAdjacentHTML("beforeend",`<div class="modal-backdrop" id="modal" onclick="if(event.target===this)closeModal()"><div class="modal-card">${body}</div></div>`); }
function closeModal(){ document.getElementById("modal")?.remove(); }

choose();
