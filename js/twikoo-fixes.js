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
    // 尝试强制调整 Twikoo 编辑器输入框的高度（覆盖内联样式）
    const adjustEditorHeight = () => {
      // 常见选择器：Element UI 的 el-textarea__inner、原生 textarea、以及 contenteditable div
      const selectors = [
        '#twikoo-wrap .el-textarea__inner',
        '#twikoo-wrap textarea',
        '#twikoo-wrap [contenteditable]'
      ];
      selectors.forEach(sel => {
        wrap.querySelectorAll(sel).forEach(el => {
          try {
            el.style.minHeight = '120px';
            el.style.height = 'auto';
            el.style.maxHeight = '600px';
            // 如果是 textarea，确保 box-sizing
            el.style.boxSizing = 'border-box';
          } catch (err) { /* ignore */ }
        })
      })
    }

    // 多次尝试，覆盖不同渲染时机
    setTimeout(adjustEditorHeight, 300);
    setTimeout(adjustEditorHeight, 1000);
    setTimeout(adjustEditorHeight, 2500);
  });
})();
