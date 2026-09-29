'use strict';

// Läuft in einem eigenen Thread: durchsucht Ordner, ohne die Oberfläche auszubremsen.

const { parentPort, workerData } = require('worker_threads');
const fsp = require('fs').promises;
const path = require('path');
const { SKIP_DIRS, isHiddenName } = require('../shared/files-common');

const { roots, limit = 300000, maxDepth = 14 } = workerData;
const files = [];
const dirs = [];
let lastReport = 0;

function report() {
  const now = Date.now();
  if (now - lastReport < 700) return;
  lastReport = now;
  parentPort.postMessage({ type: 'progress', files: files.length, dirs: dirs.length });
}

async function walk(dir, depth) {
  if (files.length >= limit || depth > maxDepth) return;
  let entries;
  try { entries = await fsp.readdir(dir, { withFileTypes: true }); } catch { return; }
  const subdirs = [];
  const fileNames = [];
  for (const e of entries) {
    if (isHiddenName(e.name) || e.name.startsWith('.')) continue;
    if (e.isDirectory()) {
      if (!SKIP_DIRS.has(e.name.toLowerCase())) subdirs.push(path.join(dir, e.name));
    } else if (e.isFile()) {
      fileNames.push(e.name);
    }
  }
  // Dateien in kleinen Paketen parallel abfragen
  for (let i = 0; i < fileNames.length && files.length < limit; i += 64) {
    const chunk = fileNames.slice(i, i + 64);
    const stats = await Promise.all(chunk.map((n) => fsp.stat(path.join(dir, n)).catch(() => null)));
    stats.forEach((st, j) => {
      if (st && files.length < limit) files.push([path.join(dir, chunk[j]), st.size, Math.round(st.mtimeMs)]);
    });
  }
  report();
  for (const sd of subdirs) {
    if (files.length >= limit) break;
    let mtime = 0;
    try { mtime = Math.round((await fsp.stat(sd)).mtimeMs); } catch { continue; }
    dirs.push([sd, mtime]);
    await walk(sd, depth + 1);
  }
}

(async () => {
  for (const r of roots) {
    if (files.length >= limit) break;
    await walk(r, 0);
  }
  parentPort.postMessage({ type: 'done', files, dirs, truncated: files.length >= limit });
})().catch((err) => {
  parentPort.postMessage({ type: 'error', message: String(err && err.message) });
});
