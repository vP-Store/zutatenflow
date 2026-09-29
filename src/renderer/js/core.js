'use strict';

// Gemeinsame Helfer, Zustand und UI-Bausteine. Alle anderen Skripte hängen sich an window.C.

(() => {
  const api = window.cockpit;
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  // ---------------------------------------------------------------- Icons

  const ICONS = {
    home: '<path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/><path d="M10 20v-6h4v6"/>',
    apps: '<rect x="4" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.5"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.5"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.5"/>',
    folder: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>',
    folderPlus: '<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M12 11v5M9.5 13.5h5"/>',
    globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3a14 14 0 0 1 0 18a14 14 0 0 1 0-18"/>',
    gear: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
    windows: '<path d="M9 14 4 9l5-5"/><path d="M4 9h11a5 5 0 0 1 0 10h-3"/>',
    chart: '<path d="M4 20V10"/><path d="M10 20V4"/><path d="M16 20v-7"/><path d="M22 20H2"/>',
    lock: '<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
    moon: '<path d="M20 14.5A8 8 0 1 1 9.5 4a6.5 6.5 0 0 0 10.5 10.5z"/>',
    sun: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
    logout: '<path d="M15 4h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2h-3"/><path d="M10 17l-5-5 5-5"/><path d="M5 12h11"/>',
    restart: '<path d="M3 12a9 9 0 1 0 3-6.7"/><path d="M3 4v5h5"/>',
    power: '<path d="M12 3v9"/><path d="M6.3 6.3a8 8 0 1 0 11.4 0"/>',
    close: '<path d="M6 6l12 12"/><path d="M18 6 6 18"/>',
    minus: '<path d="M5 12h14"/>',
    star: '<path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/>',
    starFill: '<path fill="currentColor" d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1.1 6.2L12 17.3 6.4 20.2l1.1-6.2L3 9.6l6.2-.9z"/>',
    pin: '<path d="M9 4h6l-1 6 3 3H7l3-3z"/><path d="M12 13v8"/>',
    up: '<path d="M12 19V5"/><path d="m5 12 7-7 7 7"/>',
    back: '<path d="M19 12H5"/><path d="m12 19-7-7 7-7"/>',
    forward: '<path d="M5 12h14"/><path d="m12 5 7 7-7 7"/>',
    drive: '<rect x="3" y="13" width="18" height="7" rx="2"/><path d="M5 13 7.5 5h9L19 13"/><path d="M17 16.5h.01"/>',
    doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/>',
    image: '<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>',
    video: '<rect x="3" y="5" width="13" height="14" rx="2"/><path d="m16 10 5-3v10l-5-3"/>',
    music: '<path d="M9 18V5l11-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="17" cy="16" r="3"/>',
    archive: '<rect x="3" y="4" width="18" height="5" rx="1"/><path d="M5 9v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V9"/><path d="M10 13h4"/>',
    program: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9h18"/><path d="m8 13 2 2-2 2M13 17h3"/>',
    code: '<path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/>',
    file: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/>',
    filePlus: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M12 11v6M9 14h6"/>',
    plus: '<path d="M12 5v14M5 12h14"/>',
    external: '<path d="M14 4h6v6"/><path d="M20 4 10 14"/><path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5"/>',
    refresh: '<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 4v5h-5"/>',
    search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>',
    cut: '<circle cx="6" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M8.1 8.1 20 20M8.1 15.9 20 4"/>',
    paste: '<rect x="6" y="4" width="12" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="M9 10h6M9 14h6"/>',
    rename: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
    trash: '<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/>',
    grid: '<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>',
    list: '<path d="M8 6h13M8 12h13M8 18h13"/><path d="M3 6h.01M3 12h.01M3 18h.01"/>',
    clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
    keyboard: '<rect x="2" y="6" width="20" height="12" rx="2"/><path d="M6 10h.01M10 10h.01M14 10h.01M18 10h.01M7 14h10"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
    shield: '<path d="M12 3 4 6v6c0 5 3.5 8 8 9 4.5-1 8-4 8-9V6z"/>',
    info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
    check: '<path d="m5 12 5 5 9-10"/>',
    wifi: '<path d="M2 8.5a15 15 0 0 1 20 0"/><path d="M5 12a10 10 0 0 1 14 0"/><path d="M8.5 15.5a5 5 0 0 1 7 0"/><path d="M12 19h.01"/>',
    bluetooth: '<path d="m7 7 10 10-5 4V3l5 4L7 17"/>',
    volume: '<path d="M4 9v6h4l5 4V5L8 9z"/><path d="M16 9a4 4 0 0 1 0 6M19 6a8 8 0 0 1 0 12"/>',
    display: '<rect x="3" y="4" width="18" height="12" rx="2"/><path d="M8 20h8M12 16v4"/>',
    battery: '<rect x="2" y="7" width="18" height="10" rx="2"/><path d="M22 11v2"/>',
    cpu: '<rect x="6" y="6" width="12" height="12" rx="2"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
    note: '<path d="M5 4h14v11l-5 5H5z"/><path d="M14 20v-5h5"/><path d="M8 9h8M8 13h5"/>',
    calendar: '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
    update: '<path d="M12 3v12"/><path d="m7 10 5 5 5-5"/><path d="M5 21h14"/>',
    palette: '<path d="M12 3a9 9 0 1 0 0 18c1 0 1.5-.8 1.5-1.5 0-1-.8-1.5-.8-2.5 0-1 .8-1.5 1.8-1.5H17a4 4 0 0 0 4-4c0-4.7-4-8.5-9-8.5z"/><circle cx="7.5" cy="11" r="1"/><circle cx="10" cy="7" r="1"/><circle cx="15" cy="7.5" r="1"/>',
    printer: '<path d="M6 9V3h12v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M6 14h12v7H6z"/>',
    mouse: '<rect x="6" y="3" width="12" height="18" rx="6"/><path d="M12 7v4"/>',
    bell: '<path d="M6 16V11a6 6 0 0 1 12 0v5l2 2H4z"/><path d="M10 21h4"/>',
    rocket: '<path d="M5 15c-1 1-1.5 4-1.5 4s3-.5 4-1.5"/><path d="M14 4c3 0 6 3 6 6l-7 7-6-6z"/><path d="m9 13-3-1 2-4h4"/><path d="m11 15 1 3 4-2v-4"/>',
    calc: '<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M8 7h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15h.01M8 18h.01M12 18h4"/>',
    network: '<rect x="9" y="3" width="6" height="5" rx="1"/><rect x="3" y="16" width="6" height="5" rx="1"/><rect x="15" y="16" width="6" height="5" rx="1"/><path d="M12 8v4M6 16v-4h12v4"/>',
    storage: '<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v6c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6"/>',
    eye: '<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',
    wind: '<path d="M3 8h11a3 3 0 1 0-3-3"/><path d="M3 12h15a3 3 0 1 1-3 3"/><path d="M3 16h7"/>',
    drop: '<path d="M12 3s6 7 6 11a6 6 0 0 1-12 0c0-4 6-11 6-11z"/>',
  };

  const icon = (name, cls = '') => `<svg class="i ${cls}" viewBox="0 0 24 24" aria-hidden="true">${ICONS[name] || ICONS.file}</svg>`;

  const CAT_META = {
    ordner: { label: 'Ordner', icon: 'folder' },
    dokumente: { label: 'Dokumente', icon: 'doc' },
    bilder: { label: 'Bilder', icon: 'image' },
    videos: { label: 'Videos', icon: 'video' },
    musik: { label: 'Musik', icon: 'music' },
    archive: { label: 'Archive', icon: 'archive' },
    programme: { label: 'Programme', icon: 'program' },
    web: { label: 'Web & Code', icon: 'code' },
    sonstiges: { label: 'Sonstiges', icon: 'file' },
  };
  const CAT_ORDER = ['dokumente', 'bilder', 'videos', 'musik', 'archive', 'programme', 'web', 'sonstiges'];

  // ---------------------------------------------------------------- Formatierung

  const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  function fmtSize(b) {
    if (!b) return '–';
    const u = ['B', 'KB', 'MB', 'GB', 'TB'];
    let i = 0;
    while (b >= 1024 && i < u.length - 1) { b /= 1024; i++; }
    return `${b.toLocaleString('de-DE', { maximumFractionDigits: b < 10 && i > 0 ? 1 : 0 })} ${u[i]}`;
  }

  function fmtDate(ms, withTime = true) {
    if (!ms) return '';
    const d = new Date(ms);
    const now = new Date();
    const t = d.toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
    const dayDiff = Math.floor((new Date(now.toDateString()) - new Date(d.toDateString())) / 86400000);
    if (dayDiff === 0) return withTime ? `Heute, ${t}` : 'Heute';
    if (dayDiff === 1) return withTime ? `Gestern, ${t}` : 'Gestern';
    return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }

  function fmtDuration(sec) {
    const d = Math.floor(sec / 86400);
    const h = Math.floor((sec % 86400) / 3600);
    const m = Math.floor((sec % 3600) / 60);
    if (d) return `${d} T ${h} Std`;
    if (h) return `${h} Std ${m} Min`;
    return `${m} Min`;
  }

  function hashHue(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
    return h % 360;
  }

  function letterBg(name) {
    const h = hashHue(name || '?');
    return `background:linear-gradient(135deg,hsl(${h} 68% 58%),hsl(${(h + 40) % 360} 68% 44%))`;
  }

  function fileUrl(p) {
    const norm = p.replace(/\\/g, '/');
    const parts = norm.split('/').map((seg, i) => (i === 0 && /^[A-Za-z]:$/.test(seg) ? seg : encodeURIComponent(seg)));
    const joined = parts.join('/');
    return joined.startsWith('/') ? `file://${joined}` : `file:///${joined}`;
  }

  function lsGet(key, fallback) {
    try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch { return fallback; }
  }
  function lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch { /* ignore */ }
  }

  function looksLikeUrl(q) {
    return /^(https?:\/\/)?(localhost|[\w-]+(\.[\w-]+)+)(:\d+)?(\/\S*)?$/i.test(q) && !/\s/.test(q);
  }
  function normalizeUrl(q) {
    return /^https?:\/\//i.test(q) ? q : `https://${q}`;
  }

  function debounce(fn, ms) {
    let t = null;
    return (...a) => { clearTimeout(t); t = setTimeout(() => fn(...a), ms); };
  }

  // ---------------------------------------------------------------- Toast

  let toastTimer = null;
  function toast(msg, opts = {}) {
    const t = $('#toast');
    t.innerHTML = `${opts.error ? icon('info') : ''}<span>${esc(msg)}</span>${opts.action ? `<button class="toast-action">${esc(opts.action.label)}</button>` : ''}`;
    t.className = `toast${opts.error ? ' error' : ''}`;
    t.hidden = false;
    if (opts.action) $('.toast-action', t).onclick = () => { t.hidden = true; opts.action.run(); };
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => { t.hidden = true; }, opts.duration || (opts.action ? 6000 : 2800));
  }

  function errText(err) {
    const m = err && err.message ? err.message : String(err || '');
    return m.replace(/^Error invoking remote method '[^']+': (Error: )?/, '');
  }

  async function safe(fn, errMsg) {
    try { return await fn(); } catch (err) {
      console.error(err);
      toast(`${errMsg}${errText(err) ? ` – ${errText(err)}` : ''}`, { error: true });
      return null;
    }
  }

  // ---------------------------------------------------------------- Modale Dialoge

  function modal({ title, body = '', value = null, okLabel = 'OK', cancelLabel = 'Abbrechen', danger = false, selectBase = false }) {
    return new Promise((resolve) => {
      const wrap = document.createElement('div');
      wrap.className = 'modal-wrap';
      wrap.innerHTML = `
        <form class="modal" role="dialog" aria-modal="true">
          <h3>${esc(title)}</h3>
          ${body ? `<p>${body}</p>` : ''}
          ${value !== null ? `<input class="input" name="v" value="${esc(value)}" autocomplete="off" spellcheck="false">` : ''}
          <div class="modal-actions">
            <button type="button" class="btn" data-cancel>${esc(cancelLabel)}</button>
            <button type="submit" class="btn ${danger ? 'danger' : 'primary'}">${esc(okLabel)}</button>
          </div>
        </form>`;
      document.body.appendChild(wrap);
      const form = $('form', wrap);
      const input = $('input', wrap);
      const done = (v) => { wrap.remove(); resolve(v); };
      form.addEventListener('submit', (e) => { e.preventDefault(); done(input ? input.value : true); });
      $('[data-cancel]', wrap).addEventListener('click', () => done(null));
      wrap.addEventListener('mousedown', (e) => { if (e.target === wrap) done(null); });
      wrap.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); done(null); } });
      if (input) {
        input.focus();
        const dot = input.value.lastIndexOf('.');
        if (selectBase && dot > 0) input.setSelectionRange(0, dot); else input.select();
      } else {
        $('button[type=submit]', wrap).focus();
      }
    });
  }

  const prompt = (title, value, opts = {}) => modal({ title, value: value ?? '', okLabel: 'Speichern', ...opts });
  const confirm = (title, body, opts = {}) => modal({ title, body, okLabel: 'Ja', ...opts });

  // ---------------------------------------------------------------- Kontextmenü

  let ctxEl = null;
  function closeCtx() { if (ctxEl) { ctxEl.remove(); ctxEl = null; } }

  function ctxMenu(x, y, items) {
    closeCtx();
    ctxEl = document.createElement('div');
    ctxEl.className = 'ctx-menu';
    ctxEl.setAttribute('role', 'menu');
    const runs = [];
    ctxEl.innerHTML = items.filter(Boolean).map((it) => {
      if (it === 'sep') return '<hr>';
      runs.push(it.run);
      return `<button role="menuitem" data-i="${runs.length - 1}" class="${it.danger ? 'danger' : ''}"${it.disabled ? ' disabled' : ''}>${icon(it.icon || 'file')}<span>${esc(it.label)}</span>${it.hint ? `<kbd>${esc(it.hint)}</kbd>` : ''}</button>`;
    }).join('');
    document.body.appendChild(ctxEl);
    const r = ctxEl.getBoundingClientRect();
    ctxEl.style.left = `${Math.max(8, Math.min(x, innerWidth - r.width - 8))}px`;
    ctxEl.style.top = `${Math.max(8, Math.min(y, innerHeight - r.height - 8))}px`;
    ctxEl.addEventListener('click', (e) => {
      const b = e.target.closest('[data-i]');
      if (!b) return;
      const run = runs[Number(b.dataset.i)];
      closeCtx();
      if (run) run();
    });
    const first = ctxEl.querySelector('button:not([disabled])');
    if (first) first.focus();
    ctxEl.addEventListener('keydown', (e) => {
      const btns = $$('button:not([disabled])', ctxEl);
      const i = btns.indexOf(document.activeElement);
      if (e.key === 'ArrowDown') { e.preventDefault(); btns[(i + 1) % btns.length].focus(); }
      if (e.key === 'ArrowUp') { e.preventDefault(); btns[(i - 1 + btns.length) % btns.length].focus(); }
      if (e.key === 'Escape') closeCtx();
    });
  }

  // ---------------------------------------------------------------- Icons & Vorschaubilder (lazy)

  const iconObserver = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target;
      iconObserver.unobserve(el);
      const p = el.getAttribute('data-iconpath');
      api.getIcon(p).then((url) => {
        if (url) { el.innerHTML = `<img src="${url}" alt="" draggable="false">`; el.classList.add('has-img'); }
      }).catch(() => {});
    }
  }, { rootMargin: '200px' });

  const thumbObserver = new IntersectionObserver((entries) => {
    for (const e of entries) {
      if (!e.isIntersecting) continue;
      const el = e.target;
      thumbObserver.unobserve(el);
      const p = el.getAttribute('data-thumb');
      const isImg = el.getAttribute('data-cat') === 'bilder';
      const show = (src) => { el.style.backgroundImage = `url("${src.replace(/"/g, '%22')}")`; el.classList.add('loaded'); };
      api.thumbnail(p, 256).then((url) => {
        if (url) { show(url); return; }
        if (!isImg) return;
        // Ohne Windows-Vorschaubild: Bild direkt laden, aber nur anzeigen, wenn es klappt
        const img = new Image();
        img.onload = () => show(img.src);
        img.src = fileUrl(p);
      }).catch(() => {});
    }
  }, { rootMargin: '300px' });

  function hydrate(root = document) {
    $$('[data-iconpath]:not([data-h])', root).forEach((el) => { el.setAttribute('data-h', '1'); iconObserver.observe(el); });
    $$('[data-thumb]:not([data-h])', root).forEach((el) => { el.setAttribute('data-h', '1'); thumbObserver.observe(el); });
  }

  function appIcon(app, size = '') {
    const letter = esc(((app.name || '?').match(/[A-Za-zÄÖÜäöü0-9]/) || ['?'])[0].toUpperCase());
    const p = app.path || app.iconPath || '';
    return `<span class="app-icon ${size}" style="${letterBg(app.name)}"${p ? ` data-iconpath="${esc(p)}"` : ''}>${letter}</span>`;
  }

  function fileIcon(entry, size = '') {
    if (entry.isDir) return `<span class="ficon ordner ${size}">${icon('folder')}</span>`;
    const cat = entry.cat || 'sonstiges';
    const ext = (entry.ext || '').slice(0, 4);
    return `<span class="ficon ${cat} ${size}">${ext ? esc(ext) : icon(CAT_META[cat].icon)}</span>`;
  }

  // ---------------------------------------------------------------- Zustand & Ereignisse

  const listeners = {};
  const state = {
    view: 'home',
    env: {},
    settings: { favorites: [], websites: [], launchCounts: {}, lastLaunched: {}, pinnedFolders: [], searchEngine: 'https://www.google.com/search?q=' },
    apps: [],
    appsById: new Map(),
    drives: [],
    quick: [],
    index: null,
    windows: [],
    update: null,
  };

  const C = {
    api, $, $$, ICONS, icon, CAT_META, CAT_ORDER,
    esc, fmtSize, fmtDate, fmtDuration, letterBg, fileUrl, lsGet, lsSet, looksLikeUrl, normalizeUrl, debounce,
    toast, safe, errText, modal, prompt, confirm, ctxMenu, closeCtx, hydrate, appIcon, fileIcon,
    state,
    views: {},
    on(evt, fn) { (listeners[evt] = listeners[evt] || []).push(fn); },
    emit(evt, payload) { (listeners[evt] || []).forEach((fn) => { try { fn(payload); } catch (err) { console.error(err); } }); },
  };

  // ---------------------------------------------------------------- Apps (gemeinsam genutzt)

  C.setApps = (list) => {
    state.apps = list || [];
    state.appsById = new Map(state.apps.map((a) => [a.id, a]));
    C.emit('apps');
  };

  C.loadApps = async (force = false) => {
    const list = await safe(() => api.listApps(force), 'Apps konnten nicht geladen werden');
    C.setApps(list);
  };

  C.launchApp = async (id) => {
    const a = state.appsById.get(id);
    if (!a) return;
    toast(`${a.name} wird gestartet …`);
    const ok = await safe(() => api.launchApp(id), `${a.name} konnte nicht gestartet werden`);
    if (ok !== null) {
      const s = state.settings;
      s.launchCounts = { ...s.launchCounts, [id]: (s.launchCounts[id] || 0) + 1 };
      s.lastLaunched = { ...s.lastLaunched, [id]: Date.now() };
      setTimeout(() => C.emit('windows:refresh'), 1500);
    }
  };

  C.usage = (id) => {
    const s = state.settings;
    const count = (s.launchCounts && s.launchCounts[id]) || 0;
    const last = (s.lastLaunched && s.lastLaunched[id]) || 0;
    const ageDays = last ? (Date.now() - last) / 86400000 : 999;
    return count * 10 + (ageDays < 1 ? 30 : ageDays < 7 ? 15 : 0);
  };

  C.saveSettings = async (patch) => {
    const s = await safe(() => api.setSettings(patch), 'Einstellung konnte nicht gespeichert werden');
    if (s) state.settings = s;
    C.emit('settings', patch);
    return state.settings;
  };

  C.togglePin = async (id) => {
    const favs = [...state.settings.favorites];
    const i = favs.indexOf(id);
    if (i >= 0) favs.splice(i, 1); else favs.push(id);
    await C.saveSettings({ favorites: favs });
    toast(i >= 0 ? 'Von der Startseite gelöst' : 'An die Startseite angeheftet');
  };

  C.appMenu = (id, x, y) => {
    const a = state.appsById.get(id);
    if (!a) return;
    const pinned = state.settings.favorites.includes(id);
    ctxMenu(x, y, [
      { label: 'Öffnen', icon: 'external', run: () => C.launchApp(id) },
      (a.launch.type === 'path' || a.launch.type === 'exec') && state.env.platform === 'win32'
        ? { label: 'Als Administrator ausführen', icon: 'shield', run: () => safe(() => api.launchAsAdmin(id), 'Start fehlgeschlagen') } : null,
      { label: pinned ? 'Von Start lösen' : 'An Start anheften', icon: pinned ? 'star' : 'starFill', run: () => C.togglePin(id) },
      a.path ? { label: 'Dateispeicherort öffnen', icon: 'folder', run: () => api.revealApp(id) } : null,
      'sep',
      { label: 'Deinstallieren …', icon: 'trash', run: () => api.openSettingsPage('ms-settings:appsfeatures') },
    ]);
  };

  C.openFile = (p) => safe(() => api.openPath(p), 'Datei konnte nicht geöffnet werden');

  C.openWebQuery = (q) => {
    const url = looksLikeUrl(q) ? normalizeUrl(q) : state.settings.searchEngine + encodeURIComponent(q);
    return safe(() => api.openWeb(url), 'Browser konnte nicht geöffnet werden');
  };

  window.C = C;
})();
