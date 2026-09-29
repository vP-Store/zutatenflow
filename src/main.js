'use strict';

const {
  app, BrowserWindow, ipcMain, shell, globalShortcut, Tray, Menu, nativeImage, dialog,
} = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = fs.promises;
const os = require('os');
const { execFile } = require('child_process');

const IS_WIN = process.platform === 'win32';

// Tastenkombinationen – Notausgang zu Windows
const HOTKEY_TOGGLE = 'Control+Alt+D'; // Dashboard ein-/ausblenden
const HOTKEY_QUIT = 'Control+Alt+Q'; // Dashboard komplett beenden

let win = null;
let tray = null;
let quitting = false;

// ---------------------------------------------------------------------------
// Einstellungen
// ---------------------------------------------------------------------------

const SETTINGS_FILE = () => path.join(app.getPath('userData'), 'settings.json');

const DEFAULT_SETTINGS = {
  firstRunDone: false,
  autostart: true,
  favorites: [], // Pfade/IDs angepinnter Apps
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

let settings = { ...DEFAULT_SETTINGS };

function loadSettings() {
  try {
    const raw = fs.readFileSync(SETTINGS_FILE(), 'utf8');
    settings = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    settings = { ...DEFAULT_SETTINGS };
  }
}

function saveSettings() {
  try {
    fs.mkdirSync(path.dirname(SETTINGS_FILE()), { recursive: true });
    fs.writeFileSync(SETTINGS_FILE(), JSON.stringify(settings, null, 2), 'utf8');
  } catch (err) {
    console.error('Einstellungen konnten nicht gespeichert werden:', err);
  }
}

function applyAutostart() {
  if (!app.isPackaged) return; // im Entwicklungsmodus nicht in den Autostart schreiben
  app.setLoginItemSettings({ openAtLogin: !!settings.autostart, path: process.execPath });
}

// ---------------------------------------------------------------------------
// Dateitypen
// ---------------------------------------------------------------------------

const CATEGORIES = {
  dokumente: ['pdf', 'doc', 'docx', 'odt', 'rtf', 'txt', 'md', 'xls', 'xlsx', 'xlsm', 'csv', 'ods', 'ppt', 'pptx', 'odp', 'epub'],
  bilder: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'heic', 'tif', 'tiff', 'psd', 'ico', 'raw', 'cr2', 'nef'],
  videos: ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'webm', 'flv', 'm4v', 'mpg', 'mpeg'],
  musik: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma', 'opus'],
  archive: ['zip', 'rar', '7z', 'tar', 'gz', 'iso', 'bz2', 'xz'],
  programme: ['exe', 'msi', 'lnk', 'bat', 'cmd', 'url', 'appref-ms'],
  web: ['html', 'htm', 'css', 'js', 'json', 'xml'],
};

const EXT_TO_CAT = {};
for (const [cat, exts] of Object.entries(CATEGORIES)) for (const e of exts) EXT_TO_CAT[e] = cat;

function extOf(name) {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(i + 1).toLowerCase() : '';
}

function categoryOf(name) {
  return EXT_TO_CAT[extOf(name)] || 'sonstiges';
}

// Ordner, die beim Durchsuchen übersprungen werden (Systemkram, riesige Entwicklerordner)
const SKIP_DIRS = new Set([
  'windows', 'program files', 'program files (x86)', 'programdata', '$recycle.bin',
  'system volume information', 'appdata', 'node_modules', '.git', '.cache', '$windows.~bt',
  '$windows.~ws', 'recovery', 'perflogs', 'msocache', 'config.msi', '$sysreset',
]);

const HIDDEN_FILES = new Set(['desktop.ini', 'thumbs.db', 'ntuser.dat', 'ntuser.ini', 'pagefile.sys', 'hiberfil.sys', 'swapfile.sys', 'dumpstack.log.tmp']);

function isHiddenName(name) {
  const n = name.toLowerCase();
  return n.startsWith('$') || n.startsWith('~$') || HIDDEN_FILES.has(n) || n.startsWith('ntuser.dat');
}

// ---------------------------------------------------------------------------
// Laufwerke & Ordner
// ---------------------------------------------------------------------------

async function listDrives() {
  const drives = [];
  if (IS_WIN) {
    const letters = 'CDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    await Promise.all(letters.map(async (l) => {
      const root = `${l}:\\`;
      try {
        await fsp.access(root);
        let total = 0; let free = 0;
        try {
          const s = await fsp.statfs(root);
          total = s.blocks * s.bsize;
          free = s.bavail * s.bsize;
        } catch { /* z. B. leeres DVD-Laufwerk */ }
        drives.push({ letter: l, path: root, total, free });
      } catch { /* Laufwerk existiert nicht */ }
    }));
    drives.sort((a, b) => a.letter.localeCompare(b.letter));
  } else {
    let total = 0; let free = 0;
    try { const s = await fsp.statfs('/'); total = s.blocks * s.bsize; free = s.bavail * s.bsize; } catch { /* ignore */ }
    drives.push({ letter: '/', path: '/', total, free });
  }
  return drives;
}

function quickFolders() {
  const safe = (name) => { try { return app.getPath(name); } catch { return null; } };
  const home = os.homedir();
  const list = [
    { id: 'desktop', name: 'Desktop', path: safe('desktop') },
    { id: 'documents', name: 'Dokumente', path: safe('documents') },
    { id: 'downloads', name: 'Downloads', path: safe('downloads') },
    { id: 'pictures', name: 'Bilder', path: safe('pictures') },
    { id: 'music', name: 'Musik', path: safe('music') },
    { id: 'videos', name: 'Videos', path: safe('videos') },
    { id: 'home', name: 'Benutzerordner', path: home },
  ];
  const oneDrive = process.env.OneDrive || process.env.OneDriveConsumer;
  if (oneDrive) list.push({ id: 'onedrive', name: 'OneDrive', path: oneDrive });
  return list.filter((f) => f.path && fs.existsSync(f.path));
}

async function listDir(dirPath) {
  const entries = await fsp.readdir(dirPath, { withFileTypes: true });
  const out = [];
  await Promise.all(entries.map(async (e) => {
    if (isHiddenName(e.name)) return;
    const full = path.join(dirPath, e.name);
    let stat = null;
    try { stat = await fsp.stat(full); } catch { return; }
    const isDir = stat.isDirectory();
    out.push({
      name: e.name,
      path: full,
      isDir,
      size: isDir ? 0 : stat.size,
      mtime: stat.mtimeMs,
      ext: isDir ? '' : extOf(e.name),
      cat: isDir ? 'ordner' : categoryOf(e.name),
    });
  }));
  return { path: dirPath, parent: path.dirname(dirPath) !== dirPath ? path.dirname(dirPath) : null, entries: out };
}

// ---------------------------------------------------------------------------
// Datei-Index (für Sortierung nach Typ & Suche)
// ---------------------------------------------------------------------------

const INDEX_LIMIT = 250000;
const index = { files: [], running: false, done: false, scanned: 0, startedAt: 0, finishedAt: 0 };

async function indexRoots() {
  const roots = [os.homedir()];
  if (IS_WIN) {
    const sysDrive = (process.env.SystemDrive || 'C:').toUpperCase();
    for (const d of await listDrives()) {
      if (`${d.letter}:` !== sysDrive) roots.push(d.path); // weitere Laufwerke komplett
    }
  }
  return roots;
}

async function walk(dir, depth) {
  if (index.files.length >= INDEX_LIMIT || depth > 12) return;
  let dh;
  try { dh = await fsp.opendir(dir); } catch { return; }
  const subdirs = [];
  try {
    for await (const e of dh) {
      if (isHiddenName(e.name) || e.name.startsWith('.')) continue;
      const full = path.join(dir, e.name);
      if (e.isDirectory()) {
        if (!SKIP_DIRS.has(e.name.toLowerCase())) subdirs.push(full);
      } else if (e.isFile()) {
        index.scanned++;
        let st;
        try { st = await fsp.stat(full); } catch { continue; }
        index.files.push({ name: e.name, path: full, size: st.size, mtime: st.mtimeMs, ext: extOf(e.name), cat: categoryOf(e.name) });
        if (index.files.length >= INDEX_LIMIT) break;
      }
    }
  } catch { /* Zugriff verweigert o. Ä. */ }
  for (const sd of subdirs) await walk(sd, depth + 1);
}

async function buildIndex() {
  if (index.running) return;
  index.running = true;
  index.done = false;
  index.files = [];
  index.scanned = 0;
  index.startedAt = Date.now();
  sendToRenderer('index:progress', indexStatus());
  const timer = setInterval(() => sendToRenderer('index:progress', indexStatus()), 1000);
  try {
    for (const root of await indexRoots()) await walk(root, 0);
  } finally {
    clearInterval(timer);
    index.running = false;
    index.done = true;
    index.finishedAt = Date.now();
    sendToRenderer('index:progress', indexStatus());
  }
}

function indexStatus() {
  const counts = {};
  for (const f of index.files) counts[f.cat] = (counts[f.cat] || 0) + 1;
  return { running: index.running, done: index.done, total: index.files.length, counts, finishedAt: index.finishedAt };
}

function filesByCategory(cat, sortBy = 'mtime', limit = 500) {
  const list = index.files.filter((f) => f.cat === cat);
  sortEntries(list, sortBy);
  return { total: list.length, items: list.slice(0, limit) };
}

function sortEntries(list, sortBy) {
  const cmp = {
    name: (a, b) => a.name.localeCompare(b.name, 'de', { numeric: true }),
    mtime: (a, b) => b.mtime - a.mtime,
    size: (a, b) => b.size - a.size,
    type: (a, b) => (a.ext || '').localeCompare(b.ext || '') || a.name.localeCompare(b.name, 'de'),
  }[sortBy] || ((a, b) => b.mtime - a.mtime);
  list.sort(cmp);
}

function searchFiles(q, limit = 40) {
  const needle = q.toLowerCase();
  const hits = [];
  for (const f of index.files) {
    if (f.name.toLowerCase().includes(needle)) {
      hits.push(f);
      if (hits.length >= 2000) break;
    }
  }
  hits.sort((a, b) => {
    const as = a.name.toLowerCase().startsWith(needle) ? 0 : 1;
    const bs = b.name.toLowerCase().startsWith(needle) ? 0 : 1;
    return as - bs || b.mtime - a.mtime;
  });
  return hits.slice(0, limit);
}

// ---------------------------------------------------------------------------
// Zuletzt verwendete Dateien
// ---------------------------------------------------------------------------

async function recentFiles(limit = 16) {
  const out = [];
  if (IS_WIN && process.env.APPDATA) {
    const recentDir = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Recent');
    try {
      const items = await fsp.readdir(recentDir);
      const withTime = [];
      for (const n of items) {
        if (!n.toLowerCase().endsWith('.lnk')) continue;
        try {
          const st = await fsp.stat(path.join(recentDir, n));
          withTime.push({ n, t: st.mtimeMs });
        } catch { /* ignore */ }
      }
      withTime.sort((a, b) => b.t - a.t);
      for (const { n, t } of withTime) {
        if (out.length >= limit) break;
        try {
          const link = shell.readShortcutLink(path.join(recentDir, n));
          const target = link.target;
          if (!target || !fs.existsSync(target)) continue;
          const st = await fsp.stat(target);
          if (st.isDirectory()) continue;
          const name = path.basename(target);
          out.push({ name, path: target, size: st.size, mtime: t, ext: extOf(name), cat: categoryOf(name) });
        } catch { /* ignore */ }
      }
    } catch { /* ignore */ }
  }
  if (out.length === 0 && index.files.length) {
    return [...index.files].sort((a, b) => b.mtime - a.mtime).slice(0, limit);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Apps
// ---------------------------------------------------------------------------

const SYSTEM_APPS = [
  { id: 'sys:explorer', name: 'Datei-Explorer', group: 'System', launch: { type: 'exec', cmd: 'explorer.exe' } },
  { id: 'sys:settings', name: 'Einstellungen', group: 'System', launch: { type: 'uri', uri: 'ms-settings:' } },
  { id: 'sys:taskmgr', name: 'Task-Manager', group: 'System', launch: { type: 'exec', cmd: 'taskmgr.exe' } },
  { id: 'sys:control', name: 'Systemsteuerung', group: 'System', launch: { type: 'exec', cmd: 'control.exe' } },
  { id: 'sys:terminal', name: 'Eingabeaufforderung', group: 'System', launch: { type: 'exec', cmd: 'cmd.exe' } },
];

let appsCache = null;

function isJunkApp(name) {
  return /(uninstall|deinstall|entfernen|readme|liesmich|hilfe|help|documentation|dokumentation|release notes|website|web site)/i.test(name);
}

async function scanStartMenu(dir, baseDir, out) {
  let entries;
  try { entries = await fsp.readdir(dir, { withFileTypes: true }); } catch { return; }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      await scanStartMenu(full, baseDir, out);
    } else if (/\.(lnk|url|appref-ms)$/i.test(e.name)) {
      const name = e.name.replace(/\.(lnk|url|appref-ms)$/i, '');
      if (isJunkApp(name)) continue;
      const rel = path.relative(baseDir, dir);
      const group = rel ? rel.split(path.sep)[0] : 'Programme';
      out.push({ id: full, name, group, path: full, launch: { type: 'path', path: full } });
    }
  }
}

function getStartApps() {
  // Liefert alle Startmenü-Apps inkl. Store-Apps (Rechner, Fotos, …)
  return new Promise((resolve) => {
    if (!IS_WIN) return resolve([]);
    const cmd = '[Console]::OutputEncoding=[Text.Encoding]::UTF8; Get-StartApps | Select-Object Name,AppID | ConvertTo-Json -Compress';
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', cmd], { windowsHide: true, timeout: 20000, maxBuffer: 20 * 1024 * 1024 }, (err, stdout) => {
      if (err || !stdout) return resolve([]);
      try {
        const data = JSON.parse(stdout);
        resolve(Array.isArray(data) ? data : [data]);
      } catch { resolve([]); }
    });
  });
}

async function listApps(force = false) {
  if (appsCache && !force) return appsCache;
  const apps = [];
  if (IS_WIN) {
    const dirs = [
      process.env.ProgramData && path.join(process.env.ProgramData, 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
      process.env.APPDATA && path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
    ].filter(Boolean);
    for (const d of dirs) await scanStartMenu(d, d, apps);

    // Store-Apps ergänzen, die nicht als Verknüpfung existieren
    const known = new Set(apps.map((a) => a.name.toLowerCase()));
    for (const s of await getStartApps()) {
      if (!s || !s.Name || !s.AppID) continue;
      if (known.has(s.Name.toLowerCase()) || isJunkApp(s.Name)) continue;
      // Klassische Programme mit Pfad als AppID sind schon über Verknüpfungen drin
      if (/^[a-z]:\\/i.test(s.AppID) || s.AppID.startsWith('{')) {
        if (!s.AppID.includes('!')) continue;
      }
      known.add(s.Name.toLowerCase());
      apps.push({ id: `uwp:${s.AppID}`, name: s.Name, group: 'Apps', launch: { type: 'appid', appid: s.AppID } });
    }
    apps.push(...SYSTEM_APPS);
  }

  // Doppelte Namen entfernen
  const seen = new Set();
  const unique = [];
  for (const a of apps) {
    const k = a.name.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(a);
  }
  unique.sort((a, b) => a.name.localeCompare(b.name, 'de'));
  appsCache = unique;
  return appsCache;
}

async function launchApp(appDef) {
  const l = appDef && appDef.launch;
  if (!l) throw new Error('Unbekannte App');
  switch (l.type) {
    case 'path': {
      const err = await shell.openPath(l.path);
      if (err) throw new Error(err);
      return true;
    }
    case 'uri':
      await shell.openExternal(l.uri);
      return true;
    case 'exec':
      execFile(l.cmd, [], { windowsHide: false, detached: true }).unref();
      return true;
    case 'appid':
      execFile('explorer.exe', [`shell:AppsFolder\\${l.appid}`], { detached: true }).unref();
      return true;
    default:
      throw new Error('Unbekannter Starttyp');
  }
}

// ---------------------------------------------------------------------------
// Icons
// ---------------------------------------------------------------------------

const iconCache = new Map();

async function getIcon(p) {
  if (!p) return null;
  if (iconCache.has(p)) return iconCache.get(p);
  let target = p;
  if (IS_WIN && p.toLowerCase().endsWith('.lnk')) {
    try {
      const link = shell.readShortcutLink(p);
      if (link.icon && fs.existsSync(link.icon) && /\.(exe|ico|dll)$/i.test(link.icon)) target = link.icon;
      else if (link.target && fs.existsSync(link.target)) target = link.target;
    } catch { /* ignore */ }
  }
  let url = null;
  try {
    const img = await app.getFileIcon(target, { size: 'large' });
    url = img.isEmpty() ? null : img.toDataURL();
  } catch { url = null; }
  iconCache.set(p, url);
  return url;
}

// ---------------------------------------------------------------------------
// System-Aktionen
// ---------------------------------------------------------------------------

function systemAction(action) {
  if (!IS_WIN) return false;
  const run = (cmd, args) => execFile(cmd, args, { windowsHide: true, detached: true }).unref();
  switch (action) {
    case 'lock': run('rundll32.exe', ['user32.dll,LockWorkStation']); break;
    case 'logoff': run('shutdown.exe', ['/l']); break;
    case 'restart': run('shutdown.exe', ['/r', '/t', '0']); break;
    case 'shutdown': run('shutdown.exe', ['/s', '/t', '0']); break;
    case 'sleep': run('rundll32.exe', ['powrprof.dll,SetSuspendState', '0,1,0']); break;
    case 'explorer': run('explorer.exe', []); break;
    case 'taskmgr': run('taskmgr.exe', []); break;
    default: return false;
  }
  return true;
}

// ---------------------------------------------------------------------------
// Fenster, Tray, Tastenkombinationen
// ---------------------------------------------------------------------------

function sendToRenderer(channel, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

function showDashboard() {
  if (!win) return;
  win.show();
  win.setFullScreen(true);
  win.focus();
  sendToRenderer('dashboard:shown');
}

function hideToWindows() {
  if (!win) return;
  win.hide();
}

function toggleDashboard() {
  if (!win) return;
  if (win.isVisible() && win.isFocused()) hideToWindows();
  else showDashboard();
}

function quitDashboard() {
  quitting = true;
  app.quit();
}

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    fullscreen: true,
    frame: false,
    show: false,
    backgroundColor: '#0b0d12',
    autoHideMenuBar: true,
    icon: path.join(__dirname, '..', 'build', 'icon.png'),
    title: 'Cockpit',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.once('ready-to-show', () => win.show());

  // Links aus der Oberfläche immer im normalen Browser öffnen
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (e, url) => {
    if (!url.startsWith('file:')) { e.preventDefault(); shell.openExternal(url); }
  });

  // Schließen blendet nur aus – beendet wird über Menü, Tray oder Strg+Alt+Q
  win.on('close', (e) => {
    if (!quitting) { e.preventDefault(); hideToWindows(); }
  });
}

function createTray() {
  const iconPath = path.join(__dirname, '..', 'build', 'icon.png');
  let img = nativeImage.createFromPath(iconPath);
  if (!img.isEmpty()) img = img.resize({ width: 16, height: 16 });
  tray = new Tray(img);
  tray.setToolTip(`Cockpit – ${HOTKEY_TOGGLE.replace(/Control/, 'Strg')} zum Ein-/Ausblenden`);
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Cockpit anzeigen', click: showDashboard },
    { label: 'Zu Windows wechseln', click: hideToWindows },
    { type: 'separator' },
    { label: 'Cockpit beenden', click: quitDashboard },
  ]));
  tray.on('click', toggleDashboard);
}

function registerHotkeys() {
  globalShortcut.register(HOTKEY_TOGGLE, toggleDashboard);
  globalShortcut.register(HOTKEY_QUIT, quitDashboard);
}

// ---------------------------------------------------------------------------
// IPC
// ---------------------------------------------------------------------------

function registerIpc() {
  ipcMain.handle('env:info', () => ({
    platform: process.platform,
    user: os.userInfo().username,
    hotkeyToggle: 'Strg + Alt + D',
    hotkeyQuit: 'Strg + Alt + Q',
    version: app.getVersion(),
    packaged: app.isPackaged,
  }));

  ipcMain.handle('settings:get', () => settings);
  ipcMain.handle('settings:set', (_e, patch) => {
    settings = { ...settings, ...patch };
    saveSettings();
    if ('autostart' in patch) applyAutostart();
    return settings;
  });

  ipcMain.handle('apps:list', (_e, force) => listApps(!!force));
  ipcMain.handle('apps:launch', async (_e, appDef) => launchApp(appDef));

  ipcMain.handle('icon:get', (_e, p) => getIcon(p));

  ipcMain.handle('fs:drives', () => listDrives());
  ipcMain.handle('fs:quick', () => quickFolders());
  ipcMain.handle('fs:list', (_e, dir, sortBy) => listDir(dir).then((r) => { sortEntries(r.entries, sortBy); r.entries.sort((a, b) => (b.isDir ? 1 : 0) - (a.isDir ? 1 : 0)); return r; }));
  ipcMain.handle('fs:open', async (_e, p) => { const err = await shell.openPath(p); if (err) throw new Error(err); return true; });
  ipcMain.handle('fs:reveal', (_e, p) => { shell.showItemInFolder(p); return true; });
  ipcMain.handle('fs:recent', () => recentFiles());
  ipcMain.handle('fs:category', (_e, cat, sortBy) => filesByCategory(cat, sortBy));
  ipcMain.handle('fs:search', (_e, q) => searchFiles(q));
  ipcMain.handle('index:status', () => indexStatus());
  ipcMain.handle('index:rebuild', () => { buildIndex(); return true; });

  ipcMain.handle('web:open', (_e, url) => {
    if (!/^https?:\/\//i.test(url)) throw new Error('Ungültige Adresse');
    return shell.openExternal(url);
  });

  ipcMain.handle('window:hide', () => { hideToWindows(); return true; });
  ipcMain.handle('window:quit', () => { quitDashboard(); return true; });
  ipcMain.handle('system:action', async (_e, action) => {
    const needsConfirm = ['logoff', 'restart', 'shutdown'].includes(action);
    if (needsConfirm) {
      const labels = { logoff: 'abmelden', restart: 'neu starten', shutdown: 'herunterfahren' };
      const { response } = await dialog.showMessageBox(win, {
        type: 'question',
        buttons: ['Abbrechen', 'Ja'],
        defaultId: 1,
        cancelId: 0,
        title: 'Cockpit',
        message: `Möchtest du den PC wirklich ${labels[action]}?`,
      });
      if (response !== 1) return false;
    }
    return systemAction(action);
  });
}

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', showDashboard);

  app.whenReady().then(() => {
    loadSettings();
    if (!settings.firstRunDone) {
      settings.firstRunDone = true;
      saveSettings();
    }
    applyAutostart();
    registerIpc();
    createWindow();
    createTray();
    registerHotkeys();
    setTimeout(buildIndex, 3000); // Index im Hintergrund aufbauen
  });

  app.on('before-quit', () => { quitting = true; });
  app.on('will-quit', () => globalShortcut.unregisterAll());
  app.on('window-all-closed', () => { /* läuft im Tray weiter */ });
}
