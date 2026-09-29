'use strict';

const { app, shell, nativeImage } = require('electron');
const fs = require('fs');
const fsp = fs.promises;
const os = require('os');
const path = require('path');
const log = require('./log');
const indexer = require('./indexer');
const { extOf, categoryOf, isHiddenName, isSystemJunction, isTextFile, validateName, uniqueName } = require('../shared/files-common');

const IS_WIN = process.platform === 'win32';

// ------------------------------------------------------------------ Laufwerke & Ordner

async function drives() {
  const out = [];
  if (IS_WIN) {
    const letters = 'CDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    await Promise.all(letters.map(async (l) => {
      const root = `${l}:\\`;
      try {
        await fsp.access(root);
      } catch { return; }
      let total = 0; let free = 0;
      try {
        const s = await fsp.statfs(root);
        total = s.blocks * s.bsize;
        free = s.bavail * s.bsize;
      } catch { /* z. B. leeres DVD-Laufwerk */ }
      out.push({ letter: l, path: root, total, free, system: `${l}:` === (process.env.SystemDrive || 'C:').toUpperCase() });
    }));
    out.sort((a, b) => a.letter.localeCompare(b.letter));
  } else {
    let total = 0; let free = 0;
    try { const s = await fsp.statfs('/'); total = s.blocks * s.bsize; free = s.bavail * s.bsize; } catch { /* ignore */ }
    out.push({ letter: '/', path: '/', total, free, system: true });
  }
  return out;
}

function quickFolders() {
  const safe = (name) => { try { return app.getPath(name); } catch { return null; } };
  const list = [
    { id: 'desktop', name: 'Desktop', path: safe('desktop') },
    { id: 'documents', name: 'Dokumente', path: safe('documents') },
    { id: 'downloads', name: 'Downloads', path: safe('downloads') },
    { id: 'pictures', name: 'Bilder', path: safe('pictures') },
    { id: 'music', name: 'Musik', path: safe('music') },
    { id: 'videos', name: 'Videos', path: safe('videos') },
    { id: 'home', name: 'Benutzerordner', path: os.homedir() },
  ];
  const oneDrive = process.env.OneDrive || process.env.OneDriveConsumer;
  if (oneDrive) list.push({ id: 'onedrive', name: 'OneDrive', path: oneDrive });
  return list.filter((f) => f.path && fs.existsSync(f.path));
}

async function indexRoots(extra = []) {
  const roots = [os.homedir()];
  if (IS_WIN) {
    for (const d of await drives()) if (!d.system) roots.push(d.path);
  }
  for (const r of extra) if (r && !roots.includes(r) && fs.existsSync(r)) roots.push(r);
  return roots;
}

async function listDir(dirPath, sortBy = 'name') {
  const entries = await fsp.readdir(dirPath, { withFileTypes: true });
  const out = [];
  const isHome = path.resolve(dirPath).toLowerCase() === path.resolve(os.homedir()).toLowerCase();
  const visible = entries.filter((e) => {
    if (isHiddenName(e.name)) return false;
    if (!IS_WIN) return true;
    // Versteckte Windows-Verknüpfungspunkte und AppData ausblenden (wie der Explorer)
    if (e.isSymbolicLink() && isSystemJunction(e.name)) return false;
    return !(isHome && e.name.toLowerCase() === 'appdata');
  });
  for (let i = 0; i < visible.length; i += 128) {
    const chunk = visible.slice(i, i + 128);
    const stats = await Promise.all(chunk.map((e) => fsp.stat(path.join(dirPath, e.name)).catch(() => null)));
    stats.forEach((st, j) => {
      if (!st) return;
      const name = chunk[j].name;
      const isDir = st.isDirectory();
      out.push({
        name,
        path: path.join(dirPath, name),
        isDir,
        size: isDir ? 0 : st.size,
        mtime: st.mtimeMs,
        ext: isDir ? '' : extOf(name),
        cat: isDir ? 'ordner' : categoryOf(name),
      });
    });
  }
  indexer.sortEntries(out, sortBy);
  out.sort((a, b) => (b.isDir ? 1 : 0) - (a.isDir ? 1 : 0));
  const parent = path.dirname(dirPath);
  return { path: dirPath, parent: parent !== dirPath ? parent : null, entries: out };
}

// ------------------------------------------------------------------ Zuletzt verwendet

async function recentFiles(limit = 16) {
  const out = [];
  if (IS_WIN && process.env.APPDATA) {
    const recentDir = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Recent');
    try {
      const names = (await fsp.readdir(recentDir)).filter((n) => n.toLowerCase().endsWith('.lnk'));
      const withTime = (await Promise.all(names.map(async (n) => {
        try { return { n, t: (await fsp.stat(path.join(recentDir, n))).mtimeMs }; } catch { return null; }
      }))).filter(Boolean).sort((a, b) => b.t - a.t);
      for (const { n, t } of withTime) {
        if (out.length >= limit) break;
        try {
          const target = shell.readShortcutLink(path.join(recentDir, n)).target;
          if (!target) continue;
          const st = await fsp.stat(target);
          if (st.isDirectory()) continue;
          const name = path.basename(target);
          out.push({ name, path: target, size: st.size, mtime: t, ext: extOf(name), cat: categoryOf(name) });
        } catch { /* Ziel existiert nicht mehr */ }
      }
    } catch { /* ignore */ }
  }
  return out.length ? out : indexer.recent(limit);
}

// ------------------------------------------------------------------ Vorschau

const thumbCache = new Map();
const THUMB_CACHE_MAX = 600;

async function thumbnail(p, size = 256) {
  const key = `${p}|${size}`;
  if (thumbCache.has(key)) return thumbCache.get(key);
  let url = null;
  if (IS_WIN || process.platform === 'darwin') {
    try {
      const img = await nativeImage.createThumbnailFromPath(p, { width: size, height: size });
      if (!img.isEmpty()) url = img.toDataURL();
    } catch { url = null; }
  }
  if (thumbCache.size >= THUMB_CACHE_MAX) thumbCache.delete(thumbCache.keys().next().value);
  thumbCache.set(key, url);
  return url;
}

async function previewText(p) {
  if (!isTextFile(p)) return null;
  const fh = await fsp.open(p, 'r');
  try {
    const buf = Buffer.alloc(64 * 1024);
    const { bytesRead } = await fh.read(buf, 0, buf.length, 0);
    let text = buf.subarray(0, bytesRead);
    // UTF-16 mit BOM erkennen (z. B. von Windows-Editor gespeichert)
    if (text[0] === 0xff && text[1] === 0xfe) return text.subarray(2).toString('utf16le');
    return text.toString('utf8');
  } finally {
    await fh.close();
  }
}

async function details(p) {
  const st = await fsp.stat(p);
  return { path: p, name: path.basename(p), size: st.size, mtime: st.mtimeMs, ctime: st.birthtimeMs || st.ctimeMs, isDir: st.isDirectory() };
}

// ------------------------------------------------------------------ Dateioperationen

function existsIn(dir) {
  return (name) => fs.existsSync(path.join(dir, name));
}

async function mkdir(dir, name = 'Neuer Ordner') {
  const final = uniqueName(name, existsIn(dir), true);
  const target = path.join(dir, final);
  await fsp.mkdir(target);
  return target;
}

async function newTextFile(dir) {
  const final = uniqueName('Neues Textdokument.txt', existsIn(dir));
  const target = path.join(dir, final);
  await fsp.writeFile(target, '', { flag: 'wx' });
  return target;
}

async function rename(p, newName) {
  const err = validateName(newName);
  if (err) throw new Error(err);
  const target = path.join(path.dirname(p), newName);
  if (target === p) return p;
  if (fs.existsSync(target) && target.toLowerCase() !== p.toLowerCase()) throw new Error('Es gibt dort schon etwas mit diesem Namen.');
  await fsp.rename(p, target);
  return target;
}

async function trash(paths) {
  const failed = [];
  for (const p of paths) {
    try { await shell.trashItem(p); } catch (err) { failed.push(p); log.warn('Papierkorb fehlgeschlagen', p, err); }
  }
  if (failed.length) throw new Error(`${failed.length} Element(e) konnten nicht gelöscht werden.`);
  return true;
}

function isInside(child, parent) {
  const rel = path.relative(parent, child);
  return rel === '' || (!rel.startsWith('..') && !path.isAbsolute(rel));
}

async function paste(paths, destDir, mode) {
  const results = [];
  for (const src of paths) {
    const st = await fsp.stat(src);
    if (st.isDirectory() && isInside(destDir, src)) throw new Error('Ein Ordner kann nicht in sich selbst eingefügt werden.');
    const sameDir = path.dirname(src).toLowerCase() === destDir.toLowerCase();
    if (mode === 'cut' && sameDir) { results.push(src); continue; }
    const name = uniqueName(path.basename(src), existsIn(destDir), st.isDirectory());
    const dest = path.join(destDir, name);
    if (mode === 'cut') {
      try {
        await fsp.rename(src, dest);
      } catch (err) {
        if (err.code !== 'EXDEV') throw err;
        // anderes Laufwerk: kopieren, dann Original löschen
        await fsp.cp(src, dest, { recursive: true, errorOnExist: true, force: false, preserveTimestamps: true });
        await fsp.rm(src, { recursive: true, force: true });
      }
    } else {
      await fsp.cp(src, dest, { recursive: true, errorOnExist: true, force: false, preserveTimestamps: true });
    }
    results.push(dest);
  }
  return results;
}

module.exports = {
  drives, quickFolders, indexRoots, listDir, recentFiles, thumbnail, previewText, details, mkdir, newTextFile, rename, trash, paste,
};
