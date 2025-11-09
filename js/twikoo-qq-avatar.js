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

    // Try to map Twikoo-provided comment objects (via API) to DOM nodes and set QQ avatars.
    // Returns true if at least one avatar was mapped.
    function mapCommentsFromAPI(comments){
      if(!Array.isArray(comments) || comments.length === 0) return false;
      let mapped = 0;
      comments.forEach(c => {
        try{
          const id = c.id || c.commentId || c.objectId || c._id || c._id_str || null;
          let el = null;
          if(id){
            // Twikoo sometimes sets DOM id to comment id
            el = document.getElementById(String(id));
          }
          if(!el){
            // try match by nick + time heuristics
            const nick = (c.nick || c.name || c.author || '').trim();
            const created = c.created || c.date || c.time || c.created_at || '';
            if(nick){
              const candidates = Array.from(document.querySelectorAll('.tk-comment, .tk-item, .twikoo-comment'));
              for(const cand of candidates){
                const nickEl = cand.querySelector('.tk-nick, .tk-nick-link, .tk-author');
                const timeEl = cand.querySelector('time');
                const candNick = nickEl ? (nickEl.innerText||nickEl.textContent||'').trim() : '';
                const candTime = timeEl ? (timeEl.getAttribute('datetime')||timeEl.innerText||'') : '';
                if(candNick === nick){
                  if(created && candTime && candTime.indexOf(String(created).slice(0,10)) !== -1){ el = cand; break; }
                  if(!el) el = cand;
                }
              }
            }
          }

          if(el){
            const mail = c.mail || c.email || c.authorMail || c.email_md5 || c.mail_md5 || '';
            if(mail && typeof mail === 'string'){
              const m = mail.match(/(\d{5,11})@qq\.com/i);
              if(m){
                const qq = m[1];
                const img = el.querySelector('img') || el.querySelector('.tk-avatar img') || el.querySelector('.tk-avatar-img');
                if(img){
                  const qqUrl = 'https://thirdqq.qlogo.cn/g?b=sdk&nk=' + encodeURIComponent(qq) + '&s=140';
                  const original = img.src;
                  img.onerror = function(){ if(original && original !== img.src) img.src = original; img.onerror = null; };
                  img.src = qqUrl;
                  img.setAttribute('data-qq-avatar','1');
                  img.style.objectFit = 'cover';
                  img.style.width = img.style.width || '40px';
                  img.style.height = img.style.height || '40px';
                  img.style.borderRadius = '50%';
                  mapped++;
                }
              }
            }
          }
        }catch(e){ /* ignore per-item errors */ }
      });
      return mapped > 0;
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
      // prefer API-assisted mapping when Twikoo client is available
      const tryAPICall = (fn) => {
        try{
          const res = fn();
          if(res && typeof res.then === 'function'){
            res.then(data => { if(!mapCommentsFromAPI(data)) scanAll(); }).catch(()=>scanAll());
          } else {
            if(!mapCommentsFromAPI(res)) scanAll();
          }
        }catch(e){ scanAll(); }
      };

      const tw = window.twikoo || window.Twikoo || window.twikooClient || null;
      if(tw && typeof tw.getRecentComments === 'function'){
        tryAPICall(()=>tw.getRecentComments());
      }else if(tw && typeof tw.getComments === 'function'){
        tryAPICall(()=>tw.getComments());
      }else{
        // no client API available, scan DOM
        scanAll();
      }

      observe();
    }, 800);
  });

})();
