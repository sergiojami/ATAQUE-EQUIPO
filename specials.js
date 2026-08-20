/* Apartado Especiales: contador anual febrero-enero */
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
    const format = d => d.toLocaleDateString('es-ES');
    return {start:iso(start), end:iso(end), cycle:`${year}/${year+1}`, label:`${format(start)} → ${format(end)}`};
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
    const period=getSpecialPeriod();
    const people=(empRes.data||[]).filter(e=>String(e.role||'').toLowerCase()!=='admin');
    const map=new Map((specialRes.data||[]).map(x=>[x.empleado_id,x]));
    const rowFor=e=>{const r=map.get(e.id); return r&&r.periodo_inicio===period.start&&r.periodo_fin===period.end?r:{c:0,v:0,cs:0,ap:0,b:0};};
    const total=k=>people.reduce((sum,e)=>sum+Number(rowFor(e)?.[k]||0),0);
    const grandTotal=['c','v','cs','ap','b'].reduce((s,k)=>s+total(k),0);

    c.innerHTML=`<div class="specials-page">
      <div class="calendar-toolbar">
        <div>
          <span class="eyebrow">CONTROL DE ACTIVIDADES</span>
          <h3>Especiales</h3>
          <p class="muted">Contador anual C · V · CS · AP · B.</p>
          <div class="special-period-badge"><span>Periodo ${esc(period.cycle)}</span><strong>${esc(period.label)}</strong></div>
        </div>
        <div class="specials-total"><span>Total del periodo</span><strong>${grandTotal}</strong><small>1 de febrero → 31 de enero</small></div>
      </div>
      <div class="specials-card">
        <div class="specials-table-wrap">
          <table class="specials-table">
            <thead><tr><th>Empleado</th><th><span class="special-code c">C</span></th><th><span class="special-code v">V</span></th><th><span class="special-code cs">CS</span></th><th><span class="special-code ap">AP</span></th><th><span class="special-code b">B</span></th><th>Total</th></tr></thead>
            <tbody>${people.map(e=>{const row=rowFor(e);const sum=['c','v','cs','ap','b'].reduce((s,k)=>s+Number(row[k]||0),0);return `<tr><td><div class="special-employee"><span class="avatar-small">${initials(e.full_name)}</span><div><strong>${esc(e.full_name)}</strong><small>${esc(e.role||'Empleado')}</small></div></div></td>${['c','v','cs','ap','b'].map(k=>`<td><div class="counter"><button aria-label="Restar ${k}" onclick="window.specialChange('${e.id}','${k}',-1)">−</button><strong>${Number(row[k]||0)}</strong><button aria-label="Sumar ${k}" onclick="window.specialChange('${e.id}','${k}',1)">+</button></div></td>`).join('')}<td><span class="special-row-total">${sum}</span></td></tr>`;}).join('')}</tbody>
            <tfoot><tr><th>TOTALES</th>${['c','v','cs','ap','b'].map(k=>`<th>${total(k)}</th>`).join('')}<th>${grandTotal}</th></tr></table>
        </div>
        <div class="specials-note">El contador corresponde exclusivamente al periodo <b>${esc(period.label)}</b> y cambia automáticamente cada 1 de febrero.</div>
      </div>
    </div>`;
  }

  window.specialChange=async function(employeeId,field,delta){
    if(!admin || !['c','v','cs','ap','b'].includes(field)) return;
    const period=getSpecialPeriod();
    const {data,error}=await db.from('especiales').select('id,c,v,cs,ap,b,periodo_inicio,periodo_fin').eq('empleado_id',employeeId).maybeSingle();
    if(error){alert(error.message);return;}
    const row=data&&data.periodo_inicio===period.start&&data.periodo_fin===period.end?data:{c:0,v:0,cs:0,ap:0,b:0};
    const payload={empleado_id:employeeId,c:Number(row.c||0),v:Number(row.v||0),cs:Number(row.cs||0),ap:Number(row.ap||0),b:Number(row.b||0),periodo_inicio:period.start,periodo_fin:period.end};
    payload[field]=Math.max(0,Number(row[field]||0)+delta);
    const save=await db.from('especiales').upsert(payload,{onConflict:'empleado_id'});
    if(save.error){alert(save.error.message);return;}
    await renderSpecials();
  };

  window.portalRender=async function(page){
    await originalRender(page);
    if(page==='especiales') await renderSpecials();
  };

  window.especiales=renderSpecials;
})();
