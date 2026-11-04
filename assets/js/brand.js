/* Brand hero: the model card bottom-right changes every few seconds. Pauses on hover/focus. */
(function () {
  var box = document.querySelector('[data-rotate]');
  if (!box) return;
  var cards = box.querySelectorAll('.bh-card');
  if (cards.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  var DUR = 5000, i = 0, timer, paused = false;
  box.style.setProperty('--bh-dur', DUR + 'ms');
  function show(n) {
    cards[i].classList.remove('is-on'); cards[i].tabIndex = -1; cards[i].setAttribute('aria-hidden', 'true');
    i = n % cards.length;
    cards[i].classList.add('is-on'); cards[i].removeAttribute('tabindex'); cards[i].removeAttribute('aria-hidden');
  }
  function start() { clearInterval(timer); timer = setInterval(function () { if (!paused && !document.hidden) show(i + 1); }, DUR); box.classList.add('is-running'); }
  box.addEventListener('mouseenter', function () { paused = true; });
  box.addEventListener('mouseleave', function () { paused = false; });
  box.addEventListener('focusin', function () { paused = true; });
  box.addEventListener('focusout', function () { paused = false; });
  start();
})();
