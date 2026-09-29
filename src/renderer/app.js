'use strict';

(() => {
  const api = window.cockpit;
  const $ = (sel, root = document) => root.querySelector(sel);
  const viewEl = $('#view');

  // ------------------------------------------------------------------ Icons

  const ICONS = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    apps: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    windows: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
    chart: '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5"/><path d="M5 12h11"/>',
    restart: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>',
    power: '<path d="M12 3v9"/><path d="M6.3 6.3a8 8 0 1 0 11.4 0"/>',
    close: '<path d="M6 6l12 12"/><path d="M18 6 6 18"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/>',
    starFill: '<path fill="currentColor" d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/>',
    up: '<path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>',
    back: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
    drive: '<rect x="3" y="13" width="18" height="7" rx="2"/><path d="M5 13 7.5 5h9L19 13"/><path d="M17 16.5h.01"/>',
    doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
    video: '<rect x="3" y="5" width="13" height="14" rx="2"/><path d="m16 10 5-3v10l-5-3"/>',
    music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
    archive: '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9"/><path d="M10 13h4"/>',
    program: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="m8 13 2 2-2 2M13 17h3"/>',
    code: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    external: '<path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  };

  const icon = (name) => `<svg class="i" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.file}</svg>`;

  const CAT_META = {
    ordner: { label: 'Ordner', icon: 'folder' },
    dokumente: { label: 'Dokumente', icon: 'doc' },
    bilder: { label: 'Bilder', icon: 'image' },
    videos: { label: 'Videos', icon: 'video' },
    musik: { label: 'Musik', icon: 'music' },
    archive: { label: 'Archive', icon: 'archive' },
    programme: { label: 'Programme', icon: 'program' },
    web: { label: 'Web & Code', icon: 'code' },
    sonstiges: { label: 'Sonstiges', icon: 'file' },
  };
  const CAT_ORDER = ['dokumente', 'bilder', 'videos', 'musik', 'archive', 'programme', 'web', 'sonstiges'];

  // ------------------------------------------------------------------ Helfer

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function fmtSize(b) {
    if (!b) return '–';
    const u = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
    return `${b.toLocaleString('de-DE', { maximumFractionDigits: b < 10 && i > 0 ? 1 : 0 })} ${u[i]}`;
  }

  function fmtDate(ms) {
    if (!ms) return '';
    const d = new Date(ms);
    const now = new Date();
    const t = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    const dayDiff = Math.floor((new Date(now.toDateString()) - new Date(d.toDateString())) / 86400000);
    if (dayDiff === 0) return `Heute, ${t}`;
    if (dayDiff === 1) return `Gestern, ${t}`;
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function hashHue(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h % 360;
  }

  function letterBg(name) {
    const h = hashHue(name);
    return `background:linear-gradient(135deg,hsl(${h} 70% 58%),hsl(${(h + 40) % 360} 70% 45%))`;
  }

  function fileUrl(p) {
    const norm = p.replace(/\\/g, '/');
    const parts = norm.split('/').map((seg, i) => (i === 0 && /^[A-Za-z]:$/.test(seg) ? seg : encodeURIComponent(seg)));
    const joined = parts.join('/');
    return joined.startsWith('/') ? `file://${joined}` : `file:///${joined}`;
  }

  function lsGet(key, fallback) {
    try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch { return fallback; }
  }
  function lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* ignore */ }
  }

  let toastTimer = null;
  function toast(msg, isError = false) {
    const t = $('#toast');
    t.textContent = msg;
    t.className = `toast${isError ? ' error' : ''}`;
    t.hidden = false;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, 2800);
  }

  async function safe(fn, errMsg) {
    try { return await fn(); } catch (err) {
      console.error(err);
      toast(`${errMsg}${err && err.message ? ` – ${err.message.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')}` : ''}`, true);
      return null;
    }
  }

  function looksLikeUrl(q) {
    return /^(https?:\/\/)?[\w-]+(\.[\w-]+)+(:\d+)?(\/\S*)?$/i.test(q) && !/\s/.test(q);
  }
  function normalizeUrl(q) {
    return /^https?:\/\//i.test(q) ? q : `https://${q}`;
  }

  // ------------------------------------------------------------------ Status

  const state = {
    view: 'home',
    env: {},
    settings: { favorites: [], websites: [], searchEngine: 'https://www.google.com/search?q=' },
    apps: [],
    appsById: new Map(),
    appGroup: 'Alle',
    appFilter: '',
    index: null,
    files: {
      mode: 'dir', // 'dir' | 'cat'
      dir: null,
      cat: null,
      sort: 'name',
      filter: '',
      listing: null, // { path, parent, entries }
      catData: null, // { total, items }
      history: [],
      loading: false,
    },
    drives: [],
    quick: [],
  };

  // ------------------------------------------------------------------ App-Icons (lazy)

  const iconObserver = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target;
      iconObserver.unobserve(el);
      const p = el.getAttribute('data-iconpath');
      if (!p) continue;
      api.getIcon(p).then((url) => {
        if (url) { el.innerHTML = `<img src="${url}" alt="">`; el.classList.add('has-img'); }
      }).catch(() => {});
    }
  }, { rootMargin: '200px' });

  function hydrateIcons(root = document) {
    root.querySelectorAll('[data-iconpath]:not([data-hydrated])').forEach((el) => {
      el.setAttribute('data-hydrated', '1');
      iconObserver.observe(el);
    });
  }

  function appIcon(app, small = false) {
    const letter = esc((app.name.match(/[A-Za-zÄÖÜäöü0-9]/) || ['?'])[0].toUpperCase());
    const iconPath = app.path || '';
    return `<span class="app-icon${small ? ' small' : ''}" style="${letterBg(app.name)}"${iconPath ? ` data-iconpath="${esc(iconPath)}"` : ''}>${letter}</span>`;
  }

  function fileIcon(entry) {
    if (entry.isDir) return `<span class="ficon ordner">${icon('folder')}</span>`;
    const cat = entry.cat || 'sonstiges';
    const ext = (entry.ext || '').slice(0, 4);
    return `<span class="ficon ${cat}">${ext ? esc(ext) : icon(CAT_META[cat].icon)}</span>`;
  }

  // ------------------------------------------------------------------ Uhr

  function tickClock() {
    const now = new Date();
    const time = now.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    const date = now.toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long' });
    $('#clock .time').textContent = time;
    $('#clock .date').textContent = date;
    const big = $('.big-time');
    if (big) big.textContent = time;
  }

  function greeting() {
    const h = new Date().getHours();
    if (h < 5) return 'Gute Nacht';
    if (h < 11) return 'Guten Morgen';
    if (h < 18) return 'Hallo';
    if (h < 22) return 'Guten Abend';
    return 'Gute Nacht';
  }

  // ------------------------------------------------------------------ Navigation

  function setView(view) {
    state.view = view;
    document.querySelectorAll('#sidebar button').forEach((b) => b.classList.toggle('active', b.dataset.view === view));
    viewEl.scrollTop = 0;
    render();
  }

  function render() {
    closeCtxMenu();
    ({ home: renderHome, apps: renderApps, files: renderFiles, web: renderWeb, settings: renderSettings }[state.view] || renderHome)();
    hydrateIcons(viewEl);
    fixFavicons(viewEl);
  }

  // ------------------------------------------------------------------ Start

  function appTile(app) {
    const pinned = state.settings.favorites.includes(app.id);
    return `<button class="tile" data-act="launch-app" data-id="${esc(app.id)}" title="${esc(app.name)}">
      ${appIcon(app)}
      <span class="tname">${esc(app.name)}</span>
      <span class="pin${pinned ? ' on' : ''}" data-act="pin" data-id="${esc(app.id)}" title="${pinned ? 'Von Start lösen' : 'An Start anheften'}">${icon(pinned ? 'starFill' : 'star')}</span>
    </button>`;
  }

  function siteTile(site, idx, removable) {
    let host = '';
    try { host = new URL(site.url).hostname; } catch { /* ignore */ }
    return `<button class="tile" data-act="open-web" data-url="${esc(site.url)}" title="${esc(site.url)}">
      <span class="app-icon" style="${letterBg(site.name)}">${host ? `<img class="fav-img" src="https://www.google.com/s2/favicons?domain=${esc(host)}&sz=64" alt="" data-fallback>` : esc(site.name[0] || '?')}</span>
      <span class="tname">${esc(site.name)}</span>
      ${removable ? `<span class="remove" data-act="remove-site" data-idx="${idx}" title="Entfernen">${icon('close')}</span>` : ''}
    </button>`;
  }

  function fileCard(f) {
    return `<button class="file-card" data-act="open-file" data-path="${esc(f.path)}" data-ctx="file" title="${esc(f.path)}">
      ${fileIcon(f)}
      <span class="fc-text"><div class="fc-name">${esc(f.name)}</div><div class="fc-sub">${esc(fmtDate(f.mtime))}</div></span>
    </button>`;
  }

  function driveCard(d) {
    const used = d.total ? (d.total - d.free) / d.total : 0;
    const label = d.letter === '/' ? 'System' : `Laufwerk (${d.letter}:)`;
    return `<button class="drive" data-act="open-dir" data-path="${esc(d.path)}">
      <span class="dtop">${icon('drive')} ${esc(label)}</span>
      <span class="bar${used > 0.9 ? ' warn' : ''}"><span style="width:${(used * 100).toFixed(1)}%"></span></span>
      <span class="dsub">${d.total ? `${fmtSize(d.free)} frei von ${fmtSize(d.total)}` : 'Kein Datenträger'}</span>
    </button>`;
  }

  function renderHome() {
    const user = state.env.user ? `, ${state.env.user}` : '';
    const favs = state.settings.favorites.map((id) => state.appsById.get(id)).filter(Boolean);
    const showHint = !lsGet('hintDismissed', false);

    viewEl.innerHTML = `
      <div class="hero">
        <div>
          <h1>${esc(greeting())}${esc(user)}</h1>
          <p class="sub">${esc(new Date().toLocaleDateString('de-DE', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }))}</p>
        </div>
        <div class="big-time"></div>
      </div>
      ${showHint ? `<div class="hint">${icon('keyboard')}
        <span>Zurück zu Windows: <kbd>Strg + Alt + D</kbd> oder oben links auf <b>Windows</b>. Zwischen offenen Programmen wechselst du mit <kbd>Alt + Tab</kbd>.</span>
        <button class="close-hint" data-act="dismiss-hint" title="Ausblenden">${icon('close')}</button></div>` : ''}

      <section class="section">
        <div class="section-head"><h2>Angeheftete Apps</h2><button class="link-btn" data-act="goto" data-view="apps">Alle Apps →</button></div>
        ${favs.length
          ? `<div class="tile-grid">${favs.map(appTile).join('')}</div>`
          : `<div class="empty">Noch keine Apps angeheftet. Geh zu <b>Apps</b> und klick auf den Stern einer Kachel.</div>`}
      </section>

      <section class="section">
        <div class="section-head"><h2>Zuletzt verwendet</h2><button class="link-btn" data-act="goto" data-view="files">Alle Dateien →</button></div>
        <div id="home-recent"><span class="spin"></span></div>
      </section>

      <section class="section">
        <div class="section-head"><h2>Laufwerke</h2></div>
        <div id="home-drives" class="drive-grid"></div>
      </section>

      <section class="section">
        <div class="section-head"><h2>Websites</h2><button class="link-btn" data-act="goto" data-view="web">Bearbeiten →</button></div>
        <div class="tile-grid">${state.settings.websites.map((s, i) => siteTile(s, i, false)).join('')}</div>
      </section>`;
    tickClock();

    api.recentFiles().then((files) => {
      const el = $('#home-recent');
      if (!el) return;
      el.innerHTML = files && files.length
        ? `<div class="file-cards">${files.slice(0, 12).map(fileCard).join('')}</div>`
        : '<div class="empty">Noch keine zuletzt verwendeten Dateien gefunden.</div>';
    }).catch(() => {});

    api.drives().then((drives) => {
      state.drives = drives;
      const el = $('#home-drives');
      if (el) el.innerHTML = drives.map(driveCard).join('');
    }).catch(() => {});
  }

  // ------------------------------------------------------------------ Apps

  function appGroups() {
    const counts = new Map();
    for (const a of state.apps) counts.set(a.group, (counts.get(a.group) || 0) + 1);
    return [...counts.entries()].filter(([, n]) => n >= 2).sort((a, b) => b[1] - a[1]).slice(0, 14);
  }

  function filteredApps() {
    const q = state.appFilter.trim().toLowerCase();
    return state.apps.filter((a) => {
      if (state.appGroup === 'Angeheftet' && !state.settings.favorites.includes(a.id)) return false;
      if (state.appGroup !== 'Alle' && state.appGroup !== 'Angeheftet' && a.group !== state.appGroup) return false;
      return !q || a.name.toLowerCase().includes(q);
    });
  }

  function renderApps() {
    const groups = appGroups();
    viewEl.innerHTML = `
      <h1>Apps</h1>
      <p class="sub">${state.apps.length} Programme · Klick startet, Stern heftet an die Startseite</p>
      <div class="section" style="margin-top:22px">
        <div class="section-head" style="justify-content:flex-start">
          <input class="input" id="app-filter" placeholder="Apps filtern …" value="${esc(state.appFilter)}" style="width:260px">
          <button class="btn" data-act="reload-apps">${icon('refresh')} Neu einlesen</button>
        </div>
        <div class="chips">
          ${['Alle', 'Angeheftet', ...groups.map(([g]) => g)].map((g) => {
            const n = g === 'Alle' ? state.apps.length : g === 'Angeheftet' ? state.settings.favorites.length : groups.find(([x]) => x === g)[1];
            return `<button class="chip${state.appGroup === g ? ' active' : ''}" data-act="app-group" data-group="${esc(g)}">${esc(g)}<span class="count">${n}</span></button>`;
          }).join('')}
        </div>
      </div>
      <div class="section" style="margin-top:20px" id="app-grid-wrap"></div>`;
    renderAppGrid();

    const f = $('#app-filter');
    f.addEventListener('input', () => { state.appFilter = f.value; renderAppGrid(); });
  }

  function renderAppGrid() {
    const wrap = $('#app-grid-wrap');
    if (!wrap) return;
    const list = filteredApps();
    wrap.innerHTML = list.length
      ? `<div class="tile-grid">${list.map(appTile).join('')}</div>`
      : `<div class="empty">${state.apps.length ? 'Keine passende App gefunden.' : '<span class="spin"></span> Apps werden eingelesen …'}</div>`;
    hydrateIcons(wrap);
  }

  async function loadApps(force = false) {
    const apps = await safe(() => api.listApps(force), 'Apps konnten nicht geladen werden');
    state.apps = apps || [];
    state.appsById = new Map(state.apps.map((a) => [a.id, a]));
  }

  function launchApp(id) {
    const app = state.appsById.get(id);
    if (!app) return;
    toast(`${app.name} wird gestartet …`);
    safe(() => api.launchApp(app), `${app.name} konnte nicht gestartet werden`);
  }

  async function togglePin(id) {
    const favs = [...state.settings.favorites];
    const i = favs.indexOf(id);
    if (i >= 0) favs.splice(i, 1); else favs.push(id);
    state.settings = await api.setSettings({ favorites: favs });
    if (state.view === 'apps') {
      renderAppGrid();
      // Zähler der Chips aktualisieren
      const chip = document.querySelector('.chip[data-group="Angeheftet"] .count');
      if (chip) chip.textContent = String(favs.length);
    } else render();
  }

  // ------------------------------------------------------------------ Dateien

  function sep(p) { return p.includes('\\') ? '\\' : '/'; }

  function crumbsFor(p) {
    const s = sep(p);
    const parts = p.split(s).filter(Boolean);
    const out = [];
    if (s === '/') {
      out.push({ label: '/', path: '/' });
      let acc = '';
      for (const part of parts) { acc += `/${part}`; out.push({ label: part, path: acc }); }
    } else {
      let acc = '';
      parts.forEach((part, i) => {
        acc = i === 0 ? `${part}\\` : `${acc}${acc.endsWith('\\') ? '' : '\\'}${part}`;
        out.push({ label: i === 0 ? `${part}` : part, path: acc });
      });
    }
    return out;
  }

  async function openDir(p, pushHistory = true) {
    const f = state.files;
    if (pushHistory && f.mode === 'dir' && f.dir && f.dir !== p) f.history.push(f.dir);
    f.mode = 'dir';
    f.dir = p;
    f.filter = '';
    f.loading = true;
    if (state.view !== 'files') setView('files'); else renderFiles();
    const listing = await safe(() => api.listDir(p, f.sort), 'Ordner konnte nicht geöffnet werden');
    if (listing && f.dir === p) {
      f.listing = listing;
    } else if (!listing && pushHistory && f.history.length) {
      f.dir = f.history.pop();
    }
    f.loading = false;
    if (state.view === 'files') renderFiles();
  }

  async function openCategory(cat) {
    const f = state.files;
    f.mode = 'cat';
    f.cat = cat;
    f.filter = '';
    if (f.sort === 'name') f.sort = 'mtime';
    f.loading = true;
    renderFiles();
    f.catData = await safe(() => api.filesByCategory(cat, f.sort), 'Dateien konnten nicht geladen werden');
    f.loading = false;
    if (state.view === 'files') renderFiles();
  }

  function renderFilesSide() {
    const f = state.files;
    const counts = (state.index && state.index.counts) || {};
    const indexing = state.index && state.index.running;
    return `
      <div class="fs-head">Schnellzugriff</div>
      ${state.quick.map((q) => `<button data-act="open-dir" data-path="${esc(q.path)}" class="${f.mode === 'dir' && f.dir === q.path ? 'active' : ''}">${icon(q.id === 'pictures' ? 'image' : q.id === 'music' ? 'music' : q.id === 'videos' ? 'video' : q.id === 'home' ? 'user' : q.id === 'documents' ? 'doc' : 'folder')}${esc(q.name)}</button>`).join('')}
      <div class="fs-head">Laufwerke</div>
      ${state.drives.map((d) => `<button data-act="open-dir" data-path="${esc(d.path)}" class="${f.mode === 'dir' && f.dir === d.path ? 'active' : ''}">${icon('drive')}${d.letter === '/' ? 'System' : `Laufwerk ${esc(d.letter)}:`}<span class="count">${d.total ? `${fmtSize(d.free)} frei` : ''}</span></button>`).join('')}
      <div class="fs-head">Nach Typ ${indexing ? '<span class="spin" title="Dateien werden durchsucht …"></span>' : ''}</div>
      ${CAT_ORDER.map((c) => `<button data-act="files-cat" data-cat="${c}" class="${f.mode === 'cat' && f.cat === c ? 'active' : ''}">${icon(CAT_META[c].icon)}${CAT_META[c].label}<span class="count">${counts[c] ? counts[c].toLocaleString('de-DE') : ''}</span></button>`).join('')}`;
  }

  function renderFiles() {
    const f = state.files;
    if (!f.dir && f.mode === 'dir') {
      const start = state.quick[0] ? state.quick[0].path : (state.drives[0] && state.drives[0].path);
      if (start) { openDir(start, false); return; }
    }

    const sortSel = `<select class="input" id="files-sort" style="height:36px" title="Sortieren">
      ${[['name', 'Name'], ['mtime', 'Datum'], ['size', 'Größe'], ['type', 'Typ']].map(([v, l]) => `<option value="${v}"${f.sort === v ? ' selected' : ''}>Sortieren: ${l}</option>`).join('')}
    </select>`;

    const toolbar = f.mode === 'dir'
      ? `<button class="icon-btn" data-act="files-back" title="Zurück"${f.history.length ? '' : ' disabled'}>${icon('back')}</button>
         <button class="icon-btn" data-act="files-up" title="Übergeordneter Ordner"${f.listing && f.listing.parent ? '' : ' disabled'}>${icon('up')}</button>
         <div class="crumbs">${f.dir ? crumbsFor(f.dir).map((c, i) => `${i ? '<span class="sep">›</span>' : ''}<button data-act="open-dir" data-path="${esc(c.path)}">${esc(c.label)}</button>`).join('') : ''}</div>
         <input class="input files-filter" id="files-filter" placeholder="Filtern …" value="${esc(f.filter)}">
         ${sortSel}
         <button class="icon-btn" data-act="reveal-dir" title="Im Windows-Explorer öffnen">${icon('external')}</button>`
      : `<div class="crumbs"><button>${icon(CAT_META[f.cat].icon)}&nbsp;${CAT_META[f.cat].label}</button></div>
         <input class="input files-filter" id="files-filter" placeholder="Filtern …" value="${esc(f.filter)}">
         ${sortSel}`;

    viewEl.innerHTML = `
      <div class="files-layout">
        <aside class="files-side" id="files-side">${renderFilesSide()}</aside>
        <section class="files-main">
          <div class="files-toolbar">${toolbar}</div>
          <div class="file-list" id="file-list"></div>
        </section>
      </div>`;
    renderFileList();

    const filt = $('#files-filter');
    filt.addEventListener('input', () => { f.filter = filt.value; renderFileList(); });
    $('#files-sort').addEventListener('change', (e) => {
      f.sort = e.target.value;
      if (f.mode === 'dir') openDir(f.dir, false); else openCategory(f.cat);
    });
  }

  const LIST_LIMIT = 600;

  function renderFileList() {
    const f = state.files;
    const el = $('#file-list');
    if (!el) return;
    if (f.loading) { el.innerHTML = '<div class="fl-empty"><span class="spin"></span> Wird geladen …</div>'; return; }

    let items = [];
    let total = 0;
    if (f.mode === 'dir') {
      items = f.listing && f.listing.path === f.dir ? f.listing.entries : [];
    } else {
      items = f.catData ? f.catData.items : [];
      total = f.catData ? f.catData.total : 0;
      if (!f.catData || (!total && state.index && state.index.running)) {
        el.innerHTML = '<div class="fl-empty"><span class="spin"></span> Deine Dateien werden gerade durchsucht – das kann beim ersten Start ein paar Minuten dauern.</div>';
        return;
      }
    }
    const q = f.filter.trim().toLowerCase();
    if (q) items = items.filter((e) => e.name.toLowerCase().includes(q));

    if (!items.length) { el.innerHTML = `<div class="fl-empty">${q ? 'Nichts gefunden.' : 'Dieser Ordner ist leer.'}</div>`; return; }

    const shown = items.slice(0, LIST_LIMIT);
    const more = (f.mode === 'cat' && !q ? total : items.length) - shown.length;

    if (f.mode === 'cat' && f.cat === 'bilder') {
      el.innerHTML = `<div class="thumb-grid">${shown.map((e) => `
        <button class="thumb" data-act="open-file" data-path="${esc(e.path)}" data-ctx="file" title="${esc(e.path)}">
          <span class="ti" data-bg="${esc(fileUrl(e.path))}"></span>
          <span class="tn">${esc(e.name)}</span>
        </button>`).join('')}</div>${more > 0 ? `<div class="fl-more">+ ${more.toLocaleString('de-DE')} weitere – nutze den Filter oder die Suche oben.</div>` : ''}`;
      lazyThumbs(el);
      return;
    }

    const sortBtn = (key, label) => `<button data-act="sort" data-sort="${key}" class="${f.sort === key ? 'sorted' : ''}">${label}${f.sort === key ? ' ↓' : ''}</button>`;
    el.innerHTML = `
      <div class="fl-row head"><span></span>${sortBtn('name', 'Name')}${sortBtn('mtime', 'Geändert')}${sortBtn('size', 'Größe')}${sortBtn('type', 'Typ')}</div>
      ${shown.map((e) => `
        <button class="fl-row" data-act="${e.isDir ? 'open-dir' : 'open-file'}" data-path="${esc(e.path)}" data-ctx="${e.isDir ? 'dir' : 'file'}" title="${esc(e.path)}">
          ${fileIcon(e)}
          <span style="min-width:0"><div class="fl-name">${esc(e.name)}</div>${f.mode === 'cat' ? `<div class="fl-path">${esc(e.path)}</div>` : ''}</span>
          <span class="fl-meta">${esc(fmtDate(e.mtime))}</span>
          <span class="fl-meta">${e.isDir ? '' : fmtSize(e.size)}</span>
          <span class="fl-meta">${e.isDir ? 'Ordner' : esc((e.ext || '').toUpperCase() || 'Datei')}</span>
        </button>`).join('')}
      ${more > 0 ? `<div class="fl-more">+ ${more.toLocaleString('de-DE')} weitere – nutze den Filter oder die Suche oben.</div>` : ''}`;
  }

  const thumbObserver = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target;
      thumbObserver.unobserve(el);
      el.style.backgroundImage = `url("${el.getAttribute('data-bg').replace(/"/g, '%22')}")`;
    }
  }, { rootMargin: '300px' });

  function lazyThumbs(root) {
    root.querySelectorAll('[data-bg]').forEach((el) => thumbObserver.observe(el));
  }

  // ------------------------------------------------------------------ Kontextmenü

  let ctxEl = null;
  function closeCtxMenu() { if (ctxEl) { ctxEl.remove(); ctxEl = null; } }

  function openCtxMenu(x, y, target) {
    closeCtxMenu();
    const p = target.getAttribute('data-path');
    const isDir = target.getAttribute('data-ctx') === 'dir';
    ctxEl = document.createElement('div');
    ctxEl.className = 'ctx-menu';
    ctxEl.innerHTML = `
      <button data-cmd="open">${icon(isDir ? 'folder' : 'external')} Öffnen</button>
      <button data-cmd="reveal">${icon('folder')} Im Explorer zeigen</button>
      <button data-cmd="copy">${icon('copy')} Pfad kopieren</button>`;
    document.body.appendChild(ctxEl);
    const r = ctxEl.getBoundingClientRect();
    ctxEl.style.left = `${Math.min(x, innerWidth - r.width - 8)}px`;
    ctxEl.style.top = `${Math.min(y, innerHeight - r.height - 8)}px`;
    ctxEl.addEventListener('click', (e) => {
      const b = e.target.closest('[data-cmd]');
      if (!b) return;
      const cmd = b.dataset.cmd;
      if (cmd === 'open') { if (isDir) openDir(p); else openFile(p); }
      if (cmd === 'reveal') safe(() => api.reveal(p), 'Konnte nicht angezeigt werden');
      if (cmd === 'copy') navigator.clipboard.writeText(p).then(() => toast('Pfad kopiert')).catch(() => toast('Kopieren fehlgeschlagen', true));
      closeCtxMenu();
    });
  }

  function openFile(p) {
    safe(() => api.openPath(p), 'Datei konnte nicht geöffnet werden');
  }

  // ------------------------------------------------------------------ Internet

  function renderWeb() {
    viewEl.innerHTML = `
      <h1>Internet</h1>
      <p class="sub">Suchen oder eine Adresse eingeben – geöffnet wird dein Standardbrowser.</p>
      <form class="web-search" id="web-form">
        <input class="input" id="web-q" placeholder="Suchbegriff oder Adresse, z. B. etsy.com" autocomplete="off">
        <button class="btn primary" type="submit">${icon('search')} Los</button>
      </form>

      <section class="section">
        <div class="section-head"><h2>Deine Websites</h2></div>
        <div class="tile-grid">${state.settings.websites.map((s, i) => siteTile(s, i, true)).join('')}</div>
        <form class="add-site" id="site-form">
          <input class="input" id="site-name" placeholder="Name, z. B. Canva" required>
          <input class="input url" id="site-url" placeholder="Adresse, z. B. canva.com" required>
          <button class="btn" type="submit">${icon('plus')} Hinzufügen</button>
        </form>
      </section>`;

    $('#web-form').addEventListener('submit', (e) => {
      e.preventDefault();
      const q = $('#web-q').value.trim();
      if (q) openWebQuery(q);
    });
    $('#site-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const name = $('#site-name').value.trim();
      const url = $('#site-url').value.trim();
      if (!name || !url) return;
      const websites = [...state.settings.websites, { name, url: normalizeUrl(url) }];
      state.settings = await api.setSettings({ websites });
      render();
      toast(`${name} hinzugefügt`);
    });
  }

  function openWebQuery(q) {
    const url = looksLikeUrl(q) ? normalizeUrl(q) : state.settings.searchEngine + encodeURIComponent(q);
    safe(() => api.openWeb(url), 'Browser konnte nicht geöffnet werden');
  }

  async function removeSite(idx) {
    const websites = state.settings.websites.filter((_, i) => i !== idx);
    state.settings = await api.setSettings({ websites });
    render();
  }

  function fixFavicons(root) {
    root.querySelectorAll('img[data-fallback]').forEach((img) => {
      img.addEventListener('error', () => {
        const box = img.parentElement;
        const name = box.parentElement.querySelector('.tname').textContent;
        box.textContent = (name[0] || '?').toUpperCase();
      }, { once: true });
    });
  }

  // ------------------------------------------------------------------ Einstellungen

  function indexText() {
    const s = state.index;
    if (!s) return 'Noch nicht gestartet';
    if (s.running) return `Läuft … ${s.total.toLocaleString('de-DE')} Dateien bisher`;
    if (s.done) return `${s.total.toLocaleString('de-DE')} Dateien erfasst${s.finishedAt ? ` · ${fmtDate(s.finishedAt)}` : ''}`;
    return 'Wartet …';
  }

  function renderSettings() {
    const s = state.settings;
    viewEl.innerHTML = `
      <h1>Einstellungen</h1>
      <p class="sub">Cockpit ${esc(state.env.version || '')}</p>
      <div class="settings-list">
        <div class="setting">
          <div class="st-text"><div class="st-title">Mit Windows starten</div><div class="st-sub">Cockpit öffnet sich automatisch, sobald du dich anmeldest.${state.env.packaged === false ? ' (Wirkt erst in der installierten Version.)' : ''}</div></div>
          <button class="switch" role="switch" aria-checked="${s.autostart ? 'true' : 'false'}" data-act="toggle-autostart" aria-label="Mit Windows starten"></button>
        </div>
        <div class="setting">
          <div class="st-text"><div class="st-title">Zu Windows wechseln</div><div class="st-sub">Blendet Cockpit aus. Dieselbe Taste holt es zurück – oder ein Klick auf das Symbol in der Taskleiste.</div></div>
          <kbd>Strg + Alt + D</kbd>
        </div>
        <div class="setting">
          <div class="st-text"><div class="st-title">Cockpit beenden</div><div class="st-sub">Beendet Cockpit komplett. Im Notfall geht es auch über den Task-Manager (Strg + Umschalt + Esc).</div></div>
          <kbd>Strg + Alt + Q</kbd>
        </div>
        <div class="setting">
          <div class="st-text"><div class="st-title">Datei-Übersicht</div><div class="st-sub" id="index-status">${esc(indexText())}</div></div>
          <button class="btn" data-act="rebuild-index">${icon('refresh')} Neu durchsuchen</button>
        </div>
        <div class="setting">
          <div class="st-text"><div class="st-title">Hinweis auf der Startseite</div><div class="st-sub">Die Erklärung der Tastenkombinationen wieder anzeigen.</div></div>
          <button class="btn" data-act="show-hint">Wieder anzeigen</button>
        </div>
        <div class="setting">
          <div class="st-text"><div class="st-title">Cockpit jetzt beenden</div><div class="st-sub">Du landest wieder bei der normalen Windows-Oberfläche.</div></div>
          <button class="btn" data-act="quit" style="color:var(--danger)">${icon('power')} Beenden</button>
        </div>
      </div>`;
  }

  // ------------------------------------------------------------------ Globale Suche

  const search = $('#search');
  const results = $('#search-results');
  let searchItems = [];
  let searchSel = 0;
  let searchSeq = 0;

  function closeSearch() { results.hidden = true; searchItems = []; }

  function renderSearch(q, files) {
    const needle = q.toLowerCase();
    const apps = state.apps
      .filter((a) => a.name.toLowerCase().includes(needle))
      .sort((a, b) => (b.name.toLowerCase().startsWith(needle) ? 1 : 0) - (a.name.toLowerCase().startsWith(needle) ? 1 : 0))
      .slice(0, 6);

    searchItems = [];
    let html = '';
    if (apps.length) {
      html += '<div class="sr-head">Apps</div>';
      for (const a of apps) {
        searchItems.push({ run: () => launchApp(a.id) });
        html += `<button class="sr-item" data-sr="${searchItems.length - 1}">${appIcon(a, true)}<span class="sr-text"><div class="sr-name">${esc(a.name)}</div><div class="sr-sub">${esc(a.group)}</div></span></button>`;
      }
    }
    if (files && files.length) {
      html += '<div class="sr-head">Dateien</div>';
      for (const f of files.slice(0, 8)) {
        searchItems.push({ run: () => openFile(f.path) });
        html += `<button class="sr-item" data-sr="${searchItems.length - 1}">${fileIcon(f)}<span class="sr-text"><div class="sr-name">${esc(f.name)}</div><div class="sr-sub">${esc(f.path)}</div></span></button>`;
      }
    } else if (files === null) {
      html += '<div class="sr-head">Dateien</div><div class="sr-empty"><span class="spin"></span></div>';
    }
    html += '<div class="sr-head">Internet</div>';
    if (looksLikeUrl(q)) {
      searchItems.push({ run: () => openWebQuery(q) });
      html += `<button class="sr-item" data-sr="${searchItems.length - 1}"><span class="ficon web">${icon('globe')}</span><span class="sr-text"><div class="sr-name">${esc(normalizeUrl(q))}</div><div class="sr-sub">Website öffnen</div></span></button>`;
    }
    searchItems.push({ run: () => safe(() => api.openWeb(state.settings.searchEngine + encodeURIComponent(q)), 'Browser konnte nicht geöffnet werden') });
    html += `<button class="sr-item" data-sr="${searchItems.length - 1}"><span class="ficon web">${icon('search')}</span><span class="sr-text"><div class="sr-name">„${esc(q)}“ im Internet suchen</div><div class="sr-sub">Google</div></span></button>`;

    results.innerHTML = html;
    results.hidden = false;
    searchSel = Math.min(searchSel, searchItems.length - 1);
    highlightSearch();
    hydrateIcons(results);
  }

  function highlightSearch() {
    results.querySelectorAll('.sr-item').forEach((el) => el.classList.toggle('sel', Number(el.dataset.sr) === searchSel));
    const sel = results.querySelector('.sr-item.sel');
    if (sel) sel.scrollIntoView({ block: 'nearest' });
  }

  let searchTimer = null;
  search.addEventListener('input', () => {
    const q = search.value.trim();
    searchSel = 0;
    if (!q) { closeSearch(); return; }
    renderSearch(q, null);
    clearTimeout(searchTimer);
    const seq = ++searchSeq;
    searchTimer = setTimeout(async () => {
      const files = await api.searchFiles(q).catch(() => []);
      if (seq === searchSeq && search.value.trim() === q) renderSearch(q, files);
    }, 150);
  });

  search.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); searchSel = Math.min(searchSel + 1, searchItems.length - 1); highlightSearch(); }
    if (e.key === 'ArrowUp') { e.preventDefault(); searchSel = Math.max(searchSel - 1, 0); highlightSearch(); }
    if (e.key === 'Enter') {
      e.preventDefault();
      const item = searchItems[searchSel];
      if (item) { item.run(); search.value = ''; closeSearch(); search.blur(); }
    }
    if (e.key === 'Escape') { search.value = ''; closeSearch(); search.blur(); }
  });

  search.addEventListener('focus', () => { if (search.value.trim()) search.dispatchEvent(new Event('input')); });

  results.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sr]');
    if (!b) return;
    const item = searchItems[Number(b.dataset.sr)];
    if (item) { item.run(); search.value = ''; closeSearch(); }
  });

  // ------------------------------------------------------------------ Windows-Menü

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
    else safe(() => api.systemAction(a), 'Aktion fehlgeschlagen');
  });

  // ------------------------------------------------------------------ Klicks (Delegation)

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.win-menu')) toggleWinMenu(false);
    if (!e.target.closest('.search-wrap')) closeSearch();
    if (!e.target.closest('.ctx-menu')) closeCtxMenu();

    const nav = e.target.closest('#sidebar [data-view]');
    if (nav) { setView(nav.dataset.view); return; }

    const el = e.target.closest('[data-act]');
    if (!el) return;
    const act = el.dataset.act;
    switch (act) {
      case 'pin': e.stopPropagation(); togglePin(el.dataset.id); break;
      case 'remove-site': e.stopPropagation(); removeSite(Number(el.dataset.idx)); break;
      case 'launch-app': launchApp(el.dataset.id); break;
      case 'open-file': openFile(el.dataset.path); break;
      case 'open-dir': openDir(el.dataset.path); break;
      case 'open-web': safe(() => api.openWeb(el.dataset.url), 'Browser konnte nicht geöffnet werden'); break;
      case 'goto': setView(el.dataset.view); break;
      case 'dismiss-hint': lsSet('hintDismissed', true); render(); break;
      case 'show-hint': lsSet('hintDismissed', false); toast('Hinweis wird auf der Startseite angezeigt'); break;
      case 'app-group': state.appGroup = el.dataset.group; renderApps(); break;
      case 'reload-apps':
        state.apps = [];
        renderAppGrid();
        loadApps(true).then(() => { if (state.view === 'apps') renderApps(); });
        break;
      case 'files-cat': openCategory(el.dataset.cat); break;
      case 'files-back': if (state.files.history.length) openDir(state.files.history.pop(), false); break;
      case 'files-up': if (state.files.listing && state.files.listing.parent) openDir(state.files.listing.parent); break;
      case 'reveal-dir': if (state.files.dir) safe(() => api.openPath(state.files.dir), 'Explorer konnte nicht geöffnet werden'); break;
      case 'sort': {
        state.files.sort = el.dataset.sort;
        if (state.files.mode === 'dir') openDir(state.files.dir, false); else openCategory(state.files.cat);
        break;
      }
      case 'toggle-autostart': {
        const on = !state.settings.autostart;
        api.setSettings({ autostart: on }).then((s) => { state.settings = s; renderSettings(); toast(on ? 'Autostart eingeschaltet' : 'Autostart ausgeschaltet'); });
        break;
      }
      case 'rebuild-index': api.rebuildIndex(); toast('Dateien werden neu durchsucht …'); break;
      case 'quit': api.quit(); break;
      default: break;
    }
  });

  document.addEventListener('contextmenu', (e) => {
    const t = e.target.closest('[data-ctx]');
    e.preventDefault();
    if (t) openCtxMenu(e.clientX, e.clientY, t);
    else closeCtxMenu();
  });

  // Einfach lostippen: Tastendruck ohne Eingabefeld landet in der Suche
  document.addEventListener('keydown', (e) => {
    const tag = document.activeElement && document.activeElement.tagName;
    const inField = tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
    if (e.key === 'Escape') { toggleWinMenu(false); closeCtxMenu(); }
    if (!inField && e.key.length === 1 && e.key !== ' ' && !e.ctrlKey && !e.altKey && !e.metaKey) {
      search.focus();
    }
    if (e.altKey && !e.ctrlKey && /^[1-5]$/.test(e.key)) {
      setView(['home', 'apps', 'files', 'web', 'settings'][Number(e.key) - 1]);
    }
  });

  // ------------------------------------------------------------------ Index-Fortschritt

  api.on('index:progress', (s) => {
    const wasRunning = state.index && state.index.running;
    state.index = s;
    if (state.view === 'files') {
      const side = $('#files-side');
      if (side) side.innerHTML = renderFilesSide();
      if (state.files.mode === 'cat' && (!s.running && wasRunning)) openCategory(state.files.cat);
    }
    const st = $('#index-status');
    if (st) st.textContent = indexText();
  });

  api.on('dashboard:shown', () => { if (state.view === 'home') renderHome(); });

  // ------------------------------------------------------------------ Start

  async function init() {
    document.querySelectorAll('[data-icon]').forEach((el) => { el.innerHTML = icon(el.dataset.icon); });
    tickClock();
    setInterval(tickClock, 1000);

    const [env, settings, quick, drives, idx] = await Promise.all([
      api.envInfo().catch(() => ({})),
      api.getSettings().catch(() => state.settings),
      api.quickFolders().catch(() => []),
      api.drives().catch(() => []),
      api.indexStatus().catch(() => null),
    ]);
    state.env = env;
    state.settings = settings;
    state.quick = quick;
    state.drives = drives;
    state.index = idx;
    render();

    await loadApps();
    render();
  }

  init();
})();
