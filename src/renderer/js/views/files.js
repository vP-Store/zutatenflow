'use strict';

// Dateimanager: Ordner, Laufwerke, Dateien nach Typ, Vorschau und Dateioperationen.

(() => {
  const { $, $$, api, esc, icon, state, CAT_META, CAT_ORDER } = C;

  const fs = {
    mode: 'dir', // 'dir' | 'cat'
    dir: null,
    cat: null,
    sort: 'name',
    filter: '',
    view: C.lsGet('filesView', 'list'),
    listing: null,
    catData: null,
    history: [],
    forward: [],
    loading: false,
    items: [], // aktuell sichtbare Einträge
    selected: new Set(),
    anchor: -1,
    clipboard: null, // { mode: 'copy' | 'cut', paths: [] }
  };
  const LIMIT = 800;
  const THUMB_CATS = new Set(['bilder', 'videos']);

  // ---------------------------------------------------------------- Navigation

  async function openDir(p, { push = true, keepSel = false } = {}) {
    if (push && fs.mode === 'dir' && fs.dir && fs.dir !== p) { fs.history.push(fs.dir); fs.forward = []; }
    if (push && fs.mode === 'cat') fs.forward = [];
    fs.mode = 'dir';
    fs.dir = p;
    fs.filter = '';
    if (!keepSel) { fs.selected.clear(); fs.anchor = -1; }
    fs.loading = !keepSel;
    if (state.view !== 'files') C.setView('files'); else render($('#view'));
    const listing = await C.safe(() => api.listDir(p, fs.sort), 'Ordner konnte nicht geöffnet werden');
    if (fs.dir !== p) return;
    fs.loading = false;
    if (listing) fs.listing = listing;
    else if (fs.history.length) { fs.dir = fs.history.pop(); }
    if (state.view === 'files') render($('#view'));
  }
  C.openDir = (p) => openDir(p);

  async function openCategory(cat) {
    fs.mode = 'cat';
    fs.cat = cat;
    fs.filter = '';
    fs.selected.clear();
    if (fs.sort === 'name') fs.sort = 'mtime';
    fs.loading = true;
    render($('#view'));
    fs.catData = await C.safe(() => api.filesByCategory(cat, fs.sort), 'Dateien konnten nicht geladen werden');
    fs.loading = false;
    if (state.view === 'files' && fs.mode === 'cat') render($('#view'));
  }

  function reload() {
    if (fs.mode === 'dir' && fs.dir) return openDir(fs.dir, { push: false, keepSel: true });
    if (fs.mode === 'cat') return openCategory(fs.cat);
    return null;
  }

  function goBack() {
    if (!fs.history.length) return;
    fs.forward.push(fs.dir);
    openDir(fs.history.pop(), { push: false });
  }
  function goForward() {
    if (!fs.forward.length) return;
    fs.history.push(fs.dir);
    openDir(fs.forward.pop(), { push: false });
  }
  function goUp() {
    if (fs.mode === 'dir' && fs.listing && fs.listing.parent) openDir(fs.listing.parent);
  }

  // ---------------------------------------------------------------- Rendering

  function crumbs(p) {
    const winPath = p.includes('\\');
    const parts = p.split(winPath ? '\\' : '/').filter(Boolean);
    const out = [];
    if (!winPath) {
      out.push({ label: '/', path: '/' });
      let acc = '';
      for (const part of parts) { acc += `/${part}`; out.push({ label: part, path: acc }); }
    } else {
      let acc = '';
      parts.forEach((part, i) => {
        acc = i === 0 ? `${part}\\` : `${acc}${acc.endsWith('\\') ? '' : '\\'}${part}`;
        out.push({ label: part, path: acc });
      });
    }
    return out;
  }

  function sideHtml() {
    const counts = (state.index && state.index.counts) || {};
    const indexing = state.index && state.index.running;
    const active = (p) => (fs.mode === 'dir' && fs.dir === p ? ' active' : '');
    const qIcon = { pictures: 'image', music: 'music', videos: 'video', home: 'user', documents: 'doc', downloads: 'update', onedrive: 'cloud' };
    const pinned = state.settings.pinnedFolders || [];
    return `
      <div class="fs-head">Schnellzugriff</div>
      ${state.quick.map((q) => `<button data-dir="${esc(q.path)}" class="${active(q.path)}">${icon(qIcon[q.id] || 'folder')}${esc(q.name)}</button>`).join('')}
      ${pinned.length ? `<div class="fs-head">Angeheftet</div>${pinned.map((f) => `<button data-dir="${esc(f.path)}" class="${active(f.path)}" data-pinned="${esc(f.path)}">${icon('pin')}${esc(f.name)}</button>`).join('')}` : ''}
      <div class="fs-head">Laufwerke</div>
      ${state.drives.map((d) => `<button data-dir="${esc(d.path)}" class="${active(d.path)}">${icon('drive')}<span class="lbl">${d.letter === '/' ? 'System' : `Laufwerk ${esc(d.letter)}:`}</span><span class="count">${d.total ? `${C.fmtSize(d.free)} frei` : ''}</span></button>`).join('')}
      <div class="fs-head">Nach Typ ${indexing ? `<span class="spin" title="Dateien werden durchsucht … ${state.index.progress || ''}"></span>` : ''}</div>
      ${CAT_ORDER.map((c) => `<button data-cat="${c}" class="${fs.mode === 'cat' && fs.cat === c ? 'active' : ''}">${icon(CAT_META[c].icon)}${CAT_META[c].label}<span class="count">${counts[c] ? counts[c].toLocaleString('de-DE') : ''}</span></button>`).join('')}`;
  }

  function toolbarHtml() {
    const sortSel = `<select class="input" id="files-sort" title="Sortieren">
      ${[['name', 'Name'], ['mtime', 'Datum'], ['size', 'Größe'], ['type', 'Typ']].map(([v, l]) => `<option value="${v}"${fs.sort === v ? ' selected' : ''}>Sortieren: ${l}</option>`).join('')}
    </select>`;
    const viewToggle = `<div class="seg"><button class="${fs.view === 'list' ? 'on' : ''}" data-fview="list" title="Liste">${icon('list')}</button><button class="${fs.view === 'grid' ? 'on' : ''}" data-fview="grid" title="Kacheln">${icon('grid')}</button></div>`;
    if (fs.mode === 'dir') {
      return `
        <button class="icon-btn" data-fact="back" title="Zurück (Alt+←)"${fs.history.length ? '' : ' disabled'}>${icon('back')}</button>
        <button class="icon-btn" data-fact="forward" title="Vor (Alt+→)"${fs.forward.length ? '' : ' disabled'}>${icon('forward')}</button>
        <button class="icon-btn" data-fact="up" title="Übergeordneter Ordner (Rücktaste)"${fs.listing && fs.listing.parent ? '' : ' disabled'}>${icon('up')}</button>
        <div class="crumbs">${fs.dir ? crumbs(fs.dir).map((c, i) => `${i ? '<span class="sep">›</span>' : ''}<button data-dir="${esc(c.path)}">${esc(c.label)}</button>`).join('') : ''}</div>
        <input class="input files-filter" id="files-filter" placeholder="In diesem Ordner filtern …" value="${esc(fs.filter)}">
        ${sortSel}${viewToggle}
        <button class="icon-btn" data-fact="newfolder" title="Neuer Ordner (Strg+Umschalt+N)">${icon('folderPlus')}</button>
        <button class="icon-btn" data-fact="paste" title="Einfügen (Strg+V)"${fs.clipboard ? '' : ' disabled'}>${icon('paste')}</button>
        <button class="icon-btn" data-fact="explorer" title="Im Windows-Explorer öffnen">${icon('external')}</button>`;
    }
    return `
      <div class="crumbs"><button>${icon(CAT_META[fs.cat].icon)}&nbsp;${CAT_META[fs.cat].label}</button>${fs.catData ? `<span class="muted small">&nbsp;${fs.catData.total.toLocaleString('de-DE')} Dateien</span>` : ''}</div>
      <input class="input files-filter" id="files-filter" placeholder="Filtern …" value="${esc(fs.filter)}">
      ${sortSel}${viewToggle}`;
  }

  function computeItems() {
    let items = [];
    if (fs.mode === 'dir') items = fs.listing && fs.listing.path === fs.dir ? fs.listing.entries : [];
    else items = fs.catData ? fs.catData.items : [];
    const q = fs.filter.trim().toLowerCase();
    if (q) items = items.filter((e) => e.name.toLowerCase().includes(q));
    fs.items = items;
    return items;
  }

  function listHtml() {
    if (fs.loading) return '<div class="fl-empty"><span class="spin"></span> Wird geladen …</div>';
    const items = computeItems();
    if (fs.mode === 'cat' && (!fs.catData || (!fs.catData.total && state.index && state.index.running))) {
      return '<div class="fl-empty"><span class="spin"></span> Deine Dateien werden gerade durchsucht – beim ersten Start kann das ein paar Minuten dauern.</div>';
    }
    if (!items.length) return `<div class="fl-empty">${fs.filter ? 'Nichts gefunden.' : fs.mode === 'dir' ? 'Dieser Ordner ist leer.' : 'Keine Dateien dieser Art gefunden.'}</div>`;

    const shown = items.slice(0, LIMIT);
    const total = fs.mode === 'cat' && !fs.filter ? fs.catData.total : items.length;
    const more = total - shown.length;
    const moreHtml = more > 0 ? `<div class="fl-more">+ ${more.toLocaleString('de-DE')} weitere – nutze den Filter oder die Suche oben.</div>` : '';
    const sel = (e) => (fs.selected.has(e.path) ? ' selected' : '');
    const cut = (e) => (fs.clipboard && fs.clipboard.mode === 'cut' && fs.clipboard.paths.includes(e.path) ? ' cut' : '');

    if (fs.view === 'grid') {
      return `<div class="thumb-grid">${shown.map((e, i) => `
        <button class="thumb${sel(e)}${cut(e)}" data-idx="${i}" title="${esc(e.path)}">
          ${!e.isDir && (THUMB_CATS.has(e.cat) || e.ext === 'pdf') ? `<span class="ti" data-thumb="${esc(e.path)}" data-cat="${e.cat}">${C.fileIcon(e, 'big')}</span>` : `<span class="ti icon-only">${C.fileIcon(e, 'big')}</span>`}
          <span class="tn">${esc(e.name)}</span>
        </button>`).join('')}</div>${moreHtml}`;
    }

    const sortBtn = (key, label) => `<button data-sort="${key}" class="${fs.sort === key ? 'sorted' : ''}">${label}${fs.sort === key ? ' ↓' : ''}</button>`;
    return `
      <div class="fl-row head"><span></span>${sortBtn('name', 'Name')}${sortBtn('mtime', 'Geändert')}${sortBtn('size', 'Größe')}${sortBtn('type', 'Typ')}</div>
      ${shown.map((e, i) => `
        <button class="fl-row${sel(e)}${cut(e)}" data-idx="${i}" title="${esc(e.path)}">
          ${C.fileIcon(e)}
          <span class="fl-namebox"><div class="fl-name">${esc(e.name)}</div>${fs.mode === 'cat' ? `<div class="fl-path">${esc(e.path)}</div>` : ''}</span>
          <span class="fl-meta">${esc(C.fmtDate(e.mtime))}</span>
          <span class="fl-meta">${e.isDir ? '' : C.fmtSize(e.size)}</span>
          <span class="fl-meta">${e.isDir ? 'Ordner' : esc((e.ext || '').toUpperCase() || 'Datei')}</span>
        </button>`).join('')}
      ${moreHtml}`;
  }

  function render(el) {
    if (!el) return;
    if (fs.mode === 'dir' && !fs.dir) {
      const start = state.quick[0] ? state.quick[0].path : (state.drives[0] && state.drives[0].path);
      if (start) { openDir(start, { push: false }); return; }
    }
    el.innerHTML = `
      <div class="files-layout">
        <aside class="files-side" id="files-side">${sideHtml()}</aside>
        <section class="files-main">
          <div class="files-toolbar">${toolbarHtml()}</div>
          <div class="file-list" id="file-list" tabindex="0">${listHtml()}</div>
          <div class="statusbar" id="files-status"></div>
        </section>
        <aside class="preview" id="preview"></aside>
      </div>`;
    C.hydrate(el);
    renderPreview();
    const cr = $('.crumbs', el);
    if (cr) cr.scrollLeft = cr.scrollWidth;

    const filt = $('#files-filter');
    filt.addEventListener('input', () => { fs.filter = filt.value; fs.selected.clear(); refreshList(); });
    filt.addEventListener('keydown', (e) => { if (e.key === 'ArrowDown') { e.preventDefault(); $('#file-list').focus(); stepSel(1, false); } });
    $('#files-sort').addEventListener('change', (e) => { fs.sort = e.target.value; reload(); });
  }

  function refreshList() {
    const list = $('#file-list');
    if (!list) return;
    list.innerHTML = listHtml();
    C.hydrate(list);
    renderPreview();
  }

  function refreshSelection() {
    $$('#file-list [data-idx]').forEach((el) => {
      const e = fs.items[Number(el.dataset.idx)];
      el.classList.toggle('selected', !!e && fs.selected.has(e.path));
    });
    renderPreview();
  }

  // ---------------------------------------------------------------- Vorschau

  let previewSeq = 0;

  async function renderPreview() {
    const pv = $('#preview');
    const status = $('#files-status');
    if (!pv) return;
    const sel = fs.items.filter((e) => fs.selected.has(e.path));
    if (status) {
      const folders = fs.items.filter((e) => e.isDir).length;
      status.textContent = sel.length
        ? `${sel.length} ausgewählt${sel.some((e) => !e.isDir) ? ` · ${C.fmtSize(sel.reduce((s, e) => s + (e.size || 0), 0))}` : ''}`
        : `${fs.items.length.toLocaleString('de-DE')} Elemente${fs.mode === 'dir' && folders ? ` · ${folders} Ordner` : ''}${fs.clipboard ? ` · ${fs.clipboard.paths.length} in der Zwischenablage (${fs.clipboard.mode === 'cut' ? 'ausgeschnitten' : 'kopiert'})` : ''}`;
    }
    const my = ++previewSeq;
    if (sel.length !== 1) {
      pv.innerHTML = sel.length > 1
        ? `<div class="pv-empty">${icon('copy', 'big')}<b>${sel.length} Elemente ausgewählt</b><div class="pv-actions">
            <button class="btn small" data-fact="copy">${icon('copy')} Kopieren</button>
            <button class="btn small" data-fact="cut">${icon('cut')} Ausschneiden</button>
            <button class="btn small danger" data-fact="trash">${icon('trash')} Löschen</button></div></div>`
        : `<div class="pv-empty">${icon('eye', 'big')}<span>Klick auf eine Datei zeigt hier die Vorschau.<br>Doppelklick öffnet sie.</span></div>`;
      return;
    }
    const e = sel[0];
    const url = C.fileUrl(e.path);
    let media = '';
    if (e.isDir) media = `<div class="pv-media icon">${C.fileIcon(e, 'huge')}</div>`;
    else if (e.cat === 'bilder' && e.ext !== 'psd') media = `<div class="pv-media"><img src="${esc(url)}" alt="" data-pv-fallback></div>`;
    else if (e.cat === 'videos') media = `<div class="pv-media"><video src="${esc(url)}" controls preload="metadata"></video></div>`;
    else if (e.cat === 'musik') media = `<div class="pv-media icon">${C.fileIcon(e, 'huge')}</div><audio src="${esc(url)}" controls preload="none"></audio>`;
    else if (e.ext === 'pdf') media = `<div class="pv-media pdf"><iframe src="${esc(url)}#toolbar=0&navpanes=0" title="PDF-Vorschau"></iframe></div>`;
    else media = `<div class="pv-media" id="pv-slot"><span class="ti big" data-thumb="${esc(e.path)}" data-cat="${e.cat}">${C.fileIcon(e, 'huge')}</span></div>`;

    pv.innerHTML = `
      ${media}
      <div class="pv-name">${esc(e.name)}</div>
      <div class="pv-meta">
        <span>Typ</span><b>${e.isDir ? 'Ordner' : esc((e.ext || 'Datei').toUpperCase())}</b>
        ${e.isDir ? '' : `<span>Größe</span><b>${C.fmtSize(e.size)}</b>`}
        <span>Geändert</span><b>${esc(new Date(e.mtime).toLocaleString('de-DE', { dateStyle: 'medium', timeStyle: 'short' }))}</b>
        <span>Ort</span><b class="pv-path">${esc(e.path)}</b>
      </div>
      <div class="pv-actions">
        <button class="btn small primary" data-fact="open">${icon('external')} Öffnen</button>
        <button class="btn small" data-fact="reveal">${icon('folder')} Im Explorer</button>
        <button class="btn small" data-fact="rename">${icon('rename')} Umbenennen</button>
        <button class="btn small danger" data-fact="trash">${icon('trash')} Löschen</button>
      </div>
      <div id="pv-text"></div>`;
    C.hydrate(pv);
    const img = $('img[data-pv-fallback]', pv);
    if (img) img.addEventListener('error', () => { img.replaceWith(Object.assign(document.createElement('div'), { innerHTML: C.fileIcon(e, 'huge') })); }, { once: true });

    if (!e.isDir && (e.cat === 'dokumente' || e.cat === 'web' || e.cat === 'sonstiges' || e.cat === 'programme') && e.ext !== 'pdf') {
      const text = await api.previewText(e.path).catch(() => null);
      if (my !== previewSeq || !text) return;
      const box = $('#pv-text');
      if (box) {
        box.innerHTML = `<pre class="pv-pre">${esc(text.slice(0, 6000))}${text.length > 6000 ? '\n…' : ''}</pre>`;
        const slot = $('#pv-slot');
        if (slot && !$('.ti.loaded', slot)) slot.remove();
      }
    }
  }

  // ---------------------------------------------------------------- Auswahl

  function selectIdx(i, { ctrl = false, shift = false } = {}) {
    const e = fs.items[i];
    if (!e) return;
    if (shift && fs.anchor >= 0) {
      const [a, b] = [Math.min(fs.anchor, i), Math.max(fs.anchor, i)];
      if (!ctrl) fs.selected.clear();
      for (let k = a; k <= b; k++) fs.selected.add(fs.items[k].path);
    } else if (ctrl) {
      if (fs.selected.has(e.path)) fs.selected.delete(e.path); else fs.selected.add(e.path);
      fs.anchor = i;
    } else {
      fs.selected.clear();
      fs.selected.add(e.path);
      fs.anchor = i;
    }
    refreshSelection();
    const el = $(`#file-list [data-idx="${i}"]`);
    if (el) el.scrollIntoView({ block: 'nearest' });
  }

  function currentIdx() {
    if (fs.anchor >= 0 && fs.items[fs.anchor] && fs.selected.has(fs.items[fs.anchor].path)) return fs.anchor;
    return fs.items.findIndex((e) => fs.selected.has(e.path));
  }

  function selectedEntries() {
    return fs.items.filter((e) => fs.selected.has(e.path));
  }

  // ---------------------------------------------------------------- Aktionen

  function openEntry(e) {
    if (!e) return;
    if (e.isDir) openDir(e.path); else C.openFile(e.path);
  }

  async function renameEntry(e) {
    if (!e) return;
    const name = await C.prompt('Umbenennen', e.name, { okLabel: 'Umbenennen', selectBase: !e.isDir });
    if (!name || name === e.name) return;
    const target = await C.safe(() => api.rename(e.path, name), 'Umbenennen fehlgeschlagen');
    if (target) {
      fs.selected.clear();
      fs.selected.add(target);
      await reload();
    }
  }

  async function trashEntries(list) {
    if (!list.length) return;
    const what = list.length === 1 ? `„${list[0].name}“` : `${list.length} Elemente`;
    const ok = await C.confirm(`${what} in den Papierkorb verschieben?`, 'Du kannst es später aus dem Papierkorb wiederherstellen.', { okLabel: 'In den Papierkorb', danger: true });
    if (!ok) return;
    const r = await C.safe(() => api.trash(list.map((e) => e.path)), 'Löschen fehlgeschlagen');
    if (r) {
      C.toast(`${what} gelöscht`, { action: { label: 'Papierkorb öffnen', run: () => api.systemAction('recycle') } });
      fs.selected.clear();
      reload();
    }
  }

  function setClipboard(mode) {
    const list = selectedEntries();
    if (!list.length) return;
    fs.clipboard = { mode, paths: list.map((e) => e.path) };
    C.toast(`${list.length} ${list.length === 1 ? 'Element' : 'Elemente'} ${mode === 'cut' ? 'ausgeschnitten' : 'kopiert'}`);
    const btn = $('[data-fact="paste"]');
    if (btn) btn.disabled = false;
    refreshList();
  }

  async function pasteHere(targetDir) {
    const dest = targetDir || (fs.mode === 'dir' ? fs.dir : null);
    if (!fs.clipboard || !dest) return;
    const { mode, paths } = fs.clipboard;
    C.toast(`${paths.length} ${paths.length === 1 ? 'Element wird' : 'Elemente werden'} ${mode === 'cut' ? 'verschoben' : 'kopiert'} …`, { duration: 60000 });
    const res = await C.safe(() => api.paste(paths, dest, mode), 'Einfügen fehlgeschlagen');
    if (res) {
      C.toast(mode === 'cut' ? 'Verschoben' : 'Kopiert');
      if (mode === 'cut') fs.clipboard = null;
      fs.selected = new Set(res);
      reload();
    }
  }

  async function newFolder() {
    if (fs.mode !== 'dir') return;
    const p = await C.safe(() => api.mkdir(fs.dir), 'Ordner konnte nicht erstellt werden');
    if (!p) return;
    fs.selected = new Set([p]);
    await reload();
    const e = fs.items.find((x) => x.path === p);
    if (e) renameEntry(e);
  }

  async function newTextFile() {
    if (fs.mode !== 'dir') return;
    const p = await C.safe(() => api.newTextFile(fs.dir), 'Datei konnte nicht erstellt werden');
    if (!p) return;
    fs.selected = new Set([p]);
    await reload();
    const e = fs.items.find((x) => x.path === p);
    if (e) renameEntry(e);
  }

  async function pinFolder(e) {
    const pinned = [...(state.settings.pinnedFolders || [])];
    const i = pinned.findIndex((f) => f.path === e.path);
    if (i >= 0) pinned.splice(i, 1); else pinned.push({ name: e.name, path: e.path });
    await C.saveSettings({ pinnedFolders: pinned });
    C.toast(i >= 0 ? 'Ordner gelöst' : 'Ordner angeheftet (Schnellzugriff & Startseite)');
    const side = $('#files-side');
    if (side) side.innerHTML = sideHtml();
  }

  function itemMenu(e, x, y) {
    const list = selectedEntries();
    const multi = list.length > 1;
    const isPinned = (state.settings.pinnedFolders || []).some((f) => f.path === e.path);
    C.ctxMenu(x, y, [
      { label: 'Öffnen', icon: 'external', hint: 'Enter', run: () => openEntry(e) },
      { label: 'Im Explorer zeigen', icon: 'folder', run: () => api.reveal(e.path) },
      'sep',
      { label: 'Kopieren', icon: 'copy', hint: 'Strg+C', run: () => setClipboard('copy') },
      { label: 'Ausschneiden', icon: 'cut', hint: 'Strg+X', run: () => setClipboard('cut') },
      e.isDir && fs.clipboard ? { label: 'In diesen Ordner einfügen', icon: 'paste', run: () => pasteHere(e.path) } : null,
      !multi ? { label: 'Umbenennen', icon: 'rename', hint: 'F2', run: () => renameEntry(e) } : null,
      { label: 'Pfad kopieren', icon: 'copy', run: () => api.copyText(list.map((x) => x.path).join('\n')).then(() => C.toast('Pfad kopiert')) },
      e.isDir && !multi ? { label: isPinned ? 'Vom Schnellzugriff lösen' : 'An Schnellzugriff anheften', icon: 'pin', run: () => pinFolder(e) } : null,
      'sep',
      { label: 'In den Papierkorb', icon: 'trash', hint: 'Entf', danger: true, run: () => trashEntries(list) },
    ]);
  }

  function emptyMenu(x, y) {
    const inDir = fs.mode === 'dir';
    C.ctxMenu(x, y, [
      inDir ? { label: 'Neuer Ordner', icon: 'folderPlus', hint: 'Strg+Umschalt+N', run: newFolder } : null,
      inDir ? { label: 'Neue Textdatei', icon: 'filePlus', run: newTextFile } : null,
      inDir ? { label: 'Einfügen', icon: 'paste', hint: 'Strg+V', disabled: !fs.clipboard, run: () => pasteHere() } : null,
      'sep',
      { label: 'Aktualisieren', icon: 'refresh', hint: 'F5', run: reload },
      inDir ? { label: 'Im Windows-Explorer öffnen', icon: 'external', run: () => api.openPath(fs.dir) } : null,
    ]);
  }

  // ---------------------------------------------------------------- Ereignisse

  function onClick(e) {
    const idxEl = e.target.closest('#file-list [data-idx]');
    if (idxEl) {
      selectIdx(Number(idxEl.dataset.idx), { ctrl: e.ctrlKey || e.metaKey, shift: e.shiftKey });
      $('#file-list').focus({ preventScroll: true });
      return true;
    }
    if (e.target.closest('#file-list') && !e.target.closest('[data-sort]')) {
      fs.selected.clear();
      refreshSelection();
      return true;
    }
    const catBtn = e.target.closest('[data-cat]');
    if (catBtn) { openCategory(catBtn.dataset.cat); return true; }
    const sortBtn = e.target.closest('#file-list [data-sort]');
    if (sortBtn) { fs.sort = sortBtn.dataset.sort; reload(); return true; }
    const vBtn = e.target.closest('[data-fview]');
    if (vBtn) { fs.view = vBtn.dataset.fview; C.lsSet('filesView', fs.view); render($('#view')); return true; }
    const act = e.target.closest('[data-fact]');
    if (act) {
      const sel = selectedEntries();
      switch (act.dataset.fact) {
        case 'back': goBack(); break;
        case 'forward': goForward(); break;
        case 'up': goUp(); break;
        case 'newfolder': newFolder(); break;
        case 'paste': pasteHere(); break;
        case 'explorer': api.openPath(fs.dir); break;
        case 'open': openEntry(sel[0]); break;
        case 'reveal': if (sel[0]) api.reveal(sel[0].path); break;
        case 'rename': renameEntry(sel[0]); break;
        case 'trash': trashEntries(sel); break;
        case 'copy': setClipboard('copy'); break;
        case 'cut': setClipboard('cut'); break;
        default: break;
      }
      return true;
    }
    return false;
  }

  function onDblClick(e) {
    const idxEl = e.target.closest('#file-list [data-idx]');
    if (!idxEl) return false;
    openEntry(fs.items[Number(idxEl.dataset.idx)]);
    return true;
  }

  function onContextMenu(e) {
    const idxEl = e.target.closest('#file-list [data-idx]');
    if (idxEl) {
      const i = Number(idxEl.dataset.idx);
      if (!fs.selected.has(fs.items[i].path)) selectIdx(i);
      itemMenu(fs.items[i], e.clientX, e.clientY);
      return true;
    }
    if (e.target.closest('#file-list')) { emptyMenu(e.clientX, e.clientY); return true; }
    const pinned = e.target.closest('[data-pinned]');
    if (pinned) {
      const f = (state.settings.pinnedFolders || []).find((x) => x.path === pinned.dataset.pinned);
      if (f) C.ctxMenu(e.clientX, e.clientY, [{ label: 'Vom Schnellzugriff lösen', icon: 'pin', run: () => pinFolder({ path: f.path, name: f.name }) }]);
      return true;
    }
    return false;
  }

  function onKey(e) {
    const inField = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName);
    if (inField) return false;
    const ctrl = e.ctrlKey || e.metaKey;
    const sel = selectedEntries();
    const cols = fs.view === 'grid' ? Math.max(1, Math.floor((($('#file-list') || {}).clientWidth - 24) / 160) || 1) : 1;
    switch (true) {
      case e.key === 'ArrowDown': e.preventDefault(); stepSel(cols, e.shiftKey); return true;
      case e.key === 'ArrowUp': e.preventDefault(); stepSel(-cols, e.shiftKey); return true;
      case e.key === 'ArrowRight' && fs.view === 'grid' && !e.altKey: e.preventDefault(); stepSel(1, e.shiftKey); return true;
      case e.key === 'ArrowLeft' && fs.view === 'grid' && !e.altKey: e.preventDefault(); stepSel(-1, e.shiftKey); return true;
      case e.key === 'ArrowLeft' && e.altKey: goBack(); return true;
      case e.key === 'ArrowRight' && e.altKey: goForward(); return true;
      case e.key === 'Home': e.preventDefault(); selectIdx(0, { shift: e.shiftKey }); return true;
      case e.key === 'End': e.preventDefault(); selectIdx(Math.min(fs.items.length, LIMIT) - 1, { shift: e.shiftKey }); return true;
      case e.key === 'Enter': if (sel.length === 1) openEntry(sel[0]); return true;
      case e.key === 'Backspace': goUp(); return true;
      case e.key === 'F2': if (sel.length === 1) renameEntry(sel[0]); return true;
      case e.key === 'F5': reload(); return true;
      case e.key === 'Delete': trashEntries(sel); return true;
      case ctrl && e.key.toLowerCase() === 'a': e.preventDefault(); fs.items.slice(0, LIMIT).forEach((x) => fs.selected.add(x.path)); refreshSelection(); return true;
      case ctrl && e.key.toLowerCase() === 'c': setClipboard('copy'); return true;
      case ctrl && e.key.toLowerCase() === 'x': setClipboard('cut'); return true;
      case ctrl && e.key.toLowerCase() === 'v': pasteHere(); return true;
      case ctrl && e.shiftKey && e.key.toLowerCase() === 'n': e.preventDefault(); newFolder(); return true;
      case ctrl && e.key.toLowerCase() === 'f': e.preventDefault(); $('#files-filter').focus(); return true;
      default: return false;
    }
  }

  function stepSel(delta, shift) {
    if (!fs.items.length) return;
    const cur = currentIdx();
    const max = Math.min(fs.items.length, LIMIT) - 1;
    const next = cur < 0 ? 0 : Math.max(0, Math.min(max, cur + delta));
    if (shift) {
      if (fs.anchor < 0) fs.anchor = Math.max(cur, 0);
      const anchor = fs.anchor;
      selectIdx(next, { shift: true });
      fs.anchor = anchor;
    } else {
      selectIdx(next);
    }
  }

  C.on('index', () => {
    if (state.view !== 'files') return;
    const side = $('#files-side');
    if (side) side.innerHTML = sideHtml();
    if (fs.mode === 'cat' && state.index && !state.index.running && (!fs.catData || !fs.catData.total)) openCategory(fs.cat);
  });

  C.views.files = {
    render, onClick, onDblClick, onContextMenu, onKey,
    openDir, openCategory,
  };
})();
