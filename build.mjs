// Generates the inner pages from data/*.json, reusing the header, menus and footer from index.html.
// Usage: node build.mjs
//   brands/{slug}/index.html     — one page per brand
//   catalogue/index.html         — one catalogue for all brands (brand = first filter)
//   catalogue/{id}/index.html    — one page per model
import { readFileSync, writeFileSync, mkdirSync, rmSync, existsSync } from 'node:fs';

const brands = JSON.parse(readFileSync('data/brands.json', 'utf8'));
const models = JSON.parse(readFileSync('data/models.json', 'utf8'));
const home = readFileSync('index.html', 'utf8');
const SITE = 'https://queen-dress.com';

/* ───────── Labels ───────── */
const L = {
  sil: { aline: 'A-line', ball: 'Ball gown', mermaid: 'Mermaid', sheath: 'Sheath', short: 'Short' },
  sleeves: { long: 'Long sleeves', detachable: 'Detachable sleeves', offshoulder: 'Off-the-shoulder', straps: 'Straps', strapless: 'Strapless' },
  fabric: { lace: 'Lace', tulle: 'Tulle', satin: 'Satin', glitter: 'Glitter tulle' },
  details: { slit: 'High slit', overskirt: 'Detachable overskirt', cape: 'Cape' },
};
const brandBy = Object.fromEntries(brands.map((b) => [b.slug, b]));
const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const modelName = (m) => `${m.collection || brandBy[m.brand].name} · ${m.article}`;

function describe(m) {
  const sil = { aline: 'A-line', ball: 'Ball gown', mermaid: 'Mermaid', sheath: 'Sheath', short: 'Short' }[m.sil];
  const fabric = { lace: 'lace', tulle: 'tulle', satin: 'satin', glitter: 'glitter tulle' }[m.fabric];
  const sleeves = {
    long: 'with long sleeves', detachable: 'with detachable sleeves', offshoulder: 'with an off-the-shoulder neckline',
    straps: 'on straps', strapless: 'with a strapless corset bodice',
  }[m.sleeves];
  const extra = m.details.map((d) => ({ slit: 'a high slit', overskirt: 'a detachable overskirt', cape: 'a cape' }[d]));
  let s = `${sil} wedding dress in ${fabric} ${sleeves}`;
  if (extra.length) s += (m.sleeves === 'straps' ? ', with ' : ' and ') + extra.join(' and ');
  return s + '.';
}

/* Order inside a brand: key models first, then by collection order, then article */
const collOrder = ['Queen 2027', 'Paradise', 'Floria'];
function ordered(slug) {
  const keys = brandBy[slug].keyModels;
  return models
    .filter((m) => m.brand === slug)
    .sort((a, b) => {
      const ka = keys.indexOf(a.article), kb = keys.indexOf(b.article);
      if ((ka > -1) !== (kb > -1)) return ka > -1 ? -1 : 1;
      if (ka > -1) return ka - kb;
      const ca = collOrder.indexOf(a.collection), cb = collOrder.indexOf(b.collection);
      if (ca !== cb) return ca - cb;
      return a.article.localeCompare(b.article, 'en', { numeric: true });
    });
}
const byBrand = Object.fromEntries(brands.map((b) => [b.slug, ordered(b.slug)]));
const catalogueOrder = brands.flatMap((b) => byBrand[b.slug]);

/* ───────── Shared chrome from index.html ───────── */
const pick = (re) => { const m = home.match(re); if (!m) throw new Error('Not found in index.html: ' + re); return m[0]; };
const toHome = (html) => html
  .replace(/href="#(about|brands|services|benefits|collections)"/g, 'href="/#$1"')
  .replace(/href="#top"/g, 'href="/"');
const header = toHome(pick(/<header class="header"[\s\S]*?<\/header>/));
const mega = toHome(pick(/<div class="mega"[\s\S]*?\n<\/div>\n/));
const menu = toHome(pick(/<div class="menu"[\s\S]*?\n<\/div>\n/));
const footer = toHome(pick(/<footer class="footer">[\s\S]*?<\/footer>/)).replace('<a class="to-top" href="/">', '<a class="to-top" href="#top">');

function page({ title, description, path, body, scripts = '', current }) {
  let head = header;
  if (current) head = head.replace(`<a class="u-link" href="/catalogue/">`, `<a class="u-link" href="/catalogue/"${current === 'catalogue' ? ' aria-current="page"' : ''}>`);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE}${path}">
<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%231a1816'/%3E%3Ctext x='32' y='44' text-anchor='middle' font-family='Georgia,serif' font-size='34' fill='%23f6f4f0'%3EQ%3C/text%3E%3C/svg%3E">
<script>document.documentElement.classList.add('js');</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500&family=Manrope:wght@300;400;500&display=swap" rel="stylesheet">
<script src="https://cdn.tailwindcss.com"></script>
<link rel="stylesheet" href="/assets/css/site.css">
<link rel="stylesheet" href="/assets/css/pages.css">
</head>
<body id="top">

<a class="skip" href="#main">Skip to content</a>

${head}

${mega}
${menu}
<main id="main">
${body}
</main>

${footer}

<script src="/assets/js/site.js"></script>
${scripts}
</body>
</html>
`;
}

/* ───────── Pieces ───────── */
const img = (src, alt, eager = false) => `<img src="${src}" alt="${esc(alt)}" width="900" height="1350"${eager ? ' fetchpriority="high"' : ' loading="lazy"'}>`;
const empty = (note = 'Photo coming soon') => `<span class="photo photo--empty"><span class="photo__note">${note}</span></span>`;
const crumbs = (items) => `<ol class="crumbs">${items.map(([t, h], i) => `<li>${h && i < items.length - 1 ? `<a href="${h}">${esc(t)}</a>` : `<span aria-current="page">${esc(t)}</span>`}</li>`).join('')}</ol>`;

function card(m, cls = '') {
  const [a, b] = m.photos;
  return `<a class="mcard reveal${cls}" href="/catalogue/${m.id}/">
        <span class="photo">${img(a, modelName(m))}${b ? `<img src="${b}" alt="" width="900" height="1350" loading="lazy" aria-hidden="true">` : ''}</span>
        ${m.isNew ? '<span class="mcard__badge">New</span>' : ''}
        <span class="mcard__cap"><span class="h3">${esc(modelName(m))}</span><span class="mcard__meta">${L.sil[m.sil]} · ${L.fabric[m.fabric]}</span></span>
      </a>`;
}

function ctaSplit(b, photos) {
  return `<section class="cta-split" aria-label="Become a partner">
    <div class="cta-split__body reveal">
      <h2 class="h2">Bring ${esc(b.name)} to your salon</h2>
      <p>Request the wholesale price list and lookbook. A manager will reply within one business day.</p>
      <div class="banner__actions">
        <a class="btn btn--light" href="#contacts" data-label="Request price list"><span>Request price list</span></a>
        <a class="link" href="tel:+48531472415">+48 531 472 415</a>
      </div>
    </div>
    ${photos.length ? `<div class="cta-split__media">${photos.map((p) => `<span class="photo">${img(p, '')}</span>`).join('')}</div>` : ''}
  </section>`;
}

/* ───────── Brand pages ───────── */
function brandPage(b) {
  const list = byBrand[b.slug];
  const has = list.length > 0;
  const collections = [...new Set(list.map((m) => m.collection).filter(Boolean))].sort((a, z) => collOrder.indexOf(a) - collOrder.indexOf(z));
  const uniq = (k) => [...new Set(list.map((m) => m[k]))];

  // Full-screen hero: full-width photo/video (never darkened), small text bottom-left,
  // a card bottom-right that cycles through the brand's models.
  const media = b.heroVideo
    ? `<video class="bh__media" autoplay muted loop playsinline preload="metadata" poster="${b.heroPhoto}" aria-hidden="true"><source src="${b.heroVideo}" type="video/mp4"></video>`
    : b.heroPhoto ? `<img class="bh__media" src="${b.heroPhoto}"${/-2560\.jpg$/.test(b.heroPhoto) ? ` srcset="${b.heroPhoto.replace('-2560', '-1200')} 1200w, ${b.heroPhoto} 2560w" sizes="100vw"` : ''} alt="${esc(b.name)} wedding dress" fetchpriority="high">` : '';
  const cards = list.slice(0, 6);
  const hero = `<section class="bh bh--${b.slug}${media ? '' : ' bh--text'}">
      ${media ? `<div class="bh__pic">${media}</div>` : ''}
      <div class="bh__body">
        <span class="bh__meta fade">${has ? `${list.length} models · ${uniq('sil').length} silhouettes` : 'Collection coming soon'}</span>
        <h1 class="bh__title fade f2">${esc(b.name)}</h1>
        <p class="bh__tag fade f2">${esc(b.tagline)}</p>
        <div class="bh__actions fade f3">
          ${has ? `<a class="btn btn--light btn--sm" href="/catalogue/?brand=${b.slug}" data-label="View catalogue"><span>View catalogue</span></a>
          <a class="link bh__link" href="#contacts">Become a partner</a>` : `<a class="btn btn--sm" href="#contacts" data-label="Become a partner"><span>Become a partner</span></a>`}
        </div>
      </div>
      ${cards.length ? `<div class="bh-cards fade f4" data-rotate aria-label="${esc(b.name)} models">
        ${cards.map((m, i) => `<a class="bh-card${i ? '' : ' is-on'}" href="/catalogue/${m.id}/"${i ? ' tabindex="-1" aria-hidden="true"' : ''}>
          <span class="bh-card__body">
            <span class="bh-card__label">${String(i + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}</span>
            <span class="bh-card__name">${esc(modelName(m))}</span>
            <span class="bh-card__meta">${L.sil[m.sil]} · ${L.fabric[m.fabric]}</span>
          </span>
          <img class="bh-card__img" src="${m.photos[0]}" alt="" width="900" height="1350"${i ? ' loading="lazy"' : ''}>
        </a>`).join('')}
        <span class="bh-cards__bar" aria-hidden="true"><i></i></span>
      </div>` : ''}
    </section>
    <div class="page-top page-top--after">${crumbs([['Home', '/'], ['Brands', '/#brands'], [b.name]])}</div>`;

  const specRows = [
    ['Key models', b.keyModels.join(' · ')],
    has && ['Silhouettes', uniq('sil').map((k) => L.sil[k]).join(', ')],
    has && ['Fabrics', uniq('fabric').map((k) => L.fabric[k]).join(', ')],
    ['Production', 'Handmade, in our own production'],
    ['Minimum order', '5 dresses from a new collection'],
    ['Sizes', 'EU and UA size charts'],
  ].filter(Boolean);

  const about = `<section class="section" id="about-brand">
      <div class="babout">
        <div class="babout__text">
          <h2 class="h2 reveal">${esc(b.tagline)}</h2>
          ${b.about.map((p) => `<p class="text reveal">${esc(p)}</p>`).join('\n          ')}
          <dl class="specs reveal">${specRows.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
        </div>
        ${b.aboutPhoto ? `<span class="photo reveal d1">${img(b.aboutPhoto, `${b.name} — detail`)}</span>` : ''}
      </div>
    </section>`;

  // Collections: named collections when the brand has them, otherwise the line grouped by silhouette
  let groups = [];
  if (collections.length) {
    groups = collections.map((c) => ({ title: c, items: list.filter((m) => m.collection === c), href: `/catalogue/?brand=${b.slug}&amp;collection=${slugify(c)}`, note: c === 'Queen 2027' ? 'New' : '' }));
  } else if (has) {
    groups = uniq('sil').map((s) => ({ title: L.sil[s], items: list.filter((m) => m.sil === s), href: `/catalogue/?brand=${b.slug}&amp;sil=${s}` }))
      .filter((g) => g.items.length >= 2).sort((a, z) => z.items.length - a.items.length).slice(0, 3);
  }
  const coll = `<section class="section" id="collections">
      <header class="head head--center reveal">
        <h2 class="h2">${collections.length ? 'Collections' : 'The collection'}</h2>
        ${has && !collections.length ? `<p class="text">The current ${esc(b.name)} line, by silhouette.</p>` : ''}
      </header>
      ${groups.length ? `<div class="coll-grid">${groups.map((g, i) => `
        <a class="coll reveal${i ? ' d' + i : ''}" href="${g.href}">
          <span class="photo">${img(g.items[0].photos[0], g.title)}</span>
          <span class="coll__cap"><span class="h3">${esc(g.title)}</span><span class="coll__count">${g.note ? g.note + ' · ' : ''}${g.items.length} models</span></span>
        </a>`).join('')}
      </div>` : `<div class="empty-note reveal">Collections coming soon</div>`}
    </section>`;

  const gal = `<section class="section" id="gallery">
      <header class="head head--center reveal">
        <h2 class="h2">Selected models</h2>
      </header>
      ${has ? `<div class="gallery-grid">
      ${list.slice(0, 8).map((m, i) => card(m, i % 4 ? ' d' + (i % 4) : '')).join('\n      ')}
      </div>
      <div class="section__foot"><a class="link" href="/catalogue/?brand=${b.slug}">View all ${list.length} models</a></div>`
      : `<div class="empty-note reveal">Models coming soon</div>`}
    </section>`;

  return page({
    title: `${b.name} — wedding dresses wholesale | QUEEN Fashion Group`,
    description: `${b.name}: ${b.tagline.toLowerCase()}. ${has ? list.length + ' models. ' : ''}Wholesale wedding dresses for bridal salons from QUEEN Fashion Group.`,
    path: `/brands/${b.slug}/`,
    scripts: '<script src="/assets/js/brand.js"></script>',
    body: [hero, about, coll, gal, ctaSplit(b, b.cta)].join('\n\n  '),
  });
}

function slugify(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''); }

/* ───────── Catalogue ───────── */
function cataloguePage() {
  const data = catalogueOrder.map((m) => ({
    id: m.id, b: m.brand, n: modelName(m), c: m.collection ? slugify(m.collection) : '', s: m.sil, sl: m.sleeves, f: m.fabric, d: m.details,
    p: m.photos.slice(0, 2), nw: !!m.isNew, v: !!m.video,
  }));
  const meta = {
    brands: brands.map((b) => ({ slug: b.slug, name: b.name, keys: b.keyModels })),
    collections: collOrder.map((c) => ({ slug: slugify(c), name: c })),
    labels: L,
  };
  const body = `<section class="cat-head">
    ${crumbs([['Home', '/'], ['Catalogue']])}
    <h1 class="h1" id="catTitle">All models</h1>
    <p class="text" id="catIntro">Every model from every brand in one place. Choose a brand, then narrow down by silhouette, sleeves or fabric.</p>
  </section>

  <div class="tabs cat-brands" id="catBrands" aria-label="Brand"></div>

  <section class="cat" aria-label="Models">
    <div class="cat-bar">
      <span class="cat-bar__count" id="catCount" aria-live="polite"></span>
      <div class="cat-bar__right">
        <button class="filter-open" id="filterOpen" type="button" aria-controls="sheet">
          <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true"><path d="M1 4h14M4 8h8M6.5 12h3"/></svg>
          Filters <b id="filterCount" hidden>0</b>
        </button>
        <label class="sort"><span class="sr-only">Sort</span>
          <select id="catSort"><option value="featured">Featured</option><option value="new">New first</option><option value="article">By article</option></select>
        </label>
        <div class="view-toggle" role="group" aria-label="View">
          <button type="button" data-view="grid" aria-pressed="true" aria-label="Grid view"><svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><rect x="1" y="1" width="6" height="6"/><rect x="9" y="1" width="6" height="6"/><rect x="1" y="9" width="6" height="6"/><rect x="9" y="9" width="6" height="6"/></svg></button>
          <button type="button" data-view="gallery" aria-pressed="false" aria-label="Gallery view"><svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><rect x="1" y="1" width="6.5" height="14"/><rect x="8.5" y="1" width="6.5" height="14"/></svg></button>
        </div>
      </div>
    </div>
    <div class="active-chips" id="activeChips"></div>
    <div class="cat-body">
      <aside class="filters" id="filtersSide" aria-label="Filters"></aside>
      <div>
        <div class="results" id="results"></div>
        <div class="results-empty" id="resultsEmpty" hidden></div>
        <div class="more" id="more" hidden><button class="btn btn--ghost" type="button" id="moreBtn" data-label="Show more"><span>Show more</span></button></div>
      </div>
    </div>
  </section>

  <div class="sheet" id="sheet" role="dialog" aria-modal="true" aria-label="Filters" inert>
    <div class="sheet__head"><span class="h3">Filters</span><button class="sheet__close" type="button" id="sheetClose" aria-label="Close filters"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" aria-hidden="true"><path d="M1 1l12 12M13 1 1 13"/></svg></button></div>
    <div class="sheet__body" id="filtersSheet"></div>
    <div class="sheet__foot"><button class="btn btn--ghost" type="button" id="sheetClear" data-label="Clear"><span>Clear</span></button><button class="btn" type="button" id="sheetApply" data-label="Show models"><span id="sheetApplyLabel">Show models</span></button></div>
  </div>`;
  return page({
    title: 'Catalogue — all wedding dress models | QUEEN Fashion Group',
    description: `Wholesale catalogue of ${models.length} wedding dress models from QUEEN, Elle and Eleonora. Filter by brand, collection, silhouette, sleeves and fabric.`,
    path: '/catalogue/',
    current: 'catalogue',
    body,
    scripts: `<script>window.CATALOG = ${JSON.stringify({ meta, models: data })};</script>\n<script src="/assets/js/catalogue.js"></script>`,
  });
}

/* ───────── Model pages ───────── */
function modelPage(m) {
  const b = brandBy[m.brand];
  const list = byBrand[m.brand];
  const i = list.indexOf(m);
  const prev = list[(i - 1 + list.length) % list.length];
  const next = list[(i + 1) % list.length];
  const more = [1, 2, 3, 4].map((k) => list[(i + k) % list.length]).filter((x) => x !== m);
  const name = modelName(m);

  const tiles = m.photos.map((p, k) => `<span class="photo">${img(p, k === 0 ? `${name} — front` : `${name} — view ${k + 1}`, k === 0)}${k === 0 && m.isNew ? '<span class="mcard__badge">New</span>' : ''}</span>`);
  if (m.video) tiles.splice(1, 0, `<span class="photo"><video src="${m.video}" poster="${m.photos[0]}" muted loop playsinline autoplay preload="metadata" aria-label="${esc(name)} — video"></video><span class="pdp__tag">Video</span></span>`);

  const specs = [
    ['Brand', `<a class="u-link" href="/brands/${b.slug}/">${esc(b.name)}</a>`],
    m.collection && ['Collection', esc(m.collection)],
    ['Article', esc(m.article)],
    ['Silhouette', L.sil[m.sil]],
    ['Sleeves', L.sleeves[m.sleeves]],
    ['Fabric', L.fabric[m.fabric]],
    m.details.length && ['Details', m.details.map((d) => L.details[d]).join(', ')],
    m.colour && ['Colour', m.colour],
    ['Sizes', 'EU and UA size charts'],
    ['Changes', 'Sleeves, length, train and colour on request'],
  ].filter(Boolean);

  const body = `<div class="page-top">${crumbs([['Catalogue', '/catalogue/'], [b.name, `/catalogue/?brand=${b.slug}`], [m.article]])}</div>
  <section class="pdp">
    <div class="pdp__gallery" aria-label="Photos">
      ${tiles.join('\n      ')}
    </div>
    <div class="pdp__info">
      <a class="label u-link" href="/brands/${b.slug}/">${esc(b.name)}</a>
      <h1 class="h2">${esc(name)}</h1>
      <p class="text">${esc(describe(m))}</p>
      <dl class="specs">${specs.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
      <div class="pdp__actions">
        <a class="btn" href="#contacts" data-label="Request price"><span>Request price</span></a>
        <a class="link" href="/catalogue/?brand=${b.slug}">All ${esc(b.name)} models</a>
      </div>
      <p class="pdp__note">Price on request. Minimum order — 5 dresses from a new collection.</p>
      <nav class="pdp__switch" aria-label="Switch model">
        <a href="/catalogue/${prev.id}/" rel="prev"><small>Previous</small><b>${esc(modelName(prev))}</b></a>
        <a href="/catalogue/${next.id}/" rel="next"><small>Next</small><b>${esc(modelName(next))}</b></a>
      </nav>
    </div>
  </section>

  ${more.length ? `<section class="section" aria-label="More models">
    <header class="head head--center reveal">
      <h2 class="h2">More from this brand</h2>
    </header>
    <div class="gallery-grid">
      ${more.map((x, k) => card(x, k ? ' d' + k : '')).join('\n      ')}
    </div>
  </section>` : ''}`;

  return page({
    title: `${name} — ${b.name} wedding dress | QUEEN Fashion Group`,
    description: `${name}. ${describe(m)} Wholesale from QUEEN Fashion Group, price on request.`,
    path: `/catalogue/${m.id}/`,
    current: 'catalogue',
    body,
    scripts: `<script>document.addEventListener('keydown',function(e){if(e.target.closest('input,select,textarea'))return;if(e.key==='ArrowLeft')location.href='/catalogue/${prev.id}/';if(e.key==='ArrowRight')location.href='/catalogue/${next.id}/';});</script>`,
  });
}

/* ───────── Write ───────── */
const write = (path, html) => { mkdirSync(path, { recursive: true }); writeFileSync(path + '/index.html', html); };
if (existsSync('brands')) rmSync('brands', { recursive: true });
for (const b of brands) write(`brands/${b.slug}`, brandPage(b));
write('catalogue', cataloguePage());
for (const m of models) write(`catalogue/${m.id}`, modelPage(m));
console.log(`Built ${brands.length} brand pages, 1 catalogue, ${models.length} model pages.`);
