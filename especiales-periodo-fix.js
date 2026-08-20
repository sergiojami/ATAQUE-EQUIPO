/* Fix definitivo de Especiales: el router usa esta vista como fuente única. */
(function(){
  const TYPES=['C','V','CS','AP','B'];
  const LABEL={C:'Compensación',V:'Vacaciones',CS:'Comisión de servicio',AP:'Asuntos propios',B:'Baja'};
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const periodFor=(date=new Date())=>{const y=date.getMonth()===0?date.getFullYear()-1:date.getFullYear();return {start:`${y}-02-01`,end:`${y+1}-01-31`,label:`${y}/${y+1}`};};
  const monthKey=(y,m,d)=>`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const monthLabel=d=>new Intl.DateTimeFormat('es-ES',{month:'long',year:'numeric'}).format(d);
  const periodLabel=p=>`${new Date(p.start+'T00:00:00').toLocaleDateString('es-ES')} → ${new Date(p.end+'T00:00:00').toLocaleDateString('es-ES')}`;
  const people=()=>window.__ATAQUE_EMPLOYEES||window.employees||[];
  const personName=e=>e?.nombre||e?.full_name||'';

  async function renderAnnualEspeciales(){
    const box=document.getElementById('content'); if(!box) return;
    const d=window.__ATAQUE_DATE||new Date(), y=d.getFullYear(), m=d.getMonth(), days=new Date(y,m+1,0).getDate();
    const start=monthKey(y,m,1), end=monthKey(y,m,days), period=periodFor(d);
    const [monthRes,annualRes]=await Promise.all([
      db.from('especiales_calendario').select('id,fecha,empleado_id,tipo').gte('fecha',start).lte('fecha',end).order('fecha'),
      db.from('especiales_calendario').select('empleado_id,tipo').gte('fecha',period.start).lte('fecha',period.end)
    ]);
    if(monthRes.error||annualRes.error) throw monthRes.error||annualRes.error;
    const monthly=monthRes.data||[], annual=annualRes.data||[], currentPeople=people().filter(e=>String(e.rol||e.role||'').toLowerCase()!=='admin');
    const byKey=new Map(monthly.map(r=>[`${r.fecha}|${r.empleado_id}`,r.tipo]));
    const counters=new Map(currentPeople.map(e=>[e.id,Object.fromEntries(TYPES.map(t=>[t,0]))]));
    annual.forEach(r=>{const c=counters.get(r.empleado_id);if(c&&TYPES.includes(r.tipo))c[r.tipo]++;});
    const totals=Object.fromEntries(TYPES.map(t=>[t,0])); counters.forEach(c=>TYPES.forEach(t=>totals[t]+=c[t]));
    const initials=n=>(personName(n).split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase()||'AE');
    box.innerHTML=`<div class="calendar-toolbar"><div><span class="eyebrow">CONTROL DE ACTIVIDADES</span><h3>Especiales</h3><p class="muted">Resumen mensual de C · V · CS · AP · B.</p><div class="special-period-banner"><span>CONTADOR ANUAL</span><strong>Periodo ${period.label}</strong><small>${periodLabel(period)} · De febrero a enero.</small></div></div><div class="toolbar-actions"><button class="btn secondary" onclick="especialesPeriodoMonth(-1)">←</button><span class="month-badge">${esc(monthLabel(d))}</span><button class="btn secondary" onclick="especialesPeriodoMonth(1)">→</button></div></div><div class="special-calendar-legend">${TYPES.map(t=>`<span><b class="special-code ${t.toLowerCase()}">${t}</b>${LABEL[t]}</span>`).join('')}<em>${window.__ATAQUE_ADMIN===true?'Haz clic en una casilla para avanzar: C → V → CS → AP → B → vacío.':'Modo consulta.'}</em></div><div class="calendar-wrap special-calendar-wrap"><table class="special-calendar-table"><thead><tr><th class="special-employee-col">Empleado</th>${Array.from({length:days},(_,i)=>`<th><div class="special-day-head"><b>${new Intl.DateTimeFormat('es-ES',{weekday:'short'}).format(new Date(y,m,i+1)).replace('.','').toUpperCase()}</b><span>${String(i+1).padStart(2,'0')}</span></div></th>`).join('')}<th class="counter-col">C</th><th class="counter-col">V</th><th class="counter-col">CS</th><th class="counter-col">AP</th><th class="counter-col">B</th></tr></thead><tbody>${currentPeople.map(e=>{const c=counters.get(e.id)||Object.fromEntries(TYPES.map(t=>[t,0]));return `<tr><th class="special-employee-col special-employee-name"><div class="special-employee"><span class="avatar-small">${initials(e)}</span><div><strong>${esc(personName(e))}</strong><small>${esc(e.telefono||'')}</small></div></div></th>${Array.from({length:days},(_,i)=>{const date=monthKey(y,m,i+1),type=byKey.get(`${date}|${e.id}`)||'';return `<td class="special-day-cell"><button class="special-day-button ${type?'type-'+type.toLowerCase():'empty'}" ${window.__ATAQUE_ADMIN===true?'':'disabled'} onclick="especialesPeriodoCycle('${esc(e.id)}','${date}','${type}')">${type||'·'}</button></td>`}).join('')}${TYPES.map(t=>`<td class="special-counter"><span>${c[t]}</span></td>`).join('')}</tr>`;}).join('')}</tbody><tfoot><tr><th class="special-employee-col">TOTALES ${period.label}</th>${Array.from({length:days},()=>'<td></td>').join('')}${TYPES.map(t=>`<th class="special-total-counter">${totals[t]}</th>`).join('')}</tr></tfoot></table></div><div class="special-calendar-footer"><span><b>${currentPeople.length}</b> empleados · <b>${days}</b> días</span><span>Los contadores muestran el total del periodo ${periodLabel(period)}.</span></div>`;
  }

  window.especialesPeriodoMonth=async delta=>{const d=window.__ATAQUE_DATE||new Date();window.__ATAQUE_DATE=new Date(d.getFullYear(),d.getMonth()+delta,1);await renderAnnualEspeciales();};
  window.especialesPeriodoCycle=async(employeeId,fecha,currentType)=>{if(window.__ATAQUE_ADMIN!==true)return;const order=['','C','V','CS','AP','B'];const next=order[(order.indexOf(currentType)+1)%order.length];const r=next?await db.from('especiales_calendario').upsert({empleado_id:employeeId,fecha,tipo:next},{onConflict:'fecha,empleado_id'}):await db.from('especiales_calendario').delete().eq('empleado_id',employeeId).eq('fecha',fecha);if(r.error){if(typeof toast==='function')toast(r.error.message,'error');return;}await renderAnnualEspeciales();};
  window.renderAnnualEspeciales=renderAnnualEspeciales;
  const previousRender=window.render;
  if(typeof previousRender==='function') window.render=async function(page,...args){if(page==='especiales')return renderAnnualEspeciales();return previousRender.call(this,page,...args);};
})();
