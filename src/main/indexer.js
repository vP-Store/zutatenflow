'use strict';

// Datei-Index: Übersicht aller Dateien nach Typ + schnelle Suche.
// Wird beim Start aus dem Zwischenspeicher geladen und im Hintergrund aktualisiert.

const fs = require('fs');
const path = require('path');
const { Worker } = require('worker_threads');
const { EventEmitter } = require('events');
const { app } = require('electron');
const log = require('./log');
const { extOf, categoryOf, matchScore } = require('../shared/files-common');

const CACHE_VERSION = 2;
const events = new EventEmitter();

const state = {
  files: [],
  dirs: [],
  running: false,
  done: false,
  progress: 0,
  finishedAt: 0,
  truncated: false,
  counts: {},
};

let worker = null;

function cacheFile() {
  return path.join(app.getPath('userData'), 'index-cache.json');
}

function expandFiles(raw) {
  return raw.map(([p, size, mtime]) => {
    const name = path.basename(p);
    return { name, path: p, size, mtime, ext: extOf(name), cat: categoryOf(name) };
  });
}

function expandDirs(raw) {
  return raw.map(([p, mtime]) => ({ name: path.basename(p), path: p, mtime, isDir: true, cat: 'ordner', size: 0, ext: '' }));
}

function recount() {
  const counts = {};
  for (const f of state.files) counts[f.cat] = (counts[f.cat] || 0) + 1;
  state.counts = counts;
}

function loadCache() {
  try {
    const data = JSON.parse(fs.readFileSync(cacheFile(), 'utf8'));
    if (data.version !== CACHE_VERSION) return false;
    state.files = expandFiles(data.files || []);
    state.dirs = expandDirs(data.dirs || []);
    state.finishedAt = data.finishedAt || 0;
    state.truncated = !!data.truncated;
    state.done = true;
    recount();
    log.info(`Index aus Zwischenspeicher: ${state.files.length} Dateien`);
    return true;
  } catch {
    return false;
  }
}

function writeCache(rawFiles, rawDirs) {
  const data = JSON.stringify({ version: CACHE_VERSION, finishedAt: state.finishedAt, truncated: state.truncated, files: rawFiles, dirs: rawDirs });
  const tmp = `${cacheFile()}.tmp`;
  fs.promises.writeFile(tmp, data, 'utf8')
    .then(() => fs.promises.rename(tmp, cacheFile()))
    .catch((err) => log.warn('Index-Zwischenspeicher nicht geschrieben', err));
}

function status() {
  return {
    running: state.running,
    done: state.done,
    total: state.files.length,
    folders: state.dirs.length,
    progress: state.progress,
    counts: state.counts,
    finishedAt: state.finishedAt,
    truncated: state.truncated,
  };
}

function build(roots) {
  if (state.running) return;
  state.running = true;
  state.progress = 0;
  events.emit('progress', status());
  const started = Date.now();
  try {
    worker = new Worker(path.join(__dirname, 'indexer-worker.js'), { workerData: { roots } });
  } catch (err) {
    log.error('Index-Worker konnte nicht starten', err);
    state.running = false;
    return;
  }
  worker.on('message', (msg) => {
    if (msg.type === 'progress') {
      state.progress = msg.files;
      events.emit('progress', status());
    } else if (msg.type === 'done') {
      state.files = expandFiles(msg.files);
      state.dirs = expandDirs(msg.dirs);
      state.truncated = msg.truncated;
      state.finishedAt = Date.now();
      state.done = true;
      state.running = false;
      recount();
      log.info(`Index fertig: ${state.files.length} Dateien, ${state.dirs.length} Ordner in ${Math.round((Date.now() - started) / 1000)} s`);
      writeCache(msg.files, msg.dirs);
      events.emit('progress', status());
      worker.terminate();
      worker = null;
    } else if (msg.type === 'error') {
      log.error('Index-Fehler', msg.message);
    }
  });
  worker.on('error', (err) => {
    log.error('Index-Worker abgestürzt', err);
    state.running = false;
    worker = null;
    events.emit('progress', status());
  });
}

const SORTERS = {
  name: (a, b) => a.name.localeCompare(b.name, 'de', { numeric: true }),
  mtime: (a, b) => b.mtime - a.mtime,
  size: (a, b) => b.size - a.size,
  type: (a, b) => (a.ext || '').localeCompare(b.ext || '') || a.name.localeCompare(b.name, 'de'),
};

function sortEntries(list, sortBy) {
  list.sort(SORTERS[sortBy] || SORTERS.mtime);
  return list;
}

function byCategory(cat, sortBy = 'mtime', limit = 1000) {
  const list = sortEntries(state.files.filter((f) => f.cat === cat), sortBy);
  return { total: list.length, items: list.slice(0, limit) };
}

function search(q, limit = 40) {
  const hits = [];
  const now = Date.now();
  const consider = (e, bonus) => {
    const s = matchScore(e.name, q);
    if (s <= 0) return;
    // Kürzlich geänderte Dateien leicht bevorzugen
    const ageDays = (now - e.mtime) / 86400000;
    const recency = ageDays < 7 ? 60 : ageDays < 60 ? 25 : 0;
    hits.push({ e, s: s + recency + bonus });
  };
  for (const d of state.dirs) consider(d, 30);
  for (const f of state.files) consider(f, 0);
  hits.sort((a, b) => b.s - a.s);
  return hits.slice(0, limit).map((h) => h.e);
}

function recent(limit) {
  return [...state.files].sort(SORTERS.mtime).slice(0, limit);
}

module.exports = { events, loadCache, build, status, byCategory, search, recent, sortEntries };
