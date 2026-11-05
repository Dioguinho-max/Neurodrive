(() => {
  const names={'sprint':'Corrida curta','lap-challenge':'Melhor volta','drift-challenge':'Duelo de Drift'};
  const t=s=>window.NeuroI18n?.t(s)||s;
  const value=(car,mode)=>car.disconnected?t('Desconectado'):mode==='drift-challenge'?`${car.challengeScore||0} ${t('pontos')}`:mode==='lap-challenge'?(car.challengeBest?car.challengeBest.toFixed(3)+' s':t('Sem volta válida')):car.finishTime!=null?car.finishTime.toFixed(3)+' s':t('Em pista');
  window.NeuroChallenges={names,value,rank:(cars,mode)=>[...cars].sort((a,b)=>Number(!!a.disconnected)-Number(!!b.disconnected)||((a.done&&b.done)?(a.place||99)-(b.place||99):0)||(mode==='drift-challenge'?(b.challengeScore||0)-(a.challengeScore||0):mode==='lap-challenge'?(a.challengeBest??Infinity)-(b.challengeBest??Infinity):(a.place||99)-(b.place||99)||b.progress-a.progress)||a.id-b.id)};
  window.createNeuroChallengesUI=get=>{
    let standingsKey='',finalKey='';
    return {
      room(room){
        const scores=room?.sessionStandings||[];
        get('online-session-board').hidden=!scores.length;
        const key=JSON.stringify(scores);if(key===standingsKey)return;standingsKey=key;
        get('online-session-scores').replaceChildren();
        for(const score of scores){const li=document.createElement('li');li.textContent=`${score.name} · ${score.points} ${t('pontos')} · ${score.wins} ${t('vitórias')}`;get('online-session-scores').append(li);}
      },
      state(state,visible){
        const mode=state?.mode,active=!!names[mode];
        if(!state){finalKey='';}
        get('neuro-race').setAttribute('data-timed-challenge',String(active&&mode!=='sprint'));
        get('neuro-race').classList?.toggle('drift-mode',mode==='drift-challenge');
        get('online-challenge-hud').hidden=!active||!visible||state.phase!=='racing';
        get('online-handbrake').hidden=mode!=='drift-challenge';
        if(!active)return;
        get('race-pit-panel').hidden=true;
        const car=state.cars.find(c=>c.id===state.self);
        const left=Math.max(0,Math.ceil(120-state.elapsed));
        get('online-challenge-title').textContent=t(names[mode])+(mode==='sprint'?'':` · ${Math.floor(left/60)}:${String(left%60).padStart(2,'0')}`);
        get('online-challenge-value').textContent=value(car,mode)+(mode==='drift-challenge'?` (+${car.challengeCombo||0} ×${car.challengeMultiplier||1})`:'');
        if(state.phase==='finished' && finalKey!==JSON.stringify([state.raceId,state.cars.map(c=>[c.id,c.place,c.disconnected,c.challengeBest,c.challengeScore])])){
          finalKey=JSON.stringify([state.raceId,state.cars.map(c=>[c.id,c.place,c.disconnected,c.challengeBest,c.challengeScore])]);
          get('online-grid-title').textContent=t(names[mode]);get('online-grid-rows').replaceChildren();
          for(const c of window.NeuroChallenges.rank(state.cars,mode)){const li=document.createElement('li');li.className='challenge-result';li.dataset.place=c.place||'—';li.textContent=`${c.name} · ${value(c,mode)}`;get('online-grid-rows').append(li);}
        }
        if(state.phase==='finished')get('online-reward').textContent=t('Desafio entre amigos · pontos no placar da sala, sem moedas.');
      },
    };
  };
})();
