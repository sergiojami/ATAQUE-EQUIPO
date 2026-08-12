/*
 * Interfaz nueva del portal.
 * Este archivo solo cambia la presentación; conserva la lógica y datos de app.js.
 */

(function () {
  const NAV = [
    ["inicio", "Inicio", "⌂"],
    ["cuadrantes", "Cuadrante", "▦"],
    ["novedades", "Novedades", "✦"],
    ["flota", "Flota", "✈"],
    ["perfil", "Mi perfil", "◯"]
  ];

  const escUI = value => String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");

  const initials = name => String(name || "AE")
    .trim()
    .split(/\s+/)
    .map(x => x[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "AE";

  function showError(error) {
    const screen = document.getElementById("screen");
    if (!screen) return;
    screen.innerHTML = `
      <div class="login-new">
        <div class="login-card-new error-state">
          <div class="logo-mark big">AE</div>
          <span class="eyebrow">ATAQUE-EQUIPO</span>
          <h2>No se ha podido cargar el portal</h2>
          <p>La aplicación ha encontrado un error al iniciar.</p>
          <small>${escUI(error?.message || error || "Error desconocido")}</small>
          <button class="primary-new" onclick="location.reload()">Volver a cargar</button>
        </div>
      </div>`;
  }

  async function loadEmployeesForUI() {
    try {
      if (Array.isArray(window.employees) && window.employees.length) {
        return window.employees;
      }

      if (typeof db === "undefined") {
        throw new Error("No se ha inicializado la conexión con Supabase.");
      }

      const result = await db
        .from("profiles")
        .select("id,full_name,phone,role")
        .order("full_name");

      if (result.error) throw result.error;

      employees = result.data || [];
      return employees;
    } catch (error) {
      showError(error);
      return null;
    }
  }

  async function showLogin() {
    try {
      const list = await loadEmployeesForUI();
      if (!list) return;

      const screen = document.getElementById("screen");
      if (!screen) return;

      screen.innerHTML = `
        <div class="login-new">
          <div class="login-brand">
            <div class="logo-mark big">AE</div>
            <span>PORTAL DEL EQUIPO</span>
            <h1>ATAQUE-EQUIPO</h1>
            <p>Acceso interno del equipo</p>
          </div>

          <div class="login-card-new">
            <div class="login-card-head">
              <span class="eyebrow">ACCESO</span>
              <h2>Bienvenido</h2>
              <p>Selecciona tu nombre para entrar al portal.</p>
            </div>

            <label for="employeeSelect">Empleado</label>
            <select id="employeeSelect" class="employee-select">
              <option value="">Seleccionar empleado...</option>
              ${list.map(e => `
                <option value="${escUI(e.id)}">${escUI(e.full_name || "Empleado")}</option>
              `).join("")}
            </select>

            <button class="primary-new" onclick="window.portalEnter()">Entrar al portal</button>

            <div class="login-divider"><span>o</span></div>

            <button class="secondary-new" onclick="typeof pin === 'function' ? pin() : alert('Administración no disponible')">
              ⚙ Administración
            </button>
          </div>
        </div>`;
    } catch (error) {
      showError(error);
    }
  }

  window.portalEnter = function () {
    const select = document.getElementById("employeeSelect");
    const id = select?.value;
    if (!id) {
      alert("Selecciona tu nombre para continuar.");
      return;
    }

    current = employees.find(e => String(e.id) === String(id)) || null;
    admin = !!current && ["admin", "administrador"].includes(
      String(current.role || "").toLowerCase()
    );

    renderPortal("inicio");
  };

  function titleFor(page) {
    return {
      inicio: "Inicio",
      cuadrantes: "Cuadrante",
      novedades: "Novedades",
      flota: "Flota",
      perfil: "Mi perfil",
      admin: "Administración"
    }[page] || "ATAQUE-EQUIPO";
  }

  window.portalToggleMenu = function () {
    document.getElementById("sidebar")?.classList.toggle("open");
  };

  window.portalChangeUser = function () {
    showLogin();
  };

  async function renderPortal(page) {
    try {
      const screen = document.getElementById("screen");
      if (!screen) return;

      const userName = admin ? "Administrador" : (current?.full_name || "Usuario");
      const userRole = admin ? "Control general" : "Miembro del equipo";

      screen.innerHTML = `
        <div class="app-shell-new">
          <aside class="sidebar-new" id="sidebar">
            <div class="sidebar-brand">
              <div class="logo-mark small">AE</div>
              <div>
                <strong>ATAQUE-EQUIPO</strong>
                <span>Portal del equipo</span>
              </div>
            </div>

            <div class="sidebar-label">NAVEGACIÓN</div>
            <nav class="side-nav">
              ${NAV.map(([id, label, icon]) => `
                <button class="side-link ${page === id ? "active" : ""}" onclick="window.portalRender('${id}')">
                  <span class="side-icon">${icon}</span><span>${label}</span>
                </button>
              `).join("")}
              ${admin ? `
                <button class="side-link ${page === "admin" ? "active" : ""}" onclick="window.portalRender('admin')">
                  <span class="side-icon">⚙</span><span>Administración</span>
                </button>` : ""}
            </nav>

            <div class="sidebar-bottom">
              <div class="user-mini-new">
                <div class="avatar-new">${initials(userName)}</div>
                <div><strong>${escUI(userName)}</strong><span>${escUI(userRole)}</span></div>
              </div>
              <button class="change-user" onclick="window.portalChangeUser()">Cambiar usuario</button>
            </div>
          </aside>

          <main class="main-new">
            <header class="topbar-new">
              <div class="topbar-left">
                <button class="menu-btn-new" onclick="window.portalToggleMenu()">☰</button>
                <div><div class="eyebrow">ATAQUE-EQUIPO</div><h1>${titleFor(page)}</h1></div>
              </div>
              <div class="topbar-user">
                <div class="avatar-new">${initials(userName)}</div>
                <div class="topbar-user-text"><strong>${escUI(userName)}</strong><span>${escUI(userRole)}</span></div>
                <button class="logout-new" onclick="window.portalChangeUser()">Salir</button>
              </div>
            </header>
            <section class="content-new" id="content"><div class="loading-new">Cargando...</div></section>
          </main>
        </div>`;

      const pages = { inicio, cuadrantes, flota, novedades, perfil, admin: adminPage };
      if (pages[page]) await pages[page]();
    } catch (error) {
      showError(error);
    }
  }

  window.portalRender = renderPortal;

  // Exponemos la entrada compatible con el resto de la aplicación.
  window.choose = showLogin;

  // Esperamos a que app.js haya terminado de definir toda su lógica.
  window.addEventListener("load", function () {
    setTimeout(showLogin, 0);
  });

  // Si algún error global deja la pantalla vacía, mostramos el motivo en vez de una página en blanco.
  window.addEventListener("error", function (event) {
    if (!document.getElementById("screen")?.innerHTML?.trim()) {
      showError(event.error || event.message || "Error de JavaScript");
    }
  });
})();
