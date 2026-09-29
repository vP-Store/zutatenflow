'use strict';

// Ende-zu-Ende-Test: startet die echte App und prüft die wichtigsten Funktionen.
// Unter Windows (CI) gegen die gebaute Cockpit.exe, sonst gegen den Quellcode.
//   COCKPIT_EXE=dist\win-unpacked\Cockpit.exe node test/e2e.js

const { _electron: electron } = require('playwright-core');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const IS_WIN = process.platform === 'win32';
const OUT = path.join(__dirname, '..', 'test-results');
fs.mkdirSync(OUT, { recursive: true });

const results = [];
function record(name, ok, detail = '', soft = false) {
  results.push({ name, ok, detail: String(detail).slice(0, 300), soft });
  console.log(`${ok ? '✓' : soft ? '⚠' : '✗'} ${name}${detail ? ` – ${detail}` : ''}`);
}
async function check(name, fn, soft = false) {
  try {
    const detail = await fn();
    record(name, true, detail || '', soft);
  } catch (err) {
    record(name, false, err && err.message ? err.message : err, soft);
  }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitFor(fn, timeout, interval = 500) {
  const end = Date.now() + timeout;
  let last;
  while (Date.now() < end) {
    last = await fn();
    if (last) return last;
    await sleep(interval);
  }
  return last;
}

(async () => {
  const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'cockpit-e2e-data-'));
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'cockpit-e2e-work-'));
  const marker = `cockpit-e2e-${Date.now()}.txt`;
  const markerPath = path.join(os.homedir(), marker);
  fs.writeFileSync(markerPath, 'Cockpit E2E');

  const exe = process.env.COCKPIT_EXE;
  const launchOpts = exe
    ? { executablePath: path.resolve(exe), args: [], env: { ...process.env, COCKPIT_USER_DATA: userData } }
    : { executablePath: require('electron'), args: [path.join(__dirname, '..'), ...(IS_WIN ? [] : ['--no-sandbox'])], env: { ...process.env, COCKPIT_USER_DATA: userData } };

  const started = Date.now();
  const app = await electron.launch({ ...launchOpts, timeout: 60000 });
  const page = await app.firstWindow();
  const pageErrors = [];
  page.on('pageerror', (e) => pageErrors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' && !/ERR_(TUNNEL|FILE_NOT_FOUND|CONNECTION|NAME_NOT_RESOLVED|INTERNET)/.test(m.text())) pageErrors.push(m.text()); });

  const call = (fn, ...args) => page.evaluate(([f, a]) => window.cockpit[f](...a), [fn, args]);

  await check('Fenster startet', async () => {
    await page.waitForSelector('#view h1, .ob-card', { timeout: 30000 });
    return `${Date.now() - started} ms`;
  });

  await check('Einrichtungs-Assistent erscheint beim ersten Start', async () => {
    await page.waitForSelector('.ob-card', { timeout: 10000 });
    await page.click('[data-ob="skip"]');
  });

  let env = {};
  await check('Umgebung', async () => {
    env = await call('envInfo');
    return JSON.stringify(env);
  });

  if (IS_WIN) {
    await check('Windows-API (Fenstersteuerung) geladen', async () => assert(env.windowsApi === true, 'windowsApi=false'));
    await check('Tastenkombinationen registriert', async () => assert(env.hotkeys && env.hotkeys.toggle && env.hotkeys.quit, JSON.stringify(env.hotkeys)), true);
  }

  await check('Apps werden eingelesen', async () => {
    const n = await waitFor(() => page.evaluate(() => (window.C ? window.C.state.apps.length : 0)), IS_WIN ? 60000 : 5000);
    if (IS_WIN) assert(n > 3, `nur ${n} Apps`);
    return `${n} Apps`;
  });

  await check('Laufwerke', async () => {
    const d = await call('drives');
    if (IS_WIN) assert(d.some((x) => x.letter === 'C' && x.total > 0), JSON.stringify(d));
    return d.map((x) => `${x.letter}: ${Math.round(x.free / 1e9)} GB frei`).join(', ');
  });

  await check('Ordner auflisten', async () => {
    const r = await call('listDir', os.homedir(), 'name');
    assert(r.entries.some((e) => e.name === marker), 'Testdatei nicht im Benutzerordner gefunden');
    return `${r.entries.length} Einträge`;
  });

  await check('Dateioperationen (neu, umbenennen, kopieren, verschieben, Papierkorb)', async () => {
    const dir = await call('mkdir', work);
    assert(fs.existsSync(dir), 'Ordner nicht erstellt');
    const dir2 = await call('mkdir', work);
    assert(dir2.endsWith('(2)'), `zweiter Ordner heißt ${dir2}`);
    const txt = await call('newTextFile', dir);
    assert(fs.existsSync(txt), 'Textdatei nicht erstellt');
    const renamed = await call('rename', txt, 'Notiz.txt');
    assert(fs.existsSync(renamed) && !fs.existsSync(txt), 'Umbenennen fehlgeschlagen');
    let invalid = false;
    try { await call('rename', renamed, 'a/b'); } catch { invalid = true; }
    assert(invalid, 'Ungültiger Name wurde akzeptiert');
    const copied = await call('paste', [renamed], dir2, 'copy');
    assert(fs.existsSync(copied[0]) && fs.existsSync(renamed), 'Kopieren fehlgeschlagen');
    const copied2 = await call('paste', [renamed], dir2, 'copy');
    assert(/Notiz \(2\)\.txt$/.test(copied2[0]), `Kopie heißt ${copied2[0]}`);
    const moved = await call('paste', [renamed], work, 'cut');
    assert(fs.existsSync(moved[0]) && !fs.existsSync(renamed), 'Verschieben fehlgeschlagen');
    let selfPaste = false;
    try { await call('paste', [dir], dir, 'copy'); } catch { selfPaste = true; }
    assert(selfPaste, 'Ordner in sich selbst kopiert');
    await call('trash', [dir2]);
    assert(!fs.existsSync(dir2), 'Papierkorb fehlgeschlagen');
  });

  await check('Textvorschau', async () => {
    const p = path.join(work, 'vorschau.txt');
    fs.writeFileSync(p, 'Hallo Vorschau äöü');
    const t = await call('previewText', p);
    assert(t === 'Hallo Vorschau äöü', t);
  });

  if (IS_WIN) {
    await check('Vorschaubilder (Windows-Shell)', async () => {
      const src = path.join(path.dirname(exe ? path.resolve(exe) : __dirname), exe ? 'resources/app/build/icon.png' : '../build/icon.png');
      const img = path.join(work, 'bild.png');
      fs.copyFileSync(fs.existsSync(src) ? src : path.join(__dirname, '..', 'build', 'icon.png'), img);
      const url = await call('thumbnail', img, 128);
      assert(url && url.startsWith('data:image'), 'kein Vorschaubild');
    });

    await check('App-Symbole', async () => {
      const url = await call('getIcon', 'C:\\Windows\\explorer.exe');
      assert(url && url.startsWith('data:image'), 'kein Symbol');
    });

    let notepad = null;
    await check('Offene Fenster erkennen (Editor starten)', async () => {
      notepad = spawn('notepad.exe', [], { detached: true, stdio: 'ignore' });
      const w = await waitFor(async () => {
        const r = await call('listWindows');
        return r.windows.find((x) => /notepad\.exe$/i.test(x.exe) || /Editor|Notepad/i.test(x.title));
      }, 15000);
      assert(w, 'Editor-Fenster nicht gefunden');
      const r = await call('listWindows');
      assert(!r.windows.some((x) => /Cockpit\.exe$/i.test(x.exe)), 'Cockpit listet sich selbst');
      await call('focusWindow', w.hwnd);
      await call('minimizeWindow', w.hwnd);
      await sleep(600);
      const again = (await call('listWindows')).windows.find((x) => x.hwnd === w.hwnd);
      assert(again && again.minimized, 'Minimieren hat nicht geklappt');
      await call('closeWindow', w.hwnd);
      const gone = await waitFor(async () => !(await call('listWindows')).windows.some((x) => x.hwnd === w.hwnd), 8000);
      assert(gone, 'Schließen hat nicht geklappt');
      return `${r.windows.length} Fenster, Editor gefunden als „${w.title}“`;
    });
    if (notepad) try { process.kill(notepad.pid); } catch { /* schon zu */ }

    await check('Autostart eingetragen', async () => {
      const on = await app.evaluate(({ app: a }) => a.getLoginItemSettings().openAtLogin);
      if (exe) assert(on === true, 'nicht im Autostart');
      return String(on);
    });
  }

  await check('Datei-Index findet neue Datei', async () => {
    await call('rebuildIndex');
    const st = await waitFor(async () => {
      const s = await call('indexStatus');
      return s.done && !s.running ? s : null;
    }, 180000, 1500);
    assert(st, 'Index nicht fertig geworden');
    const hits = await call('searchFiles', marker.replace('.txt', ''));
    assert(hits.some((h) => h.name === marker), 'Testdatei nicht im Index');
    return `${st.total} Dateien, ${st.folders} Ordner`;
  });

  async function searchFor(text, selector) {
    await page.fill('#search', '');
    await page.click('#search');
    await page.keyboard.type(text);
    try {
      await page.waitForSelector(selector, { timeout: 5000 });
      return await page.textContent('#search-results');
    } finally {
      await page.keyboard.press('Escape');
    }
  }

  await check('Rechner in der Suche', async () => {
    const t = await searchFor('12*7+1', '.sr-big');
    assert(/= 85/.test(t), t.slice(0, 80));
  });

  await check('Suche findet Befehle', async () => {
    const t = await searchFor('herunterfahren', '.sr-item');
    assert(/Herunterfahren/.test(t), t.slice(0, 100));
  });

  if (IS_WIN) {
    await check('Suche findet Windows-Einstellungen', async () => {
      const t = await searchFor('bluetooth', '.sr-item');
      assert(/Bluetooth & Geräte/.test(t), t.slice(0, 100));
    });
  }

  for (const [view, sel] of [['apps', '#app-grid-wrap'], ['files', '#file-list'], ['web', '#web-form'], ['settings', '.settings-list'], ['home', '.widgets']]) {
    await check(`Ansicht „${view}“`, async () => {
      await page.click(`#sidebar [data-view="${view}"]`);
      await page.waitForSelector(sel, { timeout: 5000 });
      await sleep(view === 'files' ? 1200 : 500);
      await page.screenshot({ path: path.join(OUT, `${view}.png`) });
    });
  }

  await check('Wetter (Internet)', async () => {
    const r = await call('geocode', 'Berlin');
    assert(r.length, 'kein Ort');
    const w = await call('weather', r[0].lat, r[0].lon);
    assert(typeof w.temp === 'number', 'keine Temperatur');
    return `${r[0].name}: ${w.temp} °C`;
  }, true);

  await check('Einstellungen werden gespeichert', async () => {
    await call('setSettings', { notes: 'E2E-Notiz' });
    await sleep(700);
    const saved = JSON.parse(fs.readFileSync(path.join(userData, 'settings.json'), 'utf8'));
    assert(saved.notes === 'E2E-Notiz', 'nicht gespeichert');
  });

  await check('Diagnose', async () => {
    const d = await call('diagnostics');
    return d.split('\n').slice(0, 5).join(' | ');
  });

  await check('Keine Fehler in der Oberfläche', async () => assert(!pageErrors.length, pageErrors.join(' | ')));

  await app.evaluate(({ app: a }) => a.exit(0)).catch(() => {});
  try { fs.rmSync(markerPath, { force: true }); } catch { /* ignore */ }
  try { fs.rmSync(work, { recursive: true, force: true }); } catch { /* ignore */ }

  const hardFails = results.filter((r) => !r.ok && !r.soft);
  fs.writeFileSync(path.join(OUT, 'results.json'), JSON.stringify({ platform: process.platform, results }, null, 2));
  console.log(`\n${results.filter((r) => r.ok).length}/${results.length} Prüfungen bestanden${hardFails.length ? ` – ${hardFails.length} FEHLER` : ''}`);
  process.exit(hardFails.length ? 1 : 0);
})().catch((err) => {
  console.error('E2E abgebrochen:', err);
  process.exit(1);
});
