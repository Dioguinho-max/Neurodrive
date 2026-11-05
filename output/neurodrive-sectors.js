/* Compact session timing. Online values come exclusively from the server snapshot. */
(() => {
  window.createNeuroSectorHUD = root => {
    const panel = document.createElement('aside'); panel.className = 'sector-hud'; panel.hidden = true;
    panel.setAttribute('aria-label', 'Sector timing');
    const heading = document.createElement('strong'), delta = document.createElement('span');
    const row = document.createElement('div'); row.className = 'sector-splits';
    const chips = Array.from({length:3}, () => { const chip=document.createElement('span');row.append(chip);return chip; });
    panel.append(heading,delta,row); root.append(panel);
    let last = '', next = 0;
    const t = text => window.NeuroI18n?.t(text) || text;
    return (car,cars,active,now) => {
      panel.hidden = !active || !car?.sectorTiming;
      if (panel.hidden || now < next) return;
      next = now + 100;
      const timing = car.sectorTiming, values = timing.current.some(v=>v!==null) ? timing.current : timing.last || timing.current;
      const current = Math.min(2, Math.floor((timing.checkpoints?.length || 0)/4));
      const title = timing.invalid ? t('Volta inválida') : `S${current+1} · ${t('Melhor volta pessoal')}`;
      const difference = timing.invalid ? '—' : timing.delta === null ? t('Criando referência') : `${timing.delta > 0 ? '+' : ''}${timing.delta.toFixed(2)} s`;
      const states = values.map((v,i) => {
        if (v === null || timing.invalid) return '';
        const field = cars.map(c=>c.sectorTiming?.best[i]).filter(v=>Number.isFinite(v)&&v>0);
        return field.length && v <= Math.min(...field)+.001 ? 'purple' : timing.best[i] === null || v <= timing.best[i]+.001 ? 'green' : 'red';
      });
      const key = JSON.stringify([title,difference,values,states]); if(key===last)return;last=key;
      heading.textContent=title;delta.textContent=difference;delta.className=timing.delta<0?'green':timing.delta>0?'red':'';
      chips.forEach((chip,i)=>{chip.textContent=`S${i+1} ${values[i]===null?'—':values[i].toFixed(2)}`;chip.className=states[i];});
    };
  };
})();
