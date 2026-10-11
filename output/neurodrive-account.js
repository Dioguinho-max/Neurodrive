(() => {
  'use strict';
  const get = id => document.getElementById(id);
  const pages = ['overview', 'achievements', 'edit', 'security'];
  if (!get('account-tab-overview')) return;
  let identity = null;
  function show(page, focus = false) {
    if (!pages.includes(page)) page = 'overview';
    for (const name of pages) {
      const selected = name === page, button = get(`account-tab-${name}`);
      button.setAttribute('aria-selected', String(selected));
      button.tabIndex = selected ? 0 : -1;
      get(`account-${name}`).hidden = !selected;
    }
    if (focus) get(`account-tab-${page}`).focus();
  }
  for (const [index, name] of pages.entries()) {
    const button = get(`account-tab-${name}`);
    button.onclick = () => show(name);
    button.onkeydown = event => {
      const next = event.key === 'ArrowRight' ? (index + 1) % pages.length
        : event.key === 'ArrowLeft' ? (index + pages.length - 1) % pages.length
        : event.key === 'Home' ? 0 : event.key === 'End' ? pages.length - 1 : -1;
      if (next >= 0) { event.preventDefault(); event.stopPropagation(); show(pages[next], true); }
    };
  }
  window.NeuroAccount = {
    show,
    setPlayer(username) {
      const next = username || null;
      if (next !== identity) { identity = next; show('overview'); }
    },
  };
  show('overview');
})();
