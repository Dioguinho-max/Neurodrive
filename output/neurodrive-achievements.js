(() => {
  'use strict';
  const medals={first_win:{name:'Primeira vitória',icon:'🏁',help:'Vença uma corrida registrada na conta.'},first_podium:{name:'Primeiro pódio',icon:'🥉',help:'Conclua uma corrida registrada entre os três primeiros.'},record_holder:{name:'Recordista',icon:'🏆',help:'Estabeleça um recorde de circuito no mural competitivo.'}};
  const tracks={serra:'Serra Verde',veloz:'Autódromo Veloz',tecnico:'Vale Técnico'};
  const time=ms=>`${String(Math.floor(ms/60000)).padStart(2,'0')}:${(ms%60000/1000).toFixed(3).padStart(6,'0')}`;
  const improvement=(before,after)=>{
    if(!Number.isFinite(after)||after<=0)return 'Nenhuma volta válida para comparar.';
    if(!Number.isFinite(before)||before<=0)return `Primeira marca pessoal: ${time(after)}.`;
    const delta=before-after;
    return delta>0?`Melhorou ${(delta/1000).toFixed(3)} s · ${time(before)} → ${time(after)}`:`Melhor volta: ${time(after)} · Recorde anterior: ${time(before)} · Sem melhoria nesta sessão.`;
  };
  const node=(tag,text)=>{const element=document.createElement(tag);element.textContent=text;return element;};
  function render(grid,history,achievements=[]){
    grid.replaceChildren();history.replaceChildren();
    for(const [code,medal] of Object.entries(medals)){
      const earned=achievements.find(item=>item.code===code),card=node('article','');card.className='pilot-medal';card.dataset.earned=String(Boolean(earned));
      const icon=node('span',medal.icon);icon.setAttribute('aria-hidden','true');
      card.append(icon,node('strong',medal.name),node('small',earned?'Conquistada':'A conquistar'),node('p',medal.help));grid.append(card);
    }
    for(const earned of [...achievements].filter(item=>medals[item.code]).sort((a,b)=>b.achieved-a.achieved||a.code.localeCompare(b.code))){
      const row=node('li','');row.append(node('strong',medals[earned.code].name));
      const date=node('time',new Date(earned.achieved).toLocaleString('pt-BR'));date.dateTime=new Date(earned.achieved).toISOString();row.append(date);
      if(earned.track)row.append(node('small',`${tracks[earned.track]||earned.track}${earned.season?' · '+earned.season:''}`));history.append(row);
    }
    if(!history.children.length)history.append(node('li','Suas conquistas aparecerão aqui com a data em que foram alcançadas.'));
  }
  window.NeuroAchievements={improvement,render};
  window.createNeuroRecordNotice=get=>{
    const seen=new Set();let until=0;
    return {
      clear(){seen.clear();until=0;get('record-celebration').hidden=true;},
      show(event){
        if(!event?.id||seen.has(event.id))return;
        seen.add(event.id);if(seen.size>200)seen.delete(seen.values().next().value);
        const box=get('record-celebration');box.hidden=false;box.dataset.circuit=String(Boolean(event.circuit));
        get('record-celebration-title').textContent=event.circuit?'🏆 RECORDE DO CIRCUITO':event.previous===null?'Primeira marca competitiva':'Novo recorde pessoal';
        get('record-celebration-detail').textContent=`${tracks[event.track]||event.track} · ${time(event.milliseconds)}${event.improvement>0?' · −'+(event.improvement/1000).toFixed(3)+' s':''}`;
        until=Date.now()+10000;
      },
      update(){if(until&&Date.now()>=until){get('record-celebration').hidden=true;until=0;}},
    };
  };
})();
