(function(){
  // This script injects a button into the theme's #rightside-config-hide container
  // so it shares the same styles as other rightside buttons.
  const ID = 'copy-friendlink-btn';
  const TIP_ID = 'copy-friendlink-tip';

  function getContainer() {
    const hide = document.getElementById('rightside-config-hide');
    if (hide) return hide;
    const rightside = document.getElementById('rightside');
    return rightside || document.body;
  }

  function createButton() {
    const btn = document.createElement('button');
    btn.id = ID;
    btn.type = 'button';
    btn.title = '复制友情链接信息';
    // Use an icon to match existing rightside buttons
    btn.innerHTML = '<i class="fas fa-link"></i>';
    return btn;
  }

  function createTip() {
    const tip = document.createElement('div');
    tip.id = TIP_ID;
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
    return tip;
  }

  function showTip(text) {
    const tip = document.getElementById(TIP_ID) || createTip();
    if (!tip.parentElement) document.body.appendChild(tip);
    tip.textContent = text;
    tip.style.opacity = '1';
    setTimeout(() => tip.style.opacity = '0', 1600);
  }

  document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById(ID)) return;

    const container = getContainer();
    const btn = createButton();
    const tip = createTip();

    // Insert the button as the first child so it appears in the hidden group with others
    if (container && container.firstElementChild) container.insertBefore(btn, container.firstElementChild);
    else if (container) container.appendChild(btn);
    document.body.appendChild(tip);

    // The exact YAML snippet requested (keeps original indentation and spacing)
    const yamlSnippet = `name: 不夜天\n      link: https://www.anbanyu.cn/\n      avatar: https://s2.loli.net/2025/01/06/gpiq6sCUYQAnvXu.jpg\n      descr: 凡美好的我都热爱，凡浪漫的我都向往`;

    btn.addEventListener('click', async (e) => {
      try {
        await navigator.clipboard.writeText(yamlSnippet);
        showTip('友链信息已复制');
      } catch (err) {
        // fallback
        const ta = document.createElement('textarea');
        ta.value = yamlSnippet;
        ta.style.position = 'fixed';
        ta.style.left = '-99999px';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); showTip('已复制（兼容模式）'); }
        catch (e2) { alert('复制失败，请手动复制:\n' + yamlSnippet); }
        document.body.removeChild(ta);
      }
    });

  });
})();
