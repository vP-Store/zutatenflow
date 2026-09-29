'use strict';

// Beispieldaten für die Vorschau im normalen Browser (ohne Electron).
// In der echten App stellt preload.js window.cockpit bereit und diese Datei tut nichts.
(() => {
  if (window.cockpit) return;

  const now = Date.now();
  const H = 3600 * 1000;
  const D = 24 * H;
  const GB = 1024 ** 3;

  const appNames = [
    ['Google Chrome', 'Programme'], ['Mozilla Firefox', 'Programme'], ['Microsoft Edge', 'Programme'],
    ['Word', 'Microsoft Office'], ['Excel', 'Microsoft Office'], ['PowerPoint', 'Microsoft Office'], ['Outlook', 'Microsoft Office'],
    ['Adobe Photoshop 2026', 'Adobe'], ['Adobe Illustrator 2026', 'Adobe'], ['Adobe Acrobat', 'Adobe'],
    ['Canva', 'Programme'], ['Spotify', 'Programme'], ['Discord', 'Programme'], ['WhatsApp', 'Apps'],
    ['Visual Studio Code', 'Programme'], ['Claude', 'Programme'], ['Steam', 'Steam'], ['OBS Studio', 'OBS Studio'],
    ['VLC media player', 'VideoLAN'], ['7-Zip File Manager', '7-Zip'], ['Notepad++', 'Programme'],
    ['Rechner', 'Apps'], ['Fotos', 'Apps'], ['Kamera', 'Apps'], ['Microsoft Store', 'Apps'], ['Uhr', 'Apps'],
    ['Paint', 'Zubehör'], ['Editor', 'Zubehör'], ['Snipping Tool', 'Zubehör'], ['Remotedesktopverbindung', 'Zubehör'],
    ['Datei-Explorer', 'System'], ['Einstellungen', 'System'], ['Task-Manager', 'System'], ['Systemsteuerung', 'System'], ['Eingabeaufforderung', 'System'],
  ];
  const apps = appNames.map(([name, group]) => ({ id: `mock:${name}`, name, group, launch: { type: 'mock' } }))
    .sort((a, b) => a.name.localeCompare(b.name, 'de'));

  let settings = {
    autostart: true,
    favorites: ['mock:Google Chrome', 'mock:Word', 'mock:Excel', 'mock:Adobe Photoshop 2026', 'mock:Canva', 'mock:Spotify', 'mock:Claude', 'mock:Datei-Explorer'],
    websites: [
      { name: 'Google', url: 'https://www.google.com' },
      { name: 'YouTube', url: 'https://www.youtube.com' },
      { name: 'Gmail', url: 'https://mail.google.com' },
      { name: 'Etsy', url: 'https://www.etsy.com/your/shops/me/dashboard' },
      { name: 'Shopify', url: 'https://admin.shopify.com' },
      { name: 'Claude', url: 'https://claude.ai' },
    ],
    searchEngine: 'https://www.google.com/search?q=',
  };

  const cat = (n) => {
    const e = n.split('.').pop().toLowerCase();
    if (['pdf', 'docx', 'xlsx', 'pptx', 'txt', 'csv'].includes(e)) return 'dokumente';
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
    [`${U}\\Dokumente`]: [
      folder(`${U}\\Dokumente`, 'Buchhaltung', 70), folder(`${U}\\Dokumente`, 'Verträge', 400),
      file(`${U}\\Dokumente`, 'PRODUCTS_STATUS.xlsx', 3, 58000), file(`${U}\\Dokumente`, 'Businessplan 2026.docx', 200, 912000),
      file(`${U}\\Dokumente`, 'Präsentation Kunden.pptx', 90, 4200000), file(`${U}\\Dokumente`, 'Kundenliste.csv', 12, 22000),
    ],
    [`${U}\\Downloads`]: [
      file(`${U}\\Downloads`, 'Oracle_Deck_Mockup.zip', 4, 48000000), file(`${U}\\Downloads`, 'Canva-Setup.exe', 50, 162000000),
      file(`${U}\\Downloads`, 'Etsy_Statistik_Q3.pdf', 20, 740000), file(`${U}\\Downloads`, 'Produktvideo.mp4', 8, 88000000),
      file(`${U}\\Downloads`, 'hintergrund.png', 2, 3100000),
    ],
    [`${U}\\Bilder`]: [folder(`${U}\\Bilder`, 'Screenshots', 1), file(`${U}\\Bilder`, 'Produktbild_1.png', 6, 5400000), file(`${U}\\Bilder`, 'Logo.psd', 300, 24000000)],
    [`${U}\\Musik`]: [file(`${U}\\Musik`, 'Meditation Intro.mp3', 800, 7100000)],
    [`${U}\\Videos`]: [file(`${U}\\Videos`, 'Listing-Video.mp4', 30, 41000000)],
    'D:\\': [folder('D:', 'Backups', 100), folder('D:', 'Fotos 2025', 2000), file('D:', 'Archiv_2024.7z', 5000, 2 * GB)],
  };

  const allFiles = Object.values(tree).flat().filter((e) => !e.isDir);
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

  const log = (...a) => console.info('[Vorschau]', ...a);
  const listeners = {};

  window.cockpit = {
    envInfo: async () => ({ platform: 'win32', user: '', version: '0.1.0 (Vorschau)', packaged: true }),
    getSettings: async () => settings,
    setSettings: async (patch) => { settings = { ...settings, ...patch }; return settings; },
    listApps: async () => apps,
    launchApp: async (a) => { log('Starte', a.name); return true; },
    getIcon: async () => null,
    drives: async () => [
      { letter: 'C', path: 'C:\\', total: 476 * GB, free: 132 * GB },
      { letter: 'D', path: 'D:\\', total: 1863 * GB, free: 1020 * GB },
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
    reveal: async (p) => { log('Zeige', p); return true; },
    recentFiles: async () => sortList(allFiles, 'mtime').slice(0, 12),
    filesByCategory: async (c, by) => {
      const items = sortList(allFiles.filter((f) => f.cat === c), by);
      return { total: items.length, items };
    },
    searchFiles: async (q) => allFiles.filter((f) => f.name.toLowerCase().includes(q.toLowerCase())).slice(0, 40),
    indexStatus: async () => ({ running: false, done: true, total: allFiles.length, counts, finishedAt: now - 5 * 60 * 1000 }),
    rebuildIndex: async () => true,
    openWeb: async (u) => { log('Browser', u); return true; },
    hideToWindows: async () => log('Zu Windows'),
    quit: async () => log('Beenden'),
    systemAction: async (a) => { log('System', a); return true; },
    on: (ch, fn) => { (listeners[ch] = listeners[ch] || []).push(fn); },
  };
})();
