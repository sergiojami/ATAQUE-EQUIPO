/* Noches acumuladas: orden 1-12 y total editable por administrador. */
(function(){
  const preferred=['De Benito','Angulo','Pajarillo','Sergio','Raul','Roldán','Paloma','Rubén','De Porras','Salvatierra','Castillo','Campos'];
  const norm=v=>String(v||'').trim().toLocaleLowerCase('es');
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const admin=()=>window.__ATAQUE_ADMIN===true||window.admin===true;
  const name=e=>e?.nombre||'';
  const order=a=>[...a].sort((x,y)=>{const ix=preferred.findIndex(n=>norm(n)===norm(name(x)));const iy=preferred.findIndex(n=>norm(n)===norm(name(y)));if(ix>=0&&iy>=0)return ix-iy;if(ix>=0)return -1;if(iy>=0)return 1;return norm(name(x)).localeCompare(norm(name(y)),'es');});
  const autoTotals=()=>{const m=new Map();for(const r of (window.__COMISIONES_NIGHT_ROWS||[]))for(const p of (r.personal||[])){const id=String(p.id);m.set(id,(m.get(id)||0)+Number(r.noches||0));}return m;};

  async function refresh(){
    const c=document.getElementById('content');
    if(!c)return;
    const r=await db.from('empleados').select('id,nombre,noches_ajuste_manual,rol').neq('rol','admin');
    if(r.error)throw r.error;
    const people=order(r.data||[]);
    const autos=autoTotals();
    const data=people.map((e,i)=>{const automatic=autos.get(String(e.id))||0;const adjustment=Number(e.noches_ajuste_manual||0);return {e,position:i+1,automatic,adjustment,total:Math.max(0,automatic+adjustment)};});
    const grand=data.reduce((s,x)=>s+x.total,0);
    const panel=c.querySelector('.commission-night-dashboard');
    if(!panel)return;
    panel.innerHTML=`
      <div class="commission-night-kpi">
        <span class="summary-label">TOTAL ACUMULADO</span>
        <strong>${grand}</strong>
        <span>noches-persona</span>
      </div>
      <div class="commission-night-info">
        <div>
          <span class="eyebrow">NOCHES TOTALES POR EMPLEADO</span>
          <h3>Acumulado de todos los ejercicios</h3>
          <p class="muted">Ordenados del 1 al 12 como en el cuadrante. El total combina las noches calculadas automáticamente y el ajuste manual.</p>
        </div>
        <div class="commission-night-list">
          ${data.map(x=>`<div class="commission-night-row manual-night-row" data-emp-id="${esc(x.e.id)}">
            <span class="night-position">${x.position}</span>
            <span class="night-name" title="${esc(name(x.e))}">${esc(name(x.e))}</span>
            <span class="night-auto">${x.automatic} <small>auto.</small></span>
            ${admin()?`<input class="night-total-input" type="number" min="0" step="1" value="${x.total}" aria-label="Total noches ${esc(name(x.e))}"><button class="night-save-btn" onclick="saveManualNightTotal('${esc(x.e.id)}',${x.automatic})">Guardar</button>`:`<strong class="night-total-readonly">${x.total}</strong>`}
            <small>${x.total===1?'noche':'noches'}</small>
          </div>`).join('')}
        </div>
      </div>`;
  }

  window.saveManualNightTotal=async function(id,automatic){
    if(!admin())return;
    const row=document.querySelector(`.manual-night-row[data-emp-id="${CSS.escape(String(id))}"]`);if(!row)return;
    const input=row.querySelector('.night-total-input');
    const total=Math.max(0,Math.floor(Number(input?.value||0)));
    const adjustment=total-Number(automatic||0);
    const r=await db.from('empleados').update({noches_ajuste_manual:adjustment}).eq('id',id);
    if(r.error){if(typeof toast==='function')toast(r.error.message,'error');return;}
    if(typeof toast==='function')toast('Total de noches actualizado');
    await refresh();
  };

  const baseRender=window.render;
  window.render=async function(page='inicio',...args){
    await baseRender(page,...args);
    if(page==='comisiones'){
      try{await refresh();}catch(e){if(typeof toast==='function')toast(e.message||'No se pudo actualizar el contador','error');}
    }
  };
  window.refreshCommissionNightTotals=refresh;
})();
