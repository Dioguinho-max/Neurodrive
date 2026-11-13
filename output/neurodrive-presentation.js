(() => {
  'use strict';
  let active=false;
  window.NeuroPresentation={
    async instructions(review=false){
      if(active)return false;
      const account=window.NeuroGarage?.getPlayer?.();
      if(!review&&!account){
        window.NeuroGarage?.showPage('account');
        const status=document.getElementById('garage-status');
        if(status)status.textContent='Entre na conta e volte em Jogar agora. Suas instruções ficarão salvas.';
        return false;
      }
      if(!review&&account.tutorialComplete)return true;
      active=true;
      const en=document.documentElement.lang.startsWith('en'),t=(pt,english)=>en?english:pt;
      const touch=window.matchMedia('(pointer: coarse)').matches;
      const pad=Array.from(navigator.getGamepads?.()||[]).some(p=>p?.connected&&p.mapping==='standard');
      const controls=pad?[
        ['RT / R2',t('Acelerar','Accelerate')],['LT / L2',t('Frear · segure parado para dar ré','Brake · hold when stopped to reverse')],['◀ ● ▶',t('Analógico esquerdo para virar','Left stick to steer')],['Menu / Options',t('Pausar','Pause')]
      ]:touch?[
        ['▥',t('Pedal alto à direita: acelerar','Tall right pedal: accelerate')],['▤',t('Pedal menor: frear · segure parado para dar ré','Short pedal: brake · hold when stopped to reverse')],['❮  ❯',t('Setas à esquerda para virar','Left-side arrows to steer')],[t('Menu','Menu'),t('Pausar e ajustar o jogo','Pause and adjust the game')]
      ]:[['W / ↑',t('Acelerar','Accelerate')],['S / ↓',t('Frear · segure parado para dar ré','Brake · hold when stopped to reverse')],['A D / ← →',t('Virar','Steer')],['Esc',t('Abrir o menu','Open the menu')]];
      const dialog=document.createElement('dialog');dialog.className='presentation-guide';dialog.setAttribute('aria-labelledby','presentation-title');
      const node=(tag,text)=>{const n=document.createElement(tag);n.textContent=text;return n};
      dialog.append(node('small',t('PRIMEIROS METROS','FIRST STEPS')));
      const title=node('h2',t('Seu lugar no grid está pronto','Your spot on the grid is ready'));title.id='presentation-title';title.tabIndex=-1;dialog.append(title);
      dialog.append(node('p',t('Na apresentação: uma volta, tempo seco e câmbio automático. Freie antes da curva e acelere na saída.','Presentation: one lap, dry weather and automatic gears. Brake before corners and accelerate on exit.')));
      const grid=node('div','');grid.className='presentation-controls';
      for(const [key,label]of controls){const card=node('div','');card.append(node('kbd',key),node('span',label));grid.append(card)}dialog.append(grid);
      const status=node('p',review?'':t('Conclua uma vez. Esta conta lembrará em outros dispositivos.','Complete once. This account will remember on other devices.'));status.setAttribute('role','status');dialog.append(status);
      const footer=node('div','');footer.className='presentation-actions';
      const back=node('button',t('Voltar','Back')),go=node('button',review?t('Entendi','Got it'):t('Entendi, vamos correr!','Got it, let’s race!'));back.className='btn';go.className='btn btn-primary';go.id='presentation-confirm';footer.append(back,go);dialog.append(footer);document.body.append(dialog);dialog.showModal();title.focus({preventScroll:true});dialog.scrollTop=0;
      return new Promise(resolve=>{
        let busy=false;
        function close(result){dialog.close();dialog.remove();active=false;resolve(result)}
        back.onclick=()=>{if(!busy)close(false)};
        dialog.addEventListener('cancel',event=>{event.preventDefault();if(!busy)close(false)});
        go.onclick=async()=>{
          if(busy)return;busy=true;go.disabled=back.disabled=true;
          try{
            if(!review){
              if(window.NeuroGarage?.getPlayer?.()?.username!==account.username)throw new Error(t('A conta mudou. Volte e tente novamente.','Account changed. Go back and try again.'));
              status.textContent=t('Salvando na conta…','Saving to your account…');await window.NeuroGarage.completeTutorial();
            }
            close(true);
          }catch{status.textContent=t('Não foi possível salvar. Confira a conexão e tente novamente.','Could not save. Check your connection and try again.');busy=false;go.disabled=back.disabled=false;}
        };
      });
    }
  };
})();
