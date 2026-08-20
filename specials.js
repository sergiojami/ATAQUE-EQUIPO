/* Apartado Especiales: C · V · CS · AP · B */
(function(){
  const esc = value => String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#039;');
  const initials = name => String(name || 'AE').trim().split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase() || 'AE';
  const originalRender = window.portalRender;
  const originalSetRoster = window.setRoster;
  if(typeof originalRender !== 'function') return;

  window.setRoster = async function(...args){
    if(!admin){ alert('Solo el administrador puede modificar el cuadrante.'); return; }
    return originalSetRoster(...args);
  };

  // El contador de Especiales trabaja por ciclo anual operativo:
  // 1 de enero del año en curso hasta el 31 de enero del año siguiente.
  // Durante enero se mantiene el ciclo iniciado el 1 de enero del año anterior.
  function getSpecialPeriod(baseDate = new Date()){
    const year = baseDate.getMonth() === 0 ? baseDate.getFullYear() - 1 : baseDate.getFullYear();
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 31);
    const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const format = value => new Date(`${value}T00:00:00`).toLocaleDateString('es-ES');
    return { start: iso(start), end: iso(end), label: `${format(iso(start))} – ${format(iso(end))}` };
  }

  async function ensureCurrentPeriod(rows){
    const period = getSpecialPeriod();
    const needsReset = (rows || []).some(row => row.periodo_inicio !== period.start || row.periodo_fin !== period.end);
    if(!needsReset) return period;

    const reset = await db.from('especiales').update({
      c:0, v:0, cs:0, ap:0, b:0,
      periodo_inicio: period.start,
      periodo_fin: period.end
    }).neq('empleado_id','00000000-0000-0000-0000-000000000000');
    if(reset.error) throw reset.error;
    return period;
  }

  async function renderSpecials(){
    const c=document.getElementById('content');
    if(!c) return;
    const [empRes,specialRes]=await Promise.all([
      db.from('profiles').select('id,full_name,phone,role').order('full_name'),
      db.from('especiales').select('id,empleado_id,c,v,cs,ap,b,periodo_inicio,periodo_fin')
    ]);
    if(empRes.error || specialRes.error){
      c.innerHTML=`<div class="card error-state"><h3>No se pudo cargar Especiales</h3><p>${esc((empRes.error||specialRes.error)?.message||'Error de conexión')}</p></div>`;
      return;
    }

    let period;
    try {
      period = await ensureCurrentPeriod(specialRes.data || []);
    } catch(error) {
      c.innerHTML=`<div class="card error-state"><h3>No se pudo actualizar el periodo de Especiales</h3><p>${esc(error?.message||'Error de conexión')}</p></div>`;
      return;
    }

    // Volvemos a leer los contadores después de un posible cambio de periodo.
    const freshRes = await db.from('especiales').select('id,empleado_id,c,v,cs,ap,b,periodo_inicio,periodo_fin');
    if(freshRes.error){
      c.innerHTML=`<div class="card error-state"><h3>No se pudo cargar Especiales</h3><p>${esc(freshRes.error.message||'Error de conexión')}</p></div>`;
      return;
    }

    const people=(empRes.data||[]).filter(e=>String(e.role||'').toLowerCase()!=='admin');
    const map=new Map((freshRes.data||[]).map(x=>[x.empleado_id,x]));
    const total=k=>people.reduce((sum,e)=>sum+Number(map.get(e.id)?.[k]||0),0);
    const grandTotal=['c','v','cs','ap','b'].reduce((s,k)=>s+total(k),0);

    c.innerHTML=`<div class="specials-page">
      <div class="calendar-toolbar">
        <div>
          <span class="eyebrow">CONTROL DE ACTIVIDADES</span>
          <h3>Especiales</h3>
          <p class="muted">Contadores acumulados por empleado dentro del periodo anual operativo.</p>
          <div class="special-period-badge"><span>Periodo activo</span><strong>${esc(period.label)}</strong></div>
        </div>
        <div class="specials-total"><span>Total registros</span><strong>${grandTotal}</strong><small>en el periodo activo</small></div>
      </div>
      <div class="specials-card">
        <div class="specials-table-wrap">
          <table class="specials-table">
            <thead><tr><th>Empleado</th><th><span class="special-code c">C</span></th><th><span class="special-code v">V</span></th><th><span class="special-code cs">CS</span></th><th><span class="special-code ap">AP</span></th><th><span class="special-code b">B</span></th><th>Total</th></tr></thead>
            <tbody>${people.map(e=>{
              const row=map.get(e.id)||{c:0,v:0,cs:0,ap:0,b:0};
              const sum=['c','v','cs','ap','b'].reduce((s,k)=>s+Number(row[k]||0),0);
              return `<tr><td><div class="special-employee"><span class="avatar-small">${initials(e.full_name)}</span><div><strong>${esc(e.full_name)}</strong><small>${esc(e.role||'Empleado')}</small></div></div></td>${['c','v','cs','ap','b'].map(k=>`<td><div class="counter"><button aria-label="Restar ${k}" onclick="window.specialChange('${e.id}','${k}',-1)">−</button><strong>${Number(row[k]||0)}</strong><button aria-label="Sumar ${k}" onclick="window.specialChange('${e.id}','${k}',1)">+</button></div></td>`).join('')}<td><span class="special-row-total">${sum}</span></td></tr>`;
            }).join('')}</tbody>
            <tfoot><tr><th>TOTALES</th>${['c','v','cs','ap','b'].map(k=>`<th>${total(k)}</th>`).join('')}<th>${grandTotal}</th></tr></table>
        </div>
        <div class="specials-note">
          <span>Las columnas significan <b>C</b>, <b>V</b>, <b>CS</b>, <b>AP</b> y <b>B</b>. El contador se reinicia automáticamente al comenzar un nuevo periodo.</span>
          ${admin?'<button class="btn secondary" onclick="window.resetSpecials()">↺ Restablecer periodo actual</button>':'<span>Los contadores pueden registrarse desde cualquier usuario.</span>'}
        </div>
      </div>
    </div>`;
  }

  window.specialChange=async function(employeeId,field,delta){
    if(!current && !admin) return;
    if(!['c','v','cs','ap','b'].includes(field)) return;
    const period = getSpecialPeriod();
    const {data,error}=await db.from('especiales').select('id,c,v,cs,ap,b,periodo_inicio,periodo_fin').eq('empleado_id',employeeId).maybeSingle();
    if(error){alert(error.message);return;}

    const isCurrent = data && data.periodo_inicio === period.start && data.periodo_fin === period.end;
    const row=isCurrent ? data : {c:0,v:0,cs:0,ap:0,b:0};
    const next=Math.max(0,Number(row[field]||0)+delta);
    const payload={empleado_id:employeeId,c:Number(row.c||0),v:Number(row.v||0),cs:Number(row.cs||0),ap:Number(row.ap||0),b:Number(row.b||0),periodo_inicio:period.start,periodo_fin:period.end,[field]:next};
    const r=await db.from('especiales').upsert(payload,{onConflict:'empleado_id'});
    if(r.error){alert(r.error.message);return;}
    await renderSpecials();
  };

  window.resetSpecials=async function(){
    if(!admin) return;
    if(!confirm('¿Restablecer todos los contadores de Especiales del periodo actual?')) return;
    const period=getSpecialPeriod();
    const r=await db.from('especiales').update({c:0,v:0,cs:0,ap:0,b:0,periodo_inicio:period.start,periodo_fin:period.end}).neq('empleado_id','00000000-0000-0000-0000-000000000000');
    if(r.error){alert(r.error.message);return;}
    await renderSpecials();
  };

  window.portalRender=async function(page){
    await originalRender(page);
    if(page==='especiales'){
      const h=document.querySelector('.topbar-left h1');
      if(h) h.textContent='Especiales';
      await renderSpecials();
    }
    if(page==='cuadrantes'){
      document.querySelectorAll('.shift-calendar input').forEach(input=>{input.disabled=!admin;});
      document.querySelectorAll('.calendar-actions button').forEach(btn=>{if(!admin) btn.style.display='none';});
      const p=document.querySelector('.calendar-page .muted');
      if(p) p.innerHTML=admin?'Vista mensual profesional · el administrador puede asignar M o T.':'Vista mensual profesional · modo consulta. Solo el administrador puede modificar el cuadrante.';
    }
  };

  function injectNav(){
    const nav=document.querySelector('.side-nav');
    if(!nav || nav.querySelector('[data-specials-nav]')) return;
    const btn=document.createElement('button');
    btn.className='side-link'; btn.dataset.specialsNav='1'; btn.innerHTML='<span class="side-icon">★</span><span>Especiales</span>'; btn.onclick=()=>window.portalRender('especiales');
    const ref=nav.querySelector('button[onclick*="novedades"]');
    ref ? ref.insertAdjacentElement('afterend',btn) : nav.appendChild(btn);
  }
  const observer=new MutationObserver(()=>injectNav());
  observer.observe(document.getElementById('screen'),{childList:true,subtree:true});
  injectNav();
})();
