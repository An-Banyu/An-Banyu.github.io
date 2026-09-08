(function (root) {
  'use strict';
  function shareLinks(data) {
    var url = new URL(data.url);
    if (url.protocol !== 'https:') throw new Error('Sharing requires HTTPS');
    url.hash = '';
    var image = '';
    try { var parsed = data.image && new URL(data.image, url); if (parsed && parsed.protocol === 'https:') image = parsed.href; } catch (_) {}
    var values = {
      facebook: ['https://www.facebook.com/sharer/sharer.php', { u: url.href }],
      twitter: ['https://twitter.com/intent/tweet', { url: url.href, text: data.title }],
      weibo: ['https://service.weibo.com/share/share.php', { url: url.href, title: data.title, pic: image }],
      qq: ['https://connect.qq.com/widget/shareqq/index.html', { url: url.href, title: data.title, summary: data.description, pics: image }]
    };
    var result = {};
    Object.keys(values).forEach(function (site) {
      var target = new URL(values[site][0]);
      Object.keys(values[site][1]).forEach(function (key) {
        var value = values[site][1][key];
        if (value) target.searchParams.set(key, value);
      });
      result[site] = target.href;
    });
    return result;
  }
  if (typeof module !== 'undefined' && module.exports) { module.exports = shareLinks; return; }

  function init() {
    document.querySelectorAll('.post_share .social-share').forEach(function (container) {
      // Initialize the QR provider before replacing its legacy share links.
      if (typeof window.socialShare === 'function') window.socialShare(container);
      var data = container.dataset;
      var links = shareLinks(data);
      var labels = { facebook: 'Facebook', twitter: 'X', weibo: '微博', qq: 'QQ' };
      (data.sites || '').split(',').forEach(function (site) {
        if (!links[site]) return;
        var anchor = container.querySelector('.icon-' + site);
        if (!anchor) {
          anchor = document.createElement('a');
          anchor.className = 'social-share-icon icon-' + site;
          container.appendChild(anchor);
        }
        anchor.href = links[site];
        anchor.target = '_blank';
        anchor.rel = 'noopener noreferrer';
        anchor.setAttribute('aria-label', '分享到' + labels[site]);
        anchor.title = '分享到' + labels[site];
      });
      var section = container.closest('.post_share');
      var feedback = section.querySelector('.share-feedback');
      section.querySelector('[data-copy-article]').addEventListener('click', async function () {
        try {
          if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(data.url);
          else {
            var input = document.createElement('textarea');
            input.value = data.url;
            input.style.cssText = 'position:fixed;left:-9999px;';
            document.body.appendChild(input);
            input.select();
            try { if (!document.execCommand('copy')) throw new Error('Copy unavailable'); }
            finally { input.remove(); }
          }
          feedback.textContent = '链接已复制';
        } catch (_) { feedback.textContent = '复制失败'; }
      });
      var native = section.querySelector('[data-native-share]');
      if (navigator.share) {
        native.hidden = false;
        native.addEventListener('click', async function () {
          try { await navigator.share({ title: data.title, url: data.url }); }
          catch (error) { if (error.name !== 'AbortError') feedback.textContent = '系统分享暂不可用'; }
        });
      }
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})(typeof window === 'undefined' ? globalThis : window);
