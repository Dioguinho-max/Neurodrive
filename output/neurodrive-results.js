/* Apresentação apenas: moedas e medalhas continuam vindo do servidor. */
(() => {
  const names = { first_win: '🏁 Primeira vitória', first_podium: '🥉 Primeiro pódio', record_holder: '🏆 Recordista' };
  window.createNeuroResults = (root, reward, improvement) => {
    if (!root) return null;
    const cards = [];
    for (const title of ['SUA POSIÇÃO', 'MELHOR VOLTA', 'SUA EVOLUÇÃO', 'RECOMPENSA', 'MEDALHAS NO PERFIL']) {
      const card = document.createElement('article'), label = document.createElement('span'), content = document.createElement('div');
      card.className = 'result-reveal-card'; label.className = 'result-reveal-label'; label.textContent = title;
      card.style.setProperty('--reveal-delay', `${cards.length * 260}ms`);
      card.append(label, content); root.append(card); cards.push(content);
    }
    cards[2].append(improvement); cards[3].append(reward);
    const skip = document.createElement('button'); skip.type = 'button'; skip.className = 'btn result-reveal-skip'; skip.textContent = 'Mostrar tudo';
    skip.onclick = () => root.setAttribute('data-revealed', 'true'); root.append(skip);
    let session = null, generation = 0, requested = '', pending = false;
    function medals() {
      if (root.hidden || pending) return;
      const key = `${session}:${reward.textContent}:${improvement.textContent}`;
      if (requested === key) return;
      requested = key; pending = true;
      const version = generation;
      fetch('/api/me', { credentials: 'same-origin' }).then(async response => {
        if (!response.ok) throw new Error();
        return response.json();
      }).then(({ player }) => {
        if (version !== generation) return;
        const earned = (player?.achievements || []).filter(item => names[item.code]);
        cards[4].textContent = earned.length ? earned.map(item => names[item.code]).join(' · ') : 'Nenhuma medalha registrada ainda. Continue correndo!';
      }).catch(() => { if (version === generation) cards[4].textContent = 'Entre no perfil para consultar suas medalhas.'; })
        .finally(() => { pending = false; medals(); });
    }
    new MutationObserver(medals).observe(reward, { childList: true, characterData: true, subtree: true });
    new MutationObserver(medals).observe(improvement, { childList: true, characterData: true, subtree: true });
    return {
      show(key, position, lap) {
        if (session !== key) {
          session = key; generation++; requested = ''; root.setAttribute('data-revealed', 'false');
          cards[4].textContent = 'Consultando medalhas salvas…';
        }
        root.hidden = false;
        cards[0].textContent = position;
        cards[1].textContent = lap;
        medals();
      },
      reset() { generation++; session = null; requested = ''; root.hidden = true; },
    };
  };
})();
