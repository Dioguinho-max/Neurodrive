/* Brief sector notification, shared by solo and online. */
(() => {
 window.createNeuroSectorHUD = root => {
  const panel=document.createElement('aside');panel.className='sector-hud';panel.hidden=true;
  panel.setAttribute('role','status');panel.setAttribute('aria-live','polite');
  const heading=document.createElement('strong'),detail=document.createElement('span');panel.append(heading,detail);root.append(panel);
  let seen=null,expires=0;
  const t=text=>window.NeuroI18n?.t(text)||text;
  return (car,cars,active,now)=>{
   const timing=car?.sectorTiming;
   if(!timing){panel.hidden=true;seen=null;return;}
   let sector=-1;timing.current.forEach((v,i)=>{if(Number.isFinite(v))sector=i;});
   const completed=car.completedLaps||0,previous=sector<0&&completed>0&&timing.last;
   if(previous)sector=2;
   const key=`${completed}:${sector}`;
   if(!active){seen=key;expires=0;panel.hidden=true;return;}
   if(seen===null){seen=key;panel.hidden=true;return;}
   if(key!==seen){
    seen=key;
    const invalid=previous?timing.lastInvalid:timing.invalid||timing.warmup;
    const value=previous?timing.last[sector]:timing.current[sector];
    if(sector>=0&&!invalid&&Number.isFinite(value)){
     const best=(previous?timing.lastBest:timing.best)?.[sector];
     const difference=Number.isFinite(best)?value-best:null;
     const field=cars.flatMap(c=>[c.sectorTiming?.best[sector],!c.sectorTiming?.invalid?c.sectorTiming?.current[sector]:null]).filter(v=>Number.isFinite(v)&&v>0);
     panel.dataset.tone=field.length&&value<=Math.min(...field)+.001?'purple':difference===null?'neutral':difference<=0?'green':'red';
     heading.textContent=`S${sector+1} | ${value.toFixed(2)} s`;
     detail.textContent=difference===null?t('Primeira marca'):`${difference>0?'+':''}${difference.toFixed(2)} s`;
     expires=now+3500;
    }
   }
   panel.hidden=now>=expires;
  };
 };
})();
