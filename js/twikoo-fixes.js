// Twikoo runtime fixes: ensure textarea sizing
(function(){

  // 1. 强制调整元素的样式（核心功能）
  const forceAdjustElement = (el) => {
    try {
      // 使用 setProperty 带 'important' 来尽可能覆盖其他内联样式
      el.style.setProperty('min-height', '120px', 'important');
      el.style.setProperty('height', 'auto', 'important');
      el.style.setProperty('max-height', '600px', 'important');
      el.style.setProperty('box-sizing', 'border-box', 'important');
    } catch (err) { /* ignore */ }
  }

  // 2. 查找并调整编辑器高度
  const adjustEditorHeight = () => {
    const wrap = document.getElementById('twikoo-wrap');
    if(!wrap) return;

    const globalSelectors = [
      '.el-textarea__inner',
      'textarea',
      '[contenteditable]'
    ];

    // 优先在 twikoo 容器内查找并调整
    globalSelectors.forEach(sel => {
      wrap.querySelectorAll(sel).forEach(forceAdjustElement);
    });

    // 辅助检查：如果 Twikoo 渲染在 wrap 外，也尝试调整
    globalSelectors.forEach(sel => {
      document.querySelectorAll(sel).forEach(el => {
        // 仅对具有 Twikoo 相关类名（如 el-textarea__inner）的元素进行全局调整
        if (!el.closest('#twikoo-wrap') && !el.closest('.tk-') && !el.closest('.twikoo')) {
          if (!el.classList.contains('el-textarea__inner')) return;
        }
        forceAdjustElement(el);
      });
    });
  }

  // 3. 页面加载完成后开始执行调整
  document.addEventListener('DOMContentLoaded', () => {
    // 4. 持续监听 DOM 变化，以应对 Twikoo 异步渲染或动态修改样式的情况
    const observer = new MutationObserver((records) => {
      records.forEach(rec => {
        const target = rec.target;
        // 检查新增节点
        if (rec.type === 'childList' && rec.addedNodes.length) {
          rec.addedNodes.forEach(node => {
            if (!(node instanceof Element)) return;
            // 如果新增节点本身是编辑器，或包含编辑器
            if (node.matches && (node.matches('.el-textarea__inner') || node.matches('textarea') || node.matches('[contenteditable]'))) {
              forceAdjustElement(node); // 对节点本身应用
            }
            node.querySelectorAll && node.querySelectorAll('.el-textarea__inner, textarea, [contenteditable]').forEach(forceAdjustElement); // 对子元素应用
          });
        }
        // 检查属性（style, class）变化
        if (rec.type === 'attributes' && (rec.attributeName === 'style' || rec.attributeName === 'class')) {
          if (target && target instanceof Element) {
            if (target.matches('.el-textarea__inner') || target.matches('textarea') || target.matches('[contenteditable]')) {
              forceAdjustElement(target); // 重新应用强制样式
            }
          }
        }
      });
    });

    // 开始观察 document.body 及其子树，监听子节点、style和class属性变化
    observer.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['style', 'class'] });

    // 5. 多次尝试调整，覆盖不同渲染时机
    setTimeout(adjustEditorHeight, 100);
    setTimeout(adjustEditorHeight, 500);
    setTimeout(adjustEditorHeight, 1500);
    setTimeout(adjustEditorHeight, 3000);
  });
})();