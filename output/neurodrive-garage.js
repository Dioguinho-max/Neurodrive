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
  window.NeuroGarage = { getSkin: () => skins.find((skin) => skin.id === player?.equipped) || null, beginRace, finishRace };

  function showPage(value) {
    page = value;
    get('menu-race-screen').hidden = page !== 'race';
    get('garage-panel').hidden = page === 'race';
    get('garage-login-screen').hidden = page !== 'account';
    get('garage-store-screen').hidden = page !== 'store';
    get('garage-title').textContent = page === 'store' ? 'Loja de pinturas' : 'Sua conta de piloto';
    for (const tab of ['race', 'account', 'store']) get(`menu-page-${tab}`).setAttribute('aria-pressed', String(page === tab));
    render();
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
    current.ticket = config && player && online
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
      const preview = document.createElement('div');
      preview.className = 'garage-preview';
      preview.style.setProperty('--paint', skin.color);
      preview.style.setProperty('--stripe', skin.accent);
      preview.setAttribute('aria-hidden', 'true');
      const name = document.createElement('strong');
      name.textContent = skin.name;
      const price = document.createElement('span');
      price.textContent = owned ? 'Na sua garagem' : `${skin.price} moedas`;
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
      get('garage-status').textContent = message;
    } catch (error) {
      if (error.status === 401 && !['login', 'register'].includes(route)) player = null;
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
  setAuthMode('login');
  connect();
})();
