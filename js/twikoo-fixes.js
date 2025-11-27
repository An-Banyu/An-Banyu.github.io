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
      try{
        t.onerror = null;
        t.src = '/img/friend_404.gif';
      }catch(err){ /* ignore */ }
    }
  }

  function patchExistingImages(){
    const wrap = document.getElementById('twikoo-wrap');
    if(!wrap) return;
    wrap.querySelectorAll('img').forEach(img => {
      if(!img.complete || img.naturalWidth === 0){
        img.src = '/img/friend_404.gif';
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
  });
})();
