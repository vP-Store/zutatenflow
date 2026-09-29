'use strict';

// Start, Navigation, globale Klicks und Tastatur, Aussehen

(() => {
  const { $, $$, api, icon, state } = C;
  const viewEl = $('#view');
  const VIEWS = ['home', 'apps', 'files', 'web', 'settings'];
  let current = null;

  // ---------------------------------------------------------------- Aussehen

  const mql = window.matchMedia('(prefers-color-scheme: light)');

  C.applyAppearance = () => {
    const s = state.settings;
    const theme = s.theme === 'system' ? (mql.matches ? 'light' : 'dark') : (s.theme || 'dark');
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.setProperty('--accent', s.accent || '#7c8cff');
    C.applyWallpaperDim(s.wallpaper ? s.wallpaper.dim : 0.6);
  };
  mql.addEventListener('change', () => { if (state.settings.theme === 'system') C.applyAppearance(); });

  C.applyWallpaperDim = (dim) => {
    document.documentElement.style.setProperty('--wp-dim', String(dim ?? 0.6));
  };

  function setWallpaper(dataUrl) {
    const wp = $('#wallpaper');
    if (dataUrl) {
      wp.style.backgroundImage = `url("${dataUrl}")`;
      document.body.classList.add('has-wallpaper');
    } else {
      wp.style.backgroundImage = '';
      document.body.classList.remove('has-wallpaper');
    }
  }

  // ---------------------------------------------------------------- Uhr

  C.tickClock = () => {
    const now = new Date();
    const time = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    $('#clock .time').textContent = time;
    $('#clock .date').textContent = now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
    const big = $('.big-time');
    if (big) big.textContent = time;
  };

  // ---------------------------------------------------------------- Navigation

  C.setView = (view) => {
    if (!VIEWS.includes(view)) view = 'home';
    state.view = view;
    $$('#sidebar [data-view]').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
    viewEl.scrollTop = 0;
    C.render();
  };

  C.render = () => {
    C.closeCtx();
    const v = C.views[state.view];
    if (current && current !== v && current.destroy) current.destroy();
    current = v;
    viewEl.dataset.view = state.view;
    v.render(viewEl);
    C.hydrate(viewEl);
  };

  // ---------------------------------------------------------------- Windows-Menü

  const winBtn = $('#win-menu-btn');
  const winMenu = $('#win-menu');

  function toggleWinMenu(open = winMenu.hidden) {
    winMenu.hidden = !open;
    winBtn.setAttribute('aria-expanded', String(open));
    if (open) winMenu.querySelector('button').focus();
  }

  winBtn.addEventListener('click', (e) => { e.stopPropagation(); toggleWinMenu(); });
  winMenu.addEventListener('click', (e) => {
    const b = e.target.closest('[data-action]');
    if (!b) return;
    toggleWinMenu(false);
    const a = b.dataset.action;
    if (a === 'hide') api.hideToWindows();
    else if (a === 'quit') api.quit();
    else C.safe(() => api.systemAction(a), 'Aktion fehlgeschlagen');
  });
  winMenu.addEventListener('keydown', (e) => {
    const btns = $$('button', winMenu);
    const i = btns.indexOf(document.activeElement);
    if (e.key === 'ArrowDown') { e.preventDefault(); btns[(i + 1) % btns.length].focus(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); btns[(i - 1 + btns.length) % btns.length].focus(); }
  });

  // ---------------------------------------------------------------- Globale Klicks

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.win-menu')) toggleWinMenu(false);
    if (!e.target.closest('.ctx-menu')) C.closeCtx();
    if (e.target.closest('.onboarding, .modal-wrap')) return;

    const nav = e.target.closest('#sidebar [data-view]');
    if (nav) { C.setView(nav.dataset.view); return; }

    const v = C.views[state.view];
    if (e.target.closest('#view') && v && v.onClick && v.onClick(e)) return;

    const pin = e.target.closest('[data-pin]');
    if (pin) { e.stopPropagation(); C.togglePin(pin.dataset.pin).then(() => (state.view === 'apps' ? C.views.apps.refreshGrid() : C.render())); return; }
    const rmSite = e.target.closest('[data-remove-site]');
    if (rmSite) { e.stopPropagation(); C.removeSite(Number(rmSite.dataset.removeSite)); return; }
    const appEl = e.target.closest('[data-app]');
    if (appEl) { C.launchApp(appEl.dataset.app); return; }
    const urlEl = e.target.closest('[data-url]');
    if (urlEl) { C.safe(() => api.openWeb(urlEl.dataset.url), 'Browser konnte nicht geöffnet werden'); return; }
    const fileEl = e.target.closest('[data-file]');
    if (fileEl) { C.openFile(fileEl.dataset.file); return; }
    const dirEl = e.target.closest('[data-dir]');
    if (dirEl) { C.views.files.openDir(dirEl.dataset.dir); return; }
    const gotoEl = e.target.closest('[data-goto]');
    if (gotoEl) { C.setView(gotoEl.dataset.goto); return; }
    const setEl = e.target.closest('[data-settings]');
    if (setEl) { C.safe(() => api.openSettingsPage(setEl.dataset.settings), 'Einstellungen konnten nicht geöffnet werden'); }
  });

  document.addEventListener('dblclick', (e) => {
    const v = C.views[state.view];
    if (e.target.closest('#view') && v && v.onDblClick) v.onDblClick(e);
  });

  document.addEventListener('contextmenu', (e) => {
    if (e.target.closest('input, textarea')) return; // normales Kopieren/Einfügen erlauben
    e.preventDefault();
    const v = C.views[state.view];
    if (e.target.closest('#view') && v && v.onContextMenu && v.onContextMenu(e)) return;
    const appEl = e.target.closest('[data-app]');
    if (appEl) { C.appMenu(appEl.dataset.app, e.clientX, e.clientY); return; }
    const siteEl = e.target.closest('[data-url]');
    if (siteEl) {
      const i = state.settings.websites.findIndex((s) => s.url === siteEl.dataset.url);
      if (i >= 0) C.siteMenu(i, e.clientX, e.clientY);
      return;
    }
    const fileEl = e.target.closest('[data-file]');
    if (fileEl) {
      const p = fileEl.dataset.file;
      C.ctxMenu(e.clientX, e.clientY, [
        { label: 'Öffnen', icon: 'external', run: () => C.openFile(p) },
        { label: 'Im Explorer zeigen', icon: 'folder', run: () => api.reveal(p) },
        { label: 'Pfad kopieren', icon: 'copy', run: () => api.copyText(p).then(() => C.toast('Pfad kopiert')) },
      ]);
      return;
    }
    C.closeCtx();
  });

  // Auf das Fenster gezogene Dateien nicht im Fenster öffnen
  ['dragover', 'drop'].forEach((ev) => document.addEventListener(ev, (e) => {
    if (!e.target.closest('#fav-grid')) e.preventDefault();
  }));

  // ---------------------------------------------------------------- Tastatur

  document.addEventListener('keydown', (e) => {
    if (C.onboarding.isOpen() || $('.modal-wrap')) return;
    const tag = document.activeElement && document.activeElement.tagName;
    const inField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';

    if (e.key === 'Escape') {
      toggleWinMenu(false);
      C.closeCtx();
      if (inField) document.activeElement.blur();
      return;
    }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); C.search.focus(); return; }
    if (e.altKey && !e.ctrlKey && /^[1-5]$/.test(e.key)) { e.preventDefault(); C.setView(VIEWS[Number(e.key) - 1]); return; }
    if ($('.ctx-menu')) return;

    const v = C.views[state.view];
    if (v && v.onKey && v.onKey(e)) return;

    // Einfach lostippen: landet in der Suche
    if (!inField && e.key.length === 1 && e.key !== ' ' && !e.ctrlKey && !e.altKey && !e.metaKey) C.search.focus();
  });

  // ---------------------------------------------------------------- Ereignisse aus dem Hauptprozess

  api.on('index:progress', (s) => { state.index = s; C.emit('index', s); });
  api.on('update:status', (s) => {
    const was = state.update && state.update.state;
    state.update = s;
    C.emit('update', s);
    const badge = $('#update-badge');
    badge.hidden = s.state !== 'ready';
    if (s.state === 'ready' && was !== 'ready') {
      C.toast(`Update ${s.version} ist bereit`, { action: { label: 'Jetzt neu starten', run: () => api.installUpdate() }, duration: 12000 });
    }
  });
  api.on('wallpaper:changed', setWallpaper);
  api.on('dashboard:shown', () => {
    if (state.view === 'home') C.render();
    C.emit('windows:refresh');
    api.drives().then((d) => { state.drives = d; }).catch(() => {});
  });

  $('#update-badge').addEventListener('click', () => api.installUpdate());

  // ---------------------------------------------------------------- Start

  async function init() {
    $$('[data-icon]').forEach((el) => { el.innerHTML = icon(el.dataset.icon); });
    C.tickClock();
    setInterval(C.tickClock, 1000);

    const [env, settings, quick, drives, idx, upd] = await Promise.all([
      api.envInfo().catch(() => ({})),
      api.getSettings().catch(() => state.settings),
      api.quickFolders().catch(() => []),
      api.drives().catch(() => []),
      api.indexStatus().catch(() => null),
      api.updateStatus().catch(() => null),
    ]);
    Object.assign(state, { env, settings, quick, drives, index: idx, update: upd });
    C.applyAppearance();
    api.wallpaper().then(setWallpaper).catch(() => {});
    if (upd && upd.state === 'ready') $('#update-badge').hidden = false;
    if (env.hotkeys && env.hotkeys.toggle === false) {
      C.toast('Strg + Alt + D ist schon von einem anderen Programm belegt – nutze das Windows-Menü oben links.', { error: true, duration: 9000 });
    }

    C.setView('home');
    if (!settings.onboardingDone) C.onboarding.start();

    await C.loadApps();
    const typing = /^(INPUT|TEXTAREA)$/.test((document.activeElement || {}).tagName);
    if ((state.view === 'home' || state.view === 'apps') && !typing) C.render();
    C.dock.refresh();
  }

  C.on('settings', (patch) => { if (patch && ('theme' in patch || 'accent' in patch)) C.applyAppearance(); });

  init();
})();
