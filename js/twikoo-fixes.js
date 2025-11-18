// Twikoo runtime fixes: replace broken avatar images and ensure textarea sizing
(function(){
  function setFallbackOnError(e){
    const t = e.target;
    if(t && t.tagName === 'IMG'){
      // If image failed to load, replace with local fallback
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

  // Listen for runtime image load errors inside the twikoo container
  document.addEventListener('DOMContentLoaded', () => {
    const wrap = document.getElementById('twikoo-wrap');
    if(!wrap) return;
    wrap.addEventListener('error', setFallbackOnError, true);
    // initial pass after a short delay (twikoo may render async)
    setTimeout(patchExistingImages, 800);
    setTimeout(patchExistingImages, 2000);
    // 更强力地调整 Twikoo 编辑器输入框的高度（覆盖内联样式），并持续监听 DOM 变化
    const forceAdjustElement = (el) => {
      try {
        // 使用 setProperty 带 'important' 来尽可能覆盖其他内联样式
        el.style.setProperty('min-height', '120px', 'important');
        el.style.setProperty('height', 'auto', 'important');
        el.style.setProperty('max-height', '600px', 'important');
        el.style.setProperty('box-sizing', 'border-box', 'important');
      } catch (err) { /* ignore */ }
    }

    const adjustEditorHeight = () => {
      const globalSelectors = [
        '.el-textarea__inner',
        'textarea',
        '[contenteditable]'
      ];

      // First try within twikoo wrap
      globalSelectors.forEach(sel => {
        wrap.querySelectorAll(sel).forEach(forceAdjustElement);
      });

      // Also try globally in document in case Twikoo renders outside the wrap
      globalSelectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(el => {
          // skip elements that are clearly not part of comments area (heuristic)
          if (!el.closest('#twikoo-wrap') && !el.closest('.tk-') && !el.closest('.twikoo')) {
            // still apply to elements with the known class
            if (!el.classList.contains('el-textarea__inner')) return;
          }
          forceAdjustElement(el);
        });
      });
    }

    // Observe DOM mutations so that when Twikoo (or third-party) rewrites inline style we reapply
    const observer = new MutationObserver((records) => {
      records.forEach(rec => {
        if (rec.type === 'childList' && rec.addedNodes.length) {
          rec.addedNodes.forEach(node => {
            if (!(node instanceof Element)) return;
            // if a new editor or textarea is added, adjust it
            if (node.matches && (node.matches('.el-textarea__inner') || node.querySelector && node.querySelector('.el-textarea__inner') || node.matches('textarea') || node.querySelector && node.querySelector('textarea') || node.matches('[contenteditable]'))) {
              // apply to the node itself
              if (node.matches && (node.matches('.el-textarea__inner') || node.matches('textarea') || node.matches('[contenteditable]'))) forceAdjustElement(node);
              // and descendants
              node.querySelectorAll && node.querySelectorAll('.el-textarea__inner, textarea, [contenteditable]').forEach(forceAdjustElement);
            }
          });
        }
        if (rec.type === 'attributes' && (rec.attributeName === 'style' || rec.attributeName === 'class')) {
          const target = rec.target;
          if (target && target instanceof Element) {
            if (target.matches('.el-textarea__inner') || target.matches('textarea') || target.matches('[contenteditable]')) {
              forceAdjustElement(target);
            }
          }
        }
      });
    });

    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });

    // 多次尝试，覆盖不同渲染时机
    setTimeout(adjustEditorHeight, 100);
    setTimeout(adjustEditorHeight, 500);
    setTimeout(adjustEditorHeight, 1500);
    setTimeout(adjustEditorHeight, 3000);
  });
})();
