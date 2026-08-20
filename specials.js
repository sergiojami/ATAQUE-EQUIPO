/* Especiales: contador anual febrero-enero. Este módulo sustituye la vista mensual antigua. */
(function(){
  const esc = value => String(value ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const initials = name => String(name || 'AE').trim().split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase() || 'AE';

  function period(){
    const now = new Date();
    const year = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    const start = `${year}-02-01`;
    const end = `${year + 1}-01-31`;
    return {year,start,end,label:`01/02/${year} → 31/01/${year+1}`,cycle:`${year}/${year+1}`};
  }

  async function renderSpecials(){
    const c = document.getElementById('content');
    if(!c || typeof db === 'undefined') return;
    const p = period();
    const [empRes,rowRes] = await Promise.all([
      db.from('empleados').select('id,nombre,rol').neq('rol','admin').order('nombre'),
      db.from('especiales').select('id,empleado_id,c,v,cs,ap,b,periodo_inicio,periodo_fin')
    ]);
    if(empRes.error || rowRes.error){
      c.innerHTML = `<div class="panel error-state"><h3>No se pudo cargar Especiales</h3><p>${esc((empRes.error||rowRes.error).message)}</p></div>`;
      return;
    }

    const people = empRes.data || [];
    const rows = rowRes.data || [];
    const map = new Map(rows.map(r=>[r.empleado_id,r]));

    // Si una fila pertenece a un periodo anterior, se considera a cero para el periodo actual.
    const currentRow = e => {
      const r = map.get(e.id);
      return r && r.periodo_inicio === p.start && r.periodo_fin === p.end ? r : {c:0,v:0,cs:0,ap:0,b:0};
    };
    const total = key => people.reduce((s,e)=>s+Number(currentRow(e)[key]||0),0);
    const grand = ['c','v','cs','ap','b'].reduce((s,k)=>s+total(k),0);

    c.innerHTML = `<div class="specials-page">
      <div class="calendar-toolbar">
        <div>
          <span class="eyebrow">CONTROL DE ACTIVIDADES</span>
          <h3>Especiales</h3>
          <p class="muted">Contador anual C · V · CS · AP · B.</p>
          <div class="special-period-badge"><span>Periodo ${p.cycle}</span><strong>${p.label}</strong></div>
        </div>
        <div class="specials-total"><span>Total del periodo</span><strong>${grand}</strong></div>
      </div>
      <div class="panel specials-panel">
        <div class="specials-table-wrap">
          <table class="specials-table">
            <thead><tr><th>Empleado</th><th>C</th><th>V</th><th>CS</th><th>AP</th><th>B</th><th>Total</th></tr></thead>
            <tbody>${people.map(e=>{
              const r=currentRow(e);
              const sum=['c','v','cs','ap','b'].reduce((s,k)=>s+Number(r[k]||0),0);
              return `<tr><td><div class="special-employee"><span class="avatar-small">${initials(e.nombre)}</span><strong>${esc(e.nombre)}</strong></div></td>${['c','v','cs','ap','b'].map(k=>`<td><div class="counter"><button aria-label="Restar ${k}" onclick="window.specialAnnualChange('${e.id}','${k}',-1)">−</button><strong>${Number(r[k]||0)}</strong><button aria-label="Sumar ${k}" onclick="window.specialAnnualChange('${e.id}','${k}',1)">+</button></div></td>`).join('')}<td><span class="special-row-total">${sum}</span></td></tr>`;
            }).join('')}</tbody>
            <tfoot><tr><th>TOTALES</th>${['c','v','cs','ap','b'].map(k=>`<th>${total(k)}</th>`).join('')}<th>${grand}</th></tr></tfoot>
          </table>
        </div>
        <div class="specials-note">El contador corresponde al periodo completo febrero–enero y cambia automáticamente cada 1 de febrero.</div>
      </div>
    </div>`;
  }

  window.specialAnnualChange = async function(employeeId,field,delta){
    if(!admin || !['c','v','cs','ap','b'].includes(field)) return;
    const p = period();
    const r = await db.from('especiales').select('id,empleado_id,c,v,cs,ap,b,periodo_inicio,periodo_fin').eq('empleado_id',employeeId).maybeSingle();
    if(r.error){ alert(r.error.message); return; }
    const old = r.data && r.data.periodo_inicio===p.start && r.data.periodo_fin===p.end ? r.data : {c:0,v:0,cs:0,ap:0,b:0};
    const payload = {empleado_id:employeeId,c:Number(old.c||0),v:Number(old.v||0),cs:Number(old.cs||0),ap:Number(old.ap||0),b:Number(old.b||0),periodo_inicio:p.start,periodo_fin:p.end};
    payload[field]=Math.max(0,Number(old[field]||0)+delta);
    const save = await db.from('especiales').upsert(payload,{onConflict:'empleado_id'});
    if(save.error){ alert(save.error.message); return; }
    await renderSpecials();
  };

  // app.js llama directamente a la función global "especiales". Reemplazamos esa vista aquí.
  window.especiales = renderSpecials;
})();
