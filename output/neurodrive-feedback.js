/* Optional driving cues, with bounded work and no additional render pass. */
(() => {
  const prefs={camera:true,passing:true,vibration:false};
  try{const saved=JSON.parse(window.localStorage?.getItem('neurodrive-feedback')||'{}');for(const key of Object.keys(prefs))if(typeof saved[key]==='boolean')prefs[key]=saved[key];}catch{}
  window.NeuroFeedbackPrefs=prefs;
  window.createNeuroDrivingFeedback=(prefix,audio,getPad)=>{
    const previous=new Map();let lastPass=-Infinity,lastRumble=-Infinity,lastImpact=0,lastGear=null,actuator=null;
    const stop=()=>{if(actuator){try{actuator.reset?.()?.catch?.(()=>{});}catch{}actuator=null;}previous.clear();lastImpact=0;lastGear=null;};
    for(const key of Object.keys(prefs)){
      const input=document.getElementById(prefix+'-feedback-'+key);if(!input)continue;
      input.checked=prefs[key];input.onchange=()=>{prefs[key]=input.checked;try{window.localStorage?.setItem('neurodrive-feedback',JSON.stringify(prefs));}catch{}if(!prefs.vibration)stop();};
    }
    window.addEventListener('blur',stop);document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
    return {stop,update(car,cars,active,now=performance.now()){
      if(!active||!car||car.done||car.cooldown||car.pitExit||car.pitState||document.hidden){stop();return;}
      const cos=Math.cos(car.angle),sin=Math.sin(car.angle);
      for(const other of cars){
        if(other.id===car.id||other.done||other.disconnected||other.pitExit||other.pitState||car.ghostChallenge)continue;
        const dx=other.x-car.x,dy=other.y-car.y,ahead=dx*cos+dy*sin,side=-dx*sin+dy*cos;
        const prior=previous.get(other.id);
        if(prefs.passing&&prior!==undefined&&prior*ahead<0&&Math.abs(ahead)<22&&Math.abs(side)>7&&Math.abs(side)<35&&Math.abs(car.speed-other.speed)>.35&&Math.max(car.speed,other.speed)>1.5&&now-lastPass>900){
          audio?.playPass?.(Math.sign(side),Math.min(1,Math.abs(car.speed-other.speed)/2));lastPass=now;
        }
        previous.set(other.id,ahead);
      }
      let pad;try{pad=getPad?.();}catch{}
      const next=pad?.vibrationActuator||pad?.hapticActuators?.[0];
      if(actuator&&actuator!==next){try{actuator.reset?.()?.catch?.(()=>{});}catch{}actuator=null;}
      if(prefs.vibration&&next&&now-lastRumble>220){
        const impact=Math.max(0,(car.impact||0)-lastImpact);
        const shift=lastGear!==null&&lastGear!==car.gear;
        const magnitude=impact>.12?Math.min(.38,impact*.4):shift?.10:car.brake>.7&&car.speed>1.3?.07:0;
        if(magnitude){
          actuator=next;lastRumble=now;
          try{const promise=next.playEffect?next.playEffect('dual-rumble',{duration:80,startDelay:0,strongMagnitude:magnitude,weakMagnitude:magnitude*.5}):next.pulse?.(magnitude,80);promise?.catch?.(()=>{});}catch{}
        }
      }
      lastImpact=car.impact||0;lastGear=car.gear;
    }};
  };
})();
