(function () {
  'use strict';
  var KEY = 'anbanyu.loader.lastShown.v2';
  var COOLDOWN = 60000;
  var now = Date.now();
  var lastShown = 0;
  try { lastShown = Number(localStorage.getItem(KEY)) || 0; } catch (_) {}
  // Cached pages and navigations within the cooldown reveal content immediately.
  if (document.readyState === 'complete' || (lastShown > 0 && now >= lastShown && now - lastShown < COOLDOWN)) return;
  try { localStorage.setItem(KEY, String(now)); } catch (_) {}

  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var wrapper = document.createElement('div');
  wrapper.id = 'loader-wrapper';
  wrapper.setAttribute('role', 'status');
  wrapper.setAttribute('aria-label', '页面加载中');
  wrapper.innerHTML = '<div class="loader-bg"></div><div class="loader-content"><div class="loading-svg" id="svg-container"></div><div class="loading-text">loading...</div></div>';
  document.body.appendChild(wrapper);
  var request = new AbortController();
  var paths = [];
  var cursor = 0;
  var frame = 0;
  var ending = false;
  var removed = false;
  var finishStarted = 0;

  function remove() {
    if (removed) return;
    removed = true;
    cancelAnimationFrame(frame);
    clearTimeout(deadline);
    clearTimeout(finishTimer);
    request.abort();
    wrapper.remove();
    window.removeEventListener('load', finish);
  }

  function revealFrame(time) {
    if (removed) return;
    var batch = ending ? Math.max(50, Math.ceil(paths.length / 5)) : 50;
    for (var count = 0; count < batch && cursor < paths.length; count++, cursor++) {
      paths[cursor].style.opacity = '1';
    }
    if (ending && (cursor === paths.length || time - finishStarted >= 120)) {
      wrapper.classList.add('loaded');
      return;
    }
    if (cursor < paths.length) frame = requestAnimationFrame(revealFrame);
  }

  function finish() {
    if (ending || removed) return;
    ending = true;
    finishStarted = performance.now();
    wrapper.classList.add('finishing');
    cancelAnimationFrame(frame);
    // The illustration never prolongs page readiness, even when its request fails.
    if (reduced || !paths.length) wrapper.classList.add('loaded');
    else frame = requestAnimationFrame(revealFrame);
    finishTimer = setTimeout(remove, reduced ? 0 : 320);
  }

  var finishTimer;
  var deadline = setTimeout(finish, 10000);
  window.addEventListener('load', finish, { once: true });
  window.addEventListener('pagehide', remove, { once: true });
  if (document.readyState === 'complete') finish();

  if (!reduced && !ending) {
    fetch('/loading.svg', { signal: request.signal, priority: 'low' })
      .then(function (response) {
        if (!response.ok) throw new Error('Loading illustration unavailable');
        return response.text();
      })
      .then(function (svg) {
        if (ending || removed) return;
        var parsed = new DOMParser().parseFromString(svg, 'image/svg+xml');
        if (parsed.querySelector('parsererror')) return;
        wrapper.querySelector('#svg-container').appendChild(document.importNode(parsed.documentElement, true));
        paths = Array.from(wrapper.querySelectorAll('path'));
        for (var i = paths.length - 1; i > 0; i--) {
          var index = Math.floor(Math.random() * (i + 1));
          var item = paths[i]; paths[i] = paths[index]; paths[index] = item;
        }
        paths.forEach(function (path) { path.style.opacity = '0'; });
        frame = requestAnimationFrame(revealFrame);
      })
      .catch(function () { /* Content readiness controls dismissal. */ });
  }
})();
