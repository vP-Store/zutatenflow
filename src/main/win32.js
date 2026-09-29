'use strict';

// Offene Fenster auflisten, in den Vordergrund holen, minimieren, schließen – direkt über die Windows-API.

const log = require('./log');

const IS_WIN = process.platform === 'win32';

let api = null;
let loadError = null;

function load() {
  if (api || loadError || !IS_WIN) return api;
  try {
    const koffi = require('koffi');
    const user32 = koffi.load('user32.dll');
    const kernel32 = koffi.load('kernel32.dll');
    const dwmapi = koffi.load('dwmapi.dll');

    const EnumWindowsProc = koffi.proto('bool __stdcall EnumWindowsProc(intptr_t hwnd, intptr_t lParam)');

    api = {
      EnumWindows: user32.func('bool __stdcall EnumWindows(EnumWindowsProc *cb, intptr_t lParam)'),
      IsWindowVisible: user32.func('bool __stdcall IsWindowVisible(intptr_t hwnd)'),
      IsIconic: user32.func('bool __stdcall IsIconic(intptr_t hwnd)'),
      GetWindowTextW: user32.func('int __stdcall GetWindowTextW(intptr_t hwnd, _Out_ uint16_t *buf, int max)'),
      GetWindowTextLengthW: user32.func('int __stdcall GetWindowTextLengthW(intptr_t hwnd)'),
      GetWindow: user32.func('intptr_t __stdcall GetWindow(intptr_t hwnd, uint32_t cmd)'),
      GetWindowLongPtrW: user32.func('intptr_t __stdcall GetWindowLongPtrW(intptr_t hwnd, int index)'),
      GetWindowThreadProcessId: user32.func('uint32_t __stdcall GetWindowThreadProcessId(intptr_t hwnd, _Out_ uint32_t *pid)'),
      GetForegroundWindow: user32.func('intptr_t __stdcall GetForegroundWindow()'),
      SetForegroundWindow: user32.func('bool __stdcall SetForegroundWindow(intptr_t hwnd)'),
      ShowWindow: user32.func('bool __stdcall ShowWindow(intptr_t hwnd, int cmd)'),
      PostMessageW: user32.func('bool __stdcall PostMessageW(intptr_t hwnd, uint32_t msg, uintptr_t wParam, intptr_t lParam)'),
      BringWindowToTop: user32.func('bool __stdcall BringWindowToTop(intptr_t hwnd)'),
      OpenProcess: kernel32.func('intptr_t __stdcall OpenProcess(uint32_t access, bool inherit, uint32_t pid)'),
      CloseHandle: kernel32.func('bool __stdcall CloseHandle(intptr_t h)'),
      QueryFullProcessImageNameW: kernel32.func('bool __stdcall QueryFullProcessImageNameW(intptr_t h, uint32_t flags, _Out_ uint16_t *buf, _Inout_ uint32_t *size)'),
      DwmGetWindowAttribute: dwmapi.func('int __stdcall DwmGetWindowAttribute(intptr_t hwnd, uint32_t attr, _Out_ int32_t *value, uint32_t size)'),
    };
    log.info('Windows-API geladen');
  } catch (err) {
    loadError = err;
    log.error('Windows-API (koffi) konnte nicht geladen werden', err);
  }
  return api;
}

const GW_OWNER = 4;
const GWL_EXSTYLE = -20;
const WS_EX_TOOLWINDOW = 0x80;
const WS_EX_APPWINDOW = 0x40000;
const WS_EX_NOACTIVATE = 0x8000000;
const DWMWA_CLOAKED = 14;
const PROCESS_QUERY_LIMITED_INFORMATION = 0x1000;
const SW_MINIMIZE = 6;
const SW_RESTORE = 9;
const WM_CLOSE = 0x0010;

const IGNORE_TITLES = new Set(['Program Manager', 'Windows Input Experience', 'Windows-Eingabeoberfläche', 'Microsoft Text Input Application', 'Settings', 'NVIDIA GeForce Overlay']);

const exeCache = new Map();

function num(v) {
  return typeof v === 'bigint' ? Number(v) : v;
}

function exePathOf(pid) {
  if (exeCache.has(pid)) return exeCache.get(pid);
  let result = '';
  const h = num(api.OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid));
  if (h) {
    try {
      const buf = Buffer.alloc(1024 * 2);
      const size = [1024];
      if (api.QueryFullProcessImageNameW(h, 0, buf, size)) result = buf.toString('utf16le', 0, size[0] * 2);
    } finally {
      api.CloseHandle(h);
    }
  }
  if (exeCache.size > 500) exeCache.clear();
  exeCache.set(pid, result);
  return result;
}

function titleOf(hwnd) {
  const len = api.GetWindowTextLengthW(hwnd);
  if (len <= 0) return '';
  const buf = Buffer.alloc((len + 1) * 2);
  const n = api.GetWindowTextW(hwnd, buf, len + 1);
  return buf.toString('utf16le', 0, Math.max(0, n) * 2);
}

function isCloaked(hwnd) {
  const v = [0];
  const hr = api.DwmGetWindowAttribute(hwnd, DWMWA_CLOAKED, v, 4);
  return hr === 0 && v[0] !== 0;
}

// Liefert die Fenster, die auch in der Windows-Taskleiste auftauchen würden
function listWindows(excludeHandles = []) {
  if (!load()) return { supported: false, windows: [], error: loadError ? String(loadError.message) : null };
  const exclude = new Set(excludeHandles.map(num));
  const foreground = num(api.GetForegroundWindow());
  const handles = [];
  api.EnumWindows((hwnd) => { handles.push(num(hwnd)); return true; }, 0);

  const windows = [];
  for (const hwnd of handles) {
    if (exclude.has(hwnd)) continue;
    if (!api.IsWindowVisible(hwnd)) continue;
    const ex = num(api.GetWindowLongPtrW(hwnd, GWL_EXSTYLE));
    const owner = num(api.GetWindow(hwnd, GW_OWNER));
    if ((ex & WS_EX_TOOLWINDOW) && !(ex & WS_EX_APPWINDOW)) continue;
    if ((ex & WS_EX_NOACTIVATE) && !(ex & WS_EX_APPWINDOW)) continue;
    if (owner && !(ex & WS_EX_APPWINDOW)) continue;
    if (isCloaked(hwnd)) continue;
    const title = titleOf(hwnd);
    if (!title || IGNORE_TITLES.has(title)) continue;
    const pidOut = [0];
    api.GetWindowThreadProcessId(hwnd, pidOut);
    const pid = pidOut[0];
    if (pid === process.pid) continue;
    const exe = exePathOf(pid);
    if (exe && exe.toLowerCase() === process.execPath.toLowerCase()) continue;
    windows.push({ hwnd, title, pid, exe, minimized: !!api.IsIconic(hwnd), active: hwnd === foreground });
  }
  return { supported: true, windows };
}

function focusWindow(hwnd) {
  if (!load()) return false;
  if (api.IsIconic(hwnd)) api.ShowWindow(hwnd, SW_RESTORE);
  api.BringWindowToTop(hwnd);
  return !!api.SetForegroundWindow(hwnd);
}

function minimizeWindow(hwnd) {
  if (!load()) return false;
  return !!api.ShowWindow(hwnd, SW_MINIMIZE);
}

function closeWindow(hwnd) {
  if (!load()) return false;
  return !!api.PostMessageW(hwnd, WM_CLOSE, 0, 0);
}

function isSupported() {
  return !!load();
}

module.exports = { listWindows, focusWindow, minimizeWindow, closeWindow, isSupported };
