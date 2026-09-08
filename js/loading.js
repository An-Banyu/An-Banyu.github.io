(function () {
  'use strict';
  var KEY = 'anbanyu.loader.lastShown.v2';
  var COOLDOWN = 60000;
  var MIN_DISPLAY = 1500;
  var shownAt = performance.now();
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
    clearTimeout(minimumTimer);
    request.abort();
    wrapper.remove();
    window.removeEventListener('load', finish);
  }

  function revealFrame(time) {
    if (removed) return;
    var batch = Math.max(50, Math.ceil(paths.length / (ending ? 5 : 36)));
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
    var remaining = MIN_DISPLAY - (performance.now() - shownAt);
    if (!reduced && remaining > 0) {
      clearTimeout(minimumTimer);
      minimumTimer = setTimeout(finish, remaining);
      return;
    }
    ending = true;
    finishStarted = performance.now();
    wrapper.classList.add('finishing');
    cancelAnimationFrame(frame);
    // After the short viewing window, dismiss even if the illustration failed.
    if (reduced || !paths.length) wrapper.classList.add('loaded');
    else frame = requestAnimationFrame(revealFrame);
    finishTimer = setTimeout(remove, reduced ? 0 : 320);
  }

  var finishTimer;
  var minimumTimer;
  var deadline = setTimeout(finish, 10000);
  window.addEventListener('load', finish, { once: true });
  window.addEventListener('pagehide', remove, { once: true });
  if (document.readyState === 'complete') finish();

  if (!reduced && !ending) {
    function fetchIllustration(url) {
      return fetch(url, { signal: request.signal, priority: 'low' })
      .then(function (response) {
        if (!response.ok) throw new Error('Loading illustration unavailable');
        return response.text();
      });
    }
    fetchIllustration('/media/loading.optimized.svg?v=20260908-1')
      .catch(function (error) {
        if (removed || ending) throw error;
        return fetchIllustration('/loading.svg');
      })
      .then(function (svg) {
        if (ending || removed) return;
        var parsed = new DOMParser().parseFromString(svg, 'image/svg+xml');
        if (parsed.querySelector('parsererror')) return;
        wrapper.querySelector('#svg-container').appendChild(parsed.documentElement);
        paths = Array.from(wrapper.querySelectorAll('path'));
        for (var i = paths.length - 1; i > 0; i--) {
          var index = Math.floor(Math.random() * (i + 1));
          var item = paths[i]; paths[i] = paths[index]; paths[index] = item;
        }
        frame = requestAnimationFrame(revealFrame);
      })
      .catch(function () { /* Content readiness controls dismissal. */ });
  }
})();
