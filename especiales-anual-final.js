/* Especiales anual: contador derivado exclusivamente de las casillas de Cuadrantes. */
(function(){
  const esc = value => String(value ?? '').replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const ini = name => String(name || '').trim().split(/\s+/).map(x => x[0] || '').slice(0,2).join('').toUpperCase();
  const SPECIAL=['C','V','CS','AP','B'];
  function getPeriod(){const now=new Date();const y=now.getMonth()===0?now.getFullYear()-1:now.getFullYear();return {start:`${y}-02-01`,end:`${y+1}-01-31`,cycle:`${y}/${y+1}`,label:`01/02/${y} → 31/01/${y+1}`};}
  async function loadAnnual(){
    const content=document.getElementById('content'); if(!content||typeof db==='undefined')return;
    const p=getPeriod();
    const [empRes,calRes]=await Promise.all([
      db.from('empleados').select('id,nombre,puesto,rol').neq('rol','admin').order('puesto',{ascending:true,nullsFirst:false}).order('nombre'),
      db.from('especiales_calendario').select('empleado_id,fecha,tipo').gte('fecha',p.start).lte('fecha',p.end).in('tipo',SPECIAL)
    ]);
    if(empRes.error||calRes.error){content.innerHTML=`<div class="panel error-state"><h3>No se pudo cargar Especiales</h3><p>${esc((empRes.error||calRes.error).message)}</p></div>`;return;}
    const people=empRes.data||[],marks=calRes.data||[];
    const counters=new Map(people.map(e=>[e.id,{c:0,v:0,cs:0,ap:0,b:0}]));
    marks.forEach(r=>{const c=counters.get(r.empleado_id);if(!c)return;const k=String(r.tipo||'').toLowerCase();if(Object.prototype.hasOwnProperty.call(c,k))c[k]++;});
    const grand=people.reduce((sum,e)=>{const c=counters.get(e.id);return sum+Object.values(c).reduce((a,v)=>a+v,0)},0);
    content.innerHTML=`<div class="specials-page"><div class="calendar-toolbar"><div><span class="eyebrow">CONTROL DE ACTIVIDADES</span><h3>Especiales</h3><p class="muted">Contador anual calculado exclusivamente desde las casillas marcadas en Cuadrantes.</p><div class="special-period-badge"><span>Periodo ${p.cycle}</span><strong>${p.label}</strong></div></div><div class="specials-total"><span>Total del periodo</span><strong>${grand}</strong></div></div><div class="panel specials-panel"><div class="table-scroll"><table class="specials-table"><thead><tr><th>Empleado</th><th>C</th><th>V</th><th>CS</th><th>AP</th><th>B</th><th>Total</th></tr></thead><tbody>${people.map(e=>{const r=counters.get(e.id),sum=Object.values(r).reduce((a,v)=>a+v,0);return `<tr><th><div class="employee-cell"><span class="avatar-small">${ini(e.nombre)}</span><strong>${esc(e.nombre)}</strong></div></th><td><span class="count readonly">${r.c}</span></td><td><span class="count readonly">${r.v}</span></td><td><span class="count readonly">${r.cs}</span></td><td><span class="count readonly">${r.ap}</span></td><td><span class="count readonly">${r.b}</span></td><td class="total-cell">${sum}</td></tr>`;}).join('')}</tbody></table></div><div class="specials-note">El contador se calcula leyendo las casillas C · V · CS · AP · B de <b>Cuadrantes</b> entre el 1 de febrero y el 31 de enero. Se actualiza automáticamente al modificar el cuadrante.</div></div></div>`;
  }
  window.renderAnnualSpecials=loadAnnual;
  const originalRender=window.render;
  if(typeof originalRender==='function'){window.render=function(page){if(page==='especiales'){const screen=document.getElementById('screen'),content=document.getElementById('content');if(screen&&content&&screen.querySelector('.app-shell')){loadAnnual();return;}}return originalRender.apply(this,arguments);};}
  window.addEventListener('load',()=>{if(location.hash==='#especiales')loadAnnual();});
})();
