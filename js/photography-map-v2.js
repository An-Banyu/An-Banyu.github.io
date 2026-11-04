(function () {
  'use strict';

  function readData() {
    const node = document.getElementById('photography-data');
    if (!node) return null;
    try {
      const data = JSON.parse(node.textContent || '{}');
      return data && typeof data === 'object' ? data : null;
    } catch (error) {
      console.warn('[photography] invalid page data', error);
      return null;
    }
  }

  function numberInRange(value, min, max) {
    const number = Number(value);
    return Number.isFinite(number) && number >= min && number <= max ? number : null;
  }

  function text(value, fallback) {
    return typeof value === 'string' && value.trim() ? value.trim() : fallback;
  }

  function renderPopup(item) {
    const wrapper = document.createElement('div');
    wrapper.className = 'photography-marker-popup';
    const title = document.createElement('div');
    title.className = 'photography-marker-label';
    title.textContent = text(item.title, '未命名作品');
    wrapper.appendChild(title);
    const location = text(item.location, '');
    if (location) {
      const locationNode = document.createElement('div');
      locationNode.textContent = location;
      wrapper.appendChild(locationNode);
    }
    const card = Array.from(document.querySelectorAll('.photography-card[data-photo-id]'))
      .find(candidate => candidate.dataset.photoId === String(item.id || ''));
    if (card) {
      const link = document.createElement('a');
      link.href = `#${card.id || ''}`;
      link.textContent = '查看作品';
      link.addEventListener('click', event => {
        event.preventDefault();
        card.scrollIntoView({ behavior: 'smooth', block: 'center' });
        card.focus({ preventScroll: true });
      });
      wrapper.appendChild(link);
    }
    return wrapper;
  }

  const tileSources = [
    {
      url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
      options: {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" rel="noopener noreferrer">OpenStreetMap</a> contributors',
        maxZoom: 19,
      },
    },
    {
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
      options: {
        attribution: 'Tiles &copy; Esri',
        maxZoom: 19,
      },
    },
    {
      url: 'https://{s}.tile.openstreetmap.de/{z}/{x}/{y}.png',
      options: {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" rel="noopener noreferrer">OpenStreetMap</a> contributors',
        maxZoom: 19,
      },
    },
  ];

  function initPhotography() {
    const container = document.getElementById('photography-map');
    if (!container || container.dataset.initialized === 'true') return;
    const data = readData() || {};
    const mapSettings = data.map && typeof data.map === 'object' ? data.map : {};
    const center = Array.isArray(mapSettings.center) ? mapSettings.center : [];
    const latitude = numberInRange(center[0], -90, 90) ?? 35.8617;
    const longitude = numberInRange(center[1], -180, 180) ?? 104.1954;
    const zoomValue = Number(mapSettings.zoom);
    const zoom = Number.isFinite(zoomValue) ? Math.min(18, Math.max(1, zoomValue)) : 4;

    const fallback = container.querySelector('.photography-map-fallback');
    if (!window.L || typeof window.L.map !== 'function') {
      if (fallback) fallback.textContent = '地图暂时无法加载，作品列表仍可正常浏览。';
      return;
    }
    container.dataset.initialized = 'true';
    if (fallback) fallback.remove();

    const map = window.L.map(container, {
      scrollWheelZoom: true,
      preferCanvas: true,
      updateWhenIdle: true,
      updateWhenZooming: false,
    }).setView([latitude, longitude], zoom);

    let activeTileLayer = null;
    let tileSourceIndex = -1;
    let fallbackTimer = null;
    let errorTimer = null;
    const tileStatus = document.createElement('p');
    tileStatus.className = 'photography-map-status';
    tileStatus.setAttribute('role', 'status');
    tileStatus.setAttribute('aria-live', 'polite');
    tileStatus.textContent = '地图底图加载中……';
    container.appendChild(tileStatus);

    const mountTileSource = index => {
      const source = tileSources[index];
      if (!source) {
        if (fallback) fallback.textContent = '地图底图暂时无法加载，作品列表仍可正常浏览。';
        tileStatus.textContent = '地图底图加载失败';
        tileStatus.hidden = false;
        return;
      }

      tileSourceIndex = index;
      tileStatus.hidden = false;
      tileStatus.textContent = '地图底图加载中……';
      let startedTiles = 0;
      let loadedTiles = 0;
      let failedTiles = 0;
      let switched = false;
      const layer = window.L.tileLayer(source.url, {
        ...source.options,
        keepBuffer: 2,
        updateWhenIdle: true,
        updateWhenZooming: false,
      });

      const switchToNextSource = () => {
        if (switched || tileSourceIndex !== index) return;
        switched = true;
        if (fallbackTimer) window.clearTimeout(fallbackTimer);
        if (errorTimer) window.clearTimeout(errorTimer);
        map.removeLayer(layer);
        if (tileSources[index + 1]) {
          tileStatus.textContent = '当前底图响应较慢，正在切换备用底图……';
          mountTileSource(index + 1);
        } else {
          tileStatus.textContent = '地图底图加载失败';
        }
      };

      const hasTooManyErrors = () => startedTiles >= 6 && failedTiles >= 3 && failedTiles >= Math.ceil(startedTiles * .25);
      const scheduleErrorCheck = () => {
        if (errorTimer || switched) return;
        errorTimer = window.setTimeout(() => {
          errorTimer = null;
          if (hasTooManyErrors()) switchToNextSource();
        }, 2500);
      };

      layer.on('tileloadstart', () => {
        startedTiles += 1;
      });
      layer.on('tileload', () => {
        loadedTiles += 1;
        if (tileSourceIndex === index && loadedTiles > 0) {
          tileStatus.textContent = '';
          tileStatus.hidden = true;
        }
      });
      layer.on('tileerror', () => {
        failedTiles += 1;
        scheduleErrorCheck();
      });
      layer.addTo(map);
      fallbackTimer = window.setTimeout(() => {
        if (loadedTiles === 0 || hasTooManyErrors()) switchToNextSource();
      }, 6000);
      activeTileLayer = layer;
    };

    mountTileSource(0);
    const refreshMapSize = () => {
      window.requestAnimationFrame(() => map.invalidateSize({ pan: false }));
    };
    map.whenReady(refreshMapSize);
    map.on('load', refreshMapSize);
    window.addEventListener('resize', refreshMapSize, { passive: true });
    window.setTimeout(refreshMapSize, 250);
    window.setTimeout(refreshMapSize, 1000);

    const items = Array.isArray(data.items) ? data.items : [];
    const markers = new Map();

    items.forEach(item => {
      if (!item || typeof item !== 'object') return;
      const lat = numberInRange(item.lat, -90, 90);
      const lng = numberInRange(item.lng, -180, 180);
      if (lat === null || lng === null) return;
      const marker = window.L.marker([lat, lng]).addTo(map);
      marker.bindPopup(renderPopup(item));
      if (item.id !== undefined && item.id !== null) markers.set(String(item.id), marker);
    });

    document.querySelectorAll('.photography-card[data-photo-id]').forEach(card => {
      card.addEventListener('click', event => {
        if (event.target.closest('a')) return;
        const marker = markers.get(card.dataset.photoId);
        if (marker) {
          map.setView(marker.getLatLng(), Math.max(map.getZoom(), 8));
          marker.openPopup();
        }
      });
    });
    window.__photographyMap = map;
    window.__photographyMapTileLayer = () => activeTileLayer;
  }

  function schedulePhotographyInit() {
    const container = document.getElementById('photography-map');
    if (!container || container.dataset.initialized === 'true') return;
    if (!('IntersectionObserver' in window)) {
      initPhotography();
      return;
    }
    const observer = new window.IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        observer.disconnect();
        initPhotography();
      }
    }, { rootMargin: '240px 0px' });
    observer.observe(container);
  }

  document.addEventListener('DOMContentLoaded', schedulePhotographyInit);
  document.addEventListener('pjax:complete', schedulePhotographyInit);
})();
