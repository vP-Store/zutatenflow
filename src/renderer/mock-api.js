'use strict';

// Beispieldaten für die Vorschau im normalen Browser (ohne Electron).
// In der echten App stellt preload.js window.cockpit bereit und diese Datei tut nichts.
(() => {
  if (window.cockpit) return;

  const now = Date.now();
  const H = 3600 * 1000;
  const GB = 1024 ** 3;
  const params = new URLSearchParams(location.search);

  const appNames = [
    ['Google Chrome', 'Programme'], ['Mozilla Firefox', 'Programme'], ['Microsoft Edge', 'Programme'],
    ['Word', 'Microsoft Office'], ['Excel', 'Microsoft Office'], ['PowerPoint', 'Microsoft Office'], ['Outlook', 'Microsoft Office'],
    ['Adobe Photoshop 2026', 'Adobe'], ['Adobe Illustrator 2026', 'Adobe'], ['Adobe Acrobat', 'Adobe'],
    ['Canva', 'Programme'], ['Spotify', 'Programme'], ['Discord', 'Programme'], ['WhatsApp', 'Store-Apps'],
    ['Visual Studio Code', 'Programme'], ['Claude', 'Programme'], ['Steam', 'Steam'], ['OBS Studio', 'OBS Studio'],
    ['VLC media player', 'VideoLAN'], ['7-Zip File Manager', '7-Zip'], ['Notepad++', 'Programme'],
    ['Rechner', 'Store-Apps'], ['Fotos', 'Store-Apps'], ['Kamera', 'Store-Apps'], ['Microsoft Store', 'Store-Apps'], ['Uhr', 'Store-Apps'],
    ['Paint', 'Zubehör'], ['Editor', 'Zubehör'], ['Snipping Tool', 'Zubehör'], ['Remotedesktopverbindung', 'Zubehör'],
    ['Datei-Explorer', 'System'], ['Einstellungen', 'System'], ['Task-Manager', 'System'], ['Systemsteuerung', 'System'], ['Eingabeaufforderung', 'System'], ['Papierkorb', 'System'],
  ];
  const apps = appNames.map(([name, group]) => ({ id: `mock:${name}`, name, group, launch: { type: 'path' } }))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'));

  let settings = {
    onboardingDone: params.get('onboarding') !== '1',
    autostart: true,
    userName: '',
    theme: params.get('theme') || 'dark',
    accent: '#7c8cff',
    wallpaper: { mode: 'none', path: '', dim: 0.6 },
    weather: { city: 'Berlin', name: 'Berlin', lat: 52.52, lon: 13.4 },
    notes: 'Etsy: neue Produktbilder hochladen\nRechnung an Kunde schicken',
    favorites: ['mock:Google Chrome', 'mock:Word', 'mock:Excel', 'mock:Adobe Photoshop 2026', 'mock:Canva', 'mock:Spotify', 'mock:Claude', 'mock:Datei-Explorer'],
    launchCounts: { 'mock:Discord': 5, 'mock:Visual Studio Code': 9, 'mock:WhatsApp': 3, 'mock:Rechner': 2 },
    lastLaunched: { 'mock:Visual Studio Code': now - 2 * H },
    pinnedFolders: [{ name: 'Etsy Produkte', path: 'C:\\Users\\vpstore\\Desktop\\Etsy Produkte' }],
    websites: [
      { name: 'Google', url: 'https://www.google.com' },
      { name: 'YouTube', url: 'https://www.youtube.com' },
      { name: 'Gmail', url: 'https://mail.google.com' },
      { name: 'Etsy', url: 'https://www.etsy.com/your/shops/me/dashboard' },
      { name: 'Shopify', url: 'https://admin.shopify.com' },
      { name: 'Claude', url: 'https://claude.ai' },
    ],
    searchEngine: 'https://www.google.com/search?q=',
    indexExtraRoots: [],
    hideOnLaunch: false,
  };

  const cat = (n) => {
    const e = n.split('.').pop().toLowerCase();
    if (['pdf', 'docx', 'xlsx', 'pptx', 'txt', 'csv', 'md'].includes(e)) return 'dokumente';
    if (['jpg', 'png', 'psd', 'webp'].includes(e)) return 'bilder';
    if (['mp4', 'mov', 'mkv'].includes(e)) return 'videos';
    if (['mp3', 'wav'].includes(e)) return 'musik';
    if (['zip', 'rar', '7z'].includes(e)) return 'archive';
    if (['exe', 'msi'].includes(e)) return 'programme';
    if (['html', 'js', 'json'].includes(e)) return 'web';
    return 'sonstiges';
  };
  const file = (dir, name, ageH, size) => ({ name, path: `${dir}\\${name}`, isDir: false, size, mtime: now - ageH * H, ext: name.split('.').pop().toLowerCase(), cat: cat(name) });
  const folder = (dir, name, ageH) => ({ name, path: `${dir}\\${name}`, isDir: true, size: 0, mtime: now - ageH * H, ext: '', cat: 'ordner' });

  const U = 'C:\\Users\\vpstore';
  const tree = {
    'C:\\': [folder('C:', 'Benutzer', 900), folder('C:', 'Programme', 300), folder('C:', 'Programme (x86)', 500), folder('C:', 'Windows', 20)],
    [U]: ['Desktop', 'Dokumente', 'Downloads', 'Bilder', 'Musik', 'Videos', 'OneDrive'].map((n, i) => folder(U, n, i * 30 + 2)),
    [`${U}\\Desktop`]: [
      folder(`${U}\\Desktop`, 'Etsy Produkte', 5), folder(`${U}\\Desktop`, 'Website-Abo', 26),
      file(`${U}\\Desktop`, 'Ideen.txt', 1, 2400), file(`${U}\\Desktop`, 'Rechnung_September.pdf', 30, 184000),
    ],
    [`${U}\\Desktop\\Etsy Produkte`]: [file(`${U}\\Desktop\\Etsy Produkte`, 'Listing-Texte.md', 3, 8200), file(`${U}\\Desktop\\Etsy Produkte`, 'Mockup_1.png', 6, 2400000)],
    [`${U}\\Dokumente`]: [
      folder(`${U}\\Dokumente`, 'Buchhaltung', 70), folder(`${U}\\Dokumente`, 'Verträge', 400),
      file(`${U}\\Dokumente`, 'PRODUCTS_STATUS.xlsx', 3, 58000), file(`${U}\\Dokumente`, 'Businessplan 2026.docx', 200, 912000),
      file(`${U}\\Dokumente`, 'Präsentation Kunden.pptx', 90, 4200000), file(`${U}\\Dokumente`, 'Kundenliste.csv', 12, 22000),
    ],
    [`${U}\\Downloads`]: [
      file(`${U}\\Downloads`, 'Oracle_Deck_Mockup.zip', 4, 48000000), file(`${U}\\Downloads`, 'Canva-Setup.exe', 50, 162000000),
      file(`${U}\\Downloads`, 'Etsy_Statistik_Q3.pdf', 20, 740000), file(`${U}\\Downloads`, 'Produktvideo.mp4', 8, 88000000),
      file(`${U}\\Downloads`, 'hintergrund.png', 2, 3100000), file(`${U}\\Downloads`, 'notizen.txt', 26, 1200),
    ],
    [`${U}\\Bilder`]: [folder(`${U}\\Bilder`, 'Screenshots', 1), file(`${U}\\Bilder`, 'Produktbild_1.png', 6, 5400000), file(`${U}\\Bilder`, 'Logo.psd', 300, 24000000)],
    [`${U}\\Musik`]: [file(`${U}\\Musik`, 'Meditation Intro.mp3', 800, 7100000)],
    [`${U}\\Videos`]: [file(`${U}\\Videos`, 'Listing-Video.mp4', 30, 41000000)],
    'D:\\': [folder('D:', 'Backups', 100), folder('D:', 'Fotos 2025', 2000), file('D:', 'Archiv_2024.7z', 5000, 2 * GB)],
  };

  const allFiles = Object.values(tree).flat().filter((e) => !e.isDir);
  const allDirs = Object.values(tree).flat().filter((e) => e.isDir);
  for (let i = 1; i <= 36; i++) allFiles.push(file('D:\\Fotos 2025', `IMG_${String(4000 + i)}.jpg`, i * 40, 3000000 + i * 1000));

  const sortList = (list, by) => {
    const c = {
      name: (a, b) => a.name.localeCompare(b.name, 'de'),
      mtime: (a, b) => b.mtime - a.mtime,
      size: (a, b) => b.size - a.size,
      type: (a, b) => a.ext.localeCompare(b.ext),
    }[by] || ((a, b) => a.name.localeCompare(b.name, 'de'));
    return [...list].sort(c);
  };

  const counts = {};
  for (const f of allFiles) counts[f.cat] = (counts[f.cat] || 0) + 1;

  const windows = [
    { hwnd: 101, title: 'Etsy – Shop-Manager – Google Chrome', exe: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', minimized: false },
    { hwnd: 102, title: 'PRODUCTS_STATUS.xlsx – Excel', exe: 'C:\\Program Files\\Microsoft Office\\root\\Office16\\EXCEL.EXE', minimized: false },
    { hwnd: 103, title: 'Spotify Premium', exe: 'C:\\Users\\vpstore\\AppData\\Roaming\\Spotify\\Spotify.exe', minimized: true },
    { hwnd: 104, title: 'Downloads – Datei-Explorer', exe: 'C:\\Windows\\explorer.exe', minimized: false },
  ];

  const log = (...a) => console.info('[Vorschau]', ...a);
  const ok = async () => true;

  window.cockpit = {
    envInfo: async () => ({ platform: 'win32', user: settings.userName, systemUser: 'vpstore', version: '1.0.0 (Vorschau)', packaged: true, hotkeys: { toggle: true, quit: true }, windowsApi: true }),
    getSettings: async () => settings,
    setSettings: async (patch) => { settings = { ...settings, ...patch }; return settings; },
    resetSettings: async () => { settings = { ...settings, favorites: [], onboardingDone: false }; return settings; },
    listApps: async () => apps,
    launchApp: async (id) => { log('Starte', id); return id; },
    launchAsAdmin: ok,
    revealApp: ok,
    getIcon: async () => null,
    drives: async () => [
      { letter: 'C', path: 'C:\\', total: 476 * GB, free: 132 * GB, system: true },
      { letter: 'D', path: 'D:\\', total: 1863 * GB, free: 1020 * GB, system: false },
    ],
    quickFolders: async () => [
      { id: 'desktop', name: 'Desktop', path: `${U}\\Desktop` },
      { id: 'documents', name: 'Dokumente', path: `${U}\\Dokumente` },
      { id: 'downloads', name: 'Downloads', path: `${U}\\Downloads` },
      { id: 'pictures', name: 'Bilder', path: `${U}\\Bilder` },
      { id: 'music', name: 'Musik', path: `${U}\\Musik` },
      { id: 'videos', name: 'Videos', path: `${U}\\Videos` },
      { id: 'home', name: 'Benutzerordner', path: U },
    ],
    listDir: async (p, by) => {
      const entries = sortList(tree[p] || [], by).sort((a, b) => (b.isDir ? 1 : 0) - (a.isDir ? 1 : 0));
      const idx = p.replace(/\\$/, '').lastIndexOf('\\');
      const parent = /^[A-Z]:\\$/.test(p) ? null : (idx > 2 ? p.slice(0, idx) : `${p.slice(0, 2)}\\`);
      return { path: p, parent, entries };
    },
    openPath: async (p) => { log('Öffne', p); return true; },
    reveal: ok,
    recentFiles: async () => sortList(allFiles, 'mtime').slice(0, 12),
    filesByCategory: async (c, by) => {
      const items = sortList(allFiles.filter((f) => f.cat === c), by);
      return { total: items.length, items };
    },
    searchFiles: async (q) => [...allDirs, ...allFiles].filter((f) => f.name.toLowerCase().includes(q.toLowerCase())).slice(0, 40),
    thumbnail: async () => null,
    previewText: async (p) => (/\.(txt|md|csv)$/i.test(p) ? 'Ideen für neue Produkte:\n\n- Oracle Deck „Mondphasen“\n- 30-Tage-Journal Schlaf\n- Planner 2027\n' : null),
    details: async () => null,
    mkdir: async (d) => `${d}\\Neuer Ordner`,
    newTextFile: async (d) => `${d}\\Neues Textdokument.txt`,
    rename: async (p) => p,
    trash: ok,
    paste: async () => [],
    pickFolder: async () => null,
    pickImage: async () => null,
    indexStatus: async () => ({ running: false, done: true, total: allFiles.length, folders: allDirs.length, counts, finishedAt: now - 5 * 60 * 1000 }),
    rebuildIndex: ok,
    listWindows: async () => ({ supported: true, windows }),
    focusWindow: ok,
    minimizeWindow: ok,
    closeWindow: ok,
    openWeb: async (u) => { log('Browser', u); return true; },
    openSettingsPage: ok,
    stats: async () => ({ cpu: 0.18 + Math.random() * 0.1, cpuModel: 'Intel Core i7', cores: 8, memUsed: 9.4 * GB, memTotal: 16 * GB, uptime: 3 * 3600 + 1240, host: 'PC' }),
    geocode: async (q) => [{ name: q, region: 'Deutschland', lat: 52.5, lon: 13.4 }],
    weather: async () => ({
      temp: 17.4, feels: 16.1, code: 2, wind: 11, humidity: 62, isDay: true,
      days: [0, 1, 2, 3, 4].map((i) => ({ date: new Date(now + i * 24 * H).toISOString().slice(0, 10), code: [2, 61, 3, 0, 80][i], max: [18, 15, 16, 20, 17][i], min: [9, 8, 7, 10, 11][i], rain: [10, 70, 20, 0, 55][i] })),
    }),
    wallpaper: async () => null,
    diagnostics: async () => 'Vorschau',
    copyText: ok,
    openLogs: ok,
    hideToWindows: async () => log('Zu Windows'),
    quit: async () => log('Beenden'),
    systemAction: async (a) => { log('System', a); return true; },
    updateStatus: async () => ({ state: 'latest', current: '1.0.0' }),
    checkUpdate: async () => ({ state: 'latest', current: '1.0.0' }),
    installUpdate: ok,
    on: () => {},
  };
})();
