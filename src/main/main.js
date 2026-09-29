'use strict';

const {
  app, BrowserWindow, ipcMain, shell, globalShortcut, Tray, Menu, nativeImage, dialog, clipboard,
} = require('electron');
const path = require('path');
const fs = require('fs');
const os = require('os');

const log = require('./log');
const settings = require('./settings');
const apps = require('./apps');
const files = require('./files');
const indexer = require('./indexer');
const win32 = require('./win32');
const system = require('./system');
const updater = require('./updater');

// Für automatische Tests: eigener, leerer Datenordner
if (process.env.COCKPIT_USER_DATA) app.setPath('userData', process.env.COCKPIT_USER_DATA);

const HOTKEY_TOGGLE = 'Control+Alt+D';
const HOTKEY_QUIT = 'Control+Alt+Q';
const ICON_PATH = path.join(__dirname, '..', '..', 'build', 'icon.png');

let win = null;
let tray = null;
let quitting = false;
const hotkeys = { toggle: false, quit: false };

process.on('uncaughtException', (err) => log.error('Unbehandelter Fehler', err));
process.on('unhandledRejection', (err) => log.error('Unbehandeltes Promise', err));

// ------------------------------------------------------------------ Fenster

function send(channel, payload) {
  if (win && !win.isDestroyed()) win.webContents.send(channel, payload);
}

function showDashboard() {
  if (!win) return;
  if (win.isMinimized()) win.restore();
  win.show();
  win.setFullScreen(true);
  win.focus();
  send('dashboard:shown');
}

function hideToWindows() {
  if (win) win.hide();
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

function ownHandles() {
  if (!win) return [];
  try {
    const buf = win.getNativeWindowHandle();
    return [buf.length >= 8 ? Number(buf.readBigUInt64LE(0)) : buf.readUInt32LE(0)];
  } catch { return []; }
}

function createWindow() {
  win = new BrowserWindow({
    width: 1440,
    height: 900,
    fullscreen: true,
    frame: false,
    show: false,
    backgroundColor: '#0b0d12',
    autoHideMenuBar: true,
    icon: ICON_PATH,
    title: 'Cockpit',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      plugins: true, // PDF-Vorschau
      spellcheck: false,
    },
  });

  win.loadFile(path.join(__dirname, '..', 'renderer', 'index.html'));
  win.once('ready-to-show', () => { if (!process.argv.includes('--hidden')) win.show(); });

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/i.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  // Die Oberfläche darf nie woandershin navigieren (z. B. wenn eine Datei auf das Fenster gezogen wird)
  win.webContents.on('will-navigate', (e, url) => {
    e.preventDefault();
    if (/^https?:/i.test(url)) shell.openExternal(url);
  });

  // Absturzschutz: Oberfläche neu laden, statt einen schwarzen Bildschirm zu zeigen
  win.webContents.on('render-process-gone', (_e, details) => {
    log.error('Oberfläche abgestürzt', details);
    if (!quitting) setTimeout(() => { if (win && !win.isDestroyed()) win.reload(); }, 800);
  });
  let hangTimer = null;
  win.on('unresponsive', () => {
    log.warn('Oberfläche reagiert nicht');
    clearTimeout(hangTimer);
    hangTimer = setTimeout(() => { if (win && !win.isDestroyed()) win.webContents.forcefullyCrashRenderer(); }, 8000);
  });
  win.on('responsive', () => clearTimeout(hangTimer));

  win.on('close', (e) => {
    if (!quitting) { e.preventDefault(); hideToWindows(); }
  });
  win.on('focus', () => send('dashboard:focus'));
}

function createTray() {
  let img = nativeImage.createFromPath(ICON_PATH);
  if (!img.isEmpty()) img = img.resize({ width: 16, height: 16 });
  tray = new Tray(img);
  tray.setToolTip('Cockpit – Strg+Alt+D zum Ein-/Ausblenden');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: 'Cockpit anzeigen', click: showDashboard },
    { label: 'Zu Windows wechseln', click: hideToWindows },
    { type: 'separator' },
    { label: 'Cockpit beenden', click: quitDashboard },
  ]));
  tray.on('click', toggleDashboard);
}

function registerHotkeys() {
  hotkeys.toggle = globalShortcut.register(HOTKEY_TOGGLE, toggleDashboard);
  hotkeys.quit = globalShortcut.register(HOTKEY_QUIT, quitDashboard);
  if (!hotkeys.toggle || !hotkeys.quit) log.warn('Tastenkombination belegt', hotkeys);
}

function applyAutostart() {
  if (!app.isPackaged) return;
  try {
    app.setLoginItemSettings({ openAtLogin: !!settings.get().autostart, path: process.execPath, args: [] });
  } catch (err) { log.error('Autostart', err); }
}

// ------------------------------------------------------------------ Index

let indexTimer = null;

async function startIndex() {
  const roots = await files.indexRoots(settings.get().indexExtraRoots);
  indexer.build(roots);
}

function scheduleIndex() {
  clearInterval(indexTimer);
  indexTimer = setInterval(startIndex, 2 * 60 * 60 * 1000); // alle 2 Stunden auffrischen
}

// ------------------------------------------------------------------ Hintergrundbild

async function wallpaperData() {
  const w = settings.get().wallpaper || {};
  let p = null;
  if (w.mode === 'custom' && w.path) p = w.path;
  else if (w.mode === 'windows') p = await system.windowsWallpaper();
  if (!p || !fs.existsSync(p)) return null;
  try {
    let img = nativeImage.createFromPath(p);
    if (img.isEmpty()) return null;
    const { width } = img.getSize();
    if (width > 2560) img = img.resize({ width: 2560, quality: 'good' });
    return `data:image/jpeg;base64,${img.toJPEG(86).toString('base64')}`;
  } catch (err) {
    log.warn('Hintergrundbild', err);
    return null;
  }
}

// ------------------------------------------------------------------ Diagnose

function diagnostics() {
  return [
    `Cockpit ${app.getVersion()}${app.isPackaged ? '' : ' (Entwicklung)'}`,
    `Electron ${process.versions.electron} · Chrome ${process.versions.chrome} · Node ${process.versions.node}`,
    `System: ${os.type()} ${os.release()} (${os.arch()}) · ${Math.round(os.totalmem() / 1024 ** 3)} GB RAM`,
    `Windows-API: ${win32.isSupported() ? 'ok' : 'nicht verfügbar'}`,
    `Tastenkombinationen: Strg+Alt+D ${hotkeys.toggle ? 'ok' : 'BELEGT'}, Strg+Alt+Q ${hotkeys.quit ? 'ok' : 'BELEGT'}`,
    `Index: ${JSON.stringify({ ...indexer.status(), counts: undefined })}`,
    `Autostart: ${app.isPackaged ? app.getLoginItemSettings().openAtLogin : 'n/a'}`,
    'Letzte Probleme:',
    ...(log.recentProblems().length ? log.recentProblems() : ['(keine)']),
  ].join('\n');
}

// ------------------------------------------------------------------ IPC

function handle(channel, fn) {
  ipcMain.handle(channel, async (_e, ...args) => {
    try {
      return await fn(...args);
    } catch (err) {
      log.warn(`IPC ${channel} fehlgeschlagen`, err && err.message);
      throw err;
    }
  });
}

function registerIpc() {
  handle('env:info', () => ({
    platform: process.platform,
    user: settings.get().userName || os.userInfo().username,
    systemUser: os.userInfo().username,
    version: app.getVersion(),
    packaged: app.isPackaged,
    hotkeys,
    windowsApi: win32.isSupported(),
  }));

  handle('settings:get', () => settings.get());
  handle('settings:set', (patch) => {
    const before = settings.get().autostart;
    const s = settings.patch(patch);
    if ('autostart' in patch && patch.autostart !== before) applyAutostart();
    if ('indexExtraRoots' in patch) startIndex();
    if ('wallpaper' in patch) wallpaperData().then((d) => send('wallpaper:changed', d));
    return s;
  });
  handle('settings:reset', () => { const s = settings.reset(); applyAutostart(); return s; });

  handle('apps:list', (force) => apps.list(!!force));
  handle('apps:launch', async (id) => {
    const a = await apps.launch(id);
    const s = settings.get();
    const counts = { ...s.launchCounts, [id]: (s.launchCounts[id] || 0) + 1 };
    settings.patch({ launchCounts: counts, lastLaunched: { ...s.lastLaunched, [id]: Date.now() } });
    if (s.hideOnLaunch) setTimeout(hideToWindows, 400);
    return a.name;
  });
  handle('apps:admin', (id) => apps.launchAsAdmin(id));
  handle('apps:reveal', (id) => apps.revealApp(id));
  handle('icon:get', (p) => apps.icon(p));

  handle('fs:drives', () => files.drives());
  handle('fs:quick', () => files.quickFolders());
  handle('fs:list', (dir, sortBy) => files.listDir(dir, sortBy));
  handle('fs:open', async (p) => { const err = await shell.openPath(p); if (err) throw new Error(err); return true; });
  handle('fs:reveal', (p) => { shell.showItemInFolder(p); return true; });
  handle('fs:recent', () => files.recentFiles());
  handle('fs:category', (cat, sortBy) => indexer.byCategory(cat, sortBy));
  handle('fs:search', (q) => indexer.search(q));
  handle('fs:thumb', (p, size) => files.thumbnail(p, size));
  handle('fs:text', (p) => files.previewText(p));
  handle('fs:details', (p) => files.details(p));
  handle('fs:mkdir', (dir) => files.mkdir(dir));
  handle('fs:newfile', (dir) => files.newTextFile(dir));
  handle('fs:rename', (p, name) => files.rename(p, name));
  handle('fs:trash', (paths) => files.trash(paths));
  handle('fs:paste', (paths, dest, mode) => files.paste(paths, dest, mode));
  handle('fs:pickFolder', async () => {
    const r = await dialog.showOpenDialog(win, { properties: ['openDirectory'] });
    return r.canceled ? null : r.filePaths[0];
  });
  handle('fs:pickImage', async () => {
    const r = await dialog.showOpenDialog(win, { properties: ['openFile'], filters: [{ name: 'Bilder', extensions: ['jpg', 'jpeg', 'png', 'webp', 'bmp', 'gif'] }] });
    return r.canceled ? null : r.filePaths[0];
  });

  handle('index:status', () => indexer.status());
  handle('index:rebuild', () => { startIndex(); return true; });

  handle('win:list', () => win32.listWindows(ownHandles()));
  handle('win:focus', (hwnd) => win32.focusWindow(hwnd));
  handle('win:minimize', (hwnd) => win32.minimizeWindow(hwnd));
  handle('win:close', (hwnd) => win32.closeWindow(hwnd));

  handle('web:open', (url) => {
    if (!/^https?:\/\//i.test(url)) throw new Error('Ungültige Adresse');
    return shell.openExternal(url);
  });
  handle('settings:open', (uri) => {
    if (!/^ms-settings:[\w-]*$/i.test(uri)) throw new Error('Ungültige Einstellung');
    return shell.openExternal(uri);
  });

  handle('sys:stats', () => system.stats());
  handle('sys:geocode', (q) => system.geocode(q));
  handle('sys:weather', (lat, lon) => system.weather(lat, lon));
  handle('sys:wallpaper', () => wallpaperData());
  handle('sys:diagnostics', () => diagnostics());
  handle('sys:copy', (text) => { clipboard.writeText(String(text)); return true; });
  handle('sys:openLogs', () => shell.openPath(log.dir()));

  handle('window:hide', () => { hideToWindows(); return true; });
  handle('window:quit', () => { quitDashboard(); return true; });
  handle('system:action', async (action) => {
    const confirm = { logoff: 'abmelden', restart: 'neu starten', shutdown: 'herunterfahren', 'empty-recycle': 'den Papierkorb leeren' };
    if (confirm[action]) {
      const verb = action === 'empty-recycle' ? confirm[action] : `den PC ${confirm[action]}`;
      const { response } = await dialog.showMessageBox(win, {
        type: 'question', buttons: ['Abbrechen', 'Ja'], defaultId: 1, cancelId: 0, title: 'Cockpit',
        message: `Möchtest du wirklich ${verb}?`,
      });
      if (response !== 1) return false;
    }
    return system.powerAction(action);
  });

  handle('update:status', () => updater.status());
  handle('update:check', () => updater.check(true));
  handle('update:install', () => { quitting = true; updater.install(); return true; });
}

// ------------------------------------------------------------------ Start

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on('second-instance', showDashboard);

  app.whenReady().then(() => {
    log.info(`Start Cockpit ${app.getVersion()} auf ${os.type()} ${os.release()}`);
    settings.load();
    applyAutostart();
    registerIpc();
    createWindow();
    createTray();
    registerHotkeys();

    indexer.events.on('progress', (s) => send('index:progress', s));
    const hadCache = indexer.loadCache();
    setTimeout(startIndex, hadCache ? 30000 : 3000);
    scheduleIndex();

    updater.init((s) => send('update:status', s));
  }).catch((err) => log.error('Start fehlgeschlagen', err));

  app.on('before-quit', () => { quitting = true; settings.saveNow(); });
  app.on('will-quit', () => globalShortcut.unregisterAll());
  app.on('window-all-closed', () => { /* läuft im Tray weiter */ });
}
