'use strict';

// Die Leiste unten: offene Fenster (wie die Windows-Taskleiste) und Status.

(() => {
  const { $, api, esc, icon, state } = C;
  const dock = $('#dock');
  const list = $('#dock-windows');
  let lastKey = '';
  let supported = true;

  function exeName(p) {
    return (p || '').split(/[\\/]/).pop().replace(/\.exe$/i, '');
  }

  function render() {
    if (!supported) {
      list.innerHTML = `<span class="dock-empty">${state.env.platform === 'win32' ? 'Fensterliste nicht verfügbar – siehe Einstellungen → Diagnose' : 'Offene Fenster werden unter Windows hier angezeigt'}</span>`;
      return;
    }
    if (!state.windows.length) {
      list.innerHTML = '<span class="dock-empty">Keine offenen Fenster</span>';
      return;
    }
    list.innerHTML = state.windows.map((w, i) => `
      <button class="dock-win${w.minimized ? ' minimized' : ''}" data-w="${i}" title="${esc(w.title)}">
        <span class="app-icon tiny" style="${C.letterBg(exeName(w.exe) || w.title)}"${w.exe ? ` data-iconpath="${esc(w.exe)}"` : ''}>${esc((exeName(w.exe) || w.title || '?')[0].toUpperCase())}</span>
        <span class="dw-title">${esc(w.title)}</span>
      </button>`).join('');
    C.hydrate(list);
  }

  async function refresh() {
    if (document.visibilityState !== 'visible') return;
    let res;
    try { res = await api.listWindows(); } catch { return; }
    supported = !!(res && res.supported);
    const wins = (res && res.windows) || [];
    const key = JSON.stringify(wins.map((w) => [w.hwnd, w.title, w.minimized]));
    state.windows = wins;
    if (key !== lastKey || !supported) {
      lastKey = key;
      render();
      C.emit('windows', wins);
    }
  }

  function winAt(el) {
    return state.windows[Number(el.dataset.w)];
  }

  list.addEventListener('click', async (e) => {
    const b = e.target.closest('[data-w]');
    if (!b) return;
    const w = winAt(b);
    if (w) await C.safe(() => api.focusWindow(w.hwnd), 'Fenster konnte nicht geöffnet werden');
    setTimeout(refresh, 300);
  });

  list.addEventListener('auxclick', (e) => {
    const b = e.target.closest('[data-w]');
    if (!b || e.button !== 1) return;
    const w = winAt(b);
    if (w) api.closeWindow(w.hwnd).then(() => setTimeout(refresh, 400));
  });

  list.addEventListener('contextmenu', (e) => {
    const b = e.target.closest('[data-w]');
    if (!b) return;
    e.preventDefault();
    e.stopPropagation();
    const w = winAt(b);
    if (!w) return;
    const r = b.getBoundingClientRect();
    C.ctxMenu(r.left, r.top - 170, [
      { label: 'In den Vordergrund', icon: 'external', run: () => api.focusWindow(w.hwnd) },
      { label: 'Minimieren', icon: 'minus', run: () => api.minimizeWindow(w.hwnd).then(() => setTimeout(refresh, 300)) },
      w.exe ? { label: 'Dateispeicherort öffnen', icon: 'folder', run: () => api.reveal(w.exe) } : null,
      'sep',
      { label: 'Fenster schließen', icon: 'close', danger: true, run: () => api.closeWindow(w.hwnd).then(() => setTimeout(refresh, 400)) },
    ]);
  });

  // ---------------------------------------------------------------- Status rechts

  const netEl = $('#dock-net');
  function updateNet() {
    const on = navigator.onLine;
    netEl.innerHTML = icon('wifi');
    netEl.classList.toggle('off', !on);
    netEl.title = on ? 'Online – Klick öffnet WLAN-Einstellungen' : 'Offline – Klick öffnet WLAN-Einstellungen';
  }
  window.addEventListener('online', updateNet);
  window.addEventListener('offline', updateNet);
  updateNet();
  netEl.addEventListener('click', () => api.openSettingsPage('ms-settings:network-wifi').catch(() => {}));
  $('#dock-sound').innerHTML = icon('volume');
  $('#dock-sound').addEventListener('click', () => api.openSettingsPage('ms-settings:sound').catch(() => {}));

  const batEl = $('#dock-bat');
  if (navigator.getBattery) {
    navigator.getBattery().then((bat) => {
      const upd = () => {
        // Desktop-PCs ohne Akku melden "voll & am Strom" – dann nichts anzeigen
        if (bat.charging && bat.level === 1 && bat.chargingTime === 0) { batEl.hidden = true; return; }
        batEl.hidden = false;
        const pct = Math.round(bat.level * 100);
        batEl.innerHTML = `<span class="bat"><span style="width:${pct}%" class="${pct <= 15 && !bat.charging ? 'low' : ''}"></span></span>${pct} %${bat.charging ? ' ⚡' : ''}`;
        batEl.title = bat.charging ? 'Lädt' : 'Akku';
        C.state.battery = { level: bat.level, charging: bat.charging };
      };
      ['levelchange', 'chargingchange'].forEach((ev) => bat.addEventListener(ev, upd));
      upd();
    }).catch(() => { batEl.hidden = true; });
  } else {
    batEl.hidden = true;
  }
  batEl.addEventListener('click', () => api.openSettingsPage('ms-settings:powersleep').catch(() => {}));

  $('#dock-home').innerHTML = icon('home');
  $('#dock-home').addEventListener('click', () => C.setView('home'));
  $('#dock-search').innerHTML = icon('search');
  $('#dock-search').addEventListener('click', () => C.search.focus());

  C.on('windows:refresh', refresh);
  document.addEventListener('visibilitychange', refresh);
  window.addEventListener('focus', refresh);
  setInterval(refresh, 1500);

  C.dock = { refresh, el: dock };
})();
