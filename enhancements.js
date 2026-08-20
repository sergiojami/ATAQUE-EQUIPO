/* Gestión de empleados: altas, edición, baja definitiva y puesto. */
(function(){
  const esc=v=>String(v??"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&#039;");
  const initials=n=>String(n||"AE").trim().split(/\s+/).map(x=>x[0]).slice(0,2).join("").toUpperCase()||"AE";
  async function refreshEmployees(){
    const r=await db.from("profiles").select("id,full_name,phone,role,puesto").order("puesto",{ascending:true,nullsFirst:false}).order("full_name");
    if(r.error) throw r.error; employees=r.data||[]; return employees;
  }
  async function renderEmployeeManager(){
    try{await refreshEmployees();}catch(e){document.getElementById("content").innerHTML=`<div class="card"><h3>No se ha podido cargar el equipo</h3><p>${esc(e.message||e)}</p></div>`;return;}
    const c=document.getElementById("content");
    c.innerHTML=`<div class="admin-page"><div class="admin-hero"><div><span class="eyebrow">CONTROL DEL EQUIPO</span><h3>Gestión de empleados</h3><p class="muted">Añade, edita o elimina empleados y asigna su puesto.</p></div><button class="btn" onclick="window.openEmployeeModal()">+ Nuevo empleado</button></div><div class="employee-stats"><div class="card stat"><span class="muted">Empleados actuales</span><b>${employees.length}</b></div></div><div class="card employee-manager"><div class="row"><div><h3>Equipo actual</h3><p class="muted">El puesto determina el orden.</p></div></div><div class="employee-admin-list">${employees.map(e=>`<div class="employee-admin-row"><div class="employee-admin-main"><div class="avatar-small">${initials(e.full_name)}</div><div><strong>${esc(e.full_name)}</strong><small>Puesto ${e.puesto??"—"} · ${esc(e.role||"Empleado")} · ${esc(e.phone||"Sin teléfono")}</small></div></div><div class="employee-admin-actions"><button class="smallbtn" onclick="window.openEmployeeModal('${esc(e.id)}')">Editar</button><button class="smallbtn danger" onclick="window.removeEmployee('${esc(e.id)}')">Eliminar</button></div></div>`).join("")}</div></div></div>`;
  }
  const previousRender=window.portalRender;if(typeof previousRender!=="function")return;
  window.portalRender=async function(page){await previousRender(page);if(page==="admin")await renderEmployeeManager();};
  window.openEmployeeModal=function(id=""){
    const e=id?employees.find(x=>String(x.id)===String(id)):null;document.getElementById("employee-modal")?.remove();
    document.getElementById("screen").insertAdjacentHTML("beforeend",`<div class="modal employee-modal" id="employee-modal"><div class="card employee-form-card"><button class="close" onclick="document.getElementById('employee-modal').remove()">×</button><span class="eyebrow">PERSONAL</span><h3>${e?"Editar empleado":"Nuevo empleado"}</h3><form onsubmit="window.submitEmployee(event,'${e?esc(e.id):""}')"><label>Nombre completo<input id="emp-name" required maxlength="80" value="${esc(e?.full_name||"")}"></label><label>Puesto<input id="emp-puesto" type="number" min="1" max="99" required value="${e?.puesto??""}"></label><label>Teléfono<input id="emp-phone" maxlength="30" value="${esc(e?.phone||"")}"></label><label>Rol<input id="emp-role" maxlength="40" value="${esc(e?.role||"empleado")}"></label><div class="employee-form-actions"><button type="button" class="btn secondary" onclick="document.getElementById('employee-modal').remove()">Cancelar</button><button type="submit" class="btn">${e?"Guardar cambios":"Añadir empleado"}</button></div></form></div></div>`);
  };
  window.submitEmployee=async function(event,id=""){
    event.preventDefault();const full_name=document.getElementById("emp-name")?.value.trim();const puesto=Number(document.getElementById("emp-puesto")?.value);const phone=document.getElementById("emp-phone")?.value.trim()||"";const role=document.getElementById("emp-role")?.value.trim()||"empleado";
    if(!full_name)return alert("Escribe el nombre del empleado.");if(!Number.isInteger(puesto)||puesto<1)return alert("El puesto debe ser un número entero mayor que 0.");
    const duplicate=employees.find(e=>Number(e.puesto)===puesto&&String(e.id)!==String(id));if(duplicate)return alert(`El puesto ${puesto} ya está asignado a ${duplicate.full_name}.`);
    const payload={full_name,phone,role,puesto};const r=id?await db.from("profiles").update(payload).eq("id",id):await db.from("profiles").insert({id:crypto.randomUUID(),...payload});
    if(r.error){alert(r.error.message);return;}document.getElementById("employee-modal")?.remove();await window.portalRender("admin");
  };
  window.removeEmployee=async function(id){const e=employees.find(x=>String(x.id)===String(id));if(!e)return;if(!confirm(`¿Eliminar definitivamente a ${e.full_name}?`))return;const r=await db.from("profiles").delete().eq("id",id);if(r.error){alert(r.error.message);return;}await window.portalRender("admin");};
})();
