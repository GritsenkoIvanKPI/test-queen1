/* One catalogue for every brand. Brand is the first choice (tabs); the other filters
   narrow it down. State lives in the URL, so /catalogue/?brand=elle works as "the Elle catalogue". */
(function () {
  var D = window.CATALOG, M = D.models, META = D.meta, L = META.labels;
  var PAGE = 24;
  var GROUPS = [
    { key: 'c', param: 'collection', title: 'Collection', options: META.collections.map(function (c) { return [c.slug, c.name]; }), when: function (s) { return !s.brand || s.brand === 'queen'; } },
    { key: 's', param: 'sil', title: 'Silhouette', options: pairs(L.sil) },
    { key: 'sl', param: 'sleeves', title: 'Sleeves & neckline', options: pairs(L.sleeves) },
    { key: 'f', param: 'fabric', title: 'Fabric', options: pairs(L.fabric) },
    { key: 'd', param: 'details', title: 'Details', options: pairs(L.details).concat([['new', 'New models'], ['video', 'With video']]) }
  ];
  function pairs(o) { return Object.keys(o).map(function (k) { return [k, o[k]]; }); }
  var brandName = {}; META.brands.forEach(function (b) { brandName[b.slug] = b.name; });

  /* ── State ── */
  var state = { brand: '', sel: {}, sort: 'featured', view: 'grid', shown: PAGE };
  function readURL() {
    var q = new URLSearchParams(location.search);
    state.brand = brandName[q.get('brand')] ? q.get('brand') : '';
    GROUPS.forEach(function (g) { state.sel[g.key] = (q.get(g.param) || '').split(',').filter(Boolean); });
    state.sort = ['featured', 'new', 'article'].indexOf(q.get('sort')) > -1 ? q.get('sort') : 'featured';
    state.view = q.get('view') === 'gallery' ? 'gallery' : 'grid';
  }
  function writeURL() {
    var q = new URLSearchParams();
    if (state.brand) q.set('brand', state.brand);
    GROUPS.forEach(function (g) { if (state.sel[g.key].length && active(g)) q.set(g.param, state.sel[g.key].join(',')); });
    if (state.sort !== 'featured') q.set('sort', state.sort);
    if (state.view !== 'grid') q.set('view', state.view);
    var s = q.toString();
    history.replaceState(null, '', location.pathname + (s ? '?' + s.replace(/%2C/g, ',') : ''));
  }
  function active(g) { return !g.when || g.when(state); }

  /* ── Filtering ── */
  function matches(m, g, vals) {
    if (!vals.length) return true;
    if (g.key === 'd') return vals.every(function (v) { return v === 'new' ? m.nw : v === 'video' ? m.v : m.d.indexOf(v) > -1; });
    return vals.indexOf(m[g.key]) > -1;
  }
  function filtered(skip) {
    return M.filter(function (m) {
      if (state.brand && m.b !== state.brand) return false;
      return GROUPS.every(function (g) { return g === skip || !active(g) || matches(m, g, state.sel[g.key]); });
    });
  }
  function sorted(list) {
    if (state.sort === 'article') return list.slice().sort(function (a, b) { return a.n.localeCompare(b.n, 'en', { numeric: true }); });
    if (state.sort === 'new') return list.slice().sort(function (a, b) { return (b.nw ? 1 : 0) - (a.nw ? 1 : 0); });
    return list;
  }

  /* ── Render ── */
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); };

  function renderBrands() {
    var counts = {}; M.forEach(function (m) { counts[m.b] = (counts[m.b] || 0) + 1; });
    var html = '<button class="tab" type="button" data-brand="" aria-pressed="' + (!state.brand) + '">All<sup>' + M.length + '</sup></button>';
    META.brands.forEach(function (b) {
      html += '<button class="tab" type="button" data-brand="' + b.slug + '" aria-pressed="' + (state.brand === b.slug) + '">' + esc(b.name) + '<sup>' + (counts[b.slug] || 0) + '</sup></button>';
    });
    $('catBrands').innerHTML = html;
    var on = $('catBrands').querySelector('[aria-pressed="true"]');
    if (on && on.scrollIntoView && state.brand) on.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  function renderFilters(target) {
    var html = '';
    GROUPS.forEach(function (g) {
      if (!active(g)) return;
      var base = filtered(g);
      var opts = g.options.map(function (o) {
        var n = base.filter(function (m) { return matches(m, g, [o[0]]); }).length;
        var on = state.sel[g.key].indexOf(o[0]) > -1;
        if (!n && !on) return '';
        return '<label class="chk"><input type="checkbox" data-g="' + g.key + '" value="' + o[0] + '"' + (on ? ' checked' : '') + '><span>' + esc(o[1]) + '</span><small>' + n + '</small></label>';
      }).join('');
      if (opts) html += '<fieldset class="fgroup"><legend>' + g.title + '</legend><div class="fgroup__list">' + opts + '</div></fieldset>';
    });
    target.innerHTML = html;
  }

  function card(m, i) {
    return '<a class="mcard" href="/catalogue/' + m.id + '/">' +
      '<span class="photo"><img src="' + m.p[0] + '" alt="' + esc(m.n) + '" width="900" height="1350"' + (i < 6 ? '' : ' loading="lazy"') + '>' +
      (m.p[1] ? '<img src="' + m.p[1] + '" alt="" width="900" height="1350" loading="lazy" aria-hidden="true">' : '') + '</span>' +
      (m.nw ? '<span class="mcard__badge">New</span>' : '') +
      '<span class="mcard__cap"><span class="h3">' + esc(m.n) + '</span><span class="mcard__meta">' + L.sil[m.s] + ' · ' + L.fabric[m.f] + (m.v ? ' · Video' : '') + '</span></span></a>';
  }

  function selectedCount() { return GROUPS.reduce(function (n, g) { return n + (active(g) ? state.sel[g.key].length : 0); }, 0); }

  function render() {
    var list = sorted(filtered(null));
    var title = state.brand ? brandName[state.brand] : 'All models';
    $('catTitle').textContent = title;
    $('catIntro').textContent = state.brand
      ? 'The ' + brandName[state.brand] + ' catalogue. Switch brand above at any time, or narrow down by silhouette, sleeves or fabric.'
      : 'Every model from every brand in one place. Choose a brand, then narrow down by silhouette, sleeves or fabric.';
    document.title = (state.brand ? brandName[state.brand] + ' catalogue' : 'Catalogue — all wedding dress models') + ' | QUEEN Fashion Group';
    $('catCount').textContent = list.length + (list.length === 1 ? ' model' : ' models');
    $('sheetApplyLabel').textContent = 'Show ' + list.length + ' models';
    $('sheetApply').setAttribute('data-label', 'Show ' + list.length + ' models');

    renderBrands();
    renderFilters($('filtersSide'));
    renderFilters($('filtersSheet'));

    var n = selectedCount();
    $('filterCount').hidden = !n; $('filterCount').textContent = n;

    var chips = '';
    GROUPS.forEach(function (g) {
      if (!active(g)) return;
      state.sel[g.key].forEach(function (v) {
        var o = g.options.filter(function (x) { return x[0] === v; })[0];
        if (o) chips += '<button class="achip" type="button" data-g="' + g.key + '" data-v="' + v + '">' + esc(o[1]) + '<svg viewBox="0 0 10 10" fill="none" stroke="currentColor" aria-hidden="true"><path d="M1 1l8 8M9 1 1 9"/></svg><span class="sr-only">Remove</span></button>';
      });
    });
    if (chips) chips += '<button class="achip achip--clear" type="button" data-clear>Clear all</button>';
    $('activeChips').innerHTML = chips;

    var res = $('results');
    res.classList.toggle('is-gallery', state.view === 'gallery');
    res.innerHTML = list.slice(0, state.shown).map(card).join('');
    $('more').hidden = list.length <= state.shown;

    var empty = $('resultsEmpty');
    if (!list.length) {
      var b = META.brands.filter(function (x) { return x.slug === state.brand; })[0];
      var brandEmpty = b && !M.some(function (m) { return m.b === b.slug; });
      empty.innerHTML = brandEmpty
        ? '<span class="h3">' + esc(b.name) + ' — coming soon</span><p class="text">The collection is being photographed. Key models: ' + b.keys.map(esc).join(' · ') + '.</p><a class="btn" href="#contacts" data-label="Ask a manager"><span>Ask a manager</span></a>'
        : '<span class="h3">No models match these filters</span><button class="link" type="button" data-clear>Clear filters</button>';
      empty.hidden = false;
    } else empty.hidden = true;

    document.querySelectorAll('.view-toggle [data-view]').forEach(function (btn) { btn.setAttribute('aria-pressed', String(btn.getAttribute('data-view') === state.view)); });
    $('catSort').value = state.sort;
    writeURL();
  }

  function clearAll() { GROUPS.forEach(function (g) { state.sel[g.key] = []; }); state.shown = PAGE; render(); }

  /* ── Events ── */
  $('catBrands').addEventListener('click', function (e) {
    var t = e.target.closest('[data-brand]'); if (!t) return;
    state.brand = t.getAttribute('data-brand');
    if (state.brand && state.brand !== 'queen') state.sel.c = [];
    state.shown = PAGE; render();
  });
  document.addEventListener('change', function (e) {
    var t = e.target;
    if (t.matches('input[data-g]')) {
      var arr = state.sel[t.getAttribute('data-g')], i = arr.indexOf(t.value);
      if (t.checked && i < 0) arr.push(t.value); else if (!t.checked && i > -1) arr.splice(i, 1);
      state.shown = PAGE; render();
    }
    if (t.id === 'catSort') { state.sort = t.value; render(); }
  });
  document.addEventListener('click', function (e) {
    var chip = e.target.closest('.achip[data-g]');
    if (chip) { var arr = state.sel[chip.getAttribute('data-g')]; arr.splice(arr.indexOf(chip.getAttribute('data-v')), 1); state.shown = PAGE; render(); return; }
    if (e.target.closest('[data-clear]')) { clearAll(); return; }
    var v = e.target.closest('.view-toggle [data-view]');
    if (v) { state.view = v.getAttribute('data-view'); render(); }
  });
  $('moreBtn').addEventListener('click', function () { state.shown += PAGE; render(); });

  /* Phone/tablet filter sheet */
  var sheet = $('sheet');
  function setSheet(open) {
    sheet.classList.toggle('is-open', open); sheet.inert = !open;
    document.documentElement.classList.toggle('sheet-open', open);
    if (open) $('sheetClose').focus(); else $('filterOpen').focus();
  }
  $('filterOpen').addEventListener('click', function () { setSheet(true); });
  $('sheetClose').addEventListener('click', function () { setSheet(false); });
  $('sheetApply').addEventListener('click', function () { setSheet(false); window.scrollTo({ top: $('catBrands').offsetTop - 80 }); });
  $('sheetClear').addEventListener('click', clearAll);
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && sheet.classList.contains('is-open')) setSheet(false); });

  readURL();
  render();
})();
