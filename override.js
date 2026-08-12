/* Interfaz profesional ATAQUE-EQUIPO + cuadrante mensual */
(function () {
  const FALLBACK = [
    "De Benito", "Angulo", "Pajarillo", "Sergio", "Raul", "Roldán",
    "Paloma", "Rubén", "De Porras", "Salvatierra", "Castillo", "Campos"
  ].map((name, i) => ({ id: `local-${i + 1}`, full_name: name, phone: "", role: "Empleado", local: true }));

  const escUI = value => String(value ?? "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;").replace(/'/g, "&#039;");
  const initials = name => String(name || "AE").trim().split(/\s+/).map(x => x[0]).slice(0, 2).join("").toUpperCase() || "AE";
  const dateKey = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  const storageKey = "ataque_equipo_roster";
  let localRoster = JSON.parse(localStorage.getItem(storageKey) || "{}");

  async function getEmployees() {
    try {
      const r = await db.from("profiles").select("id,full_name,phone,role").order("full_name");
      if (!r.error && r.data?.length) {
        employees = r.data;
      } else if (!employees?.length || employees.length < 12) {
        employees = FALLBACK;
      }
    } catch (_) {
      employees = FALLBACK;
    }
    return employees;
  }

  function showError(error) {
    const screen = document.getElementById("screen");
    if (!screen) return;
    screen.innerHTML = `<div class="login-new"><div class="login-card-new error-state"><div class="logo-mark big">AE</div><span class="eyebrow">ATAQUE-EQUIPO</span><h2>No se ha podido cargar el portal</h2><p>La aplicación ha encontrado un error al iniciar.</p><small>${escUI(error?.message || error || "Error desconocido")}</small><button class="primary-new" onclick="location.reload()">Volver a cargar</button></div></div>`;
  }

  async function showLogin() {
    try {
      const list = await getEmployees();
      const screen = document.getElementById("screen");
      if (!screen) return;
      screen.innerHTML = `<div class="login-new"><div class="login-brand"><div class="logo-mark big">AE</div><span>PORTAL DEL EQUIPO</span><h1>ATAQUE-EQUIPO</h1><p>Acceso interno del equipo</p></div><div class="login-card-new"><div class="login-card-head"><span class="eyebrow">ACCESO</span><h2>Bienvenido</h2><p>Selecciona tu nombre para entrar al portal.</p></div><label for="employeeSelect">Empleado</label><select id="employeeSelect" class="employee-select"><option value="">Seleccionar empleado...</option>${list.map(e => `<option value="${escUI(e.id)}">${escUI(e.full_name || "Empleado")}</option>`).join("")}</select><button class="primary-new" onclick="window.portalEnter()">Entrar al portal</button><div class="login-divider"><span>o</span></div><button class="secondary-new" onclick="typeof pin==='function'?pin():alert('Administración no disponible')">⚙ Administración</button></div></div>`;
    } catch (error) { showError(error); }
  }

  window.portalEnter = function () {
    const id = document.getElementById("employeeSelect")?.value;
    if (!id) return alert("Selecciona tu nombre para continuar.");
    current = employees.find(e => String(e.id) === String(id)) || null;
    admin = false;
    window.portalRender("inicio");
  };

  window.portalToggleMenu = function () { document.getElementById("sidebar")?.classList.toggle("open"); };
  window.portalChangeUser = function () { showLogin(); };

  async function renderShell(page) {
    const titles = { inicio: "Inicio", cuadrantes: "Cuadrante", novedades: "Novedades", flota: "Flota", perfil: "Mi perfil", admin: "Administración" };
    const userName = admin ? "Administrador" : (current?.full_name || "Usuario");
    const userRole = admin ? "Control general" : "Miembro del equipo";
    const nav = [["inicio", "Inicio", "⌂"], ["cuadrantes", "Cuadrante", "▦"], ["novedades", "Novedades", "✦"], ["flota", "Flota", "✈"], ["perfil", "Mi perfil", "◯"]];
    document.getElementById("screen").innerHTML = `<div class="app-shell-new"><aside class="sidebar-new" id="sidebar"><div class="sidebar-brand"><div class="logo-mark small">AE</div><div><strong>ATAQUE-EQUIPO</strong><span>Portal del equipo</span></div></div><div class="sidebar-label">NAVEGACIÓN</div><nav class="side-nav">${nav.map(([id,label,icon]) => `<button class="side-link ${page===id?"active":""}" onclick="window.portalRender('${id}')"><span class="side-icon">${icon}</span><span>${label}</span></button>`).join("")}${admin?`<button class="side-link ${page==='admin'?"active":""}" onclick="window.portalRender('admin')"><span class="side-icon">⚙</span><span>Administración</span></button>`:""}</nav><div class="sidebar-bottom"><div class="user-mini-new"><div class="avatar-new">${initials(userName)}</div><div><strong>${escUI(userName)}</strong><span>${escUI(userRole)}</span></div></div><button class="change-user" onclick="window.portalChangeUser()">Cambiar usuario</button></div></aside><main class="main-new"><header class="topbar-new"><div class="topbar-left"><button class="menu-btn-new" onclick="window.portalToggleMenu()">☰</button><div><div class="eyebrow">ATAQUE-EQUIPO</div><h1>${titles[page]||"ATAQUE-EQUIPO"}</h1></div></div><div class="topbar-user"><div class="avatar-new">${initials(userName)}</div><div class="topbar-user-text"><strong>${escUI(userName)}</strong><span>${escUI(userRole)}</span></div><button class="logout-new" onclick="window.portalChangeUser()">Salir</button></div></header><section class="content-new" id="content"><div class="loading-new">Cargando...</div></section></main></div>`;
  }

  async function loadCalendarData(days) {
    const start = dateKey(days[0]);
    const end = dateKey(days[days.length - 1]);
    try {
      const r = await db.from("shifts").select("*").gte("date", start).lte("date", end).order("date");
      if (!r.error) {
        (r.data || []).forEach(x => {
          const service = String(x.service || "").toLowerCase();
          const shift = service.includes("tarde") || String(x.start_time || "") >= "12:00" ? "tarde" : "mañana";
          localRoster[`${x.employee_id}|${x.date}|${shift}`] = true;
        });
      }
    } catch (_) {}
    localStorage.setItem(storageKey, JSON.stringify(localRoster));
  }

  function daysOfMonth(date) {
    const y = date.getFullYear(), m = date.getMonth(), last = new Date(y, m + 1, 0).getDate();
    return Array.from({ length: last }, (_, i) => new Date(y, m, i + 1));
  }

  async function renderCalendar() {
    await getEmployees();
    const days = daysOfMonth(calendarDate);
    await loadCalendarData(days);
    const months = Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat("es-ES", { month: "long" }).format(new Date(2020, i, 1)));
    const years = [calendarDate.getFullYear() - 1, calendarDate.getFullYear(), calendarDate.getFullYear() + 1];
    const monthName = new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(calendarDate);
    const weekday = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
    const key = (id,d,s) => `${id}|${d}|${s}`;
    const headers = days.map(d => `<th colspan="2"><div class="calendar-day-head"><b>${weekday[(d.getDay()+6)%7]}</b><span>${String(d.getDate()).padStart(2,"0")} ${new Intl.DateTimeFormat("es-ES",{month:"short"}).format(d).replace(".","")}</span></div></th>`).join("");
    const rows = employees.map(e => `<tr><th class="employee-name"><div class="employee-cell"><div class="avatar-small">${initials(e.full_name)}</div><div><strong>${escUI(e.full_name)}</strong><small>${escUI(e.role||"Empleado")}</small></div></div></th>${days.map(d => { const ds=dateKey(d); return `<td class="shift-cell morning"><label title="${escUI(e.full_name)} · ${ds} · Mañana"><input type="checkbox" ${localRoster[key(e.id,ds,"mañana")]?"checked":""} onchange="window.setRoster('${escUI(e.id)}','${ds}','mañana',this.checked)"><span></span></label></td><td class="shift-cell afternoon"><label title="${escUI(e.full_name)} · ${ds} · Tarde"><input type="checkbox" ${localRoster[key(e.id,ds,"tarde")]?"checked":""} onchange="window.setRoster('${escUI(e.id)}','${ds}','tarde',this.checked)"><span></span></label></td>`; }).join("")}</tr>`).join("");

    content.innerHTML = `<div class="calendar-page"><div class="calendar-toolbar"><div><span class="eyebrow">PLANIFICACIÓN</span><h3>Cuadrante de turnos</h3><p class="muted">Vista mensual profesional · asigna Mañana o Tarde a cada empleado cada día.</p></div><div class="calendar-controls"><button class="btn" onclick="window.prevCalendarMonth()">←</button><select onchange="window.changeCalendarMonth(this.value)">${months.map((m,i)=>`<option value="${i}" ${i===calendarDate.getMonth()?"selected":""}>${m.charAt(0).toUpperCase()+m.slice(1)}</option>`).join("")}</select><select onchange="window.changeCalendarYear(this.value)">${years.map(y=>`<option value="${y}" ${y===calendarDate.getFullYear()?"selected":""}>${y}</option>`).join("")}</select><button class="btn" onclick="window.nextCalendarMonth()">→</button></div></div><div class="calendar-summary"><div><b>${employees.length}</b><span> empleados</span></div><div><b>${days.length}</b><span> días</span></div><div class="legend-item"><i class="legend-dot morning-dot"></i>Mañana</div><div class="legend-item"><i class="legend-dot afternoon-dot"></i>Tarde</div><div class="calendar-actions"><button class="btn secondary" onclick="window.clearCalendarMonth()">Limpiar cuadrante</button><button class="btn" onclick="window.saveCalendar()">✓ Guardar cuadrante</button></div></div><div class="calendar-table-wrap"><table class="shift-calendar"><thead><tr><th class="employee-head" rowspan="2">Empleado</th>${headers}</tr><tr>${days.map(()=>`<th class="subhead morning-head">Mañana</th><th class="subhead afternoon-head">Tarde</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div><div class="calendar-footer"><span>Mes seleccionado: <strong>${escUI(monthName)}</strong></span><span>Los cambios se conservan y, cuando Supabase lo permite, también se sincronizan con los turnos.</span></div></div>`;
  }

  window.setRoster = async function (employeeId,date,shift,checked) {
    const k=`${employeeId}|${date}|${shift}`;
    if (checked) localRoster[k]=true; else delete localRoster[k];
    localStorage.setItem(storageKey, JSON.stringify(localRoster));
    const employee=employees.find(e=>String(e.id)===String(employeeId));
    if (!employee || employee.local) return;
    try {
      if (checked) {
        const start=shift==="mañana"?"08:00":"16:00";
        const end=shift==="mañana"?"16:00":"23:00";
        const r=await db.from("shifts").insert({date,employee_id:employeeId,start_time:start,end_time:end,service:shift==="mañana"?"Turno de mañana":"Turno de tarde",notes:""});
        if (r.error) console.warn(r.error.message);
      } else {
        await db.from("shifts").delete().eq("date",date).eq("employee_id",employeeId);
      }
    } catch (_) {}
  };
  window.prevCalendarMonth=function(){calendarDate.setMonth(calendarDate.getMonth()-1);window.portalRender("cuadrantes");};
  window.nextCalendarMonth=function(){calendarDate.setMonth(calendarDate.getMonth()+1);window.portalRender("cuadrantes");};
  window.changeCalendarMonth=function(v){calendarDate.setMonth(Number(v));window.portalRender("cuadrantes");};
  window.changeCalendarYear=function(v){calendarDate.setFullYear(Number(v));window.portalRender("cuadrantes");};
  window.saveCalendar=function(){localStorage.setItem(storageKey,JSON.stringify(localRoster));alert("Cuadrante guardado correctamente.");};
  window.clearCalendarMonth=function(){if(!confirm("¿Quieres limpiar todos los turnos del mes?"))return;daysOfMonth(calendarDate).forEach(d=>employees.forEach(e=>["mañana","tarde"].forEach(s=>delete localRoster[`${e.id}|${dateKey(d)}|${s}`])));localStorage.setItem(storageKey,JSON.stringify(localRoster));window.portalRender("cuadrantes");};

  window.portalRender = async function(page){
    try {
      await renderShell(page);
      if(page === "cuadrantes") return renderCalendar();
      const pages = { inicio, flota, novedades, perfil, admin: adminPage };
      if(pages[page]) await pages[page]();
    } catch (error) { showError(error); }
  };

  window.choose = showLogin;
  window.addEventListener("load", () => setTimeout(showLogin, 0));
  window.addEventListener("error", event => { if(!document.getElementById("screen")?.innerHTML?.trim()) showError(event.error || event.message || "Error de JavaScript"); });
})();
