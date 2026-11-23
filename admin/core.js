// Admin core: state, API, change tracking, live preview, image processing, form fields.
import { createSite, LABELS, slugify, esc } from '/lib/render.mjs';
export { LABELS, slugify, esc };

/* ───────── Icons ───────── */
const I = (d, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"${extra}>${d}</svg>`;
export const ICON = {
  plus: I('<path d="M12 5v14M5 12h14"/>'),
  dress: I('<path d="M9 3h6l-1 4 4 13H6l4-13z"/><path d="M10 7h4"/>'),
  stack: I('<rect x="4" y="4" width="16" height="6" rx="1.5"/><rect x="4" y="14" width="16" height="6" rx="1.5"/>'),
  home: I('<path d="M4 11l8-7 8 7v9H4z"/><path d="M10 20v-6h4v6"/>'),
  page: I('<path d="M6 3h9l4 4v14H6z"/><path d="M14 3v5h5"/>'),
  tag: I('<path d="M3 12V4h8l9 9-8 8z"/><circle cx="7.5" cy="7.5" r="1.3"/>'),
  blog: I('<path d="M5 4h14v16H5z"/><path d="M8 8h8M8 12h8M8 16h5"/>'),
  phone: I('<path d="M7 3H4.5C3.7 3 3 3.7 3 4.5 3.5 13 11 20.5 19.5 21c.8 0 1.5-.7 1.5-1.5V17l-4-1.6-1.8 2c-2.4-1.1-4.4-3.1-5.5-5.5l2-1.8z"/>'),
  list: I('<path d="M8 6h12M8 12h12M8 18h12"/><circle cx="4" cy="6" r="1"/><circle cx="4" cy="12" r="1"/><circle cx="4" cy="18" r="1"/>'),
  menu: I('<path d="M4 7h16M4 12h16M4 17h16"/>'),
  grid: I('<rect x="4" y="4" width="7" height="7" rx="1"/><rect x="13" y="4" width="7" height="7" rx="1"/><rect x="4" y="13" width="7" height="7" rx="1"/><rect x="13" y="13" width="7" height="7" rx="1"/>'),
  search: I('<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.5-4.5"/>'),
  back: I('<path d="M15 5l-7 7 7 7"/>'),
  chev: I('<path d="M6 9l6 6 6-6"/>'),
  left: I('<path d="M15 6l-6 6 6 6"/>'),
  right: I('<path d="M9 6l6 6-6 6"/>'),
  up: I('<path d="M6 15l6-6 6 6"/>'),
  down: I('<path d="M6 9l6 6 6-6"/>'),
  x: I('<path d="M6 6l12 12M18 6 6 18"/>'),
  trash: I('<path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13"/>'),
  copy: I('<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>'),
  ext: I('<path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6"/>'),
  upload: I('<path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v4h16v-4"/>'),
  grip: I('<circle cx="9" cy="6" r="1.2"/><circle cx="15" cy="6" r="1.2"/><circle cx="9" cy="12" r="1.2"/><circle cx="15" cy="12" r="1.2"/><circle cx="9" cy="18" r="1.2"/><circle cx="15" cy="18" r="1.2"/>', ' fill="currentColor"'),
  desktop: I('<rect x="3" y="4" width="18" height="12" rx="1.5"/><path d="M9 20h6M12 16v4"/>'),
  tablet: I('<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M11 18h2"/>'),
  mobile: I('<rect x="7" y="3" width="10" height="18" rx="2"/><path d="M11 18h2"/>'),
  eye: I('<path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>'),
  refresh: I('<path d="M20 11a8 8 0 1 0-2.3 5.7M20 4v7h-7"/>'),
  settings: I('<circle cx="12" cy="12" r="3"/><path d="M19 12a7 7 0 0 0-.1-1.2l2-1.5-2-3.4-2.3 1a7 7 0 0 0-2-1.2L14 3h-4l-.6 2.7a7 7 0 0 0-2 1.2l-2.3-1-2 3.4 2 1.5a7 7 0 0 0 0 2.4l-2 1.5 2 3.4 2.3-1a7 7 0 0 0 2 1.2L10 21h4l.6-2.7a7 7 0 0 0 2-1.2l2.3 1 2-3.4-2-1.5c.1-.4.1-.8.1-1.2z"/>'),
  check: I('<path d="M5 12.5l4.5 4.5L19 7.5"/>'),
};

/* ───────── API ───────── */
const TOKEN_KEY = 'queen-admin-token';
// Demo mode (site not connected to GitHub): content is read from the public /data files,
// photos stay in the browser and publishing is switched off.
const DEMO_FILES = ['brands', 'models', 'collections', 'posts', 'site', 'translations'];
async function demoApi(action, body) {
  if (action === 'content') {
    const data = {};
    await Promise.all(DEMO_FILES.map(async (f) => { const r = await fetch(`/data/${f}.json`, { cache: 'no-store' }); data[f] = await r.json(); }));
    return { data, mode: 'demo', head: null };
  }
  if (action === 'upload') return { path: body.path, sha: null };
  throw new Error('Publishing is switched off in demo mode.');
}
export const auth = {
  get token() { try { return localStorage.getItem(TOKEN_KEY) || ''; } catch { return ''; } },
  set token(v) { try { v ? localStorage.setItem(TOKEN_KEY, v) : localStorage.removeItem(TOKEN_KEY); } catch { /* private mode */ } },
};
export async function api(action, body) {
  if (auth.token === 'demo' && action !== 'login') return demoApi(action, body);
  const res = await fetch(`/api/${action}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.token}` },
    body: body ? JSON.stringify(body) : undefined,
  });
  let json = {};
  try { json = await res.json(); } catch { /* not json */ }
  if (res.status === 401 && action !== 'login') { auth.token = ''; location.reload(); }
  if (!res.ok) throw new Error(json.error || `Request failed (${res.status})`);
  return json;
}

/* ───────── State ───────── */
const DRAFT_KEY = 'queen-admin-draft';
export const clone = (x) => JSON.parse(JSON.stringify(x));
export const state = {
  base: null, // last published content
  data: null, // working copy
  head: null,
  mode: 'local',
  uploads: [], // [{ path, sha }]
  blobs: new Map(), // path → object URL (photos uploaded in this session)
  listeners: new Set(),
};

export function saveDraft() {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ data: state.data, uploads: state.uploads, head: state.head })); } catch { /* full */ }
}
export function readDraft() { try { return JSON.parse(localStorage.getItem(DRAFT_KEY) || 'null'); } catch { return null; } }
export function clearDraft() { try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ } }

let saveTimer;
// Call after every edit
export function changed({ rerender = false } = {}) {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(saveDraft, 250);
  for (const fn of state.listeners) fn({ rerender });
}
export const onChange = (fn) => state.listeners.add(fn);

export const srcOf = (path) => state.blobs.get(path) || path;

/* ───────── Change tracking ───────── */
const SITE_SECTIONS = {
  home: ['Home page', '#/pages/home'], brandsPage: ['Our brands page', '#/pages/brands'], about: ['About us page', '#/pages/about'],
  partners: ['Partnership page', '#/pages/partners'], contactPage: ['Contacts page', '#/pages/contact'], blogPage: ['Blog page', '#/blog'],
  privacy: ['Privacy policy', '#/pages/privacy'], contact: ['Contacts & phones', '#/settings/contacts'], terms: ['Wholesale terms', '#/settings/terms'],
  nav: ['Menu & footer', '#/settings/nav'], cta: ['Call-to-action banners', '#/settings/nav'],
};
export function changes() {
  if (!state.base) return [];
  const out = [];
  const diff = (kind, a, b, key, label, route) => {
    const A = new Map(a.map((x) => [x[key], x])), B = new Map(b.map((x) => [x[key], x]));
    for (const [k, x] of B) {
      if (!A.has(k)) out.push({ type: 'add', text: `${kind}: ${label(x)}`, route: route(x) });
      else if (JSON.stringify(A.get(k)) !== JSON.stringify(x)) out.push({ type: 'edit', text: `${kind}: ${label(x)}`, route: route(x) });
    }
    for (const [k, x] of A) if (!B.has(k)) out.push({ type: 'del', text: `${kind}: ${label(x)}`, route: null });
    if (a.length === b.length && out.length === 0 && a.map((x) => x[key]).join() !== b.map((x) => x[key]).join()) out.push({ type: 'edit', text: `${kind}: new order`, route: null });
  };
  const D = state.data, B = state.base;
  diff('Product', B.models, D.models, 'id', (m) => productName(m), (m) => `#/products/${m.id}`);
  diff('Collection', B.collections, D.collections, 'slug', (c) => c.name, (c) => `#/collections/${c.slug}`);
  diff('Brand page', B.brands, D.brands, 'slug', (b) => b.name, (b) => `#/pages/brand/${b.slug}`);
  diff('Blog post', B.posts, D.posts, 'slug', (p) => p.title, (p) => `#/blog/${p.slug}`);
  for (const k of Object.keys(D.site)) {
    if (JSON.stringify(B.site[k]) !== JSON.stringify(D.site[k])) {
      const [text, route] = SITE_SECTIONS[k] || [k, null];
      out.push({ type: 'edit', text, route });
    }
  }
  return out;
}

export function productName(m) {
  const b = state.data.brands.find((x) => x.slug === m.brand);
  return m.article ? `${m.collection || b?.name || ''} · ${m.article}` : 'New product (no article yet)';
}
export const isNewItem = (list, key, val) => !state.base[list].some((x) => x[key] === val);

/* ───────── Live preview ───────── */
const DEVICES = { desktop: 1440, tablet: 834, phone: 390 };
export const preview = {
  url: '/', device: 'desktop', frame: null, stage: null, timer: 0, anchor: null,
  mount(stage, frame) {
    this.stage = stage; this.frame = frame;
    new ResizeObserver(() => this.fit()).observe(stage);
    window.addEventListener('message', (e) => {
      if (e.source === frame.contentWindow && e.data?.type === 'nav') this.onNav?.(e.data.href);
    });
  },
  fit() {
    if (!this.stage) return;
    const w = DEVICES[this.device], sw = this.stage.clientWidth, sh = this.stage.clientHeight;
    const pad = this.device === 'desktop' ? 0 : 24;
    const scale = Math.min(1, (sw - pad * 2) / w);
    this.frame.style.width = w + 'px';
    this.frame.style.height = (sh - pad * 2) / scale + 'px';
    this.frame.style.transform = `translate(${Math.max(pad, (sw - w * scale) / 2)}px, ${pad}px) scale(${scale})`;
    this.stage.classList.toggle('is-device', this.device !== 'desktop');
  },
  show(url, anchor) {
    const same = url === this.url;
    this.url = url;
    if (anchor !== undefined) this.anchor = anchor;
    this.refresh(!same);
  },
  refresh(resetScroll = false) {
    clearTimeout(this.timer);
    this.timer = setTimeout(() => this.render(resetScroll), 220);
  },
  render(resetScroll) {
    if (!this.frame || !state.data) return;
    let html;
    try { html = createSite(state.data).render(this.url); } catch (e) { console.error(e); html = `<p style="font:14px sans-serif;padding:40px">Preview error: ${esc(e.message)}</p>`; }
    if (!html) html = '<p style="font:14px sans-serif;padding:40px;color:#777">This page will appear after it has a name.</p>';
    for (const [path, url] of state.blobs) html = html.split(path).join(url);
    const helper = `<style>.js .reveal,.js .fade{opacity:1!important;transform:none!important;transition:none!important}html{scroll-behavior:auto!important}</style>
<script>document.addEventListener('click',function(e){var a=e.target.closest('a[href]');if(!a)return;var h=a.getAttribute('href');if(!h||h.charAt(0)==='#'||/^(tel|mailto):/.test(h))return;e.preventDefault();parent.postMessage({type:'nav',href:h},'*');},true);document.addEventListener('submit',function(e){e.preventDefault();},true);<\/script>`;
    html = html.replace('</head>', helper + '</head>');
    const win = this.frame.contentWindow;
    const y = !resetScroll && win ? win.scrollY : 0;
    const anchor = resetScroll ? this.anchor : null;
    const query = (this.url.split('?')[1] || '');
    if (query) html = html.replace('<head>', `<head><script>history.replaceState(null,'','?${query.replace(/[^\w=&%.-]/g, '')}');<\/script>`);
    this.frame.onload = () => {
      const w = this.frame.contentWindow;
      if (anchor) { const el = w.document.querySelector(anchor); if (el) { el.scrollIntoView({ block: 'start' }); return; } }
      if (y) w.scrollTo(0, y);
    };
    this.frame.srcdoc = html;
  },
  scrollTo(anchor) {
    this.anchor = anchor;
    const doc = this.frame?.contentDocument;
    const el = anchor && doc?.querySelector(anchor);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  },
  setDevice(d) { this.device = d; this.fit(); },
};

/* ───────── Images: crop/resize in the browser, then upload ───────── */
const loadImage = (file) => new Promise((ok, fail) => {
  const url = URL.createObjectURL(file);
  const img = new Image();
  img.onload = () => ok(img);
  img.onerror = () => fail(new Error(`Can't read ${file.name}`));
  img.src = url;
});
// ratio: w/h to crop to (null = keep), focusY: 0 top … 1 bottom
function draw(img, maxW, ratio, focusY = 0.15) {
  let sx = 0, sy = 0, sw = img.naturalWidth, sh = img.naturalHeight;
  if (ratio) {
    if (sw / sh > ratio) { const nw = sh * ratio; sx = (sw - nw) / 2; sw = nw; }
    else { const nh = sw / ratio; sy = (sh - nh) * focusY; sh = nh; }
  }
  const w = Math.round(Math.min(maxW, sw)), h = Math.round(w * sh / sw);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, w, h);
  return new Promise((ok) => c.toBlob(ok, 'image/jpeg', 0.84));
}
const toBase64 = (blob) => new Promise((ok) => { const r = new FileReader(); r.onload = () => ok(r.result); r.readAsDataURL(blob); });
const stamp = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// Kinds of photos and the files they produce. Returns the main path.
export const VARIANTS = {
  product: (base) => [{ path: `${base}.jpg`, w: 900, ratio: 2 / 3 }, { path: `${base}-lg.jpg`, w: 1400, ratio: 2 / 3 }],
  portrait: (base) => [{ path: `${base}.jpg`, w: 1400, ratio: 2 / 3 }],
  hero: (base) => [{ path: `${base}-2560.jpg`, w: 2560, ratio: null }, { path: `${base}-1200.jpg`, w: 1200, ratio: null }],
  wide: (base) => [{ path: `${base}.jpg`, w: 1400, ratio: 3 / 2 }],
};
export async function uploadImage(file, kind, folder) {
  if (!/^image\//.test(file.type)) throw new Error(`${file.name} is not an image`);
  const img = await loadImage(file);
  const base = `${folder}/${stamp()}`;
  const parts = VARIANTS[kind](base);
  for (const p of parts) {
    const blob = await draw(img, p.w, p.ratio);
    const res = await api('upload', { path: p.path, data: await toBase64(blob) });
    if (res.sha) state.uploads.push({ path: res.path, sha: res.sha });
    state.blobs.set('/' + p.path, URL.createObjectURL(blob));
  }
  return '/' + parts[0].path;
}

/* ───────── Small UI helpers ───────── */
export function toast(msg, err = false, ms = 3600) {
  const el = document.createElement('div');
  el.className = 'toast' + (err ? ' toast--err' : '');
  el.innerHTML = msg;
  document.getElementById('toasts').append(el);
  setTimeout(() => el.remove(), ms);
}
export function dialog({ title, text = '', body = '', ok = 'OK', cancel = 'Cancel', danger = false, onOpen }) {
  return new Promise((done) => {
    const el = document.createElement('div');
    el.className = 'dlg';
    el.innerHTML = `<div class="dlg__box" role="dialog" aria-modal="true" aria-label="${esc(title)}">
      <h3>${esc(title)}</h3>${text ? `<p>${text}</p>` : ''}
      ${body ? `<div class="dlg__body">${body}</div>` : ''}
      <div class="dlg__foot">${cancel ? `<button class="btn" data-r="0">${cancel}</button>` : ''}<button class="btn ${danger ? 'btn--danger' : 'btn--primary'}" data-r="1">${ok}</button></div></div>`;
    const close = (r) => { el.remove(); document.removeEventListener('keydown', key); done(r); };
    const key = (e) => { if (e.key === 'Escape') close(false); if (e.key === 'Enter' && e.target.tagName !== 'TEXTAREA' && !e.target.closest('button')) { e.preventDefault(); close(el); } };
    el.addEventListener('click', (e) => { if (e.target === el) close(false); const b = e.target.closest('[data-r]'); if (b) close(b.dataset.r === '1' ? el : false); });
    document.addEventListener('keydown', key);
    document.body.append(el);
    onOpen?.(el);
    (el.querySelector('input, textarea, select') || el.querySelector('[data-r="1"]')).focus();
  });
}

/* ───────── Binding: inputs write straight into data objects ───────── */
// Each render registers the objects its fields edit; fields carry data-o (object ref) and data-k (key).
export const refs = { map: new Map(), n: 0, reset() { this.map.clear(); this.n = 0; makers.clear(); } };
export const ref = (obj) => { const id = 'o' + (++refs.n); refs.map.set(id, obj); return id; };
export const bind = (obj, key) => `data-o="${ref(obj)}" data-k="${esc(key)}"`;

export function readBound(el) {
  const obj = refs.map.get(el.dataset.o);
  if (!obj) return;
  const key = el.dataset.k;
  let v = el.type === 'checkbox' ? el.checked : el.value;
  if (el.dataset.list === 'csv') v = String(v).split(',').map((s) => s.trim()).filter(Boolean);
  obj[key] = v;
}

/* ───────── Field renderers ───────── */
export const fieldWrap = (label, inner, hint = '', extra = '') => `<div class="field"${extra}>${label ? `<span class="field__label">${label}</span>` : ''}${inner}${hint ? `<p class="field__hint">${hint}</p>` : ''}</div>`;

export function text(obj, key, label, { hint = '', placeholder = '', big = false, rerender = false } = {}) {
  return fieldWrap(label, `<input class="input${big ? ' input--big' : ''}" ${bind(obj, key)} value="${esc(obj[key])}" placeholder="${esc(placeholder)}"${rerender ? ' data-rerender' : ''}>`, hint);
}
export function area(obj, key, label, { hint = '', rows = 3, placeholder = '' } = {}) {
  return fieldWrap(label, `<textarea class="textarea" rows="${rows}" ${bind(obj, key)} placeholder="${esc(placeholder)}">${esc(obj[key])}</textarea>`, hint);
}
export function toggle(obj, key, label, sub = '', { rerender = true } = {}) {
  return `<label class="switch"><input type="checkbox" ${bind(obj, key)}${obj[key] ? ' checked' : ''}${rerender ? ' data-rerender' : ''}><i></i><span>${label}${sub ? `<small>${sub}</small>` : ''}</span></label>`;
}
export function csv(obj, key, label, hint = '') {
  return fieldWrap(label, `<input class="input" ${bind(obj, key)} data-list="csv" value="${esc((obj[key] || []).join(', '))}">`, hint || 'Separate with commas');
}
// Single/multi choice as chips; act handler in app.js reads data-chip
export function chips(obj, key, options, { multi = false, allowNone = false, noneLabel = 'None' } = {}) {
  const cur = obj[key];
  const on = (v) => (multi ? (cur || []).includes(v) : cur === v);
  const r = ref(obj);
  return `<div class="chips">${allowNone ? `<button type="button" class="chip" data-chip data-o="${r}" data-k="${key}" data-v="" aria-pressed="${!cur}">${noneLabel}</button>` : ''}${options.map(([v, l]) => `<button type="button" class="chip" data-chip${multi ? ' data-multi' : ''} data-o="${r}" data-k="${key}" data-v="${esc(v)}" aria-pressed="${on(v)}">${l}</button>`).join('')}</div>`;
}

// Image: kind = product|portrait|hero|wide; stores the path in obj[key]
export function image(obj, key, label, { kind = 'portrait', folder = 'assets/uploads', hint = '', alt = null, removable = true } = {}) {
  const r = ref(obj), v = obj[key];
  const cls = kind === 'hero' ? ' img-field__thumb--hero' : kind === 'wide' ? ' img-field__thumb--wide' : '';
  return fieldWrap(label, `<div class="img-field">
      <span class="img-field__thumb${cls}${v ? '' : ' is-empty'}"${v ? ` style="background-image:url('${esc(srcOf(v))}')"` : ''}></span>
      <div class="img-field__side">
        <div class="img-field__row">
          <label class="btn btn--sm">${ICON.upload}<span>${v ? 'Replace photo' : 'Upload photo'}</span><input class="sr" type="file" accept="image/*" data-img data-o="${r}" data-k="${key}" data-kind="${kind}" data-folder="${folder}"></label>
          ${v && removable ? `<button type="button" class="btn btn--sm btn--ghost" data-img-clear data-o="${r}" data-k="${key}">Remove</button>` : ''}
        </div>
        ${alt ? `<input class="input" ${bind(obj, alt)} value="${esc(obj[alt])}" placeholder="Short description of the photo (for search engines)">` : ''}
        ${v ? `<span class="img-field__path">${esc(v)}</span>` : ''}
      </div>
    </div>`, hint);
}

// Repeating list of objects: fields(item) returns inner HTML for each item
export const makers = new Map(); // list ref → factory for new items
export function list(arr, fields, { add = 'Add', make = () => ({}), min = 0 } = {}) {
  const r = ref(arr);
  makers.set(r, make);
  return `<div class="list" data-list-ref="${r}">${arr.map((item, i) => `<div class="list__item" draggable="true" data-drag-list="${r}" data-i="${i}">
      <span class="list__grip" title="Drag to reorder">${ICON.grip}</span>
      <div class="list__fields">${fields(item, i)}</div>
      <div class="list__tools">
        <button type="button" class="icon-btn" title="Move up" data-move="${r}" data-i="${i}" data-d="-1"${i ? '' : ' disabled'}>${ICON.up}</button>
        <button type="button" class="icon-btn" title="Remove" data-remove="${r}" data-i="${i}"${arr.length <= min ? ' disabled' : ''}>${ICON.trash}</button>
      </div></div>`).join('')}
    <button type="button" class="btn btn--sm list__add" data-add="${r}">${ICON.plus}<span>${add}</span></button>
    </div>`;
}
export const listOf = list;
// List of plain strings (paragraphs)
export function paragraphs(arr, label, { add = 'Add paragraph', rows = 3 } = {}) {
  return fieldWrap(label, listOf(arr, (_, i) => `<textarea class="textarea" rows="${rows}" ${bind(arr, i)}>${esc(arr[i])}</textarea>`, { add, make: () => '' }));
}
// Photo strip (array of paths)
export function photoList(arr, label, { kind = 'portrait', folder = 'assets/uploads', hint = '' } = {}) {
  const r = ref(arr);
  return fieldWrap(label, `<div class="photos">${arr.map((p, i) => `<div class="ph" draggable="true" data-drag-list="${r}" data-i="${i}"><img src="${esc(srcOf(p))}" alt=""><button type="button" class="ph__del" title="Remove" data-remove="${r}" data-i="${i}">${ICON.x}</button></div>`).join('')}
    <label class="drop" style="aspect-ratio:2/3;padding:8px">${ICON.plus}<span>Add</span><input type="file" accept="image/*" multiple data-img-list="${r}" data-kind="${kind}" data-folder="${folder}"></label></div>`, hint);
}

// A section card. anchor = CSS selector in the preview to scroll to.
export function section({ n, title, sub = '', anchor = '', body, closed = false, flush = false }) {
  return `<section class="card${closed ? ' is-closed' : ''}"${anchor ? ` data-anchor="${esc(anchor)}"` : ''}>
    <button type="button" class="card__head" data-toggle-card aria-expanded="${!closed}">
      ${n ? `<span class="card__num">${n}</span>` : ''}
      <span><h2>${title}</h2>${sub ? `<p>${sub}</p>` : ''}</span>
      <span class="card__chev">${ICON.chev}</span>
    </button>
    <div class="card__body${flush || !n ? ' card__body--flush' : ''}">${body}</div>
  </section>`;
}
