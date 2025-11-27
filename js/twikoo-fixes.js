// Twikoo initialization + runtime fixes
(function(){
  // -----------------------------
  //  Twikoo 初始化（已添加）
  // -----------------------------
  document.addEventListener('DOMContentLoaded', () => {
    const wrap = document.getElementById('twikoo-wrap');
    if (!wrap) return;

    // Twikoo init
    try {
      twikoo.init({
        envId: "https://twikoo.anbanyu.cn",   //
        el: "#twikoo-wrap",
        avatar: "qq",
        lang: "zh-CN"
      });
    } catch (err) {
      console.error("Twikoo 初始化失败：", err);
    }
  });


  // -----------------------------
  //  Twikoo 运行时修复逻辑（你原来的全部内容）
  // -----------------------------

function setFallbackOnError(e){
  const t = e.target;
  if(t && t.tagName === 'IMG'){
    const src = t.src || '';

    // 不替换 Twikoo 的头像（重要）
    if (t.closest('.tk-avatar')) return;

    // 不替换 QQ 头像
    if (/qlogo\.cn|qq\.qlogo\.cn/.test(src)) return;

    t.onerror = null;
    t.src = '/img/friend_404.gif';
  }
}



function patchExistingImages(){
  const wrap = document.getElementById('twikoo-wrap');
  if(!wrap) return;

  wrap.querySelectorAll('img').forEach(img => {
    const src = img.src || '';

    // 不处理 Twikoo 头像（重要）
    if (img.closest('.tk-avatar')) return;

    // 不处理 QQ 头像
    if (/qlogo\.cn|qq\.qlogo\.cn/.test(src)) return;

    // 延迟检查，避免误杀 Twikoo 头像
    if(!img.complete || img.naturalWidth === 0){
      setTimeout(() => {
        if (!img.complete || img.naturalWidth === 0) {
          img.src = '/img/friend_404.gif';
        }
      }, 1500);
    }
  });
}


  document.addEventListener('DOMContentLoaded', () => {
    const wrap = document.getElementById('twikoo-wrap');
    if(!wrap) return;

    wrap.addEventListener('error', setFallbackOnError, true);

    setTimeout(patchExistingImages, 800);
    setTimeout(patchExistingImages, 2000);

    const forceAdjustElement = (el) => {
      try {
        el.style.setProperty('min-height', '120px', 'important');
        el.style.setProperty('height', 'auto', 'important');
        el.style.setProperty('max-height', '600px', 'important');
        el.style.setProperty('box-sizing', 'border-box', 'important');
      } catch (err) { /* ignore */ }
    };

    const adjustEditorHeight = () => {
      const globalSelectors = [
        '.el-textarea__inner',
        'textarea',
        '[contenteditable]'
      ];

      globalSelectors.forEach(sel => {
        wrap.querySelectorAll(sel).forEach(forceAdjustElement);
      });

      globalSelectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
          if (!el.closest('#twikoo-wrap') && !el.closest('.tk-') && !el.closest('.twikoo')) {
            if (!el.classList.contains('el-textarea__inner')) return;
          }
          forceAdjustElement(el);
        });
      });
    };

    const observer = new MutationObserver((records) => {
      records.forEach(rec => {
        if (rec.type === 'childList' && rec.addedNodes.length) {
          rec.addedNodes.forEach(node => {
            if (!(node instanceof Element)) return;
            if (
              node.matches?.('.el-textarea__inner, textarea, [contenteditable]') ||
              node.querySelector?.('.el-textarea__inner, textarea, [contenteditable]')
            ) {
              if (node.matches?.('.el-textarea__inner, textarea, [contenteditable]')) {
                forceAdjustElement(node);
              }
              node.querySelectorAll?.('.el-textarea__inner, textarea, [contenteditable]').forEach(forceAdjustElement);
            }
          });
        }
        if (rec.type === 'attributes' && (rec.attributeName === 'style' || rec.attributeName === 'class')) {
          const target = rec.target;
          if (target && target instanceof Element) {
            if (target.matches('.el-textarea__inner, textarea, [contenteditable]')) {
              forceAdjustElement(target);
            }
          }
        }
      });
    });

    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });

    setTimeout(adjustEditorHeight, 100);
    setTimeout(adjustEditorHeight, 500);
    setTimeout(adjustEditorHeight, 1500);
    setTimeout(adjustEditorHeight, 3000);

    // -----------------------------
    // Twikoo 渲染后头像补偿（尝试使用 Twikoo API 返回的 avatar 覆盖 DOM）
    // -----------------------------
    const tryFixRenderedAvatars = async () => {
      try {
        if (typeof twikoo !== 'object') return;
        const envId = (typeof window !== 'undefined' && window.__TWIKOO_ENVID__) || '';
        // Prefer page-specific comments API if available
        let list = [];

        if (typeof twikoo.getComments === 'function') {
          // Some twikoo versions expose getComments({envId, region, urls})
          try {
            const res = await twikoo.getComments({ envId: envId || undefined, urls: [window.location.pathname], includeReply: true });
            // res may be an object or array
            if (Array.isArray(res)) list = res;
            else if (res && Array.isArray(res.comments)) list = res.comments;
          } catch (e) {
            // ignore and fallback
          }
        }

        // fallback to getRecentComments and filter by current page url if possible
        if (!list.length && typeof twikoo.getRecentComments === 'function') {
          try {
            const recent = await twikoo.getRecentComments({ envId: envId || undefined, pageSize: 200, includeReply: true });
            if (Array.isArray(recent)) {
              list = recent.filter(item => (item.url || '').indexOf(window.location.pathname) !== -1);
            }
          } catch (e) {
            // ignore
          }
        }

        if (!list || !list.length) return;

        // build map from comment url (may include #id) -> avatar
        const avatarByUrl = new Map();
        list.forEach(item => {
          if (item && item.url && item.avatar) avatarByUrl.set(String(item.url), String(item.avatar));
        });

        // For each avatar img in Twikoo area, try to find matching url ancestor and replace src
        const wrap = document.getElementById('twikoo-wrap');
        if (!wrap) return;
        wrap.querySelectorAll('img').forEach(img => {
          try {
            // skip if already QQ avatar
            if (/qlogo\.cn/.test(img.src)) return;

            // find closest link ancestor
            const a = img.closest('a[href]');
            if (a) {
              const href = a.getAttribute('href') || '';
              // try direct match
              if (avatarByUrl.has(href)) {
                img.src = avatarByUrl.get(href);
                return;
              }
              // try fragment match (strip domain)
              for (const [url, avatar] of avatarByUrl.entries()) {
                if (url.indexOf(window.location.pathname) !== -1 && href.indexOf('#') !== -1) {
                  // if both refer to an anchor on this page, replace
                  img.src = avatar;
                  return;
                }
              }
            }

            // last-resort: if img src is a Gravatar/Cravatar default, try to keep it but set onerror fallback
            if (/gravatar|cravatar|gravatar\.loli\.net/.test(img.src)) {
              img.onerror = function () {
                this.onerror = null;
                // leave existing fallback which we already set elsewhere
                this.src = '/img/friend_404.gif';
              };
            }
          } catch (err) { /* ignore per-image errors */ }
        });
      } catch (err) {
        // overall ignore
        console.error('twikoo-fixes: tryFixRenderedAvatars error', err);
      }
    };

    // 捕获输入区的 QQ 邮箱 -> 昵称 映射，保存到 localStorage，作为渲染回退用
    const QQ_MAP_KEY = 'twikoo_qq_avatar_map_v1';
    const loadQQMap = () => {
      try { return JSON.parse(localStorage.getItem(QQ_MAP_KEY) || '{}'); } catch (e) { return {}; }
    };
    const saveQQMap = (m) => {
      try { localStorage.setItem(QQ_MAP_KEY, JSON.stringify(m)); } catch (e) { /* ignore */ }
    };

    const captureInputMapping = () => {
      const wrap = document.getElementById('twikoo-wrap');
      if (!wrap) return;

      // find possible email and nick inputs inside twikoo form area
      const emailSelectors = 'input[type="email"], input[name*="mail" i], input[placeholder*="邮箱" i], input[placeholder*="Email" i]';
      const nickSelectors = 'input[name*="name" i], input[placeholder*="昵称" i], input[placeholder*="称呼" i], input[placeholder*="name" i]';

      const emailInput = wrap.querySelector(emailSelectors);
      const nickInput = wrap.querySelector(nickSelectors);

      const tryStore = () => {
        try {
          if (!emailInput) return;
          const email = (emailInput.value || '').trim();
          if (!/^[0-9]{5,11}@qq\.com$/.test(email)) return; // only QQ email
          const local = email.split('@')[0];
          const nick = (nickInput && nickInput.value && nickInput.value.trim()) || local;
          const qurl = `https://q1.qlogo.cn/g?b=qq&nk=${local}&s=100`;
          const map = loadQQMap();
          map[nick] = qurl;
          map[email] = qurl;
          saveQQMap(map);
        } catch (e) { /* ignore */ }
      };

      if (emailInput) emailInput.addEventListener('change', tryStore);
      if (emailInput) emailInput.addEventListener('blur', tryStore);
      if (emailInput) emailInput.addEventListener('input', () => { /* debounce could be added */ });
      if (nickInput) nickInput.addEventListener('change', tryStore);
    };

    // 尝试在初始加载点捕获输入映射
    try { captureInputMapping(); } catch (e) { /* ignore */ }

    // 在 tryFixRenderedAvatars 中使用 local mapping 替换 cravatar/gravatar
    const applyLocalQQMapToDOM = () => {
      try {
        const map = loadQQMap();
        if (!map || Object.keys(map).length === 0) return;
        const wrap = document.getElementById('twikoo-wrap');
        if (!wrap) return;
        wrap.querySelectorAll('.tk-avatar-img, .tk-avatar img, img').forEach(img => {
          try {
            if (!img || !img.src) return;
            if (!/cravatar|gravatar|gravatar\.loli\.net/.test(img.src)) return;
            // find nickname text near the avatar
            let nick = null;
            const comment = img.closest('.tk-comment, .tk-item, .comment, .tk') || img.closest('li');
            if (comment) {
              const nickEl = comment.querySelector('.tk-nickname, .tk-nick, .tk-author, .tk-name, .tk-user, .nick');
              if (nickEl) nick = (nickEl.textContent || '').trim();
            }
            // fallback: look for link text or title
            if (!nick) {
              const a = img.closest('a');
              if (a) nick = (a.getAttribute('title') || a.textContent || '').trim();
            }

            if (nick && map[nick]) {
              img.src = map[nick];
              return;
            }
            // try email key
            if (comment) {
              const mailAttr = comment.getAttribute('data-mail') || comment.getAttribute('data-email');
              if (mailAttr && map[mailAttr]) {
                img.src = map[mailAttr];
                return;
              }
            }
          } catch (e) { /* per-image ignore */ }
        });
      } catch (e) { /* ignore */ }
    };

    // bind local map application to observer and retries
    setTimeout(applyLocalQQMapToDOM, 1000);
    setTimeout(applyLocalQQMapToDOM, 3000);
    setTimeout(applyLocalQQMapToDOM, 8000);
    // also call from tryFixRenderedAvatars end
    const originalTry = tryFixRenderedAvatars;
    tryFixRenderedAvatars = async () => {
      await originalTry();
      applyLocalQQMapToDOM();
    };
    // call after initial delays and on mutations
    setTimeout(tryFixRenderedAvatars, 800);
    setTimeout(tryFixRenderedAvatars, 2000);
    observer.observe(document.body, { childList: true, subtree: true });
  });
})();
