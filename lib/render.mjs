// Page templates for the whole site, shared by build.mjs (writes the files), the admin
// (live preview) and the publish function. Pure: no file system, works in Node and the browser.
//
//   const site = createSite({ brands, models, collections, posts, site });
//   site.pages()            → [{ file: 'brands/queen/index.html', html }, ...]
//   site.render('/brands/queen/') → html for one URL

export const LABELS = {
  sil: { aline: 'A-line', ball: 'Ball gown', mermaid: 'Mermaid', sheath: 'Sheath', short: 'Short' },
  sleeves: { long: 'Long sleeves', detachable: 'Detachable sleeves', offshoulder: 'Off-the-shoulder', straps: 'Straps', strapless: 'Strapless' },
  fabric: { lace: 'Lace', tulle: 'Tulle', satin: 'Satin', glitter: 'Glitter tulle' },
  details: { slit: 'High slit', overskirt: 'Detachable overskirt', cape: 'Cape' },
};

export const SITE_URL = 'https://queen-dress.com';
// Individual model pages. Set to false to hide them (cards then link to the brand catalogue).
export const MODEL_PAGES = true;

export const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
export const slugify = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const telOf = (label) => '+' + String(label).replace(/\D/g, '');
const pad = (n) => String(n).padStart(2, '0');

export function createSite(data) {
  const { brands, models, collections = [], posts = [], site: S } = data;
  const L = LABELS;
  const C = S.contact;
  const PHONE = { tel: telOf(C.phone), label: C.phone };
  const EMAIL = C.email;

  const brandBy = Object.fromEntries(brands.map((b) => [b.slug, b]));
  const modelName = (m) => `${m.collection || brandBy[m.brand]?.name || ''} · ${m.article}`;
  const collNames = collections.map((c) => c.name);
  const collBy = Object.fromEntries(collections.map((c) => [c.name, c]));

  function describe(m) {
    const sil = L.sil[m.sil] || 'Wedding';
    const fabric = { lace: 'lace', tulle: 'tulle', satin: 'satin', glitter: 'glitter tulle' }[m.fabric] || 'fine fabric';
    const sleeves = {
      long: 'with long sleeves', detachable: 'with detachable sleeves', offshoulder: 'with an off-the-shoulder neckline',
      straps: 'on straps', strapless: 'with a strapless corset bodice',
    }[m.sleeves] || '';
    const extra = (m.details || []).map((d) => ({ slit: 'a high slit', overskirt: 'a detachable overskirt', cape: 'a cape' }[d])).filter(Boolean);
    let s = `${sil} wedding dress in ${fabric}${sleeves ? ' ' + sleeves : ''}`;
    if (extra.length) s += (m.sleeves === 'straps' ? ', with ' : ' and ') + extra.join(' and ');
    return s + '.';
  }

  /* Order inside a brand: key models first, then by collection order, then article */
  function ordered(slug) {
    const keys = brandBy[slug].keyModels || [];
    return models
      .filter((m) => m.brand === slug && !m.hidden)
      .sort((a, b) => {
        const ka = keys.indexOf(a.article), kb = keys.indexOf(b.article);
        if ((ka > -1) !== (kb > -1)) return ka > -1 ? -1 : 1;
        if (ka > -1) return ka - kb;
        const ca = collNames.indexOf(a.collection), cb = collNames.indexOf(b.collection);
        if (ca !== cb) return ca - cb;
        return a.article.localeCompare(b.article, 'en', { numeric: true });
      });
  }
  const byBrand = Object.fromEntries(brands.map((b) => [b.slug, ordered(b.slug)]));
  const catalogueOrder = brands.flatMap((b) => byBrand[b.slug]);
  const modelHref = (m) => (MODEL_PAGES ? `/catalogue/${m.id}/` : `/catalogue/?brand=${m.brand}`);

  /* ───────── Chrome: header, menus, footer ───────── */
  function chrome(home) {
    const top = home ? '#top' : '/';
    const a = (hash, path) => (home ? hash : path);
    const managersFooter = C.managers.map((m) => `<div class="contact"><span class="contact__name">${esc(m.name)}</span><span class="contact__meta">${esc(m.country)}</span><a class="u-link" href="tel:${telOf(m.phone)}">${esc(m.phone)}</a></div>`).join('\n      ');
    const header = `<header class="header" id="header">
  <div class="header__side">
    <button class="burger" id="burger" type="button" aria-label="Open menu" aria-expanded="false" aria-controls="menu"><i></i><i></i></button>
    <nav class="header__nav" aria-label="Primary">
      <button class="nav-drop" id="brandsToggle" type="button" aria-expanded="false" aria-controls="mega">
        Brands
        <svg viewBox="0 0 8 5" fill="none" stroke="currentColor" aria-hidden="true"><path d="M.5.5 4 4 7.5.5"/></svg>
      </button>
      <a class="u-link" href="/catalogue/">Catalogue</a>
      <a class="u-link" href="/about/">About us</a>
      <a class="u-link" href="/blog/">Blog</a>
      <a class="u-link" href="/contact/">Contacts</a>
    </nav>
  </div>

  <a class="logo" href="${top}" aria-label="QUEEN Fashion Group — home">
    <span class="logo__word">QUEEN</span>
    <span class="logo__sub">Fashion Group</span>
  </a>

  <div class="header__side header__side--right">
    <div class="lang">
      <button class="lang__btn" type="button" aria-haspopup="true" aria-label="Language: English">
        EN
        <svg viewBox="0 0 8 5" fill="none" stroke="currentColor" aria-hidden="true"><path d="M.5.5 4 4 7.5.5"/></svg>
      </button>
      <div class="lang__list">
        <a href="${top}" lang="en" aria-current="true"><span>English</span><b>EN</b></a>
        <a role="link" aria-disabled="true" lang="pl"><span>Polski</span><b>PL</b></a>
        <a role="link" aria-disabled="true" lang="de"><span>Deutsch</span><b>DE</b></a>
        <a role="link" aria-disabled="true" lang="ru"><span>Русский</span><b>RU</b></a>
        <a role="link" aria-disabled="true" lang="it"><span>Italiano</span><b>IT</b></a>
        <a role="link" aria-disabled="true" lang="el"><span>Ελληνικά</span><b>EL</b></a>
      </div>
    </div>
    <a class="btn btn--sm header__cta" href="/contact/#enquiry" data-label="Become a partner"><span>Become a partner</span></a>
    <a class="icon-btn icon-btn--call" href="tel:${PHONE.tel}" aria-label="Call ${esc(PHONE.label)}">
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.6 2.5H3.9c-.8 0-1.4.7-1.4 1.5C2.9 11.3 8.7 17.1 16 17.5c.8 0 1.5-.6 1.5-1.4v-2.7l-3.7-1.5-1.6 1.9c-2.1-1-3.8-2.7-4.8-4.8l1.9-1.6z"/></svg>
    </a>
  </div>
</header>`;
    const mega = `<div class="mega" id="mega" inert>
  <div class="mega__inner">
    <div class="mega__intro">
      <span class="label">Our brands</span>
      <p>${esc(S.nav.megaText)}</p>
      <a class="link" href="/brands/">All brands</a>
      <a class="link" href="/catalogue/">Full catalogue</a>
    </div>
    <ul class="mega__list">
      ${brands.map((b) => `<li class="mega__item"><a class="mega__name" href="/brands/${b.slug}/">${esc(b.name)}</a><a class="mega__cat u-link" href="/catalogue/?brand=${b.slug}">Catalogue</a></li>`).join('\n      ')}
    </ul>
    <a class="mega__feature" href="${esc(S.nav.featureLink)}">
      <img src="${esc(S.nav.featurePhoto)}" alt="" width="1098" height="1650" loading="lazy">
      <span>${esc(S.nav.featureTitle)}</span>
    </a>
  </div>
</div>
`;
    const menu = `<div class="menu" id="menu" inert>
  <nav class="menu__nav" aria-label="Mobile">
    <a class="menu__link" href="${top}" data-close>Home</a>
    <button class="menu__link" id="menuBrands" type="button" aria-expanded="false" aria-controls="menuBrandsList">Brands
      <svg viewBox="0 0 8 5" fill="none" stroke="currentColor" aria-hidden="true"><path d="M.5.5 4 4 7.5.5"/></svg>
    </button>
    <div class="menu__sub" id="menuBrandsList">
      <div>
        <ul>
          <li><a href="/brands/" data-close>All brands</a></li>
          ${brands.map((b) => `<li><a href="/brands/${b.slug}/" data-close>${esc(b.name)}</a></li>`).join('\n          ')}
        </ul>
      </div>
    </div>
    <a class="menu__link" href="/catalogue/" data-close>Catalogue</a>
    <a class="menu__link" href="/about/" data-close>About us</a>
    <a class="menu__link" href="/blog/" data-close>Blog</a>
    <a class="menu__link" href="/contact/" data-close>Contacts</a>
  </nav>
  <div class="menu__foot">
    <a class="btn btn--block" href="/contact/#enquiry" data-close data-label="Become a partner"><span>Become a partner</span></a>
    <div class="menu__langs">
      <a aria-current="true" lang="en">EN</a>
      <a role="link" aria-disabled="true" lang="pl">PL</a>
      <a role="link" aria-disabled="true" lang="de">DE</a>
      <a role="link" aria-disabled="true" lang="ru">RU</a>
      <a role="link" aria-disabled="true" lang="it">IT</a>
      <a role="link" aria-disabled="true" lang="el">EL</a>
    </div>
    <div>
      <a class="u-link" href="tel:${PHONE.tel}">${esc(PHONE.label)}</a><br>
      <a class="u-link" href="mailto:${esc(EMAIL)}">${esc(EMAIL)}</a>
    </div>
  </div>
</div>
`;
    const footer = `<footer class="footer">
  <div class="footer__top">
    <div class="footer__brand">
      <a class="logo" href="${top}" aria-label="QUEEN Fashion Group — back to top">
        <span class="logo__word">QUEEN</span>
        <span class="logo__sub">Fashion Group</span>
      </a>
      <p class="footer__tagline">${esc(S.nav.footerTagline)}</p>
    </div>
    <div class="footer__cols">
      <nav class="footer__col" aria-label="Brands">
        <span class="label">Brands</span>
        ${brands.map((b) => `<a class="u-link" href="/brands/${b.slug}/">${esc(b.name)}</a>`).join('\n        ')}
      </nav>
      <nav class="footer__col" aria-label="Company">
        <span class="label">Company</span>
        <a class="u-link" href="/brands/">Our brands</a>
        <a class="u-link" href="/catalogue/">Catalogue</a>
        <a class="u-link" href="/about/">About us</a>
        <a class="u-link" href="/blog/">Blog</a>
        <a class="u-link" href="/contact/">Contacts</a>
      </nav>
      <nav class="footer__col" aria-label="Partners">
        <span class="label">Partners</span>
        <a class="u-link" href="/contact/#enquiry">Wholesale enquiry</a>
        <a class="u-link" href="/partners/">Terms of cooperation</a>
        <a class="u-link" href="/partners/#services">Exclusive services</a>
        <a class="u-link" href="/privacy/">Privacy policy</a>
      </nav>
    </div>
  </div>
  <section class="footer__contacts" id="contacts" aria-label="Contacts">
    <span class="label">Contacts</span>
    <div class="contacts-grid">
      ${managersFooter}
      <div class="contact contact--wide"><span class="contact__name">E-mail</span><span class="contact__meta">All markets</span><a class="u-link" href="mailto:${esc(EMAIL)}">${esc(EMAIL)}</a></div>
      <div class="contact contact--wide"><span class="contact__name">Office</span><span class="contact__meta">Poland</span><span>${esc(C.addressShort)}</span></div>
    </div>
  </section>
  <nav class="footer__langs" aria-label="Language">
    <a aria-current="true" lang="en">English</a>
    <a role="link" aria-disabled="true" lang="pl">Polski</a>
    <a role="link" aria-disabled="true" lang="de">Deutsch</a>
    <a role="link" aria-disabled="true" lang="ru">Русский</a>
    <a role="link" aria-disabled="true" lang="it">Italiano</a>
    <a role="link" aria-disabled="true" lang="el">Ελληνικά</a>
  </nav>
  <div class="footer__bottom">
    <span>© 2026 QUEEN Fashion Group · ${esc(C.company)}</span>
    <a class="to-top" href="#top">Back to top</a>
  </div>
</footer>`;
    void a;
    return { header, mega, menu, footer };
  }

  const HEAD_FONTS = `<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 64 64'%3E%3Crect width='64' height='64' fill='%231a1816'/%3E%3Ctext x='32' y='44' text-anchor='middle' font-family='Georgia,serif' font-size='34' fill='%23f6f4f0'%3EQ%3C/text%3E%3C/svg%3E">
<script>document.documentElement.classList.add('js');</script>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500&family=Manrope:wght@300;400;500&display=swap" rel="stylesheet">
<script src="https://cdn.tailwindcss.com"></script>`;

  function page({ title, description, path, body, scripts = '', current }) {
    let { header, mega, menu, footer } = chrome(false);
    // Mark the current section in the header
    if (current) {
      const href = current === 'catalogue' ? '/catalogue/' : current;
      header = header.split(`<a class="u-link" href="${href}">`).join(`<a class="u-link" href="${href}" aria-current="page">`);
    }
    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${SITE_URL}${path}">
${HEAD_FONTS}
<link rel="stylesheet" href="/assets/css/site.css">
<link rel="stylesheet" href="/assets/css/pages.css">
</head>
<body id="top">

<a class="skip" href="#main">Skip to content</a>

${header}

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
  const photo = (p, extra = '') => `<div class="photo reveal${extra}"><img src="${esc(p.src)}" alt="${esc(p.alt)}" width="1100" height="1650" loading="lazy"></div>`;
  const srcsetFor = (src) => (/-2560\.jpg$/.test(src) ? ` srcset="${src.replace('-2560', '-1200')} 1200w, ${src} 2560w" sizes="100vw"` : '');

  function card(m, cls = '') {
    const [a, b] = m.photos;
    return `<a class="mcard reveal${cls}" href="${modelHref(m)}">
        <span class="photo">${a ? img(a, modelName(m)) : ''}${b ? `<img src="${b}" alt="" width="900" height="1350" loading="lazy" aria-hidden="true">` : ''}</span>
        ${m.isNew ? '<span class="mcard__badge">New</span>' : ''}
        <span class="mcard__cap"><span class="h3">${esc(modelName(m))}</span><span class="mcard__meta">${L.sil[m.sil] || ''} · ${L.fabric[m.fabric] || ''}</span></span>
      </a>`;
  }

  const termsStrip = (cls = 'terms reveal') => `<div class="${cls}" aria-label="Terms at a glance">
    ${S.terms.map((t) => `<div class="term"><span class="label">${esc(t.label)}</span><b>${esc(t.value)}</b><span>${esc(t.note)}</span></div>`).join('\n    ')}
  </div>`;

  const intro = (title, text, extra = '') => `<section class="page-intro">
    <h1 class="h1 fade">${esc(title)}</h1>
    ${text ? `<p class="text fade f2">${esc(text)}</p>` : ''}
    ${extra}
  </section>`;

  // Dark call-to-action band with two photos, shared by company and brand pages
  function cta({ title = S.cta.title, text = S.cta.text, photos = S.cta.photos, button = [S.cta.button, '/contact/#enquiry'] } = {}) {
    return `<section class="cta-split" aria-label="Become a partner">
    <div class="cta-split__body reveal">
      <h2 class="h2">${esc(title)}</h2>
      <p>${esc(text)}</p>
      <div class="banner__actions">
        <a class="btn btn--light" href="${button[1]}" data-label="${esc(button[0])}"><span>${esc(button[0])}</span></a>
        <a class="link" href="tel:${PHONE.tel}">${esc(PHONE.label)}</a>
      </div>
    </div>
    ${photos.length ? `<div class="cta-split__media">${photos.map((p) => `<span class="photo">${img(p, '')}</span>`).join('')}</div>` : ''}
  </section>`;
  }

  /* ───────── Home ───────── */
  function homePage() {
    const H = S.home;
    const { header, mega, menu, footer } = chrome(true);
    const brandTiles = brands.map((b, i) => `<a class="brand reveal${i % 4 ? ' d' + (i % 4) : ''}" href="/brands/${b.slug}/">
        ${b.cover ? `<span class="photo"><img src="${esc(b.cover)}" alt="${esc(b.coverAlt || b.name)}" width="1100" height="1650" loading="lazy"></span>` : '<span class="photo photo--empty"><span class="photo__note">Photo coming soon</span></span>'}
        <span class="brand__cap"><span class="h3">${esc(b.name)}</span><span class="brand__desc">${esc(b.tagline)}</span></span>
      </a>`).join('\n      ');
    const tabs = brands.map((b, i) => `<button class="tab" id="tab-${b.slug}" role="tab" type="button" aria-selected="${!i}" aria-controls="panel-${b.slug}" data-tab="${b.slug}"${i ? ' tabindex="-1"' : ''}>${esc(b.name)}</button>`).join('\n      ');
    const shortName = (b) => (b.slug === 'ricci' ? 'Lorenzo Ricci' : b.name);
    const panels = brands.map((b, i) => {
      const items = (H.collections.tabs[b.slug] || []).filter((x) => x.photo);
      let cells, n;
      if (items.length) {
        n = items.length;
        cells = items.map((x) => {
          const href = x.product && models.some((m) => m.id === x.product && !m.hidden) ? (MODEL_PAGES ? `/catalogue/${x.product}/` : `/catalogue/?brand=${b.slug}`) : '';
          return `<a class="model"${href ? ` href="${href}"` : ' role="link" aria-disabled="true"'}><span class="photo"><img src="${esc(x.photo)}" alt="${esc(x.alt || x.caption)}" width="1100" height="1650" loading="lazy">${x.isNew ? '<span class="model__new">New</span>' : ''}</span><span class="model__cap"><span class="h3">${esc(x.caption)}</span></span></a>`;
        });
      } else {
        const keys = (b.keyModels || []).slice(0, 4);
        n = keys.length;
        cells = keys.map((k) => `<a class="model" role="link" aria-disabled="true"><span class="photo photo--empty"><span class="photo__note">Photo coming soon</span></span><span class="model__cap"><span class="h3">${esc(shortName(b))} · ${esc(k)}</span></span></a>`);
      }
      const mod = n === 3 ? ' models--3' : n === 2 ? ' models--2' : n === 1 ? ' models--2' : '';
      return `<!-- ${esc(b.name.toUpperCase())} -->
    <div class="panel${i ? '' : ' reveal'}" id="panel-${b.slug}" role="tabpanel" aria-labelledby="tab-${b.slug}"${i ? ' hidden' : ''}>
      <div class="models${mod}">
        ${cells.join('\n        ')}
      </div>
      <div class="panel__foot"><a class="link" href="/catalogue/?brand=${b.slug}">View the ${esc(b.name)} catalogue</a></div>
    </div>`;
    }).join('\n\n    ');

    return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(H.seoTitle)}</title>
<meta name="description" content="${esc(H.seoDescription)}">
<link rel="alternate" hreflang="en" href="${SITE_URL}/en/">
<link rel="alternate" hreflang="pl" href="${SITE_URL}/pl/">
<link rel="alternate" hreflang="de" href="${SITE_URL}/de/">
<link rel="alternate" hreflang="ru" href="${SITE_URL}/ru/">
<link rel="alternate" hreflang="it" href="${SITE_URL}/it/">
<link rel="alternate" hreflang="el" href="${SITE_URL}/el/">
<link rel="alternate" hreflang="x-default" href="${SITE_URL}/en/">
${HEAD_FONTS}
<link rel="stylesheet" href="/assets/css/site.css">
</head>
<body id="top">

<a class="skip" href="#main">Skip to content</a>

<!-- Header -->
${header}

<!-- Brands mega menu (desktop) -->
${mega}
<!-- Mobile menu -->
${menu}
<main id="main">

  <!-- 1. Hero -->
  <section class="hero" aria-label="Introduction">
    <div class="hero__media">
      <video id="heroVideo" autoplay muted loop playsinline preload="metadata" poster="/assets/img/hero-wide-poster.jpg">
        <source src="/assets/video/hero-wide.mp4" type="video/mp4">
      </video>
      <script>
        /* Phones and portrait tablets get the vertical film; wide screens get a landscape crop of it */
        (function () {
          var v = document.getElementById('heroVideo');
          var tall = window.matchMedia('(max-width: 1023px) and (orientation: portrait)');
          var films = {
            tall: { src: '/assets/video/hero-portrait.mp4', poster: '/assets/img/hero-portrait-poster.jpg' },
            wide: { src: '/assets/video/hero-wide.mp4', poster: '/assets/img/hero-wide-poster.jpg' }
          };
          function pick() {
            var f = tall.matches ? films.tall : films.wide;
            var source = v.querySelector('source');
            if (source.getAttribute('src') === f.src) return;
            source.setAttribute('src', f.src);
            v.setAttribute('poster', f.poster);
            v.classList.toggle('is-tall', tall.matches);
            v.load();
          }
          pick();
          if (tall.addEventListener) tall.addEventListener('change', pick);
        })();
      </script>
      <span class="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-black/10"></span>
    </div>
    <div class="hero__inner">
      <span class="label fade">${esc(H.hero.label)}</span>
      <h1 class="h1 fade f2">${esc(H.hero.title)}</h1>
      <p class="hero__text fade f3">${esc(H.hero.text)}</p>
      <div class="hero__actions fade f4">
        <a class="btn btn--light" href="/contact/#enquiry" data-label="${esc(H.hero.button)}"><span>${esc(H.hero.button)}</span></a>
        <a class="link" href="#brands">${esc(H.hero.link)}</a>
      </div>
    </div>
  </section>

  <!-- 2. About the group -->
  <section class="split" id="about">
    <div class="split__media">
      ${H.about.photos.map((p, i) => photo(p, i ? ' d1' : '')).join('\n      ')}
    </div>
    <div class="split__body">
      <span class="label reveal">${esc(H.about.label)}</span>
      <h2 class="h2 reveal">${esc(H.about.title)}</h2>
      ${H.about.texts.map((t) => `<p class="text reveal">${esc(t)}</p>`).join('\n      ')}
      <dl class="stats reveal">
        ${H.about.stats.map((s) => `<div class="stat"><dt>${esc(s.label)}</dt><dd>${esc(s.value)}</dd></div>`).join('\n        ')}
      </dl>
      <a class="link reveal" href="/about/">More about us</a>
    </div>
  </section>

  <!-- 3. Our brands -->
  <section class="section" id="brands">
    <header class="head head--center reveal">
      <span class="label">${esc(H.brands.label)}</span>
      <h2 class="h2">${esc(H.brands.title)}</h2>
      <p class="text">${esc(H.brands.text)}</p>
    </header>

    <div class="brands-grid">
      ${brandTiles}
      <div class="brand brand--cta reveal d3">
        <span class="h3">${esc(H.brands.ctaTitle)}</span>
        <p class="text">${esc(H.brands.ctaText)}</p>
        <a class="link" href="/contact/#enquiry">Become a partner</a>
      </div>
    </div>
  </section>

  <!-- 4. Benefits of working with us -->
  <section class="split split--rev" id="benefits">
    <div class="split__media split__media--single">
      ${photo(H.benefits.photo)}
    </div>
    <div class="split__body">
      <span class="label reveal">${esc(H.benefits.label)}</span>
      <h2 class="h2 reveal">${esc(H.benefits.title)}</h2>
      <div class="ben-grid">
        ${H.benefits.items.map((x, i) => `<div class="ben reveal${i % 2 ? ' d1' : ''}"><h3 class="h3">${esc(x.title)}</h3><p class="text">${esc(x.text)}</p></div>`).join('\n        ')}
      </div>
    </div>
  </section>

  ${termsStrip()}

  <!-- 5. Brand collections -->
  <section class="section" id="collections">
    <header class="head head--center reveal">
      <span class="label">${esc(H.collections.label)}</span>
      <h2 class="h2">${esc(H.collections.title)}</h2>
    </header>

    <div class="tabs reveal" role="tablist" aria-label="Brands">
      ${tabs}
    </div>

    ${panels}
  </section>

  <!-- 6. Exclusive services -->
  <section class="split" id="services">
    <div class="split__media split__media--single">
      ${photo(H.services.photo)}
    </div>
    <div class="split__body">
      <span class="label reveal">${esc(H.services.label)}</span>
      <h2 class="h2 reveal">${esc(H.services.title)}</h2>
      <p class="text reveal">${esc(H.services.text)}</p>
      <ul class="svc-list">
        ${H.services.items.map((x) => `<li class="svc reveal"><h3 class="h3">${esc(x.title)}</h3><p class="text">${esc(x.text)}</p></li>`).join('\n        ')}
      </ul>
    </div>
  </section>

  <!-- 7. Call to action -->
  <section class="banner" aria-label="Become a partner">
    <div class="banner__media">
      <video class="banner__video" muted loop playsinline preload="none" poster="/assets/video/eleonora-banner-poster.jpg" aria-label="Eleonora dresses filmed in Kraków">
        <source src="/assets/video/eleonora-banner.mp4" type="video/mp4">
      </video>
      <span class="banner__shade"></span>
    </div>
    <div class="banner__body reveal">
      <span class="label">${esc(H.banner.label)}</span>
      <h2 class="h2">${esc(H.banner.title)}</h2>
      <p>${esc(H.banner.text)}</p>
      <div class="banner__actions">
        <a class="btn btn--light" href="/contact/#enquiry" data-label="${esc(H.banner.button)}"><span>${esc(H.banner.button)}</span></a>
        <a class="link" href="tel:${PHONE.tel}">${esc(PHONE.label)}</a>
      </div>
    </div>
  </section>

</main>

<!-- Footer -->
${footer}

<script src="/assets/js/site.js"></script>
</body>
</html>
`;
  }

  /* ───────── Brand pages ───────── */
  function brandPage(b) {
    const list = byBrand[b.slug];
    const has = list.length > 0;
    const named = collections.filter((c) => c.brand === b.slug && list.some((m) => m.collection === c.name));
    const uniq = (k) => [...new Set(list.map((m) => m[k]))];

    const media = b.heroVideo
      ? `<video class="bh__media" autoplay muted loop playsinline preload="metadata" poster="${b.heroPhoto}" aria-hidden="true"><source src="${b.heroVideo}" type="video/mp4"></video>`
      : b.heroPhoto ? `<img class="bh__media" src="${b.heroPhoto}"${srcsetFor(b.heroPhoto)} alt="${esc(b.name)} wedding dress" fetchpriority="high">` : '';
    const cards = list.slice(0, 6);
    const hero = `<section class="bh bh--${b.slug}${media ? '' : ' bh--text'}">
      <div class="bh__first">
      ${media ? `<div class="bh__pic">${media}</div>` : ''}
      <div class="bh__body">
        <span class="bh__meta fade">${has ? `${list.length} models · ${uniq('sil').length} silhouettes` : 'Collection coming soon'}</span>
        <h1 class="bh__title fade f2">${esc(b.name)}</h1>
        <p class="bh__tag fade f2">${esc(b.tagline)}</p>
        <div class="bh__actions fade f3">
          ${has ? `<a class="btn btn--light btn--sm" href="/catalogue/?brand=${b.slug}" data-label="View catalogue"><span>View catalogue</span></a>
          <a class="link bh__link" href="/contact/">Become a partner</a>` : `<a class="btn btn--sm${media ? ' btn--light' : ''}" href="/contact/" data-label="Become a partner"><span>Become a partner</span></a>`}
        </div>
      </div>
      </div>
      ${cards.length ? `<div class="bh-cards fade f4" data-rotate aria-label="${esc(b.name)} models">
        ${cards.map((m, i) => `<a class="bh-card${i ? '' : ' is-on'}" href="${modelHref(m)}"${i ? ' tabindex="-1" aria-hidden="true"' : ''}>
          <span class="bh-card__body">
            <span class="bh-card__label">${pad(i + 1)} / ${pad(cards.length)}</span>
            <span class="bh-card__name">${esc(modelName(m))}</span>
            <span class="bh-card__meta">${L.sil[m.sil] || ''} · ${L.fabric[m.fabric] || ''}</span>
          </span>
          <img class="bh-card__img" src="${m.photos[0]}" alt="" width="900" height="1350"${i ? ' loading="lazy"' : ''}>
        </a>`).join('')}
        <span class="bh-cards__bar" aria-hidden="true"><i></i></span>
      </div>` : ''}
    </section>`;

    const specRows = [
      ['Key models', (b.keyModels || []).join(' · ')],
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
          ${(b.about || []).map((p) => `<p class="text reveal">${esc(p)}</p>`).join('\n          ')}
          <dl class="specs reveal">${specRows.map(([k, v]) => `<div><dt>${k}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
        </div>
        ${b.aboutPhoto ? `<span class="photo reveal d1">${img(b.aboutPhoto, `${b.name} — detail`)}</span>` : ''}
      </div>
    </section>`;

    // Collections: named collections when the brand has them, otherwise the line grouped by silhouette
    let groups = [];
    if (named.length) {
      groups = named.map((c) => {
        const items = list.filter((m) => m.collection === c.name);
        return { title: c.name, items, cover: c.cover || items[0].photos[0], href: `/catalogue/?brand=${b.slug}&amp;collection=${c.slug}`, note: c.isNew ? 'New' : '' };
      });
    } else if (has) {
      groups = uniq('sil').map((s) => ({ title: L.sil[s], items: list.filter((m) => m.sil === s), href: `/catalogue/?brand=${b.slug}&amp;sil=${s}` }))
        .filter((g) => g.items.length >= 2).sort((a, z) => z.items.length - a.items.length).slice(0, 3)
        .map((g) => ({ ...g, cover: g.items[0].photos[0] }));
    }
    const coll = `<section class="section" id="collections">
      <header class="head head--center reveal">
        <h2 class="h2">${named.length ? 'Collections' : 'The collection'}</h2>
        ${has && !named.length ? `<p class="text">The current ${esc(b.name)} line, by silhouette.</p>` : ''}
      </header>
      ${groups.length ? `<div class="coll-grid">${groups.map((g, i) => `
        <a class="coll reveal${i ? ' d' + i : ''}" href="${g.href}">
          <span class="photo">${img(g.cover, g.title)}</span>
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
      description: `${b.name}: ${String(b.tagline).toLowerCase()}. ${has ? list.length + ' models. ' : ''}Wholesale wedding dresses for bridal salons from QUEEN Fashion Group.`,
      path: `/brands/${b.slug}/`,
      scripts: '<script src="/assets/js/brand.js"></script>',
      body: [hero, about, coll, gal, cta({ title: S.cta.brandTitle.replace('{brand}', b.name), text: S.cta.text, photos: b.cta || [], button: [S.cta.button, '/contact/'] })].join('\n\n  '),
    });
  }

  /* ───────── Catalogue ───────── */
  function cataloguePage() {
    const rows = catalogueOrder.map((m) => ({
      id: m.id, b: m.brand, n: modelName(m), c: m.collection ? (collBy[m.collection]?.slug || slugify(m.collection)) : '', s: m.sil, sl: m.sleeves, f: m.fabric, d: m.details || [],
      p: m.photos.slice(0, 2), nw: !!m.isNew, v: !!m.video,
    }));
    const meta = {
      modelPages: MODEL_PAGES,
      brands: brands.map((b) => ({ slug: b.slug, name: b.name, keys: b.keyModels })),
      collections: collections.map((c) => ({ slug: c.slug, name: c.name, brand: c.brand })),
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
    const withModels = brands.filter((b) => byBrand[b.slug].length).map((b) => b.name);
    return page({
      title: 'Catalogue — all wedding dress models | QUEEN Fashion Group',
      description: `Wholesale catalogue of ${catalogueOrder.length} wedding dress models from ${withModels.length > 1 ? withModels.slice(0, -1).join(', ') + ' and ' + withModels.at(-1) : withModels.join('')}. Filter by brand, collection, silhouette, sleeves and fabric.`,
      path: '/catalogue/',
      current: 'catalogue',
      body,
      scripts: `<script>window.CATALOG = ${JSON.stringify({ meta, models: rows })};</script>\n<script src="/assets/js/catalogue.js"></script>`,
    });
  }

  /* ───────── Model pages ───────── */
  function modelPage(m) {
    const b = brandBy[m.brand];
    const list = byBrand[m.brand].includes(m) ? byBrand[m.brand] : [...byBrand[m.brand], m];
    const i = list.indexOf(m);
    const prev = list[(i - 1 + list.length) % list.length];
    const next = list[(i + 1) % list.length];
    const more = [1, 2, 3, 4].map((k) => list[(i + k) % list.length]).filter((x) => x !== m);
    const name = modelName(m);

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
      ['Sleeves', L.sleeves[m.sleeves]],
      (m.details || []).length && ['Details', m.details.map((d) => L.details[d]).join(' · ')],
      m.colour && ['Colour', esc(m.colour)],
    ].filter((x) => x && x[1]);
    const sizes = [
      ['Size charts', 'European and Ukrainian'],
      ['Made to order', 'Sleeves, length, train and colour can be changed for your client'],
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
        <p class="pdp__eyebrow"><a class="u-link" href="/brands/${b.slug}/">${esc(b.name)}</a>${m.isNew ? '<em>New</em>' : ''}</p>
        <h1 class="pdp__title">${esc(name)}</h1>
        <p class="pdp__sub">${esc(m.description || describe(m))}</p>
        <div class="pdp__cta">
          <a class="btn" href="/contact/?model=${encodeURIComponent(name)}&amp;brand=${encodeURIComponent(b.name)}#enquiry" data-label="Request price"><span>Request price</span></a>
          <a class="link" href="tel:${PHONE.tel}">Ask a manager</a>
        </div>

        <dl class="pdp__facts">${facts.map(([k, v]) => `<div><dt>${k}</dt><dd>${v}</dd></div>`).join('')}</dl>

        <div class="faq pdp__more">
          <details class="faq__item"><summary>Sizes &amp; wholesale terms<i aria-hidden="true"></i></summary>${specList([...sizes, ...terms])}</details>
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
      description: `${name}. ${m.description || describe(m)} Wholesale from QUEEN Fashion Group, price on request.`,
      path: `/catalogue/${m.id}/`,
      current: 'catalogue',
      body,
      scripts: `<script>window.PDP = { prev: '/catalogue/${prev.id}/', next: '/catalogue/${next.id}/' };</script>\n<script src="/assets/js/model.js"></script>`,
    });
  }

  /* ───────── Our brands ───────── */
  function brandsPage() {
    const P = S.brandsPage;
    const withPhotos = brands.filter((b) => b.heroPhoto);
    const upcoming = brands.filter((b) => !b.heroPhoto);
    const rows = withPhotos.map((b, i) => {
      const list = byBrand[b.slug];
      const sils = [...new Set(list.map((m) => m.sil))].length;
      const src = b.heroPhoto.replace('-2560', '-1200');
      return `<article class="brow${i % 2 ? ' brow--rev' : ''}">
      <a class="brow__media photo reveal" href="/brands/${b.slug}/" tabindex="-1" aria-hidden="true">${img(src, '')}</a>
      <div class="brow__body reveal d1">
        <span class="brow__num">${pad(i + 1)}</span>
        <h2 class="h2">${esc(b.name)}</h2>
        <p class="brow__tag">${esc(b.tagline)}</p>
        <p class="text">${esc(b.intro)}</p>
        <dl class="brow__meta">
          ${list.length ? `<div><dt>Models</dt><dd>${list.length}</dd></div>
          <div><dt>Silhouettes</dt><dd>${sils}</dd></div>` : '<div><dt>Collection</dt><dd>Coming soon</dd></div>'}
          <div><dt>Key models</dt><dd>${(b.keyModels || []).slice(0, 3).join(' · ')}</dd></div>
        </dl>
        <div class="brow__actions">
          <a class="btn btn--sm" href="/brands/${b.slug}/" data-label="Discover ${esc(b.name)}"><span>Discover ${esc(b.name)}</span></a>
          <a class="link" href="/catalogue/?brand=${b.slug}">Catalogue</a>
        </div>
      </div>
    </article>`;
    }).join('\n    ');
    const next = upcoming.map((b, i) => `<a class="bnext reveal${i % 4 ? ` d${i % 4}` : ''}" href="/brands/${b.slug}/">
        <span class="brow__num">${pad(withPhotos.length + i + 1)}</span>
        <span class="bnext__name">${esc(b.name)}</span>
        <span class="text">${esc(b.tagline)}</span>
        <span class="bnext__keys">Key models · ${(b.keyModels || []).join(' · ')}</span>
      </a>`).join('\n      ');
    return page({
      title: 'Our brands — QUEEN Fashion Group',
      description: `Seven wedding dress brands from one manufacturer: ${brands.slice(0, -1).map((b) => b.name).join(', ')} and ${brands.at(-1).name}.`,
      path: '/brands/',
      current: '/brands/',
      body: [
        intro(P.title, P.text),
        `<section class="brows">\n    ${rows}\n  </section>`,
        upcoming.length ? `<section class="section section--tint">
    <header class="head head--center reveal">
      <h2 class="h2">${esc(P.nextTitle)}</h2>
      <p class="text">${esc(P.nextText)}</p>
    </header>
    <div class="bnext-grid">
      ${next}
    </div>
  </section>` : '',
        termsStrip('terms terms--page reveal'),
        cta({ title: P.ctaTitle, text: P.ctaText }),
      ].filter(Boolean).join('\n\n  '),
    });
  }

  /* ───────── About us ───────── */
  function aboutPage() {
    const A = S.about;
    const hero = `<section class="bh bh--about">
      <div class="bh__first">
      <div class="bh__pic"><img class="bh__media" src="${esc(A.hero.photo)}"${srcsetFor(A.hero.photo)} alt="A bride in an Eleonora gown in a palace garden" fetchpriority="high"></div>
      <div class="bh__body">
        <span class="bh__meta fade">${esc(A.hero.label)}</span>
        <h1 class="bh__title fade f2">${esc(A.hero.title)}</h1>
        <p class="bh__tag fade f2">${esc(A.hero.text)}</p>
      </div>
      </div>
    </section>`;
    const story = `<section class="section">
    <div class="lead">
      <h2 class="h2 reveal">${esc(A.story.title)}</h2>
      <div class="lead__text">
        ${A.story.texts.map((t) => `<p class="text reveal">${esc(t)}</p>`).join('\n        ')}
      </div>
    </div>
    <dl class="stats stats--page reveal">
      ${S.home.about.stats.map((s) => `<div class="stat"><dt>${esc(s.label)}</dt><dd>${esc(s.value)}</dd></div>`).join('\n      ')}
    </dl>
  </section>`;
    const craft = `<section class="split">
    <div class="split__media">
      ${A.craft.photos.map((p, i) => photo(p, i ? ' d1' : '')).join('\n      ')}
    </div>
    <div class="split__body">
      <h2 class="h2 reveal">${esc(A.craft.title)}</h2>
      <p class="text reveal">${esc(A.craft.text)}</p>
      <ul class="svc-list">
        ${A.craft.items.map((x) => `<li class="svc reveal"><h3 class="h3">${esc(x.title)}</h3><p class="text">${esc(x.text)}</p></li>`).join('\n        ')}
      </ul>
    </div>
  </section>`;
    const advs = `<section class="section">
    <header class="head head--center reveal">
      <h2 class="h2">${esc(A.values.title)}</h2>
    </header>
    <ol class="adv-grid">
      ${A.values.items.map((x, i) => `<li class="adv reveal${i % 3 ? ` d${i % 3}` : ''}"><span class="brow__num">${pad(i + 1)}</span><h3 class="h3">${esc(x.title)}</h3><p class="text">${esc(x.text)}</p></li>`).join('\n      ')}
    </ol>
  </section>`;
    const group = `<section class="section section--tint">
    <div class="lead">
      <h2 class="h2 reveal">${esc(A.groupTitle)}</h2>
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
      <h2 class="h2">${esc(A.eventsTitle)}</h2>
      <p class="text">${esc(A.eventsText)}</p>
    </header>
    <div class="posts">
      ${posts.slice(0, 3).map((p, i) => postCard(p, i)).join('\n      ')}
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

  /* ───────── Wholesale partnership ───────── */
  function partnersPage() {
    const P = S.partners;
    return page({
      title: 'Wholesale partnership — QUEEN Fashion Group',
      description: 'Terms of cooperation for bridal salons: minimum order of 5 dresses, 6–8 weeks production, 30/70 payment in EUR, PLN or USD, DPD delivery.',
      path: '/partners/',
      current: '/partners/',
      body: [
        intro(P.title, P.text,
          `<div class="page-intro__actions fade f3"><a class="btn" href="/contact/#enquiry" data-label="Become a partner"><span>Become a partner</span></a><a class="link" href="#terms">Terms of cooperation</a></div>`),
        `<section id="terms" class="terms-wrap">${termsStrip('terms terms--page reveal')}</section>`,
        `<section class="section">
    <header class="head head--center reveal">
      <h2 class="h2">${esc(P.stepsTitle)}</h2>
    </header>
    <ol class="steps">
      ${P.steps.map((x, i) => `<li class="step reveal${i % 5 ? ` d${Math.min(i, 3)}` : ''}"><span class="brow__num">${pad(i + 1)}</span><h3 class="h3">${esc(x.title)}</h3><p class="text">${esc(x.text)}</p></li>`).join('\n      ')}
    </ol>
  </section>`,
        `<section class="split split--rev">
    <div class="split__media split__media--single">
      <div class="photo reveal"><img src="${esc(P.benefitsPhoto.src)}" alt="${esc(P.benefitsPhoto.alt)}" width="1600" height="2400" loading="lazy"></div>
    </div>
    <div class="split__body">
      <h2 class="h2 reveal">${esc(P.benefitsTitle)}</h2>
      <div class="ben-grid">
        ${P.benefits.map((x, i) => `<div class="ben reveal${i % 2 ? ' d1' : ''}"><h3 class="h3">${esc(x.title)}</h3><p class="text">${esc(x.text)}</p></div>`).join('\n        ')}
      </div>
    </div>
  </section>`,
        `<section class="split" id="services">
    <div class="split__media split__media--single">
      ${photo(P.servicesPhoto)}
    </div>
    <div class="split__body">
      <h2 class="h2 reveal">${esc(P.servicesTitle)}</h2>
      <p class="text reveal">${esc(P.servicesText)}</p>
      <ul class="svc-list">
        ${P.services.map((x) => `<li class="svc reveal"><h3 class="h3">${esc(x.title)}</h3><p class="text">${esc(x.text)}</p></li>`).join('\n        ')}
      </ul>
    </div>
  </section>`,
        `<section class="section">
    <div class="lead">
      <h2 class="h2 reveal">${esc(P.faqTitle)}</h2>
      <div class="faq reveal">
        ${P.faq.map((x) => `<details class="faq__item"><summary>${esc(x.q)}<i aria-hidden="true"></i></summary><p class="text">${esc(x.a)}</p></details>`).join('\n        ')}
      </div>
    </div>
  </section>`,
        cta({ title: P.ctaTitle, text: P.ctaText, button: ['Become a partner', '/contact/#enquiry'] }),
      ].join('\n\n  '),
    });
  }

  /* ───────── Contacts ───────── */
  function contactPage() {
    const P = S.contactPage;
    const brandChecks = brands.map((b) => `<label class="pick"><input type="checkbox" name="brands" value="${esc(b.name)}"><span>${esc(b.name)}</span></label>`).join('');
    const [company, ...addr] = [C.company, C.address];
    return page({
      title: 'Contacts — QUEEN Fashion Group',
      description: 'Contact QUEEN Fashion Group: wholesale enquiries, managers for the Polish, German and Italian markets, office in Kraków.',
      path: '/contact/',
      current: '/contact/',
      body: `<section class="cpage">
    <div class="cpage__info">
      <h1 class="h1 fade">${esc(P.title)}</h1>
      <p class="text fade f2">${esc(P.text)}</p>
      <ul class="clist fade f3">
        ${C.managers.map((m) => `<li><span><b>${esc(m.name)}</b><small>${esc(m.market)}</small></span><a class="u-link" href="tel:${telOf(m.phone)}">${esc(m.phone)}</a></li>`).join('\n        ')}
        <li><span><b>E-mail</b><small>All markets</small></span><a class="u-link" href="mailto:${esc(EMAIL)}">${esc(EMAIL)}</a></li>
      </ul>
      <address class="caddr fade f3">
        <span class="label">Office</span>
        ${esc(company)}<br>${esc(addr[0])}
      </address>
    </div>

    <div class="cpage__form" id="enquiry">
      <form class="form fade f2" id="enquiryForm" novalidate>
        <h2 class="h2">${esc(P.formTitle)}</h2>
        <p class="text">${esc(P.formText)}</p>
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
        <p class="text">Your email app has opened with the request ready to send. If it didn't, write to us at <a class="u-link" href="mailto:${esc(EMAIL)}">${esc(EMAIL)}</a> or call <a class="u-link" href="tel:${PHONE.tel}">${esc(PHONE.label)}</a>.</p>
        <a class="link" href="/catalogue/">Browse the catalogue</a>
      </div>
    </div>
  </section>
  <section class="marquee" aria-label="Dresses from our brands">
    <div class="marquee__track">
      ${[0, 1].map((copy) => P.photos.map((src) => `<span class="marquee__item"${copy ? ' aria-hidden="true"' : ''}><img src="${esc(src)}" alt="" width="1400" height="2100" decoding="async"></span>`).join('')).join('\n      ')}
    </div>
  </section>`,
      scripts: '<script src="/assets/js/contact.js"></script>',
    });
  }

  /* ───────── Blog ───────── */
  function postCard(p, i = 0) {
    return `<a class="post reveal${i % 3 ? ` d${i % 3}` : ''}" href="/blog/${p.slug}/">
        <span class="photo post__photo"><img src="${esc(p.photo)}" alt="" width="827" height="550" loading="lazy"></span>
        <span class="post__meta">${esc(p.date)} · ${esc(p.tag)}</span>
        <span class="post__title">${esc(p.title)}</span>
      </a>`;
  }
  function blogPage() {
    const [first, ...rest] = posts;
    return page({
      title: 'Blog — QUEEN Fashion Group',
      description: 'News from QUEEN Fashion Group: bridal fashion weeks, trade fairs and new collections.',
      path: '/blog/',
      current: '/blog/',
      body: [
        intro(S.blogPage.title, S.blogPage.text),
        first ? `<section class="section section--flush">
    <a class="feature reveal" href="/blog/${first.slug}/">
      <span class="photo feature__photo"><img src="${esc(first.photo)}" alt="" width="827" height="550" fetchpriority="high"></span>
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
  </section>` : '',
        cta(),
      ].filter(Boolean).join('\n\n  '),
    });
  }
  function postPage(p) {
    const more = posts.filter((x) => x !== p).slice(0, 2);
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
    <span class="photo article__photo fade f3"><img src="${esc(p.photo)}" alt="${esc(p.title)}" width="827" height="550" fetchpriority="high"></span>
    <div class="article__body">
      <p class="article__lead reveal">${esc(p.lead)}</p>
      ${p.body.map((t) => `<p class="reveal">${esc(t)}</p>`).join('\n      ')}
    </div>
  </article>`,
        more.length ? `<section class="section section--tint">
    <header class="head head--center reveal"><h2 class="h2">More news</h2></header>
    <div class="posts posts--2">
      ${more.map((x, i) => postCard(x, i)).join('\n      ')}
    </div>
  </section>` : '',
        cta(),
      ].filter(Boolean).join('\n\n  '),
    });
  }

  /* ───────── Privacy, 404 ───────── */
  function privacyPage() {
    const mail = `<a class="u-link" href="mailto:${esc(EMAIL)}">${esc(EMAIL)}</a>`;
    return page({
      title: 'Privacy policy — QUEEN Fashion Group',
      description: 'How QUEEN Fashion Group handles the personal data of partners and website visitors.',
      path: '/privacy/',
      body: `<article class="legal">
    <h1 class="h1 fade">Privacy policy</h1>
    <p class="post__meta fade f2">${esc(S.privacy.updated)}</p>
    ${S.privacy.sections.map((x) => `<section class="reveal"><h2 class="legal__h">${esc(x.title)}</h2><p>${esc(x.text).replace('{email}', mail)}</p></section>`).join('\n    ')}
  </article>`,
    });
  }
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

  /* ───────── Routing ───────── */
  // URL → html. Unknown URLs return null.
  function render(url) {
    url = String(url).split(/[?#]/)[0];
    const path = ('/' + url.replace(/^\/+|\/+$/g, '') + '/').replace('//', '/');
    let m;
    if (path === '/') return homePage();
    if (path === '/brands/') return brandsPage();
    if ((m = path.match(/^\/brands\/([^/]+)\/$/))) return brandBy[m[1]] ? brandPage(brandBy[m[1]]) : null;
    if (path === '/catalogue/') return cataloguePage();
    if ((m = path.match(/^\/catalogue\/([^/]+)\/$/))) { const x = models.find((y) => y.id === m[1]); return x ? modelPage(x) : null; }
    if (path === '/about/') return aboutPage();
    if (path === '/partners/') return partnersPage();
    if (path === '/contact/') return contactPage();
    if (path === '/blog/') return blogPage();
    if ((m = path.match(/^\/blog\/([^/]+)\/$/))) { const p = posts.find((y) => y.slug === m[1]); return p ? postPage(p) : null; }
    if (path === '/privacy/') return privacyPage();
    if (path === '/404/') return notFoundPage();
    return null;
  }

  // Every generated file
  function pages() {
    const out = [{ file: 'index.html', html: homePage() }];
    for (const b of brands) out.push({ file: `brands/${b.slug}/index.html`, html: brandPage(b) });
    out.push({ file: 'brands/index.html', html: brandsPage() });
    out.push({ file: 'catalogue/index.html', html: cataloguePage() });
    if (MODEL_PAGES) for (const m of models) if (!m.hidden) out.push({ file: `catalogue/${m.id}/index.html`, html: modelPage(m) });
    out.push({ file: 'about/index.html', html: aboutPage() });
    out.push({ file: 'partners/index.html', html: partnersPage() });
    out.push({ file: 'contact/index.html', html: contactPage() });
    out.push({ file: 'blog/index.html', html: blogPage() });
    for (const p of posts) out.push({ file: `blog/${p.slug}/index.html`, html: postPage(p) });
    out.push({ file: 'privacy/index.html', html: privacyPage() });
    out.push({ file: '404.html', html: notFoundPage() });
    return out;
  }

  return { render, pages, modelName, describe, byBrand, brandBy };
}

// Folders whose index.html files are fully generated (anything else in them that is not regenerated is stale)
export const GENERATED_DIRS = ['brands/', 'catalogue/', 'blog/'];
