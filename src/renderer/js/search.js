'use strict';

// Die große Suche oben: Apps, Dateien, Ordner, Windows-Einstellungen, Befehle, Rechner, Internet.

(() => {
  const { $, api, esc, icon, appIcon, fileIcon, state } = C;

  const SETTINGS_PAGES = [
    ['WLAN', 'ms-settings:network-wifi', 'wifi', 'wlan wifi internet netzwerk'],
    ['Netzwerk & Internet', 'ms-settings:network-status', 'network', 'netzwerk lan ethernet'],
    ['Bluetooth & Geräte', 'ms-settings:bluetooth', 'bluetooth', 'bluetooth kopfhörer maus geräte'],
    ['Sound', 'ms-settings:sound', 'volume', 'ton lautstärke lautsprecher mikrofon audio'],
    ['Anzeige', 'ms-settings:display', 'display', 'bildschirm monitor auflösung helligkeit skalierung'],
    ['Hintergrund', 'ms-settings:personalization-background', 'image', 'hintergrundbild desktop'],
    ['Farben & Designs', 'ms-settings:personalization-colors', 'palette', 'dunkel hell modus farben'],
    ['Windows Update', 'ms-settings:windowsupdate', 'update', 'update aktualisieren'],
    ['Installierte Apps', 'ms-settings:appsfeatures', 'apps', 'deinstallieren programme entfernen'],
    ['Standard-Apps', 'ms-settings:defaultapps', 'apps', 'standardbrowser standardprogramm'],
    ['Autostart-Apps', 'ms-settings:startupapps', 'rocket', 'autostart start'],
    ['Energie & Akku', 'ms-settings:powersleep', 'battery', 'energie akku batterie strom ruhezustand'],
    ['Drucker & Scanner', 'ms-settings:printers', 'printer', 'drucker scanner drucken'],
    ['Maus', 'ms-settings:mousetouchpad', 'mouse', 'maus touchpad zeiger'],
    ['Datum & Uhrzeit', 'ms-settings:dateandtime', 'clock', 'datum uhrzeit zeitzone'],
    ['Speicher', 'ms-settings:storagesense', 'storage', 'speicherplatz festplatte aufräumen'],
    ['Benachrichtigungen', 'ms-settings:notifications', 'bell', 'mitteilungen nicht stören'],
    ['Konten', 'ms-settings:yourinfo', 'user', 'konto benutzer passwort anmelden'],
    ['Datenschutz & Sicherheit', 'ms-settings:privacy', 'shield', 'datenschutz sicherheit kamera mikrofon'],
    ['Windows-Sicherheit', 'ms-settings:windowsdefender', 'shield', 'virenschutz defender antivirus'],
    ['VPN', 'ms-settings:network-vpn', 'shield', 'vpn'],
    ['Info über den PC', 'ms-settings:about', 'info', 'info pc name version system'],
  ].map(([name, uri, ic, keywords]) => ({ name, uri, icon: ic, keywords }));

  const COMMANDS = [
    { name: 'Zu Windows wechseln', icon: 'windows', keywords: 'windows desktop ausblenden verstecken', run: () => api.hideToWindows() },
    { name: 'PC sperren', icon: 'lock', keywords: 'sperren lock', run: () => api.systemAction('lock') },
    { name: 'Energie sparen', icon: 'moon', keywords: 'energie sparen schlafen standby', run: () => api.systemAction('sleep') },
    { name: 'Abmelden', icon: 'logout', keywords: 'abmelden logout', run: () => api.systemAction('logoff') },
    { name: 'Neu starten', icon: 'restart', keywords: 'neustart neu starten restart', run: () => api.systemAction('restart') },
    { name: 'Herunterfahren', icon: 'power', keywords: 'herunterfahren ausschalten shutdown', run: () => api.systemAction('shutdown') },
    { name: 'Papierkorb öffnen', icon: 'trash', keywords: 'papierkorb', run: () => api.systemAction('recycle') },
    { name: 'Papierkorb leeren', icon: 'trash', keywords: 'papierkorb leeren', run: () => api.systemAction('empty-recycle') },
    { name: 'Task-Manager', icon: 'chart', keywords: 'task manager prozesse', run: () => api.systemAction('taskmgr') },
    { name: 'Cockpit-Einstellungen', icon: 'gear', keywords: 'cockpit einstellungen optionen', run: () => C.setView('settings') },
    { name: 'Dateien durchsuchen (neu einlesen)', icon: 'refresh', keywords: 'index neu einlesen dateien aktualisieren', run: () => api.rebuildIndex() },
    { name: 'Cockpit beenden', icon: 'close', keywords: 'cockpit beenden schließen', run: () => api.quit() },
  ];

  function score(name, keywords, q) {
    const n = name.toLowerCase();
    if (n === q) return 1000;
    if (n.startsWith(q)) return 800;
    const words = q.split(/\s+/).filter(Boolean);
    let s = 0;
    for (const w of words) {
      const i = n.indexOf(w);
      if (i >= 0) { s += i === 0 || /[\s\-_.(]/.test(n[i - 1]) ? 400 : 200; continue; }
      if (keywords && keywords.split(' ').some((k) => k.startsWith(w))) { s += 250; continue; }
      if (words.length === 1 && w.length >= 2 && n.split(/[\s\-_.]+/).map((x) => x[0]).join('').startsWith(w)) { s += 450; continue; }
      return 0;
    }
    return s;
  }

  const input = $('#search');
  const box = $('#search-results');
  let items = [];
  let sel = 0;
  let seq = 0;
  let lastFiles = null;
  let lastFilesQuery = '';

  function close() { box.hidden = true; items = []; }

  function add(group, html, run) {
    items.push({ group, html, run });
  }

  function build(qRaw, files) {
    const q = qRaw.trim().toLowerCase();
    items = [];

    const result = window.CockpitCalc.calculate(qRaw);
    if (result !== null) {
      const text = result.toLocaleString('de-DE', { maximumFractionDigits: 10 });
      add('Rechner', `<span class="ficon web">${icon('calc')}</span><span class="sr-text"><div class="sr-name sr-big">= ${esc(text)}</div><div class="sr-sub">Enter kopiert das Ergebnis</div></span>`,
        () => api.copyText(String(result).replace('.', ',')).then(() => C.toast('Ergebnis kopiert')));
    }

    const apps = state.apps
      .map((a) => ({ a, s: score(a.name, a.group.toLowerCase(), q) }))
      .filter((x) => x.s > 0)
      .map((x) => ({ ...x, s: x.s + C.usage(x.a.id) * 3 }))
      .sort((x, y) => y.s - x.s)
      .slice(0, 6);
    for (const { a } of apps) {
      add('Apps', `${appIcon(a, 'small')}<span class="sr-text"><div class="sr-name">${esc(a.name)}</div><div class="sr-sub">${esc(a.group)}</div></span><kbd>App</kbd>`, () => C.launchApp(a.id));
    }

    const cmds = COMMANDS.map((c) => ({ c, s: score(c.name, c.keywords, q) })).filter((x) => x.s > 0).sort((x, y) => y.s - x.s).slice(0, 3);
    for (const { c } of cmds) {
      add('Befehle', `<span class="ficon sonstiges">${icon(c.icon)}</span><span class="sr-text"><div class="sr-name">${esc(c.name)}</div><div class="sr-sub">Befehl</div></span>`, c.run);
    }

    if (state.env.platform === 'win32' || !state.env.platform) {
      const pages = SETTINGS_PAGES.map((p) => ({ p, s: score(p.name, p.keywords, q) })).filter((x) => x.s > 0).sort((x, y) => y.s - x.s).slice(0, 3);
      for (const { p } of pages) {
        add('Windows-Einstellungen', `<span class="ficon web">${icon(p.icon)}</span><span class="sr-text"><div class="sr-name">${esc(p.name)}</div><div class="sr-sub">Windows-Einstellungen</div></span>`,
          () => C.safe(() => api.openSettingsPage(p.uri), 'Einstellungen konnten nicht geöffnet werden'));
      }
    }

    if (files && files.length) {
      for (const f of files.slice(0, 8)) {
        add('Ordner & Dateien', `${fileIcon(f, 'small')}<span class="sr-text"><div class="sr-name">${esc(f.name)}</div><div class="sr-sub">${esc(f.path)}</div></span>`,
          () => (f.isDir ? C.openDir(f.path) : C.openFile(f.path)));
      }
    }

    if (C.looksLikeUrl(qRaw.trim())) {
      add('Internet', `<span class="ficon web">${icon('globe')}</span><span class="sr-text"><div class="sr-name">${esc(C.normalizeUrl(qRaw.trim()))}</div><div class="sr-sub">Website öffnen</div></span>`, () => C.openWebQuery(qRaw.trim()));
    }
    add('Internet', `<span class="ficon web">${icon('search')}</span><span class="sr-text"><div class="sr-name">„${esc(qRaw.trim())}“ im Internet suchen</div><div class="sr-sub">Google</div></span>`,
      () => C.safe(() => api.openWeb(state.settings.searchEngine + encodeURIComponent(qRaw.trim())), 'Browser konnte nicht geöffnet werden'));

    render(files === null);
  }

  function render(filesLoading) {
    let html = '';
    let group = null;
    items.forEach((it, i) => {
      if (it.group !== group) {
        if (it.group === 'Internet' && filesLoading) {
          html += '<div class="sr-head">Ordner & Dateien</div><div class="sr-empty"><span class="spin"></span></div>';
        }
        group = it.group;
        html += `<div class="sr-head">${esc(group)}</div>`;
      }
      html += `<button class="sr-item" data-sr="${i}" tabindex="-1">${it.html}</button>`;
    });
    box.innerHTML = html;
    box.hidden = false;
    sel = Math.min(sel, items.length - 1);
    highlight();
    C.hydrate(box);
  }

  function highlight() {
    C.$$('.sr-item', box).forEach((el) => el.classList.toggle('sel', Number(el.dataset.sr) === sel));
    const el = box.querySelector('.sr-item.sel');
    if (el) el.scrollIntoView({ block: 'nearest' });
  }

  function activate(i) {
    const it = items[i];
    if (!it) return;
    input.value = '';
    close();
    input.blur();
    it.run();
  }

  const fetchFiles = C.debounce(async (q, mySeq) => {
    const files = await api.searchFiles(q).catch(() => []);
    if (mySeq !== seq) return;
    lastFiles = files;
    lastFilesQuery = q;
    build(input.value, files);
  }, 140);

  input.addEventListener('input', () => {
    const q = input.value.trim();
    sel = 0;
    if (!q) { close(); return; }
    const mySeq = ++seq;
    build(input.value, lastFilesQuery && q.toLowerCase().startsWith(lastFilesQuery.toLowerCase()) ? lastFiles : null);
    fetchFiles(q, mySeq);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); sel = Math.min(sel + 1, items.length - 1); highlight(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); sel = Math.max(sel - 1, 0); highlight(); }
    else if (e.key === 'Enter') { e.preventDefault(); activate(sel); }
    else if (e.key === 'Escape') { input.value = ''; close(); input.blur(); }
  });

  input.addEventListener('focus', () => { if (input.value.trim()) input.dispatchEvent(new Event('input')); });
  box.addEventListener('mousedown', (e) => e.preventDefault()); // Fokus im Suchfeld behalten
  box.addEventListener('click', (e) => {
    const b = e.target.closest('[data-sr]');
    if (b) activate(Number(b.dataset.sr));
  });
  document.addEventListener('mousedown', (e) => { if (!e.target.closest('.search-wrap')) close(); });

  C.search = { focus: () => { input.focus(); input.select(); }, close, SETTINGS_PAGES };
})();
