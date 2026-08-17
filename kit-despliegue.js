/* Kit de Despliegue: apartado compartido y editable por todos los empleados. */
(function(){
  const oldRender = window.render;
  if (typeof oldRender !== 'function') return;
  const $ = s => document.querySelector(s);
  const esc = v => String(v ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const currentName = () => window.__ATAQUE_ADMIN ? 'Administrador' : (window.__ATAQUE_CURRENT?.nombre || 'Empleado');
  const notify = (m,t='ok') => typeof window.toast === 'function' ? window.toast(m,t) : alert(m);

  function addNavigation(){
    const nav = document.querySelector('.side-nav');
    if(nav && !nav.querySelector('[data-kit-nav]')){
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='side-link';
      btn.dataset.kitNav='1';
      btn.innerHTML='<span class="side-icon">▣</span><span>Kit de Despliegue</span>';
      btn.onclick=()=>window.render('kit');
      nav.appendChild(btn);
    }
  }

  function markNavigation(active){
    document.querySelectorAll('.side-nav .side-link').forEach(b=>b.classList.remove('active'));
    const b=document.querySelector('[data-kit-nav]');
    if(active && b) b.classList.add('active');
  }

  function addHomeQuickAccess(){
    const grid=document.querySelector('.quick-grid');
    if(grid && !grid.querySelector('[data-kit-quick]')){
      const b=document.createElement('button');
      b.dataset.kitQuick='1';
      b.innerHTML='<strong>▣ Kit de Despliegue</strong><span>Material, cantidades y observaciones del equipo.</span>';
      b.onclick=()=>window.render('kit');
      grid.appendChild(b);
    }
  }

  async function loadKit(){
    const r=await db.from('kit_despliegue').select('id,elemento,cantidad,observaciones,actualizado_por,updated_at').order('id');
    if(r.error) throw r.error;
    return r.data||[];
  }

  function renderRows(rows){
    return rows.length ? rows.map(row=>`<tr data-kit-row="${row.id}">
      <td><input class="kit-input kit-element" value="${esc(row.elemento)}" placeholder="Ej.: Botiquín, chalecos, linternas..."></td>
      <td><input class="kit-input kit-qty" type="number" min="0" step="1" value="${Number(row.cantidad)||0}"></td>
      <td><textarea class="kit-input kit-notes" rows="2" placeholder="Observaciones">${esc(row.observaciones)}</textarea></td>
      <td><span class="kit-updated">${esc(row.actualizado_por||'—')}<small>${row.updated_at?new Date(row.updated_at).toLocaleString('es-ES'):''}</small></span></td>
      <td class="kit-actions"><button class="btn primary small" onclick="saveKitRow(${row.id})">Guardar</button><button class="btn secondary small" onclick="deleteKitRow(${row.id})">Eliminar</button></td>
    </tr>`).join('') : '<tr><td colspan="5" class="kit-empty">Todavía no hay material registrado. Pulsa <b>+ Añadir elemento</b> para comenzar.</td></tr>';
  }

  async function page(){
    const content=$('#content');
    if(!content) return;
    content.innerHTML='<div class="panel kit-loading"><span class="eyebrow">GESTIÓN DE MATERIAL</span><h3>Cargando Kit de Despliegue…</h3></div>';
    try{
      const rows=await loadKit();
      content.innerHTML=`<section class="kit-page">
        <div class="kit-header">
          <div><span class="eyebrow">GESTIÓN OPERATIVA</span><h2>Kit de Despliegue</h2><p class="muted">Listado compartido del material de despliegue. <b>Todos los empleados pueden editarlo.</b></p></div>
          <div class="kit-header-actions"><button class="btn primary" onclick="addKitRow()">+ Añadir elemento</button><button class="btn secondary" onclick="render('kit')">↻ Actualizar</button></div>
        </div>
        <div class="kit-info-grid"><div class="kit-info-card"><span>Elementos</span><b id="kit-count">${rows.length}</b><small>Registrados en el kit</small></div><div class="kit-info-card"><span>Última actualización</span><b id="kit-last">${rows.length?new Date(Math.max(...rows.map(r=>new Date(r.updated_at||r.created_at||0).getTime()))).toLocaleDateString('es-ES'):'—'}</b><small>Fecha del último cambio</small></div><div class="kit-info-card"><span>Acceso</span><b>Equipo</b><small>Editable por todos los empleados</small></div></div>
        <div class="panel kit-panel"><div class="kit-table-wrap"><table class="kit-table"><thead><tr><th>Elemento</th><th>Cantidad</th><th>Observaciones</th><th>Actualizado por</th><th>Acciones</th></tr></thead><tbody id="kit-body">${renderRows(rows)}</tbody></table></div></div>
        <p class="kit-help">Los cambios se guardan directamente en la aplicación y quedan disponibles para el resto del equipo.</p>
      </section>`;
    }catch(e){content.innerHTML=`<div class="panel error-state"><h3>No se pudo cargar Kit de Despliegue</h3><p>${esc(e.message||e)}</p><button class="btn primary" onclick="render('kit')">Reintentar</button></div>`;}
  }

  window.addKitRow=async function(){
    const r=await db.from('kit_despliegue').insert({elemento:'',cantidad:1,observaciones:'',actualizado_por:currentName()}).select('id,elemento,cantidad,observaciones,actualizado_por,updated_at').single();
    if(r.error){notify(r.error.message,'error');return;}
    await page();
    setTimeout(()=>document.querySelector(`[data-kit-row="${r.data.id}"] .kit-element`)?.focus(),50);
    notify('Elemento añadido. Completa los datos y pulsa Guardar.');
  };

  window.saveKitRow=async function(id){
    const row=document.querySelector(`[data-kit-row="${id}"]`);
    if(!row) return;
    const elemento=row.querySelector('.kit-element')?.value.trim()||'';
    const cantidad=Math.max(0,Number(row.querySelector('.kit-qty')?.value||0));
    const observaciones=row.querySelector('.kit-notes')?.value||'';
    if(!elemento){notify('Indica el nombre del elemento.','warn');return;}
    const r=await db.from('kit_despliegue').update({elemento,cantidad,observaciones,actualizado_por:currentName()}).eq('id',id);
    if(r.error){notify(r.error.message,'error');return;}
    notify('Kit actualizado correctamente.');
    await page();
  };

  window.deleteKitRow=async function(id){
    if(!confirm('¿Eliminar este elemento del Kit de Despliegue?')) return;
    const r=await db.from('kit_despliegue').delete().eq('id',id);
    if(r.error){notify(r.error.message,'error');return;}
    notify('Elemento eliminado.');
    await page();
  };

  window.render=function(pageName){
    if(pageName==='kit'){
      oldRender('inicio');
      addNavigation();
      markNavigation(true);
      const title=document.querySelector('.topbar h1'); if(title) title.textContent='Kit de Despliegue';
      const eyebrow=document.querySelector('.topbar .eyebrow'); if(eyebrow) eyebrow.textContent='AVIÓNICA DE ATAQUE';
      page();
      return;
    }
    oldRender(pageName);
    setTimeout(()=>{addNavigation(); if(pageName==='inicio') addHomeQuickAccess();},0);
  };

  setTimeout(()=>{addNavigation(); if(document.querySelector('.quick-grid')) addHomeQuickAccess();},0);
})();
