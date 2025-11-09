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
  });
})();
