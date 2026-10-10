(() => {
  'use strict';
  window.createNeuroRecords = ({ request, player, visit }) => {
    const get = id => document.getElementById(id);
    const names = {serra:'Serra Verde',veloz:'Autódromo Veloz',tecnico:'Vale Técnico'};
    const time = ms => `${String(Math.floor(ms/60000)).padStart(2,'0')}:${(ms%60000/1000).toFixed(3).padStart(6,'0')}`;
    const gap = ms => ms === 0 ? 'Referência do circuito' : `+${(ms/1000).toFixed(3)} s`;
    const node = (tag,text) => {const element=document.createElement(tag);element.textContent=text;return element;};
    let offset=0,version=0;
    async function load(reset=false) {
      if(reset)offset=0;
      const current=++version, track=get('records-track').value, season=get('records-season').value;
      const local=window.createNeuroCareer?.().records[track];
      get('records-solo').textContent=local ? time(Math.round(local*1000)) : 'Sem volta registrada';
      get('records-status').textContent='Buscando voltas do circuito…';
      get('records-leader').hidden=true; get('records-rows').replaceChildren(); get('records-own').textContent='';get('records-page').textContent='';
      get('records-prev').disabled=get('records-next').disabled=true;
      try {
        const data=await request(`records?track=${encodeURIComponent(track)}&season=${encodeURIComponent(season)}&offset=${offset}`);
        if(current!==version)return;
        if(!data.available){get('records-status').textContent='O mural competitivo está disponível no site online. Seus tempos solo aparecem abaixo.';return;}
        const select=get('records-season');select.replaceChildren();
        for(const item of [{id:'all',name:'Histórico completo'},...data.seasons]){const option=node('option',item.name+(item.id===data.currentSeason?' · atual':''));option.value=item.id;select.append(option);}
        select.value=data.season;
        get('records-status').textContent=data.total ? `${data.total} pilotos · ${names[track]}` : 'Nenhuma volta limpa registrada neste circuito e período. Seja o primeiro!';
        if(data.leader){
          const hero=get('records-leader');hero.replaceChildren();
          if(data.leader.avatar){const image=node('img','');image.src=data.leader.avatar;image.alt='Foto de '+data.leader.nickname;hero.append(image);}
          hero.append(node('h4','🏆 Recorde · '+names[track]),node('p',data.leader.nickname),node('strong',time(data.leader.milliseconds)));
          hero.append(node('p',new Date(data.leader.achieved).toLocaleString('pt-BR')));
          const catalog=window.NeuroGarage?.getCatalog?.()||[],skin=catalog.find(item=>item.id===data.leader.skin);
          hero.append(node('p',`Carro padrão · pintura ${skin?.name||data.leader.skin} · ${data.seasons.find(item=>item.id===data.leader.season)?.name||data.leader.season}`));hero.hidden=false;
        }
        get('records-own').textContent=data.own ? `Sua posição: ${data.own.position}º · ${time(data.own.milliseconds)} · ${gap(data.own.gap)}` : player() ? 'Você ainda não tem uma volta competitiva neste período.' : 'Entre na conta para destacar sua posição.';
        for(const record of data.entries){
          const row=node('tr','');row.dataset.self=String(record.self);
          const name=node('td',''),label=node(player()?'button':'span',record.nickname+(record.self?' · você':''));
          if(player()){label.type='button';label.onclick=()=>visit(record.username);}name.append(label);
          const timing=node('td',time(record.milliseconds));timing.append(node('small',gap(record.gap)));
          row.append(node('td',String(record.position)),name,timing);get('records-rows').append(row);
        }
        get('records-page').textContent=data.total?`${offset+1}–${Math.min(offset+20,data.total)} de ${data.total}`:'Sem marcas';
        get('records-prev').disabled=offset===0;get('records-next').disabled=offset+20>=data.total;
      }catch(error){if(current===version)get('records-status').textContent=error.message||'Não foi possível carregar. Tente atualizar.';}
    }
    get('records-track').onchange=get('records-season').onchange=()=>load(true);
    get('records-refresh').onclick=()=>load();
    get('records-prev').onclick=()=>{offset=Math.max(0,offset-20);load();};
    get('records-next').onclick=()=>{offset+=20;load();};
    return {load:()=>load(true)};
  };
})();
