(function () {
  'use strict';

  var selectors = ['.photography-page .photography-grid', '.poetry-page .poetry-grid'];

  function shuffleOnce(container) {
    if (!container || container.dataset.randomized === 'true') return;
    var cards = Array.prototype.slice.call(container.children);
    for (var index = cards.length - 1; index > 0; index -= 1) {
      var swapIndex = Math.floor(Math.random() * (index + 1));
      if (swapIndex !== index) {
        var current = cards[index];
        cards[index] = cards[swapIndex];
        cards[swapIndex] = current;
      }
    }
    cards.forEach(function (card) { container.appendChild(card); });
    container.dataset.randomized = 'true';
  }

  function init() {
    selectors.forEach(function (selector) {
      document.querySelectorAll(selector).forEach(shuffleOnce);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
  document.addEventListener('pjax:complete', init);
}());
