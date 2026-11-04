(() => {
  const table = document.getElementById('race-results-table');
  if (!table) return;
  const toggle = document.getElementById('race-results-details');
  const translate = text => window.NeuroI18n?.t(text) || text;
  const labels = ['Pos.', 'Piloto', 'Volta', 'Última volta', 'Melhor volta', 'Tempo total', 'Diferença', 'Estado'];
  function labelRows() {
    for (const row of table.querySelectorAll('tbody tr')) {
      [...row.children].forEach((cell, index) => {
        let label = cell.querySelector('.result-cell-label');
        if (!label) { label = document.createElement('span'); label.className = 'result-cell-label'; label.setAttribute('aria-hidden', 'true'); cell.prepend(label); }
        label.textContent = translate(labels[index]);
      });
    }
  }
  function setDetails(open) {
    table.dataset.details = String(open);
    toggle.setAttribute('aria-expanded', String(open));
    toggle.textContent = translate(open ? 'Menos detalhes' : 'Mais detalhes');
  }
  toggle.onclick = () => {
    setDetails(table.dataset.details !== 'true');
    // Do not send the player back to the menu while they are inspecting results.
    document.getElementById('race-results-stay')?.click();
  };
  window.NeuroResults = { refresh() { setDetails(false); labelRows(); } };
  window.addEventListener('neurodrive:language', () => { setDetails(table.dataset.details === 'true'); labelRows(); });
})();
