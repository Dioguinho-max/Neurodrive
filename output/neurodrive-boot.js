(() => {
  'use strict';
  const root=document.documentElement, screen=document.getElementById('game-boot');
  if(!screen)return;
  const status=document.getElementById('boot-status'),enter=document.getElementById('boot-enter'),fallback=document.getElementById('boot-browser');
  let english=false;try{english=localStorage.getItem('neurodrive-language')==='en-US';}catch{}
  const say=(pt,en)=>english?en:pt;
  status.textContent=say('Preparando sua garagem…','Preparing your garage…');
  document.getElementById('boot-retry').textContent=say('Recarregar','Reload');
  let ready=false,finished=false;
  screen.addEventListener('cancel',e=>e.preventDefault());
  screen.close();screen.showModal();
  function reveal(){
    if(!ready||finished)return;
    finished=true;clearTimeout(timeout);root.classList.remove('game-booting');screen.close();screen.remove();
    const menu=document.getElementById('race-menu')||document.getElementById('online-lobby');
    if(menu){menu.scrollTop=0;(menu.querySelector('.menu-pages button')||menu.querySelector('button:not([disabled])'))?.focus({preventScroll:true});}
  }
  enter.onclick=async()=>{
    if(!ready)return;
    enter.disabled=true;
    try {
      if(!document.fullscreenElement){
        if(!root.requestFullscreen||!document.fullscreenEnabled)throw new Error('unsupported');
        await root.requestFullscreen({navigationUI:'hide'});
      }
      reveal();
    }catch{
      status.textContent=say('Tela cheia indisponível neste navegador. Você pode continuar abaixo.','Fullscreen is unavailable in this browser. You can continue below.');
      fallback.hidden=false;fallback.focus();
    }finally{enter.disabled=false;}
  };
  fallback.onclick=reveal;
  const timeout=setTimeout(()=>{
    if(ready||finished)return;
    status.textContent=say('O carregamento está demorando. Confira a conexão e tente novamente.','Loading is taking longer. Check your connection and try again.');
    const retry=document.getElementById('boot-retry');retry.hidden=false;retry.onclick=()=>location.reload();
  },20000);
  window.NeuroBoot={ready(){
    if(ready||finished)return;ready=true;clearTimeout(timeout);
    screen.close();screen.showModal();screen.dataset.ready='true';
    if(window.matchMedia('(pointer: coarse)').matches){
      status.textContent=say('Tudo pronto. Toque para abrir o menu em tela cheia.','Ready. Tap to open the menu in fullscreen.');
      enter.textContent=say('Entrar no jogo','Enter game');enter.hidden=false;
      fallback.textContent=say('Continuar no navegador','Continue in browser');fallback.hidden=false;
      enter.focus({preventScroll:true});
    }else requestAnimationFrame(()=>requestAnimationFrame(reveal));
  }};
})();
