/* Model page: swipeable gallery with thumbnails, a counter, a full-screen viewer,
   and arrow keys to move between models when the viewer is closed. */
(function () {
  var root = document.querySelector('[data-pdp]');
  if (!root) return;
  var track = root.querySelector('.pdp__track');
  var slides = [].slice.call(track.children);
  var thumbs = [].slice.call(root.querySelectorAll('.pdp__thumb'));
  var current = root.querySelector('[data-current]');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var index = 0;

  function setActive(i) {
    index = i;
    if (current) current.textContent = i + 1;
    thumbs.forEach(function (t, k) { t.setAttribute('aria-selected', String(k === i)); });
  }

  function go(i) {
    var s = slides[i]; if (!s) return;
    track.scrollTo({ left: s.offsetLeft - track.offsetLeft, behavior: reduced ? 'auto' : 'smooth' });
    setActive(i);
  }

  thumbs.forEach(function (t) {
    t.addEventListener('click', function () { go(+t.getAttribute('data-go')); });
  });

  // Keep thumbnails and counter in step with swiping
  if ('IntersectionObserver' in window) {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) { if (e.isIntersecting && e.intersectionRatio > .6) setActive(+e.target.getAttribute('data-index')); });
    }, { root: track, threshold: [.6] });
    slides.forEach(function (s) { io.observe(s); });
  }

  /* Full-screen viewer (photos only) */
  var lb = document.getElementById('lightbox');
  var photos = slides.filter(function (s) { return s.querySelector('img'); }).map(function (s) {
    var img = s.querySelector('img'); return { src: img.getAttribute('src'), alt: img.getAttribute('alt'), slide: +s.getAttribute('data-index') };
  });
  var lbImg = lb.querySelector('.lightbox__img');
  var lbCount = lb.querySelector('.lightbox__count');
  var lbIndex = 0, opener = null;

  function show(k) {
    lbIndex = (k + photos.length) % photos.length;
    lbImg.src = photos[lbIndex].src; lbImg.alt = photos[lbIndex].alt;
    lbCount.textContent = (lbIndex + 1) + ' / ' + photos.length;
    lb.classList.toggle('is-single', photos.length < 2);
  }
  function open(slideIndex) {
    opener = document.activeElement;
    var k = 0; photos.forEach(function (p, n) { if (p.slide === slideIndex) k = n; });
    show(k);
    lb.hidden = false;
    document.documentElement.classList.add('lb-open');
    requestAnimationFrame(function () { lb.classList.add('is-open'); });
    lb.querySelector('.lightbox__close').focus();
  }
  function close() {
    lb.classList.remove('is-open');
    document.documentElement.classList.remove('lb-open');
    setTimeout(function () { lb.hidden = true; }, reduced ? 0 : 300);
    go(photos[lbIndex].slide);
    if (opener) opener.focus();
  }

  root.addEventListener('click', function (e) {
    var z = e.target.closest('[data-zoom]'); if (z) open(+z.getAttribute('data-zoom'));
  });
  lb.addEventListener('click', function (e) {
    var b = e.target.closest('[data-lb]');
    if (b) { var a = b.getAttribute('data-lb'); if (a === 'close') close(); else show(lbIndex + (a === 'next' ? 1 : -1)); return; }
    if (e.target === lb) close();
  });

  // Swipe inside the viewer
  var x0 = null;
  lb.addEventListener('touchstart', function (e) { x0 = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener('touchend', function (e) {
    if (x0 === null) return; var dx = e.changedTouches[0].clientX - x0; x0 = null;
    if (Math.abs(dx) > 40) show(lbIndex + (dx < 0 ? 1 : -1));
  });

  document.addEventListener('keydown', function (e) {
    if (e.target.closest && e.target.closest('input, select, textarea')) return;
    if (!lb.hidden) {
      if (e.key === 'Escape') close();
      else if (e.key === 'ArrowRight') show(lbIndex + 1);
      else if (e.key === 'ArrowLeft') show(lbIndex - 1);
      else if (e.key === 'Tab') { // keep focus inside the viewer
        var f = [].slice.call(lb.querySelectorAll('button')); var i = f.indexOf(document.activeElement);
        e.preventDefault(); f[(i + (e.shiftKey ? -1 : 1) + f.length) % f.length].focus();
      }
      return;
    }
    if (window.PDP && e.key === 'ArrowLeft') location.href = window.PDP.prev;
    if (window.PDP && e.key === 'ArrowRight') location.href = window.PDP.next;
  });
})();
