'use strict';

// Gemeinsame Datei-Helfer für Hauptprozess, Index-Worker und Tests (ohne Electron-Abhängigkeit)

const path = require('path');

const CATEGORIES = {
  dokumente: ['pdf', 'doc', 'docx', 'odt', 'rtf', 'txt', 'md', 'xls', 'xlsx', 'xlsm', 'csv', 'ods', 'ppt', 'pptx', 'odp', 'epub', 'pages', 'numbers', 'key'],
  bilder: ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg', 'heic', 'heif', 'avif', 'tif', 'tiff', 'psd', 'ico', 'raw', 'cr2', 'nef', 'arw', 'dng'],
  videos: ['mp4', 'mkv', 'avi', 'mov', 'wmv', 'webm', 'flv', 'm4v', 'mpg', 'mpeg', '3gp'],
  musik: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a', 'wma', 'opus', 'aiff'],
  archive: ['zip', 'rar', '7z', 'tar', 'gz', 'iso', 'bz2', 'xz', 'cab'],
  programme: ['exe', 'msi', 'lnk', 'bat', 'cmd', 'ps1', 'url', 'appref-ms'],
  web: ['html', 'htm', 'css', 'js', 'ts', 'json', 'xml', 'py', 'php', 'java', 'c', 'cpp', 'cs', 'go', 'rs', 'sh', 'yml', 'yaml'],
};

const EXT_TO_CAT = {};
for (const [cat, exts] of Object.entries(CATEGORIES)) for (const e of exts) EXT_TO_CAT[e] = cat;

const TEXT_EXTS = new Set(['txt', 'md', 'csv', 'log', 'ini', 'cfg', 'conf', 'json', 'xml', 'html', 'htm', 'css', 'js', 'ts', 'py', 'php', 'java', 'c', 'cpp', 'h', 'cs', 'go', 'rs', 'sh', 'bat', 'cmd', 'ps1', 'yml', 'yaml', 'sql', 'reg', 'srt']);

// Ordner, die beim Durchsuchen übersprungen werden (Systemkram, riesige Entwicklerordner)
const SKIP_DIRS = new Set([
  'windows', 'program files', 'program files (x86)', 'programdata', '$recycle.bin',
  'system volume information', 'appdata', 'node_modules', '.git', '.cache', '$windows.~bt',
  '$windows.~ws', 'recovery', 'perflogs', 'msocache', 'config.msi', '$sysreset', '$winreagent',
  'windowsapps', 'onedrivetemp', '__pycache__', '.venv', 'venv', '.gradle', '.nuget', '.npm',
]);

const HIDDEN_FILES = new Set(['desktop.ini', 'thumbs.db', 'ntuser.dat', 'ntuser.ini', 'pagefile.sys', 'hiberfil.sys', 'swapfile.sys', 'dumpstack.log.tmp', 'dumpstack.log', '.ds_store']);

// Alte Windows-Verknüpfungspunkte (versteckt, Zugriff verweigert) – der Explorer zeigt sie nicht
const LEGACY_JUNCTIONS = new Set([
  'anwendungsdaten', 'application data', 'cookies', 'druckumgebung', 'eigene dateien', 'lokale einstellungen',
  'local settings', 'my documents', 'nethood', 'netzwerkumgebung', 'printhood', 'recent', 'sendto', 'startmenü',
  'start menu', 'vorlagen', 'templates', 'eigene bilder', 'eigene musik', 'eigene videos',
  'my music', 'my pictures', 'my videos', 'documents and settings',
]);

function isSystemJunction(name) {
  return LEGACY_JUNCTIONS.has(name.toLowerCase());
}

function extOf(name) {
  const i = name.lastIndexOf('.');
  return i > 0 ? name.slice(i + 1).toLowerCase() : '';
}

function categoryOf(name) {
  return EXT_TO_CAT[extOf(name)] || 'sonstiges';
}

function isHiddenName(name) {
  const n = name.toLowerCase();
  return n.startsWith('$') || n.startsWith('~$') || HIDDEN_FILES.has(n) || n.startsWith('ntuser.dat');
}

function isTextFile(name) {
  return TEXT_EXTS.has(extOf(name));
}

const INVALID_NAME = /[<>:"/\\|?*\x00-\x1f]/;
const RESERVED = /^(con|prn|aux|nul|com[1-9]|lpt[1-9])(\..*)?$/i;

// Prüft einen neuen Datei-/Ordnernamen nach Windows-Regeln. Liefert Fehlermeldung oder null.
function validateName(name) {
  if (typeof name !== 'string' || !name.trim()) return 'Der Name darf nicht leer sein.';
  if (name.length > 240) return 'Der Name ist zu lang.';
  if (INVALID_NAME.test(name)) return 'Diese Zeichen sind nicht erlaubt: \\ / : * ? " < > |';
  if (RESERVED.test(name)) return 'Dieser Name ist unter Windows reserviert.';
  if (/[. ]$/.test(name)) return 'Der Name darf nicht mit Punkt oder Leerzeichen enden.';
  return null;
}

// "Bericht.pdf" -> "Bericht (2).pdf", "Ordner" -> "Ordner (2)" – exists(name) prüft Vorhandensein
function uniqueName(name, exists, isDir = false) {
  if (!exists(name)) return name;
  const ext = isDir ? '' : path.extname(name);
  const base = ext ? name.slice(0, -ext.length) : name;
  const m = base.match(/^(.*) \((\d+)\)$/);
  const stem = m ? m[1] : base;
  let n = m ? Number(m[2]) + 1 : 2;
  for (;;) {
    const candidate = `${stem} (${n})${ext}`;
    if (!exists(candidate)) return candidate;
    n++;
  }
}

// Bewertet, wie gut ein Name zu einer Suchanfrage passt (0 = gar nicht)
function matchScore(name, query) {
  const n = name.toLowerCase();
  const q = query.toLowerCase().trim();
  if (!q) return 0;
  if (n === q) return 1000;
  if (n.startsWith(q)) return 800 - Math.min(n.length, 200);
  const words = q.split(/\s+/).filter(Boolean);
  let score = 0;
  for (const w of words) {
    const i = n.indexOf(w);
    if (i < 0) {
      // Initialen: "vsc" -> "Visual Studio Code"
      if (words.length === 1 && initials(n).startsWith(w) && w.length >= 2) { score += 500; continue; }
      return 0;
    }
    const boundary = i === 0 || /[\s\-_.()[\]]/.test(n[i - 1]);
    score += boundary ? 400 : 200;
  }
  return score - Math.min(n.length, 200);
}

function initials(s) {
  return s.split(/[\s\-_.]+/).filter(Boolean).map((w) => w[0]).join('');
}

module.exports = {
  CATEGORIES, SKIP_DIRS, isSystemJunction, extOf, categoryOf, isHiddenName, isTextFile, validateName, uniqueName, matchScore,
};
