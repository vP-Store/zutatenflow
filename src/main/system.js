'use strict';

const { net } = require('electron');
const { execFile } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');
const log = require('./log');

const IS_WIN = process.platform === 'win32';

function run(cmd, args) {
  const child = execFile(cmd, args, { windowsHide: true, detached: true }, () => {});
  child.unref();
}

function powerAction(action) {
  if (!IS_WIN) return false;
  switch (action) {
    case 'lock': run('rundll32.exe', ['user32.dll,LockWorkStation']); break;
    case 'logoff': run('shutdown.exe', ['/l']); break;
    case 'restart': run('shutdown.exe', ['/r', '/t', '0']); break;
    case 'shutdown': run('shutdown.exe', ['/s', '/t', '0']); break;
    case 'sleep': run('rundll32.exe', ['powrprof.dll,SetSuspendState', '0,1,0']); break;
    case 'explorer': run('explorer.exe', []); break;
    case 'taskmgr': run('taskmgr.exe', []); break;
    case 'recycle': run('explorer.exe', ['shell:RecycleBinFolder']); break;
    case 'empty-recycle':
      run('powershell.exe', ['-NoProfile', '-WindowStyle', 'Hidden', '-Command', 'Clear-RecycleBin -Force -ErrorAction SilentlyContinue']);
      break;
    default: return false;
  }
  log.info(`Systemaktion: ${action}`);
  return true;
}

// ------------------------------------------------------------------ Auslastung

let lastCpu = null;

function cpuSnapshot() {
  let idle = 0; let total = 0;
  for (const c of os.cpus()) {
    for (const v of Object.values(c.times)) total += v;
    idle += c.times.idle;
  }
  return { idle, total };
}

function stats() {
  const snap = cpuSnapshot();
  let cpu = 0;
  if (lastCpu) {
    const dt = snap.total - lastCpu.total;
    const di = snap.idle - lastCpu.idle;
    cpu = dt > 0 ? Math.max(0, Math.min(1, 1 - di / dt)) : 0;
  }
  lastCpu = snap;
  const total = os.totalmem();
  const free = os.freemem();
  return {
    cpu,
    cpuModel: (os.cpus()[0] || {}).model || '',
    cores: os.cpus().length,
    memUsed: total - free,
    memTotal: total,
    uptime: os.uptime(),
    host: os.hostname(),
  };
}

// ------------------------------------------------------------------ Wetter (Open-Meteo, ohne Schlüssel)

let weatherCache = { key: '', at: 0, data: null };

async function fetchJson(url) {
  const res = await net.fetch(url, { headers: { 'User-Agent': 'Cockpit' } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
}

async function geocode(city) {
  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=5&language=de&format=json`;
  const data = await fetchJson(url);
  return (data.results || []).map((r) => ({
    name: r.name,
    region: [r.admin1, r.country].filter(Boolean).join(', '),
    lat: r.latitude,
    lon: r.longitude,
  }));
}

async function weather(lat, lon) {
  if (lat == null || lon == null) return null;
  const key = `${lat},${lon}`;
  if (weatherCache.key === key && Date.now() - weatherCache.at < 20 * 60 * 1000) return weatherCache.data;
  const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}`
    + '&current=temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m,is_day'
    + '&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=auto&forecast_days=5';
  const d = await fetchJson(url);
  const data = {
    temp: d.current.temperature_2m,
    feels: d.current.apparent_temperature,
    code: d.current.weather_code,
    wind: d.current.wind_speed_10m,
    humidity: d.current.relative_humidity_2m,
    isDay: d.current.is_day === 1,
    days: d.daily.time.map((t, i) => ({
      date: t,
      code: d.daily.weather_code[i],
      max: d.daily.temperature_2m_max[i],
      min: d.daily.temperature_2m_min[i],
      rain: d.daily.precipitation_probability_max ? d.daily.precipitation_probability_max[i] : null,
    })),
  };
  weatherCache = { key, at: Date.now(), data };
  return data;
}

// ------------------------------------------------------------------ Hintergrundbild von Windows

function windowsWallpaper() {
  return new Promise((resolve) => {
    if (!IS_WIN) return resolve(null);
    execFile('reg.exe', ['query', 'HKCU\\Control Panel\\Desktop', '/v', 'WallPaper'], { windowsHide: true, timeout: 5000 }, (err, stdout) => {
      let p = null;
      if (!err && stdout) {
        const m = stdout.match(/WallPaper\s+REG_SZ\s+(.+)/i);
        if (m) p = m[1].trim();
      }
      // Fallback: von Windows umgewandelte Kopie
      const transcoded = process.env.APPDATA && path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Themes', 'TranscodedWallpaper');
      if (p && fs.existsSync(p)) return resolve(p);
      if (transcoded && fs.existsSync(transcoded)) return resolve(transcoded);
      resolve(null);
    });
  });
}

module.exports = { powerAction, stats, geocode, weather, windowsWallpaper };
