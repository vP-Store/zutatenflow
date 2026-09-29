'use strict';

// Automatische Updates über GitHub Releases (electron-updater)

const { app } = require('electron');
const log = require('./log');

let autoUpdater = null;
let notify = () => {};
const state = { state: 'idle', version: null, progress: 0, error: null, checkedAt: 0 };

function set(patch) {
  Object.assign(state, patch);
  notify({ ...state });
}

function init(onStatus) {
  notify = onStatus;
  if (!app.isPackaged) { set({ state: 'dev' }); return; }
  try {
    ({ autoUpdater } = require('electron-updater'));
  } catch (err) {
    log.error('electron-updater fehlt', err);
    return;
  }
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;
  autoUpdater.logger = { info: (m) => log.info(`[update] ${m}`), warn: (m) => log.warn(`[update] ${m}`), error: (m) => log.error(`[update] ${m}`), debug: () => {} };

  autoUpdater.on('checking-for-update', () => set({ state: 'checking', error: null }));
  autoUpdater.on('update-available', (i) => set({ state: 'downloading', version: i.version, progress: 0 }));
  autoUpdater.on('update-not-available', () => set({ state: 'latest', checkedAt: Date.now() }));
  autoUpdater.on('download-progress', (p) => set({ state: 'downloading', progress: Math.round(p.percent || 0) }));
  autoUpdater.on('update-downloaded', (i) => set({ state: 'ready', version: i.version, progress: 100 }));
  autoUpdater.on('error', (err) => set({ state: 'error', error: String((err && err.message) || err).split('\n')[0], checkedAt: Date.now() }));

  setTimeout(() => check(false), 15000);
  setInterval(() => check(false), 6 * 60 * 60 * 1000);
}

async function check(manual) {
  if (!autoUpdater) return { ...state };
  if (state.state === 'downloading' || state.state === 'ready') return { ...state };
  try {
    await autoUpdater.checkForUpdates();
  } catch (err) {
    if (manual) set({ state: 'error', error: String(err.message || err).split('\n')[0] });
  }
  return { ...state };
}

function install() {
  if (autoUpdater && state.state === 'ready') autoUpdater.quitAndInstall(true, true);
}

function status() {
  return { ...state, current: app.getVersion() };
}

module.exports = { init, check, install, status };
