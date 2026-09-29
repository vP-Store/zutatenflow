'use strict';

// Einfaches Datei-Protokoll in %APPDATA%\Cockpit\logs\cockpit.log (max. ~1 MB, eine Vorversion)

const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const MAX_SIZE = 1024 * 1024;
let logFile = null;
const recent = [];

function file() {
  if (!logFile) {
    const dir = path.join(app.getPath('userData'), 'logs');
    try { fs.mkdirSync(dir, { recursive: true }); } catch { /* ignore */ }
    logFile = path.join(dir, 'cockpit.log');
  }
  return logFile;
}

function write(level, args) {
  const msg = args.map((a) => (a instanceof Error ? `${a.message}\n${a.stack}` : typeof a === 'string' ? a : JSON.stringify(a))).join(' ');
  const line = `${new Date().toISOString()} [${level}] ${msg}\n`;
  if (level !== 'info') {
    recent.push(line.trim());
    if (recent.length > 30) recent.shift();
  }
  try {
    const f = file();
    try {
      if (fs.statSync(f).size > MAX_SIZE) fs.renameSync(f, `${f}.1`);
    } catch { /* Datei existiert noch nicht */ }
    fs.appendFileSync(f, line, 'utf8');
  } catch { /* Protokoll darf nie die App stören */ }
  if (level === 'error') console.error(line.trim()); else console.log(line.trim());
}

module.exports = {
  info: (...a) => write('info', a),
  warn: (...a) => write('warn', a),
  error: (...a) => write('error', a),
  recentProblems: () => [...recent],
  dir: () => path.dirname(file()),
};
