/* Identidad visual: sin logotipo y con la denominación oficial AVIÓNICA DE ATAQUE. */
(function(){
  const BRAND='AVIÓNICA DE ATAQUE';
  const OLD='ATAQUE EQUIPO';
  const removeLogos=()=>{
    document.querySelectorAll('.login-logo,.sidebar-brand img,.sidebar-mark img,.hero-card img').forEach(el=>el.remove());
    document.querySelectorAll('.login-watermark').forEach(el=>{el.style.backgroundImage='none';});
  };
  const replaceText=()=>{
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    const nodes=[]; let n;
    while(n=walker.nextNode()) nodes.push(n);
    nodes.forEach(node=>{
      if(node.nodeValue && node.nodeValue.includes(OLD)) node.nodeValue=node.nodeValue.split(OLD).join(BRAND);
    });
    document.title=BRAND;
  };
  const clean=()=>{removeLogos();replaceText();};
  new MutationObserver(clean).observe(document.documentElement,{subtree:true,childList:true,characterData:true});
  document.addEventListener('DOMContentLoaded',clean);
  clean();
})();
