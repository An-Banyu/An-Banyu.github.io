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

    /**
     * Email -> Avatar mapping
     * - QQ 邮箱（数字@qq.com）使用 thirdqq.qlogo.cn
     * - 其他邮箱使用 Gravatar（MD5）作为回退
     */
    const md5 = (str) => {
      // minimal JS MD5 implementation (for Gravatar). Small, self-contained.
      // Source: https://stackoverflow.com/a/16552111 (public domain style snippet)
      function rotateLeft(lValue, iShiftBits) { return (lValue<<iShiftBits) | (lValue>>>(32-iShiftBits)); }
      function addUnsigned(lX,lY){
        var lX4,lY4,lX8,lY8,lResult;
        lX8=(lX&0x80000000); lY8=(lY&0x80000000);
        lX4=(lX&0x40000000); lY4=(lY&0x40000000);
        lResult=(lX&0x3FFFFFFF)+(lY&0x3FFFFFFF);
        if(lX4&lY4) return (lResult^0x80000000^lX8^lY8);
        if(lX4|lY4){ if(lResult&0x40000000) return (lResult^0xC0000000^lX8^lY8); else return (lResult^0x40000000^lX8^lY8); }
        else return (lResult^lX8^lY8);
      }
      function F(x,y,z){return (x & y) | ((~x) & z);} function G(x,y,z){return (x & z) | (y & (~z));}
      function H(x,y,z){return (x ^ y ^ z);} function I(x,y,z){return (y ^ (x | (~z)));}
      function FF(a,b,c,d,x,s,ac){a=addUnsigned(a,addUnsigned(addUnsigned(F(b,c,d),x),ac));return addUnsigned(rotateLeft(a,s),b);} 
      function GG(a,b,c,d,x,s,ac){a=addUnsigned(a,addUnsigned(addUnsigned(G(b,c,d),x),ac));return addUnsigned(rotateLeft(a,s),b);} 
      function HH(a,b,c,d,x,s,ac){a=addUnsigned(a,addUnsigned(addUnsigned(H(b,c,d),x),ac));return addUnsigned(rotateLeft(a,s),b);} 
      function II(a,b,c,d,x,s,ac){a=addUnsigned(a,addUnsigned(addUnsigned(I(b,c,d),x),ac));return addUnsigned(rotateLeft(a,s),b);} 
      function convertToWordArray(str){var lWordCount; var lMessageLength=str.length; var lNumberOfWords_temp1=lMessageLength+8; var lNumberOfWords_temp2=(lNumberOfWords_temp1-(lNumberOfWords_temp1%64))/64; var lNumberOfWords=(lNumberOfWords_temp2+1)*16; var lWordArray=Array(lNumberOfWords-1); var lBytePosition=0; var lByteCount=0; while(lByteCount<lMessageLength){var lWordCount=(lByteCount-(lByteCount%4))/4; var lBytePosition=(lByteCount%4)*8; lWordArray[lWordCount]=(lWordArray[lWordCount]|(str.charCodeAt(lByteCount)<<lBytePosition)); lByteCount++;} var lWordCount=(lByteCount-(lByteCount%4))/4; var lBytePosition=(lByteCount%4)*8; lWordArray[lWordCount]=lWordArray[lWordCount]|(0x80<<lBytePosition); lWordArray[lNumberOfWords-2]=lMessageLength<<3; lWordArray[lNumberOfWords-1]=lMessageLength>>>29; return lWordArray; }
      function wordToHex(lValue){ var WordToHexValue="",WordToHexValue_temp="",lByte,lCount; for(lCount=0;lCount<=3;lCount++){ lByte=(lValue>>>(lCount*8))&255; WordToHexValue_temp="0"+lByte.toString(16); WordToHexValue=WordToHexValue+WordToHexValue_temp.substr(WordToHexValue_temp.length-2,2);} return WordToHexValue; }
      var x=convertToWordArray(unescape(encodeURIComponent(str))); var a=0x67452301; var b=0xEFCDAB89; var c=0x98BADCFE; var d=0x10325476; for(var k=0;k<x.length;k+=16){ var AA=a; var BB=b; var CC=c; var DD=d; a=FF(a,b,c,d,x[k+0],7,0xD76AA478); d=FF(d,a,b,c,x[k+1],12,0xE8C7B756); c=FF(c,d,a,b,x[k+2],17,0x242070DB); b=FF(b,c,d,a,x[k+3],22,0xC1BDCEEE); a=FF(a,b,c,d,x[k+4],7,0xF57C0FAF); d=FF(d,a,b,c,x[k+5],12,0x4787C62A); c=FF(c,d,a,b,x[k+6],17,0xA8304613); b=FF(b,c,d,a,x[k+7],22,0xFD469501); a=FF(a,b,c,d,x[k+8],7,0x698098D8); d=FF(d,a,b,c,x[k+9],12,0x8B44F7AF); c=FF(c,d,a,b,x[k+10],17,0xFFFF5BB1); b=FF(b,c,d,a,x[k+11],22,0x895CD7BE); a=FF(a,b,c,d,x[k+12],7,0x6B901122); d=FF(d,a,b,c,x[k+13],12,0xFD987193); c=FF(c,d,a,b,x[k+14],17,0xA679438E); b=FF(b,c,d,a,x[k+15],22,0x49B40821); a=GG(a,b,c,d,x[k+1],5,0xF61E2562); d=GG(d,a,b,c,x[k+6],9,0xC040B340); c=GG(c,d,a,b,x[k+11],14,0x265E5A51); b=GG(b,c,d,a,x[k+0],20,0xE9B6C7AA); a=GG(a,b,c,d,x[k+5],5,0xD62F105D); d=GG(d,a,b,c,x[k+10],9,0x02441453); c=GG(c,d,a,b,x[k+15],14,0xD8A1E681); b=GG(b,c,d,a,x[k+4],20,0xE7D3FBC8); a=GG(a,b,c,d,x[k+9],5,0x21E1CDE6); d=GG(d,a,b,c,x[k+14],9,0xC33707D6); c=GG(c,d,a,b,x[k+3],14,0xF4D50D87); b=GG(b,c,d,a,x[k+8],20,0x455A14ED); a=GG(a,b,c,d,x[k+13],5,0xA9E3E905); d=GG(d,a,b,c,x[k+2],9,0xFCEFA3F8); c=GG(c,d,a,b,x[k+7],14,0x676F02D9); b=GG(b,c,d,a,x[k+12],20,0x8D2A4C8A); a=HH(a,b,c,d,x[k+5],4,0xFFFA3942); d=HH(d,a,b,c,x[k+8],11,0x8771F681); c=HH(c,d,a,b,x[k+11],16,0x6D9D6122); b=HH(b,c,d,a,x[k+14],23,0xFDE5380C); a=HH(a,b,c,d,x[k+1],4,0xA4BEEA44); d=HH(d,a,b,c,x[k+4],11,0x4BDECFA9); c=HH(c,d,a,b,x[k+7],16,0xF6BB4B60); b=HH(b,c,d,a,x[k+10],23,0xBEBFBC70); a=HH(a,b,c,d,x[k+13],4,0x289B7EC6); d=HH(d,a,b,c,x[k+0],11,0xEAA127FA); c=HH(c,d,a,b,x[k+3],16,0xD4EF3085); b=HH(b,c,d,a,x[k+6],23,0x04881D05); a=II(a,b,c,d,x[k+0],6,0xD9D4D039); d=II(d,a,b,c,x[k+7],10,0xE6DB99E5); c=II(c,d,a,b,x[k+14],15,0x1FA27CF8); b=II(b,c,d,a,x[k+5],21,0xC4AC5665); a=II(a,b,c,d,x[k+12],6,0xF4292244); d=II(d,a,b,c,x[k+3],10,0x432AFF97); c=II(c,d,a,b,x[k+10],15,0xAB9423A7); b=II(b,c,d,a,x[k+1],21,0xFC93A039); a=II(a,b,c,d,x[k+8],6,0x655B59C3); d=II(d,a,b,c,x[k+15],10,0x8F0CCC92); c=II(c,d,a,b,x[k+6],15,0xFFEFF47D); b=II(b,c,d,a,x[k+13],21,0x85845DD1); a=II(a,b,c,d,x[k+4],6,0x6FA87E4F); d=II(d,a,b,c,x[k+11],10,0xFE2CE6E0); c=II(c,d,a,b,x[k+2],15,0xA3014314); b=II(b,c,d,a,x[k+9],21,0x4E0811A1); a=addUnsigned(a,AA); b=addUnsigned(b,BB); c=addUnsigned(c,CC); d=addUnsigned(d,DD);} var temp = wordToHex(a)+wordToHex(b)+wordToHex(c)+wordToHex(d); return temp.toLowerCase(); }

    const emailToAvatar = (email) => {
      if(!email) return null;
      email = String(email).trim().toLowerCase();
      const qqMatch = email.match(/^(\d+)@qq\.com$/i);
      if(qqMatch) {
        const qq = qqMatch[1];
        return `https://thirdqq.qlogo.cn/g?b=sdk&nk=${qq}&s=140`;
      }
      // fallback to gravatar
      const hash = md5(email);
      return `https://www.gravatar.com/avatar/${hash}?s=140&d=identicon`;
    }

    const updateAvatarPreviewFromEmail = (val) => {
      const avatarUrl = emailToAvatar(val);
      if(!avatarUrl) return;
      // try form preview avatars inside twikoo editor
      const previewSelectors = ['#twikoo-wrap .tk-editor .tk-avatar img', '#twikoo-wrap .tk-avatar img', '.tk-editor .tk-avatar img', '.twikoo-avatar img'];
      previewSelectors.forEach(sel => {
        document.querySelectorAll(sel).forEach(img => {
          try { img.src = avatarUrl; } catch(e){}
        });
      });
    }

    // find mail input(s) and bind
    const bindMailInputs = () => {
      const inputs = Array.from(document.querySelectorAll('input[name="mail"], input[type="email"], .el-input__inner[name="mail"]'));
      inputs.forEach(input => {
        // on blur and input
        input.addEventListener('input', () => updateAvatarPreviewFromEmail(input.value));
        input.addEventListener('blur', () => updateAvatarPreviewFromEmail(input.value));
      });
      // initial run
      inputs.forEach(i => updateAvatarPreviewFromEmail(i.value));
    }

    // bind now and also on DOM mutations (in case twikoo injects inputs later)
    bindMailInputs();
    const inputObserver = new MutationObserver(bindMailInputs);
    inputObserver.observe(document.body, { childList: true, subtree: true });
  });
})();
