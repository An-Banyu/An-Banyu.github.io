(function() {
  // 假设你把 SVG 内容保存为了 source/loading.svg
  
  const loaderHTML = `
  <div id="loader-wrapper">
          <div class="loader-bg"></div>
          <div class="loader-content">
              <div id="svg-container" class="loading-svg">
                </div>
              
              <div class="loading-text">
                  欢迎光临不夜天<br>
                  loading...
              </div>
              </div>
      </div>
  `;

  document.body.insertAdjacentHTML('afterbegin', loaderHTML);

  const loader = document.getElementById('loader-wrapper');
  const svgContainer = document.getElementById('svg-container');

  // 【重要】请把你的那段长代码保存为 source/loading.svg 文件
  // 然后这里我们去读取它
  fetch('/loading.svg') 
    .then(response => response.text())
    .then(svgText => {
        svgContainer.innerHTML = svgText;
        
        // 获取所有路径
        const paths = svgContainer.querySelectorAll('path');
        
        // 动画逻辑：初始化所有碎片为透明
        paths.forEach(p => {
            p.style.opacity = 0;
            p.style.transition = 'opacity 0.5s ease';
        });

        // 随机顺序显示碎片
        const totalPaths = paths.length;
        const indices = Array.from({length: totalPaths}, (_, i) => i);
        
        // 打乱数组 (Fisher-Yates Shuffle)
        for (let i = indices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [indices[i], indices[j]] = [indices[j], indices[i]];
        }

        let i = 0;
        const interval = setInterval(() => {
            // 每次显示 50 个碎片
            for(let k=0; k<50; k++) {
                if(i >= totalPaths) {
                    clearInterval(interval);
                    break;
                }
                paths[indices[i]].style.opacity = 1;
                i++;
            }
        }, 10); // 每 10ms 刷新一次
    })
    .catch(err => {
        console.error("SVG 加载失败，请检查文件路径", err);
        svgContainer.innerHTML = 'Loading...';
    });


  // 页面加载完成逻辑
  window.addEventListener('load', function() {
      // 稍微多等一会儿，让拼图拼完
      setTimeout(function() {
          loader.classList.add('loaded');
          document.body.classList.add('loaded');
      }, 2400); // 根据碎片显示速度调整这个时间
  });

  // PJAX 适配
  document.addEventListener('pjax:send', function () {
      loader.classList.remove('loaded');
      document.body.classList.remove('loaded');
      loader.classList.add('loading');
  });
  document.addEventListener('pjax:complete', function () {
      setTimeout(function() {
          loader.classList.remove('loading');
          loader.classList.add('loaded');
          document.body.classList.add('loaded');
      }, 1000);
  });

})();