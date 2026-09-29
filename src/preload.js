'use strict';

const { contextBridge, ipcRenderer } = require('electron');

const call = (ch) => (...args) => ipcRenderer.invoke(ch, ...args);

contextBridge.exposeInMainWorld('cockpit', {
  envInfo: call('env:info'),
  getSettings: call('settings:get'),
  setSettings: call('settings:set'),

  listApps: call('apps:list'),
  launchApp: call('apps:launch'),
  getIcon: call('icon:get'),

  drives: call('fs:drives'),
  quickFolders: call('fs:quick'),
  listDir: call('fs:list'),
  openPath: call('fs:open'),
  reveal: call('fs:reveal'),
  recentFiles: call('fs:recent'),
  filesByCategory: call('fs:category'),
  searchFiles: call('fs:search'),
  indexStatus: call('index:status'),
  rebuildIndex: call('index:rebuild'),

  openWeb: call('web:open'),

  hideToWindows: call('window:hide'),
  quit: call('window:quit'),
  systemAction: call('system:action'),

  on: (channel, fn) => {
    const allowed = ['index:progress', 'dashboard:shown'];
    if (!allowed.includes(channel)) return;
    ipcRenderer.on(channel, (_e, payload) => fn(payload));
  },
});
