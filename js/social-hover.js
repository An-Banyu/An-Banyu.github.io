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
    var pad = 8;
    var gap = margin || 10;
    var above = iconRect.top - gap - pad;
    var below = window.innerHeight - iconRect.bottom - gap - pad;
    var image = tooltip.querySelector('img');
    image.style.maxHeight = Math.max(0, Math.min(240, Math.max(above, below) - 12)) + 'px';
    var tw = tooltip.offsetWidth;
    var th = tooltip.offsetHeight;
    var center = iconRect.left + iconRect.width / 2;
    var left = Math.max(pad, Math.min(center - tw / 2, window.innerWidth - tw - pad));
    var placement = th <= above || above >= below ? 'top' : 'bottom';
    var top = placement === 'top' ? iconRect.top - th - gap : iconRect.bottom + gap;
    tooltip.dataset.placement = placement;
    tooltip.style.setProperty('--social-arrow-x', Math.max(8, Math.min(center - left, tw - 8)) + 'px');
    tooltip.style.left = left + 'px';
    tooltip.style.top = top + 'px';
  }

  function bind() {
    var icons = document.querySelectorAll('.social-icon');
    if (!icons || icons.length === 0) return;

    var tooltip = createTooltip();
    var img = tooltip.querySelector('img');
    var activeTimer = null;
    var showTimer = null;
    var activeIcon = null;

    function hideTooltip() {
      clearTimeout(activeTimer);
      clearTimeout(showTimer);
      activeIcon = null;
      tooltip.classList.remove('show');
      tooltip.style.display = 'none';
    }
    function showActiveTooltip() {
      if (!activeIcon || !img.complete || !img.naturalWidth) return;
      positionTooltip(tooltip, activeIcon.getBoundingClientRect(), 8);
      tooltip.classList.add('show');
    }
    img.addEventListener('load', showActiveTooltip);
    img.addEventListener('error', hideTooltip);
    window.addEventListener('scroll', hideTooltip, { passive: true });
    window.addEventListener('resize', hideTooltip);

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
            clearTimeout(showTimer);
            activeIcon = icon;
            img.src = href;
            tooltip.classList.remove('show');
            tooltip.style.display = 'block';
            // Cached images need a scheduled check; new images reposition on load.
            showTimer = setTimeout(showActiveTooltip, 40);
          }, {passive: true});

          icon.addEventListener('mouseleave', function () {
            clearTimeout(showTimer);
            // small delay before hide to make hover less jittery
            activeTimer = setTimeout(function () {
              activeIcon = null;
              tooltip.classList.remove('show');
              activeTimer = setTimeout(hideTooltip, 180);
            }, 80);
          });
        }

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
