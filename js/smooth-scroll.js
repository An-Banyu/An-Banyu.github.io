(() => {
  'use strict';
  const base = document.currentScript.dataset.lenisBase;
  const desktop = matchMedia('(min-width: 769px) and (hover: hover) and (pointer: fine)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const key = 'anbanyu.smooth-scroll.enabled.v1';
  const button = document.getElementById('smooth-scroll-toggle');
  const nested = 'input,textarea,select,[contenteditable],pre,.table-wrap,.toc-content,#local-search,.search-dialog,.fancybox__container,#post-comment';
  let enabled = true;
  try { enabled = localStorage.getItem(key) !== 'false'; } catch (_) {}
  let engine = null;
  let assets = null;
  let frame = 0;
  let lastFrame = null;
  let animationTime = 1;
  let pageActive = true;

  function eligible() {
    return desktop.matches && !reduced.matches;
  }

  function wanted() {
    return enabled && eligible() && !document.hidden && pageActive;
  }

  function updateButton() {
    if (!button) return;
    button.style.display = eligible() ? '' : 'none';
    button.setAttribute('aria-pressed', String(Boolean(engine)));
    button.title = engine ? '\u5173\u95ed\u6eda\u52a8\u963b\u5c3c' : '\u5f00\u542f\u6eda\u52a8\u963b\u5c3c';
    button.setAttribute('aria-label', button.title);
  }

  function tick(now) {
    frame = 0;
    if (!engine) return;
    // Keep idle time out of the animation clock; do not run a permanent RAF loop.
    if (lastFrame !== null) animationTime += Math.min(now - lastFrame, 32);
    lastFrame = now;
    engine.raf(animationTime);
    if (engine.isScrolling === 'smooth') frame = requestAnimationFrame(tick);
    else lastFrame = null;
  }

  function wake() {
    if (frame || !engine) return;
    lastFrame = null;
    frame = requestAnimationFrame(tick);
  }

  function interrupt() {
    if (engine?.isScrolling === 'smooth') {
      engine.scrollTo(engine.actualScroll, { immediate: true, force: true });
    }
    cancelAnimationFrame(frame);
    frame = 0;
    lastFrame = null;
  }

  function locked() {
    return [document.documentElement, document.body].some(node =>
      /hidden|clip/.test(getComputedStyle(node).overflowY));
  }

  function loadAssets() {
    if (assets) return assets;
    assets = new Promise((resolve, reject) => {
      const css = document.createElement('link');
      css.rel = 'stylesheet';
      css.href = base + 'lenis.css';
      const script = document.createElement('script');
      script.src = base + 'lenis.min.js';
      const timer = setTimeout(fail, 10000);
      let loaded = 0;
      function fail() {
        clearTimeout(timer);
        css.remove();
        script.remove();
        reject(new Error('Smooth scroll assets unavailable'));
      }
      function done() {
        if (++loaded !== 2) return;
        clearTimeout(timer);
        resolve();
      }
      css.onload = script.onload = done;
      css.onerror = script.onerror = fail;
      document.head.append(css, script);
    });
    return assets;
  }

  async function reconcile() {
    if (!wanted()) {
      interrupt();
      engine?.destroy();
      engine = null;
      updateButton();
      return;
    }
    try {
      await loadAssets();
      if (wanted() && !engine) {
        engine = new Lenis({
          autoRaf: false,
          duration: 0.3,
          lerp: 0,
          easing: t => 1 - Math.pow(1 - t, 3),
          smoothWheel: true,
          syncTouch: false,
          prevent: node => node.matches(nested),
          virtualScroll: ({ event }) => {
            if (event.ctrlKey || locked()) {
              interrupt();
              return false;
            }
            return true;
          }
        });
        engine.on('virtual-scroll', wake);
      }
    } catch (_) {
      // A missing optional asset must never block native page scrolling.
    }
    updateButton();
  }

  function setEnabled(value) {
    enabled = Boolean(value);
    try { localStorage.setItem(key, String(enabled)); } catch (_) {}
    return reconcile();
  }

  const originalScrollToDest = btf.scrollToDest;
  btf.scrollToDest = (pos, time = 500) => {
    if (!engine && !reduced.matches) return originalScrollToDest(pos, time);
    const fixed = document.getElementById('page-header')?.classList.contains('fixed');
    if (window.scrollY > pos || fixed) pos -= 70;
    if (!engine) return window.scrollTo({ top: Math.max(0, pos), behavior: 'instant' });
    engine.scrollTo(pos, { duration: Math.max(0, time) / 1000, immediate: time <= 0 });
    wake();
  };

  button?.addEventListener('click', () => setEnabled(!enabled));
  desktop.addEventListener('change', reconcile);
  reduced.addEventListener('change', reconcile);
  document.addEventListener('visibilitychange', reconcile);
  window.addEventListener('pagehide', () => { pageActive = false; reconcile(); });
  window.addEventListener('pageshow', () => { pageActive = true; reconcile(); });
  window.addEventListener('pointerdown', interrupt, { passive: true });
  window.addEventListener('hashchange', interrupt);
  window.addEventListener('keydown', event => {
    if (['Tab', 'ArrowDown', 'ArrowUp', 'PageDown', 'PageUp', 'Home', 'End', ' '].includes(event.key)) interrupt();
  });
  window.addEventListener('storage', event => {
    if (event.key === key) { enabled = event.newValue !== 'false'; reconcile(); }
  });
  window.anbanyuSmoothScroll = {
    setEnabled,
    get active() { return Boolean(engine); },
    get animating() { return Boolean(frame); }
  };
  reconcile();
})();
