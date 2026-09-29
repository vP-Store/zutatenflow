'use strict';

(() => {
  const { $, esc, icon, state } = C;

  const ui = { group: 'Alle', filter: '', sort: 'name' };

  function groups() {
    const counts = new Map();
    for (const a of state.apps) counts.set(a.group, (counts.get(a.group) || 0) + 1);
    return [...counts.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 16);
  }

  function filtered() {
    const q = ui.filter.trim().toLowerCase();
    const list = state.apps.filter((a) => {
      if (ui.group === 'Angeheftet' && !state.settings.favorites.includes(a.id)) return false;
      if (ui.group !== 'Alle' && ui.group !== 'Angeheftet' && a.group !== ui.group) return false;
      return !q || a.name.toLowerCase().includes(q) || a.group.toLowerCase().includes(q);
    });
    if (ui.sort === 'usage') list.sort((a, b) => C.usage(b.id) - C.usage(a.id) || a.name.localeCompare(b.name, 'de'));
    return list;
  }

  function renderGrid() {
    const wrap = $('#app-grid-wrap');
    if (!wrap) return;
    const list = filtered();
    if (!list.length) {
      wrap.innerHTML = `<div class="empty">${state.apps.length ? 'Keine passende App gefunden.' : '<span class="spin"></span> Apps werden eingelesen …'}</div>`;
      return;
    }
    if (ui.sort === 'name' && ui.group === 'Alle' && !ui.filter) {
      // Nach Anfangsbuchstaben gruppieren
      const byLetter = new Map();
      for (const a of list) {
        let l = a.name[0].toUpperCase();
        if (!/[A-ZÄÖÜ]/.test(l)) l = '#';
        if (!byLetter.has(l)) byLetter.set(l, []);
        byLetter.get(l).push(a);
      }
      wrap.innerHTML = [...byLetter.entries()].map(([l, apps]) => `
        <div class="letter-group"><div class="letter">${esc(l)}</div><div class="tile-grid">${apps.map((a) => C.appTile(a)).join('')}</div></div>`).join('');
    } else {
      wrap.innerHTML = `<div class="tile-grid">${list.map((a) => C.appTile(a)).join('')}</div>`;
    }
    C.hydrate(wrap);
  }

  function render(el) {
    const gs = groups();
    el.innerHTML = `
      <div class="view-head">
        <div><h1>Apps</h1><p class="sub">${state.apps.length} Programme · Klick startet · Rechtsklick für mehr</p></div>
      </div>
      <div class="toolbar">
        <input class="input" id="app-filter" placeholder="Apps filtern …" value="${esc(ui.filter)}" style="width:260px">
        <div class="seg">
          <button class="${ui.sort === 'name' ? 'on' : ''}" data-sort="name">A–Z</button>
          <button class="${ui.sort === 'usage' ? 'on' : ''}" data-sort="usage">Häufig genutzt</button>
        </div>
        <span class="spacer"></span>
        <button class="btn" data-act="reload-apps">${icon('refresh')} Neu einlesen</button>
      </div>
      <div class="chips">
        ${['Alle', 'Angeheftet', ...gs.map(([g]) => g)].map((g) => {
          const n = g === 'Alle' ? state.apps.length : g === 'Angeheftet' ? state.settings.favorites.length : gs.find(([x]) => x === g)[1];
          return `<button class="chip${ui.group === g ? ' active' : ''}" data-group="${esc(g)}">${esc(g)}<span class="count">${n}</span></button>`;
        }).join('')}
      </div>
      <div class="section" style="margin-top:18px" id="app-grid-wrap"></div>`;
    renderGrid();
    const f = $('#app-filter');
    f.addEventListener('input', () => { ui.filter = f.value; renderGrid(); });
  }

  function onClick(e) {
    const g = e.target.closest('[data-group]');
    if (g) { ui.group = g.dataset.group; C.render(); return true; }
    const s = e.target.closest('[data-sort]');
    if (s) { ui.sort = s.dataset.sort; C.render(); return true; }
    const act = e.target.closest('[data-act="reload-apps"]');
    if (act) {
      C.setApps([]);
      renderGrid();
      C.loadApps(true).then(() => { if (state.view === 'apps') C.render(); });
      return true;
    }
    return false;
  }

  C.views.apps = {
    render,
    onClick,
    refreshGrid: renderGrid,
    focusFilter() { const f = $('#app-filter'); if (f) f.focus(); },
  };
})();
