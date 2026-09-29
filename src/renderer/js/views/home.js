'use strict';

(() => {
  const { $, $$, api, esc, icon, state } = C;

  Object.assign(C.ICONS, {
    cloud: '<path d="M7 18h10a4 4 0 0 0 0-8 6 6 0 0 0-11.6 1.5A3.3 3.3 0 0 0 7 18z"/>',
    cloudSun: '<path d="M12 4v1M5.6 6.6l.7.7M18.4 6.6l-.7.7"/><path d="M8.5 11a3.5 3.5 0 0 1 6.7-1.3"/><path d="M8 20h9a3.5 3.5 0 0 0 0-7 5 5 0 0 0-9.7 1.3A2.9 2.9 0 0 0 8 20z"/>',
    rain: '<path d="M7 14h10a4 4 0 0 0 0-8 6 6 0 0 0-11.6 1.5A3.3 3.3 0 0 0 7 14z"/><path d="M8 17l-1 3M12 17l-1 3M16 17l-1 3"/>',
    snow: '<path d="M7 14h10a4 4 0 0 0 0-8 6 6 0 0 0-11.6 1.5A3.3 3.3 0 0 0 7 14z"/><path d="M8 18h.01M12 20h.01M16 18h.01M10 21h.01M14 22h.01"/>',
    storm: '<path d="M7 14h10a4 4 0 0 0 0-8 6 6 0 0 0-11.6 1.5A3.3 3.3 0 0 0 7 14z"/><path d="m12 14-2 4h4l-2 4"/>',
    fog: '<path d="M4 10h16M6 14h12M8 18h8"/><path d="M7 7a5 5 0 0 1 10 0"/>',
  });

  function weatherInfo(code, isDay = true) {
    if (code === 0) return { text: 'Klar', icon: isDay ? 'sun' : 'moon' };
    if (code <= 2) return { text: code === 1 ? 'Überwiegend klar' : 'Teilweise bewölkt', icon: isDay ? 'cloudSun' : 'cloud' };
    if (code === 3) return { text: 'Bedeckt', icon: 'cloud' };
    if (code === 45 || code === 48) return { text: 'Nebel', icon: 'fog' };
    if (code >= 51 && code <= 57) return { text: 'Nieselregen', icon: 'rain' };
    if (code >= 61 && code <= 67) return { text: 'Regen', icon: 'rain' };
    if (code >= 71 && code <= 77) return { text: 'Schnee', icon: 'snow' };
    if (code >= 80 && code <= 82) return { text: 'Regenschauer', icon: 'rain' };
    if (code >= 85 && code <= 86) return { text: 'Schneeschauer', icon: 'snow' };
    if (code >= 95) return { text: 'Gewitter', icon: 'storm' };
    return { text: '–', icon: 'cloud' };
  }

  function greeting() {
    const h = new Date().getHours();
    if (h < 5) return 'Gute Nacht';
    if (h < 11) return 'Guten Morgen';
    if (h < 18) return 'Hallo';
    if (h < 22) return 'Guten Abend';
    return 'Gute Nacht';
  }

  const QUICK = [
    ['WLAN', 'ms-settings:network-wifi', 'wifi'],
    ['Bluetooth', 'ms-settings:bluetooth', 'bluetooth'],
    ['Sound', 'ms-settings:sound', 'volume'],
    ['Anzeige', 'ms-settings:display', 'display'],
    ['Energie', 'ms-settings:powersleep', 'battery'],
    ['Updates', 'ms-settings:windowsupdate', 'update'],
    ['Drucker', 'ms-settings:printers', 'printer'],
  ];

  let timers = [];
  let calOffset = 0;

  // ---------------------------------------------------------------- Kacheln

  function appTile(app, draggable = false) {
    const pinned = state.settings.favorites.includes(app.id);
    return `<button class="tile" data-app="${esc(app.id)}" title="${esc(app.name)}"${draggable ? ' draggable="true"' : ''}>
      ${C.appIcon(app)}
      <span class="tname">${esc(app.name)}</span>
      <span class="pin${pinned ? ' on' : ''}" data-pin="${esc(app.id)}" title="${pinned ? 'Von Start lösen' : 'An Start anheften'}">${icon(pinned ? 'starFill' : 'star')}</span>
    </button>`;
  }
  C.appTile = appTile;

  function siteTile(site, idx, removable) {
    let host = '';
    try { host = new URL(site.url).hostname; } catch { /* ignore */ }
    return `<button class="tile" data-url="${esc(site.url)}" title="${esc(site.url)}">
      <span class="app-icon" style="${C.letterBg(site.name)}">${host ? `<img class="fav-img" src="https://www.google.com/s2/favicons?domain=${esc(host)}&sz=64" alt="" data-fallback="${esc((site.name[0] || '?').toUpperCase())}">` : esc(site.name[0] || '?')}</span>
      <span class="tname">${esc(site.name)}</span>
      ${removable ? `<span class="remove" data-remove-site="${idx}" title="Entfernen">${icon('close')}</span>` : ''}
    </button>`;
  }
  C.siteTile = siteTile;

  C.fixFavicons = (root) => {
    $$('img[data-fallback]', root).forEach((img) => {
      img.addEventListener('error', () => { img.parentElement.textContent = img.dataset.fallback; }, { once: true });
    });
  };

  function fileCard(f) {
    return `<button class="file-card" data-file="${esc(f.path)}" title="${esc(f.path)}">
      ${C.fileIcon(f)}
      <span class="fc-text"><div class="fc-name">${esc(f.name)}</div><div class="fc-sub">${esc(C.fmtDate(f.mtime))}</div></span>
    </button>`;
  }

  function driveCard(d) {
    const used = d.total ? (d.total - d.free) / d.total : 0;
    const label = d.letter === '/' ? 'System' : `Laufwerk (${d.letter}:)`;
    return `<button class="drive" data-dir="${esc(d.path)}">
      <span class="dtop">${icon('drive')} ${esc(label)}</span>
      <span class="bar${used > 0.9 ? ' warn' : ''}"><span style="width:${(used * 100).toFixed(1)}%"></span></span>
      <span class="dsub">${d.total ? `${C.fmtSize(d.free)} frei von ${C.fmtSize(d.total)}` : 'Kein Datenträger'}</span>
    </button>`;
  }

  // ---------------------------------------------------------------- Widgets

  async function renderWeather() {
    const el = $('#w-weather');
    if (!el) return;
    const w = state.settings.weather || {};
    if (w.lat == null) {
      el.innerHTML = `<div class="widget-head"><span>${icon('cloudSun')} Wetter</span></div>
        <p class="muted">Für welchen Ort soll das Wetter angezeigt werden?</p>
        <button class="btn small" data-act="set-city">${icon('plus')} Ort festlegen</button>`;
      return;
    }
    const d = await api.weather(w.lat, w.lon).catch(() => null);
    if (!$('#w-weather')) return;
    if (!d) {
      el.innerHTML = `<div class="widget-head"><span>${icon('cloud')} ${esc(w.name)}</span></div><p class="muted">Wetter gerade nicht erreichbar.</p>`;
      return;
    }
    const now = weatherInfo(d.code, d.isDay);
    const days = d.days.slice(1, 5).map((day) => {
      const wi = weatherInfo(day.code);
      const name = new Date(day.date).toLocaleDateString('de-DE', { weekday: 'short' });
      return `<div class="wday" title="${esc(wi.text)}${day.rain != null ? ` · Regen ${day.rain} %` : ''}"><span>${esc(name)}</span>${icon(wi.icon)}<b>${Math.round(day.max)}°</b><span class="muted">${Math.round(day.min)}°</span></div>`;
    }).join('');
    el.innerHTML = `
      <div class="widget-head"><span>${icon('pin')} ${esc(w.name)}</span><button class="icon-btn ghost" data-act="set-city" title="Ort ändern">${icon('rename')}</button></div>
      <div class="wnow">${icon(now.icon, 'big')}<div><div class="wtemp">${Math.round(d.temp)}°</div><div class="muted">${esc(now.text)} · gefühlt ${Math.round(d.feels)}°</div></div></div>
      <div class="wmeta muted"><span>${icon('wind')} ${Math.round(d.wind)} km/h</span><span>${icon('drop')} ${d.humidity} %</span></div>
      <div class="wdays">${days}</div>`;
  }

  async function renderStats() {
    const el = $('#w-stats');
    if (!el) return;
    const s = await api.stats().catch(() => null);
    if (!s || !$('#w-stats')) return;
    const sys = state.drives.find((d) => d.system) || state.drives[0];
    const diskUsed = sys && sys.total ? (sys.total - sys.free) / sys.total : 0;
    const mem = s.memUsed / s.memTotal;
    const bar = (v, warn) => `<span class="bar${v > warn ? ' warn' : ''}"><span style="width:${(v * 100).toFixed(1)}%"></span></span>`;
    const bat = state.battery;
    el.innerHTML = `
      <div class="widget-head"><span>${icon('cpu')} Dieser PC</span></div>
      <div class="stat"><span>Prozessor</span><b>${Math.round(s.cpu * 100)} %</b></div>${bar(s.cpu, 0.9)}
      <div class="stat"><span>Arbeitsspeicher</span><b>${C.fmtSize(s.memUsed)} / ${C.fmtSize(s.memTotal)}</b></div>${bar(mem, 0.9)}
      ${sys ? `<div class="stat"><span>Laufwerk ${esc(sys.letter)}${sys.letter === '/' ? '' : ':'}</span><b>${C.fmtSize(sys.free)} frei</b></div>${bar(diskUsed, 0.9)}` : ''}
      <div class="stat muted"><span>Läuft seit</span><span>${C.fmtDuration(s.uptime)}</span></div>
      ${bat ? `<div class="stat muted"><span>Akku</span><span>${Math.round(bat.level * 100)} %${bat.charging ? ' (lädt)' : ''}</span></div>` : ''}`;
  }

  function renderCalendar() {
    const el = $('#w-cal');
    if (!el) return;
    const today = new Date();
    const base = new Date(today.getFullYear(), today.getMonth() + calOffset, 1);
    const month = base.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' });
    const startDay = (base.getDay() + 6) % 7; // Montag = 0
    const daysInMonth = new Date(base.getFullYear(), base.getMonth() + 1, 0).getDate();
    let cells = ['Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa', 'So'].map((d) => `<span class="cal-h">${d}</span>`).join('');
    for (let i = 0; i < startDay; i++) cells += '<span></span>';
    for (let d = 1; d <= daysInMonth; d++) {
      const isToday = calOffset === 0 && d === today.getDate();
      cells += `<span class="cal-d${isToday ? ' today' : ''}">${d}</span>`;
    }
    const kw = isoWeek(today);
    el.innerHTML = `
      <div class="widget-head"><span>${icon('calendar')} ${esc(month)}</span>
        <span class="cal-nav"><button class="icon-btn ghost" data-cal="-1" title="Vorheriger Monat">${icon('back')}</button><button class="icon-btn ghost" data-cal="1" title="Nächster Monat">${icon('forward')}</button></span></div>
      <div class="cal-grid">${cells}</div>
      <div class="muted small">Heute: ${esc(today.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' }))} · KW ${kw}</div>`;
  }

  function isoWeek(d) {
    const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const day = t.getUTCDay() || 7;
    t.setUTCDate(t.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
    return Math.ceil(((t - yearStart) / 86400000 + 1) / 7);
  }

  function renderNotes() {
    const el = $('#w-notes');
    if (!el) return;
    el.innerHTML = `<div class="widget-head"><span>${icon('note')} Notizen</span><span class="muted small" id="notes-state"></span></div>
      <textarea id="notes" spellcheck="true" placeholder="Schnell etwas aufschreiben …">${esc(state.settings.notes || '')}</textarea>`;
    const ta = $('#notes');
    const save = C.debounce(async () => {
      await C.saveSettings({ notes: ta.value });
      const st = $('#notes-state');
      if (st) { st.textContent = 'gespeichert'; setTimeout(() => { if ($('#notes-state')) $('#notes-state').textContent = ''; }, 1500); }
    }, 600);
    ta.addEventListener('input', save);
  }

  async function chooseCity() {
    const q = await C.prompt('Wetter: Welcher Ort?', (state.settings.weather && state.settings.weather.name) || '', { okLabel: 'Suchen' });
    if (!q) return;
    const results = await C.safe(() => api.geocode(q), 'Ort konnte nicht gesucht werden');
    if (!results) return;
    if (!results.length) { C.toast('Ort nicht gefunden', { error: true }); return; }
    const r = results[0];
    await C.saveSettings({ weather: { city: q, name: r.name, lat: r.lat, lon: r.lon } });
    C.toast(`Wetter für ${r.name}${r.region ? ` (${r.region})` : ''}`);
    renderWeather();
  }
  C.chooseCity = chooseCity;

  // ---------------------------------------------------------------- Ansicht

  function render(el) {
    const favs = state.settings.favorites.map((id) => state.appsById.get(id)).filter(Boolean);
    const frequent = state.apps
      .filter((a) => !state.settings.favorites.includes(a.id) && C.usage(a.id) > 0)
      .sort((a, b) => C.usage(b.id) - C.usage(a.id))
      .slice(0, 8);
    const showHint = !C.lsGet('hintDismissed', false);
    const name = state.env.user ? `, ${state.env.user}` : '';
    const upd = state.update;

    el.innerHTML = `
      <div class="hero">
        <div>
          <h1>${esc(greeting())}${esc(name)}</h1>
          <p class="sub">${esc(new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}</p>
        </div>
        <div class="big-time"></div>
      </div>

      ${upd && upd.state === 'ready' ? `<div class="banner">${icon('update')}<span>Update auf Version <b>${esc(upd.version)}</b> ist bereit.</span><button class="btn primary small" data-act="install-update">Jetzt neu starten</button></div>` : ''}
      ${showHint ? `<div class="hint">${icon('keyboard')}
        <span>Zurück zu Windows: <kbd>Strg + Alt + D</kbd> oder oben links auf <b>Windows</b>. Einfach lostippen startet die Suche. Offene Fenster findest du unten in der Leiste.</span>
        <button class="close-hint icon-btn ghost" data-act="dismiss-hint" title="Ausblenden">${icon('close')}</button></div>` : ''}

      <div class="quick-row">
        ${QUICK.map(([label, uri, ic]) => `<button class="quick" data-settings="${uri}">${icon(ic)}<span>${label}</span></button>`).join('')}
        <button class="quick" data-act="lock">${icon('lock')}<span>Sperren</span></button>
      </div>

      <div class="widgets">
        <div class="widget" id="w-weather"><span class="spin"></span></div>
        <div class="widget" id="w-stats"><span class="spin"></span></div>
        <div class="widget" id="w-cal"></div>
        <div class="widget" id="w-notes"></div>
      </div>

      <section class="section">
        <div class="section-head"><h2>Angeheftete Apps</h2><span class="muted small">${favs.length > 1 ? 'Zum Sortieren ziehen' : ''}</span><button class="link-btn" data-goto="apps">Alle Apps →</button></div>
        ${favs.length
          ? `<div class="tile-grid" id="fav-grid">${favs.map((a) => appTile(a, true)).join('')}</div>`
          : `<div class="empty">Noch keine Apps angeheftet. Geh zu <b>Apps</b> und klick auf den Stern einer Kachel.</div>`}
      </section>

      ${frequent.length ? `<section class="section">
        <div class="section-head"><h2>Häufig verwendet</h2></div>
        <div class="tile-grid">${frequent.map((a) => appTile(a)).join('')}</div>
      </section>` : ''}

      <section class="section">
        <div class="section-head"><h2>Zuletzt verwendet</h2><button class="link-btn" data-goto="files">Alle Dateien →</button></div>
        <div id="home-recent"><span class="spin"></span></div>
      </section>

      <section class="section">
        <div class="section-head"><h2>Laufwerke & Ordner</h2></div>
        <div class="drive-grid" id="home-drives">
          ${state.drives.map(driveCard).join('')}
          ${(state.settings.pinnedFolders || []).map((f) => `<button class="drive" data-dir="${esc(f.path)}"><span class="dtop">${icon('folder')} ${esc(f.name)}</span><span class="dsub">${esc(f.path)}</span></button>`).join('')}
        </div>
      </section>

      <section class="section">
        <div class="section-head"><h2>Websites</h2><button class="link-btn" data-goto="web">Bearbeiten →</button></div>
        <div class="tile-grid">${state.settings.websites.map((s, i) => siteTile(s, i, false)).join('')}</div>
      </section>`;

    C.tickClock();
    renderWeather();
    renderStats();
    renderCalendar();
    renderNotes();
    C.fixFavicons(el);
    setupDrag(el);

    api.recentFiles().then((files) => {
      const r = $('#home-recent');
      if (!r) return;
      r.innerHTML = files && files.length
        ? `<div class="file-cards">${files.slice(0, 12).map(fileCard).join('')}</div>`
        : '<div class="empty">Noch keine zuletzt verwendeten Dateien gefunden.</div>';
    }).catch(() => {});

    timers.push(setInterval(renderStats, 3000));
    timers.push(setInterval(renderWeather, 20 * 60 * 1000));
  }

  function setupDrag(el) {
    const grid = $('#fav-grid', el);
    if (!grid) return;
    let dragId = null;
    grid.addEventListener('dragstart', (e) => {
      const t = e.target.closest('[data-app]');
      if (!t) return;
      dragId = t.dataset.app;
      t.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'move';
    });
    grid.addEventListener('dragend', (e) => { const t = e.target.closest('[data-app]'); if (t) t.classList.remove('dragging'); });
    grid.addEventListener('dragover', (e) => {
      e.preventDefault();
      const over = e.target.closest('[data-app]');
      const dragging = $('.dragging', grid);
      if (!over || !dragging || over === dragging) return;
      const r = over.getBoundingClientRect();
      const after = e.clientX > r.left + r.width / 2;
      grid.insertBefore(dragging, after ? over.nextSibling : over);
    });
    grid.addEventListener('drop', async (e) => {
      e.preventDefault();
      if (!dragId) return;
      const order = $$('[data-app]', grid).map((t) => t.dataset.app);
      dragId = null;
      await C.saveSettings({ favorites: order });
    });
  }

  function onClick(e) {
    const cal = e.target.closest('[data-cal]');
    if (cal) { calOffset += Number(cal.dataset.cal); renderCalendar(); return true; }
    const act = e.target.closest('[data-act]');
    if (act && act.dataset.act === 'set-city') { chooseCity(); return true; }
    if (act && act.dataset.act === 'lock') { api.systemAction('lock'); return true; }
    if (act && act.dataset.act === 'install-update') { api.installUpdate(); return true; }
    if (act && act.dataset.act === 'dismiss-hint') { C.lsSet('hintDismissed', true); C.render(); return true; }
    return false;
  }

  C.views.home = {
    render,
    onClick,
    destroy() { timers.forEach(clearInterval); timers = []; calOffset = 0; },
  };
})();
