/* Contas e inventário pertencem ao servidor; o cliente apenas apresenta as opções. */
(() => {
  'use strict';
  const get = (id) => document.getElementById(id);
  let player = null;
  let skins = [];
  let busy = false;
  let online = false;
  let page = 'race';
  let authMode = 'login';
  let attempt = null;
  let identity = 0;
  let capabilities = { localRewards: true, online: false };
  let previewFactory, showroom, previewSkin, previewDrag;
  function inspectSkin(skin, scroll = false) {
    previewSkin = skin;
    get('garage-preview-name').textContent = skin.name;
    if (previewFactory && page === 'store') {
      try {
        showroom ||= previewFactory(get('garage-preview-canvas'));
        showroom.setSkin(skin);
        get('garage-preview-note').textContent = 'Arraste para girar • Setas do teclado também funcionam • Prévia sem compra';
      } catch {
        showroom?.dispose(); showroom = null;
        get('garage-preview-note').textContent = 'Prévia 3D indisponível neste navegador. As pinturas continuam disponíveis abaixo.';
      }
    }
    if (scroll) get('garage-preview-canvas').scrollIntoView?.({ block: 'center', behavior: 'auto' });
  }
  function setPreviewFactory(factory) {
    showroom?.dispose(); showroom = null; previewFactory = factory;
    if (factory && page === 'store' && previewSkin) inspectSkin(previewSkin);
  }
  // Ilustrações leves: cores vêm das variáveis CSS do catálogo, nunca de HTML interpolado.
  function createSkinPreview(skin) {
    const preview = document.createElement('div');
    preview.className = 'garage-preview';
    preview.setAttribute('data-finish', skin.finish || 'gloss');
    preview.setAttribute('data-view', 'perspective');
    preview.style.setProperty('--paint', skin.color);
    preview.style.setProperty('--stripe', skin.accent);
    const art = document.createElement('div');
    art.className = 'garage-preview-art';
    art.innerHTML = `<svg class="skin-perspective" viewBox="0 0 400 220" aria-hidden="true">
      <ellipse cx="200" cy="185" rx="164" ry="15" fill="#000" opacity=".32"/>
      <path d="M28 193 H372" stroke="#b9d7e8" opacity=".12"/>
      <g fill="#111820" stroke="#394450" stroke-width="2">
        <circle cx="110" cy="157" r="26"/><circle cx="292" cy="157" r="26"/>
      </g>
      <path d="M42 124 Q45 113 65 110 L118 102 L153 73 Q159 68 170 68 H232 Q242 68 250 78 L276 105 L337 114 Q353 118 355 135 L351 157 H321 A29 29 0 0 0 263 157 H139 A29 29 0 0 0 81 157 H43 Q36 150 38 139 Z" fill="var(--paint)" stroke="#172630" stroke-width="2"/>
      <path d="M126 103 L158 77 H187 V103 Z M194 77 H231 Q237 77 242 83 L260 103 H194 Z" fill="#182d3c" stroke="#96b8c8" stroke-width="1.5"/>
      <path d="M141 99 L162 81 H180 L157 99 Z M201 81 H229 L246 98 H233 Z" fill="#b1dae8" opacity=".2"/>
      <path d="M49 122 L119 112 H271 L341 123 V131 H45 Z" fill="var(--stripe)"/>
      <path d="M46 134 H80 M140 134 H262 M323 134 H349" stroke="#000" stroke-width="2" opacity=".16"/>
      <path d="M145 143 H256 V155 H145 Z M42 145 H76 V155 H44 Z M326 146 H352 L350 157 H326 Z" fill="#18232c"/>
      <path d="M150 111 V139 Q150 144 157 144 H234 Q240 144 241 136 L247 112" fill="none" stroke="#182d3c" stroke-width="1" opacity=".5"/>
      <path d="M213 116 H226" stroke="#25333d" stroke-width="3" stroke-linecap="round"/>
      <path d="M126 105 L143 103 L148 108 L130 111 Z" fill="var(--paint)" stroke="#273a46"/>
      <path d="M44 123 H67 L63 132 H41 Z" fill="#edfaff"/>
      <path d="M335 121 L350 125 L352 134 H335 Z" fill="#f14552"/>
      <path d="M39 137 H55" stroke="#111c24" stroke-width="5"/>
      <path d="M312 111 V100 M337 115 V100" stroke="#1a2630" stroke-width="4"/>
      <path d="M300 94 H351 V101 H300 Z" fill="#202d38" stroke="#576976"/>
      <g fill="#243541" stroke="#a8bdcc" stroke-width="2.5">
        <circle cx="110" cy="157" r="18"/><circle cx="292" cy="157" r="18"/>
        <path d="M110 139 V175 M92 157 H128 M97 144 L123 170 M97 170 L123 144 M292 139 V175 M274 157 H310 M279 144 L305 170 M279 170 L305 144" fill="none"/>
      </g>
      <g fill="#14212b" stroke="#c0d0db"><circle cx="110" cy="157" r="5"/><circle cx="292" cy="157" r="5"/></g>
      <path class="skin-paint-shine" d="M62 113 L120 106 H268 L331 116 H120 L50 124 Z M158 71 H233 L239 75 H158 Z" fill="#fff" opacity=".24"/>
    </svg>
    <svg class="skin-overhead" viewBox="0 0 400 220" aria-hidden="true">
      <ellipse cx="202" cy="178" rx="138" ry="18" fill="#000" opacity=".3"/>
      <g transform="translate(200 110) rotate(-90)">
        <g fill="#121922" stroke="#56616b"><rect x="-55" y="-92" width="17" height="34" rx="5"/><rect x="38" y="-92" width="17" height="34" rx="5"/><rect x="-55" y="61" width="17" height="34" rx="5"/><rect x="38" y="61" width="17" height="34" rx="5"/></g>
        <rect x="-47" y="-135" width="94" height="270" rx="27" fill="var(--paint)" stroke="#182530" stroke-width="3"/>
        <path d="M-10 -132 H10 V132 H-10 Z" fill="var(--stripe)"/>
        <path d="M-39 -49 L-32 -68 H32 L39 -49 L33 -24 H-33 Z" fill="#203846" stroke="#9bbac6"/>
        <path d="M-34 54 L-30 83 H30 L34 54 Z" fill="#203846" stroke="#9bbac6"/>
        <path d="M-40 -35 L-35 -22 V50 L-40 63 Z M40 -35 L35 -22 V50 L40 63 Z" fill="#172a38"/>
        <path class="skin-paint-shine" d="M-42 -109 Q-42 -129 -22 -129 H-14 V-49 H-42 Z M-42 -20 H-34 V78 H-42 Z" fill="#fff" opacity=".24"/>
        <path d="M-37 -118 H-17 M17 -118 H37" stroke="#e7fbff" stroke-width="7"/>
        <path d="M-37 121 H-17 M17 121 H37" stroke="#ed4a58" stroke-width="6"/>
        <path d="M-38 105 H38" stroke="#0d1720" stroke-width="5"/><rect x="-56" y="101" width="112" height="10" rx="2" fill="#222e39" stroke="#657482"/>
        <path d="M-38 -128 H38" stroke="#101b25" stroke-width="3"/>
      </g>
    </svg>`;
    const controls = document.createElement('div');
    controls.className = 'garage-preview-controls';
    controls.setAttribute('role', 'group');
    controls.setAttribute('aria-label', `Vista da pintura ${skin.name}`);
    const buttons = [];
    for (const [view, label] of [['perspective', 'Lateral'], ['overhead', 'De cima']]) {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = label;
      button.setAttribute('aria-pressed', String(view === 'perspective'));
      button.onclick = () => {
        preview.setAttribute('data-view', view);
        buttons.forEach(([other, key]) => other.setAttribute('aria-pressed', String(key === view)));
      };
      buttons.push([button, view]);
      controls.append(button);
    }
    const palette = document.createElement('span');
    const inspect = document.createElement('button');
    inspect.type = 'button'; inspect.textContent = 'Ver em 3D';
    inspect.onclick = () => inspectSkin(skin, true);
    controls.append(inspect);
    palette.className = 'garage-preview-palette';
    palette.textContent = 'CARROCERIA / FAIXAS';
    preview.append(art, palette, controls);
    return preview;
  }
  window.NeuroGarage = { getSkin: () => skins.find((skin) => skin.id === player?.equipped) || null, beginRace, finishRace, setPreviewFactory };

  function showPage(value) {
    page = value;
    get('menu-race-screen').hidden = page !== 'race';
    get('garage-panel').hidden = page === 'race';
    get('garage-login-screen').hidden = page !== 'account';
    get('garage-store-screen').hidden = page !== 'store';
    get('garage-title').textContent = page === 'store' ? 'Loja de pinturas' : 'Sua conta de piloto';
    for (const tab of ['race', 'account', 'store']) get(`menu-page-${tab}`).setAttribute('aria-pressed', String(page === tab));
    render();
    if (page === 'store' && skins.length) inspectSkin(previewSkin || skins.find((skin) => skin.id === player?.equipped) || skins[0]);
    else if (page !== 'store') { showroom?.dispose(); showroom = null; }
  }
  function setAuthMode(mode) {
    authMode = mode;
    get('garage-confirm-label').hidden = mode !== 'register';
    get('garage-confirm').required = mode === 'register';
    get('garage-confirm').disabled = mode !== 'register';
    get('garage-password').autocomplete = mode === 'register' ? 'new-password' : 'current-password';
    get('garage-auth-submit').value = mode;
    get('garage-auth-submit').textContent = mode === 'register' ? 'Criar meu piloto' : 'Entrar na conta';
    for (const tab of ['login', 'register']) get(`auth-${tab}-mode`).setAttribute('aria-pressed', String(mode === tab));
  }

  function beginRace(config) {
    const current = { owner: player?.username, identity, result: null, sending: false };
    attempt = current;
    if (!capabilities.localRewards) current.reason = 'No servidor publicado, as moedas são concedidas nas salas online. Esta corrida local foi um treino.';
    current.ticket = config && player && online && capabilities.localRewards
      ? request('races/start', config).then((result) => result.ticket).catch(() => null) : Promise.resolve(null);
  }
  async function finishRace(result) {
    const current = attempt;
    if (!current || current.sending) return;
    current.result = result;
    current.sending = true;
    get('race-reward-retry').hidden = true;
    get('race-reward').textContent = 'Conferindo recompensa…';
    try {
      const ticket = await current.ticket;
      if (current !== attempt) return;
      if (current.reason) { get('race-reward').textContent = current.reason; return; }
      if (!ticket || current.identity !== identity || current.owner !== player?.username) {
        get('race-reward').textContent = 'Corrida sem recompensa. Entre na conta antes da largada e mantenha a conexão com o servidor.';
        return;
      }
      const response = await request('races/finish', { ...result, ticket });
      if (current !== attempt || current.identity !== identity) return;
      player = response.player;
      get('race-reward').textContent = response.reward ? `+${response.reward} moedas! Saldo: ${player.coins}. Visite a loja no menu.` : 'Corrida registrada. Limite de 500 moedas por dia atingido.';
      render();
    } catch (error) {
      if (current !== attempt) return;
      get('race-reward').textContent = error.status ? error.message : 'Não foi possível salvar a recompensa. Tente novamente.';
      get('race-reward-retry').hidden = false;
    } finally { current.sending = false; }
  }

  async function request(route, data) {
    const response = await fetch(`/api/${route}`, {
      method: data ? 'POST' : 'GET', credentials: 'same-origin',
      ...(data ? { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) } : {}),
    });
    const result = await response.json();
    if (!response.ok) throw Object.assign(new Error(result.error || 'Não foi possível completar o pedido.'), { status: response.status });
    return result;
  }
  function render() {
    get('garage-auth').hidden = Boolean(player);
    get('auth-login-mode').hidden = get('auth-register-mode').hidden = Boolean(player);
    get('garage-auth-fields').disabled = busy || !online;
    get('garage-account').hidden = !player;
    get('garage-logout').disabled = busy;
    get('garage-retry').hidden = online;
    get('garage-retry').disabled = busy;
    get('garage-store-login').hidden = Boolean(player);
    get('garage-password-form').hidden = !player || !capabilities.online;
    get('garage-change-password').disabled = busy;
    get('garage-rewards-info').textContent = `${capabilities.online ? 'Conclua corridas nas salas online' : 'Conclua corridas conectado'}: 50 moedas + 20 por volta, até 200 por corrida e 500 por dia (UTC). Copa Neuro online: bônus de 90, 60 ou 30 moedas para o pódio, dentro dos mesmos limites. A classificação não dá moedas.`;
    get('garage-store-balance').textContent = player ? `Seu saldo: ${player.coins} moedas` : 'Entre na conta para guardar suas compras.';
    if (player) {
      get('garage-name').textContent = player.username;
      get('garage-balance').textContent = player.coins;
      get('garage-stats').textContent = `${player.stats?.races || 0} corridas registradas · ${player.stats?.wins || 0} vitórias`;
      const available = Date.now() >= player.nextBonusAt;
      get('garage-bonus').disabled = busy || !available;
      get('garage-bonus-note').textContent = available ? 'Seu bônus está disponível.'
        : `Próximo bônus: ${new Date(player.nextBonusAt).toLocaleString('pt-BR')}.`;
    }
    get('garage-skins').replaceChildren();
    for (const skin of skins) {
      const owned = player?.owned.includes(skin.id);
      const equipped = player?.equipped === skin.id;
      if (get('garage-filter').value === 'owned' && !owned) continue;
      const card = document.createElement('article');
      card.className = 'garage-skin';
      const preview = createSkinPreview(skin);
      const name = document.createElement('strong');
      name.textContent = skin.name;
      name.title = skin.finish === 'matte' ? 'Pintura fosca' : skin.finish === 'metallic' ? 'Pintura metálica' : 'Pintura brilhante';
      const price = document.createElement('span');
      price.textContent = owned ? 'Na sua garagem' : `${skin.price} moedas`;
      price.textContent += ` · ${skin.finish === 'matte' ? 'Fosca' : skin.finish === 'metallic' ? 'Metálica' : 'Brilhante'}`;
      const button = document.createElement('button');
      button.className = 'btn';
      button.type = 'button';
      button.textContent = equipped ? 'Equipada' : !player ? 'Entre para usar' : owned ? 'Equipar' : player.coins < skin.price ? `Faltam ${skin.price - player.coins} moedas` : 'Comprar e equipar';
      button.disabled = busy || !player || equipped || (!owned && player.coins < skin.price);
      button.onclick = () => act(owned ? 'equip' : 'buy', { skin: skin.id }, `${skin.name} equipada!`);
      card.append(preview, name, price, button);
      get('garage-skins').append(card);
    }
  }
  async function act(route, data, message) {
    if (busy) return;
    busy = true;
    get('garage-status').textContent = 'Salvando…';
    render();
    try {
      const result = await request(route, data);
      player = result.player || null;
      if (['login', 'register', 'logout'].includes(route)) { identity++; setAuthMode('login'); }
      get('garage-password').value = '';
      get('garage-confirm').value = '';
      get('garage-password').type = get('garage-confirm').type = 'password';
      get('garage-show-password').textContent = 'Mostrar senha';
      for (const id of ['garage-current-password', 'garage-new-password', 'garage-new-confirm']) get(id).value = '';
      get('garage-status').textContent = message;
    } catch (error) {
      if (error.status === 401 && !['login', 'register', 'password'].includes(route)) player = null;
      get('garage-status').textContent = error.status ? error.message : 'Conexão interrompida. Tente novamente; uma compra repetida não cobra duas vezes.';
    } finally { busy = false; render(); }
  }
  async function connect() {
    if (busy) return;
    if (window.location.protocol === 'file:') {
      get('garage-status').textContent = 'Modo visitante. Para usar contas e loja, inicie o servidor e abra http://127.0.0.1:3000. A corrida continua disponível sem conta.';
      render();
      return;
    }
    busy = true;
    render();
    try {
      skins = (await request('catalog')).skins;
      capabilities = await request('config').catch(() => ({ localRewards: true, online: false }));
      try { player = (await request('me')).player; }
      catch (error) { if (error.status !== 401) throw error; player = null; }
      online = true;
      get('garage-status').textContent = player ? 'Garagem sincronizada com sua conta.' : 'Entre ou crie sua conta. Você também pode jogar como visitante.';
    } catch {
      online = false;
      get('garage-status').textContent = 'Garagem indisponível. Inicie o backend e tente conectar novamente. Você pode continuar jogando como visitante.';
    } finally { busy = false; render(); }
  }
  get('garage-auth').onsubmit = (event) => {
    event.preventDefault();
    const action = event.submitter?.value === 'register' ? 'register' : authMode;
    if (action === 'register' && get('garage-password').value !== get('garage-confirm').value) {
      get('garage-status').textContent = 'As senhas não coincidem.';
      return;
    }
    act(action, { username: get('garage-username').value.trim(), password: get('garage-password').value }, action === 'register' ? 'Conta criada! Você recebeu 500 moedas.' : 'Bem-vindo de volta!');
  };
  get('garage-logout').onclick = () => act('logout', {}, 'Você saiu da conta. Modo visitante ativado.');
  get('garage-password-form').onsubmit = (event) => {
    event.preventDefault();
    if (get('garage-new-password').value !== get('garage-new-confirm').value) { get('garage-status').textContent = 'As novas senhas não coincidem.'; return; }
    act('password', { currentPassword: get('garage-current-password').value, password: get('garage-new-password').value }, 'Senha alterada. Outras sessões foram encerradas.');
  };
  get('garage-bonus').onclick = () => act('bonus', {}, '100 moedas adicionadas à sua conta.');
  get('garage-retry').onclick = connect;
  get('garage-panel').ontoggle = () => { if (!busy) render(); };
  get('garage-filter').onchange = render;
  for (const tab of ['race', 'account', 'store']) get(`menu-page-${tab}`).onclick = () => showPage(tab);
  get('garage-store-login').onclick = () => showPage('account');
  get('auth-login-mode').onclick = () => setAuthMode('login');
  get('auth-register-mode').onclick = () => setAuthMode('register');
  get('garage-show-password').onclick = () => {
    const show = get('garage-password').type === 'password';
    get('garage-password').type = get('garage-confirm').type = show ? 'text' : 'password';
    get('garage-show-password').textContent = show ? 'Ocultar senha' : 'Mostrar senha';
  };
  get('race-reward-retry').onclick = () => { if (attempt?.result) finishRace(attempt.result); };
  get('garage-preview-left').onclick = () => showroom?.rotate(-0.3);
  get('garage-preview-right').onclick = () => showroom?.rotate(0.3);
  get('garage-preview-reset').onclick = () => showroom?.reset();
  const previewCanvas = get('garage-preview-canvas');
  previewCanvas.onpointerdown = (event) => { previewDrag = { x: event.clientX, y: event.clientY }; previewCanvas.setPointerCapture?.(event.pointerId); };
  previewCanvas.onpointermove = (event) => {
    if (!previewDrag) return;
    showroom?.rotate(-(event.clientX - previewDrag.x) * 0.012, (event.clientY - previewDrag.y) * 0.008);
    previewDrag = { x: event.clientX, y: event.clientY };
  };
  previewCanvas.onpointerup = previewCanvas.onpointercancel = previewCanvas.onlostpointercapture = () => { previewDrag = null; };
  previewCanvas.onkeydown = (event) => {
    const rotation = { ArrowLeft: [-0.15, 0], ArrowRight: [0.15, 0], ArrowUp: [0, 0.1], ArrowDown: [0, -0.1] }[event.key];
    if (rotation) { event.preventDefault(); event.stopPropagation(); showroom?.rotate(...rotation); }
  };
  if (window.ResizeObserver) new window.ResizeObserver(() => showroom?.draw()).observe(previewCanvas);
  setAuthMode('login');
  connect();
})();
