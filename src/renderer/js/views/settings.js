'use strict';

(() => {
  const { $, api, esc, icon, state } = C;

  const ACCENTS = ['#7c8cff', '#3dd6c6', '#ff7ab6', '#ffb454', '#6fdc8c', '#b48cff', '#5cc8ff', '#ff6b6b'];

  function indexText() {
    const s = state.index;
    if (!s) return 'Noch nicht gestartet';
    if (s.running) return `Läuft … ${(s.progress || 0).toLocaleString('de-DE')} Dateien bisher`;
    if (s.done) return `${s.total.toLocaleString('de-DE')} Dateien und ${(s.folders || 0).toLocaleString('de-DE')} Ordner erfasst${s.finishedAt ? ` · ${C.fmtDate(s.finishedAt)}` : ''}${s.truncated ? ' (Obergrenze erreicht)' : ''}`;
    return 'Wartet …';
  }

  function updateText() {
    const u = state.update;
    if (!u) return '';
    switch (u.state) {
      case 'dev': return 'Updates sind nur in der installierten Version aktiv.';
      case 'checking': return 'Suche nach Updates …';
      case 'downloading': return `Update ${u.version || ''} wird geladen … ${u.progress || 0} %`;
      case 'ready': return `Update ${u.version} ist bereit.`;
      case 'latest': return 'Du hast die neueste Version.';
      case 'error': return `Update-Prüfung fehlgeschlagen: ${u.error || ''}`;
      default: return 'Updates werden automatisch geprüft.';
    }
  }

  const row = (title, sub, control, id = '') => `
    <div class="setting"${id ? ` id="${id}"` : ''}>
      <div class="st-text"><div class="st-title">${title}</div>${sub ? `<div class="st-sub">${sub}</div>` : ''}</div>
      <div class="st-control">${control}</div>
    </div>`;

  const sw = (key, on, label) => `<button class="switch" role="switch" aria-checked="${on ? 'true' : 'false'}" data-toggle="${key}" aria-label="${esc(label)}"></button>`;

  function render(el) {
    const s = state.settings;
    const wp = s.wallpaper || {};
    el.innerHTML = `
      <div class="view-head"><div><h1>Einstellungen</h1><p class="sub">Cockpit ${esc(state.env.version || '')}</p></div></div>

      <h3 class="st-group">Allgemein</h3>
      <div class="settings-list">
        ${row('Mit Windows starten', `Cockpit öffnet sich automatisch, sobald du dich anmeldest.${state.env.packaged === false ? ' (Wirkt erst in der installierten Version.)' : ''}`, sw('autostart', s.autostart, 'Mit Windows starten'))}
        ${row('Nach App-Start ausblenden', 'Cockpit tritt in den Hintergrund, sobald du ein Programm startest.', sw('hideOnLaunch', s.hideOnLaunch, 'Nach App-Start ausblenden'))}
        ${row('Dein Name', 'Für die Begrüßung auf der Startseite.', `<button class="btn" data-sact="name">${icon('user')} ${esc(s.userName || state.env.systemUser || 'Festlegen')}</button>`)}
        ${row('Wetter-Ort', s.weather && s.weather.name ? esc(s.weather.name) : 'Noch nicht festgelegt', `<button class="btn" data-sact="city">${icon('pin')} Ändern</button>`)}
      </div>

      <h3 class="st-group">Aussehen</h3>
      <div class="settings-list">
        ${row('Design', '', `<div class="seg">${[['dark', 'Dunkel'], ['light', 'Hell'], ['system', 'Wie Windows']].map(([v, l]) => `<button class="${s.theme === v ? 'on' : ''}" data-theme-set="${v}">${l}</button>`).join('')}</div>`)}
        ${row('Akzentfarbe', '', `<div class="swatches">${ACCENTS.map((c) => `<button class="swatch${s.accent === c ? ' on' : ''}" data-accent="${c}" style="background:${c}" aria-label="Farbe ${c}"></button>`).join('')}</div>`)}
        ${row('Hintergrundbild', wp.mode === 'custom' && wp.path ? esc(wp.path) : '', `<div class="seg">${[['none', 'Keins'], ['windows', 'Wie Windows'], ['custom', 'Eigenes …']].map(([v, l]) => `<button class="${wp.mode === v ? 'on' : ''}" data-wp="${v}">${l}</button>`).join('')}</div>`)}
        ${wp.mode !== 'none' ? row('Bild abdunkeln', 'Damit Schrift gut lesbar bleibt.', `<input type="range" min="0.2" max="0.9" step="0.05" value="${wp.dim ?? 0.6}" id="wp-dim">`) : ''}
      </div>

      <h3 class="st-group">Tastenkombinationen</h3>
      <div class="settings-list">
        ${row('Zu Windows wechseln / zurück', state.env.hotkeys && state.env.hotkeys.toggle === false ? '<span class="warn-text">Diese Kombination wird von einem anderen Programm belegt.</span>' : 'Funktioniert überall, auch wenn Cockpit ausgeblendet ist.', '<kbd>Strg + Alt + D</kbd>')}
        ${row('Cockpit beenden', 'Im Notfall geht es auch über den Task-Manager (Strg + Umschalt + Esc).', '<kbd>Strg + Alt + Q</kbd>')}
        ${row('Suchen', 'Einfach lostippen – oder:', '<kbd>Strg + K</kbd>')}
        ${row('Bereiche wechseln', 'Start, Apps, Dateien, Internet, Einstellungen', '<kbd>Alt + 1 … 5</kbd>')}
        ${row('Zwischen Programmen wechseln', '', '<kbd>Alt + Tab</kbd>')}
      </div>

      <h3 class="st-group">Dateien</h3>
      <div class="settings-list">
        ${row('Datei-Übersicht', `<span id="index-status">${esc(indexText())}</span>`, `<button class="btn" data-sact="reindex">${icon('refresh')} Neu durchsuchen</button>`)}
        ${row('Zusätzliche Ordner', (s.indexExtraRoots || []).length ? (s.indexExtraRoots || []).map((r) => `<span class="tag">${esc(r)} <button data-rmroot="${esc(r)}" title="Entfernen">×</button></span>`).join(' ') : 'Standard: dein Benutzerordner und alle weiteren Laufwerke.', `<button class="btn" data-sact="addroot">${icon('plus')} Ordner hinzufügen</button>`)}
      </div>

      <h3 class="st-group">Updates & Hilfe</h3>
      <div class="settings-list">
        ${row('Updates', `<span id="update-text">${esc(updateText())}</span>`, state.update && state.update.state === 'ready'
          ? `<button class="btn primary" data-sact="install">${icon('update')} Jetzt installieren</button>`
          : `<button class="btn" data-sact="check">${icon('refresh')} Jetzt prüfen</button>`)}
        ${row('Diagnose', 'Kopiert technische Infos in die Zwischenablage – praktisch, wenn etwas nicht klappt.', `<button class="btn" data-sact="diag">${icon('copy')} Diagnose kopieren</button> <button class="btn" data-sact="logs">${icon('folder')} Protokolle</button>`)}
        ${row('Einführung erneut zeigen', '', `<button class="btn" data-sact="onboarding">${icon('rocket')} Starten</button>`)}
        ${row('Alles zurücksetzen', 'Setzt alle Einstellungen, angeheftete Apps und Notizen zurück.', `<button class="btn danger" data-sact="reset">${icon('restart')} Zurücksetzen</button>`)}
        ${row('Cockpit beenden', 'Du landest wieder bei der normalen Windows-Oberfläche.', `<button class="btn danger" data-sact="quit">${icon('power')} Beenden</button>`)}
      </div>`;

    const dim = $('#wp-dim');
    if (dim) {
      dim.addEventListener('input', () => C.applyWallpaperDim(Number(dim.value)));
      dim.addEventListener('change', () => C.saveSettings({ wallpaper: { ...state.settings.wallpaper, dim: Number(dim.value) } }));
    }
  }

  async function onAction(act) {
    const s = state.settings;
    switch (act) {
      case 'name': {
        const n = await C.prompt('Wie sollen wir dich nennen?', s.userName || state.env.systemUser || '');
        if (n === null) return;
        await C.saveSettings({ userName: n.trim() });
        state.env.user = n.trim() || state.env.systemUser;
        C.render();
        break;
      }
      case 'city': await C.chooseCity(); C.render(); break;
      case 'reindex': api.rebuildIndex(); C.toast('Dateien werden neu durchsucht …'); break;
      case 'addroot': {
        const p = await api.pickFolder();
        if (!p) return;
        await C.saveSettings({ indexExtraRoots: [...new Set([...(s.indexExtraRoots || []), p])] });
        C.render();
        break;
      }
      case 'check': state.update = await api.checkUpdate(); C.render(); break;
      case 'install': api.installUpdate(); break;
      case 'diag': {
        const text = await api.diagnostics();
        await api.copyText(text);
        C.toast('Diagnose kopiert – du kannst sie jetzt einfügen und mir schicken');
        break;
      }
      case 'logs': api.openLogs(); break;
      case 'onboarding': C.onboarding.start(); break;
      case 'reset': {
        const ok = await C.confirm('Alles zurücksetzen?', 'Angeheftete Apps, Websites, Notizen und alle Einstellungen gehen verloren.', { okLabel: 'Zurücksetzen', danger: true });
        if (!ok) return;
        state.settings = await api.resetSettings();
        C.applyAppearance();
        C.onboarding.start();
        break;
      }
      case 'quit': api.quit(); break;
      default: break;
    }
  }

  async function onClick(e) {
    const t = e.target.closest('[data-toggle]');
    if (t) {
      const key = t.dataset.toggle;
      const on = !state.settings[key];
      await C.saveSettings({ [key]: on });
      t.setAttribute('aria-checked', String(on));
      return true;
    }
    const th = e.target.closest('[data-theme-set]');
    if (th) { await C.saveSettings({ theme: th.dataset.themeSet }); C.applyAppearance(); C.render(); return true; }
    const ac = e.target.closest('[data-accent]');
    if (ac) { await C.saveSettings({ accent: ac.dataset.accent }); C.applyAppearance(); C.render(); return true; }
    const wp = e.target.closest('[data-wp]');
    if (wp) {
      const mode = wp.dataset.wp;
      let p = state.settings.wallpaper.path;
      if (mode === 'custom') {
        p = await api.pickImage();
        if (!p) return true;
      }
      await C.saveSettings({ wallpaper: { ...state.settings.wallpaper, mode, path: p } });
      C.render();
      return true;
    }
    const rm = e.target.closest('[data-rmroot]');
    if (rm) {
      await C.saveSettings({ indexExtraRoots: (state.settings.indexExtraRoots || []).filter((r) => r !== rm.dataset.rmroot) });
      C.render();
      return true;
    }
    const a = e.target.closest('[data-sact]');
    if (a) { onAction(a.dataset.sact); return true; }
    return false;
  }

  C.on('index', () => { const el = $('#index-status'); if (el) el.textContent = indexText(); });
  C.on('update', () => { const el = $('#update-text'); if (el) el.textContent = updateText(); });

  C.views.settings = { render, onClick };
})();
