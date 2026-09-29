'use strict';

(() => {
  const { $, api, esc, icon, state } = C;

  const ENGINES = [
    ['Google', 'https://www.google.com/search?q='],
    ['Bing', 'https://www.bing.com/search?q='],
    ['DuckDuckGo', 'https://duckduckgo.com/?q='],
    ['Ecosia', 'https://www.ecosia.org/search?q='],
  ];

  function render(el) {
    el.innerHTML = `
      <div class="view-head"><div><h1>Internet</h1><p class="sub">Suchen oder eine Adresse eingeben – geöffnet wird dein Standardbrowser.</p></div></div>
      <form class="web-search" id="web-form">
        <input class="input" id="web-q" placeholder="Suchbegriff oder Adresse, z. B. etsy.com" autocomplete="off">
        <button class="btn primary" type="submit">${icon('search')} Los</button>
      </form>
      <div class="toolbar" style="margin-top:12px">
        <span class="muted small">Suchmaschine:</span>
        <div class="seg">${ENGINES.map(([n, u]) => `<button class="${state.settings.searchEngine === u ? 'on' : ''}" data-engine="${esc(u)}">${n}</button>`).join('')}</div>
      </div>

      <section class="section">
        <div class="section-head"><h2>Deine Websites</h2><span class="muted small">Rechtsklick zum Bearbeiten</span></div>
        <div class="tile-grid">${state.settings.websites.map((s, i) => C.siteTile(s, i, true)).join('')}</div>
        <form class="add-site" id="site-form">
          <input class="input" id="site-name" placeholder="Name, z. B. Canva" required>
          <input class="input url" id="site-url" placeholder="Adresse, z. B. canva.com" required>
          <button class="btn" type="submit">${icon('plus')} Hinzufügen</button>
        </form>
      </section>`;

    $('#web-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const q = $('#web-q').value.trim();
      if (q) C.openWebQuery(q);
    });
    $('#site-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = $('#site-name').value.trim();
      const url = $('#site-url').value.trim();
      if (!name || !url) return;
      await C.saveSettings({ websites: [...state.settings.websites, { name, url: C.normalizeUrl(url) }] });
      C.render();
      C.toast(`${name} hinzugefügt`);
    });
    C.fixFavicons(el);
    $('#web-q').focus();
  }

  async function editSite(i) {
    const site = state.settings.websites[i];
    if (!site) return;
    const name = await C.prompt('Name der Website', site.name);
    if (name === null) return;
    const url = await C.prompt('Adresse', site.url);
    if (url === null) return;
    const websites = [...state.settings.websites];
    websites[i] = { name: name.trim() || site.name, url: C.normalizeUrl(url.trim() || site.url) };
    await C.saveSettings({ websites });
    C.render();
  }

  async function moveSite(i, d) {
    const websites = [...state.settings.websites];
    const j = i + d;
    if (j < 0 || j >= websites.length) return;
    [websites[i], websites[j]] = [websites[j], websites[i]];
    await C.saveSettings({ websites });
    C.render();
  }

  C.siteMenu = (i, x, y) => {
    const site = state.settings.websites[i];
    if (!site) return;
    C.ctxMenu(x, y, [
      { label: 'Öffnen', icon: 'external', run: () => api.openWeb(site.url) },
      { label: 'Bearbeiten', icon: 'rename', run: () => editSite(i) },
      { label: 'Nach vorne', icon: 'back', disabled: i === 0, run: () => moveSite(i, -1) },
      { label: 'Nach hinten', icon: 'forward', disabled: i === state.settings.websites.length - 1, run: () => moveSite(i, 1) },
      'sep',
      { label: 'Entfernen', icon: 'trash', danger: true, run: () => C.removeSite(i) },
    ]);
  };

  C.removeSite = async (i) => {
    await C.saveSettings({ websites: state.settings.websites.filter((_, k) => k !== i) });
    C.render();
  };

  function onClick(e) {
    const eng = e.target.closest('[data-engine]');
    if (eng) { C.saveSettings({ searchEngine: eng.dataset.engine }).then(() => C.render()); return true; }
    return false;
  }

  C.views.web = { render, onClick };
})();
