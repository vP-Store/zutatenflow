'use strict';

const fs = require('fs');
const path = require('path');
const { app } = require('electron');
const log = require('./log');

const DEFAULTS = {
  onboardingDone: false,
  autostart: true,
  userName: '',
  theme: 'dark', // 'dark' | 'light' | 'system'
  accent: '#7c8cff',
  wallpaper: { mode: 'windows', path: '', dim: 0.6 }, // mode: 'none' | 'windows' | 'custom'
  weather: { city: '', name: '', lat: null, lon: null },
  notes: '',
  favorites: [], // App-IDs auf der Startseite (Reihenfolge = Anzeige)
  launchCounts: {}, // App-ID -> Anzahl Starts
  lastLaunched: {}, // App-ID -> Zeitstempel
  pinnedFolders: [], // { name, path }
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
  filesView: 'list', // 'list' | 'grid'
  hideOnLaunch: false, // Cockpit nach App-Start ausblenden
};

let settings = structuredClone(DEFAULTS);
let saveTimer = null;

function file() {
  return path.join(app.getPath('userData'), 'settings.json');
}

function load() {
  try {
    const raw = JSON.parse(fs.readFileSync(file(), 'utf8'));
    settings = { ...structuredClone(DEFAULTS), ...raw };
    // verschachtelte Objekte ergänzen
    settings.wallpaper = { ...DEFAULTS.wallpaper, ...(raw.wallpaper || {}) };
    settings.weather = { ...DEFAULTS.weather, ...(raw.weather || {}) };
  } catch {
    settings = structuredClone(DEFAULTS);
  }
  return settings;
}

function saveNow() {
  clearTimeout(saveTimer);
  saveTimer = null;
  try {
    fs.mkdirSync(path.dirname(file()), { recursive: true });
    const tmp = `${file()}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(settings, null, 2), 'utf8');
    fs.renameSync(tmp, file());
  } catch (err) {
    log.error('Einstellungen konnten nicht gespeichert werden', err);
  }
}

function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveNow, 300);
}

function get() {
  return settings;
}

const ALLOWED = new Set(Object.keys(DEFAULTS));

function patch(p) {
  if (!p || typeof p !== 'object') return settings;
  for (const [k, v] of Object.entries(p)) {
    if (!ALLOWED.has(k)) continue;
    settings[k] = v;
  }
  save();
  return settings;
}

function reset() {
  settings = { ...structuredClone(DEFAULTS), onboardingDone: false };
  saveNow();
  return settings;
}

module.exports = { load, get, patch, save, saveNow, reset, DEFAULTS };
