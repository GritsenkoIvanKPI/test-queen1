// QUEEN admin: shell, routing and screens. Building blocks live in core.js.
import {
  ICON, api, auth, state, clone, changed, onChange, saveDraft, readDraft, clearDraft, changes, productName, isNewItem,
  preview, uploadImage, toast, dialog, refs, ref, bind, readBound, makers, srcOf, esc, slugify, LABELS,
  text, area, toggle, csv, chips, image, listOf, paragraphs, photoList, section, fieldWrap,
} from './core.js';

const $ = (s, el = document) => el.querySelector(s);
const app = $('#app');
const L = LABELS;
const opts = (o) => Object.entries(o);
const D = () => state.data;
const brandOf = (slug) => D().brands.find((b) => b.slug === slug);

/* ═════════ Login & boot ═════════ */
async function boot() {
  if (!auth.token) return loginScreen();
  try {
    const res = await api('content');
    normalize(res.data);
    state.base = res.data; state.head = res.head; state.mode = res.mode;
    const draft = readDraft();
    state.data = clone(res.data);
    if (draft?.data && JSON.stringify(draft.data) !== JSON.stringify(res.data)) {
      if (!draft.head || draft.head === res.head) {
        state.data = normalize(draft.data); state.uploads = draft.uploads || [];
        setTimeout(() => toast('Your unpublished changes were restored.'), 400);
      } else {
        const keep = await dialog({ title: 'Unpublished changes found', text: 'You have changes from an earlier session, but the site was updated since then. Keep your changes (they will replace the newer version when you publish) or start from the current site?', ok: 'Keep my changes', cancel: 'Start fresh' });
        if (keep) { state.data = normalize(draft.data); state.uploads = draft.uploads || []; } else clearDraft();
      }
    }
    shell();
  } catch (e) {
    auth.token = '';
    loginScreen(e.message);
  }
}

// Fill optional fields so that opening an editor never counts as a change
function normalize(d) {
  for (const b of d.brands) { b.about ||= []; b.keyModels ||= []; b.cta ||= []; d.site.home.collections.tabs[b.slug] ||= []; }
  for (const m of d.models) m.details ||= [];
  return d;
}

function loginScreen(err = '') {
  app.className = '';
  app.innerHTML = `<div class="login"><div class="login__card">
    <div class="login__logo">QUEEN</div><p class="login__sub">Site admin</p>
    <form id="login">
      <input class="input input--big" type="password" name="password" placeholder="Password" autocomplete="current-password" required autofocus>
      ${err ? `<p class="login__err">${esc(err)}</p>` : ''}
      <button class="btn btn--primary btn--lg btn--block" type="submit">Sign in</button>
    </form>
    <p class="login__hint">Edit products, collections and pages, then publish to the site.</p>
  </div></div>`;
  $('#login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    btn.disabled = true;
    try {
      const res = await api('login', { password: e.target.password.value });
      auth.token = res.token;
      app.className = 'boot'; app.innerHTML = '<div class="boot__logo">QUEEN</div>';
      boot();
    } catch (er) { loginScreen(er.message); }
  });
}

/* ═════════ Shell ═════════ */
function shell() {
  app.className = 'shell';
  app.innerHTML = `
  <header class="top">
    <button class="icon-btn menu-btn" id="menuBtn" aria-label="Menu">${ICON.menu}</button>
    <a class="top__logo" href="#/"><b>QUEEN</b><span>Admin</span></a>
    <div class="search">${ICON.search}<input id="search" placeholder="Find a product, collection or page…" autocomplete="off"><kbd>⌘K</kbd><div class="search__results" id="searchResults" hidden></div></div>
    <div class="top__quick">
      <a class="btn btn--accent" href="#/products/new" title="New product (N)">${ICON.plus}<span>Product</span></a>
      <a class="btn" href="#/collections/new" title="New collection (C)">${ICON.plus}<span>Collection</span></a>
    </div>
    <div class="top__right">
      <button class="status" id="status" type="button"></button>
      <button class="btn btn--primary" id="publishBtn" type="button">Publish</button>
      <button class="icon-btn" id="previewBtn" title="Show or hide the preview" aria-pressed="true">${ICON.eye}</button>
      <a class="icon-btn" href="/" target="_blank" rel="noopener" title="Open the site">${ICON.ext}</a>
    </div>
  </header>
  <aside class="side" id="side"></aside>
  <div class="work show-preview" id="work">
    <main class="main" id="main"><div class="main__inner" id="screen"></div></main>
    <section class="preview" aria-label="Live preview">
      <div class="resizer" id="resizer" title="Drag to resize"></div>
      <div class="preview__bar">
        <div class="preview__devices" role="group" aria-label="Device">
          <button class="icon-btn" data-device="desktop" aria-pressed="true" title="Desktop">${ICON.desktop}</button>
          <button class="icon-btn" data-device="tablet" aria-pressed="false" title="Tablet">${ICON.tablet}</button>
          <button class="icon-btn" data-device="phone" aria-pressed="false" title="Phone">${ICON.mobile}</button>
        </div>
        <div class="preview__url" id="previewUrl"></div>
        <button class="icon-btn" id="previewOpen" title="Open the published page">${ICON.ext}</button>
      </div>
      <div class="preview__stage" id="stage"><iframe class="preview__frame" id="frame" title="Preview of the page"></iframe></div>
    </section>
  </div>`;
  preview.mount($('#stage'), $('#frame'));
  preview.onNav = navFromPreview;
  wireShell();
  onChange(({ rerender }) => { updateStatus(); renderSide(); preview.refresh(); if (rerender) renderRoute(); });
  window.addEventListener('hashchange', renderRoute);
  renderRoute();
  updateStatus();
}

/* ─── Sidebar ─── */
const NAV = () => {
  const c = changes();
  const dirty = (prefix) => c.some((x) => x.route && x.route.startsWith(prefix));
  const dot = (p) => (dirty(p) ? '<i class="nav__dot"></i>' : '');
  return `
  <div class="side__group"><p class="side__label">Catalogue</p>
    <a class="nav" href="#/products">${ICON.dress}Products<span class="nav__count">${D().models.length}</span></a>
    <a class="nav" href="#/collections">${ICON.stack}Collections<span class="nav__count">${D().collections.length}</span></a>
  </div>
  <div class="side__group"><p class="side__label">Pages</p>
    <a class="nav" href="#/pages/home">${ICON.home}Home${dot('#/pages/home')}</a>
    <a class="nav" href="#/pages/brands">${ICON.tag}Our brands${dot('#/pages/brands')}</a>
    ${D().brands.map((b) => `<a class="nav nav--sub" href="#/pages/brand/${b.slug}">${esc(b.name)}${dot('#/pages/brand/' + b.slug)}</a>`).join('')}
    <a class="nav" href="#/pages/about">${ICON.page}About us${dot('#/pages/about')}</a>
    <a class="nav" href="#/pages/partners">${ICON.page}Partnership${dot('#/pages/partners')}</a>
    <a class="nav" href="#/pages/contact">${ICON.page}Contacts${dot('#/pages/contact')}</a>
    <a class="nav" href="#/blog">${ICON.blog}Blog<span class="nav__count">${D().posts.length}</span></a>
    <a class="nav" href="#/pages/privacy">${ICON.page}Privacy policy${dot('#/pages/privacy')}</a>
  </div>
  <div class="side__group"><p class="side__label">Settings</p>
    <a class="nav" href="#/settings/contacts">${ICON.phone}Contacts &amp; phones${dot('#/settings/contacts')}</a>
    <a class="nav" href="#/settings/terms">${ICON.list}Wholesale terms${dot('#/settings/terms')}</a>
    <a class="nav" href="#/settings/nav">${ICON.settings}Menu, footer &amp; banners${dot('#/settings/nav')}</a>
  </div>`;
};
function renderSide() {
  const side = $('#side');
  side.innerHTML = NAV();
  const h = location.hash || '#/';
  let best = null;
  side.querySelectorAll('.nav').forEach((a) => { const href = a.getAttribute('href'); if (h === href || h.startsWith(href + '/') || h.startsWith(href + '?')) if (!best || href.length > best.getAttribute('href').length) best = a; });
  best?.classList.add('is-active');
}

function updateStatus() {
  const n = changes().length;
  const st = $('#status');
  st.classList.toggle('is-dirty', n > 0);
  st.textContent = (state.mode === 'demo' ? 'Demo · ' : '') + (n ? `${n} unpublished change${n > 1 ? 's' : ''}` : state.mode === 'demo' ? 'nothing changed' : 'Everything is published');
  $('#publishBtn').disabled = !n;
}

/* ─── Shell events ─── */
function wireShell() {
  $('#publishBtn').onclick = publishDialog;
  $('#status').onclick = () => changes().length && publishDialog();
  $('#menuBtn').onclick = () => $('#side').classList.toggle('is-open');
  $('#side').addEventListener('click', (e) => { if (e.target.closest('a')) $('#side').classList.remove('is-open'); });
  $('#previewBtn').onclick = (e) => {
    const w = $('#work');
    const narrow = matchMedia('(max-width: 1080px)').matches;
    if (narrow) w.classList.toggle('show-preview'); else w.classList.toggle('no-preview');
    const on = narrow ? w.classList.contains('show-preview') : !w.classList.contains('no-preview');
    e.currentTarget.setAttribute('aria-pressed', on);
    setTimeout(() => preview.fit(), 50);
  };
  if (matchMedia('(max-width: 1080px)').matches) { $('#work').classList.remove('show-preview'); $('#previewBtn').setAttribute('aria-pressed', 'false'); }
  document.querySelectorAll('[data-device]').forEach((b) => b.onclick = () => {
    document.querySelectorAll('[data-device]').forEach((x) => x.setAttribute('aria-pressed', x === b));
    preview.setDevice(b.dataset.device);
  });
  $('#previewOpen').onclick = () => window.open(preview.url, '_blank');

  // Resize: the editing column stays 460–720px, snaps to comfortable widths, double-click resets
  const rz = $('#resizer'), work = $('#work');
  const MIN = 460, MAX = 720, SNAPS = [520, 600, 680];
  rz.insertAdjacentHTML('beforeend', '<span class="resizer__tip"></span>');
  const tip = rz.querySelector('.resizer__tip');
  const setEdit = (w, save) => {
    if (w == null) { work.style.removeProperty('--edit-w'); try { localStorage.removeItem('queen-admin-edit-w'); } catch { /* ignore */ } }
    else { work.style.setProperty('--edit-w', w + 'px'); if (save) try { localStorage.setItem('queen-admin-edit-w', w); } catch { /* ignore */ } }
    setTimeout(() => preview.fit(), 0);
  };
  try { const w = +localStorage.getItem('queen-admin-edit-w'); if (w >= MIN && w <= MAX) setEdit(w); } catch { /* ignore */ }
  rz.title = 'Drag to resize · double-click to reset';
  rz.addEventListener('dblclick', () => { setEdit(null); toast('Default layout restored.'); });
  rz.addEventListener('pointerdown', (e) => {
    rz.setPointerCapture(e.pointerId); rz.classList.add('is-drag'); document.body.classList.add('is-resizing');
    const left = $('#main').getBoundingClientRect().left;
    let w = 0;
    const move = (ev) => {
      const max = Math.max(MIN, Math.min(MAX, work.clientWidth - 400)); // keep at least 400px for the preview
      w = Math.round(Math.max(MIN, Math.min(max, ev.clientX - left)));
      const snap = SNAPS.find((s) => Math.abs(s - w) < 14); if (snap) w = snap;
      tip.textContent = w <= MIN ? 'Narrowest editor' : w >= max ? 'Widest editor' : 'Editor ' + w + 'px';
      setEdit(w);
    };
    const up = () => { rz.classList.remove('is-drag'); document.body.classList.remove('is-resizing'); if (w) setEdit(w, true); rz.removeEventListener('pointermove', move); rz.removeEventListener('pointerup', up); };
    rz.addEventListener('pointermove', move); rz.addEventListener('pointerup', up);
  });

  // Keyboard shortcuts
  document.addEventListener('keydown', (e) => {
    const typing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName);
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#search').focus(); return; }
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); if (changes().length) publishDialog(); return; }
    if (typing || e.metaKey || e.ctrlKey || e.altKey || document.querySelector('.dlg')) return;
    if (e.key === 'n') { e.preventDefault(); location.hash = '#/products/new'; }
    if (e.key === 'c') { e.preventDefault(); location.hash = '#/collections/new'; }
  });

  wireSearch();
  wireEditing($('#screen'));
  window.addEventListener('beforeunload', saveDraft);
}

/* ─── Global search ─── */
function wireSearch() {
  const inp = $('#search'), box = $('#searchResults');
  let items = [], active = 0;
  const pages = [['Home', '#/pages/home'], ['Our brands', '#/pages/brands'], ['About us', '#/pages/about'], ['Partnership', '#/pages/partners'], ['Contacts page', '#/pages/contact'], ['Blog', '#/blog'], ['Privacy policy', '#/pages/privacy'], ['Contacts & phones', '#/settings/contacts'], ['Wholesale terms', '#/settings/terms'], ['Menu & footer', '#/settings/nav']];
  const draw = () => {
    const q = inp.value.trim().toLowerCase();
    if (!q) { box.hidden = true; return; }
    const match = (s) => String(s).toLowerCase().includes(q);
    items = [
      ...D().models.filter((m) => match(productName(m)) || match(m.article) || match(m.brand)).slice(0, 8).map((m) => ({ href: `#/products/${m.id}`, title: productName(m), sub: brandOf(m.brand)?.name + ' · product', img: m.photos[0] })),
      ...D().collections.filter((c) => match(c.name)).map((c) => ({ href: `#/collections/${c.slug}`, title: c.name, sub: brandOf(c.brand)?.name + ' · collection' })),
      ...D().brands.filter((b) => match(b.name)).map((b) => ({ href: `#/pages/brand/${b.slug}`, title: b.name, sub: 'Brand page' })),
      ...D().posts.filter((p) => match(p.title)).map((p) => ({ href: `#/blog/${p.slug}`, title: p.title, sub: 'Blog post' })),
      ...pages.filter(([t]) => match(t)).map(([t, href]) => ({ href, title: t, sub: 'Page' })),
    ];
    active = 0;
    box.hidden = false;
    box.innerHTML = items.length ? items.map((x, i) => `<button class="search__item${i ? '' : ' is-active'}" data-href="${x.href}">${x.img ? `<img src="${esc(srcOf(x.img))}" alt="">` : '<i></i>'}<span>${esc(x.title)}<small>${esc(x.sub)}</small></span></button>`).join('') : '<div class="search__empty">Nothing found</div>';
  };
  const go = (href) => { location.hash = href; inp.value = ''; box.hidden = true; inp.blur(); };
  inp.addEventListener('input', draw);
  inp.addEventListener('keydown', (e) => {
    const btns = [...box.querySelectorAll('.search__item')];
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); active = (active + (e.key === 'ArrowDown' ? 1 : -1) + btns.length) % btns.length; btns.forEach((b, i) => b.classList.toggle('is-active', i === active)); }
    if (e.key === 'Enter' && btns[active]) go(btns[active].dataset.href);
    if (e.key === 'Escape') { inp.value = ''; box.hidden = true; inp.blur(); }
  });
  box.addEventListener('mousedown', (e) => { const b = e.target.closest('[data-href]'); if (b) { e.preventDefault(); go(b.dataset.href); } });
  inp.addEventListener('blur', () => setTimeout(() => (box.hidden = true), 150));
}

/* ─── Clicking a link inside the preview opens its editor ─── */
function navFromPreview(href) {
  const u = new URL(href, location.origin);
  let m;
  const p = u.pathname;
  if (p === '/') location.hash = '#/pages/home';
  else if (p === '/brands/') location.hash = '#/pages/brands';
  else if ((m = p.match(/^\/brands\/([^/]+)\/$/))) location.hash = `#/pages/brand/${m[1]}`;
  else if ((m = p.match(/^\/catalogue\/([^/]+)\/$/))) location.hash = `#/products/${m[1]}`;
  else if (p === '/catalogue/') location.hash = `#/products${u.searchParams.get('brand') ? '?brand=' + u.searchParams.get('brand') : ''}`;
  else if (['/about/', '/partners/', '/contact/', '/privacy/'].includes(p)) location.hash = `#/pages/${p.replace(/\//g, '')}`;
  else if (p === '/blog/') location.hash = '#/blog';
  else if ((m = p.match(/^\/blog\/([^/]+)\/$/))) location.hash = `#/blog/${m[1]}`;
}

/* ═════════ Editing events (one delegated handler for every screen) ═════════ */
function wireEditing(root) {
  root.addEventListener('input', (e) => {
    const el = e.target;
    if (!el.dataset.o || el.type === 'checkbox' || el.type === 'file') return;
    readBound(el);
    root.dispatchEvent(new CustomEvent('edit', { detail: el }));
    changed();
  });
  root.addEventListener('change', async (e) => {
    const el = e.target;
    if (el.type === 'checkbox' && el.dataset.o) { readBound(el); root.dispatchEvent(new CustomEvent('edit', { detail: el })); changed({ rerender: el.hasAttribute('data-rerender') }); return; }
    if (el.tagName === 'SELECT' && el.dataset.o) { readBound(el); root.dispatchEvent(new CustomEvent('edit', { detail: el })); changed({ rerender: true }); return; }
    if (el.matches('[data-img]')) {
      const obj = refs.map.get(el.dataset.o);
      const file = el.files[0]; if (!file) return;
      await withBusy(el, async () => { obj[el.dataset.k] = await uploadImage(file, el.dataset.kind, el.dataset.folder); });
      changed({ rerender: true });
    }
    if (el.matches('[data-img-list]')) {
      const arr = refs.map.get(el.dataset.imgList);
      const files = [...el.files];
      await withBusy(el, async () => { for (const f of files) arr.push(await uploadImage(f, el.dataset.kind, el.dataset.folder)); });
      changed({ rerender: true });
    }
  });
  root.addEventListener('click', (e) => {
    const t = e.target.closest('button, [data-chip]');
    if (!t) return;
    if (t.matches('[data-toggle-card]')) { const c = t.closest('.card'); c.classList.toggle('is-closed'); t.setAttribute('aria-expanded', !c.classList.contains('is-closed')); return; }
    if (t.matches('[data-chip]')) {
      const obj = refs.map.get(t.dataset.o), k = t.dataset.k, v = t.dataset.v;
      if (t.hasAttribute('data-multi')) { const a = obj[k] || (obj[k] = []); const i = a.indexOf(v); i > -1 ? a.splice(i, 1) : a.push(v); }
      else obj[k] = v || null;
      root.dispatchEvent(new CustomEvent('edit', { detail: t }));
      changed({ rerender: true });
      return;
    }
    if (t.matches('[data-img-clear]')) { refs.map.get(t.dataset.o)[t.dataset.k] = null; changed({ rerender: true }); return; }
    if (t.matches('[data-add]')) { const arr = refs.map.get(t.dataset.add); arr.push(makers.get(t.dataset.add)?.() ?? {}); changed({ rerender: true }); return; }
    if (t.matches('[data-remove]')) { const arr = refs.map.get(t.dataset.remove); arr.splice(+t.dataset.i, 1); changed({ rerender: true }); return; }
    if (t.matches('[data-move]')) { const arr = refs.map.get(t.dataset.move); const i = +t.dataset.i, j = i + +t.dataset.d; if (j < 0 || j >= arr.length) return; [arr[i], arr[j]] = [arr[j], arr[i]]; changed({ rerender: true }); }
  });
  // Drag to reorder (lists and photos)
  let drag = null;
  root.addEventListener('dragstart', (e) => { const it = e.target.closest('[data-drag-list]'); if (!it) return; drag = it; it.classList.add('is-drag'); e.dataTransfer.effectAllowed = 'move'; e.dataTransfer.setData('text/plain', ''); });
  root.addEventListener('dragover', (e) => { const it = e.target.closest('[data-drag-list]'); if (!drag || !it || it.dataset.dragList !== drag.dataset.dragList) return; e.preventDefault(); root.querySelectorAll('.is-over').forEach((x) => x.classList.remove('is-over')); if (it !== drag) it.classList.add('is-over'); });
  root.addEventListener('drop', (e) => {
    const it = e.target.closest('[data-drag-list]');
    if (!drag || !it || it.dataset.dragList !== drag.dataset.dragList) return;
    e.preventDefault();
    const arr = refs.map.get(drag.dataset.dragList), from = +drag.dataset.i, to = +it.dataset.i;
    if (from !== to) { const [x] = arr.splice(from, 1); arr.splice(to, 0, x); changed({ rerender: true }); }
  });
  root.addEventListener('dragend', () => { drag?.classList.remove('is-drag'); drag = null; root.querySelectorAll('.is-over').forEach((x) => x.classList.remove('is-over')); });
  // Section focus → scroll the preview to it
  root.addEventListener('focusin', (e) => focusCard(e.target.closest('.card')));
  root.addEventListener('pointerdown', (e) => focusCard(e.target.closest('.card')));
}
let focused = null;
function focusCard(card) {
  if (!card || card === focused) return;
  focused?.classList.remove('is-focus');
  focused = card; card.classList.add('is-focus');
  if (card.dataset.anchor) preview.scrollTo(card.dataset.anchor);
}
async function withBusy(el, fn) {
  const label = el.closest('label');
  label?.classList.add('is-busy');
  const t = toast('Preparing photos…', false, 60000);
  try { await fn(); } catch (er) { toast(esc(er.message), true); }
  finally { label?.classList.remove('is-busy'); document.querySelectorAll('.toast').forEach((x) => x.textContent === 'Preparing photos…' && x.remove()); void t; }
}

/* ═════════ Router ═════════ */
let leaveHook = null;     // runs when the user goes to another screen
let cleanups = [];       // runs before every re-render of the screen
function renderRoute() {
  cleanups.forEach((f) => f()); cleanups = [];
  if ($('#screen').dataset.route !== location.hash) { const f = leaveHook; leaveHook = null; f?.(); }
  const [path, qs] = (location.hash.slice(1) || '/').split('?');
  const q = new URLSearchParams(qs || '');
  const seg = path.split('/').filter(Boolean);
  refs.reset();
  focused = null;
  const screen = $('#screen');
  let view;
  if (!seg.length) view = dashboard();
  else if (seg[0] === 'products' && !seg[1]) view = productList(q);
  else if (seg[0] === 'products') view = productEditor(seg[1], q);
  else if (seg[0] === 'collections' && !seg[1]) view = collectionList();
  else if (seg[0] === 'collections') view = collectionEditor(seg[1], q);
  else if (seg[0] === 'pages' && seg[1] === 'brand') view = brandEditor(seg[2]);
  else if (seg[0] === 'pages') view = pageEditor(seg[1]);
  else if (seg[0] === 'blog' && !seg[1]) view = blogList();
  else if (seg[0] === 'blog') view = postEditor(seg[1]);
  else if (seg[0] === 'settings') view = settingsEditor(seg[1]);
  if (!view) view = { html: '<div class="empty">This page does not exist. <a href="#/">Back to start</a></div>', url: '/' };
  if (view.redirect) { history.replaceState(null, '', view.redirect); return renderRoute(); }
  const keepScroll = screen.dataset.route === location.hash;
  const y = $('#main').scrollTop;
  screen.dataset.route = location.hash;
  screen.innerHTML = view.html;
  if (keepScroll) $('#main').scrollTop = y; else $('#main').scrollTop = 0;
  view.after?.(screen);
  renderSide();
  updateStatus();
  const url = typeof view.url === 'function' ? view.url() : view.url;
  preview.show(url, view.anchor ?? null);
  $('#previewUrl').innerHTML = `queen-dress.com<b>${esc(url)}</b>`;
}

/* ═════════ Dashboard ═════════ */
function dashboard() {
  const c = changes();
  const per = (slug) => D().models.filter((m) => m.brand === slug).length;
  return {
    url: '/',
    html: `<h1 class="hello">Good to see you</h1><p>What would you like to do?</p>
    <div class="quick">
      <a class="is-main" href="#/products/new">${ICON.dress}<b>Add a new product</b><small>Upload photos, choose the brand and collection — done.</small><kbd>N</kbd></a>
      <a href="#/collections/new">${ICON.stack}<b>Create a collection</b><small>Group new products under one name, e.g. “Queen 2028”.</small><kbd>C</kbd></a>
    </div>
    ${c.length ? `<p class="h2">Waiting to be published</p><ul class="changes">${c.slice(0, 8).map((x) => `<li class="is-${x.type}"><em>${{ add: 'New', edit: 'Edited', del: 'Deleted' }[x.type]}</em>${x.route ? `<a href="${x.route}">${esc(x.text)}</a>` : esc(x.text)}</li>`).join('')}</ul>
    <p style="margin:-6px 0 26px"><button class="btn btn--primary" id="dashPublish">Publish ${c.length} change${c.length > 1 ? 's' : ''}</button></p>` : ''}
    <div class="stats">
      <a class="stat" href="#/products"><b>${D().models.length}</b><span>products</span></a>
      <a class="stat" href="#/collections"><b>${D().collections.length}</b><span>collections</span></a>
      <a class="stat" href="#/pages/brands"><b>${D().brands.length}</b><span>brands</span></a>
      <a class="stat" href="#/blog"><b>${D().posts.length}</b><span>blog posts</span></a>
    </div>
    <p class="h2">Brands</p>
    <div class="brandrows">${D().brands.map((b) => `<a class="brandrow" href="#/products?brand=${b.slug}">${b.cover ? `<img src="${esc(srcOf(b.cover))}" alt="">` : '<i></i>'}<span><b>${esc(b.name)}</b><small>${esc(b.tagline)}</small></span><span>${per(b.slug)} products · ${D().collections.filter((x) => x.brand === b.slug).length} collections</span><span>${ICON.right}</span></a>`).join('')}</div>`,
    after: (el) => { const b = $('#dashPublish', el); if (b) b.onclick = publishDialog; },
  };
}

/* ═════════ Products ═════════ */
function productList(q) {
  const brand = q.get('brand') || '', coll = q.get('collection') || '', term = (q.get('q') || '').toLowerCase(), onlyNew = q.get('new') === '1';
  const all = D().models;
  let list = all.filter((m) => (!brand || m.brand === brand) && (!coll || (coll === '-' ? !m.collection : m.collection === coll)) && (!onlyNew || m.isNew) && (!term || productName(m).toLowerCase().includes(term)));
  // Newest drafts first, then the site order
  list = [...list.filter((m) => isNewItem('models', 'id', m.id)).reverse(), ...list.filter((m) => !isNewItem('models', 'id', m.id))];
  const link = (patch) => { const p = new URLSearchParams(q); for (const [k, v] of Object.entries(patch)) v ? p.set(k, v) : p.delete(k); const s = p.toString(); return `#/products${s ? '?' + s : ''}`; };
  const brandColls = D().collections.filter((c) => !brand || c.brand === brand);
  const newHref = `#/products/new${brand ? `?brand=${brand}${coll && coll !== '-' ? '&collection=' + encodeURIComponent(coll) : ''}` : ''}`;
  return {
    url: brand ? `/catalogue/?brand=${brand}` : '/catalogue/',
    html: `<div class="head"><div><h1>Products</h1><p>${all.length} products in the catalogue. Click one to edit it.</p></div>
      <div class="head__actions"><a class="btn btn--accent" href="${newHref}">${ICON.plus}<span>New product</span></a></div></div>
    <div class="seg">${[['', 'All', all.length], ...D().brands.map((b) => [b.slug, b.name, all.filter((m) => m.brand === b.slug).length])].map(([s, n, c]) => `<a href="${link({ brand: s, collection: '' })}"><button tabindex="-1" aria-pressed="${brand === s}">${esc(n)}<small>${c}</small></button></a>`).join('')}</div>
    <div class="toolbar">
      <input class="input" id="pq" placeholder="Search by article…" value="${esc(q.get('q') || '')}">
      ${brandColls.length ? `<select class="select" id="pc"><option value="">All collections</option>${brandColls.map((c) => `<option value="${esc(c.name)}"${coll === c.name ? ' selected' : ''}>${esc(c.name)}</option>`).join('')}<option value="-"${coll === '-' ? ' selected' : ''}>Without a collection</option></select>` : ''}
      <label class="switch"><input type="checkbox" id="pn"${onlyNew ? ' checked' : ''}><i></i><span>Only “New”</span></label>
    </div>
    <div class="pgrid">
      <a class="pcard pcard--new" href="${newHref}"><span class="pcard__img"><span>${ICON.plus}Add product</span></span></a>
      ${list.map((m) => `<a class="pcard" href="#/products/${m.id}">
        <span class="pcard__img${m.photos[0] ? '' : ' is-empty'}">${m.photos[0] ? `<img src="${esc(srcOf(m.photos[0]))}" alt="" loading="lazy">` : ''}
          <span class="pcard__badges">${isNewItem('models', 'id', m.id) ? '<span class="badge badge--draft">Not published</span>' : ''}${m.isNew ? '<span class="badge badge--new">New</span>' : ''}${m.hidden ? '<span class="badge badge--hidden">Hidden</span>' : ''}</span></span>
        <span><span class="pcard__name">${esc(productName(m))}</span><br><span class="pcard__meta">${esc(brandOf(m.brand)?.name || '')} · ${L.sil[m.sil] || '—'}</span></span></a>`).join('')}
    </div>${list.length ? '' : '<p class="empty">No products match. Try another brand or clear the search.</p>'}`,
    after: (el) => {
      const pq = $('#pq', el);
      let t; pq.oninput = () => { clearTimeout(t); t = setTimeout(() => { history.replaceState(null, '', link({ q: pq.value.trim() })); renderRoute(); $('#pq').focus(); const v = $('#pq').value; $('#pq').setSelectionRange(v.length, v.length); }, 250); };
      const pc = $('#pc', el); if (pc) pc.onchange = () => (location.hash = link({ collection: pc.value }));
      $('#pn', el).onchange = (e) => (location.hash = link({ new: e.target.checked ? '1' : '' }));
    },
  };
}

const productId = (brand, article) => `${brand}-${slugify(article)}`;
function newProduct(brand, collection) {
  const c = D().collections.find((x) => x.name === collection);
  return { id: `draft-${Date.now().toString(36)}`, brand, article: '', collection: collection || null, sil: null, sleeves: null, fabric: null, details: [], photos: [], video: null, colour: '', isNew: !!c?.isNew };
}

function productEditor(id, q) {
  if (id === 'new') {
    const lastBrand = q.get('brand') || sessionStorage.getItem('lastBrand') || D().brands[0].slug;
    const coll = q.get('collection') ?? (q.get('brand') ? '' : sessionStorage.getItem('lastCollection') || '');
    const m = newProduct(lastBrand, D().collections.some((c) => c.name === coll && c.brand === lastBrand) ? coll : null);
    D().models.push(m);
    return { redirect: `#/products/${m.id}` };
  }
  const m = D().models.find((x) => x.id === id);
  if (!m) return null;
  const b = brandOf(m.brand);
  const fresh = isNewItem('models', 'id', m.id);
  const bColls = D().collections.filter((c) => c.brand === m.brand);
  const dup = m.article && D().models.some((x) => x !== m && x.id === productId(m.brand, m.article));
  const folder = fresh ? `assets/catalog/${m.brand}` : `assets/catalog/${m.id}`;
  const ph = refOf(m.photos);

  leaveHook = () => {
    // A new product left without article and photos is dropped
    if (fresh && !m.article && !m.photos.length) { D().models.splice(D().models.indexOf(m), 1); changed(); }
  };

  const html = `<a class="crumb" href="#/products${m.brand ? '?brand=' + m.brand : ''}">${ICON.back}Products</a>
  <div class="head"><div><h1 id="pname">${esc(productName(m))}</h1><p id="purl">${m.article ? `On the site: <a href="/catalogue/${esc(fresh ? productId(m.brand, m.article) : m.id)}/" target="_blank">/catalogue/${esc(fresh ? productId(m.brand, m.article) : m.id)}/</a>` : 'Start with the photos and the article number.'}</p></div>
    <div class="head__actions">${!fresh ? `<button class="btn btn--sm" id="pdup">${ICON.copy}<span>Duplicate</span></button>` : ''}<button class="btn btn--sm btn--danger" id="pdel">${ICON.trash}<span>Delete</span></button></div></div>

  ${section({ n: 1, title: 'Photos', sub: 'The first photo is the cover. Drag to change the order.', anchor: '.pdp', body: `
    <div class="photos" id="photos">${m.photos.map((p, i) => `<div class="ph" draggable="true" data-drag-list="${ph}" data-i="${i}"><img src="${esc(srcOf(p))}" alt="">${i ? '' : '<span class="ph__badge">Cover</span>'}
      <button type="button" class="ph__del" title="Remove photo" data-remove="${ph}" data-i="${i}">${ICON.x}</button>
      <span class="ph__move"><button type="button" title="Move left" data-move="${ph}" data-i="${i}" data-d="-1">${ICON.left}</button><button type="button" title="Move right" data-move="${ph}" data-i="${i}" data-d="1">${ICON.right}</button></span></div>`).join('')}</div>
    <label class="drop${m.photos.length ? '' : ' drop--big'}" id="drop">${ICON.upload}<span><b>Drop photos here</b> or click to choose</span><small>JPG or PNG. They are cropped to the catalogue shape (2:3), keeping the top of the photo.</small>
      <input type="file" accept="image/*" multiple id="pfiles"></label>` })}

  ${section({ n: 2, title: 'Product', sub: 'Brand, collection and article number', anchor: '.pdp__info', body: `
    ${fieldWrap('Brand', chips(m, 'brand', D().brands.map((x) => [x.slug, esc(x.name)])))}
    ${fieldWrap('Collection', `<div class="chips">${chips(m, 'collection', bColls.map((c) => [c.name, esc(c.name) + (c.isNew ? ' <small>new</small>' : '')]), { allowNone: true, noneLabel: 'No collection' }).slice(19, -6)}<button type="button" class="chip chip--add" id="newColl">${ICON.plus}New collection</button></div>`, bColls.length ? '' : `${esc(b.name)} has no collections yet — products are grouped by silhouette on the site.`)}
    <div class="grid2">
      ${fieldWrap('Article number <small>required</small>', `<input class="input input--big${dup ? ' is-invalid' : ''}" ${bind(m, 'article')} id="particle" value="${esc(m.article)}" placeholder="e.g. 2760" autocomplete="off">`, dup ? '' : 'Shown on the site after the collection name.')}
      <div class="field" style="align-content:end;gap:12px;padding-bottom:4px">${toggle(m, 'isNew', 'Mark as “New”', 'Shows a New label on the site')}${toggle(m, 'hidden', 'Hide from the site', 'Keeps it here, not on the site')}</div>
    </div>
    ${dup ? '<p class="field__err">Another product of this brand already has this article number.</p>' : ''}` })}

  ${section({ n: 3, title: 'Description', sub: 'Used for the catalogue filters and the product page', anchor: '.pdp__facts', body: `
    ${fieldWrap('Silhouette', chips(m, 'sil', opts(L.sil)))}
    ${fieldWrap('Sleeves & neckline', chips(m, 'sleeves', opts(L.sleeves)))}
    ${fieldWrap('Fabric', chips(m, 'fabric', opts(L.fabric)))}
    ${fieldWrap('Details <small>optional, choose any</small>', chips(m, 'details', opts(L.details), { multi: true }))}
    <div class="grid2">
      ${fieldWrap('Colour <small>optional</small>', `<input class="input" ${bind(m, 'colour')} value="${esc(m.colour || '')}" list="colours" placeholder="Ivory"><datalist id="colours"><option value="Ivory"><option value="Cappuccino"><option value="White"><option value="Champagne"></datalist>`)}
      <div></div>
    </div>
    ${area(m, 'description', 'Text on the product page <small>optional</small>', { rows: 2, placeholder: 'Leave empty to use the automatic description' })}
    ${m.video ? `<p class="card__note">This product has a video (${esc(m.video)}). It is shown second in the gallery.</p>` : ''}` })}

  <div class="savebar"><span class="savebar__msg" id="psave">${fresh ? 'Saved as a draft. It goes live when you publish.' : 'Changes are saved as you type. Publish when ready.'}</span>
    <a class="btn" href="#/products/new?brand=${m.brand}${m.collection ? '&collection=' + encodeURIComponent(m.collection) : ''}" id="another">${ICON.plus}<span>Save &amp; add another</span></a>
    <a class="btn btn--primary" href="#/products${m.brand ? '?brand=' + m.brand : ''}" id="done">Done</a></div>`;

  return {
    url: () => `/catalogue/${m.id}/`,
    anchor: null,
    html,
    after: (el) => {
      sessionStorage.setItem('lastBrand', m.brand); sessionStorage.setItem('lastCollection', m.collection || '');
      const files = $('#pfiles', el), drop = $('#drop', el);
      const add = async (list) => {
        const imgs = [...list].filter((f) => /^image\//.test(f.type));
        if (!imgs.length) return;
        await withBusy(drop.querySelector('input'), async () => { for (const f of imgs) m.photos.push(await uploadImage(f, 'product', folder)); });
        changed({ rerender: true });
      };
      files.onchange = () => add(files.files);
      ['dragenter', 'dragover'].forEach((ev) => drop.addEventListener(ev, (e) => { if (e.dataTransfer?.types.includes('Files')) { e.preventDefault(); drop.classList.add('is-over'); } }));
      ['dragleave', 'drop'].forEach((ev) => drop.addEventListener(ev, () => drop.classList.remove('is-over')));
      drop.addEventListener('drop', (e) => { if (e.dataTransfer.files.length) { e.preventDefault(); add(e.dataTransfer.files); } });

      el.addEventListener('edit', onEdit);
      leaveHookChain(() => el.removeEventListener('edit', onEdit));
      function onEdit(e) {
        const k = e.detail.dataset.k;
        if (k === 'brand' && m.collection && !D().collections.some((c) => c.name === m.collection && c.brand === m.brand)) m.collection = null;
        if (k === 'collection') { const c = D().collections.find((x) => x.name === m.collection); if (c && fresh) m.isNew = !!c.isNew; }
        if (k === 'article' || k === 'brand') {
          if (fresh && m.article) {
            const nid = productId(m.brand, m.article);
            if (!D().models.some((x) => x !== m && x.id === nid)) { m.id = nid; history.replaceState(null, '', `#/products/${nid}`); $('#main').closest('.work'); $('#screen').dataset.route = location.hash; }
          }
          $('#pname').textContent = productName(m);
          const id = fresh ? productId(m.brand, m.article) : m.id;
          $('#purl').innerHTML = m.article ? `On the site: <a href="/catalogue/${esc(id)}/" target="_blank">/catalogue/${esc(id)}/</a>` : 'Start with the photos and the article number.';
          const isDup = m.article && D().models.some((x) => x !== m && x.id === productId(m.brand, m.article));
          $('#particle').classList.toggle('is-invalid', !!isDup);
          if (k === 'article') { preview.url = `/catalogue/${m.id}/`; return; }
        }
      }
      $('#done', el).onclick = (e) => { if (!m.article) { e.preventDefault(); $('#particle').focus(); $('#particle').classList.add('is-invalid'); toast('Add the article number first.', true); } };
      $('#another', el).onclick = (e) => { if (!m.article) { e.preventDefault(); $('#particle').focus(); toast('Add the article number first.', true); } };
      $('#newColl', el).onclick = async () => { const c = await createCollection(m.brand); if (c) { m.collection = c.name; m.isNew = !!c.isNew; changed({ rerender: true }); } };
      $('#pdel', el).onclick = async () => {
        if (!(await dialog({ title: 'Delete this product?', text: `${esc(productName(m))} will be removed from the site when you publish.`, ok: 'Delete', danger: true }))) return;
        D().models.splice(D().models.indexOf(m), 1); leaveHook = null; changed(); location.hash = `#/products?brand=${m.brand}`;
      };
      const dupBtn = $('#pdup', el);
      if (dupBtn) dupBtn.onclick = () => { const c = { ...clone(m), id: `draft-${Date.now().toString(36)}`, article: '', photos: [] }; D().models.push(c); changed(); location.hash = `#/products/${c.id}`; toast('Copied the details. Add photos and the article number.'); };
      if (fresh && !m.photos.length) setTimeout(() => drop.focus?.(), 50);
    },
  };
}
function leaveHookChain(fn) { cleanups.push(fn); }
// ref for an array that must stay stable within a render
function refOf(arr) { return ref(arr); }

/* ═════════ Collections ═════════ */
async function createCollection(brand) {
  const r = await dialog({
    title: 'New collection', text: 'Products added to it are grouped under this name on the brand page and in the catalogue filters.',
    body: `${fieldWrap('Name', '<input class="input input--big" name="cname" placeholder="e.g. Queen 2028" autocomplete="off">')}
      ${fieldWrap('Brand', `<select class="select" name="cbrand">${D().brands.map((b) => `<option value="${b.slug}"${b.slug === brand ? ' selected' : ''}>${esc(b.name)}</option>`).join('')}</select>`)}
      <label class="switch"><input type="checkbox" name="cnew" checked><i></i><span>New collection<small>Its products get a “New” label</small></span></label>`,
    ok: 'Create collection',
  });
  if (!r) return null;
  const name = r.querySelector('[name=cname]').value.trim();
  if (!name) { toast('The collection needs a name.', true); return null; }
  if (D().collections.some((c) => c.name.toLowerCase() === name.toLowerCase())) { toast('A collection with this name already exists.', true); return null; }
  let slug = slugify(name) || 'collection', n = 2;
  while (D().collections.some((c) => c.slug === slug)) slug = `${slugify(name)}-${n++}`;
  const c = { slug, name, brand: r.querySelector('[name=cbrand]').value, isNew: r.querySelector('[name=cnew]').checked, cover: null };
  // Newest collection first within its brand
  const first = D().collections.findIndex((x) => x.brand === c.brand);
  D().collections.splice(first === -1 ? D().collections.length : first, 0, c);
  changed();
  toast(`Collection “${esc(name)}” created.`);
  return c;
}

function collectionList() {
  const groups = D().brands.map((b) => ({ b, list: D().collections.filter((c) => c.brand === b.slug) }));
  const r = ref(D().collections);
  const count = (c) => D().models.filter((m) => m.collection === c.name).length;
  const cover = (c) => c.cover || D().models.find((m) => m.collection === c.name && m.photos[0])?.photos[0];
  return {
    url: '/brands/queen/', anchor: '#collections',
    html: `<div class="head"><div><h1>Collections</h1><p>Group products by season or line. Drag to change the order shown on the brand page.</p></div>
      <div class="head__actions"><a class="btn btn--accent" href="#/collections/new">${ICON.plus}<span>New collection</span></a></div></div>
      ${groups.map(({ b, list }) => `<div class="brandhead"><p class="h2" style="margin:0">${esc(b.name)}</p><a class="btn btn--sm btn--ghost" href="#/collections/new?brand=${b.slug}">${ICON.plus}Add</a></div>
      ${list.length ? list.map((c) => `<a class="crow" href="#/collections/${c.slug}" draggable="true" data-drag-list="${r}" data-i="${D().collections.indexOf(c)}"><span class="list__grip">${ICON.grip}</span>${cover(c) ? `<img src="${esc(srcOf(cover(c)))}" alt="">` : '<i></i>'}<span><b>${esc(c.name)}</b><small>${count(c)} products</small></span>${c.isNew ? '<span class="badge badge--new">New</span>' : '<span></span>'}<span>${ICON.right}</span></a>`).join('') : '<p class="field__hint" style="margin:0 0 6px">No collections — products are grouped by silhouette.</p>'}`).join('')}`,
  };
}

function collectionEditor(slug, q) {
  if (slug === 'new') {
    createCollection(q.get('brand') || sessionStorage.getItem('lastBrand') || 'queen').then((c) => { location.hash = c ? `#/collections/${c.slug}` : '#/collections'; });
    return { html: '<p class="empty">Creating a collection…</p>', url: '/brands/' };
  }
  const c = D().collections.find((x) => x.slug === slug);
  if (!c) return null;
  const items = D().models.filter((m) => m.collection === c.name);
  const others = D().models.filter((m) => m.brand === c.brand && m.collection !== c.name);
  let oldName = c.name;
  return {
    url: `/brands/${c.brand}/`, anchor: '#collections',
    html: `<a class="crumb" href="#/collections">${ICON.back}Collections</a>
    <div class="head"><div><h1>${esc(c.name)}</h1><p>${esc(brandOf(c.brand)?.name)} · ${items.length} products</p></div>
      <div class="head__actions"><button class="btn btn--sm btn--danger" id="cdel">${ICON.trash}<span>Delete</span></button></div></div>
    ${section({ n: 1, title: 'Collection', anchor: '#collections', body: `
      ${text(c, 'name', 'Name', { big: true, hint: 'Renaming also updates every product in it.' })}
      ${toggle(c, 'isNew', 'New collection', 'Shows “New” on the brand page')}
      ${items.length ? `<div class="chips"><button class="btn btn--sm" id="markNew">Mark all ${items.length} products as New</button><button class="btn btn--sm" id="unmarkNew">Remove “New” from all</button></div>` : ''}` })}
    ${section({ n: 2, title: 'Products', sub: 'Click a product to edit it', anchor: '#collections', body: `
      <div class="mini">
        <a class="mini__add" href="#/products/new?brand=${c.brand}&collection=${encodeURIComponent(c.name)}"><span>${ICON.plus}<br>New product</span></a>
        ${others.length ? `<button class="mini__add" id="addExisting"><span>${ICON.plus}<br>Add existing</span></button>` : ''}
        ${items.map((m) => `<a href="#/products/${m.id}">${m.photos[0] ? `<img src="${esc(srcOf(m.photos[0]))}" alt="">` : ''}<span>${esc(m.article || 'New')}</span></a>`).join('')}
      </div>` })}
    ${items.length ? section({ n: 3, title: 'Cover photo', sub: 'Shown on the brand page. By default, the first product.', anchor: '#collections', body: `
      <div class="mini">${items.filter((m) => m.photos[0]).map((m) => `<button type="button" data-cover="${esc(m.photos[0])}" class="${(c.cover || items[0].photos[0]) === m.photos[0] ? 'is-cover' : ''}"><img src="${esc(srcOf(m.photos[0]))}" alt=""><span>${esc(m.article)}</span></button>`).join('')}</div>` }) : ''}`,
    after: (el) => {
      el.addEventListener('edit', onEdit);
      leaveHookChain(() => el.removeEventListener('edit', onEdit));
      function onEdit(e) {
        if (e.detail.dataset.k !== 'name') return;
        const name = c.name.trim();
        for (const m of D().models) if (m.collection === oldName) m.collection = name;
        for (const t of Object.values(D().site.home.collections.tabs)) for (const x of t) if (x.caption?.startsWith(oldName + ' ·')) x.caption = x.caption.replace(oldName, name);
        oldName = name;
        el.querySelector('h1').textContent = name || 'Untitled';
      }
      el.querySelectorAll('[data-cover]').forEach((b) => b.onclick = () => { c.cover = b.dataset.cover === items[0].photos[0] ? null : b.dataset.cover; changed({ rerender: true }); });
      const mk = (v) => () => { items.forEach((m) => (m.isNew = v)); changed({ rerender: true }); toast(v ? 'All products marked as New.' : '“New” removed.'); };
      $('#markNew', el) && ($('#markNew', el).onclick = mk(true));
      $('#unmarkNew', el) && ($('#unmarkNew', el).onclick = mk(false));
      const ax = $('#addExisting', el);
      if (ax) ax.onclick = async () => {
        const r = await dialog({ title: `Add products to ${esc(c.name)}`, text: 'Choose products of this brand to move into the collection.', ok: 'Add selected',
          body: `<div class="mini" style="max-height:50vh;overflow:auto">${others.map((m) => `<label style="position:relative;display:block;aspect-ratio:2/3;border-radius:6px;overflow:hidden;cursor:pointer"><input type="checkbox" value="${esc(m.id)}" style="position:absolute;left:6px;top:6px;z-index:1;width:18px;height:18px;accent-color:#1a1816">${m.photos[0] ? `<img src="${esc(srcOf(m.photos[0]))}" alt="" style="width:100%;height:100%;object-fit:cover">` : ''}<span>${esc(productName(m))}</span></label>`).join('')}</div>` });
        if (!r) return;
        const ids = [...r.querySelectorAll('input:checked')].map((x) => x.value);
        for (const m of D().models) if (ids.includes(m.id)) m.collection = c.name;
        changed({ rerender: true });
      };
      $('#cdel', el).onclick = async () => {
        if (!(await dialog({ title: `Delete “${esc(c.name)}”?`, text: `The ${items.length} products stay in the catalogue, just without a collection.`, ok: 'Delete collection', danger: true }))) return;
        for (const m of D().models) if (m.collection === c.name) m.collection = null;
        D().collections.splice(D().collections.indexOf(c), 1);
        changed(); location.hash = '#/collections';
      };
    },
  };
}

/* ═════════ Brand pages ═════════ */
function brandEditor(slug) {
  const b = brandOf(slug);
  if (!b) return null;
  const n = D().models.filter((m) => m.brand === slug).length;
  return {
    url: `/brands/${slug}/`,
    html: `<div class="head"><div><h1>${esc(b.name)}</h1><p>Brand page · <a href="#/products?brand=${slug}">${n} products</a> · <a href="#/collections">${D().collections.filter((c) => c.brand === slug).length} collections</a></p></div>
      <div class="head__actions"><a class="btn btn--sm" href="#/products/new?brand=${slug}">${ICON.plus}<span>Add ${esc(b.name)} product</span></a></div></div>
    ${section({ n: 1, title: 'First screen', sub: 'Full-width photo, name and tagline', anchor: '.bh', body: `
      ${image(b, 'heroPhoto', 'Main photo', { kind: 'hero', folder: `assets/img/hero/${slug}`, hint: 'Use a large, sharp photo — it fills the whole screen. Nothing is darkened.' })}
      ${b.heroVideo ? `<p class="card__note">A video is shown instead of the photo: ${esc(b.heroVideo)}. <button class="btn btn--sm" id="noVideo">Use the photo instead</button></p>` : ''}
      <div class="grid2">${text(b, 'name', 'Brand name')}${text(b, 'tagline', 'Tagline')}</div><p class="field__hint" style="margin-top:-8px">The tagline is also used on the homepage and in the menu.</p>` })}
    ${section({ n: 2, title: 'About the brand', anchor: '#about-brand', body: `
      ${paragraphs(b.about, 'Text')}
      ${image(b, 'aboutPhoto', 'Photo', { folder: `assets/img/brands/${slug}` })}
      ${csv(b, 'keyModels', 'Key models', 'Article numbers shown first, separated by commas.')}` })}
    ${section({ n: 3, title: 'Collections & models', anchor: '#collections', body: `<p class="card__note">Collections and the model gallery are built from your products automatically. <a href="#/collections">Manage collections</a> · <a href="#/products?brand=${slug}">Manage products</a></p>` })}
    ${section({ n: 4, title: 'Call to action', sub: 'The dark band at the bottom', anchor: '.cta-split', body: photoList(b.cta, 'Two photos', { folder: `assets/img/brands/${slug}` }) })}
    ${section({ n: 5, title: 'On the homepage and “Our brands”', anchor: null, body: `
      ${image(b, 'cover', 'Homepage tile photo', { folder: `assets/img/brands/${slug}`, alt: 'coverAlt' })}
      ${area(b, 'intro', 'Short intro on the “Our brands” page', { rows: 2 })}` })}`,
    after: (el) => { const nv = $('#noVideo', el); if (nv) nv.onclick = () => { b.heroVideo = null; changed({ rerender: true }); }; },
  };
}

/* ═════════ Content pages (built from a short description of each section) ═════════ */
// Title above its text, full width — easy to read and edit
const item2 = (x) => `${text(x, 'title', 'Title')}${area(x, 'text', 'Text', { rows: 2 })}`;
const photoObj = (o, label) => image(o, 'src', label, { alt: 'alt', removable: false });

const PAGES = {
  home: () => {
    const H = D().site.home;
    return {
      title: 'Home', url: '/', sections: [
        ['First screen', '.hero', () => `${text(H.hero, 'label', 'Small label')}${text(H.hero, 'title', 'Heading')}${area(H.hero, 'text', 'Text', { rows: 2 })}<div class="grid2">${text(H.hero, 'button', 'Button')}${text(H.hero, 'link', 'Link under the button')}</div><p class="card__note">The background video is changed by the developer.</p>`],
        ['About the group', '#about', () => `<div class="grid2">${text(H.about, 'label', 'Small label')}${text(H.about, 'title', 'Heading')}</div>${paragraphs(H.about.texts, 'Text')}<div class="grid2">${photoObj(H.about.photos[0], 'Photo 1')}${photoObj(H.about.photos[1], 'Photo 2')}</div>${fieldWrap('Numbers', listOf(H.about.stats, (x) => `<div class="grid2 grid2--short">${text(x, 'value', 'Number')}${text(x, 'label', 'Caption')}</div>`, { add: 'Add number', make: () => ({ value: '', label: '' }) }), 'Also shown on the About us page.')}`],
        ['Our brands', '#brands', () => `<div class="grid2">${text(H.brands, 'label', 'Small label')}${text(H.brands, 'title', 'Heading')}</div>${area(H.brands, 'text', 'Text', { rows: 2 })}<div class="grid2">${text(H.brands, 'ctaTitle', 'Last tile: title')}${area(H.brands, 'ctaText', 'Last tile: text', { rows: 2 })}</div><p class="card__note">Brand photos and taglines are edited on each brand page: ${D().brands.map((b) => `<a href="#/pages/brand/${b.slug}">${esc(b.name)}</a>`).join(', ')}.</p>`],
        ['Why salons work with us', '#benefits', () => `<div class="grid2">${text(H.benefits, 'label', 'Small label')}${text(H.benefits, 'title', 'Heading')}</div>${photoObj(H.benefits.photo, 'Photo')}${fieldWrap('Benefits', listOf(H.benefits.items, item2, { add: 'Add benefit', make: () => ({ title: '', text: '' }) }))}<p class="card__note">The strip of terms below it is edited in <a href="#/settings/terms">Wholesale terms</a>.</p>`],
        ['Collections tabs', '#collections', () => `<div class="grid2">${text(H.collections, 'label', 'Small label')}${text(H.collections, 'title', 'Heading')}</div>
          ${D().brands.map((b) => { const arr = H.collections.tabs[b.slug]; return fieldWrap(`${esc(b.name)} tab <small>${arr.length ? arr.length + ' photos' : 'shows key models as “coming soon”'}</small>`, listOf(arr, (x) => `<div class="grid2">${image(x, 'photo', 'Photo', { alt: 'alt', removable: false, folder: 'assets/img/models' })}<div class="field" style="align-content:start;gap:10px">${text(x, 'caption', 'Caption')}${fieldWrap('Links to product', `<select class="select" ${bind(x, 'product')}><option value="">— none —</option>${D().models.filter((m) => m.brand === b.slug).map((m) => `<option value="${m.id}"${x.product === m.id ? ' selected' : ''}>${esc(productName(m))}</option>`).join('')}</select>`)}${toggle(x, 'isNew', 'Show “New”')}</div></div>`, { add: 'Add photo', make: () => ({ photo: null, alt: '', caption: b.name, product: '', isNew: false }) })); }).join('')}`],
        ['Exclusive services', '#services', () => `<div class="grid2">${text(H.services, 'label', 'Small label')}${text(H.services, 'title', 'Heading')}</div>${area(H.services, 'text', 'Text', { rows: 2 })}${photoObj(H.services.photo, 'Photo')}${fieldWrap('Services', listOf(H.services.items, item2, { add: 'Add service', make: () => ({ title: '', text: '' }) }))}`],
        ['Call to action', '.banner', () => `<div class="grid2">${text(H.banner, 'label', 'Small label')}${text(H.banner, 'title', 'Heading')}</div>${area(H.banner, 'text', 'Text', { rows: 2 })}${text(H.banner, 'button', 'Button')}<p class="card__note">The phone number comes from <a href="#/settings/contacts">Contacts &amp; phones</a>.</p>`],
        ['Search engines', null, () => `${text(H, 'seoTitle', 'Page title (browser tab and Google)')}${area(H, 'seoDescription', 'Description in Google', { rows: 2 })}`],
      ],
    };
  },
  brands: () => {
    const P = D().site.brandsPage;
    return { title: 'Our brands', url: '/brands/', sections: [
      ['Heading', '.page-intro', () => `${text(P, 'title', 'Heading')}${area(P, 'text', 'Text', { rows: 2 })}`],
      ['Brands', '.brows', () => `<p class="card__note">Each brand row uses the brand’s main photo, tagline and intro. Edit them on the brand pages: ${D().brands.map((b) => `<a href="#/pages/brand/${b.slug}">${esc(b.name)}</a>`).join(', ')}. Brands without a main photo appear under “Coming next”.</p>`],
      ['Coming next', '.bnext-grid', () => `${text(P, 'nextTitle', 'Heading')}${area(P, 'nextText', 'Text', { rows: 2 })}`],
      ['Call to action', '.cta-split', () => `${text(P, 'ctaTitle', 'Heading')}${area(P, 'ctaText', 'Text', { rows: 2 })}`],
    ] };
  },
  about: () => {
    const A = D().site.about;
    return { title: 'About us', url: '/about/', sections: [
      ['First screen', '.bh', () => `${image(A.hero, 'photo', 'Photo', { kind: 'hero', folder: 'assets/img/hero/about', removable: false })}${text(A.hero, 'label', 'Small label')}${text(A.hero, 'title', 'Heading')}${area(A.hero, 'text', 'Text', { rows: 2 })}`],
      ['Our story', '.lead', () => `${text(A.story, 'title', 'Heading')}${paragraphs(A.story.texts, 'Text')}<p class="card__note">The numbers come from the <a href="#/pages/home">Home page → About the group</a>.</p>`],
      ['Made by hand', '.split', () => `${text(A.craft, 'title', 'Heading')}${area(A.craft, 'text', 'Text')}<div class="grid2">${photoObj(A.craft.photos[0], 'Photo 1')}${photoObj(A.craft.photos[1], 'Photo 2')}</div>${fieldWrap('Points', listOf(A.craft.items, item2, { add: 'Add point', make: () => ({ title: '', text: '' }) }))}`],
      ['What we stand for', '.adv-grid', () => `${text(A.values, 'title', 'Heading')}${fieldWrap('Values', listOf(A.values.items, item2, { add: 'Add value', make: () => ({ title: '', text: '' }) }))}`],
      ['Brands & fairs', '.blist', () => `${text(A, 'groupTitle', 'Brands heading')}${text(A, 'eventsTitle', 'Fairs heading')}${area(A, 'eventsText', 'Fairs text', { rows: 2 })}<p class="card__note">The fairs are the three newest <a href="#/blog">blog posts</a>.</p>`],
    ] };
  },
  partners: () => {
    const P = D().site.partners;
    return { title: 'Partnership', url: '/partners/', sections: [
      ['Heading', '.page-intro', () => `${text(P, 'title', 'Heading')}${area(P, 'text', 'Text', { rows: 2 })}<p class="card__note">The terms strip is edited in <a href="#/settings/terms">Wholesale terms</a>.</p>`],
      ['How cooperation works', '.steps', () => `${text(P, 'stepsTitle', 'Heading')}${fieldWrap('Steps', listOf(P.steps, item2, { add: 'Add step', make: () => ({ title: '', text: '' }) }))}`],
      ['Benefits', '.ben-grid', () => `${text(P, 'benefitsTitle', 'Heading')}${photoObj(P.benefitsPhoto, 'Photo')}${fieldWrap('Benefits', listOf(P.benefits, item2, { add: 'Add benefit', make: () => ({ title: '', text: '' }) }))}`],
      ['Exclusive services', '#services', () => `${text(P, 'servicesTitle', 'Heading')}${area(P, 'servicesText', 'Text', { rows: 2 })}${photoObj(P.servicesPhoto, 'Photo')}${fieldWrap('Services', listOf(P.services, item2, { add: 'Add service', make: () => ({ title: '', text: '' }) }))}`],
      ['Questions from salons', '.faq', () => `${text(P, 'faqTitle', 'Heading')}${fieldWrap('Questions', listOf(P.faq, (x) => `${text(x, 'q', 'Question')}${area(x, 'a', 'Answer', { rows: 2 })}`, { add: 'Add question', make: () => ({ q: '', a: '' }) }))}`],
      ['Call to action', '.cta-split', () => `${text(P, 'ctaTitle', 'Heading')}${area(P, 'ctaText', 'Text', { rows: 2 })}`],
    ] };
  },
  contact: () => {
    const P = D().site.contactPage;
    return { title: 'Contacts', url: '/contact/', sections: [
      ['Heading', '.cpage__info', () => `${text(P, 'title', 'Heading')}${area(P, 'text', 'Text', { rows: 2 })}<p class="card__note">Managers, phones, e-mail and address are edited in <a href="#/settings/contacts">Contacts &amp; phones</a>.</p>`],
      ['Enquiry form', '#enquiry', () => `${text(P, 'formTitle', 'Heading')}${area(P, 'formText', 'Text', { rows: 2 })}`],
      ['Photo strip', '.marquee', () => photoList(P.photos, 'Photos (they slide slowly to the left)', { folder: 'assets/img/pages' })],
    ] };
  },
  privacy: () => {
    const P = D().site.privacy;
    return { title: 'Privacy policy', url: '/privacy/', sections: [
      ['Policy', '.legal', () => `${text(P, 'updated', 'Date line')}${fieldWrap('Sections', listOf(P.sections, (x) => `${text(x, 'title', 'Heading')}${area(x, 'text', 'Text', { rows: 4, hint: '{email} is replaced with the e-mail link.' })}`, { add: 'Add section', make: () => ({ title: '', text: '' }) }))}`],
    ] };
  },
};

function pageEditor(key) {
  const def = PAGES[key]?.();
  if (!def) return null;
  return {
    url: def.url,
    html: `<div class="head"><div><h1>${def.title}</h1><p>Edit a section and the preview scrolls to it. Changes appear on the right as you type.</p></div></div>
      <p class="card__note" style="margin:-8px 0 16px">You are editing the English version. The PL, DE, RU, IT and EL versions keep their own translations — ask for them to be updated after larger text changes. Products, photos and collections update in every language automatically.</p>
      ${def.sections.map(([title, anchor, body], i) => section({ n: i + 1, title, anchor, body: body(), closed: i > 1 })).join('')}`,
  };
}

/* ═════════ Blog ═════════ */
function blogList() {
  const r = ref(D().posts);
  return {
    url: '/blog/',
    html: `<div class="head"><div><h1>Blog</h1><p>The first post is shown large on the blog page. Drag to change the order.</p></div>
      <div class="head__actions"><button class="btn btn--accent" id="newPost">${ICON.plus}<span>New post</span></button></div></div>
      ${section({ title: 'Page heading', anchor: '.page-intro', body: `${text(D().site.blogPage, 'title', 'Heading')}${area(D().site.blogPage, 'text', 'Text', { rows: 2 })}`, closed: true })}
      ${D().posts.map((p, i) => `<a class="crow" href="#/blog/${p.slug}" draggable="true" data-drag-list="${r}" data-i="${i}"><span class="list__grip">${ICON.grip}</span>${p.photo ? `<img src="${esc(srcOf(p.photo))}" alt="" style="width:70px;height:48px">` : '<i></i>'}<span><b>${esc(p.title)}</b><small>${esc(p.date)} · ${esc(p.tag)}</small></span>${i ? '<span></span>' : '<span class="badge">Featured</span>'}<span>${ICON.right}</span></a>`).join('')}`,
    after: (el) => { $('#newPost', el).onclick = () => {
      const p = { slug: `post-${Date.now().toString(36)}`, title: '', date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }), tag: 'News', photo: null, lead: '', body: [''] };
      D().posts.unshift(p); changed(); location.hash = `#/blog/${p.slug}`;
    }; },
  };
}
function postEditor(slug) {
  const p = D().posts.find((x) => x.slug === slug);
  if (!p) return null;
  const fresh = isNewItem('posts', 'slug', p.slug);
  leaveHook = () => { if (fresh && !p.title) { D().posts.splice(D().posts.indexOf(p), 1); changed(); } };
  return {
    url: () => `/blog/${p.slug}/`,
    html: `<a class="crumb" href="#/blog">${ICON.back}Blog</a>
    <div class="head"><div><h1 id="ptitle">${esc(p.title || 'New post')}</h1><p>/blog/${esc(p.slug)}/</p></div><div class="head__actions"><button class="btn btn--sm btn--danger" id="postDel">${ICON.trash}<span>Delete</span></button></div></div>
    ${section({ n: 1, title: 'Post', anchor: '.article', body: `${text(p, 'title', 'Title', { big: true })}<div class="grid2">${text(p, 'date', 'Date', { placeholder: '17–18 May 2025' })}${text(p, 'tag', 'Category', { placeholder: 'Trade fair' })}</div>${image(p, 'photo', 'Photo', { kind: 'wide', folder: 'assets/img/blog' })}` })}
    ${section({ n: 2, title: 'Text', anchor: '.article__body', body: `${area(p, 'lead', 'Introduction (shown larger)', { rows: 3 })}${paragraphs(p.body, 'Paragraphs', { rows: 4 })}` })}`,
    after: (el) => {
      el.addEventListener('edit', onEdit); leaveHookChain(() => el.removeEventListener('edit', onEdit));
      function onEdit(e) {
        if (e.detail.dataset.k !== 'title') return;
        $('#ptitle').textContent = p.title || 'New post';
        if (fresh && p.title) { let s = slugify(p.title).slice(0, 60) || 'post', n = 2; const base = s; while (D().posts.some((x) => x !== p && x.slug === s)) s = `${base}-${n++}`; p.slug = s; history.replaceState(null, '', `#/blog/${s}`); $('#screen').dataset.route = location.hash; el.querySelector('.head p').textContent = `/blog/${s}/`; preview.url = `/blog/${s}/`; }
      }
      $('#postDel', el).onclick = async () => { if (!(await dialog({ title: 'Delete this post?', ok: 'Delete', danger: true }))) return; D().posts.splice(D().posts.indexOf(p), 1); leaveHook = null; changed(); location.hash = '#/blog'; };
    },
  };
}

/* ═════════ Settings ═════════ */
function settingsEditor(key) {
  const S = D().site;
  if (key === 'contacts') return {
    url: '/contact/',
    html: `<div class="head"><div><h1>Contacts &amp; phones</h1><p>Used in the header, footer, contact page and every “call” button.</p></div></div>
    ${section({ n: 1, title: 'Main contacts', anchor: '.cpage__info', body: `<div class="grid2">${text(S.contact, 'phone', 'Main phone', { hint: 'In the header, banners and “Ask a manager”.' })}${text(S.contact, 'email', 'E-mail')}</div>${text(S.contact, 'company', 'Company name')}<div class="grid2">${text(S.contact, 'address', 'Address (contact page)')}${text(S.contact, 'addressShort', 'Address (footer)')}</div>` })}
    ${section({ n: 2, title: 'Managers', anchor: '.clist', body: listOf(S.contact.managers, (m) => `<div class="grid2 grid2--short">${text(m, 'name', 'Name')}${text(m, 'phone', 'Phone')}${text(m, 'market', 'Market (contact page)')}${text(m, 'country', 'Country (footer)')}</div>`, { add: 'Add manager', make: () => ({ name: '', market: '', country: '', phone: '' }) }) })}`,
  };
  if (key === 'terms') return {
    url: '/partners/', anchor: '#terms',
    html: `<div class="head"><div><h1>Wholesale terms</h1><p>The strip of four terms on the homepage, Our brands and Partnership pages.</p></div></div>
    ${section({ n: 1, title: 'Terms', anchor: '#terms', body: listOf(S.terms, (t) => `<div class="grid3">${text(t, 'label', 'Label')}${text(t, 'value', 'Main value')}${text(t, 'note', 'Small note')}</div>`, { add: 'Add term', make: () => ({ label: '', value: '', note: '' }) }) })}`,
  };
  if (key === 'nav') return {
    url: '/',
    html: `<div class="head"><div><h1>Menu, footer &amp; banners</h1><p>Shared parts that appear on every page.</p></div></div>
    ${section({ n: 1, title: 'Brands menu', sub: 'Opens from “Brands” in the header', body: `${area(S.nav, 'megaText', 'Text', { rows: 2 })}${text(S.nav, 'featureTitle', 'Featured collection title')}${fieldWrap('Featured collection link', `<select class="select" id="featLink">${D().collections.map((c) => { const href = `/catalogue/?brand=${c.brand}&collection=${c.slug}`; return `<option value="${esc(href)}"${S.nav.featureLink === href ? ' selected' : ''}>${esc(c.name)}</option>`; }).join('')}</select>`)}${image(S.nav, 'featurePhoto', 'Featured photo', { folder: 'assets/img/models', removable: false })}` })}
    ${section({ n: 2, title: 'Footer', anchor: '.footer', body: text(S.nav, 'footerTagline', 'Tagline under the logo') })}
    ${section({ n: 3, title: 'Dark call-to-action banners', sub: 'At the bottom of the company and brand pages', anchor: '.cta-split', body: `${text(S.cta, 'title', 'Heading')}${text(S.cta, 'brandTitle', 'Heading on brand pages', { hint: '{brand} is replaced with the brand name.' })}${area(S.cta, 'text', 'Text', { rows: 2 })}${text(S.cta, 'button', 'Button')}${photoList(S.cta.photos, 'Two photos', { folder: 'assets/img/pages' })}` })}`,
    after: (el) => { $('#featLink', el).onchange = (e) => { S.nav.featureLink = e.target.value; changed(); }; },
  };
  return null;
}

/* ═════════ Publish ═════════ */
async function publishDialog() {
  const c = changes();
  if (!c.length) return;
  if (state.mode === 'demo') {
    await dialog({ title: 'Demo mode', text: `This is a preview of the admin panel. Your ${c.length} change${c.length > 1 ? 's are' : ' is'} kept in this browser, but publishing to the site is switched off until the admin is connected to GitHub.`, ok: 'OK', cancel: '' });
    return;
  }
  const incomplete = D().models.filter((m) => !m.article || !m.photos.length || !m.sil || !m.fabric || !m.sleeves);
  const r = await dialog({
    title: 'Publish to the site',
    text: state.mode === 'github' ? 'Your changes go live in about a minute.' : 'Local mode: the pages in this folder are rebuilt.',
    body: `<ul class="changes">${c.map((x) => `<li class="is-${x.type}"><em>${{ add: 'New', edit: 'Edited', del: 'Deleted' }[x.type]}</em>${esc(x.text)}</li>`).join('')}</ul>
      ${incomplete.length ? `<p class="card__note" style="color:var(--warn)">${incomplete.length} product${incomplete.length > 1 ? 's are' : ' is'} missing photos, an article or details: ${incomplete.slice(0, 4).map((m) => `<a href="#/products/${m.id}">${esc(productName(m))}</a>`).join(', ')}. ${incomplete.some((m) => !m.article) ? 'Products without an article are not published.' : 'They will still be published.'}</p>` : ''}
      <button type="button" class="btn btn--sm btn--ghost btn--danger" id="discard" style="justify-self:start">Discard all changes</button>`,
    ok: `Publish ${c.length} change${c.length > 1 ? 's' : ''}`,
    onOpen: (el) => { $('#discard', el).onclick = async () => { el.remove(); if (await dialog({ title: 'Discard all changes?', text: 'Everything you changed since the last publish will be lost.', ok: 'Discard', danger: true })) { state.data = clone(state.base); state.uploads = []; clearDraft(); changed(); renderRoute(); toast('Changes discarded.'); } }; },
  });
  if (!r) return;
  const btn = $('#publishBtn');
  btn.disabled = true; btn.textContent = 'Publishing…';
  try {
    // Products without an article can't have a page yet
    const data = clone(state.data);
    data.models = data.models.filter((m) => m.article);
    const summary = c.slice(0, 3).map((x) => x.text).join('; ');
    const res = await api('publish', { data, uploads: state.uploads, message: `Admin: ${summary}${c.length > 3 ? ` and ${c.length - 3} more` : ''}` });
    state.base = clone(data);
    state.data = clone(data);
    state.uploads = [];
    if (res.commit) state.head = res.commit;
    clearDraft();
    changed();
    renderRoute();
    toast(state.mode === 'github' ? 'Published. The site updates in about a minute. <a href="/" target="_blank">Open site</a>' : `Published — ${res.changed} files updated.`, false, 6000);
  } catch (e) {
    toast('Publishing failed: ' + esc(e.message), true, 8000);
  } finally {
    btn.textContent = 'Publish'; updateStatus();
  }
}

boot();
