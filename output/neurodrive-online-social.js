/* Offline invitations and lightweight online diagnostics. */
(() => {
  const t = text => window.NeuroI18n?.t(text) || text;
  const roomCode = value => /^[a-f0-9]{6}$/i.test(value || '') ? value.toUpperCase() : '';
  function inviteURL(origin, code) {
    if(!roomCode(code)) return '';
    try { const url=new URL('online.html',origin+'/'); if(!['http:','https:'].includes(url.protocol)||['localhost','127.0.0.1','[::1]'].includes(url.hostname))return '';url.searchParams.set('room',roomCode(code));return url.href; } catch { return ''; }
  }
  function candidates(state) {
    const player=state?.cars.find(c=>c.id===state.self);
    return player?.done && state.phase==='racing' ? state.cars.filter(c=>c.id!==state.self&&!c.done&&!c.disconnected).sort((a,b)=>Number(b.player)-Number(a.player)||a.id-b.id) : [];
  }
  function diagnose({connected,age,rtt,fps,active}) {
    if(!connected) return 'Conexão interrompida';
    if(!active) return '';
    if(age>1500) return 'Sem atualizações do servidor';
    if(rtt>250 && fps>0 && fps<30) return 'Ping alto e FPS baixo';
    if(rtt>250) return 'Ping alto';
    if(fps>0 && fps<30) return 'FPS baixo · tente o modo Desempenho';
    return '';
  }
  window.NeuroOnlineSocial={roomCode,inviteURL,candidates,diagnose};
  window.createNeuroInvites = get => {
    let code='',origins=[],last='';
    const select=get('online-invite-origin'),input=get('online-invite-link'),qr=get('online-invite-qr');
    function render(){
      const url=inviteURL(select.value,code);
      input.value=url;get('online-invite-copy').disabled=!url;
      get('online-invite-note').textContent=t(url?'Cada amigo usa sua própria conta. Na rede local, conectem-se ao mesmo Wi-Fi.':'Use o endereço da rede mostrado no terminal do hospedeiro.');
      if(url===last)return;last=url;qr.replaceChildren();
      if(url&&window.qrcode){const image=window.qrcode(0,'M');image.addData(url);image.make();qr.innerHTML=image.createSvgTag({cellSize:4,margin:16,scalable:true});}
    }
    select.onchange=render;
    get('online-invite-copy').onclick=async()=>{
      try { await window.navigator.clipboard.writeText(input.value);get('online-invite-note').textContent=t('Link copiado!'); }
      catch { input.focus();input.select();get('online-invite-note').textContent=t('Selecione e copie o link acima.'); }
    };
    return { configure(config){
      const current=window.location?.origin;
      origins=[...new Set([current,...(config.lanOrigins||[])].filter(origin=>inviteURL(origin,'ABC123')))];
      select.replaceChildren();for(const origin of origins){const option=document.createElement('option');option.value=origin;option.textContent=origin;select.append(option);}
      select.value=origins[0]||'';select.hidden=origins.length<2;
    }, update(room){get('online-invite').hidden=!room;code=room?.code||'';render();} };
  };
})();
