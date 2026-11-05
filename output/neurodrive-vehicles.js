/* Shared, lightweight vehicle selection. Paints remain cosmetic. */
(() => {
  window.createNeuroVehiclePicker = (prefix, onChange=()=>{}) => {
    const panel=document.getElementById(prefix+'-vehicle-panel');
    const value=document.getElementById(prefix+'-vehicle');
    if(!panel || !value) return;
    const buttons=panel.querySelectorAll('[data-vehicle]');
    function refresh(){for(const button of buttons)button.setAttribute('aria-pressed',String(button.dataset.vehicle===value.value));}
    try{value.value=window.neuroVehicleId(localStorage.getItem('neurodrive-vehicle'));}catch{}
    refresh();
    for(const button of buttons)button.onclick=()=>{
      if(panel.disabled) return;
      value.value=window.neuroVehicleId(button.dataset.vehicle);
      refresh();
      try{localStorage.setItem('neurodrive-vehicle',value.value);}catch{}
      onChange();
    };
  };
})();
