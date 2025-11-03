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

    // create a small copy-tip (bottom-right) for copy feedback
    var COPY_TIP_ID = 'social-copy-tip';
    function createCopyTip() {
      var tip = document.getElementById(COPY_TIP_ID) || document.createElement('div');
      tip.id = COPY_TIP_ID;
      tip.style.position = 'fixed';
      tip.style.right = '22px';
      tip.style.bottom = '72px';
      tip.style.zIndex = 100000;
      tip.style.padding = '8px 12px';
      tip.style.borderRadius = '6px';
      tip.style.background = 'rgba(0,0,0,0.78)';
      tip.style.color = '#fff';
      tip.style.fontSize = '13px';
      tip.style.opacity = '0';
      tip.style.transition = 'opacity .18s ease';
      tip.style.pointerEvents = 'none';
      if (!tip.parentElement) document.body.appendChild(tip);
      return tip;
    }

    function showCopyTip(text) {
      var tip = createCopyTip();
      tip.textContent = text;
      tip.style.opacity = '1';
      setTimeout(function () { tip.style.opacity = '0'; }, 1600);
    }

    // helper to copy text with fallback
    function copyText(text) {
      if (!text) return Promise.reject(new Error('empty'));
      if (navigator.clipboard && navigator.clipboard.writeText) {
        return navigator.clipboard.writeText(text);
      }
      return new Promise(function (resolve, reject) {
        try {
          var ta = document.createElement('textarea');
          ta.value = text;
          ta.style.position = 'fixed';
          ta.style.left = '-99999px';
          document.body.appendChild(ta);
          ta.select();
          var ok = document.execCommand('copy');
          document.body.removeChild(ta);
          if (ok) resolve(); else reject(new Error('execCommand failed'));
        } catch (err) { reject(err); }
      });
    }

    icons.forEach(function (icon) {
      try {
        var href = icon.getAttribute('href') || '';

        // if this icon points to an image (qq/wechat), bind hover tooltip
        if (isImageHref(href)) {
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
        }

        // also hide when scrolling or resizing (global handlers are safe to attach multiple times)
        window.addEventListener('scroll', function () {
          tooltip.classList.remove('show'); tooltip.style.display = 'none';
        }, {passive: true});
        window.addEventListener('resize', function () {
          tooltip.classList.remove('show'); tooltip.style.display = 'none';
        });

        // if this icon is a mailto: link, bind click to copy the email address
        if (href.indexOf('mailto:') === 0) {
          icon.addEventListener('click', function (ev) {
            try { ev.preventDefault(); } catch (e) {}
            var email = href.replace(/^mailto:/i, '').split('?')[0] || '';
            copyText(email).then(function () {
              showCopyTip('邮箱地址已复制: ' + email);
            }).catch(function () {
              showCopyTip('复制失败，请手动复制');
            });
          }, false);
        }

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
