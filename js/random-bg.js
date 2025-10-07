/* random-bg.js
   - 每次进入页面随机选择一张图集中的图片作为背景
   - 预加载图片以避免闪烁
   - 使用 localStorage 缓存当前索引，避免短时间内重复
*/
(function () {
  'use strict';

  // 可在此数组中添加/替换图片 URL
  var bgList = [
    'https://s2.loli.net/2025/10/05/QavDKncWM968tBq.jpg',
    'https://s2.loli.net/2025/01/06/m4fjdBYCKPrwGJF.jpg',
    'https://s2.loli.net/2025/10/07/GVRMa4mPZhf6Tsv.jpg',
    'https://s2.loli.net/2025/10/07/2WQxn5iedh1C9k3.jpg',
    'https://s2.loli.net/2025/10/07/XyZ9Uh5kjnxqrb7.jpg',
    'https://s2.loli.net/2025/10/07/1EM89qO6BxXVwvt.jpg',
    // 在此添加更多图片地址，比如：
    // '/img/bg-1.jpg',
    // '/img/bg-2.jpg',
    // 'https://example.com/other.jpg'
  ];

  var STORAGE_KEY = 'site_random_bg_idx_v1';
  var MIN_INTERVAL_MS = 1000 * 60 * 1; // 1 分钟内重复同一张

  function pickIndex() {
    if (!bgList || bgList.length === 0) return -1;
    if (bgList.length === 1) return 0;

    try {
      var data = localStorage.getItem(STORAGE_KEY);
      if (data) {
        var obj = JSON.parse(data);
        var lastIdx = obj.idx;
        var lastTs = obj.ts;
        var now = Date.now();
        if (now - lastTs < MIN_INTERVAL_MS) {
          // 在短时间内保持上一次选择
          return lastIdx % bgList.length;
        }
      }
    } catch (e) {
      // ignore
    }

    // 随机选择，不等概率排除上一次
    var idx = Math.floor(Math.random() * bgList.length);
    return idx;
  }

  function saveIndex(idx) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ idx: idx, ts: Date.now() }));
    } catch (e) {
      // ignore
    }
  }

  function preload(src, cb) {
    var img = new Image();
    img.onload = function () { cb && cb(null, img); };
    img.onerror = function (err) { cb && cb(err); };
    img.src = src;
  }

  function applyBackground(url) {
    var el = document.getElementById('web_bg');
    if (!el) {
      // fallback: apply to body
      document.body.style.backgroundImage = 'url("' + url + '")';
      document.body.classList.add('custom-bg-fallback');
      return;
    }
    el.style.backgroundImage = 'url("' + url + '")';
    el.style.backgroundRepeat = 'no-repeat';
    el.style.backgroundPosition = 'center center';
    el.style.backgroundSize = 'cover';
  }

  document.addEventListener('DOMContentLoaded', function () {
    if (!bgList || bgList.length === 0) return;
    var idx = pickIndex();
    if (idx < 0) return;
    var url = bgList[idx % bgList.length];

    preload(url, function (err) {
      if (!err) {
        applyBackground(url);
        saveIndex(idx);
      } else {
        // 如果预加载失败，仍尝试直接应用（浏览器会处理）
        applyBackground(url);
        saveIndex(idx);
      }
    });
  });

})();
