/* Mesmo painel de pilotagem nos modos local e online. */
(() => {
  'use strict';
  window.createRaceHUD = (get) => (car, position, total, laps, elapsed) => {
    const rpm = Math.max(0, Math.min(8000, Number(car.rpm) || 0));
    get('race-rpm-fill').setAttribute('stroke-dashoffset', String(100 - rpm / 80));
    get('race-instruments').setAttribute('data-redline', String(rpm >= 6300));
    get('race-rpm').textContent = `${Math.round(rpm / 100) * 100} rpm`;
    get('race-gear').textContent = String(car.gear || 1);
    get('race-drive-mode').textContent = car.manual ? 'MANUAL' : 'AUTO';
    get('race-speed').textContent = String(Math.max(0, Math.round(car.speed * 54)));
    get('race-position').textContent = `${position} / ${total}`;
    get('race-lap').textContent = `${Math.max(1, Math.min(laps, car.completedLaps + 1))} / ${laps}`;
    get('race-time').textContent = `${Math.floor(elapsed / 60)}:${(elapsed % 60).toFixed(2).padStart(5, '0')}`;
  };
})();
