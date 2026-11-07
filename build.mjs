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
  // Mark the current section in the header and mobile menu
  if (current) {
    const href = current === 'catalogue' ? '/catalogue/' : current;
    head = head.split(`<a class="u-link" href="${href}">`).join(`<a class="u-link" href="${href}" aria-current="page">`);
  }
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

// Individual model pages are hidden for now. Set to true to publish them again.
const MODEL_PAGES = true;
const modelHref = (m) => (MODEL_PAGES ? `/catalogue/${m.id}/` : `/catalogue/?brand=${m.brand}`);

function card(m, cls = '') {
  const [a, b] = m.photos;
  return `<a class="mcard reveal${cls}" href="${modelHref(m)}">
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
        <a class="btn btn--light" href="/contact/" data-label="Request price list"><span>Request price list</span></a>
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
          <a class="link bh__link" href="/contact/">Become a partner</a>` : `<a class="btn btn--sm" href="/contact/" data-label="Become a partner"><span>Become a partner</span></a>`}
        </div>
      </div>
      ${cards.length ? `<div class="bh-cards fade f4" data-rotate aria-label="${esc(b.name)} models">
        ${cards.map((m, i) => `<a class="bh-card${i ? '' : ' is-on'}" href="${modelHref(m)}"${i ? ' tabindex="-1" aria-hidden="true"' : ''}>
          <span class="bh-card__body">
            <span class="bh-card__label">${String(i + 1).padStart(2, '0')} / ${String(cards.length).padStart(2, '0')}</span>
            <span class="bh-card__name">${esc(modelName(m))}</span>
            <span class="bh-card__meta">${L.sil[m.sil]} · ${L.fabric[m.fabric]}</span>
          </span>
          <img class="bh-card__img" src="${m.photos[0]}" alt="" width="900" height="1350"${i ? ' loading="lazy"' : ''}>
        </a>`).join('')}
        <span class="bh-cards__bar" aria-hidden="true"><i></i></span>
      </div>` : ''}
    </section>`;

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
    modelPages: MODEL_PAGES,
    brands: brands.map((b) => ({ slug: b.slug, name: b.name, keys: b.keyModels })),
    collections: collOrder.map((c) => ({ slug: slugify(c), name: c })),
    labels: L,
  };
  const body = `<section class="cat-head">
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
        <div class="more" id="more" hidden><button class="btn" type="button" id="moreBtn" data-label="Show more"><span>Show more</span></button></div>
      </div>
    </div>
  </section>

  <div class="sheet" id="sheet" role="dialog" aria-modal="true" aria-label="Filters" inert>
    <div class="sheet__head"><span class="h3">Filters</span><button class="sheet__close" type="button" id="sheetClose" aria-label="Close filters"><svg viewBox="0 0 14 14" fill="none" stroke="currentColor" aria-hidden="true"><path d="M1 1l12 12M13 1 1 13"/></svg></button></div>
    <div class="sheet__body" id="filtersSheet"></div>
    <div class="sheet__foot"><button class="btn btn--light" type="button" id="sheetClear" data-label="Clear"><span>Clear</span></button><button class="btn" type="button" id="sheetApply" data-label="Show models"><span id="sheetApplyLabel">Show models</span></button></div>
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

  // Photos, with the video (if any) as the second item
  const media = m.photos.map((src, k) => ({ type: 'img', src, alt: k === 0 ? `${name} — front` : `${name} — view ${k + 1}` }));
  if (m.video) media.splice(1, 0, { type: 'video', src: m.video, poster: m.photos[0], alt: `${name} — video` });
  const total = media.length;

  const lg = (src) => src.replace(/\.jpg$/, '-lg.jpg');
  const slides = media.map((x, k) => `<figure class="pdp__slide" id="photo-${k + 1}" data-index="${k}">
          ${x.type === 'video'
            ? `<video src="${x.src}" poster="${lg(x.poster)}" muted loop playsinline autoplay preload="metadata" aria-label="${esc(x.alt)}"></video><span class="pdp__tag">Video</span>`
            : `<img src="${lg(x.src)}" srcset="${x.src} 900w, ${lg(x.src)} 1400w" sizes="(min-width: 1024px) 50vw, 100vw" alt="${esc(x.alt)}" width="1400" height="2100"${k ? ' loading="lazy"' : ' fetchpriority="high"'}>
          <button class="pdp__zoom" type="button" data-zoom="${k}" aria-label="Open photo ${k + 1} of ${total} full screen"></button>`}
        </figure>`).join('\n        ');
  const thumbs = total > 1 ? `<div class="pdp__rail"><div class="pdp__thumbs" aria-label="Photos">
        ${media.map((x, k) => `<button class="pdp__thumb" type="button" data-go="${k}" aria-current="${k === 0}" aria-label="${x.type === 'video' ? 'Video' : `Photo ${k + 1}`}"><img src="${x.type === 'video' ? x.poster : x.src}" alt="" width="900" height="1350" loading="lazy">${x.type === 'video' ? '<span class="pdp__play" aria-hidden="true"></span>' : ''}</button>`).join('\n        ')}
      </div></div>` : '';

  const facts = [
    ['Silhouette', L.sil[m.sil]],
    ['Fabric', L.fabric[m.fabric]],
    ['Sleeves & neckline', L.sleeves[m.sleeves]],
    m.collection && ['Collection', esc(m.collection)],
    ['Article', esc(m.article)],
    m.details.length && ['Details', m.details.map((d) => L.details[d]).join(' · ')],
    m.colour && ['Colour', esc(m.colour)],
  ].filter(Boolean);
  const sizes = [
    ['Size charts', 'European and Ukrainian'],
    ['Made to order', 'Sleeves, length, train and colour can be changed for your client'],
    ['Individual tailoring', 'Our designers can create a dress to an individual request'],
  ];
  const terms = [
    ['Minimum order', '5 dresses from a new collection — models and brands can be combined'],
    ['Production', '6–8 weeks after prepayment, 8–12 weeks from May to September'],
    ['Payment', '30% deposit, 70% before shipping. EUR, PLN or USD'],
    ['Delivery', 'DPD, door-to-door to your salon'],
  ];
  const specList = (rows) => `<dl class="specs">${rows.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>`;

  const body = `<section class="pdp" data-pdp>
    <div class="pdp__media">
      ${thumbs}
      <div class="pdp__track" aria-label="${esc(name)} photos">
        ${slides}
      </div>
      ${total > 1 ? `<span class="pdp__count" aria-hidden="true"><b data-current>1</b> / ${total}</span>` : ''}
    </div>

    <div class="pdp__info">
      <div class="pdp__panel">
        <p class="pdp__eyebrow"><a class="u-link" href="/brands/${b.slug}/">${esc(b.name)}</a>${m.collection && m.collection !== b.name ? `<span>${esc(m.collection)}</span>` : ''}${m.isNew ? '<em>New</em>' : ''}</p>
        <h1 class="pdp__title">${esc(name)}</h1>
        <p class="pdp__sub">${esc(describe(m))}</p>
        <p class="text">Handmade in our own production and worked out for every size. Supplied wholesale to bridal salons — the price list is sent on request.</p>
        <a class="btn btn--block" href="/contact/?model=${encodeURIComponent(name)}&amp;brand=${encodeURIComponent(b.name)}#enquiry" data-label="Request price"><span>Request price</span></a>
        <p class="pdp__call">Prefer to talk? <a class="u-link" href="tel:${PHONE.tel}">${PHONE.label}</a></p>

        <div class="pdp__block">
          <h2 class="pdp__h">Details</h2>
          <dl class="pdp__facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>
        </div>

        <div class="faq pdp__more">
          <details class="faq__item"><summary>Sizes &amp; changes<i aria-hidden="true"></i></summary>${specList(sizes)}</details>
          <details class="faq__item"><summary>Wholesale terms<i aria-hidden="true"></i></summary>${specList(terms)}</details>
        </div>

        <nav class="pdp__switch" aria-label="Switch model">
          <a href="/catalogue/${prev.id}/" rel="prev"><small>Previous</small><b>${esc(modelName(prev))}</b></a>
          <a href="/catalogue/${next.id}/" rel="next"><small>Next</small><b>${esc(modelName(next))}</b></a>
        </nav>
      </div>
    </div>
  </section>

  <div class="lightbox" id="lightbox" hidden role="dialog" aria-modal="true" aria-label="${esc(name)} — photos">
    <img class="lightbox__img" alt="">
    <span class="lightbox__count" aria-live="polite"></span>
    <button class="lightbox__btn lightbox__close" type="button" data-lb="close" aria-label="Close"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden="true"><path d="M3 3l14 14M17 3 3 17"/></svg></button>
    <button class="lightbox__btn lightbox__prev" type="button" data-lb="prev" aria-label="Previous photo"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden="true"><path d="M12.5 3 5.5 10l7 7"/></svg></button>
    <button class="lightbox__btn lightbox__next" type="button" data-lb="next" aria-label="Next photo"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" aria-hidden="true"><path d="M7.5 3l7 7-7 7"/></svg></button>
  </div>

  ${more.length ? `<section class="section section--tint" aria-label="More models">
    <header class="head head--center reveal">
      <h2 class="h2">More from ${esc(b.name)}</h2>
    </header>
    <div class="gallery-grid">
      ${more.map((x, k) => card(x, k ? ' d' + k : '')).join('\n      ')}
    </div>
    <div class="panel__foot"><a class="link" href="/catalogue/?brand=${b.slug}">All ${esc(b.name)} models</a></div>
  </section>` : ''}`;

  return page({
    title: `${name} — ${b.name} wedding dress | QUEEN Fashion Group`,
    description: `${name}. ${describe(m)} Wholesale from QUEEN Fashion Group, price on request.`,
    path: `/catalogue/${m.id}/`,
    current: 'catalogue',
    body,
    scripts: `<script>window.PDP = { prev: '/catalogue/${prev.id}/', next: '/catalogue/${next.id}/' };</script>\n<script src="/assets/js/model.js"></script>`,
  });
}

/* ───────── Company pages ───────── */
const PHONE = { tel: '+48531472415', label: '+48 531 472 415' };
const EMAIL = 'managerqueen1@gmail.com';
const MANAGERS = [
  { name: 'Viktoria', market: 'Polish market', tel: '+48531472415', label: '+48 531 472 415' },
  { name: 'Daria', market: 'Polish market', tel: '+380687748003', label: '+380 68 774 8003' },
  { name: 'Polina', market: 'German market', tel: '+48514732941', label: '+48 514 732 941' },
  { name: 'Anastasia', market: 'Italian market', tel: '+393938667667', label: '+39 393 866 7667' },
];
const TERMS = [
  ['Minimum order', '5 dresses', 'from a new collection'],
  ['Production', '6–8 weeks', '8–12 weeks in season, May – September'],
  ['Payment', '30% / 70%', 'deposit, then before shipping. EUR, PLN or USD'],
  ['Delivery', 'DPD', 'door-to-door to your salon'],
];
const termsStrip = () => `<div class="terms reveal" aria-label="Terms at a glance">
    ${TERMS.map(([k, b, s]) => `<div class="term"><span class="label">${k}</span><b>${b}</b><span>${s}</span></div>`).join('\n    ')}
  </div>`;

// Short page intro: centred heading and one line of text
const intro = (title, text, extra = '') => `<section class="page-intro">
    <h1 class="h1 fade">${title}</h1>
    ${text ? `<p class="text fade f2">${text}</p>` : ''}
    ${extra}
  </section>`;

// Dark call-to-action band with two photos, shared by every company page
function cta({ title = 'Bring our brands to your salon', text = 'Request the wholesale price list and lookbook. A manager will reply within one business day.', photos = ['/assets/img/models/queen-2717.jpg', '/assets/img/models/queen-2750.jpg'], button = ['Request price list', '/contact/#enquiry'] } = {}) {
  return `<section class="cta-split" aria-label="Become a partner">
    <div class="cta-split__body reveal">
      <h2 class="h2">${title}</h2>
      <p>${text}</p>
      <div class="banner__actions">
        <a class="btn btn--light" href="${button[1]}" data-label="${button[0]}"><span>${button[0]}</span></a>
        <a class="link" href="tel:${PHONE.tel}">${PHONE.label}</a>
      </div>
    </div>
    <div class="cta-split__media">${photos.map((p) => `<span class="photo">${img(p, '')}</span>`).join('')}</div>
  </section>`;
}

/* Blog posts. Texts are based on the client's short notes and should be checked by the client. */
const POSTS = [
  {
    slug: 'barcelona-bridal-fashion-week-2025',
    title: 'Our debut at Barcelona Bridal Fashion Week',
    date: '2025', tag: 'Fashion week',
    photo: '/assets/img/blog-barcelona.jpg',
    lead: 'Queen Wedding Dresses made its debut at the prestigious Barcelona Bridal Fashion Week 2025, gained new clients in Spain and grew its network to 18 countries worldwide.',
    body: [
      'Barcelona Bridal Fashion Week is one of the most important dates in the bridal calendar. Buyers from salons across Europe and beyond come here to see the new season first and to meet the manufacturers behind it.',
      'For QUEEN it was the first time on this stage. Our team presented the latest collections on the stand, and buyers could see the dresses up close — the corset construction, the lace and the finishing that define our handmade production.',
      'The week brought new partners in Spain, and with them our dresses are now sold in 18 countries. We thank every salon that visited our stand and look forward to working together.',
    ],
  },
  {
    slug: 'bridal-fashion-warsaw-2025',
    title: 'Bridal Fashion Warsaw 2025',
    date: '17–18 May 2025', tag: 'Trade fair',
    photo: '/assets/img/blog-warsaw.jpg',
    lead: 'On 17–18 May Queen Wedding Dresses took part in Bridal Fashion Warsaw 2025. Our stand was full of Polish clients on both days.',
    body: [
      'Poland is one of our key markets, and Bridal Fashion Warsaw is where we meet many of our partners in person. Over two days the stand was busy from opening to close.',
      'The 2026 collection drew the most attention. Salon owners came to see the new silhouettes, discuss the assortment for the coming season and agree on first orders.',
      'Dozens of new partnerships were confirmed during the fair — a clear sign of our strong position in the Polish market. Our Polish-speaking managers continue the conversation with every salon we met.',
    ],
  },
  {
    slug: 'fiera-milano',
    title: 'Our stand at Fiera Milano',
    date: '2025', tag: 'Trade fair',
    photo: '/assets/img/blog-milano.jpg',
    lead: 'The QUEEN team presented the collections on our own stand at Fiera Milano, meeting buyers from Italy and across Europe.',
    body: [
      'Milan is a natural place for a bridal brand to meet the market: the city sets the tone for fashion, and its fairs bring together buyers who look for quality and design.',
      'On the stand we showed dresses from our current collections and talked with salons about their clients, the styles in demand and the terms of cooperation.',
      'For our Italian partners we have a dedicated manager who advises in Italian on the assortment, payment and delivery. If you missed us in Milan, contact us and we will send the lookbook and price list.',
    ],
  },
];

/* ── Our brands ── */
function brandsPage() {
  const withPhotos = brands.filter((b) => b.heroPhoto);
  const upcoming = brands.filter((b) => !b.heroPhoto);
  const rows = withPhotos.map((b, i) => {
    const list = byBrand[b.slug];
    const sils = [...new Set(list.map((m) => m.sil))].length;
    const src = b.heroPhoto.replace('-2560', '-1200');
    return `<article class="brow${i % 2 ? ' brow--rev' : ''}">
      <a class="brow__media photo reveal" href="/brands/${b.slug}/" tabindex="-1" aria-hidden="true">${img(src, '')}</a>
      <div class="brow__body reveal d1">
        <span class="brow__num">${String(i + 1).padStart(2, '0')}</span>
        <h2 class="h2">${esc(b.name)}</h2>
        <p class="brow__tag">${esc(b.tagline)}</p>
        <p class="text">${esc(b.intro)}</p>
        <dl class="brow__meta">
          <div><dt>Models</dt><dd>${list.length}</dd></div>
          <div><dt>Silhouettes</dt><dd>${sils}</dd></div>
          <div><dt>Key models</dt><dd>${b.keyModels.slice(0, 3).join(' · ')}</dd></div>
        </dl>
        <div class="brow__actions">
          <a class="btn btn--sm" href="/brands/${b.slug}/" data-label="Discover ${esc(b.name)}"><span>Discover ${esc(b.name)}</span></a>
          <a class="link" href="/catalogue/?brand=${b.slug}">Catalogue</a>
        </div>
      </div>
    </article>`;
  }).join('\n    ');
  const next = upcoming.map((b, i) => `<a class="bnext reveal${i % 4 ? ` d${i % 4}` : ''}" href="/brands/${b.slug}/">
        <span class="brow__num">${String(withPhotos.length + i + 1).padStart(2, '0')}</span>
        <span class="bnext__name">${esc(b.name)}</span>
        <span class="text">${esc(b.tagline)}</span>
        <span class="bnext__keys">Key models · ${b.keyModels.join(' · ')}</span>
      </a>`).join('\n      ');
  return page({
    title: 'Our brands — QUEEN Fashion Group',
    description: 'Seven wedding dress brands from one manufacturer: QUEEN, Elle, Eleonora, Atelier Lorenzo Ricci, Velina, Nivera and TVOYA.',
    path: '/brands/',
    current: '/brands/',
    body: [
      intro('Our brands', 'Seven wedding dress brands from one manufacturer — each with its own character, all made by hand to the same standard.'),
      `<section class="brows">\n    ${rows}\n  </section>`,
      `<section class="section section--tint">
    <header class="head head--center reveal">
      <h2 class="h2">Coming next</h2>
      <p class="text">New brands in the group. Collections are being photographed — ask a manager for the lookbook in the meantime.</p>
    </header>
    <div class="bnext-grid">
      ${next}
    </div>
  </section>`,
      termsStrip().replace('class="terms reveal"', 'class="terms terms--page reveal"'),
      cta({ title: 'One supplier, seven brands', text: 'One manager, one order and one delivery for every brand you choose. Combine several brands in a single order.' }),
    ].join('\n\n  '),
  });
}

/* ── About us ── */
function aboutPage() {
  const adv = [
    ['High quality', 'Each stage of production is strictly controlled, from the choice of fabric to the sewing and decoration of every dress.'],
    ['Unique design', 'A line of exclusive handmade designer dresses, created in step with the trends of the fashion industry.'],
    ['Individual approach', 'Our designers take every nuance into account and can create a dress of any complexity for your client.'],
    ['Fair pricing', 'Manufacturer prices and convenient payment. Regular partners receive discounts and special offers.'],
    ['Attentive service', 'Managers answer every question in detail and agree each delivery with care.'],
    ['On time', 'Fast production for orders of any volume and quick delivery anywhere in the world.'],
  ];
  const hero = `<section class="bh bh--about">
      <div class="bh__pic"><img class="bh__media" src="/assets/img/hero/about-2560.jpg" srcset="/assets/img/hero/about-1200.jpg 1200w, /assets/img/hero/about-2560.jpg 2560w" sizes="100vw" alt="A bride in an Eleonora gown in a palace garden" fetchpriority="high"></div>
      <div class="bh__body">
        <span class="bh__meta fade">About QUEEN Fashion Group</span>
        <h1 class="bh__title fade f2">An atelier with a history</h1>
        <p class="bh__tag fade f2">Handmade wedding dresses from the manufacturer, for bridal salons in 18 countries.</p>
      </div>
    </section>`;
  const story = `<section class="section">
    <div class="lead">
      <h2 class="h2 reveal">Seven bridal brands under one roof, made in our own production</h2>
      <div class="lead__text">
        <p class="text reveal">QUEEN Fashion Group grew out of QUEEN — a wedding dress brand known for structured corset bodices, fine lace and long trains. Today the group brings together seven brands, from the signature QUEEN line to younger labels with their own handwriting.</p>
        <p class="text reveal">We work with the owners of wedding salons, boutiques and showrooms. Partners order from our catalogues or ask for exclusive individual tailoring, and we take both large wholesale and small orders.</p>
        <p class="text reveal">Our managers help each salon find its way through the assortment: which models and colours are in demand this season, and which payment and delivery method suits them best.</p>
      </div>
    </div>
    <dl class="stats stats--page reveal">
      <div class="stat"><dt>bridal brands</dt><dd>7</dd></div>
      <div class="stat"><dt>countries</dt><dd>18</dd></div>
      <div class="stat"><dt>dresses minimum order</dt><dd>5</dd></div>
      <div class="stat"><dt>weeks production</dt><dd>6–8</dd></div>
    </dl>
  </section>`;
  const craft = `<section class="split">
    <div class="split__media">
      <div class="photo reveal"><img src="/assets/img/models/queen-2747.jpg" alt="QUEEN model 2747 — lace ball gown" width="1100" height="1650" loading="lazy"></div>
      <div class="photo reveal d1"><img src="/assets/img/models/queen-2747-detail.jpg" alt="Corset bodice and lace sleeves close up" width="1100" height="1650" loading="lazy"></div>
    </div>
    <div class="split__body">
      <h2 class="h2 reveal">Made by hand, checked at every stage</h2>
      <p class="text reveal">Every dress is sewn in our own production. Each model is worked out for the required size, so it fits as it should — whether it comes from the catalogue or is made to order.</p>
      <ul class="svc-list">
        <li class="svc reveal"><h3 class="h3">Our own production</h3><p class="text">From fabric to final decoration, every stage stays in our hands.</p></li>
        <li class="svc reveal"><h3 class="h3">Made-to-order changes</h3><p class="text">Sleeves, length, train and colour can be adjusted on request.</p></li>
        <li class="svc reveal"><h3 class="h3">EU and UA sizes</h3><p class="text">Size charts for European and Ukrainian sizing.</p></li>
      </ul>
    </div>
  </section>`;
  const advs = `<section class="section">
    <header class="head head--center reveal">
      <h2 class="h2">What we stand for</h2>
    </header>
    <ol class="adv-grid">
      ${adv.map(([t, d], i) => `<li class="adv reveal${i % 3 ? ` d${i % 3}` : ''}"><span class="brow__num">${String(i + 1).padStart(2, '0')}</span><h3 class="h3">${t}</h3><p class="text">${d}</p></li>`).join('\n      ')}
    </ol>
  </section>`;
  const group = `<section class="section section--tint">
    <div class="lead">
      <h2 class="h2 reveal">The brands of the group</h2>
      <div class="lead__text">
        <ul class="blist reveal">
          ${brands.map((b) => `<li><a href="/brands/${b.slug}/"><span>${esc(b.name)}</span><small>${esc(b.tagline)}</small></a></li>`).join('\n          ')}
        </ul>
        <a class="link reveal" href="/brands/">All brands</a>
      </div>
    </div>
  </section>`;
  const events = `<section class="section">
    <header class="head head--center reveal">
      <h2 class="h2">Where to meet us</h2>
      <p class="text">We present our collections at the leading bridal fairs in Europe.</p>
    </header>
    <div class="posts">
      ${POSTS.map((p, i) => postCard(p, i)).join('\n      ')}
    </div>
  </section>`;
  return page({
    title: 'About us — QUEEN Fashion Group',
    description: 'QUEEN Fashion Group: seven wedding dress brands, handmade in our own production and supplied wholesale to bridal salons in 18 countries.',
    path: '/about/',
    current: '/about/',
    body: [hero, story, craft, advs, group, events, cta()].join('\n\n  '),
  });
}

/* ── Wholesale partnership ── */
function partnersPage() {
  const steps = [
    ['Send a request', 'Leave your details in the form or call a manager for your market.'],
    ['Get the price list', 'We send the wholesale price list and lookbooks for the brands you choose.'],
    ['Place an order', 'From 5 dresses from a new collection, with a 30% deposit.'],
    ['Production', '6–8 weeks after prepayment, 8–12 weeks from May to September.'],
    ['Delivery', 'Pay the remaining 70% before shipping. DPD delivers to your salon.'],
  ];
  const benefits = [
    ['Efficient supply chain', 'One manager and one delivery for every brand in your order.'],
    ['Favorable prices', 'Manufacturer prices and a flexible system of discounts for regular partners.'],
    ['High product quality', 'Handmade dresses, checked at every stage of production.'],
    ['Regular updates', 'New collections every season, with advice on what sells best.'],
    ['Marketing support', 'Photos, videos and collection materials for your salon and social media.'],
    ['Convenient payment', 'Prices in EUR, with payment also possible in PLN or USD.'],
  ];
  const faq = [
    ['What is the minimum order?', 'Five dresses from a new collection. You can combine models and brands in one order.'],
    ['How long does production take?', '6–8 weeks after prepayment. In the high season, from 1 May to 30 September, it takes 8–12 weeks.'],
    ['How does payment work?', 'A 30% deposit when you place the order and the remaining 70% before shipping. Prices are in EUR; you can also pay in PLN or USD.'],
    ['How are dresses delivered?', 'We ship with DPD, door-to-door to your salon.'],
    ['Can a model be changed for my client?', 'Yes. Sleeves, length, train and colour can be adjusted, and our designers can create a dress to an individual request.'],
    ['Which size charts do you use?', 'We work with European and Ukrainian size charts.'],
    ['How do I see prices?', 'Prices are shared on request. Send the form and a manager will reply with the price list within one business day.'],
  ];
  return page({
    title: 'Wholesale partnership — QUEEN Fashion Group',
    description: 'Terms of cooperation for bridal salons: minimum order of 5 dresses, 6–8 weeks production, 30/70 payment in EUR, PLN or USD, DPD delivery.',
    path: '/partners/',
    current: '/partners/',
    body: [
      intro('Wholesale partnership', 'We help the owners of wedding salons, boutiques and showrooms build their assortment with handmade dresses from seven brands.',
        `<div class="page-intro__actions fade f3"><a class="btn" href="/contact/#enquiry" data-label="Become a partner"><span>Become a partner</span></a><a class="link" href="#terms">Terms of cooperation</a></div>`),
      `<section id="terms" class="terms-wrap">${termsStrip().replace('class="terms reveal"', 'class="terms terms--page reveal"')}</section>`,
      `<section class="section">
    <header class="head head--center reveal">
      <h2 class="h2">How cooperation works</h2>
    </header>
    <ol class="steps">
      ${steps.map(([t, d], i) => `<li class="step reveal${i % 5 ? ` d${Math.min(i, 3)}` : ''}"><span class="brow__num">${String(i + 1).padStart(2, '0')}</span><h3 class="h3">${t}</h3><p class="text">${d}</p></li>`).join('\n      ')}
    </ol>
  </section>`,
      `<section class="split split--rev">
    <div class="split__media split__media--single">
      <div class="photo reveal"><img src="/assets/img/pages/partners-1600.jpg" alt="A bride in an Eleonora tulle gown in a palace garden" width="1600" height="2400" loading="lazy"></div>
    </div>
    <div class="split__body">
      <h2 class="h2 reveal">Benefits of working with us</h2>
      <div class="ben-grid">
        ${benefits.map(([t, d], i) => `<div class="ben reveal${i % 2 ? ' d1' : ''}"><h3 class="h3">${t}</h3><p class="text">${d}</p></div>`).join('\n        ')}
      </div>
    </div>
  </section>`,
      `<section class="split" id="services">
    <div class="split__media split__media--single">
      <div class="photo reveal"><img src="/assets/img/models/queen-2750.jpg" alt="QUEEN model 2750 — lace sheath gown with a tulle overskirt" width="1100" height="1650" loading="lazy"></div>
    </div>
    <div class="split__body">
      <h2 class="h2 reveal">Exclusive services</h2>
      <p class="text reveal">For partners who want more than ready collections — dresses and service shaped around your salon.</p>
      <ul class="svc-list">
        <li class="svc reveal"><h3 class="h3">Individual tailoring</h3><p class="text">Our designers create a dress of any complexity to your client's request.</p></li>
        <li class="svc reveal"><h3 class="h3">Made-to-order changes</h3><p class="text">Adjust sleeves, length, train or colour of catalogue models, worked out for the required size.</p></li>
        <li class="svc reveal"><h3 class="h3">A manager in your language</h3><p class="text">Personal managers for the Polish, German and Italian markets advise on assortment, payment and delivery.</p></li>
        <li class="svc reveal"><h3 class="h3">Partner area</h3><p class="text">Price lists, lookbooks and collection materials in one place for partner salons.</p></li>
      </ul>
    </div>
  </section>`,
      `<section class="section">
    <div class="lead">
      <h2 class="h2 reveal">Questions from salons</h2>
      <div class="faq reveal">
        ${faq.map(([q, a]) => `<details class="faq__item"><summary>${q}<i aria-hidden="true"></i></summary><p class="text">${a}</p></details>`).join('\n        ')}
      </div>
    </div>
  </section>`,
      cta({ title: 'Start working with us', text: 'Leave a request and a manager will send the price list and lookbooks within one business day.', button: ['Become a partner', '/contact/#enquiry'] }),
    ].join('\n\n  '),
  });
}

/* ── Contacts ── */
function contactPage() {
  const brandChecks = brands.map((b) => `<label class="pick"><input type="checkbox" name="brands" value="${esc(b.name)}"><span>${esc(b.name)}</span></label>`).join('');
  return page({
    title: 'Contacts — QUEEN Fashion Group',
    description: 'Contact QUEEN Fashion Group: wholesale enquiries, managers for the Polish, German and Italian markets, office in Kraków.',
    path: '/contact/',
    current: '/contact/',
    body: `<section class="cpage">
    <div class="cpage__info">
      <h1 class="h1 fade">Contacts</h1>
      <p class="text fade f2">Leave a request or call the manager for your market. We reply within one business day.</p>
      <ul class="clist fade f3">
        ${MANAGERS.map((m) => `<li><span><b>${m.name}</b><small>${m.market}</small></span><a class="u-link" href="tel:${m.tel}">${m.label}</a></li>`).join('\n        ')}
        <li><span><b>E-mail</b><small>All markets</small></span><a class="u-link" href="mailto:${EMAIL}">${EMAIL}</a></li>
      </ul>
      <address class="caddr fade f3">
        <span class="label">Office</span>
        QUEEN_WED Sp. z o.o.<br>Czyżówka 14/2.11, 30-526 Kraków, Polska
      </address>
    </div>

    <div class="cpage__form" id="enquiry">
      <form class="form fade f2" id="enquiryForm" novalidate>
        <h2 class="h2">Wholesale enquiry</h2>
        <p class="text">Price list and lookbooks on request. Fields marked * are required.</p>
        <div class="form__grid">
          <label class="field"><span>Name *</span><input name="name" autocomplete="name" required></label>
          <label class="field"><span>Salon or company *</span><input name="company" autocomplete="organization" required></label>
          <label class="field"><span>E-mail *</span><input name="email" type="email" autocomplete="email" required></label>
          <label class="field"><span>Phone</span><input name="phone" type="tel" autocomplete="tel"></label>
          <label class="field field--wide"><span>Country *</span><input name="country" autocomplete="country-name" required></label>
        </div>
        <fieldset class="picks">
          <legend>Brands you are interested in</legend>
          <div class="picks__list">${brandChecks}</div>
        </fieldset>
        <label class="field field--wide"><span>Message</span><textarea name="message" rows="4"></textarea></label>
        <label class="consent"><input type="checkbox" name="consent" required><span>I agree to the processing of my personal data to answer this request, as described in the <a class="u-link" href="/privacy/">privacy policy</a>. *</span></label>
        <p class="form__error" id="formError" role="alert" hidden></p>
        <button class="btn" type="submit" data-label="Send request"><span>Send request</span></button>
      </form>
      <div class="form-done" id="formDone" hidden tabindex="-1">
        <h2 class="h2">Thank you</h2>
        <p class="text">Your email app has opened with the request ready to send. If it didn't, write to us at <a class="u-link" href="mailto:${EMAIL}">${EMAIL}</a> or call <a class="u-link" href="tel:${PHONE.tel}">${PHONE.label}</a>.</p>
        <a class="link" href="/catalogue/">Browse the catalogue</a>
      </div>
    </div>
  </section>
  <section class="cpage-photo" aria-hidden="true">
    <span class="photo">${img('/assets/img/pages/contact-1600.jpg', '')}</span>
    <span class="photo">${img('/assets/img/models/queen-2744.jpg', '')}</span>
    <span class="photo">${img('/assets/img/hero/elle-1200.jpg', '')}</span>
  </section>`,
    scripts: '<script src="/assets/js/contact.js"></script>',
  });
}

/* ── Blog ── */
function postCard(p, i = 0) {
  return `<a class="post reveal${i % 3 ? ` d${i % 3}` : ''}" href="/blog/${p.slug}/">
        <span class="photo post__photo"><img src="${p.photo}" alt="" width="827" height="550" loading="lazy"></span>
        <span class="post__meta">${esc(p.date)} · ${esc(p.tag)}</span>
        <span class="post__title">${esc(p.title)}</span>
      </a>`;
}
function blogPage() {
  const [first, ...rest] = POSTS;
  return page({
    title: 'Blog — QUEEN Fashion Group',
    description: 'News from QUEEN Fashion Group: bridal fashion weeks, trade fairs and new collections.',
    path: '/blog/',
    current: '/blog/',
    body: [
      intro('Blog', 'News from the group — fashion weeks, trade fairs and new collections.'),
      `<section class="section section--flush">
    <a class="feature reveal" href="/blog/${first.slug}/">
      <span class="photo feature__photo"><img src="${first.photo}" alt="" width="827" height="550" fetchpriority="high"></span>
      <span class="feature__body">
        <span class="post__meta">${esc(first.date)} · ${esc(first.tag)}</span>
        <span class="h2">${esc(first.title)}</span>
        <span class="text">${esc(first.lead)}</span>
        <span class="link">Read the story</span>
      </span>
    </a>
    <div class="posts posts--2">
      ${rest.map((p, i) => postCard(p, i)).join('\n      ')}
    </div>
  </section>`,
      cta(),
    ].join('\n\n  '),
  });
}
function postPage(p) {
  const more = POSTS.filter((x) => x !== p);
  return page({
    title: `${p.title} — QUEEN Fashion Group`,
    description: p.lead,
    path: `/blog/${p.slug}/`,
    current: '/blog/',
    body: [
      `<article class="article">
    <header class="article__head">
      <a class="link fade" href="/blog/">All news</a>
      <span class="post__meta fade">${esc(p.date)} · ${esc(p.tag)}</span>
      <h1 class="h1 fade f2">${esc(p.title)}</h1>
    </header>
    <span class="photo article__photo fade f3"><img src="${p.photo}" alt="${esc(p.title)}" width="827" height="550" fetchpriority="high"></span>
    <div class="article__body">
      <p class="article__lead reveal">${esc(p.lead)}</p>
      ${p.body.map((t) => `<p class="reveal">${esc(t)}</p>`).join('\n      ')}
    </div>
  </article>`,
      `<section class="section section--tint">
    <header class="head head--center reveal"><h2 class="h2">More news</h2></header>
    <div class="posts posts--2">
      ${more.map((x, i) => postCard(x, i)).join('\n      ')}
    </div>
  </section>`,
      cta(),
    ].join('\n\n  '),
  });
}

/* ── Privacy policy (template: needs legal review before launch) ── */
function privacyPage() {
  const sections = [
    ['Who we are', `The controller of your personal data is QUEEN_WED Sp. z o.o., Czyżówka 14/2.11, 30-526 Kraków, Poland. For any question about your data, write to <a class="u-link" href="mailto:${EMAIL}">${EMAIL}</a>.`],
    ['What data we collect', 'When you send a wholesale enquiry we receive the data you enter in the form: your name, the name of your salon or company, e-mail address, phone number, country, the brands you are interested in and your message. When you call or write to a manager we receive the data you share in that conversation.'],
    ['Why we use it', 'We use this data only to answer your enquiry, send price lists and catalogues, prepare and carry out orders, and keep in touch as a business partner. The legal basis is the steps taken at your request before entering into a contract and our legitimate interest in answering business enquiries (Art. 6(1)(b) and (f) GDPR), or your consent where we ask for it.'],
    ['Who receives it', 'Your data is available to our managers. We may share it with providers who help us run our business — e-mail and hosting services, a customer relationship management system, and delivery companies such as DPD for shipping orders. We do not sell your data.'],
    ['How long we keep it', 'We keep enquiry data for as long as needed to answer it and continue the conversation, and data related to orders for the period required by accounting and tax law.'],
    ['Your rights', 'You have the right to access your data, correct it, have it deleted, restrict or object to its processing, and receive it in a portable format. Where processing is based on consent, you can withdraw it at any time. You can also lodge a complaint with the President of the Personal Data Protection Office (UODO) in Poland.'],
    ['Cookies', 'This website does not use advertising or analytics cookies. If that changes, we will update this policy and ask for your consent where required.'],
  ];
  return page({
    title: 'Privacy policy — QUEEN Fashion Group',
    description: 'How QUEEN Fashion Group handles the personal data of partners and website visitors.',
    path: '/privacy/',
    body: `<article class="legal">
    <h1 class="h1 fade">Privacy policy</h1>
    <p class="post__meta fade f2">Last updated 7 November 2026</p>
    ${sections.map(([h, t]) => `<section class="reveal"><h2 class="legal__h">${h}</h2><p>${t}</p></section>`).join('\n    ')}
  </article>`,
  });
}

/* ── 404 ── */
function notFoundPage() {
  return page({
    title: 'Page not found — QUEEN Fashion Group',
    description: 'This page does not exist.',
    path: '/404',
    body: `<section class="nf">
    <span class="nf__code fade">404</span>
    <h1 class="h1 fade f2">This page could not be found</h1>
    <p class="text fade f2">The link may be out of date, or the page has moved.</p>
    <div class="page-intro__actions fade f3">
      <a class="btn" href="/" data-label="Back to home"><span>Back to home</span></a>
      <a class="link" href="/catalogue/">View the catalogue</a>
    </div>
  </section>`,
  });
}

/* ───────── Write ───────── */
const write = (path, html) => { mkdirSync(path, { recursive: true }); writeFileSync(path + '/index.html', html); };
if (existsSync('brands')) rmSync('brands', { recursive: true });
for (const b of brands) write(`brands/${b.slug}`, brandPage(b));
write('catalogue', cataloguePage());
for (const m of models) {
  if (MODEL_PAGES) write(`catalogue/${m.id}`, modelPage(m));
  else if (existsSync(`catalogue/${m.id}`)) rmSync(`catalogue/${m.id}`, { recursive: true });
}
write('brands', brandsPage());
write('about', aboutPage());
write('partners', partnersPage());
write('contact', contactPage());
write('blog', blogPage());
for (const p of POSTS) write(`blog/${p.slug}`, postPage(p));
write('privacy', privacyPage());
writeFileSync('404.html', notFoundPage());
console.log(`Built ${brands.length} brand pages, 1 catalogue, ${MODEL_PAGES ? models.length : 0} model pages, ${POSTS.length} posts and 7 company pages.`);
