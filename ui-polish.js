(function(){
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const currentName=()=>window.__ATAQUE_ADMIN?'Administrador':(window.__ATAQUE_CURRENT?.nombre||'Empleado');
  const initials=()=>currentName().split(/\s+/).filter(Boolean).map(x=>x[0]).slice(0,2).join('').toUpperCase()||'AD';
  const monthRange=()=>{const d=new Date();const y=d.getFullYear(),m=d.getMonth();const start=`${y}-${String(m+1).padStart(2,'0')}-01`;const endDate=new Date(y,m+1,0).getDate();const end=`${y}-${String(m+1).padStart(2,'0')}-${String(endDate).padStart(2,'0')}`;return {start,end};};
  const formatDate=v=>{try{return new Date(v+'T00:00:00').toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric'});}catch{return v||'';}};
  function enhanceShell(){
    const side=document.querySelector('.sidebar');
    if(!side || side.querySelector('.ui-sidebar-account')) return;
    const bottom=side.querySelector('.sidebar-bottom');
    if(bottom){
      const account=document.createElement('div');
      account.className='ui-sidebar-account';
      account.innerHTML=`<div class="ui-account-avatar">${esc(initials())}</div><div><b>${esc(currentName())}</b><span>${window.__ATAQUE_ADMIN?'Control total':'Empleado'}</span></div><span class="ui-account-chevron">⌄</span>`;
      bottom.insertBefore(account,bottom.querySelector('.logout-side')||null);
    }
  }
  async function buildDashboard(){
    enhanceShell();
    const content=document.querySelector('#content'); if(!content) return;
    const {start,end}=monthRange();
    const [employeesR,turnsR,exR,specialR,newsR]=await Promise.all([
      Promise.resolve({data:window.__ATAQUE_EMPLOYEES||[]}),
      db.from('turnos_cuadrante').select('id').gte('fecha',start).lte('fecha',end),
      db.from('comisiones_servicio').select('id,ejercicio,fecha,lugar').gte('fecha',start).lte('fecha',end).order('fecha',{ascending:true}),
      db.from('especiales_calendario').select('id,fecha,empleado_id,tipo').gte('fecha',start).lte('fecha',end),
      db.from('novedades').select('id,titulo,contenido,autor,created_at').order('created_at',{ascending:false}).limit(3)
    ]);
    const employees=employeesR.data||[], turns=turnsR.data||[], exercises=exR.data||[], specials=specialR.data||[], news=newsR.data||[];
    const el=document.querySelector('#content');
    el.innerHTML=`<section class="ui-dashboard"><div class="dashboard-heading"><h2>Inicio</h2><p>Bienvenido a ATAQUE EQUIPO</p></div><div class="ui-stats"><article class="ui-stat blue"><div class="ui-stat-icon">♟</div><div><div class="ui-stat-label">Empleados</div><div class="ui-stat-value">${employees.length}</div><div class="ui-stat-note">Total registrados</div></div></article><article class="ui-stat green"><div class="ui-stat-icon">▣</div><div><div class="ui-stat-label">Turnos este mes</div><div class="ui-stat-value">${turns.length}</div><div class="ui-stat-note">Turnos asignados</div></div></article><article class="ui-stat purple"><div class="ui-stat-icon">✈</div><div><div class="ui-stat-label">Ejercicios activos</div><div class="ui-stat-value">${exercises.length}</div><div class="ui-stat-note">En curso</div></div></article><article class="ui-stat gold"><div class="ui-stat-icon">★</div><div><div class="ui-stat-label">Especiales este mes</div><div class="ui-stat-value">${specials.length}</div><div class="ui-stat-note">Asignaciones</div></div></article></div><div class="ui-dashboard-grid"><section class="ui-card"><div class="ui-card-head"><h3>Novedades</h3></div><div class="ui-news">${news.length?news.map((n,i)=>`<div class="ui-news-row"><div class="ui-news-icon ${i===1?'green':i===2?'gold':''}">${i===0?'▣':i===1?'★':'✦'}</div><div class="ui-news-main"><div class="ui-news-title">${esc(n.titulo)}</div><div class="ui-news-meta">${esc(formatDate((n.created_at||'').slice(0,10)))}${n.autor?' · '+esc(n.autor):''}</div></div><span class="ui-pill ${i===1?'green':i===2?'red':''}">${i===0?'Nuevo':i===1?'Actualizado':'Importante'}</span></div>`).join(''):`<div class="ui-news-row"><div class="ui-news-icon">✦</div><div class="ui-news-main"><div class="ui-news-title">No hay novedades publicadas</div><div class="ui-news-meta">El equipo no tiene comunicaciones pendientes.</div></div></div>`}</div><div class="ui-news-footer"><button onclick="render('novedades')">Ver todas las novedades&nbsp; →</button></div></section><section class="ui-card"><div class="ui-card-head"><h3>Accesos rápidos</h3></div><div class="ui-quick-list"><button class="ui-quick-item" onclick="render('cuadrantes')"><span>▣</span><span>Cuadrante de Turnos</span><span class="ui-quick-arrow">›</span></button><button class="ui-quick-item" onclick="render('empleados')" ${window.__ATAQUE_ADMIN?'':'style="display:none"'}><span>♙</span><span>Gestión de Empleados</span><span class="ui-quick-arrow">›</span></button><button class="ui-quick-item" onclick="render('especiales')"><span>★</span><span>Especiales</span><span class="ui-quick-arrow">›</span></button><button class="ui-quick-item" onclick="render('comisiones')"><span>✈</span><span>Ejercicios / Comisiones</span><span class="ui-quick-arrow">›</span></button><button class="ui-quick-item" onclick="render('novedades')"><span>▤</span><span>Novedades</span><span class="ui-quick-arrow">›</span></button></div></section></div></section>`;
  }
  const originalRender=window.render;
  if(typeof originalRender==='function'){
    window.render=async function(page){const result=await originalRender.apply(this,arguments);if(page==='inicio'){try{await buildDashboard();}catch(e){console.error('UI dashboard',e);}}else enhanceShell();return result;};
  }else{document.addEventListener('DOMContentLoaded',()=>{const r=window.render;if(typeof r==='function'){window.render=async function(page){const result=await r.apply(this,arguments);if(page==='inicio')await buildDashboard();else enhanceShell();return result;};}});}
})();
