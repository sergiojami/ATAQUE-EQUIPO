/* Centro de Noticias: publicaciones del administrador y lectura para empleados. */
(function(){
  const previousRender=window.render;
  const esc=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  const admin=()=>window.__ATAQUE_ADMIN===true;
  const notify=(m,t='ok')=>typeof window.toast==='function'?window.toast(m,t):console.log(m);
  const fmt=d=>d?new Date(d).toLocaleString('es-ES',{dateStyle:'short',timeStyle:'short'}):'';

  function nav(){
    const n=document.querySelector('.side-nav'); if(!n)return;
    let b=n.querySelector('[data-page="noticias"]');
    if(!b){
      b=document.createElement('button'); b.type='button'; b.className='side-link'; b.dataset.page='noticias';
      b.innerHTML='<span class="side-icon">▣</span><span>Noticias</span>';
      b.onclick=()=>window.render('noticias');
      const ref=n.querySelector('[data-page="novedades"]');
      if(ref)n.insertBefore(b,ref); else n.appendChild(b);
    }
    n.querySelectorAll('.side-link').forEach(x=>x.classList.toggle('active',x.dataset.page==='noticias'));
  }

  async function load(){
    const r=await db.from('noticias').select('id,titulo,contenido,activo,created_at,updated_at').order('created_at',{ascending:false});
    if(r.error)throw r.error;
    return r.data||[];
  }

  function card(n){
    return `<article class="news-card ${n.activo?'':'is-closed'}">
      <div class="news-card-top"><span class="news-badge ${n.activo?'':'closed'}">${n.activo?'PUBLICADA':'ARCHIVADA'}</span><span class="news-date">${esc(fmt(n.created_at))}</span></div>
      <h4>${esc(n.titulo)}</h4>
      <div class="news-body">${esc(n.contenido).replace(/\n/g,'<br>')}</div>
      ${admin()?`<div class="news-actions"><button class="btn secondary" onclick="editarNoticia('${n.id}')">Editar</button><button class="btn secondary" onclick="toggleNoticia('${n.id}',${!n.activo})">${n.activo?'Archivar':'Publicar'}</button><button class="btn secondary danger-btn" onclick="eliminarNoticia('${n.id}')">Eliminar</button></div>`:''}
    </article>`;
  }

  async function page(){
    const content=document.getElementById('content'); if(!content)return;
    content.innerHTML='<div class="panel loading-panel"><div class="eyebrow">COMUNICACIÓN</div><h3>Cargando noticias…</h3></div>';
    try{
      const all=await load();
      const list=admin()?all:all.filter(n=>n.activo);
      content.innerHTML=`<div class="news-wrap">
        <div class="news-head"><div><span class="eyebrow">COMUNICACIÓN DEL EQUIPO</span><h3>Noticias</h3><p class="muted">${admin()?'Publica información importante para todo el equipo.':'Consulta las comunicaciones publicadas por el administrador.'}</p></div>${admin()?'<button class="btn primary" onclick="mostrarNuevaNoticia()">+ Nueva noticia</button>':''}</div>
        ${admin()?`<div id="news-compose" class="news-compose" style="display:none"><span class="eyebrow">NUEVA NOTICIA</span><input id="news-title" class="field" maxlength="150" placeholder="Título de la noticia"><textarea id="news-body" class="field textarea" maxlength="10000" rows="7" placeholder="Escribe el contenido…"></textarea><div class="news-compose-actions"><button class="btn secondary" onclick="cancelarNoticia()">Cancelar</button><button class="btn primary" onclick="crearNoticia()">Publicar</button></div></div>`:''}
        <div class="news-grid">${list.length?list.map(card).join(''):`<div class="panel empty-state"><div>▣</div><h3>${admin()?'Todavía no hay noticias':'No hay noticias publicadas'}</h3><p>${admin()?'Publica la primera comunicación para el equipo.':'Cuando el administrador publique una noticia aparecerá aquí.'}</p></div>`}</div>
      </div>`;
      nav();
    }catch(e){content.innerHTML=`<div class="panel error-state"><h3>No se pudieron cargar las noticias</h3><p>${esc(e.message||e)}</p><button class="btn secondary" onclick="render('inicio')">Volver a Inicio</button></div>`;}
  }

  window.mostrarNuevaNoticia=()=>{const x=document.getElementById('news-compose');if(x){x.style.display='grid';document.getElementById('news-title')?.focus();}};
  window.cancelarNoticia=()=>{const x=document.getElementById('news-compose');if(x)x.style.display='none';};
  window.crearNoticia=async()=>{if(!admin())return;const titulo=(document.getElementById('news-title')?.value||'').trim(),contenido=(document.getElementById('news-body')?.value||'').trim();if(!titulo||!contenido){notify('Escribe un título y contenido antes de publicar','warn');return;}const r=await db.from('noticias').insert({titulo,contenido,activo:true});if(r.error){notify(r.error.message,'error');return;}notify('Noticia publicada para el equipo');await page();};
  window.editarNoticia=async id=>{if(!admin())return;const all=await load(),n=all.find(x=>String(x.id)===String(id));if(!n)return;const titulo=prompt('Título de la noticia:',n.titulo);if(titulo===null)return;const contenido=prompt('Contenido de la noticia:',n.contenido);if(contenido===null)return;if(!titulo.trim()||!contenido.trim()){notify('El título y el contenido no pueden quedar vacíos','warn');return;}const r=await db.from('noticias').update({titulo:titulo.trim(),contenido:contenido.trim(),updated_at:new Date().toISOString()}).eq('id',id);if(r.error){notify(r.error.message,'error');return;}notify('Noticia actualizada');await page();};
  window.toggleNoticia=async(id,activo)=>{if(!admin())return;const r=await db.from('noticias').update({activo,updated_at:new Date().toISOString()}).eq('id',id);if(r.error){notify(r.error.message,'error');return;}notify(activo?'Noticia publicada':'Noticia archivada');await page();};
  window.eliminarNoticia=async id=>{if(!admin())return;if(!confirm('¿Eliminar esta noticia?'))return;const r=await db.from('noticias').delete().eq('id',id);if(r.error){notify(r.error.message,'error');return;}notify('Noticia eliminada');await page();};

  window.render=async function(pageName='inicio'){
    if(pageName!=='noticias')return previousRender(pageName);
    await previousRender('inicio');
    const h=document.querySelector('.topbar h1');if(h)h.textContent='Noticias';
    await page();
  };
})();
