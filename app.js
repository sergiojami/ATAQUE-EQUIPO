const db = supabase.createClient(
  AVIONICA_SUPABASE_URL,
  AVIONICA_SUPABASE_KEY
);

let employees = [];
let currentUser = null;
let currentPage = "inicio";
let isAdmin = false;

const app = document.getElementById("screen");

const esc = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

async function loadEmployees() {
  const { data, error } = await db
    .from("profiles")
    .select("*")
    .order("full_name");

  if (error) {
    console.error(error);
    app.innerHTML = `
      <div class="error">
        No se pudieron cargar los empleados.
        <br><small>${esc(error.message)}</small>
      </div>
    `;
    return;
  }

  employees = data || [];

  if (!employees.length) {
    app.innerHTML = `
      <div class="login">
        <div class="logo-mark">AE</div>
        <h1>ATAQUE-EQUIPO</h1>
        <p>No hay empleados registrados todavía.</p>
      </div>
    `;
    return;
  }

  chooseEmployee();
}

function chooseEmployee() {
  app.innerHTML = `
    <div class="login">
      <div class="logo-mark">AE</div>

      <h1>ATAQUE-EQUIPO</h1>
      <p class="muted">Portal del equipo</p>

      <div class="login-card">
        <h2>Acceso</h2>

        <label>Selecciona tu nombre</label>

        <select id="employeeSelect">
          <option value="">Seleccionar empleado...</option>
          ${employees
            .map(
              (e) => `
                <option value="${esc(e.id)}">
                  ${esc(e.full_name || e.name || "Empleado")}
                </option>
              `
            )
            .join("")}
        </select>

        <button class="primary" onclick="enterApp()">
          Entrar
        </button>
      </div>
    </div>
  `;
}

async function enterApp() {
  const select = document.getElementById("employeeSelect");
  const id = select.value;

  if (!id) {
    alert("Selecciona tu nombre.");
    return;
  }

  currentUser = employees.find((e) => String(e.id) === String(id));

  isAdmin =
    currentUser &&
    ["admin", "administrador"].includes(
      String(currentUser.role || "").toLowerCase()
    );

  render("inicio");
}

function render(page) {
  currentPage = page;

  const nav = [
    ["inicio", "Inicio"],
    ["cuadrante", "Cuadrante"],
    ["novedades", "Novedades"],
    ["flota", "Flota"],
    ["empleados", "Empleados"]
  ];

  app.innerHTML = `
    <div class="app-shell">

      <aside class="sidebar" id="sidebar">

        <div class="brand">
          <div class="logo-mark small">AE</div>
          <div>
            <strong>ATAQUE-EQUIPO</strong>
            <small>Portal del equipo</small>
          </div>
        </div>

        <nav>
          ${nav
            .map(
              ([id, label]) => `
                <button
                  class="${currentPage === id ? "active" : ""}"
                  onclick="render('${id}')">
                  ${label}
                </button>
              `
            )
            .join("")}
        </nav>

        <div class="sidebar-bottom">
          <div class="user-mini">
            <strong>${esc(
              currentUser?.full_name || currentUser?.name || ""
            )}</strong>
            <span>${isAdmin ? "Administrador" : "Empleado"}</span>
          </div>

          <button class="logout" onclick="chooseEmployee()">
            Cambiar usuario
          </button>
        </div>
      </aside>

      <main class="main">

        <header class="topbar">
          <button class="menu-btn" onclick="toggleMenu()">☰</button>

          <div>
            <h1>${getPageTitle()}</h1>
            <p>
              ${esc(
                currentUser?.full_name ||
                  currentUser?.name ||
                  "ATAQUE-EQUIPO"
              )}
            </p>
          </div>
        </header>

        <section class="content" id="content">
          <div class="loading">Cargando...</div>
        </section>

      </main>
    </div>
  `;

  loadPage();
}

function getPageTitle() {
  const titles = {
    inicio: "Inicio",
    cuadrante: "Cuadrante",
    novedades: "Novedades",
    flota: "Flota",
    empleados: "Empleados"
  };

  return titles[currentPage] || "ATAQUE-EQUIPO";
}

function toggleMenu() {
  document.getElementById("sidebar")?.classList.toggle("open");
}

async function loadPage() {
  if (currentPage === "inicio") return homePage();
  if (currentPage === "cuadrante") return shiftsPage();
  if (currentPage === "novedades") return newsPage();
  if (currentPage === "flota") return fleetPage();
  if (currentPage === "empleados") return employeesPage();
}

/* =========================
   INICIO
========================= */

async function homePage() {
  const content = document.getElementById("content");

  const today = new Date().toISOString().slice(0, 10);

  const { data: todayShifts } = await db
    .from("shifts")
    .select("*")
    .eq("shift_date", today);

  const { data: news } = await db
    .from("news")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(3);

  content.innerHTML = `
    <div class="welcome">
      <div>
        <span class="eyebrow">PORTAL DEL EQUIPO</span>
        <h2>Bienvenido, ${esc(
          currentUser?.full_name || currentUser?.name
        )}</h2>
        <p>
          Consulta el cuadrante, las novedades y el estado de la flota.
        </p>
      </div>
    </div>

    <div class="stats">

      <div class="stat-card">
        <span>Empleados</span>
        <strong>${employees.length}</strong>
      </div>

      <div class="stat-card">
        <span>Turnos hoy</span>
        <strong>${todayShifts?.length || 0}</strong>
      </div>

      <div class="stat-card">
        <span>Novedades</span>
        <strong>${news?.length || 0}</strong>
      </div>

    </div>

    <div class="section-head">
      <div>
        <h2>Últimas novedades</h2>
      </div>

      <button class="secondary" onclick="render('novedades')">
        Ver todas
      </button>
    </div>

    <div class="cards">
      ${
        news?.length
          ? news.map(newsCard).join("")
          : `<div class="empty">No hay novedades todavía.</div>`
      }
    </div>
  `;
}

/* =========================
   CUADRANTE
========================= */

async function shiftsPage() {
  const content = document.getElementById("content");

  const { data, error } = await db
    .from("shifts")
    .select("*")
    .order("shift_date", { ascending: true });

  if (error) {
    content.innerHTML = errorBox(error);
    return;
  }

  const grouped = {};

  (data || []).forEach((shift) => {
    const date = shift.shift_date;

    if (!grouped[date]) {
      grouped[date] = {
        morning: "",
        afternoon: "",
        note: ""
      };
    }

    if (
      String(shift.shift || "").toLowerCase().includes("mañ") ||
      String(shift.shift || "").toLowerCase().includes("man")
    ) {
      grouped[date].morning = shift;
    } else {
      grouped[date].afternoon = shift;
    }

    if (shift.note) grouped[date].note = shift.note;
  });

  content.innerHTML = `
    <div class="section-head">
      <div>
        <span class="eyebrow">PLANIFICACIÓN</span>
        <h2>Cuadrante</h2>
        <p>Calendario de turnos del equipo.</p>
      </div>

      ${
        isAdmin
          ? `<button class="primary" onclick="newShift()">
              + Añadir turno
             </button>`
          : ""
      }
    </div>

    <div class="calendar">

      ${Object.keys(grouped).length
        ? Object.entries(grouped)
            .map(([date, item]) => calendarDay(date, item))
            .join("")
        : `<div class="empty">No hay turnos registrados.</div>`}

    </div>
  `;
}

function calendarDay(date, item) {
  const formatted = new Date(date + "T12:00:00").toLocaleDateString(
    "es-ES",
    {
      weekday: "long",
      day: "numeric",
      month: "long"
    }
  );

  return `
    <article class="calendar-day">

      <div class="calendar-date">
        <strong>${esc(formatted)}</strong>
      </div>

      <div class="shift-grid">

        <div class="shift morning">
          <span>MAÑANA</span>
          <strong>${esc(item.morning?.employee_name || "—")}</strong>
          <small>${esc(item.morning?.note || "")}</small>

          ${
            isAdmin && item.morning
              ? `<button onclick="editShift('${item.morning.id}')">
                  Editar
                 </button>`
              : ""
          }
        </div>

        <div class="shift afternoon">
          <span>TARDE</span>
          <strong>${esc(item.afternoon?.employee_name || "—")}</strong>
          <small>${esc(item.afternoon?.note || "")}</small>

          ${
            isAdmin && item.afternoon
              ? `<button onclick="editShift('${item.afternoon.id}')">
                  Editar
                 </button>`
              : ""
          }
        </div>

      </div>

      ${
        item.note
          ? `<div class="calendar-note">
              <strong>Nota:</strong> ${esc(item.note)}
             </div>`
          : ""
      }

    </article>
  `;
}

async function newShift() {
  const date = prompt("Fecha (AAAA-MM-DD):");
  if (!date) return;

  const employee = prompt("Nombre del empleado:");
  if (!employee) return;

  const shift = prompt("Turno: mañana o tarde");
  if (!shift) return;

  const note = prompt("Nota (opcional):") || "";

  const { error } = await db.from("shifts").insert({
    shift_date: date,
    employee_name: employee,
    shift: shift,
    note: note
  });

  if (error) {
    alert(error.message);
    return;
  }

  shiftsPage();
}

async function editShift(id) {
  const { data, error } = await db
    .from("shifts")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    alert(error.message);
    return;
  }

  const employee =
    prompt("Empleado:", data.employee_name || "") ??
    data.employee_name;

  const note =
    prompt("Nota:", data.note || "") ??
    data.note;

  const { error: updateError } = await db
    .from("shifts")
    .update({
      employee_name: employee,
      note: note
    })
    .eq("id", id);

  if (updateError) {
    alert(updateError.message);
    return;
  }

  shiftsPage();
}

/* =========================
   NOVEDADES
========================= */

async function newsPage() {
  const content = document.getElementById("content");

  const { data, error } = await db
    .from("news")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    content.innerHTML = errorBox(error);
    return;
  }

  content.innerHTML = `
    <div class="section-head">
      <div>
        <span class="eyebrow">COMUNICACIÓN</span>
        <h2>Novedades</h2>
        <p>Información compartida por todo el equipo.</p>
      </div>

      <button class="primary" onclick="newNews()">
        + Nueva novedad
      </button>
    </div>

    <div class="news-list">

      ${
        data?.length
          ? data.map(newsCardFull).join("")
          : `<div class="empty">
              Todavía no hay novedades.
             </div>`
      }

    </div>
  `;
}

function newsCard(item) {
  return `
    <article class="news-card">
      <span class="date">
        ${formatDate(item.created_at)}
      </span>

      <h3>${esc(item.title)}</h3>

      <p>${esc(item.body)}</p>
    </article>
  `;
}

function newsCardFull(item) {
  return `
    <article class="news-card full">

      <div class="news-top">
        <span class="date">
          ${formatDate(item.created_at)}
        </span>

        <div>
          <button
            class="icon-btn"
            onclick="editNews('${item.id}')">
            Editar
          </button>

          <button
            class="danger-btn"
            onclick="deleteNews('${item.id}')">
            Eliminar
          </button>
        </div>
      </div>

      <h3>${esc(item.title)}</h3>

      <p>${esc(item.body)}</p>

    </article>
  `;
}

async function newNews() {
  const title = prompt("Título de la novedad:");
  if (!title) return;

  const body = prompt("Texto de la novedad:");
  if (!body) return;

  const { error } = await db.from("news").insert({
    title,
    body
  });

  if (error) {
    alert(error.message);
    return;
  }

  newsPage();
}

async function editNews(id) {
  const { data, error } = await db
    .from("news")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    alert(error.message);
    return;
  }

  const title =
    prompt("Título:", data.title) ??
    data.title;

  const body =
    prompt("Texto:", data.body) ??
    data.body;

  const { error: updateError } = await db
    .from("news")
    .update({
      title,
      body
    })
    .eq("id", id);

  if (updateError) {
    alert(updateError.message);
    return;
  }

  newsPage();
}

async function deleteNews(id) {
  if (!confirm("¿Eliminar esta novedad?")) return;

  const { error } = await db
    .from("news")
    .delete()
    .eq("id", id);

  if (error) {
    alert(error.message);
    return;
  }

  newsPage();
}

/* =========================
   FLOTA
========================= */

async function fleetPage() {
  const content = document.getElementById("content");

  const { data, error } = await db
    .from("fleet")
    .select("*")
    .order("aircraft");

  if (error) {
    content.innerHTML = errorBox(error);
    return;
  }

  content.innerHTML = `
    <div class="section-head">
      <div>
        <span class="eyebrow">OPERACIONES</span>
        <h2>Flota</h2>
        <p>Estado actual de los aviones.</p>
      </div>

      ${
        isAdmin
          ? `<button class="primary" onclick="newAircraft()">
              + Añadir avión
             </button>`
          : ""
      }
    </div>

    <div class="fleet-grid">

      ${
        data?.length
          ? data.map(fleetCard).join("")
          : `<div class="empty">No hay aviones registrados.</div>`
      }

    </div>
  `;
}

function fleetCard(item) {
  const status = String(item.status || "").toLowerCase();

  let statusClass = "neutral";

  if (
    status.includes("dispon") ||
    status.includes("operativo")
  ) {
    statusClass = "good";
  }

  if (
    status.includes("aver") ||
    status.includes("mantenimiento") ||
    status.includes("fuera")
  ) {
    statusClass = "bad";
  }

  return `
    <article class="aircraft-card">

      <div class="aircraft-icon">✈</div>

      <div class="aircraft-main">
        <h3>${esc(item.aircraft)}</h3>

        <span class="status ${statusClass}">
          ${esc(item.status || "Sin estado")}
        </span>

        <p>
          ${esc(item.notes || "Sin notas.")}
        </p>
      </div>

      ${
        isAdmin
          ? `<button
              class="secondary"
              onclick="editAircraft('${item.id}')">
              Editar
             </button>`
          : ""
      }

    </article>
  `;
}

async function newAircraft() {
  const aircraft = prompt("Identificación del avión:");
  if (!aircraft) return;

  const status = prompt("Estado del avión:");
  if (!status) return;

  const notes = prompt("Notas:") || "";

  const { error } = await db.from("fleet").insert({
    aircraft,
    status,
    notes
  });

  if (error) {
    alert(error.message);
    return;
  }

  fleetPage();
}

async function editAircraft(id) {
  const { data, error } = await db
    .from("fleet")
    .select("*")
    .eq("id", id)
    .single();

  if (error) {
    alert(error.message);
    return;
  }

  const status =
    prompt("Estado:", data.status || "") ??
    data.status;

  const notes =
    prompt("Notas:", data.notes || "") ??
    data.notes;

  const { error: updateError } = await db
    .from("fleet")
    .update({
      status,
      notes
    })
    .eq("id", id);

  if (updateError) {
    alert(updateError.message);
    return;
  }

  fleetPage();
}

/* =========================
   EMPLEADOS
========================= */

async function employeesPage() {
  const content = document.getElementById("content");

  content.innerHTML = `
    <div class="section-head">
      <div>
        <span class="eyebrow">EQUIPO</span>
        <h2>Empleados</h2>
        <p>Información del personal.</p>
      </div>
    </div>

    <div class="employee-grid">

      ${employees.map(employeeCard).join("")}

    </div>
  `;
}

function employeeCard(employee) {
  return `
    <article class="employee-card">

      <div class="avatar">
        ${esc(
          String(
            employee.full_name ||
              employee.name ||
              "E"
          ).charAt(0).toUpperCase()
        )}
      </div>

      <div>
        <h3>
          ${esc(
            employee.full_name ||
              employee.name ||
              "Empleado"
          )}
        </h3>

        <p>
          ${esc(
            employee.phone ||
              employee.telefono ||
              "Teléfono no disponible"
          )}
        </p>

        <span>
          ${esc(
            employee.shift ||
              employee.turno ||
              employee.role ||
              "Empleado"
          )}
        </span>
      </div>

    </article>
  `;
}

/* =========================
   UTILIDADES
========================= */

function formatDate(value) {
  if (!value) return "";

  return new Date(value).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  });
}

function errorBox(error) {
  return `
    <div class="error">
      <strong>No se pudo cargar esta sección.</strong>
      <br>
      <small>${esc(error?.message || "Error desconocido")}</small>
    </div>
  `;
}

/* =========================
   ESTILOS
========================= */

const style = document.createElement("style");

style.textContent = `

* {
  box-sizing: border-box;
}

body {
  margin: 0;
  font-family:
    Inter,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;

  background: #f5f7fa;
  color: #172033;
}

button,
select,
input,
textarea {
  font: inherit;
}

button {
  cursor: pointer;
}

.app-shell {
  min-height: 100vh;
  display: flex;
}

.sidebar {
  width: 260px;
  background: #101828;
  color: white;
  padding: 22px 16px;
  display: flex;
  flex-direction: column;
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 20;
}

.brand {
  display: flex;
  gap: 12px;
  align-items: center;
  padding: 8px;
  margin-bottom: 30px;
}

.brand strong {
  display: block;
  font-size: 14px;
}

.brand small {
  display: block;
  color: #98a2b3;
  margin-top: 3px;
}

.logo-mark {
  width: 62px;
  height: 62px;
  border-radius: 18px;
  display: grid;
  place-items: center;
  background: #ffffff;
  color: #101828;
  font-weight: 900;
  font-size: 22px;
  margin: 0 auto 18px;
}

.logo-mark.small {
  width: 42px;
  height: 42px;
  border-radius: 12px;
  margin: 0;
  font-size: 15px;
}

.sidebar nav {
  display: grid;
  gap: 6px;
}

.sidebar nav button,
.logout {
  border: 0;
  background: transparent;
  color: #d0d5dd;
  text-align: left;
  padding: 13px 14px;
  border-radius: 10px;
}

.sidebar nav button:hover,
.sidebar nav button.active {
  background: #1d2939;
  color: white;
}

.sidebar-bottom {
  margin-top: auto;
}

.user-mini {
  border-top: 1px solid #344054;
  padding: 18px 8px 10px;
}

.user-mini strong,
.user-mini span {
  display: block;
}

.user-mini span {
  color: #98a2b3;
  font-size: 13px;
  margin-top: 3px;
}

.logout {
  width: 100%;
}

.main {
  width: 100%;
  margin-left: 260px;
}

.topbar {
  height: 82px;
  background: white;
  border-bottom: 1px solid #eaecf0;
  padding: 16px 34px;
  display: flex;
  align-items: center;
  gap: 16px;
}

.topbar h1 {
  margin: 0;
  font-size: 22px;
}

.topbar p {
  margin: 4px 0 0;
  color: #667085;
  font-size: 13px;
}

.menu-btn {
  display: none;
  border: 0;
  background: transparent;
  font-size: 24px;
}

.content {
  padding: 34px;
  max-width: 1400px;
  margin: auto;
}

.welcome {
  background: white;
  border-radius: 20px;
  padding: 30px;
  border: 1px solid #eaecf0;
}

.welcome h2 {
  margin: 7px 0;
  font-size: 30px;
}

.welcome p {
  color: #667085;
}

.eyebrow {
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .12em;
  color: #667085;
}

.stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  margin: 20px 0 35px;
}

.stat-card {
  background: white;
  border: 1px solid #eaecf0;
  border-radius: 16px;
  padding: 22px;
}

.stat-card span {
  display: block;
  color: #667085;
  font-size: 13px;
}

.stat-card strong {
  display: block;
  margin-top: 8px;
  font-size: 30px;
}

.section-head {
  display: flex;
  justify-content: space-between;
  gap: 20px;
  align-items: center;
  margin-bottom: 22px;
}

.section-head h2 {
  margin: 4px 0;
}

.section-head p {
  margin: 0;
  color: #667085;
}

.primary,
.secondary,
.danger-btn,
.icon-btn {
  border: 0;
  border-radius: 9px;
  padding: 10px 15px;
}

.primary {
  background: #101828;
  color: white;
}

.secondary,
.icon-btn {
  background: #eef2f6;
  color: #344054;
}

.danger-btn {
  background: #fee4e2;
  color: #b42318;
}

.cards,
.news-list,
.fleet-grid,
.employee-grid {
  display: grid;
  gap: 16px;
}

.cards {
  grid-template-columns: repeat(3, 1fr);
}

.news-card,
.aircraft-card,
.employee-card {
  background: white;
  border: 1px solid #eaecf0;
  border-radius: 16px;
  padding: 20px;
}

.news-card h3 {
  margin: 9px 0;
}

.news-card p {
  color: #475467;
  line-height: 1.6;
  white-space: pre-wrap;
}

.news-card.full {
  padding: 24px;
}

.news-top {
  display: flex;
  justify-content: space-between;
  gap: 10px;
}

.date {
  color: #667085;
  font-size: 12px;
}

.calendar {
  display: grid;
  gap: 16px;
}

.calendar-day {
  background: white;
  border: 1px solid #eaecf0;
  border-radius: 18px;
  overflow: hidden;
}

.calendar-date {
  background: #f9fafb;
  padding: 16px 20px;
  text-transform: capitalize;
  border-bottom: 1px solid #eaecf0;
}

.shift-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
}

.shift {
  padding: 22px;
  min-height: 130px;
}

.shift + .shift {
  border-left: 1px solid #eaecf0;
}

.shift span {
  display: block;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .1em;
  color: #667085;
  margin-bottom: 12px;
}

.shift strong {
  display: block;
  font-size: 18px;
}

.shift small {
  display: block;
  color: #667085;
  margin: 7px 0 14px;
}

.shift button {
  border: 0;
  background: transparent;
  text-decoration: underline;
  color: #344054;
}

.calendar-note {
  padding: 14px 20px;
  background: #fffaeb;
  border-top: 1px solid #eaecf0;
  color: #7a2e0e;
}

.fleet-grid {
  grid-template-columns: repeat(3, 1fr);
}

.aircraft-card {
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.aircraft-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  background: #f2f4f7;
  display: grid;
  place-items: center;
  font-size: 22px;
}

.aircraft-main {
  flex: 1;
}

.aircraft-main h3 {
  margin: 0 0 9px;
}

.aircraft-main p {
  color: #667085;
  line-height: 1.5;
}

.status {
  display: inline-block;
  border-radius: 999px;
  padding: 5px 9px;
  font-size: 11px;
  font-weight: 700;
}

.status.good {
  background: #dcfae6;
  color: #067647;
}

.status.bad {
  background: #fee4e2;
  color: #b42318;
}

.status.neutral {
  background: #f2f4f7;
  color: #344054;
}

.employee-grid {
  grid-template-columns: repeat(3, 1fr);
}

.employee-card {
  display: flex;
  gap: 15px;
  align-items: center;
}

.employee-card h3 {
  margin: 0 0 5px;
}

.employee-card p {
  margin: 0 0 6px;
  color: #667085;
}

.employee-card span {
  color: #667085;
  font-size: 12px;
}

.avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #101828;
  color: white;
  display: grid;
  place-items: center;
  font-weight: 800;
}

.login {
  min-height: 100vh;
  display: grid;
  place-items: center;
  background: #f5f7fa;
  padding: 20px;
}

.login-card {
  width: min(420px, 100%);
  background: white;
  padding: 28px;
  border: 1px solid #eaecf0;
  border-radius: 18px;
  box-shadow: 0 12px 40px rgba(16, 24, 40, .08);
}

.login-card h2 {
  margin-top: 0;
}

.login-card label {
  display: block;
  margin: 18px 0 7px;
  font-size: 13px;
  font-weight: 600;
}

.login-card select {
  width: 100%;
  padding: 13px;
  border: 1px solid #d0d5dd;
  border-radius: 9px;
  background: white;
}

.login-card .primary {
  width: 100%;
  margin-top: 15px;
  padding: 13px;
}

.muted {
  color: #667085;
}

.empty,
.error,
.loading {
  background: white;
  border: 1px solid #eaecf0;
  border-radius: 16px;
  padding: 28px;
}

.error {
  color: #b42318;
}

@media (max-width: 900px) {

  .sidebar {
    transform: translateX(-100%);
    transition: transform .2s ease;
  }

  .sidebar.open {
    transform: translateX(0);
  }

  .main {
    margin-left: 0;
  }

  .menu-btn {
    display: block;
  }

  .cards,
  .fleet-grid,
  .employee-grid {
    grid-template-columns: 1fr 1fr;
  }

  .content {
    padding: 22px;
  }
}

@media (max-width: 600px) {

  .topbar {
    padding: 14px 18px;
  }

  .content {
    padding: 16px;
  }

  .stats,
  .cards,
  .fleet-grid,
  .employee-grid {
    grid-template-columns: 1fr;
  }

  .section-head {
    align-items: flex-start;
    flex-direction: column;
  }

  .shift-grid {
    grid-template-columns: 1fr;
  }

  .shift + .shift {
    border-left: 0;
    border-top: 1px solid #eaecf0;
  }

  .welcome h2 {
    font-size: 24px;
  }

  .news-top {
    flex-direction: column;
  }

  .aircraft-card {
    flex-wrap: wrap;
  }
}
`;

document.head.appendChild(style);

/* Iniciar aplicación */
loadEmployees();
