/* A vitrine só ocupa a GPU enquanto o menu está visível. */
(() => {
  const get = id => document.getElementById(id);
  const menu = get('race-menu'), canvas = get('home-car-canvas');
  if (!menu || !canvas) return;
  let factory, preview, skin, page = 'race', frame = 0, last = 0;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const compact = window.matchMedia('(max-width: 850px), (pointer: coarse)');
  function stop() {
    cancelAnimationFrame(frame); frame = 0; last = 0;
    preview?.dispose(); preview = null;
    canvas.hidden = true;
    get('home-car-fallback').hidden = false;
  }
  function animate(now) {
    if (!preview) return;
    if (now - last >= 50) {
      preview.rotate(last ? Math.min(now - last, 100) * .00008 : 0);
      last = now;
    }
    frame = requestAnimationFrame(animate);
  }
  function sync() {
    if (!factory || !menu.open || document.hidden || !['race', 'pause'].includes(page)) { stop(); return; }
    try {
      canvas.hidden = false;
      preview ||= factory(canvas);
      preview.setSkin(skin || { color: '#51bd91', accent: '#e1f9ee', finish: 'metallic' });
      get('home-car-fallback').hidden = true;
      cancelAnimationFrame(frame); frame = 0; last = 0;
      if (!reduced.matches && !compact.matches) frame = requestAnimationFrame(animate);
    } catch { stop(); }
  }
  window.NeuroHome = {
    setFactory(value) { stop(); factory = value; sync(); },
    setPage(value) { page = value; sync(); },
    update(player, skins) {
      skin = skins.find(item => item.id === player?.equipped) || skins[0];
      get('home-car-name').textContent = skin?.name || 'Original';
      get('home-pilot-name').textContent = player?.nickname || player?.username || 'Piloto visitante';
      get('home-pilot-detail').textContent = player ? `${player.achievements?.length || 0} medalhas · ${player.stats?.wins || 0} vitórias` : 'Entre para salvar seu progresso';
      const balance = get('home-pilot-coins');
      const coins = Number(player?.coins) || 0;
      balance.textContent = player ? `${new Intl.NumberFormat('pt-BR', coins >= 10000 ? { notation: 'compact', maximumFractionDigits: 1 } : {}).format(coins)} moedas` : 'Entrar →';
      balance.title = player ? `${new Intl.NumberFormat('pt-BR').format(coins)} moedas` : 'Entrar na conta';
      const avatar = get('home-avatar'); avatar.replaceChildren();
      if (player?.avatar) { const img = document.createElement('img'); img.src = player.avatar; img.alt = ''; avatar.append(img); }
      else avatar.textContent = (player?.nickname || player?.username || 'ND').slice(0,2).toUpperCase();
      sync();
    },
  };
  get('home-customize').onclick = () => window.NeuroGarage?.showPage('store');
  get('home-pilot').onclick = () => window.NeuroGarage?.showPage('account');
  new MutationObserver(sync).observe(menu, { attributes: true, attributeFilter: ['open'] });
  new ResizeObserver(() => preview?.draw()).observe(canvas);
  document.addEventListener('visibilitychange', sync);
  reduced.addEventListener('change', sync); compact.addEventListener('change', sync);
  window.addEventListener('pagehide', stop);
})();
