/* Cuadrante unificado: M, T, M/T + C, V, CS, AP, B con contadores mensuales. */
(function(){
  const TYPES=['','M','T','M/T','C','V','CS','AP','B'];
  const SPECIAL=['C','V','CS','AP','B'];
  const LABELS={'':'Sin asignar',M:'Mañana',T:'Tarde','M/T':'Mañana y tarde',C:'Compensación',V:'Vacaciones',CS:'Comisión de servicio',AP:'Asuntos propios',B:'Baja'};
  const daysInMonth=(y,m)=>new Date(y,m+1,0).getDate();
  const dk=(y,m,d)=>`${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
  const ml=d=>new Intl.DateTimeFormat('es-ES',{month:'long',year:'numeric'}).format(d);
  const escU=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const oldRender=window.render;
  async function unifiedPage(){
    const content=document.getElementById('content'); if(!content)return;
    const date=window.calendarDate||new Date(), y=date.getFullYear(), m=date.getMonth(), n=daysInMonth(y,m);
    const start=dk(y,m,1), end=dk(y,m,n);
    let shifts=[], specials=[];
    try{const [sr,er]=await Promise.all([db.from('turnos_cuadrante').select('id,fecha,empleado_id,turno').gte('fecha',start).lte('fecha',end),db.from('especiales_calendario').select('id,fecha,empleado_id,tipo').gte('fecha',start).lte('fecha',end)]);if(!sr.error)shifts=sr.data||[];if(!er.error)specials=er.data||[]}catch(e){console.warn(e)}
    const state=new Map();
    shifts.forEach(r=>{const k=`${r.fecha}|${r.empleado_id}`,cur=state.get(k)||'',t=String(r.turno||'').toUpperCase();if(t==='M'||t==='MAÑANA')state.set(k,cur==='T'?'M/T':'M');if(t==='T'||t==='TARDE')state.set(k,cur==='M'?'M/T':'T');if(t==='M/T')state.set(k,'M/T')});
    specials.forEach(r=>state.set(`${r.fecha}|${r.empleado_id}`,String(r.tipo||'')));
    const counters=new Map(); employees.forEach(e=>counters.set(e.id,{M:0,T:0,'M/T':0,C:0,V:0,CS:0,AP:0,B:0}));
    state.forEach((value,key)=>{const eid=key.split('|')[1],c=counters.get(eid);if(c&&c[value]!==undefined)c[value]++});
    const totals={M:0,T:0,'M/T':0,C:0,V:0,CS:0,AP:0,B:0};counters.forEach(c=>Object.keys(totals).forEach(t=>totals[t]+=c[t]));
    const days=Array.from({length:n},(_,i)=>i+1);
    const rows=employees.map(e=>{const c=counters.get(e.id)||{M:0,T:0,'M/T':0,C:0,V:0,CS:0,AP:0,B:0};return `<tr><th class="unified-name"><div class="employee-cell"><div class="avatar-small">${escU((e.nombre||'').split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase())}</div><strong>${escU(e.nombre)}</strong></div></th>${days.map(d=>{const dateKey=dk(y,m,d),value=state.get(`${dateKey}|${e.id}`)||'';return `<td class="unified-day-cell type-${value?value.replace('/','-').toLowerCase():'empty'}"><select class="unified-day-select" ${admin?'':'disabled'} aria-label="${escU(e.nombre)} ${dateKey}" onchange="window.unifiedSelect('${e.id}','${dateKey}',this.value)">${TYPES.map(t=>`<option value="${t}" ${t===value?'selected':''}>${t||'—'}</option>`).join('')}</select></td>`}).join('')}${Object.keys(totals).map(t=>`<td class="unified-counter"><b>${c[t]}</b></td>`).join('')}</tr>`}).join('');
    content.innerHTML=`<div class="unified-page"><div class="calendar-toolbar"><div><span class="eyebrow">PLANIFICACIÓN MENSUAL</span><h3>Cuadrante de Turnos y Especiales</h3><p class="muted">Cada casilla tiene un desplegable: sin asignar, M, T, M/T, C, V, CS, AP o B.</p></div><div class="toolbar-actions"><button class="btn secondary" onclick="window.unifiedMonth(-1)">←</button><span class="month-badge">${escU(ml(date))}</span><button class="btn secondary" onclick="window.unifiedMonth(1)">→</button></div></div><div class="unified-legend">${TYPES.map(t=>`<span><b class="u-code code-${t? t.replace('/','-').toLowerCase():'empty'}">${t||'—'}</b>${LABELS[t]}</span>`).join('')}<em>${admin?'Solo administrador puede modificar el cuadrante.':'Modo consulta.'}</em></div><div class="unified-table-wrap"><table class="unified-main-table"><thead><tr><th class="unified-name-head">Empleado</th>${days.map(d=>`<th>${String(d).padStart(2,'0')}</th>`).join('')}<th colspan="8">CONTADORES DEL MES</th></tr></thead><tbody>${rows}</tbody><tfoot><tr><th>TOTALES</th>${days.map(()=>'<td></td>').join('')}${Object.keys(totals).map(t=>`<th>${totals[t]}</th>`).join('')}</tr></tfoot></table></div><div class="unified-footer"><span><b>${employees.length}</b> empleados · <b>${n}</b> días</span><span>— = casilla sin asignar.</span></div></div>`;
  }
  window.unifiedSelect=async function(eid,date,value){if(!admin)return;try{await db.from('turnos_cuadrante').delete().eq('empleado_id',eid).eq('fecha',date);await db.from('especiales_calendario').delete().eq('empleado_id',eid).eq('fecha',date);if(value&&SPECIAL.includes(value)){const r=await db.from('especiales_calendario').upsert({empleado_id:eid,fecha:date,tipo:value},{onConflict:'fecha,empleado_id'});if(r.error)throw r.error}else if(value){const payload=value==='M/T'?['M','T']:[value];for(const turno of payload){const r=await db.from('turnos_cuadrante').upsert({empleado_id:eid,fecha:date,turno},{onConflict:'fecha,empleado_id,turno'});if(r.error)throw r.error}}if(typeof toast==='function')toast(value?LABELS[value]:'Sin asignar');await unifiedPage()}catch(e){if(typeof toast==='function')toast(e.message||'No se pudo guardar','error')}};
  window.unifiedCycle=window.unifiedSelect;
  window.unifiedMonth=function(delta){const d=window.calendarDate||new Date();window.calendarDate=new Date(d.getFullYear(),d.getMonth()+delta,1);oldRender('cuadrantes');setTimeout(unifiedPage,0)};
  window.render=async function(page='inicio'){if(page==='especiales')page='cuadrantes';if(page==='cuadrantes'){await oldRender('cuadrantes');await unifiedPage();return}return oldRender(page)};
  window.cuadrantes=unifiedPage;
})();