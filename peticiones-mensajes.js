/* Mensajes del administrador con respuesta/petición individual por empleado. */
(function(){
  const previousRender=window.render;
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const notify=(m,t='ok')=>typeof window.toast==='function'?window.toast(m,t):console.log(m);
  const admin=()=>window.__ATAQUE_ADMIN===true;
  const people=()=>window.__ATAQUE_EMPLOYEES||window.employees||[];
  const me=()=>window.__ATAQUE_CURRENT||window.current||null;
  const fmt=d=>d?new Date(d).toLocaleString('es-ES',{dateStyle:'short',timeStyle:'short'}):'';

  function nav(){
    const n=document.querySelector('.side-nav');
    if(!n)return;
    n.querySelectorAll('[data-page="peticiones"]').forEach((x,i)=>{if(i)x.remove();});
    let b=n.querySelector('[data-page="peticiones"]');
    if(!b){
      b=document.createElement('button');b.type='button';b.className='side-link';b.dataset.page='peticiones';
      b.innerHTML='<span class="side-icon">✎</span><span>Peticiones</span>';
      b.onclick=()=>window.render('peticiones');
      const ref=Array.from(n.querySelectorAll('.side-link')).find(x=>x.textContent.includes('Novedades'));
      if(ref)n.insertBefore(b,ref);else n.appendChild(b);
    }
    n.querySelectorAll('.side-link').forEach(x=>x.classList.toggle('active',x.dataset.page==='peticiones'));
  }

  async function loadData(){
    const [mr,rr]=await Promise.all([
      db.from('peticiones_mensajes').select('id,titulo,contenido,activo,created_at,updated_at').order('created_at',{ascending:false}),
      db.from('peticiones_respuestas').select('id,mensaje_id,empleado_id,contenido,estado,created_at,updated_at').order('updated_at',{ascending:false})
    ]);
    if(mr.error)throw mr.error;if(rr.error)throw rr.error;
    return {messages:mr.data||[],responses:rr.data||[]};
  }

  function responseBy(responses,messageId,employeeId){return responses.find(r=>String(r.mensaje_id)===String(messageId)&&String(r.empleado_id)===String(employeeId));}

  function adminMessageCard(m,responses){
    const rs=responses.filter(r=>String(r.mensaje_id)===String(m.id));
    const answered=rs.filter(r=>String(r.contenido||'').trim()).length;
    return `<article class="pm-card pm-message">
      <div class="pm-message-head"><div><span class="pm-badge ${m.activo?'':'closed'}">${m.activo?'ACTIVO':'CERRADO'}</span><h4 class="pm-message-title">${esc(m.titulo||'Mensaje')}</h4><div class="pm-meta">Publicado ${esc(fmt(m.created_at))} · ${answered}/${people().length} respuestas</div></div><div class="pm-admin-tools"><button class="btn secondary" onclick="toggleMensajeActivo('${m.id}',${!m.activo})">${m.activo?'Cerrar':'Reabrir'}</button><button class="btn secondary" onclick="eliminarMensaje('${m.id}')">Eliminar</button></div></div>
      <div class="pm-message-body">${esc(m.contenido)}</div>
      <div class="pm-admin-responses">${people().map(e=>{const r=responseBy(responses,m.id,e.id);return `<div class="pm-response-row"><div class="pm-response-row-head"><strong>${esc(e.nombre)}</strong><select class="pm-status" onchange="cambiarEstadoRespuesta('${r?.id||''}',this.value,'${m.id}','${e.id}')"><option value="pendiente" ${(!r||r.estado==='pendiente')?'selected':''}>Pendiente</option><option value="revisada" ${r?.estado==='revisada'?'selected':''}>Revisada</option><option value="cerrada" ${r?.estado==='cerrada'?'selected':''}>Cerrada</option></select></div><div class="pm-response-text">${r?.contenido?esc(r.contenido):'<span class="pm-meta">Sin respuesta todavía.</span>'}</div>${r?.updated_at?`<div class="pm-meta">Actualizada ${esc(fmt(r.updated_at))}</div>`:''}</div>`}).join('')}</div>
    </article>`;
  }

  function employeeMessageCard(m,responses){
    const id=me()?.id;
    const r=responseBy(responses,m.id,id);
    return `<article class="pm-card pm-message"><div class="pm-message-head"><div><span class="pm-badge ${m.activo?'':'closed'}">${m.activo?'MENSAJE DEL ADMINISTRADOR':'CERRADO'}</span><h4 class="pm-message-title">${esc(m.titulo||'Mensaje')}</h4><div class="pm-meta">Publicado ${esc(fmt(m.created_at))}</div></div>${r?.estado?`<span class="pm-badge ${r.estado==='cerrada'?'closed':''}">${r.estado==='pendiente'?'PENDIENTE':r.estado==='revisada'?'REVISADA':'CERRADA'}</span>`:''}</div><div class="pm-message-body">${esc(m.contenido)}</div><div class="pm-response"><label class="petition-label">Tu petición / respuesta</label><textarea id="pm-response-${m.id}" class="field textarea" rows="5" placeholder="Escribe aquí tu petición o respuesta sobre este mensaje…" ${m.activo?'':'disabled'}>${esc(r?.contenido||'')}</textarea><div class="pm-actions"><span class="pm-counter">${r?.updated_at?`Última actualización: ${esc(fmt(r.updated_at))}`:'Todavía no has respondido a este mensaje.'}</span>${m.activo?`<button class="btn primary" onclick="guardarRespuestaMensaje('${m.id}')">Enviar petición</button>`:'<span class="pm-meta">Este mensaje está cerrado.</span>'}</div></div></article>`;
  }

  async function page(){
    const content=document.getElementById('content');if(!content)return;
    content.innerHTML='<div class="panel loading-panel"><div class="eyebrow">PETICIONES</div><h3>Cargando mensajes…</h3><p class="muted">Preparando las comunicaciones del administrador.</p></div>';
    try{
      const {messages,responses}=await loadData();
      const active=messages.filter(m=>m.activo);
      content.innerHTML=`<div class="pm-wrap"><div class="pm-head"><div><span class="eyebrow">COMUNICACIÓN Y RESPUESTA</span><h3>Peticiones</h3><p class="muted">${admin()?'Publica un mensaje para el equipo y consulta la petición o respuesta de cada empleado.':'Consulta los mensajes del administrador y envía una petición o respuesta individual.'}</p></div>${admin()?'<button class="btn primary" onclick="mostrarNuevoMensaje()">+ Nuevo mensaje</button>':''}</div>${admin()?'<div id="pm-compose" class="pm-card pm-compose" style="display:none"><div><span class="eyebrow">NUEVA COMUNICACIÓN</span><h4 style="margin:.25rem 0">Mensaje para el equipo</h4></div><input id="pm-title" class="field" maxlength="120" placeholder="Título del mensaje"><textarea id="pm-body" class="field textarea" maxlength="5000" placeholder="Escribe el mensaje que quieres comunicar al equipo…"></textarea><div class="pm-actions"><span class="pm-counter">El mensaje quedará disponible para todos los empleados.</span><div><button class="btn secondary" onclick="ocultarNuevoMensaje()">Cancelar</button> <button class="btn primary" onclick="crearMensaje()">Publicar mensaje</button></div></div></div>':''}<div class="pm-grid">${(admin()?messages:active).length?(admin()?messages:active).map(m=>admin()?adminMessageCard(m,responses):employeeMessageCard(m,responses)).join(''):'<div class="pm-card pm-empty">${admin()?'Todavía no has publicado ningún mensaje.':'No hay mensajes del administrador pendientes de respuesta.'}</div>'}</div>${!admin()&&messages.length&&active.length===0?'<div class="pm-card pm-empty">Todos los mensajes están cerrados. Cuando el administrador publique uno nuevo aparecerá aquí.</div>':''}</div>`;
      nav();
    }catch(e){content.innerHTML=`<div class="panel error-state"><h3>No se pudieron cargar las peticiones</h3><p>${esc(e.message||e)}</p><button class="btn secondary" onclick="render('inicio')">Volver a Inicio</button></div>`;}
  }

  window.mostrarNuevoMensaje=()=>{const x=document.getElementById('pm-compose');if(x){x.style.display='grid';document.getElementById('pm-title')?.focus();}};
  window.ocultarNuevoMensaje=()=>{const x=document.getElementById('pm-compose');if(x)x.style.display='none';};
  window.crearMensaje=async()=>{
    if(!admin())return;
    const titulo=(document.getElementById('pm-title')?.value||'').trim();const contenido=(document.getElementById('pm-body')?.value||'').trim();
    if(!titulo||!contenido){notify('Escribe un título y el mensaje antes de publicar','warn');return;}
    const r=await db.from('peticiones_mensajes').insert({titulo,contenido,activo:true});
    if(r.error){notify(r.error.message,'error');return;}notify('Mensaje publicado para el equipo');await page();
  };
  window.guardarRespuestaMensaje=async mensajeId=>{
    if(admin()||!me()?.id)return;
    const contenido=(document.getElementById(`pm-response-${mensajeId}`)?.value||'').trim();
    if(!contenido){notify('Escribe una petición o respuesta antes de enviar','warn');return;}
    const r=await db.from('peticiones_respuestas').upsert({mensaje_id:mensajeId,empleado_id:me().id,contenido,estado:'pendiente',updated_at:new Date().toISOString()},{onConflict:'mensaje_id,empleado_id'});
    if(r.error){notify(r.error.message,'error');return;}notify('Petición enviada al administrador');await page();
  };
  window.toggleMensajeActivo=async(id,activo)=>{if(!admin())return;const r=await db.from('peticiones_mensajes').update({activo,updated_at:new Date().toISOString()}).eq('id',id);if(r.error){notify(r.error.message,'error');return;}notify(activo?'Mensaje reabierto':'Mensaje cerrado');await page();};
  window.eliminarMensaje=async id=>{if(!admin())return;if(!confirm('¿Eliminar este mensaje y todas sus respuestas?'))return;const r=await db.from('peticiones_mensajes').delete().eq('id',id);if(r.error){notify(r.error.message,'error');return;}notify('Mensaje eliminado');await page();};
  window.cambiarEstadoRespuesta=async(id,estado,mensajeId,empleadoId)=>{if(!admin())return;if(!id){notify('Ese empleado todavía no ha enviado una respuesta','warn');await page();return;}const r=await db.from('peticiones_respuestas').update({estado,updated_at:new Date().toISOString()}).eq('id',id);if(r.error){notify(r.error.message,'error');return;}notify('Estado actualizado');};

  window.render=async function(pageName='inicio'){
    if(pageName!=='peticiones')return previousRender(pageName);
    await page();
  };
})();
