'use strict';

// Einrichtungs-Assistent beim ersten Start

(() => {
  const { $, api, esc, icon, state } = C;

  const SUGGEST = [
    /^google chrome$/i, /^microsoft edge$/i, /firefox/i, /^opera/i, /^brave/i,
    /^datei-explorer$/i, /^word$/i, /^excel$/i, /^powerpoint$/i, /^outlook/i,
    /^spotify$/i, /^discord$/i, /^whatsapp$/i, /^telegram/i, /^canva$/i, /photoshop/i, /illustrator/i, /lightroom/i,
    /^visual studio code$/i, /^notepad\+\+$/i, /^steam$/i, /^zoom/i, /^microsoft teams/i, /^vlc/i, /^claude$/i, /^einstellungen$/i, /^rechner$/i,
  ];

  let step = 0;
  let picked = new Set();
  let el = null;
  let nameVal = '';
  let cityVal = '';

  function suggestions() {
    const out = [];
    for (const re of SUGGEST) {
      const a = state.apps.find((x) => re.test(x.name));
      if (a && !out.includes(a)) out.push(a);
    }
    return out.slice(0, 18);
  }

  function renderStep() {
    const dots = [0, 1, 2].map((i) => `<span class="${i === step ? 'on' : ''}"></span>`).join('');
    let body = '';
    if (step === 0) {
      body = `
        <div class="ob-logo">${icon('rocket', 'big')}</div>
        <h2>Willkommen bei Cockpit</h2>
        <p>Ab jetzt startest du deine Programme, findest deine Dateien und gehst ins Internet – alles von hier aus.</p>
        <div class="ob-keys">
          <div><kbd>Strg + Alt + D</kbd><span>Zu Windows wechseln und zurück</span></div>
          <div><kbd>Strg + Alt + Q</kbd><span>Cockpit beenden</span></div>
          <div><kbd>Einfach tippen</kbd><span>Apps, Dateien und Einstellungen suchen</span></div>
          <div><kbd>Alt + Tab</kbd><span>Zwischen offenen Programmen wechseln</span></div>
        </div>
        <p class="muted small">Oben links unter „Windows“ findest du außerdem Sperren, Neustart, Herunterfahren und „Cockpit beenden“.</p>`;
    } else if (step === 1) {
      body = `
        <h2>Ein paar Kleinigkeiten</h2>
        <label class="ob-field"><span>Wie sollen wir dich nennen?</span><input class="input" id="ob-name" value="${esc(nameVal || state.settings.userName || state.env.systemUser || '')}" autocomplete="off"></label>
        <label class="ob-field"><span>Für welchen Ort möchtest du das Wetter sehen? <em class="muted">(optional)</em></span><input class="input" id="ob-city" value="${esc(cityVal)}" placeholder="z. B. Berlin" autocomplete="off"></label>`;
    } else {
      const sug = suggestions();
      body = `
        <h2>Deine Lieblings-Apps</h2>
        <p>Diese Apps heften wir an deine Startseite. Du kannst das später jederzeit ändern.</p>
        ${state.apps.length
          ? `<div class="ob-apps">${(sug.length ? sug : state.apps.slice(0, 18)).map((a) => `
            <button class="ob-app${picked.has(a.id) ? ' on' : ''}" data-ob-app="${esc(a.id)}">${C.appIcon(a, 'small')}<span>${esc(a.name)}</span>${icon('check', 'ob-check')}</button>`).join('')}</div>`
          : '<div class="empty"><span class="spin"></span> Apps werden eingelesen …</div>'}`;
    }
    el.innerHTML = `
      <div class="ob-card">
        ${body}
        <div class="ob-foot">
          <div class="ob-dots">${dots}</div>
          <div>
            ${step > 0 ? '<button class="btn" data-ob="back">Zurück</button>' : '<button class="btn ghost" data-ob="skip">Überspringen</button>'}
            <button class="btn primary" data-ob="next">${step === 2 ? 'Los geht’s' : 'Weiter'}</button>
          </div>
        </div>
      </div>`;
    C.hydrate(el);
    const first = $('input', el) || $('[data-ob="next"]', el);
    if (first) first.focus();
  }

  function readInputs() {
    const n = $('#ob-name');
    const c = $('#ob-city');
    if (n) nameVal = n.value.trim();
    if (c) cityVal = c.value.trim();
  }

  async function finish() {
    readInputs();
    const patch = { onboardingDone: true, favorites: [...picked] };
    if (nameVal) patch.userName = nameVal;
    close();
    if (cityVal) {
      const res = await api.geocode(cityVal).catch(() => null);
      if (res && res[0]) patch.weather = { city: cityVal, name: res[0].name, lat: res[0].lat, lon: res[0].lon };
      else C.toast('Wetter-Ort nicht gefunden – du kannst ihn auf der Startseite festlegen', { error: true });
    }
    await C.saveSettings(patch);
    if (nameVal) state.env.user = nameVal;
    C.setView('home');
  }

  function close() {
    if (el) { el.remove(); el = null; }
  }

  async function onClick(e) {
    const app = e.target.closest('[data-ob-app]');
    if (app) {
      const id = app.dataset.obApp;
      if (picked.has(id)) picked.delete(id); else picked.add(id);
      app.classList.toggle('on', picked.has(id));
      return;
    }
    const b = e.target.closest('[data-ob]');
    if (!b) return;
    readInputs();
    if (b.dataset.ob === 'next') {
      if (step === 2) { finish(); return; }
      step++;
      renderStep();
    } else if (b.dataset.ob === 'back') {
      step = Math.max(0, step - 1);
      renderStep();
    } else if (b.dataset.ob === 'skip') {
      close();
      await C.saveSettings({ onboardingDone: true });
    }
  }

  function start() {
    close();
    step = 0;
    nameVal = '';
    cityVal = (state.settings.weather && state.settings.weather.name) || '';
    picked = new Set(state.settings.favorites.length ? state.settings.favorites : suggestions().slice(0, 10).map((a) => a.id));
    el = document.createElement('div');
    el.className = 'onboarding';
    el.addEventListener('click', onClick);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); $('[data-ob="next"]', el).click(); }
    });
    document.body.appendChild(el);
    renderStep();
  }

  // Wenn die Apps erst während des Assistenten fertig werden
  C.on('apps', () => {
    if (!el) return;
    if (!picked.size) suggestions().slice(0, 10).forEach((a) => picked.add(a.id));
    if (step === 2) renderStep();
  });

  C.onboarding = { start, isOpen: () => !!el };
})();
