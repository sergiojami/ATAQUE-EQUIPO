/* Especiales FINAL: sustituye la vista mensual que vive dentro de app.js. */
(function(){
  const esc = value => String(value ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const ini = name => String(name || '').trim().split(/\s+/).map(x => x[0] || '').slice(0,2).join('').toUpperCase();
  const isAdminNow = () => document.querySelector('.user-chip span')?.textContent?.trim() === 'Control total';

  function getPeriod(){
    const now = new Date();
    const y = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
    return { start:`${y}-02-01`, end:`${y+1}-01-31`, cycle:`${y}/${y+1}`, label:`01/02/${y} → 31/01/${y+1}` };
  }

  async function loadAnnual(){
    const content = document.getElementById('content');
    if(!content || typeof db === 'undefined') return;
    const p = getPeriod();
    const [empRes,rowRes] = await Promise.all([
      db.from('empleados').select('id,nombre,rol').neq('rol','admin').order('nombre'),
      db.from('especiales').select('id,empleado_id,c,v,cs,ap,b,periodo_inicio,periodo_fin')
    ]);
    if(empRes.error || rowRes.error){
      content.innerHTML=`<div class="panel error-state"><h3>No se pudo cargar Especiales</h3><p>${esc((empRes.error||rowRes.error).message)}</p></div>`;
      return;
    }
    const people=empRes.data||[];
    const rows=rowRes.data||[];
    const map=new Map(rows.map(r=>[r.empleado_id,r]));
    const rowFor=e=>{ const r=map.get(e.id); return r && r.periodo_inicio===p.start && r.periodo_fin===p.end ? r : {c:0,v:0,cs:0,ap:0,b:0}; };
    const total=k=>people.reduce((s,e)=>s+Number(rowFor(e)[k]||0),0);
    const grand=['c','v','cs','ap','b'].reduce((s,k)=>s+total(k),0);
    const admin=isAdminNow();

    content.innerHTML=`<div class="specials-page">
      <div class="calendar-toolbar">
        <div><span class="eyebrow">CONTROL DE ACTIVIDADES</span><h3>Especiales</h3><p class="muted">Contador anual de C · V · CS · AP · B.</p><div class="special-period-badge"><span>Periodo ${p.cycle}</span><strong>${p.label}</strong></div></div>
        <div class="specials-total"><span>Total del periodo</span><strong>${grand}</strong></div>
      </div>
      <div class="panel specials-panel"><div class="table-scroll"><table class="specials-table"><thead><tr><th>Empleado</th><th>C</th><th>V</th><th>CS</th><th>AP</th><th>B</th><th>Total</th></tr></thead><tbody>
      ${people.map(e=>{const r=rowFor(e);const sum=['c','v','cs','ap','b'].reduce((s,k)=>s+Number(r[k]||0),0);return `<tr><th><div class="employee-cell"><span class="avatar-small">${ini(e.nombre)}</span><strong>${esc(e.nombre)}</strong></div></th>${['c','v','cs','ap','b'].map(k=>admin?`<td><div class="counter"><button onclick="window.specialAnnualChange('${e.id}','${k}',-1)">−</button><span class="count">${Number(r[k]||0)}</span><button onclick="window.specialAnnualChange('${e.id}','${k}',1)">+</button></div></td>`:`<td><span class="count readonly">${Number(r[k]||0)}</span></td>`).join('')}<td class="total-cell">${sum}</td></tr>`;}).join('')}
      </tbody><tfoot><tr><th>TOTALES</th>${['c','v','cs','ap','b'].map(k=>`<th>${total(k)}</th>`).join('')}<th>${grand}</th></tr></tfoot></table></div>
      <div class="specials-note">El contador corresponde al periodo completo <b>febrero–enero</b> y cambia automáticamente cada 1 de febrero.</div></div></div>`;
  }

  window.specialAnnualChange=async function(employeeId,field,delta){
    if(!isAdminNow() || !['c','v','cs','ap','b'].includes(field)) return;
    const p=getPeriod();
    const q=await db.from('especiales').select('id,c,v,cs,ap,b,periodo_inicio,periodo_fin').eq('empleado_id',employeeId).maybeSingle();
    if(q.error){alert(q.error.message);return;}
    const same=q.data && q.data.periodo_inicio===p.start && q.data.periodo_fin===p.end;
    const old=same?q.data:{c:0,v:0,cs:0,ap:0,b:0};
    const payload={empleado_id:employeeId,c:Number(old.c||0),v:Number(old.v||0),cs:Number(old.cs||0),ap:Number(old.ap||0),b:Number(old.b||0),periodo_inicio:p.start,periodo_fin:p.end};
    payload[field]=Math.max(0,Number(old[field]||0)+delta);
    const r=await db.from('especiales').upsert(payload,{onConflict:'empleado_id'});
    if(r.error){alert(r.error.message);return;}
    await loadAnnual();
  };

  window.resetAnnualSpecials=async function(){
    if(!isAdminNow()) return;
    if(!confirm('¿Restablecer todos los contadores del periodo actual?')) return;
    const p=getPeriod();
    const r=await db.from('especiales').update({c:0,v:0,cs:0,ap:0,b:0,periodo_inicio:p.start,periodo_fin:p.end}).neq('id','00000000-0000-0000-0000-000000000000');
    if(r.error){alert(r.error.message);return;}
    await loadAnnual();
  };

  const originalRender=window.render;
  if(typeof originalRender==='function'){
    window.render=function(page){ if(page==='especiales'){ const S=document.getElementById('screen'); if(S) S.querySelector('.topbar-left h1')?.replaceChildren(document.createTextNode('Especiales')); originalRender('especiales'); setTimeout(loadAnnual,0); return; } return originalRender.apply(this,arguments); };
  }
  window.renderAnnualSpecials=loadAnnual;
  window.addEventListener('load',()=>{ if(location.hash==='#especiales') loadAnnual(); });
})();
