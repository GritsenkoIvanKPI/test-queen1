// Languages and interface strings. English is the source; other languages live in
// data/translations.json as { pl: { ui, labels, site, brands, posts }, de: {...}, ... }.
// Anything missing in a translation falls back to English.

export const LANGS = [
  { code: 'en', name: 'English', short: 'EN' },
  { code: 'pl', name: 'Polski', short: 'PL' },
  { code: 'de', name: 'Deutsch', short: 'DE' },
  { code: 'ru', name: 'Русский', short: 'RU' },
  { code: 'it', name: 'Italiano', short: 'IT' },
  { code: 'el', name: 'Ελληνικά', short: 'EL' },
];
export const DEFAULT_LANG = 'en';
// English lives at the site root, other languages under /{code}/
export const prefixOf = (lang) => (lang === DEFAULT_LANG ? '' : '/' + lang);

// Plural values are objects keyed by Intl.PluralRules categories: { one, few, many, other }
export const UI_EN = {
  nav: {
    brands: 'Brands', catalogue: 'Catalogue', aboutUs: 'About us', blog: 'Blog', contacts: 'Contacts', home: 'Home',
    ourBrands: 'Our brands', allBrands: 'All brands', fullCatalogue: 'Full catalogue', company: 'Company', partners: 'Partners',
    wholesaleEnquiry: 'Wholesale enquiry', termsOfCooperation: 'Terms of cooperation', exclusiveServices: 'Exclusive services',
    privacyPolicy: 'Privacy policy', becomePartner: 'Become a partner', email: 'E-mail', allMarkets: 'All markets', office: 'Office',
    officeCountry: 'Poland', backToTop: 'Back to top', skip: 'Skip to content', openMenu: 'Open menu',
    homeAria: 'QUEEN Fashion Group — home', topAria: 'QUEEN Fashion Group — back to top', language: 'Language', call: 'Call {phone}',
  },
  common: {
    new: 'New', video: 'Video', photoSoon: 'Photo coming soon', comingSoon: 'Coming soon', moreAboutUs: 'More about us',
    viewBrandCatalogue: 'View the {brand} catalogue', termsAria: 'Terms at a glance', introAria: 'Introduction',
    heroVideoAria: 'Eleonora dresses filmed in Kraków',
    dressAlt: '{name}, {style} wedding dress',
  },
  brand: {
    nModels: { one: '{n} model', other: '{n} models' },
    nSilhouettes: { one: '{n} silhouette', other: '{n} silhouettes' },
    collectionSoon: 'Collection coming soon', viewCatalogue: 'View catalogue', heroAlt: '{brand} wedding dress', modelsAria: '{brand} models',
    keyModels: 'Key models', silhouettes: 'Silhouettes', fabrics: 'Fabrics', production: 'Production', productionValue: 'Handmade, in our own production',
    minOrder: 'Minimum order', minOrderValue: '5 dresses from a new collection', sizes: 'Sizes', sizesValue: 'EU and UA size charts',
    detailAlt: '{brand} — detail', collections: 'Collections', theCollection: 'The collection', bySilhouette: 'The current {brand} line, by silhouette.',
    collectionsSoon: 'Collections coming soon', selectedModels: 'Selected models', viewAll: { one: 'View {n} model', other: 'View all {n} models' },
    modelsSoon: 'Models coming soon',
    seoTitle: '{brand} — wedding dresses wholesale | QUEEN Fashion Group',
    seoDesc: '{brand}: {tagline}. Wholesale wedding dresses for bridal salons from QUEEN Fashion Group.',
  },
  catalogue: {
    title: 'All models', intro: 'Every model from every brand in one place. Choose a brand, then narrow down by silhouette, sleeves or fabric.',
    brandIntro: 'The {brand} catalogue. Switch brand above at any time, or narrow down by silhouette, sleeves or fabric.',
    all: 'All', filters: 'Filters', sort: 'Sort', featured: 'Featured', newFirst: 'New first', byArticle: 'By article', view: 'View',
    grid: 'Grid view', gallery: 'Gallery view', showMore: 'Show more', closeFilters: 'Close filters', clear: 'Clear', clearAll: 'Clear all',
    clearFilters: 'Clear filters', remove: 'Remove', countN: { one: '{n} model', other: '{n} models' }, showN: { one: 'Show {n} model', other: 'Show {n} models' }, brandAria: 'Brand', modelsAria: 'Models',
    gCollection: 'Collection', gSilhouette: 'Silhouette', gSleeves: 'Sleeves & neckline', gFabric: 'Fabric', gDetails: 'Details',
    newModels: 'New models', withVideo: 'With video', soonTitle: '{brand} — coming soon',
    soonText: 'The collection is being photographed. Key models: {keys}.', askManager: 'Ask a manager', noMatch: 'No models match these filters',
    docTitle: 'Wholesale wedding dress catalogue | QUEEN Fashion Group', docTitleBrand: '{brand} catalogue | QUEEN Fashion Group',
    seoDesc: 'Wholesale catalogue of {n} wedding dress models. Filter by brand, collection, silhouette, sleeves and fabric.',
  },
  model: {
    front: '{name} — front', view: '{name} — view {k}', videoAlt: '{name} — video', openPhoto: 'Open photo {k} of {total} full screen',
    photos: 'Photos', photo: 'Photo {k}', silhouette: 'Silhouette', fabric: 'Fabric', sleeves: 'Sleeves', details: 'Details', colour: 'Colour',
    sizeCharts: 'Size charts', sizeChartsValue: 'European and Ukrainian', madeToOrder: 'Made to order',
    madeToOrderValue: 'Sleeves, length, train and colour can be changed for your client',
    minOrder: 'Minimum order', minOrderValue: '5 dresses from a new collection — models and brands can be combined',
    production: 'Production', productionValue: '6–8 weeks after prepayment, 8–12 weeks from May to September',
    payment: 'Payment', paymentValue: '30% deposit, 70% before shipping. EUR, PLN or USD',
    delivery: 'Delivery', deliveryValue: 'DPD, door-to-door to your salon',
    requestPrice: 'Request price', askManager: 'Ask a manager', sizesTerms: 'Sizes & wholesale terms', switchModel: 'Switch model',
    previous: 'Previous', next: 'Next', close: 'Close', prevPhoto: 'Previous photo', nextPhoto: 'Next photo',
    moreFrom: 'More from {brand}', allBrandModels: 'All {brand} models', moreModels: 'More models',
    seoTitle: '{name} — {style} wedding dress | QUEEN Fashion Group',
    seoDesc: '{name}. {desc} Wholesale from QUEEN Fashion Group, price on request.',
    weddingDress: 'wedding dress',
  },
  brandsPage: {
    models: 'Models', silhouettes: 'Silhouettes', collection: 'Collection', keyModels: 'Key models', keyModelsLine: 'Key models · {keys}',
    discover: 'Discover {brand}', catalogue: 'Catalogue',
    seoTitle: 'Our brands — {n} wedding dress brands | QUEEN Fashion Group', seoDesc: 'Seven wedding dress brands from one manufacturer, supplied wholesale to bridal salons: {list}.',
  },
  about: {
    heroAlt: 'A bride in an Eleonora gown in a palace garden', allBrands: 'All brands',
    seoTitle: 'About us — wedding dress manufacturer | QUEEN Fashion Group',
    seoDesc: 'QUEEN Fashion Group: seven wedding dress brands, handmade in our own production and supplied wholesale to bridal salons in 18 countries.',
  },
  partners: {
    becomePartner: 'Become a partner', termsLink: 'Terms of cooperation',
    seoTitle: 'Wholesale partnership for bridal salons | QUEEN Fashion Group',
    seoDesc: 'Terms of cooperation for bridal salons: minimum order of 5 dresses, 6–8 weeks production, 30/70 payment in EUR, PLN or USD, DPD delivery.',
  },
  contact: {
    seoTitle: 'Contacts — wholesale wedding dress enquiries | QUEEN Fashion Group',
    seoDesc: 'Contact QUEEN Fashion Group: wholesale enquiries, managers for the Polish, German and Italian markets, office in Kraków.',
    name: 'Name *', salon: 'Salon or company *', email: 'E-mail *', phone: 'Phone', country: 'Country *',
    brandsLegend: 'Brands you are interested in', message: 'Message',
    consent: 'I agree to the processing of my personal data to answer this request, as described in the {link}. *', consentLink: 'privacy policy',
    send: 'Send request', thanks: 'Thank you',
    thanksText: "Your email app has opened with the request ready to send. If it didn't, write to us at {email} or call {phone}.",
    browse: 'Browse the catalogue', stripAria: 'Dresses from our brands',
    errName: 'Please enter your name.', errSalon: 'Please enter your salon or company.', errEmail: 'Please enter your e-mail.',
    errEmailBad: 'Please check your e-mail address.', errCountry: 'Please enter your country.', errConsent: 'Please agree to the processing of your data.',
    mailSubject: 'Wholesale enquiry — {company}', mailName: 'Name', mailSalon: 'Salon / company', mailCountry: 'Country', mailEmail: 'E-mail',
    mailPhone: 'Phone', mailBrands: 'Brands', priceRequest: 'Price request: {model}',
  },
  blog: {
    seoTitle: 'Blog — bridal fashion news | QUEEN Fashion Group', seoDesc: 'News from QUEEN Fashion Group: bridal fashion weeks, trade fairs and new collections.',
    readStory: 'Read the story', allNews: 'All news', moreNews: 'More news',
  },
  privacy: {
    title: 'Privacy policy', seoTitle: 'Privacy policy — QUEEN Fashion Group',
    seoDesc: 'How QUEEN Fashion Group handles the personal data of partners and website visitors.',
  },
  notFound: {
    seoTitle: 'Page not found — QUEEN Fashion Group', seoDesc: 'This page does not exist.', title: 'This page could not be found',
    text: 'The link may be out of date, or the page has moved.', home: 'Back to home', catalogue: 'View the catalogue',
  },
  colours: { Ivory: 'Ivory', Cappuccino: 'Cappuccino', White: 'White', Champagne: 'Champagne' },
};

const isObj = (x) => x && typeof x === 'object' && !Array.isArray(x);

// Deep merge: strings from `tr` replace strings in `base`; arrays merge by index; missing keys keep English.
export function merge(base, tr) {
  if (tr == null) return base;
  if (typeof base === 'string') return typeof tr === 'string' && tr.trim() ? tr : base;
  if (Array.isArray(base)) return base.map((x, i) => merge(x, Array.isArray(tr) ? tr[i] : undefined));
  if (isObj(base)) {
    const out = { ...base };
    for (const k of Object.keys(base)) if (isObj(tr) && k in tr) out[k] = merge(base[k], tr[k]);
    return out;
  }
  return base;
}

// Strings a translator should see. Paths, links, phone numbers, e-mails and bare numbers are skipped.
const SKIP_KEYS = new Set(['src', 'photo', 'photos', 'product', 'featureLink', 'featurePhoto', 'phone', 'email', 'company', 'slug', 'isNew', 'name', 'address', 'addressShort']);
const SKIP_VALUE = (v) => /^\//.test(v) || /@/.test(v) || /^[+\d\s–%/.\-]+$/.test(v) || !v.trim();
export function extract(x, key = '') {
  if (typeof x === 'string') return SKIP_VALUE(x) ? undefined : x;
  if (Array.isArray(x)) { const a = x.map((y) => extract(y)); return a.some((y) => y !== undefined) ? a.map((y) => (y === undefined ? null : y)) : undefined; }
  if (isObj(x)) {
    const o = {};
    for (const [k, v] of Object.entries(x)) {
      if (SKIP_KEYS.has(k)) continue;
      const e = extract(v, k);
      if (e !== undefined) o[k] = e;
    }
    return Object.keys(o).length ? o : undefined;
  }
  return undefined;
}

// t('brand.keyModels', { brand }) and plural: t('brand.nModels', { n: 3 })
export function translator(lang, ui) {
  const rules = new Intl.PluralRules(lang);
  const t = (key, vars = {}) => {
    let v = key.split('.').reduce((o, k) => (o == null ? o : o[k]), ui);
    if (v == null) v = key.split('.').reduce((o, k) => (o == null ? o : o[k]), UI_EN);
    if (isObj(v)) v = v[rules.select(Number(vars.n ?? 0))] ?? v.other ?? Object.values(v)[0];
    return String(v ?? key).replace(/\{(\w+)\}/g, (m, k) => (k in vars ? vars[k] : m));
  };
  return t;
}
