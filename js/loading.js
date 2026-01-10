(function() {
  // 注意：下面用的是反引号 ` (键盘左上角波浪号那个键)，不是单引号 '
  const loaderHTML = `
    <div id="loader-wrapper">
        <div class="loader-bg"></div>
        <div class="loader-content">
            <svg viewBox="0 0 100 100" class="loading-svg">
               <path class="svg-path" d="M30,50 Q50,20 70,50 T90,50" fill="none" stroke="#000" stroke-width="2" />
            </svg>
            <div style="margin-top:10px;">Loading...</div>
        </div>
    </div>
  `;

  document.body.insertAdjacentHTML('afterbegin', loaderHTML);

  const loader = document.getElementById('loader-wrapper');

  window.addEventListener('load', function() {
      setTimeout(function() {
          loader.classList.add('loaded');
      }, 1000);
  });

  document.addEventListener('pjax:send', function () {
      loader.classList.remove('loaded');
      loader.classList.add('loading');
  });

  document.addEventListener('pjax:complete', function () {
      setTimeout(function() {
          loader.classList.remove('loading');
          loader.classList.add('loaded');
      }, 500); 
  });
})();