(function(){
  function daysInMonth(y,m){return new Date(y,m+1,0).getDate();}
  function dk(y,m,d){return `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;}
  function ml(d){return new Intl.DateTimeFormat('es-ES',{month:'long',year:'numeric'}).format(d);}
  const oldRender=window.render;
  window.render=function(page='inicio'){
    if(page==='especiales') page='cuadrantes';
    return oldRender(page);
  };
  const oldNav=window.navItem;
  window.navItem=function(page,icon,label,active){
    if(page==='especiales') return '';
    return oldNav(page,icon,label,active);
  };
  window.renderUnifiedCuadrante=async function(){
    const content=document.getElementById('content'); if(!content)return;
    const date=window.calendarDate||new Date(), y=date.getFullYear(), m=date.getMonth(), n=daysInMonth(y,m);
    const start=dk(y,m,1), end=dk(y,m,n);
    const [sr,er]=await Promise.all([
      db.from('turnos_cuadrante').select('id,fecha,empleado_id,turno,nota').gte('fecha',start).lte('fecha',end),
      db.from('especiales').select('id,empleado_id,c,v,cs,ap,b')
    ]);
    const shifts=sr.data||[], sm=new Set(shifts.map(x=>`${x.fecha}|${x.empleado_id}|${x.turno}`)), em=new Map((er.data||[]).map(x=>[x.empleado_id,x]));
    const days=Array.from({length:n},(_,i)=>i+1);
    const shiftTable=`<div class="unified-section"><div class="unified-section-head"><div><span class="eyebrow">TURNOS</span><h3>Cuadrante mensual</h3><p class="muted">M = mañana · T = tarde. ${admin?'Solo el administrador puede modificar.':'Modo consulta.'}</p></div></div><div class="unified-scroll"><table class="unified-shift-table"><thead><tr><th rowspan="2">Empleado</th>${days.map(d=>`<th colspan="2">${String(d).padStart(2,'0')}</th>`).join('')}</tr><tr>${days.map(()=>'<th>M</th><th>T</th>').join('')}</tr></thead><tbody>${employees.map(e=>`<tr><th class="unified-name">${esc(e.nombre)}</th>${days.map(d=>['M','T'].map(t=>{const date=dk(y,m,d),ck=sm.has(`${date}|${e.id}|${t}`);return `<td class="u-${t.toLowerCase()} ${ck?'on':''}"><button ${admin?'':'disabled'} onclick="unifiedShift('${e.id}','${date}','${t}',${!ck})">${ck?t:''}</button></td>`}).join('')).join('')}</tr>`).join('')}</tbody></table></div></div>`;
    const specialTable=`<div class="unified-section"><div class="unified-section-head"><div><span class="eyebrow">ESPECIALES</span><h3>Especiales del equipo</h3><p class="muted">C = Compensación · V = Vacaciones · CS = Comisión de servicio · AP = Asuntos propios · B = Baja.</p></div></div><div class="unified-scroll"><table class="unified-special-table"><thead><tr><th>Empleado</th>${['C','V','CS','AP','B'].map(x=>`<th>${x}</th>`).join('')}<th>Total</th></tr></thead><tbody>${employees.map(e=>{const x=em.get(e.id)||{c:0,v:0,cs:0,ap:0,b:0};const vals=['c','v','cs','ap','b'].map(k=>Number(x[k]||0));return `<tr><th>${esc(e.nombre)}</th>${['c','v','cs','ap','b'].map((k,i)=>`<td><button class="special-counter" ${admin?'':'disabled'} onclick="unifiedSpecial('${e.id}','${k}',1)">−</button><b>${vals[i]}</b><button class="special-counter" ${admin?'':'disabled'} onclick="unifiedSpecial('${e.id}','${k}',1)">+</button></td>`).join('')}<td><strong>${vals.reduce((a,b)=>a+b,0)}</strong></td></tr>`}).join('')}</tbody></table></div></div>`;
    content.innerHTML=`<div class="calendar-toolbar"><div><span class="eyebrow">PLANIFICACIÓN DEL EQUIPO</span><h3>Cuadrante de Turnos y Especiales</h3><p class="muted">Todo el control mensual del personal en una única pantalla.</p></div><div class="toolbar-actions"><button class="btn secondary" onclick="unifiedMonth(-1)">←</button><span class="month-badge">${esc(ml(date))}</span><button class="btn secondary" onclick="unifiedMonth(1)">→</button></div></div>${shiftTable}${specialTable}`;
  };
  window.unifiedMonth=function(d){calendarDate=new Date(calendarDate.getFullYear(),calendarDate.getMonth()+d,1);render('cuadrantes');};
  window.unifiedShift=async function(eid,date,t,on){if(!admin)return;const q=on?db.from('turnos_cuadrante').upsert({empleado_id:eid,fecha:date,turno:t},{onConflict:'fecha,empleado_id,turno'}):db.from('turnos_cuadrante').delete().eq('empleado_id',eid).eq('fecha',date).eq('turno',t);const r=await q;if(r.error){toast(r.error.message,'error');return;}render('cuadrantes');};
  window.unifiedSpecial=async function(eid,key,delta){if(!admin)return;const r=await db.from('especiales').select('id,c,v,cs,ap,b').eq('empleado_id',eid).maybeSingle();if(r.error){toast(r.error.message,'error');return;}const row=r.data||{c:0,v:0,cs:0,ap:0,b:0};let v=Math.max(0,Number(row[key]||0)+delta);const payload={c:Number(row.c||0),v:Number(row.v||0),cs:Number(row.cs||0),ap:Number(row.ap||0),b:Number(row.b||0)};payload[key]=v;const q=row.id?db.from('especiales').update(payload).eq('id',row.id):db.from('especiales').insert({...payload,empleado_id:eid});if((await q).error){toast('No se pudo guardar el contador','error');return;}render('cuadrantes');};
  const originalCuadrantes=window.cuadrantes;
  window.cuadrantes=window.renderUnifiedCuadrante;
})();
