/* Calendario de Especiales: una casilla por empleado y día. */
let specialCalendarDate = new Date();

const SPECIAL_TYPES = ["C", "V", "CS", "AP", "B"];
const SPECIAL_LABELS = {
  C: "Compensación",
  V: "Vacaciones",
  CS: "Comisión de servicio",
  AP: "Asuntos propios",
  B: "Baja"
};

function specialDateKey(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function specialDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function specialMonthLabel(date) {
  return new Intl.DateTimeFormat("es-ES", { month: "long", year: "numeric" }).format(date);
}

function specialAnnualPeriod(date = new Date()) {
  // Periodo anual de Especiales: 1 de enero del año en curso hasta 31 de enero del año siguiente.
  // Durante enero se mantiene el periodo que comenzó el 1 de enero del año anterior.
  const year = date.getFullYear();
  const periodYear = date.getMonth() === 0 ? year - 1 : year;
  return {
    start: `${periodYear}-01-01`,
    end: `${periodYear + 1}-01-31`,
    label: `${periodYear}/${periodYear + 1}`
  };
}

function specialPeriodLabel(period) {
  const format = value => new Date(`${value}T00:00:00`).toLocaleDateString("es-ES");
  return `${format(period.start)} → ${format(period.end)}`;
}

function specialNextValue(value) {
  const index = SPECIAL_TYPES.indexOf(value);
  if (index === -1) return "C";
  return index === SPECIAL_TYPES.length - 1 ? "" : SPECIAL_TYPES[index + 1];
}

async function especiales() {
  const box = document.getElementById("content");
  if (!box) return;

  const year = specialCalendarDate.getFullYear();
  const month = specialCalendarDate.getMonth();
  const start = specialDateKey(year, month, 1);
  const end = specialDateKey(year, month, specialDaysInMonth(year, month));
  const annualPeriod = specialAnnualPeriod(specialCalendarDate);

  const [monthResult, annualResult] = await Promise.all([
    db
      .from("especiales_calendario")
      .select("id,fecha,empleado_id,tipo")
      .gte("fecha", start)
      .lte("fecha", end)
      .order("fecha"),
    db
      .from("especiales_calendario")
      .select("empleado_id,tipo")
      .gte("fecha", annualPeriod.start)
      .lte("fecha", annualPeriod.end)
  ]);

  if (monthResult.error || annualResult.error) {
    const error = monthResult.error || annualResult.error;
    box.innerHTML = `<div class="panel error-state"><h3>No se pudo cargar Especiales</h3><p>${esc(error.message)}</p><button class="btn primary" onclick="render('especiales')">Reintentar</button></div>`;
    return;
  }

  const records = monthResult.data || [];
  const annualRecords = annualResult.data || [];
  const byKey = new Map(records.map(row => [`${row.fecha}|${row.empleado_id}`, row.tipo]));
  const days = Array.from({ length: specialDaysInMonth(year, month) }, (_, i) => i + 1);

  // Los contadores siempre se calculan exclusivamente dentro del periodo anual vigente.
  const counters = new Map();
  employees.forEach(employee => counters.set(employee.id, { C: 0, V: 0, CS: 0, AP: 0, B: 0 }));
  annualRecords.forEach(row => {
    const counter = counters.get(row.empleado_id);
    if (counter && counter[row.tipo] !== undefined) counter[row.tipo] += 1;
  });

  const total = { C: 0, V: 0, CS: 0, AP: 0, B: 0 };
  counters.forEach(counter => SPECIAL_TYPES.forEach(type => { total[type] += counter[type]; }));

  box.innerHTML = `
    <div class="calendar-toolbar">
      <div>
        <span class="eyebrow">PLANIFICACIÓN MENSUAL</span>
        <h3>Especiales</h3>
        <p class="muted">Registra en el calendario <b>C</b> Compensación, <b>V</b> Vacaciones, <b>CS</b> Comisión de servicio, <b>AP</b> Asuntos propios y <b>B</b> Baja.</p>
        <div class="special-period-banner"><span>CONTADOR ANUAL</span><strong>Periodo ${esc(annualPeriod.label)}</strong><small>${specialPeriodLabel(annualPeriod)} · Incluye enero del año siguiente.</small></div>
      </div>
      <div class="toolbar-actions">
        <button class="btn secondary" onclick="changeSpecialMonth(-1)">← Mes anterior</button>
        <button class="month-badge">${esc(specialMonthLabel(specialCalendarDate))}</button>
        <button class="btn secondary" onclick="changeSpecialMonth(1)">Mes siguiente →</button>
      </div>
    </div>

    <div class="special-calendar-legend">
      ${SPECIAL_TYPES.map(type => `<span><b class="special-code ${type.toLowerCase()}">${type}</b>${SPECIAL_LABELS[type]}</span>`).join("")}
      <em>${admin ? "Haz clic en una casilla para avanzar: C → V → CS → AP → B → vacío." : "Modo consulta: solo el administrador puede modificar."}</em>
    </div>

    <div class="calendar-wrap special-calendar-wrap">
      <table class="special-calendar-table">
        <thead>
          <tr>
            <th class="special-employee-col" rowspan="2">Empleado</th>
            ${days.map(day => {
              const date = new Date(year, month, day);
              const weekday = new Intl.DateTimeFormat("es-ES", { weekday: "short" }).format(date).replace(".", "");
              const monthShort = new Intl.DateTimeFormat("es-ES", { month: "short" }).format(date).replace(".", "");
              return `<th><div class="special-day-head"><b>${weekday.toUpperCase()}</b><span>${String(day).padStart(2, "0")} ${monthShort}</span></div></th>`;
            }).join("")}
            <th class="counter-col" rowspan="2">C</th>
            <th class="counter-col" rowspan="2">V</th>
            <th class="counter-col" rowspan="2">CS</th>
            <th class="counter-col" rowspan="2">AP</th>
            <th class="counter-col" rowspan="2">B</th>
          </tr>
          <tr>${days.map(() => "<th class=\"special-subhead\">ESPECIAL</th>").join("")}</tr>
        </thead>
        <tbody>
          ${employees.map(employee => {
            const count = counters.get(employee.id) || { C: 0, V: 0, CS: 0, AP: 0, B: 0 };
            return `<tr>
              <th class="special-employee-col special-employee-name">
                <div class="special-employee">
                  <span class="avatar-small">${ini(employee.nombre)}</span>
                  <div><strong>${esc(employee.nombre)}</strong><small>${esc(employee.telefono || "")}</small></div>
                </div>
              </th>
              ${days.map(day => {
                const date = specialDateKey(year, month, day);
                const type = byKey.get(`${date}|${employee.id}`) || "";
                return `<td class="special-day-cell ${type ? `has-${type.toLowerCase()}` : ""}">
                  <button class="special-day-button ${type ? `type-${type.toLowerCase()}` : "empty"}" ${admin ? "" : "disabled"}
                    title="${type ? SPECIAL_LABELS[type] : "Sin especial"}"
                    onclick="cycleSpecial('${employee.id}','${date}','${type}')">${type || "·"}</button>
                </td>`;
              }).join("")}
              ${SPECIAL_TYPES.map(type => `<td class="special-counter"><span>${count[type]}</span></td>`).join("")}
            </tr>`;
          }).join("")}
        </tbody>
        <tfoot>
          <tr>
            <th class="special-employee-col">TOTAL PERIODO ${annualPeriod.label}</th>
            ${days.map(() => "<td></td>").join("")}
            ${SPECIAL_TYPES.map(type => `<th class="special-total-counter">${total[type]}</th>`).join("")}
          </tr>
        </tfoot>
      </table>
    </div>

    <div class="special-calendar-footer">
      <span><b>${employees.length}</b> empleados · <b>${days.length}</b> días</span>
      <span>Los contadores muestran el total del periodo ${specialPeriodLabel(annualPeriod)}.</span>
    </div>
  `;
}

async function cycleSpecial(employeeId, fecha, currentType) {
  if (!admin) return;

  const nextType = specialNextValue(currentType);
  let result;

  if (!nextType) {
    result = await db
      .from("especiales_calendario")
      .delete()
      .eq("empleado_id", employeeId)
      .eq("fecha", fecha);
  } else {
    result = await db
      .from("especiales_calendario")
      .upsert(
        { empleado_id: employeeId, fecha, tipo: nextType },
        { onConflict: "fecha,empleado_id" }
      );
  }

  if (result.error) {
    toast(result.error.message, "error");
    return;
  }

  toast(nextType ? `${nextType} · ${SPECIAL_LABELS[nextType]}` : "Casilla vaciada");
  await especiales();
}

function changeSpecialMonth(delta) {
  specialCalendarDate = new Date(specialCalendarDate.getFullYear(), specialCalendarDate.getMonth() + delta, 1);
  render("especiales");
}
