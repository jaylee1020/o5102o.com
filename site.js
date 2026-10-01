(function (window, document) {
  'use strict';

  // Old theme preference is no longer used; colors follow the system setting.
  try {
    window.localStorage.removeItem('theme');
  } catch (_error) {}

  var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  var finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
  var liveRegion = null;

  function announce(text) {
    if (!liveRegion) {
      liveRegion = document.createElement('div');
      liveRegion.className = 'sr-only';
      liveRegion.setAttribute('role', 'status');
      liveRegion.setAttribute('aria-live', 'polite');
      document.body.appendChild(liveRegion);
    }
    liveRegion.textContent = '';
    window.setTimeout(function () { liveRegion.textContent = text; }, 30);
  }

  function registerServiceWorker(path) {
    if (!('serviceWorker' in navigator)) return Promise.resolve(null);
    return navigator.serviceWorker.register(path || '/sw.js').catch(function () {
      return null;
    });
  }

  // --- Glyph scramble: resolves `from` into `to`, one glyph at a time. ---
  var GLYPHS = 'abcdefghijklmnopqrstuvwxyz0123456789';

  function scramble(node, to, duration, pool, done) {
    var chars = pool || GLYPHS;
    var length = Math.max(node.textContent.length, to.length);
    var start = performance.now();
    var frame = node._scrambleFrame;
    if (frame) window.cancelAnimationFrame(frame);
    if (reduceMotion.matches) {
      node.textContent = to;
      if (done) done();
      return;
    }
    function tick(now) {
      var t = Math.min(1, (now - start) / duration);
      var settled = Math.floor(t * to.length);
      var out = to.slice(0, settled);
      for (var i = settled; i < length; i += 1) {
        out += chars[Math.floor(Math.random() * chars.length)];
      }
      node.textContent = out;
      if (t < 1) {
        node._scrambleFrame = window.requestAnimationFrame(tick);
      } else {
        node.textContent = to;
        node._scrambleFrame = 0;
        if (done) done();
      }
    }
    node._scrambleFrame = window.requestAnimationFrame(tick);
  }

  function initBrand() {
    var brand = document.querySelector('.brand[data-scramble]');
    if (!brand) return;
    var original = brand.textContent;
    var alternate = brand.getAttribute('data-scramble');
    if (!brand.hasAttribute('aria-label')) brand.setAttribute('aria-label', original);
    brand.style.setProperty('--brand-w', brand.getBoundingClientRect().width + 'px');
    function enter() { scramble(brand, alternate, 360); }
    function leave() { scramble(brand, original, 360); }
    if (finePointer.matches) {
      brand.addEventListener('mouseenter', enter);
      brand.addEventListener('mouseleave', leave);
    } else {
      // No hover: play once on load and whenever the tab comes back, never on the tap itself.
      var play = function () {
        if (document.hidden) return;
        scramble(brand, alternate, 300, null, function () {
          window.setTimeout(leave, 500);
        });
      };
      play();
      document.addEventListener('visibilitychange', play);
    }
    brand.addEventListener('focus', enter);
    brand.addEventListener('blur', leave);
  }

  function initScrambleOnce() {
    document.querySelectorAll('[data-scramble-once]').forEach(function (node) {
      var text = node.textContent;
      scramble(node, text, 600, '0123456789');
    });
  }

  // --- Hover previews: one floating image that eases toward the cursor. ---
  function initPreviews() {
    var rows = document.querySelectorAll('[data-preview]');
    if (!rows.length) return;
    if (!finePointer.matches) {
      // Touch: show the thumbnail inline instead of floating it (size reserved via data-preview-size).
      rows.forEach(function (row) {
        var size = (row.getAttribute('data-preview-size') || '').split('x');
        var thumb = document.createElement('img');
        thumb.className = 'row-thumb';
        thumb.alt = '';
        thumb.loading = 'lazy';
        thumb.decoding = 'async';
        if (size.length === 2) {
          thumb.width = Number(size[0]);
          thumb.height = Number(size[1]);
        }
        thumb.src = row.getAttribute('data-preview');
        row.appendChild(thumb);
      });
      return;
    }
    var img = null;
    var x = 0;
    var y = 0;
    var tx = 0;
    var ty = 0;
    var raf = 0;
    var loaded = {};

    function ensure() {
      if (img) return img;
      img = document.createElement('img');
      img.className = 'preview';
      img.alt = '';
      img.setAttribute('aria-hidden', 'true');
      img.decoding = 'async';
      document.body.appendChild(img);
      return img;
    }

    function place() {
      x += (tx - x) * 0.18;
      y += (ty - y) * 0.18;
      img.style.setProperty('--px', Math.round(x) + 'px');
      img.style.setProperty('--py', Math.round(y) + 'px');
      raf = (Math.abs(tx - x) > 0.5 || Math.abs(ty - y) > 0.5)
        ? window.requestAnimationFrame(place)
        : 0;
    }

    function target(event) {
      var w = img.offsetWidth || 240;
      var h = img.offsetHeight || 150;
      tx = Math.min(event.clientX + 20, window.innerWidth - w - 12);
      ty = Math.min(event.clientY + 20, window.innerHeight - h - 12);
      if (!raf) raf = window.requestAnimationFrame(place);
    }

    rows.forEach(function (row) {
      var src = row.getAttribute('data-preview');
      row.addEventListener('pointerenter', function (event) {
        if (event.pointerType && event.pointerType !== 'mouse') return;
        ensure();
        if (img.getAttribute('src') !== src) {
          img.classList.remove('is-visible');
          img.src = src;
        }
        if (!loaded[src]) {
          loaded[src] = true;
          img.addEventListener('load', function () { img.classList.add('is-visible'); }, { once: true });
        } else {
          img.classList.add('is-visible');
        }
        x = tx = event.clientX + 20;
        y = ty = event.clientY + 20;
        target(event);
      });
      row.addEventListener('pointermove', function (event) {
        if (img) target(event);
      });
      row.addEventListener('pointerleave', function () {
        if (img) img.classList.remove('is-visible');
      });
    });
  }

  // --- Seoul clock: `Seoul 14:32`, colon blinks via CSS. ---
  function initClock() {
    var node = document.querySelector('[data-clock]');
    if (!node || !window.Intl || !Intl.DateTimeFormat) return;
    var label = node.textContent.trim();
    var format;
    try {
      format = new Intl.DateTimeFormat('en-GB', {
        timeZone: node.getAttribute('data-clock'),
        hour: '2-digit',
        minute: '2-digit',
        hourCycle: 'h23'
      });
    } catch (_error) {
      return;
    }
    var hours = document.createElement('span');
    var colon = document.createElement('span');
    var minutes = document.createElement('span');
    colon.className = 'clock-colon';
    colon.textContent = ':';
    node.textContent = label + ' ';
    node.append(hours, colon, minutes);
    function tick() {
      var parts = format.format(new Date()).split(':');
      hours.textContent = parts[0];
      minutes.textContent = parts[1];
      node.setAttribute('aria-label', label + ' ' + parts[0] + ':' + parts[1]);
      window.setTimeout(tick, 1000 - (Date.now() % 1000));
    }
    tick();
  }

  // --- Copy email: swaps the label to `Copied`, falls back to mailto. ---
  function initCopy() {
    document.querySelectorAll('a[data-copy]').forEach(function (link) {
      var label = link.querySelector('.row-value') || link;
      var original = label.textContent;
      var timer = 0;
      link.style.setProperty('--copy-w', link.getBoundingClientRect().width + 'px');
      link.addEventListener('click', function (event) {
        if (!navigator.clipboard || !navigator.clipboard.writeText) return;
        event.preventDefault();
        navigator.clipboard.writeText(link.getAttribute('data-copy')).then(function () {
          label.textContent = 'Copied';
          announce('Copied ' + link.getAttribute('data-copy'));
          window.clearTimeout(timer);
          timer = window.setTimeout(function () { label.textContent = original; }, 1400);
        }, function () {
          window.location.href = link.href;
        });
      });
    });
  }

  // --- Business card: tilts toward the pointer, flips on click/Enter/Space. ---
  function initCard() {
    var card = document.querySelector('[data-card]');
    if (!card) return;
    card.setAttribute('aria-pressed', 'false');
    card.addEventListener('click', function () {
      var flipped = card.getAttribute('aria-pressed') === 'true';
      card.setAttribute('aria-pressed', flipped ? 'false' : 'true');
    });
    if (!finePointer.matches || reduceMotion.matches) return;
    var raf = 0;
    var last = null;
    function apply() {
      raf = 0;
      var rect = card.getBoundingClientRect();
      var px = (last.clientX - rect.left) / rect.width;
      var py = (last.clientY - rect.top) / rect.height;
      card.style.setProperty('--ry', ((px - 0.5) * 12).toFixed(2) + 'deg');
      card.style.setProperty('--rx', ((0.5 - py) * 12).toFixed(2) + 'deg');
      card.style.setProperty('--mx', (px * 100).toFixed(1) + '%');
      card.style.setProperty('--my', (py * 100).toFixed(1) + '%');
    }
    card.addEventListener('pointermove', function (event) {
      if (event.pointerType !== 'mouse') return;
      last = event;
      card.classList.add('is-tilting');
      if (!raf) raf = window.requestAnimationFrame(apply);
    });
    card.addEventListener('pointerleave', function () {
      card.classList.remove('is-tilting');
      card.style.setProperty('--rx', '0deg');
      card.style.setProperty('--ry', '0deg');
    });
  }

  // --- Reading progress: 1px hairline scaled by scroll position. ---
  function initProgress() {
    var bar = document.querySelector('[data-progress]');
    if (!bar) return;
    var raf = 0;
    function update() {
      raf = 0;
      var doc = document.documentElement;
      var max = doc.scrollHeight - window.innerHeight;
      var p = max > 0 ? Math.min(1, Math.max(0, window.scrollY / max)) : 0;
      bar.style.setProperty('--progress', p.toFixed(4));
    }
    window.addEventListener('scroll', function () {
      if (!raf) raf = window.requestAnimationFrame(update);
    }, { passive: true });
    window.addEventListener('resize', update);
    update();
  }

  function init() {
    document.querySelectorAll('.js-year').forEach(function (node) {
      node.textContent = String(new Date().getFullYear());
    });
    initBrand();
    initScrambleOnce();
    initPreviews();
    initClock();
    initCopy();
    initCard();
    initProgress();
  }

  window.o5102oSite = {
    registerServiceWorker: registerServiceWorker,
    scramble: scramble
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})(window, document);
