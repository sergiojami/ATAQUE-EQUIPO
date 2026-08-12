/* Gestión avanzada de empleados y pequeños ajustes del cuadrante */
(function(){
  const esc = value => String(value ?? "").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;");
  const initials = name => String(name || "AE").trim().split(/\s+/).map(x=>x[0]).slice(0,2).join("").toUpperCase() || "AE";

  async function refreshEmployees(){
    const r=await db.from("profiles").select("id,full_name,phone,role").order("full_name");
    if(r.error) throw r.error;
    employees=r.data||[];
    return employees;
  }

  async function renderEmployeeManager(){
    try{ await refreshEmployees(); }catch(e){
      document.getElementById("content").innerHTML=`<div class="card"><h3>No se ha podido cargar el equipo</h3><p>${esc(e.message||e)}</p></div>`;
      return;
    }
    const c=document.getElementById("content");
    c.innerHTML=`<div class="admin-page">
      <div class="admin-hero">
        <div><span class="eyebrow">CONTROL DEL EQUIPO</span><h3>Gestión de empleados</h3><p class="muted">Incorpora nuevos empleados, modifica sus datos o retira a quien ya no forme parte del equipo.</p></div>
        <button class="btn" onclick="window.openEmployeeModal()">+ Nuevo empleado</button>
      </div>
      <div class="employee-stats">
        <div class="card stat"><span class="muted">Empleados actuales</span><b>${employees.length}</b></div>
        <div class="card stat"><span class="muted">Planificación</span><b>Mensual</b></div>
      </div>
      <div class="card employee-manager">
        <div class="row"><div><h3>Equipo actual</h3><p class="muted">Los cambios se guardan directamente en Supabase y se reflejan en el cuadrante.</p></div></div>
        <div class="employee-admin-list">${employees.map(e=>`<div class="employee-admin-row"><div class="employee-admin-main"><div class="avatar-small">${initials(e.full_name)}</div><div><strong>${esc(e.full_name)}</strong><small>${esc(e.role||"Empleado")} · ${esc(e.phone||"Sin teléfono")}</small></div></div><div class="employee-admin-actions"><button class="smallbtn" onclick="window.openEmployeeModal('${esc(e.id)}')">Editar</button><button class="smallbtn danger" onclick="window.removeEmployee('${esc(e.id)}')">Quitar</button></div></div>`).join("")}</div>
      </div>
    </div>`;
  }

  const previousRender=window.portalRender;
  if(typeof previousRender !== "function") return;
  window.portalRender=async function(page){
    await previousRender(page);
    if(page==="admin") await renderEmployeeManager();
  };

  window.openEmployeeModal=function(id=""){
    const employee=id?employees.find(e=>String(e.id)===String(id)):null;
    document.getElementById("employee-modal")?.remove();
    document.getElementById("screen").insertAdjacentHTML("beforeend",`<div class="modal employee-modal" id="employee-modal"><div class="card employee-form-card"><button class="close" onclick="document.getElementById('employee-modal').remove()">×</button><span class="eyebrow">PERSONAL</span><h3>${employee?"Editar empleado":"Nuevo empleado"}</h3><p class="muted">${employee?"Actualiza los datos del empleado.":"Incorpora un nuevo miembro al equipo."}</p><form onsubmit="window.submitEmployee(event,'${employee?esc(employee.id):""}')"><label>Nombre completo<input id="emp-name" required maxlength="80" value="${esc(employee?.full_name||"")}"></label><label>Teléfono<input id="emp-phone" maxlength="30" value="${esc(employee?.phone||"")}"></label><label>Rol<input id="emp-role" maxlength="40" value="${esc(employee?.role||"empleado")}"></label><div class="employee-form-actions"><button type="button" class="btn secondary" onclick="document.getElementById('employee-modal').remove()">Cancelar</button><button type="submit" class="btn">${employee?"Guardar cambios":"Añadir empleado"}</button></div></form></div></div>`);
  };

  window.submitEmployee=async function(event,id=""){
    event.preventDefault();
    const full_name=document.getElementById("emp-name")?.value.trim();
    const phone=document.getElementById("emp-phone")?.value.trim()||"";
    const role=document.getElementById("emp-role")?.value.trim()||"empleado";
    if(!full_name) return alert("Escribe el nombre del empleado.");
    const payload={full_name,phone,role};
    const r=id?await db.from("profiles").update(payload).eq("id",id):await db.from("profiles").insert({id:(crypto.randomUUID?crypto.randomUUID():"xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx"),...payload});
    if(r.error){alert(r.error.message);return;}
    document.getElementById("employee-modal")?.remove();
    await window.portalRender("admin");
  };

  window.removeEmployee=async function(id){
    const employee=employees.find(e=>String(e.id)===String(id));
    if(!employee) return;
    if(!confirm(`¿Quitar a ${employee.full_name}? También se eliminarán sus turnos del cuadrante.`)) return;
    const shifts=await db.from("shifts").delete().eq("employee_id",id);
    if(shifts.error){alert(shifts.error.message);return;}
    const r=await db.from("profiles").delete().eq("id",id);
    if(r.error){alert(r.error.message);return;}
    await window.portalRender("admin");
  };
})();
