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
        subdomains: 'abc',
      },
    },
    {
      url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
      options: {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" rel="noopener noreferrer">OpenStreetMap</a> contributors',
        maxZoom: 19,
      },
    },
    {
      url: 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png',
      options: {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" rel="noopener noreferrer">OpenStreetMap</a> contributors',
        maxZoom: 20,
        subdomains: 'abc',
      },
    },
    {
      url: 'https://tile.openstreetmap.de/{z}/{x}/{y}.png',
      options: {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" rel="noopener noreferrer">OpenStreetMap</a> contributors',
        maxZoom: 18,
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

    const map = window.L.map(container, { scrollWheelZoom: true }).setView([latitude, longitude], zoom);
    let activeTileLayer = null;
    let tileSourceIndex = -1;
    let tileSourceTimer = null;

    const mountTileSource = index => {
      const source = tileSources[index];
      if (!source) return;
      if (tileSourceTimer) window.clearTimeout(tileSourceTimer);
      if (activeTileLayer) map.removeLayer(activeTileLayer);
      tileSourceIndex = index;
      let loadedTile = false;
      const layer = window.L.tileLayer(source.url, source.options);
      layer.on('tileload', () => {
        loadedTile = true;
        if (tileSourceTimer) {
          window.clearTimeout(tileSourceTimer);
          tileSourceTimer = null;
        }
      });
      layer.on('tileerror', () => {
        if (loadedTile || tileSourceIndex !== index) return;
        if (tileSourceTimer) window.clearTimeout(tileSourceTimer);
        tileSourceTimer = window.setTimeout(() => {
          tileSourceTimer = null;
          mountTileSource(index + 1);
        }, 1800);
      });
      activeTileLayer = layer.addTo(map);
      tileSourceTimer = window.setTimeout(() => {
        tileSourceTimer = null;
        if (!loadedTile && tileSourceIndex === index) mountTileSource(index + 1);
      }, 4500);
    };

    mountTileSource(0);
    window.requestAnimationFrame(() => map.invalidateSize({ pan: false }));
    window.setTimeout(() => map.invalidateSize({ pan: false }), 250);

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
  }

  document.addEventListener('DOMContentLoaded', initPhotography);
  document.addEventListener('pjax:complete', initPhotography);
})();
