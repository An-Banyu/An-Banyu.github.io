(function () {
  'use strict';

  var selector = '.poetry-page .poetry-grid';
  var minimumCardWidth = 180;

  function getCards(grid) {
    if (grid.classList.contains('poetry-grid--balanced')) {
      return Array.prototype.slice.call(grid.querySelectorAll('.poetry-column > .poetry-card'));
    }
    return Array.prototype.slice.call(grid.children).filter(function (child) {
      return child.classList && child.classList.contains('poetry-card');
    });
  }

  function getColumnCount(grid, cardCount) {
    if (cardCount <= 1) return Math.max(1, cardCount);
    if (window.matchMedia('(max-width: 520px)').matches) return 1;
    if (window.matchMedia('(max-width: 640px)').matches) return Math.min(2, cardCount);

    var styles = window.getComputedStyle(grid);
    var gap = parseFloat(styles.columnGap || styles.gap) || 16;
    var width = grid.clientWidth || grid.getBoundingClientRect().width;
    var widthBased = Math.floor((width + gap) / (minimumCardWidth + gap));
    return Math.min(3, cardCount, Math.max(1, widthBased));
  }

  function shortestColumn(columns) {
    return columns.reduce(function (shortest, column) {
      return column.offsetHeight < shortest.offsetHeight ? column : shortest;
    }, columns[0]);
  }

  function layout(grid, force) {
    var cards = getCards(grid);
    if (!cards.length) return;

    var width = Math.round(grid.getBoundingClientRect().width);
    if (!force && grid.dataset.poetryLayoutWidth === String(width)) return;

    var columnCount = getColumnCount(grid, cards.length);
    var fragment = document.createDocumentFragment();
    var columns = [];
    for (var index = 0; index < columnCount; index += 1) {
      var column = document.createElement('div');
      column.className = 'poetry-column';
      columns.push(column);
      fragment.appendChild(column);
    }

    grid.classList.add('poetry-grid--balanced');
    grid.style.setProperty('--poetry-effective-columns', columnCount);
    grid.replaceChildren(fragment);

    cards.forEach(function (card, cardIndex) {
      // Seed every column before using the shortest-column rule. This keeps
      // all three columns populated when the archive has at least three cards.
      var target = cardIndex < columnCount ? columns[cardIndex] : shortestColumn(columns);
      target.appendChild(card);
      // Reading offsetHeight forces the browser to account for the card just added.
      target.offsetHeight;
    });

    grid.dataset.poetryLayoutWidth = String(width);
    grid.dataset.poetryLayoutColumns = String(columnCount);
  }

  function schedule(grid, force) {
    if (grid.dataset.poetryLayoutPending === 'true') return;
    grid.dataset.poetryLayoutPending = 'true';
    window.requestAnimationFrame(function () {
      grid.dataset.poetryLayoutPending = 'false';
      layout(grid, force);
    });
  }

  function observe(grid) {
    if (grid.dataset.poetryObserved === 'true') return;
    grid.dataset.poetryObserved = 'true';

    Array.prototype.forEach.call(grid.querySelectorAll('img'), function (image) {
      image.addEventListener('load', function () { schedule(grid, true); });
    });
    window.addEventListener('resize', function () { schedule(grid, false); }, { passive: true });
    if (window.ResizeObserver) {
      var observer = new ResizeObserver(function () { schedule(grid, false); });
      observer.observe(grid);
    }
  }

  function init() {
    document.querySelectorAll(selector).forEach(function (grid) {
      observe(grid);
      layout(grid, false);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
  document.addEventListener('pjax:complete', init);
}());
