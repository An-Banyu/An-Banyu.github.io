(function () {
  'use strict';
  var bar = document.getElementById('myscoll');
  if (!bar) return;
  var desktop = window.matchMedia('(min-width: 993px)');
  var marker;
  var frame = 0;
  function backToTop() { btf.scrollToDest(0, 500); }
  function createMarker() {
    marker = document.createElement('div');
    marker.id = 'neko1';
    marker.className = 'neko';
    marker.dataset.msg = '金镑';
    marker.tabIndex = 0;
    marker.setAttribute('role', 'button');
    marker.setAttribute('aria-label', '返回顶部');
    // Preserve the effective visual settings of the old double initialization.
    marker.style.cssText = 'position:fixed;right:60px;z-index:99990;background-image:url(https://s2.loli.net/2024/01/10/Hh8YLQBqPxb5rve.png)';
    bar.style.cssText = 'position:fixed;width:8px;top:0;right:100px;z-index:100;background-color:#1e90ff;border-radius:2em;background-size:contain;background-image:linear-gradient(45deg,rgba(255,255,255,.1) 25%,transparent 25%,transparent 50%,rgba(255,255,255,.1) 50%,rgba(255,255,255,.1) 75%,transparent 75%,transparent)';
    bar.after(marker);
    bar.addEventListener('click', backToTop);
    marker.addEventListener('click', backToTop);
    marker.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); backToTop(); }
    });
  }
  function update() {
    frame = 0;
    if (!desktop.matches) {
      bar.style.display = 'none';
      if (marker) marker.style.display = 'none';
      return;
    }
    if (!marker) createMarker();
    var height = window.innerHeight;
    var max = Math.max(document.body.scrollHeight, document.documentElement.scrollHeight) - height;
    var top = window.scrollY || document.documentElement.scrollTop;
    var progress = max > 0 ? Math.max(0, Math.min(1, top / max)) : 0;
    var length = progress * .9 * height;
    bar.style.display = 'block';
    bar.style.height = length + 'px';
    marker.style.top = (length - 50) + 'px';
    marker.style.display = top > .001 ? 'block' : 'none';
    marker.classList.toggle('showMsg', max > 0 && top >= max - 1);
  }
  function schedule() {
    if (!frame) frame = requestAnimationFrame(update);
  }
  window.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule, { passive: true });
  window.addEventListener('load', schedule, { once: true });
  if (typeof ResizeObserver !== 'undefined') new ResizeObserver(schedule).observe(document.body);
  update();
})();
