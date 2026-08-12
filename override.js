/*
 * Nuevo diseño de la aplicación.
 * Mantiene la lógica de datos de app.js y cambia únicamente la interfaz.
 */

const UI_NAV = [
  ["inicio", "Inicio"],
  ["cuadrantes", "Cuadrante"],
  ["novedades", "Novedades"],
  ["flota", "Flota"],
  ["perfil", "Mi perfil"]
];

function uiEsc(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function uiInitials(name) {
  return String(name || "")
    .trim()
    .split(/\s+/)
    .map(x => x[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "AE";
}

async function uiLoadEmployees() {
  const result = await db
    .from("profiles")
    .select("id,full_name,phone,role")
    .order("full_name");

  if (result.error) {
    const screen = document.getElementById("screen");
    screen.innerHTML = `
      <div class="login-new">
        <div class="login-card-new error-state">
          <div class="logo-mark big">AE</div>
          <h1>ATAQUE-EQUIPO</h1>
          <p>No se pudieron cargar los empleados.</p>
          <small>${uiEsc(result.error.message)}</small>
        </div>
      </div>`;
    return false;
  }

  employees = result.data || [];
  return true;
}

function choose() {
  uiChoose();
}

async function uiChoose() {
  if (!employees.length && !(await uiLoadEmployees())) return;

  const screen = document.getElementById("screen");
  screen.innerHTML = `
    <div class="login-new">
      <div class="login-brand">
        <div class="logo-mark hero-logo">AE</div>
        <span>PORTAL DEL EQUIPO</span>
        <h1>ATAQUE-EQUIPO</h1>
        <p>Acceso interno del equipo</p>
      </div>

      <div class="login-card-new">
        <div class="login-card-head">
          <span class="eyebrow">ACCESO</span>
          <h2>Selecciona tu nombre</h2>
          <p>Elige tu usuario para entrar al portal.</p>
        </div>

        <label for="employeeSelect">Empleado</label>
        <select id="employeeSelect" class="employee-select">
          <option value="">Seleccionar empleado...</option>
          ${employees.map(e => `
            <option value="${uiEsc(e.id)}">
              ${uiEsc(e.full_name || "Empleado")}
            </option>
          `).join("")}
        </select>

        <button class="primary-new" onclick="enterApp()">
          Entrar al portal
        </button>

        <div class="login-divider"><span>o</span></div>

        <button class="secondary-new" onclick="pin()">
          ⚙ Administración
        </button>
      </div>
    </div>`;
}

function enterApp() {
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

  render("inicio");
}

async function enter(id) {
  current = employees.find(e => String(e.id) === String(id)) || null;
  admin = false;
  render("inicio");
}

function uiPageTitle(page) {
  return {
    inicio: "Inicio",
    cuadrantes: "Cuadrante",
    novedades: "Novedades",
    flota: "Flota",
    perfil: "Mi perfil",
    admin: "Administración"
  }[page] || "ATAQUE-EQUIPO";
}

function toggleMenu() {
  document.getElementById("sidebar")?.classList.toggle("open");
}

async function render(page) {
  const screen = document.getElementById("screen");
  const title = uiPageTitle(page);
  const userName = admin ? "Administrador" : (current?.full_name || "Usuario");
  const userRole = admin ? "Control general" : "Miembro del equipo";

  const navigation = UI_NAV.map(([id, label]) => `
    <button class="side-link ${page === id ? "active" : ""}" onclick="render('${id}')">
      <span class="side-icon">${
        id === "inicio" ? "⌂" :
        id === "cuadrantes" ? "▦" :
        id === "novedades" ? "✦" :
        id === "flota" ? "✈" : "◯"
      }</span>
      <span>${label}</span>
    </button>
  `).join("");

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
          ${navigation}
          ${admin ? `
            <button class="side-link ${page === "admin" ? "active" : ""}" onclick="render('admin')">
              <span class="side-icon">⚙</span>
              <span>Administración</span>
            </button>` : ""}
        </nav>

        <div class="sidebar-bottom">
          <div class="user-mini-new">
            <div class="avatar-new">${uiInitials(userName)}</div>
            <div>
              <strong>${uiEsc(userName)}</strong>
              <span>${uiEsc(userRole)}</span>
            </div>
          </div>
          <button class="change-user" onclick="choose()">Cambiar usuario</button>
        </div>
      </aside>

      <main class="main-new">
        <header class="topbar-new">
          <div class="topbar-left">
            <button class="menu-btn-new" onclick="toggleMenu()">☰</button>
            <div>
              <div class="eyebrow">ATAQUE-EQUIPO</div>
              <h1>${title}</h1>
            </div>
          </div>

          <div class="topbar-user">
            <div class="avatar-new">${uiInitials(userName)}</div>
            <div class="topbar-user-text">
              <strong>${uiEsc(userName)}</strong>
              <span>${uiEsc(userRole)}</span>
            </div>
            <button class="logout-new" onclick="choose()">Salir</button>
          </div>
        </header>

        <section class="content-new" id="content">
          <div class="loading-new">Cargando...</div>
        </section>
      </main>
    </div>`;

  const pages = {
    inicio,
    cuadrantes,
    flota,
    novedades,
    perfil,
    admin: adminPage
  };

  if (pages[page]) {
    await pages[page]();
  }
}

/* Sustituye la primera pantalla generada por app.js por el nuevo diseño. */
uiChoose();
