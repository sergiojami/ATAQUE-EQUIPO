/* Cuadrante unificado: M, T, M/T + C, V, CS, AP, B con contadores mensuales. */
(function(){
  const TYPES=['M','T','M/T','C','V','CS','AP','B'];
  const SPECIAL=['C','V','CS','AP','B'];
  const LABELS={M:'Mañana',T:'Tarde','M/T':'Mañana y tarde',C:'Compensación',V:'Vacaciones',CS:'Comisión de servicio',AP:'Asuntos propios',B:'Baja'};
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
    try{
      const [sr,er]=await Promise.all([
        db.from('turnos_cuadrante').select('id,fecha,empleado_id,turno').gte('fecha',start).lte('fecha',end),
        db.from('especiales_calendario').select('id,fecha,empleado_id,tipo').gte('fecha',start).lte('fecha',end)
      ]);
      if(!sr.error) shifts=sr.data||[];
      if(!er.error) specials=er.data||[];
    }catch(e){ console.warn(e); }

    const state=new Map();
    shifts.forEach(r=>{
      const k=`${r.fecha}|${r.empleado_id}`;
      const cur=state.get(k)||'';
      const t=String(r.turno||'').toUpperCase();
      if(t==='M' || t==='MAÑANA') state.set(k,cur==='T'?'M/T':'M');
      if(t==='T' || t==='TARDE') state.set(k,cur==='M'?'M/T':'T');
      if(t==='M/T') state.set(k,'M/T');
    });
    specials.forEach(r=>state.set(`${r.fecha}|${r.empleado_id}`,String(r.tipo||'')));

    const counters=new Map();
    employees.forEach(e=>counters.set(e.id,{M:0,T:0,'M/T':0,C:0,V:0,CS:0,AP:0,B:0}));
    state.forEach((value,key)=>{
      const eid=key.split('|')[1]; const c=counters.get(eid); if(!c)return;
      if(c[value]!==undefined)c[value]++;
    });
    const totals={M:0,T:0,'M/T':0,C:0,V:0,CS:0,AP:0,B:0};
    counters.forEach(c=>TYPES.forEach(t=>totals[t]+=c[t]));
    const days=Array.from({length:n},(_,i)=>i+1);

    const buttons=days.map(d=>`<th>${String(d).padStart(2,'0')}</th>`).join('');
    const rows=employees.map(e=>{
      const c=counters.get(e.id)||{M:0,T:0,'M/T':0,C:0,V:0,CS:0,AP:0,B:0};
      return `<tr><th class="unified-name"><div class="employee-cell"><div class="avatar-small">${escU((e.nombre||'').split(/\s+/).map(x=>x[0]).slice(0,2).join('').toUpperCase())}</div><strong>${escU(e.nombre)}</strong></div></th>${days.map(d=>{const dateKey=dk(y,m,d), value=state.get(`${dateKey}|${e.id}`)||'';return `<td class="unified-day-cell type-${value.replace('/','-').toLowerCase()}"><button class="unified-day-button ${value?'filled':''}" ${admin?'':'disabled'} title="${value?LABELS[value]:'Sin asignar'}" onclick="window.unifiedCycle('${e.id}','${dateKey}','${value}')">${value||'·'}</button></td>`}).join('')}${TYPES.map(t=>`<td class="unified-counter"><b>${c[t]}</b></td>`).join('')}</tr>`;
    }).join('');

    content.innerHTML=`<div class="unified-page">
      <div class="calendar-toolbar"><div><span class="eyebrow">PLANIFICACIÓN MENSUAL</span><h3>Cuadrante de Turnos y Especiales</h3><p class="muted">Selecciona en cada día: <b>M</b>, <b>T</b>, <b>M/T</b>, <b>C</b>, <b>V</b>, <b>CS</b>, <b>AP</b> o <b>B</b>. Los contadores muestran las veces registradas durante el mes.</p></div><div class="toolbar-actions"><button class="btn secondary" onclick="window.unifiedMonth(-1)">←</button><span class="month-badge">${escU(ml(date))}</span><button class="btn secondary" onclick="window.unifiedMonth(1)">→</button></div></div>
      <div class="unified-legend">${TYPES.map(t=>`<span><b class="u-code code-${t.replace('/','-').toLowerCase()}">${t}</b>${LABELS[t]}</span>`).join('')}<em>${admin?'Solo administrador puede modificar el cuadrante.':'Modo consulta.'}</em></div>
      <div class="unified-table-wrap"><table class="unified-main-table"><thead><tr><th class="unified-name-head" rowspan="2">Empleado</th>${buttons}<th colspan="8">CONTADORES DEL MES</th></tr><tr>${days.map(()=>'<th class="day-sub">DÍA</th>').join('')} ${TYPES.map(t=>`<th class="counter-head">${t}</th>`).join('')}</tr></thead><tbody>${rows}</tbody><tfoot><tr><th>TOTALES</th>${days.map(()=>'<td></td>').join('')}${TYPES.map(t=>`<th>${totals[t]}</th>`).join('')}</tr></tfoot></table></div>
      <div class="unified-footer"><span><b>${employees.length}</b> empleados · <b>${n}</b> días</span><span>M/T cuenta como una única casilla y también se refleja en su contador.</span></div>
    </div>`;
  }

  window.unifiedCycle=async function(eid,date,current){
    if(!admin)return;
    const idx=TYPES.indexOf(current), next=TYPES[(idx+1)%TYPES.length]||'';
    try{
      if(current && SPECIAL.includes(current)) await db.from('especiales_calendario').delete().eq('empleado_id',eid).eq('fecha',date);
      if(current && (current==='M'||current==='T'||current==='M/T')) await db.from('turnos_cuadrante').delete().eq('empleado_id',eid).eq('fecha',date);
      if(next && SPECIAL.includes(next)){
        const r=await db.from('especiales_calendario').upsert({empleado_id:eid,fecha:date,tipo:next},{onConflict:'fecha,empleado_id'}); if(r.error)throw r.error;
      }else if(next){
        const payload=next==='M/T'?['M','T']:[next];
        for(const turno of payload){const r=await db.from('turnos_cuadrante').upsert({empleado_id:eid,fecha:date,turno},{onConflict:'fecha,empleado_id,turno'});if(r.error)throw r.error;}
      }
      const label=next?LABELS[next]:'Sin asignar';
      if(typeof toast==='function')toast(label);
      await unifiedPage();
    }catch(e){if(typeof toast==='function')toast(e.message||'No se pudo guardar','error');}
  };

  window.unifiedMonth=function(delta){const d=window.calendarDate||new Date();window.calendarDate=new Date(d.getFullYear(),d.getMonth()+delta,1);oldRender('cuadrantes');setTimeout(unifiedPage,0);};

  window.render=async function(page='inicio'){
    if(page==='especiales')page='cuadrantes';
    if(page==='cuadrantes'){
      await oldRender('cuadrantes');
      await unifiedPage();
      return;
    }
    return oldRender(page);
  };

  window.cuadrantes=unifiedPage;
})();
