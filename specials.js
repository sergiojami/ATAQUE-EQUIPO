/* Apartado Especiales: contador anual C · V · CS · AP · B */
(function(){
  const esc = value => String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\"/g,'&quot;').replace(/'/g,'&#039;');
  const initials = name => String(name || 'AE').trim().split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase() || 'AE';
  const originalRender = window.portalRender;
  if(typeof originalRender !== 'function') return;

  function getSpecialPeriod(baseDate = new Date()){
    const year = baseDate.getMonth() === 0 ? baseDate.getFullYear() - 1 : baseDate.getFullYear();
    const start = new Date(year, 1, 1);
    const end = new Date(year + 1, 0, 31);
    const iso = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const format = value => new Date(`${value}T00:00:00`).toLocaleDateString('es-ES');
    return { start: iso(start), end: iso(end), label: `${format(iso(start))} – ${format(iso(end))}`, cycle: `${year}/${year + 1}` };
  }

  async function ensureCurrentPeriod(rows){
    const period = getSpecialPeriod();
    const needsReset = (rows || []).some(row => row.periodo_inicio !== period.start || row.periodo_fin !== period.end);
    if(!needsReset) return period;
    const reset = await db.from('especiales').update({ c:0, v:0, cs:0, ap:0, b:0, periodo_inicio:period.start, periodo_fin:period.end }).neq('empleado_id','00000000-0000-0000-0000-000000000000');
    if(reset.error) throw reset.error;
    return period;
  }

  async function renderSpecials(){
    const c=document.getElementById('content');
    if(!c) return;
    const [empRes,specialRes]=await Promise.all([
      db.from('profiles').select('id,full_name,role').order('full_name'),
      db.from('especiales').select('id,empleado_id,c,v,cs,ap,b,periodo_inicio,periodo_fin')
    ]);
    if(empRes.error || specialRes.error){
      c.innerHTML=`<div class="card error-state"><h3>No se pudo cargar Especiales</h3><p>${esc((empRes.error||specialRes.error)?.message||'Error de conexión')}</p></div>`;
      return;
    }
    let period;
    try { period = await ensureCurrentPeriod(specialRes.data || []); }
    catch(error){
      c.innerHTML=`<div class="card error-state"><h3>No se pudo actualizar el periodo de Especiales</h3><p>${esc(error?.message||'Error de conexión')}</p></div>`;
      return;
    }
    const freshRes=await db.from('especiales').select('id,empleado_id,c,v,cs,ap,b,periodo_inicio,periodo_fin');
    if(freshRes.error){
      c.innerHTML=`<div class="card error-state"><h3>No se pudo cargar Especiales</h3><p>${esc(freshRes.error.message||'Error de conexión')}</p></div>`;
      return;
    }
    const people=(empRes.data||[]).filter(e=>String(e.role||'').toLowerCase()!=='admin');
    const map=new Map((freshRes.data||[]).map(x=>[x.empleado_id,x]));
    const total=k=>people.reduce((sum,e)=>sum+Number(map.get(e.id)?.[k]||0),0);
    const grandTotal=['c','v','cs','ap','b'].reduce((s,k)=>s+total(k),0);
    c.innerHTML=`<div class="specials-page">
      <div class="specials-card">
        <div class="calendar-toolbar">
          <div>
            <span class="eyebrow">CONTROL DE ACTIVIDADES</span>
            <h3>Especiales</h3>
            <p class="muted">Contador anual del periodo operativo febrero–enero.</p>
            <div class="special-period-badge"><span>Periodo ${esc(period.cycle)}</span><strong>${esc(period.label)}</strong></div>
          </div>
          <div class="specials-total"><span>Total</span><strong>${grandTotal}</strong><small>especiales del periodo</small></div>
        </div>
        <div class="specials-table-wrap">
          <table class="specials-table">
            <thead><tr><th>Empleado</th><th>C</th><th>V</th><th>CS</th><th>AP</th><th>B</th><th>Total</th></tr></thead>
            <tbody>${people.map(e=>{
              const row=map.get(e.id)||{c:0,v:0,cs:0,ap:0,b:0};
              const sum=['c','v','cs','ap','b'].reduce((s,k)=>s+Number(row[k]||0),0);
              return `<tr><td><div class="special-employee"><span class="avatar-small">${initials(e.full_name)}</span><div><strong>${esc(e.full_name)}</strong></div></div></td>${['c','v','cs','ap','b'].map(k=>`<td><div class="counter"><button aria-label="Restar ${k}" onclick="window.specialChange('${e.id}','${k}',-1)">−</button><strong>${Number(row[k]||0)}</strong><button aria-label="Sumar ${k}" onclick="window.specialChange('${e.id}','${k}',1)">+</button></div></td>`).join('')}<td><span class="special-row-total">${sum}</span></td></tr>`;
            }).join('')}</tbody>
            <tfoot><tr><th>TOTALES</th>${['c','v','cs','ap','b'].map(k=>`<th>${total(k)}</th>`).join('')}<th>${grandTotal}</th></tr></table>
        </div>
        <div class="specials-note"><span>El contador se reinicia automáticamente el 1 de febrero. No se elimina el histórico de registros.</span>${admin?'<button class="btn secondary" onclick="window.resetSpecials()">↺ Restablecer periodo actual</button>':''}</div>
      </div>
    </div>`;
  }

  window.specialChange=async function(employeeId,field,delta){
    if(!current && !admin) return;
    if(!['c','v','cs','ap','b'].includes(field)) return;
    const period=getSpecialPeriod();
    const {data,error}=await db.from('especiales').select('id,c,v,cs,ap,b,periodo_inicio,periodo_fin').eq('empleado_id',employeeId).maybeSingle();
    if(error){alert(error.message);return;}
    const isCurrent=data && data.periodo_inicio===period.start && data.periodo_fin===period.end;
    const row=isCurrent?data:{c:0,v:0,cs:0,ap:0,b:0};
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
  };
})();
