const db = supabase.createClient(
  AVIONICA_SUPABASE_URL,
  AVIONICA_SUPABASE_KEY
);

let employees = [];
let current = null;
let admin = false;
let calendarDate = new Date();

const S = document.getElementById("screen");

const esc = x =>
  String(x ?? "").replace(/[&<>"']/g, m => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[m]));

const ini = n =>
  String(n || "")
    .split(" ")
    .map(x => x[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

const nav = [
  ["inicio", "⌂ Inicio"],
  ["cuadrantes", "▦ Cuadrantes"],
  ["flota", "✈ Flota"],
  ["novedades", "✦ Novedades"],
  ["perfil", "◯ Mi perfil"]
];

async function load() {
  const r = await db
    .from("profiles")
    .select("id,full_name,phone,role")
    .order("full_name");

  if (r.error) {
    S.innerHTML = `
      <div class="login">
        <div class="pick">
          <div class="head">
            <div class="logo">A</div>
            <h1>ATAQUE-EQUIPO</h1>
            <p class="muted">${esc(r.error.message)}</p>
          </div>
        </div>
      </div>`;
    return false;
  }

  employees = r.data || [];
  return true;
}

async function choose() {
  if (!await load()) return;

  S.innerHTML = `
    <div class="login">
      <div class="pick">
        <div class="head">
          <div class="logo">A</div>
          <h1>ATAQUE-EQUIPO</h1>
          <p class="muted">Selecciona tu nombre para entrar</p>
        </div>

        <div class="people">
          ${employees.map(e => `
            <button class="person" onclick="enter('${e.id}')">
              <div class="avatar">${ini(e.full_name)}</div>
              <b>${esc(e.full_name)}</b>
              <div class="muted">${esc(e.phone || "")}</div>
            </button>
          `).join("")}
        </div>

        <div class="admin">
          <button class="btn" onclick="pin()">⚙ Administración</button>
        </div>
      </div>
    </div>`;
}

async function enter(id) {
  current = employees.find(e => e.id === id);
  admin = false;
  render("inicio");
}

async function render(page) {
  const titles = {
    inicio: "Inicio",
    cuadrantes: "Cuadrantes",
    flota: "Flota",
    novedades: "Novedades",
    perfil: "Mi perfil",
    admin: "Administración"
  };

  S.innerHTML = `
    <aside class="side" id="side">

      <div class="brand">
        <div class="logo">A</div>
        <div>
          <b>ATAQUE-EQUIPO</b>
          <small>Portal del equipo</small>
        </div>
      </div>

      <div class="nav">
        ${nav.map(n => `
          <button
            class="${page === n[0] ? "active" : ""}"
            onclick="render('${n[0]}')">
            ${n[1]}
          </button>
        `).join("")}

        ${admin ? `
          <button
            class="${page === "admin" ? "active" : ""}"
            onclick="render('admin')">
            ⚙ Administración
          </button>
        ` : ""}
      </div>

      <div class="sidefoot">
        ATAQUE-EQUIPO
      </div>
    </aside>

    <main class="main">

      <header class="top">

        <div>
          <button
            class="menu"
            onclick="side.classList.toggle('open')">
            ☰
          </button>

          <h2>${titles[page] || page}</h2>
        </div>

        <div class="profile">
          <div class="avatar">
            ${admin ? "AD" : ini(current?.full_name)}
          </div>

          <div>
            <b>
              ${admin ? "Administrador" : esc(current?.full_name)}
            </b>

            <div class="muted">
              ${admin ? "Control general" : "Empleado"}
            </div>
          </div>

          <button class="logout" onclick="choose()">
            Salir
          </button>
        </div>

      </header>

      <div class="content" id="content"></div>

    </main>
  `;

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

/* =========================
   INICIO
========================= */

async function inicio() {
  const [shifts, fleet, updates] = await Promise.all([
    db.from("shifts").select("*"),
    db.from("inventory").select("*"),
    db.from("updates").select("*")
  ]);

  content.innerHTML = `
    <div class="hero">
      <h2>
        Hola, ${esc(
          (admin ? "Administrador" : current?.full_name || "")
            .split(" ")[0]
        )} 👋
      </h2>

      <div>
        Bienvenido al portal de ATAQUE-EQUIPO.
      </div>
    </div>

    <div class="grid">

      <div class="card stat">
        <span class="muted">Turnos</span>
        <b>${shifts.data?.length || 0}</b>
      </div>

      <div class="card stat">
        <span class="muted">Aeronaves</span>
        <b>${fleet.data?.length || 0}</b>
      </div>

      <div class="card stat">
        <span class="muted">Novedades</span>
        <b>${updates.data?.length || 0}</b>
      </div>

      <div class="card stat">
        <span class="muted">Empleados</span>
        <b>${employees.length}</b>
      </div>

    </div>
  `;
}

/* =========================
   CUADRANTES
========================= */

async function cuadrantes() {

  const year = calendarDate.getFullYear();
  const month = calendarDate.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const start =
    firstDay.toISOString().slice(0, 10);

  const end =
    lastDay.toISOString().slice(0, 10);

  let query = db
    .from("shifts")
    .select("*,profiles(full_name)")
    .gte("date", start)
    .lte("date", end)
    .order("date");

  if (!admin && current) {
    query = query.eq("employee_id", current.id);
  }

  const r = await query;

  const shifts = r.data || [];

  const monthName = new Intl.DateTimeFormat(
    "es-ES",
    { month: "long", year: "numeric" }
  ).format(calendarDate);

  const days = [];

  const startWeek =
    firstDay.getDay() === 0
      ? 6
      : firstDay.getDay() - 1;

  for (let i = 0; i < startWeek; i++) {
    days.push(`<div class="calendar-empty"></div>`);
  }

  for (let day = 1; day <= lastDay.getDate(); day++) {

    const date =
      `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

    const dayShifts =
      shifts.filter(x => x.date === date);

    days.push(`
      <div class="calendar-day">

        <div class="calendar-number">
          ${day}
        </div>

        ${dayShifts.map(x => `
          <div class="shift-card">

            <b>
              ${esc(
                x.profiles?.full_name ||
                employees.find(e => e.id === x.employee_id)?.full_name ||
                "Empleado"
              )}
            </b>

            <div>
              ${esc(x.start_time || "")}
              ${x.end_time ? " – " + esc(x.end_time) : ""}
            </div>

            ${x.service ? `
              <small>${esc(x.service)}</small>
            ` : ""}

            ${x.notes ? `
              <small>📝 ${esc(x.notes)}</small>
            ` : ""}

            ${admin ? `
              <div class="shift-actions">
                <button
                  class="smallbtn"
                  onclick="editShift('${x.id}')">
                  Editar
                </button>

                <button
                  class="smallbtn danger"
                  onclick="deleteShift('${x.id}')">
                  Eliminar
                </button>
              </div>
            ` : ""}

          </div>
        `).join("")}

        ${admin ? `
          <button
            class="calendar-add"
            onclick="newShift('${date}')">
            +
          </button>
        ` : ""}

      </div>
    `);
  }

  content.innerHTML = `
    <div class="row">

      <div>
        <h3>Cuadrante de trabajo</h3>
        <p class="muted">
          ${monthName}
        </p>
      </div>

      <div>
        <button class="btn" onclick="previousMonth()">
          ←
        </button>

        <button class="btn" onclick="todayMonth()">
          Hoy
        </button>

        <button class="btn" onclick="nextMonth()">
          →
        </button>
      </div>

    </div>

    <div class="calendar">

      <div class="calendar-head">LUN</div>
      <div class="calendar-head">MAR</div>
      <div class="calendar-head">MIÉ</div>
      <div class="calendar-head">JUE</div>
      <div class="calendar-head">VIE</div>
      <div class="calendar-head">SÁB</div>
      <div class="calendar-head">DOM</div>

      ${days.join("")}

    </div>
  `;
}

function previousMonth() {
  calendarDate.setMonth(calendarDate.getMonth() - 1);
  render("cuadrantes");
}

function nextMonth() {
  calendarDate.setMonth(calendarDate.getMonth() + 1);
  render("cuadrantes");
}

function todayMonth() {
  calendarDate = new Date();
  render("cuadrantes");
}

/* =========================
   NUEVO TURNO
========================= */

async function newShift(date) {

  const employee = prompt(
    "UUID del empleado:\n\n" +
    employees.map(e =>
      `${e.id} → ${e.full_name}`
    ).join("\n")
  );

  if (!employee) return;

  const start =
    prompt("Hora de inicio", "08:00");

  if (!start) return;

  const end =
    prompt("Hora de finalización", "16:00");

  if (!end) return;

  const service =
    prompt("Turno / servicio", "Turno de mañana") || "";

  const notes =
    prompt("Nota", "") || "";

  const r = await db
    .from("shifts")
    .insert({
      date,
      employee_id: employee,
      start_time: start,
      end_time: end,
      service,
      notes
    });

  if (r.error) {
    alert(r.error.message);
    return;
  }

  render("cuadrantes");
}

/* =========================
   EDITAR TURNO
========================= */

async function editShift(id) {

  const r = await db
    .from("shifts")
    .select("*")
    .eq("id", id)
    .single();

  if (r.error) {
    alert(r.error.message);
    return;
  }

  const x = r.data;

  const start =
    prompt("Hora de inicio", x.start_time || "");

  if (start === null) return;

  const end =
    prompt("Hora de finalización", x.end_time || "");

  if (end === null) return;

  const service =
    prompt("Turno / servicio", x.service || "");

  if (service === null) return;

  const notes =
    prompt("Nota", x.notes || "");

  if (notes === null) return;

  const u = await db
    .from("shifts")
    .update({
      start_time: start,
      end_time: end,
      service,
      notes
    })
    .eq("id", id);

  if (u.error) {
    alert(u.error.message);
    return;
  }

  render("cuadrantes");
}

async function deleteShift(id) {

  if (!confirm("¿Quieres eliminar este turno?")) {
    return;
  }

  const r = await db
    .from("shifts")
    .delete()
    .eq("id", id);

  if (r.error) {
    alert(r.error.message);
    return;
  }

  render("cuadrantes");
}

/* =========================
   FLOTA
========================= */

async function flota() {

  const r = await db
    .from("inventory")
    .select("*")
    .order("name");

  const aircraft = r.data || [];

  content.innerHTML = `
    <div class="row">

      <div>
        <h3>Flota</h3>
        <p class="muted">
          Estado y observaciones de las aeronaves
        </p>
      </div>

      ${admin ? `
        <button class="btn" onclick="newAircraft()">
          + Añadir aeronave
        </button>
      ` : ""}

    </div>

    <div class="grid">

      ${aircraft.map(x => `

        <div class="card">

          <div class="row">

            <h3>
              ✈ ${esc(x.name)}
            </h3>

            <span class="tag">
              ${esc(x.status || "Sin estado")}
            </span>

          </div>

          ${x.reference ? `
            <p>
              <b>Matrícula / referencia:</b>
              ${esc(x.reference)}
            </p>
          ` : ""}

          ${x.location ? `
            <p>
              <b>Ubicación:</b>
              ${esc(x.location)}
            </p>
          ` : ""}

          ${x.notes ? `
            <p>
              <b>Notas:</b><br>
              ${esc(x.notes)}
            </p>
          ` : ""}

          ${admin ? `
            <button
              class="smallbtn"
              onclick="editAircraft('${x.id}')">
              Editar
            </button>

            <button
              class="smallbtn danger"
              onclick="deleteAircraft('${x.id}')">
              Eliminar
            </button>
          ` : ""}

        </div>

      `).join("")}

    </div>
  `;
}

/* =========================
   AERONAVES
========================= */

async function newAircraft() {

  const name =
    prompt("Nombre / modelo de aeronave");

  if (!name) return;

  const reference =
    prompt("Matrícula / referencia", "") || "";

  const status =
    prompt(
      "Estado",
      "Operativo"
    ) || "Operativo";

  const location =
    prompt("Ubicación", "") || "";

  const notes =
    prompt("Notas", "") || "";

  const r = await db
    .from("inventory")
    .insert({
      name,
      reference,
      status,
      location,
      notes,
      quantity: 1
    });

  if (r.error) {
    alert(r.error.message);
    return;
  }

  render("flota");
}

async function editAircraft(id) {

  const r = await db
    .from("inventory")
    .select("*")
    .eq("id", id)
    .single();

  if (r.error) {
    alert(r.error.message);
    return;
  }

  const x = r.data;

  const name =
    prompt("Nombre / modelo", x.name || "");

  if (!name) return;

  const reference =
    prompt(
      "Matrícula / referencia",
      x.reference || ""
    ) || "";

  const status =
    prompt(
      "Estado",
      x.status || "Operativo"
    ) || "Operativo";

  const location =
    prompt(
      "Ubicación",
      x.location || ""
    ) || "";

  const notes =
    prompt(
      "Notas",
      x.notes || ""
    ) || "";

  const u = await db
    .from("inventory")
    .update({
      name,
      reference,
      status,
      location,
      notes
    })
    .eq("id", id);

  if (u.error) {
    alert(u.error.message);
    return;
  }

  render("flota");
}

async function deleteAircraft(id) {

  if (!confirm("¿Eliminar esta aeronave?")) {
    return;
  }

  const r = await db
    .from("inventory")
    .delete()
    .eq("id", id);

  if (r.error) {
    alert(r.error.message);
    return;
  }

  render("flota");
}

/* =========================
   NOVEDADES
========================= */

async function novedades() {

  const r = await db
    .from("updates")
    .select("*")
    .order("created_at", {
      ascending: false
    });

  if (r.error) {
    content.innerHTML = `
      <div class="card">
        <h3>Error cargando novedades</h3>
        <p>${esc(r.error.message)}</p>
      </div>
    `;
    return;
  }

  const updates = r.data || [];

  content.innerHTML = `
    <div class="row">

      <div>
        <h3>Novedades</h3>
        <p class="muted">
          Todos los empleados pueden leer,
          añadir, editar y eliminar novedades.
        </p>
      </div>

      <button class="btn" onclick="newUpdate()">
        + Nueva novedad
      </button>

    </div>

    ${updates.length === 0 ? `
      <div class="card">
        <h3>No hay novedades todavía</h3>
        <p class="muted">
          Puedes crear la primera.
        </p>
      </div>
    ` : ""}

    ${updates.map(x => `
      <div class="card" style="margin:12px 0">

        <div class="row">

          <div>
            <h3>${esc(x.title)}</h3>

            <span class="muted">
              ${x.created_at
                ? new Date(x.created_at)
                    .toLocaleDateString("es-ES")
                : ""}
            </span>
          </div>

        </div>

        <p>
          ${esc(x.body || "")}
        </p>

        <div>

          <button
            class="smallbtn"
            onclick="editUpdate('${x.id}')">
            Editar
          </button>

          <button
            class="smallbtn danger"
            onclick="deleteUpdate('${x.id}')">
            Eliminar
          </button>

        </div>

      </div>
    `).join("")}
  `;
}

async function newUpdate() {

  const title =
    prompt("Título de la novedad");

  if (!title) return;

  const body =
    prompt("Contenido") || "";

  const r = await db
    .from("updates")
    .insert({
      title,
      body
    });

  if (r.error) {
    alert(r.error.message);
    return;
  }

  render("novedades");
}

async function editUpdate(id) {

  const r = await db
    .from("updates")
    .select("*")
    .eq("id", id)
    .single();

  if (r.error) {
    alert(r.error.message);
    return;
  }

  const title =
    prompt(
      "Título",
      r.data.title || ""
    );

  if (!title) return;

  const body =
    prompt(
      "Contenido",
      r.data.body || ""
    ) || "";

  const u = await db
    .from("updates")
    .update({
      title,
      body
    })
    .eq("id", id);

  if (u.error) {
    alert(u.error.message);
    return;
  }

  render("novedades");
}

async function deleteUpdate(id) {

  if (!confirm(
    "¿Quieres eliminar esta novedad?"
  )) {
    return;
  }

  const r = await db
    .from("updates")
    .delete()
    .eq("id", id);

  if (r.error) {
    alert(r.error.message);
    return;
  }

  render("novedades");
}

/* =========================
   PERFIL
========================= */

async function perfil() {

  content.innerHTML = `
    <div class="card">

      <h3>Mi perfil</h3>

      <p>
        <b>Nombre:</b>
        ${esc(current.full_name)}
      </p>

      <p>
        <b>Teléfono:</b>
        ${esc(current.phone || "No indicado")}
      </p>

      <p>
        <b>Rol:</b>
        ${esc(current.role || "Empleado")}
      </p>

      <button
        class="btn"
        onclick="editProfile()">
        Editar datos
      </button>

    </div>
  `;
}

async function editProfile() {

  const full_name =
    prompt(
      "Nombre",
      current.full_name
    );

  if (!full_name) return;

  const phone =
    prompt(
      "Teléfono",
      current.phone || ""
    ) || "";

  const r = await db
    .from("profiles")
    .update({
      full_name,
      phone
    })
    .eq("id", current.id);

  if (r.error) {
    alert(r.error.message);
    return;
  }

  await load();

  current =
    employees.find(
      e => e.id === current.id
    );

  render("perfil");
}

/* =========================
   ADMINISTRACIÓN
========================= */

async function adminPage() {

  await load();

  content.innerHTML = `
    <div class="grid">

      <div class="card stat">
        <span class="muted">
          Empleados
        </span>
        <b>${employees.length}</b>
      </div>

      <div class="card stat">
        <span class="muted">
          Estado
        </span>
        <b>OK</b>
      </div>

    </div>

    <div class="card">

      <h3>Equipo</h3>

      <table class="table">

        <tr>
          <th>Nombre</th>
          <th>Teléfono</th>
          <th>Rol</th>
        </tr>

        ${employees.map(e => `
          <tr>

            <td>
              ${esc(e.full_name)}
            </td>

            <td>
              ${esc(e.phone || "")}
            </td>

            <td>
              ${esc(e.role || "Empleado")}
            </td>

          </tr>
        `).join("")}

      </table>

    </div>
  `;
}

/* =========================
   ADMIN LOGIN
========================= */

function pin() {

  S.insertAdjacentHTML(
    "beforeend",
    `
      <div class="modal" id="modal">

        <div class="card">

          <button
            class="close"
            onclick="modal.remove()">
            ×
          </button>

          <h3>Administración</h3>

          <p class="muted">
            Introduce el PIN de administrador.
          </p>

          <input
            id="p"
            class="pin"
            type="password"
            maxlength="6">

          <br><br>

          <button
            class="btn"
            onclick="
              if(p.value==='1234'){
                admin=true;
                modal.remove();
                render('admin');
              }else{
                alert('PIN incorrecto');
              }
            ">
            Entrar
          </button>

        </div>

      </div>
    `
  );
}

choose();
