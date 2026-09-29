'use strict';

const { contextBridge, ipcRenderer } = require('electron');

const call = (ch) => (...args) => ipcRenderer.invoke(ch, ...args);

const EVENTS = ['index:progress', 'dashboard:shown', 'dashboard:focus', 'update:status', 'wallpaper:changed'];

contextBridge.exposeInMainWorld('cockpit', {
  envInfo: call('env:info'),
  getSettings: call('settings:get'),
  setSettings: call('settings:set'),
  resetSettings: call('settings:reset'),

  listApps: call('apps:list'),
  launchApp: call('apps:launch'),
  launchAsAdmin: call('apps:admin'),
  revealApp: call('apps:reveal'),
  getIcon: call('icon:get'),

  drives: call('fs:drives'),
  quickFolders: call('fs:quick'),
  listDir: call('fs:list'),
  openPath: call('fs:open'),
  reveal: call('fs:reveal'),
  recentFiles: call('fs:recent'),
  filesByCategory: call('fs:category'),
  searchFiles: call('fs:search'),
  thumbnail: call('fs:thumb'),
  previewText: call('fs:text'),
  details: call('fs:details'),
  mkdir: call('fs:mkdir'),
  newTextFile: call('fs:newfile'),
  rename: call('fs:rename'),
  trash: call('fs:trash'),
  paste: call('fs:paste'),
  pickFolder: call('fs:pickFolder'),
  pickImage: call('fs:pickImage'),
  indexStatus: call('index:status'),
  rebuildIndex: call('index:rebuild'),

  listWindows: call('win:list'),
  focusWindow: call('win:focus'),
  minimizeWindow: call('win:minimize'),
  closeWindow: call('win:close'),

  openWeb: call('web:open'),
  openSettingsPage: call('settings:open'),

  stats: call('sys:stats'),
  geocode: call('sys:geocode'),
  weather: call('sys:weather'),
  wallpaper: call('sys:wallpaper'),
  diagnostics: call('sys:diagnostics'),
  copyText: call('sys:copy'),
  openLogs: call('sys:openLogs'),

  hideToWindows: call('window:hide'),
  quit: call('window:quit'),
  systemAction: call('system:action'),

  updateStatus: call('update:status'),
  checkUpdate: call('update:check'),
  installUpdate: call('update:install'),

  on: (channel, fn) => {
    if (!EVENTS.includes(channel)) return;
    ipcRenderer.on(channel, (_e, payload) => fn(payload));
  },
});
