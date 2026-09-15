/* Keep a selection for one minute; load only the selected photo before applying it. */
(function () {
  'use strict';
  if (window.anbanyuRandomBackground) return;
  window.anbanyuRandomBackground = true;
  var photos = [
    null, // Responsive local copy of QavDKncWM968tBq.jpg.
    'https://s2.loli.net/2026/02/04/tuR3Y6kopajcKHz.jpg',
    'https://s2.loli.net/2025/10/07/2WQxn5iedh1C9k3.jpg',
    'https://s2.loli.net/2025/10/07/XyZ9Uh5kjnxqrb7.jpg',
    'https://s2.loli.net/2025/10/07/1EM89qO6BxXVwvt.jpg'
  ];
  var key = 'site_random_bg_idx_v2';
  var selection, loadedUrl, request = 0;
  function valid(value, now) {
    return value && Number.isInteger(value.idx) && value.idx >= 0 && value.idx < photos.length &&
      Number.isFinite(value.ts) && value.ts <= now;
  }
  function choose() {
    var now = Date.now(), last = selection;
    if (!last) {
      try { last = JSON.parse(localStorage.getItem(key)); } catch (_) { /* Storage is optional. */ }
    }
    if (valid(last, now) && now - last.ts < 60000) return last;
    var previous = valid(last, now) ? last.idx : -1;
    var idx = Math.floor(Math.random() * (photos.length - (previous >= 0 ? 1 : 0)));
    if (previous >= 0 && idx >= previous) idx++;
    return { idx: idx, ts: now };
  }
  function imageUrl(index) {
    return photos[index] || '/media/site/background-' + (window.innerWidth <= 768 ? 1280 : window.innerWidth > 1920 ? 4096 : 2560) + '.webp';
  }
  function apply(url) {
    var background = document.getElementById('web_bg');
    if (background) background.style.backgroundImage = 'url("' + url + '")';
    // Match the home banner, but leave article-specific covers untouched.
    var header = document.getElementById('page-header');
    if (header && header.classList.contains('full_page')) header.style.backgroundImage = 'url("' + url + '")';
  }
  function run() {
    var choice = choose(), url = imageUrl(choice.idx), ticket = ++request;
    if (loadedUrl === url) { apply(url); return; }
    var image = new Image(), settled = false;
    var timer = setTimeout(function () { settled = true; image.onload = image.onerror = null; }, 8000);
    image.onload = function () {
      if (settled || ticket !== request) return;
      settled = true; clearTimeout(timer);
      selection = choice; loadedUrl = url;
      try { localStorage.setItem(key, JSON.stringify(choice)); } catch (_) { /* Keep the in-memory choice. */ }
      apply(url);
    };
    image.onerror = function () { settled = true; clearTimeout(timer); }; // Keep the existing local fallback.
    image.src = url;
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
  document.addEventListener('pjax:complete', run);
})();
