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

  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function countryLabelIcon(item) {
    const local = text(item.local, '');
    const chinese = text(item.zh, '');
    if (!local && !chinese) return null;
    const label = local && chinese && local !== chinese ? `${local}（${chinese}）` : local || chinese;
    return window.L.divIcon({
      className: 'photography-map-label',
      html: `<span class="photography-country-label" aria-label="${escapeHtml(label)}">${escapeHtml(label)}</span>`,
      iconSize: null,
      iconAnchor: [0, 0],
    });
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

  function initPhotography() {
    const container = document.getElementById('photography-map');
    if (!container || container.dataset.initialized === 'true') return;
    container.dataset.initialized = 'true';
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
    if (fallback) fallback.remove();

    const map = window.L.map(container, { scrollWheelZoom: true }).setView([latitude, longitude], zoom);
    window.L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" rel="noopener noreferrer">OpenStreetMap</a> contributors',
    }).addTo(map);

    const items = Array.isArray(data.items) ? data.items : [];
    const markers = new Map();

    // OpenStreetMap's raster labels cannot be translated at runtime.  Render
    // a bundled, native-name + Chinese country layer above the tiles instead;
    // it is deterministic and does not require a geocoding request per visit.
    const labels = Array.isArray(window.PHOTOGRAPHY_COUNTRY_LABELS)
      ? window.PHOTOGRAPHY_COUNTRY_LABELS
      : [];
    labels.forEach(item => {
      if (!item || typeof item !== 'object') return;
      const lat = numberInRange(item.lat, -90, 90);
      const lng = numberInRange(item.lng, -180, 180);
      const icon = countryLabelIcon(item);
      if (lat === null || lng === null || !icon) return;
      window.L.marker([lat, lng], {
        icon,
        interactive: false,
        keyboard: false,
        zIndexOffset: -100,
      }).addTo(map);
    });

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
