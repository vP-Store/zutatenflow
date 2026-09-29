'use strict';

const { app, shell } = require('electron');
const fs = require('fs');
const fsp = fs.promises;
const path = require('path');
const { execFile } = require('child_process');
const log = require('./log');

const IS_WIN = process.platform === 'win32';

const SYSTEM_APPS = [
  { id: 'sys:explorer', name: 'Datei-Explorer', group: 'System', launch: { type: 'exec', cmd: 'explorer.exe' }, iconPath: 'C:\\Windows\\explorer.exe' },
  { id: 'sys:settings', name: 'Einstellungen', group: 'System', launch: { type: 'uri', uri: 'ms-settings:' } },
  { id: 'sys:taskmgr', name: 'Task-Manager', group: 'System', launch: { type: 'exec', cmd: 'taskmgr.exe' }, iconPath: 'C:\\Windows\\System32\\Taskmgr.exe' },
  { id: 'sys:control', name: 'Systemsteuerung', group: 'System', launch: { type: 'exec', cmd: 'control.exe' }, iconPath: 'C:\\Windows\\System32\\control.exe' },
  { id: 'sys:cmd', name: 'Eingabeaufforderung', group: 'System', launch: { type: 'exec', cmd: 'cmd.exe' }, iconPath: 'C:\\Windows\\System32\\cmd.exe' },
  { id: 'sys:recycle', name: 'Papierkorb', group: 'System', launch: { type: 'exec', cmd: 'explorer.exe', args: ['shell:RecycleBinFolder'] } },
];

let cache = null;

function isJunk(name) {
  return /(uninstall|deinstall|entfernen|readme|liesmich|hilfe$|^help|documentation|dokumentation|release notes|website|web site|homepage|license|lizenz|support)/i.test(name);
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
      if (isJunk(name)) continue;
      const rel = path.relative(baseDir, dir);
      const group = rel ? rel.split(path.sep)[0] : 'Programme';
      out.push({ id: full, name, group, path: full, launch: { type: 'path', path: full } });
    }
  }
}

function getStartApps() {
  // Alle Startmenü-Einträge inkl. Store-Apps (Rechner, Fotos, …)
  return new Promise((resolve) => {
    if (!IS_WIN) return resolve([]);
    const cmd = '[Console]::OutputEncoding=[Text.Encoding]::UTF8; Get-StartApps | Select-Object Name,AppID | ConvertTo-Json -Compress';
    execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-Command', cmd], { windowsHide: true, timeout: 25000, maxBuffer: 20 * 1024 * 1024 }, (err, stdout) => {
      if (err || !stdout) { if (err) log.warn('Get-StartApps fehlgeschlagen', err.message); return resolve([]); }
      try {
        const data = JSON.parse(stdout);
        resolve(Array.isArray(data) ? data : [data]);
      } catch { resolve([]); }
    });
  });
}

async function list(force = false) {
  if (cache && !force) return cache;
  const apps = [];
  if (IS_WIN) {
    const dirs = [
      process.env.ProgramData && path.join(process.env.ProgramData, 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
      process.env.APPDATA && path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs'),
    ].filter(Boolean);
    for (const d of dirs) await scanStartMenu(d, d, apps);

    const known = new Set(apps.map((a) => a.name.toLowerCase()));
    for (const s of await getStartApps()) {
      if (!s || !s.Name || !s.AppID) continue;
      if (known.has(s.Name.toLowerCase()) || isJunk(s.Name)) continue;
      // Nur echte Store-Apps ergänzen (AppID der Form Paket!App)
      if (!s.AppID.includes('!')) continue;
      known.add(s.Name.toLowerCase());
      apps.push({ id: `uwp:${s.AppID}`, name: s.Name, group: 'Store-Apps', launch: { type: 'appid', appid: s.AppID } });
    }
    for (const sa of SYSTEM_APPS) apps.push({ ...sa });
  }

  const seen = new Set();
  const unique = [];
  for (const a of apps) {
    const k = a.name.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    unique.push(a);
  }
  unique.sort((a, b) => a.name.localeCompare(b.name, 'de'));
  cache = unique;
  log.info(`Apps eingelesen: ${cache.length}`);
  return cache;
}

function findById(id) {
  return (cache || []).find((a) => a.id === id) || null;
}

function spawnDetached(cmd, args = []) {
  const child = execFile(cmd, args, { windowsHide: false, detached: true }, () => {});
  child.unref();
}

async function launch(id) {
  const a = findById(id);
  if (!a) throw new Error('App nicht gefunden');
  const l = a.launch;
  switch (l.type) {
    case 'path': {
      const err = await shell.openPath(l.path);
      if (err) throw new Error(err);
      break;
    }
    case 'uri': await shell.openExternal(l.uri); break;
    case 'exec': spawnDetached(l.cmd, l.args || []); break;
    case 'appid': spawnDetached('explorer.exe', [`shell:AppsFolder\\${l.appid}`]); break;
    default: throw new Error('Unbekannter Starttyp');
  }
  return a;
}

function psQuote(s) {
  return `'${String(s).replace(/'/g, "''")}'`;
}

async function launchAsAdmin(id) {
  const a = findById(id);
  if (!a || !IS_WIN) throw new Error('Nicht möglich');
  const target = a.launch.type === 'path' ? a.launch.path : a.launch.type === 'exec' ? a.launch.cmd : null;
  if (!target) throw new Error('Diese App kann nicht als Administrator gestartet werden.');
  spawnDetached('powershell.exe', ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', `Start-Process -FilePath ${psQuote(target)} -Verb RunAs`]);
  return true;
}

function revealApp(id) {
  const a = findById(id);
  if (a && a.path) shell.showItemInFolder(a.path);
  return !!(a && a.path);
}

// ------------------------------------------------------------------ Icons

const iconCache = new Map();

async function icon(p) {
  if (!p) return null;
  if (iconCache.has(p)) return iconCache.get(p);
  let target = p;
  if (IS_WIN && p.toLowerCase().endsWith('.lnk')) {
    try {
      const link = shell.readShortcutLink(p);
      if (link.icon && /\.(exe|ico)$/i.test(link.icon) && fs.existsSync(link.icon)) target = link.icon;
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

module.exports = { list, launch, launchAsAdmin, revealApp, icon, findById };
