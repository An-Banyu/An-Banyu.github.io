(function () {
  'use strict';
  if (window.__commentImages) return;
  window.__commentImages = true;
  const API = 'https://img.anbanyu.cn', MAX = 5 * 1024 * 1024;
  let current, scriptPromise;
  function turnstile() {
    if (window.turnstile) return Promise.resolve(window.turnstile);
    if (!scriptPromise) scriptPromise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.onload = () => resolve(window.turnstile);
      script.onerror = () => { script.remove(); scriptPromise = null; reject(new Error('验证服务未能加载，请稍后重试')); };
      document.head.appendChild(script);
    });
    return scriptPromise;
  }
  function close() {
    if (!current) return;
    current.abort.abort();
    if (current.widget !== undefined && window.turnstile) window.turnstile.remove(current.widget);
    URL.revokeObjectURL(current.previewURL);
    current.dialog.close(); current.dialog.remove(); current = null;
  }
  async function choose(submit, file) {
    if (!file || current) return;
    const textarea = submit.querySelector('.tk-input textarea');
    if (!textarea) return;
    const oldStatus = submit.querySelector('.comment-image-status');
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type) || !file.size || file.size > MAX) {
      oldStatus.textContent = '请选择不超过 5 MiB 的 JPEG、PNG、GIF 或 WebP 图片'; return;
    }
    oldStatus.textContent = '';
    const dialog = document.createElement('dialog'); dialog.className = 'comment-image-dialog';
    dialog.setAttribute('aria-label', '评论配图');
    dialog.innerHTML = '<form method="dialog"><header><h2>评论配图</h2><button type="button" class="image-close" aria-label="关闭" title="关闭"><i class="fas fa-times" aria-hidden="true"></i></button></header><img class="image-preview" alt="待上传图片预览"><p class="image-name"></p><p class="image-privacy">图片上传后公开可见。删除评论不会自动删除图片，请勿上传隐私信息。</p><div class="image-verification"></div><p class="image-error" role="status" aria-live="polite"></p><input class="image-result" aria-label="已上传图片链接" readonly hidden><footer><button class="image-cancel" type="button">取消</button><button class="image-upload" type="button" disabled>上传并插入</button></footer></form>';
    const state = { dialog, abort: new AbortController(), previewURL: URL.createObjectURL(file), widget: undefined, token: '', busy: false };
    current = state;
    const start = textarea.selectionStart, end = textarea.selectionEnd, original = textarea.value;
    const upload = dialog.querySelector('.image-upload'), error = dialog.querySelector('.image-error');
    dialog.querySelector('.image-preview').src = state.previewURL;
    dialog.querySelector('.image-name').textContent = file.name + ' · ' + (file.size / 1024 / 1024).toFixed(2) + ' MiB';
    dialog.querySelector('.image-close').onclick = close;
    dialog.querySelector('.image-cancel').onclick = close;
    dialog.addEventListener('cancel', event => { event.preventDefault(); close(); });
    document.body.appendChild(dialog); dialog.showModal();
    upload.onclick = async () => {
      if (!state.token || state.busy) return;
      state.busy = true; upload.disabled = true; error.textContent = '正在上传…';
      const token = state.token; state.token = '';
      try {
        const response = await fetch(API + '/api/upload', { method: 'POST', headers: { 'Content-Type': file.type, 'X-Turnstile-Token': token }, body: file, signal: state.abort.signal });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || '上传失败，请稍后重试');
        if (!/^https:\/\/img\.anbanyu\.cn\/comments\/[a-f0-9]{64}\.(?:jpg|png|gif|webp)$/.test(data.url)) throw new Error('图片链接无效');
        if (current !== state) return;
        const markdown = '\n![图片](' + data.url + ')\n';
        const unchanged = textarea.value === original;
        const insertion = unchanged ? start : textarea.value.length, finish = unchanged ? end : insertion;
        const length = textarea.value.length - (finish - insertion) + markdown.length;
        if (!textarea.isConnected || (textarea.maxLength > 0 && length > textarea.maxLength)) {
          const result = dialog.querySelector('.image-result');result.hidden = false;result.value = data.url;
          error.textContent = '图片已上传，但评论已切换或达到字数上限。链接已保留。';
          upload.hidden = true; return;
        }
        textarea.setRangeText(markdown, insertion, finish, 'end');
        textarea.dispatchEvent(new Event('input', { bubbles: true }));
        close(); textarea.focus(); oldStatus.textContent = '图片已插入，评论尚未发送';
      } catch (err) {
        if (current === state && err.name !== 'AbortError') { error.textContent = err.message;window.turnstile.reset(state.widget); }
      } finally { state.busy = false; if (current === state) upload.disabled = !state.token; }
    };
    try {
      const response = await fetch(API + '/api/config', { signal: state.abort.signal });
      const data = await response.json(); if (!response.ok) throw new Error(data.error || '上传暂不可用');
      const widget = await turnstile(); if (current !== state) return;
      state.widget = widget.render(dialog.querySelector('.image-verification'), { sitekey: data.siteKey, action: 'comment_image', size: dialog.clientWidth < 360 ? 'compact' : 'flexible', theme: 'auto', callback: token => { if (current !== state) return;state.token = token;upload.disabled = state.busy; }, 'expired-callback': () => {state.token = '';upload.disabled = true;}, 'error-callback': () => {state.token = '';upload.disabled = true;error.textContent = '验证失败，请关闭后重试';} });
    } catch (err) { if (current === state && err.name !== 'AbortError') error.textContent = err.message; }
  }
  function attach(root) {
    root.querySelectorAll('.tk-submit').forEach(submit => {
      const tools = submit.querySelector('.tk-row-actions-start');
      if (!tools || tools.querySelector('.comment-image-button')) return;
      const button = document.createElement('button'); button.type = 'button';button.className = 'comment-image-button';
      button.title = '上传图片（最多 5 MiB）'; button.setAttribute('aria-label', '上传评论图片');
      button.innerHTML = '<i class="far fa-image" aria-hidden="true"></i>';
      const input = document.createElement('input');input.type = 'file';input.hidden = true;input.accept = 'image/jpeg,image/png,image/gif,image/webp';input.className = 'comment-image-input';input.setAttribute('aria-label', '评论图片文件');
      input.onchange = () => { choose(submit, input.files[0]);input.value = ''; };
      button.onclick = () => input.click();tools.append(button, input);
      if (!submit.querySelector('.comment-image-status')) { const status = document.createElement('p');status.className = 'comment-image-status';status.setAttribute('role','status');submit.appendChild(status); }
    });
  }
  const seen = new WeakSet();
  function init() {
    const root = document.getElementById('twikoo') || document.getElementById('twikoo-wrap');if (!root || seen.has(root)) return;seen.add(root);
    let queued = false;
    const observer = new MutationObserver(() => { if (queued) return;queued = true;queueMicrotask(() => {queued = false;attach(root);}); });
    observer.observe(root, { childList: true, subtree: true }); attach(root);
    for (const name of ['paste', 'drop']) root.addEventListener(name, event => {
      const submit = event.target.closest('.tk-submit');if (!submit || !event.target.closest('.tk-input')) return;
      const files = (event.clipboardData || event.dataTransfer)?.files;
      if (!files?.length) return;
      event.preventDefault();event.stopImmediatePropagation();choose(submit, files[0]);
    }, true);
    root.addEventListener('dragover', event => {if (event.target.closest('.tk-input') && event.dataTransfer?.types.includes('Files')) event.preventDefault();});
    // Block the old native uploader, including programmatic file-input changes.
    root.addEventListener('change', event => {if(event.target.matches('.tk-input-image')) {event.stopImmediatePropagation();choose(event.target.closest('.tk-submit'),event.target.files[0]);event.target.value='';}},true);
  }
  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('pjax:complete', init);
  document.addEventListener('pjax:send', close);
  document.addEventListener('twikoo:ready', init);
  init();
})();
