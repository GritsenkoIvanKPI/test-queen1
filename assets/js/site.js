(function () {
  var root = document.documentElement;
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* Hero fade-in (no preloader) */
  requestAnimationFrame(function () { root.classList.add('is-ready', 'is-loaded'); });

  /* Scroll reveals */
  var reveals = document.querySelectorAll('.reveal');
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        io.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -6% 0px', threshold: .06 });
    reveals.forEach(function (el) { io.observe(el); });
  } else {
    reveals.forEach(function (el) { el.classList.add('is-in'); });
  }

  /* Header: hide on scroll down, show on scroll up */
  var header = document.getElementById('header');
  var mega = document.getElementById('mega');
  var lastY = window.scrollY;
  window.addEventListener('scroll', function () {
    var y = window.scrollY;
    if (root.classList.contains('menu-open') || (mega && mega.classList.contains('is-open'))) { lastY = y; return; }
    var hide = y > lastY && y > 400;
    header.classList.toggle('is-hidden', hide);
    root.classList.toggle('header-hidden', hide);
    lastY = y;
  }, { passive: true });

  /* Brands mega menu */
  var brandsToggle = document.getElementById('brandsToggle');
  var megaTimer, megaOpenedAt = 0;
  function setMega(open) {
    if (!mega || !brandsToggle) return;
    clearTimeout(megaTimer);
    if (open && !mega.classList.contains('is-open')) megaOpenedAt = Date.now();
    mega.classList.toggle('is-open', open);
    mega.inert = !open;
    brandsToggle.setAttribute('aria-expanded', String(open));
  }
  function closeMegaSoon() { clearTimeout(megaTimer); megaTimer = setTimeout(function () { setMega(false); }, 220); }
  if (mega && brandsToggle) {
  brandsToggle.addEventListener('click', function () {
    /* a click right after hover-open should not close the panel */
    if (mega.classList.contains('is-open') && Date.now() - megaOpenedAt < 500) return;
    setMega(!mega.classList.contains('is-open'));
  });
  if (window.matchMedia('(hover: hover)').matches) {
    brandsToggle.addEventListener('mouseenter', function () { setMega(true); });
    brandsToggle.addEventListener('mouseleave', closeMegaSoon);
    mega.addEventListener('mouseenter', function () { clearTimeout(megaTimer); });
    mega.addEventListener('mouseleave', closeMegaSoon);
  }
  mega.addEventListener('click', function (e) { if (e.target.closest('a')) setMega(false); });
  document.addEventListener('click', function (e) {
    if (mega.classList.contains('is-open') && !mega.contains(e.target) && !brandsToggle.contains(e.target)) setMega(false);
  });
  }

  /* Mobile menu */
  var burger = document.getElementById('burger');
  var menu = document.getElementById('menu');
  function setMenu(open) {
    root.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', String(open));
    burger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
    menu.inert = !open;
  }
  burger.addEventListener('click', function () { setMenu(!root.classList.contains('menu-open')); });
  menu.addEventListener('click', function (e) { if (e.target.closest('[data-close]')) setMenu(false); });
  var menuBrands = document.getElementById('menuBrands');
  var menuBrandsList = document.getElementById('menuBrandsList');
  menuBrands.addEventListener('click', function () {
    var open = menuBrands.getAttribute('aria-expanded') !== 'true';
    menuBrands.setAttribute('aria-expanded', String(open));
    menuBrandsList.classList.toggle('is-open', open);
  });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') { setMenu(false); setMega(false); } });
  window.matchMedia('(min-width: 1024px)').addEventListener('change', function () { setMenu(false); setMega(false); });

  /* Brand collection tabs */
  var tabs = Array.prototype.slice.call(document.querySelectorAll('.tabs [role="tab"]'));
  function selectTab(key, focus) {
    tabs.forEach(function (tab) {
      var on = tab.getAttribute('data-tab') === key;
      tab.setAttribute('aria-selected', String(on));
      tab.tabIndex = on ? 0 : -1;
      var panel = document.getElementById(tab.getAttribute('aria-controls'));
      if (!panel) return;
      panel.hidden = !on;
      if (on) {
        panel.classList.add('is-in');
        panel.classList.remove('is-entering');
        void panel.offsetWidth;
        panel.classList.add('is-entering');
        if (focus) tab.focus();
        tab.scrollIntoView({ block: 'nearest', inline: 'center', behavior: reduced ? 'auto' : 'smooth' });
      }
    });
  }
  tabs.forEach(function (tab, i) {
    tab.addEventListener('click', function () { selectTab(tab.getAttribute('data-tab')); });
    tab.addEventListener('keydown', function (e) {
      var next = e.key === 'ArrowRight' ? i + 1 : e.key === 'ArrowLeft' ? i - 1 : null;
      if (next === null) return;
      e.preventDefault();
      selectTab(tabs[(next + tabs.length) % tabs.length].getAttribute('data-tab'), true);
    });
  });

  /* Banner films: load and play only while on screen */
  var films = document.querySelectorAll('.banner__video');
  if (!reduced && 'IntersectionObserver' in window) {
    var filmIO = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var v = entry.target;
        if (entry.isIntersecting) { var play = v.play(); if (play && play.catch) play.catch(function () {}); }
        else v.pause();
      });
    }, { threshold: .25 });
    films.forEach(function (v) { filmIO.observe(v); });
  }

  var heroVideo = document.querySelector('.hero video');
  if (reduced && heroVideo) {
    heroVideo.removeAttribute('autoplay');
    heroVideo.pause();
  }
})();
