/* Módulo de Peticiones por empleado. Se carga al final para no alterar los módulos estables existentes. */
(function(){
  const originalRender = window.render;
  const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const notify = (m,t='ok') => typeof window.toast === 'function' ? window.toast(m,t) : console.log(m);
  const isAdmin = () => window.__ATAQUE_ADMIN === true;
  const people = () => window.__ATAQUE_EMPLOYEES || window.employees || [];
  const current = () => window.__ATAQUE_CURRENT || window.current || null;

  function addPeticionNav(active=false){
    const nav=document.querySelector('.side-nav');
    if(!nav || nav.querySelector('[data-page="peticiones"]')) return;
    const b=document.createElement('button');
    b.type='button';
    b.className=`side-link ${active?'active':''}`;
    b.dataset.page='peticiones';
    b.innerHTML='<span class="side-icon">✎</span><span>Peticiones</span>';
    b.onclick=()=>window.render('peticiones');
    const novedades=Array.from(nav.querySelectorAll('.side-link')).find(x=>x.textContent.includes('Novedades'));
    if(novedades) nav.insertBefore(b,novedades); else nav.appendChild(b);
  }

  async function page(){
    const content=document.getElementById('content');
    if(!content) return;
    content.innerHTML='<div class="panel loading-panel"><div class="eyebrow">GESTIÓN PERSONAL</div><h3>Cargando peticiones…</h3><p class="muted">Preparando el espacio de cada empleado.</p></div>';
    const r=await db.from('peticiones').select('id,empleado_id,contenido,updated_at');
    if(r.error){
      content.innerHTML=`<div class="panel error-state"><h3>No se pudieron cargar las peticiones</h3><p>${esc(r.error.message)}</p><button class="btn secondary" onclick="render('inicio')">Volver a Inicio</button></div>`;
      return;
    }
    const map=new Map((r.data||[]).map(x=>[String(x.empleado_id),x]));
    const list=isAdmin()?people():people().filter(e=>String(e.id)===String(current()?.id));
    const subtitle=isAdmin()?'Consulta y edita la petición de cada empleado. Cada empleado dispone de su propia ficha.':'Escribe o modifica tu petición personal. Solo tú y el administrador podéis gestionar esta ficha.';
    content.innerHTML=`
      <div class="peticiones-page">
        <div class="calendar-toolbar">
          <div><span class="eyebrow">GESTIÓN PERSONAL</span><h3>Peticiones</h3><p class="muted">${subtitle}</p></div>
          ${isAdmin()?'<span class="petition-admin-badge">Administrador · edición completa</span>':''}
        </div>
        <div class="peticiones-grid">
          ${list.length?list.map(e=>{
            const p=map.get(String(e.id));
            const updated=p?.updated_at?new Date(p.updated_at).toLocaleString('es-ES',{dateStyle:'short',timeStyle:'short'}):'Sin registrar';
            return `<article class="petition-card" data-employee="${esc(e.id)}">
              <div class="petition-card-head"><div class="employee-cell"><span class="avatar-small">${esc((e.nombre||'').split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase())}</span><div><strong>${esc(e.nombre)}</strong><small>${isAdmin()?'Petición del empleado':'Tu petición'}</small></div></div><span class="petition-updated">Actualizada: ${esc(updated)}</span></div>
              <label class="petition-label">Petición</label>
              <textarea class="field textarea petition-text" rows="6" placeholder="Escribe aquí la petición…">${esc(p?.contenido||'')}</textarea>
              <div class="petition-actions"><span class="muted">Puedes dejarla en blanco si no tienes ninguna petición.</span><button class="btn primary" onclick="savePeticion('${esc(e.id)}')">Guardar petición</button></div>
            </article>`;
          }).join(''):`<div class="panel empty-state"><div>✎</div><h3>No hay empleado seleccionado</h3><p>Vuelve a iniciar sesión para acceder a tu petición.</p></div>`}
        </div>
      </div>`;
  }

  window.savePeticion=async function(employeeId){
    if(!isAdmin() && String(employeeId)!==String(current()?.id)){
      notify('Solo puedes editar tu propia petición','warn');
      return;
    }
    const selector=`.petition-card[data-employee="${String(employeeId).replace(/"/g,'\\"')}"]`;
    const card=document.querySelector(selector);
    const contenido=card?.querySelector('.petition-text')?.value ?? '';
    const r=await db.from('peticiones').upsert({empleado_id:employeeId,contenido,updated_at:new Date().toISOString()},{onConflict:'empleado_id'});
    if(r.error){notify(r.error.message,'error');return;}
    notify('Petición guardada correctamente');
    await page();
  };

  window.render=async function(pageName='inicio'){
    if(pageName!=='peticiones'){
      const result=await originalRender(pageName);
      setTimeout(()=>addPeticionNav(false),0);
      return result;
    }
    await originalRender('inicio');
    const heading=document.querySelector('.topbar h1');
    if(heading) heading.textContent='Peticiones';
    addPeticionNav(true);
    document.querySelectorAll('.side-nav .side-link').forEach(b=>b.classList.toggle('active',b.dataset.page==='peticiones'));
    await page();
  };

  const originalInicio=window.inicio;
  window.inicio=async function(){
    if(typeof originalInicio==='function') await originalInicio();
    setTimeout(()=>{
      addPeticionNav(false);
      const quick=document.querySelector('.quick-grid');
      if(quick && !quick.querySelector('[data-quick="peticiones"]')){
        const b=document.createElement('button');
        b.dataset.quick='peticiones';
        b.onclick=()=>window.render('peticiones');
        b.innerHTML='<strong>✎ Peticiones</strong><span>Consulta y edita tu petición personal.</span>';
        quick.appendChild(b);
      }
    },0);
  };
})();
