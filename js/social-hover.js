/* social-hover.js
   Show image tooltip when hovering social icons whose href points to a local image (qq/wechat)
*/
(function () {
  'use strict';

  function isImageHref(href) {
    return typeof href === 'string' && /\.(png|jpe?g|gif|webp|svg)$/i.test(href);
  }

  function createTooltip() {
    var t = document.createElement('div');
    t.className = 'social-tooltip';
    var img = document.createElement('img');
    img.alt = 'qr';
    t.appendChild(img);
    document.body.appendChild(t);
    return t;
  }

  function positionTooltip(tooltip, iconRect, margin) {
    var tw = tooltip.offsetWidth;
    var th = tooltip.offsetHeight;
    var left = iconRect.left + iconRect.width / 2 - tw / 2;
    var top = iconRect.top - th - (margin || 10);
    // keep inside viewport
    var pad = 8;
    if (left < pad) left = pad;
    if (left + tw > window.innerWidth - pad) left = window.innerWidth - tw - pad;
    if (top < pad) top = iconRect.bottom + (margin || 10); // place below if not enough space above
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
  }

  function bind() {
    var icons = document.querySelectorAll('.social-icon');
    if (!icons || icons.length === 0) return;

    var tooltip = createTooltip();
    var img = tooltip.querySelector('img');
    var activeTimer = null;

    icons.forEach(function (icon) {
      try {
        var href = icon.getAttribute('href') || '';
        // treat local image links (e.g., /img/wechat.jpg) as tooltip sources
        if (!isImageHref(href)) return;

        icon.addEventListener('mouseenter', function (e) {
          if (activeTimer) { clearTimeout(activeTimer); activeTimer = null; }
          img.src = href;
          tooltip.classList.remove('show');
          tooltip.style.display = 'block';
          // wait a tick to allow image to load/size
          // if image is cached, load event may not fire; we compute after small delay
          setTimeout(function () {
            positionTooltip(tooltip, icon.getBoundingClientRect(), 8);
            tooltip.classList.add('show');
          }, 40);
        }, {passive: true});

        icon.addEventListener('mouseleave', function () {
          // small delay before hide to make hover less jittery
          activeTimer = setTimeout(function () {
            tooltip.classList.remove('show');
            activeTimer = setTimeout(function () { tooltip.style.display = 'none'; }, 180);
          }, 80);
        });

        // also hide when scrolling or resizing
        window.addEventListener('scroll', function () {
          tooltip.classList.remove('show'); tooltip.style.display = 'none';
        }, {passive: true});
        window.addEventListener('resize', function () {
          tooltip.classList.remove('show'); tooltip.style.display = 'none';
        });

      } catch (err) {
        // ignore per-element errors
        console.error(err);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bind);
  } else {
    bind();
  }

})();
