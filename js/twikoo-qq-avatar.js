(function(){
  'use strict';

  function findEmailInNode(el){
    // try attributes first
    const attrs = ['data-email','data-email-md5','data-twikoo-email','email'];
    for(const a of attrs){
      if(el.hasAttribute && el.hasAttribute(a)) return el.getAttribute(a);
    }
    // search descendant attributes
    const attrNode = el.querySelector && (el.querySelector('[data-email], [data-twikoo-email], [email]'));
    if(attrNode){
      for(const a of attrs){ if(attrNode.hasAttribute && attrNode.hasAttribute(a)) return attrNode.getAttribute(a); }
    }
    // fallback: search visible text for qq email pattern
    try{
      const txt = (el.innerText || el.textContent || '');
      const m = txt.match(/([0-9]{5,11})@qq\.com/i);
      if(m) return m[0];
    }catch(e){}
    return null;
  }

  function setQQAvatarForComment(commentEl){
    if(!commentEl || !(commentEl instanceof Element)) return;
    // find existing avatar img if any
    const img = commentEl.querySelector('img') || commentEl.querySelector('.tk-avatar img') || commentEl.querySelector('.tk-avatar-img');
    if(!img) return;

    // don't overwrite if we've already set a qq avatar marker
    if(img.getAttribute('data-qq-avatar') === '1') return;

    const email = findEmailInNode(commentEl) || findEmailInNode(img) || '';
    if(!email) return;
    const mq = email.match(/^(\d{5,11})@qq\.com$/i);
    if(!mq) return;

    const qq = mq[1];
    const qqUrl = 'https://thirdqq.qlogo.cn/g?b=sdk&nk=' + encodeURIComponent(qq) + '&s=140';

    // set image src to qq avatar; set onerror fallback to original src
    const original = img.src;
    img.onerror = function(){
      // if QQ avatar fails, fallback to original or keep existing
      if(original && original !== img.src) img.src = original;
      img.onerror = null;
    };
    img.src = qqUrl;
    img.setAttribute('data-qq-avatar','1');
    img.style.objectFit = 'cover';
    img.style.width = img.style.width || '40px';
    img.style.height = img.style.height || '40px';
    img.style.borderRadius = '50%';
  }

  function scanAll(){
    // Twikoo comment item classes may vary; common ones: .tk-comment, .tk-item, .twikoo-comment
    const selectors = ['#twikoo-wrap .tk-comment', '#twikoo-wrap .tk-item', '#twikoo-wrap .twikoo-comment', '.tk-comment', '.tk-item', '.twikoo-comment'];
    const set = new Set();
    selectors.forEach(sel => document.querySelectorAll(sel).forEach(el=>set.add(el)));
    // if no matches, try to find images within twikoo wrap
    if(set.size === 0){
      const wrap = document.getElementById('twikoo-wrap');
      if(wrap){
        wrap.querySelectorAll('img').forEach(img => {
          // find closest comment container
          const container = img.closest('.tk-comment, .tk-item, .twikoo-comment') || img.closest('#twikoo-wrap');
          if(container) set.add(container);
        });
      }
    }

    set.forEach(el => setQQAvatarForComment(el));
  }

  function observe(){
    const obs = new MutationObserver(records => {
      records.forEach(rec => {
        if(rec.addedNodes && rec.addedNodes.length){
          rec.addedNodes.forEach(node => {
            if(!(node instanceof Element)) return;
            if(node.matches && (node.matches('.tk-comment') || node.matches('.tk-item') || node.matches('.twikoo-comment'))){
              setQQAvatarForComment(node);
            }
            node.querySelectorAll && node.querySelectorAll('.tk-comment, .tk-item, .twikoo-comment').forEach(setQQAvatarForComment);
            // also if images added, try their containers
            node.querySelectorAll && node.querySelectorAll('img').forEach(img => {
              const container = img.closest('.tk-comment, .tk-item, .twikoo-comment') || img.closest('#twikoo-wrap');
              if(container) setQQAvatarForComment(container);
            });
          });
        }
        if(rec.type === 'attributes' && rec.attributeName === 'src' && rec.target instanceof Element){
          // ignore
        }
      });
    });
    obs.observe(document.body, { childList: true, subtree: true });
  }

  document.addEventListener('DOMContentLoaded', function(){
    setTimeout(()=>{
      scanAll();
      observe();
    }, 800);
  });

})();
