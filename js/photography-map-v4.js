(function () {
  'use strict';

  const AMAP_CONFIG_URL = 'https://blogadmin.anbanyu.cn/api/amap/config';
  // AMap JSAPI's secure mode requires the proxy to be mounted at the
  // first-level `/_AMapService` path.
  const AMAP_SERVICE_HOST = 'https://blogadmin.anbanyu.cn/_AMapService';
  const AMAP_SCRIPT_URL = 'https://webapi.amap.com/maps?v=2.0';

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

  function outOfChina(lng, lat) {
    return lng < 72.004 || lng > 137.8347 || lat < 0.8293 || lat > 55.8271;
  }

  function transformLatitude(x, y) {
    let ret = -100 + 2 * x + 3 * y + 0.2 * y * y + 0.1 * x * y + 0.2 * Math.sqrt(Math.abs(x));
    ret += (20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2 / 3;
    ret += (20 * Math.sin(y * Math.PI) + 40 * Math.sin(y / 3 * Math.PI)) * 2 / 3;
    ret += (160 * Math.sin(y / 12 * Math.PI) + 320 * Math.sin(y * Math.PI / 30)) * 2 / 3;
    return ret;
  }

  function transformLongitude(x, y) {
    let ret = 300 + x + 2 * y + 0.1 * x * x + 0.1 * x * y + 0.1 * Math.sqrt(Math.abs(x));
    ret += (20 * Math.sin(6 * x * Math.PI) + 20 * Math.sin(2 * x * Math.PI)) * 2 / 3;
    ret += (20 * Math.sin(x * Math.PI) + 40 * Math.sin(x / 3 * Math.PI)) * 2 / 3;
    ret += (150 * Math.sin(x / 12 * Math.PI) + 300 * Math.sin(x / 30 * Math.PI)) * 2 / 3;
    return ret;
  }

  // Source coordinates are GPS/WGS-84. AMap's domestic map uses GCJ-02.
  function toAmapPoint(lat, lng) {
    if (outOfChina(lng, lat)) return [lng, lat];
    const axis = 6378245;
    const eccentricity = 0.006693421622965943;
    const dLat = transformLatitude(lng - 105, lat - 35);
    const dLng = transformLongitude(lng - 105, lat - 35);
    const radLat = lat / 180 * Math.PI;
    let magic = Math.sin(radLat);
    magic = 1 - eccentricity * magic * magic;
    const sqrtMagic = Math.sqrt(magic);
    const adjustedLat = lat + (dLat * 180) / ((axis * (1 - eccentricity)) / (magic * sqrtMagic) * Math.PI);
    const adjustedLng = lng + (dLng * 180) / (axis / sqrtMagic * Math.cos(radLat) * Math.PI);
    return [adjustedLng, adjustedLat];
  }

  function mapSettings(data) {
    const settings = data.map && typeof data.map === 'object' ? data.map : {};
    const center = Array.isArray(settings.center) ? settings.center : [];
    return {
      latitude: numberInRange(center[0], -90, 90) ?? 35.8617,
      longitude: numberInRange(center[1], -180, 180) ?? 104.1954,
      zoom: Number.isFinite(Number(settings.zoom)) ? Math.min(18, Math.max(1, Number(settings.zoom))) : 4,
    };
  }

  function mapItems(data) {
    return (Array.isArray(data.items) ? data.items : []).filter(item => {
      if (!item || typeof item !== 'object') return false;
      return numberInRange(item.lat, -90, 90) !== null && numberInRange(item.lng, -180, 180) !== null;
    });
  }

  function attachCardActions(openMarker) {
    document.querySelectorAll('.photography-card[data-photo-id]').forEach(card => {
      card.addEventListener('click', event => {
        if (event.target.closest('a')) return;
        const marker = openMarker(card.dataset.photoId);
        if (marker) marker();
      });
    });
  }

  function guardMapWheel(container) {
    if (container.dataset.wheelGuard === 'true') return;
    // Keep wheel zoom inside the map.  AMap and Leaflet handle the event
    // themselves; preventing the browser default here stops the document
    // from scrolling at the same time.
    container.addEventListener('wheel', event => event.preventDefault(), {
      capture: true,
      passive: false,
    });
    container.style.overscrollBehavior = 'contain';
    container.dataset.wheelGuard = 'true';
  }

  function withTimeout(promise, timeout = 7000) {
    return Promise.race([
      promise,
      new Promise((_, reject) => window.setTimeout(() => reject(new Error('timeout')), timeout)),
    ]);
  }

  async function readAmapKey() {
    const response = await withTimeout(fetch(AMAP_CONFIG_URL, { credentials: 'omit', cache: 'no-store' }), 5000);
    if (!response.ok) throw new Error(`amap_config_${response.status}`);
    const data = await response.json();
    if (!data || data.ok !== true || typeof data.key !== 'string' || !data.key.trim()) throw new Error('amap_key_missing');
    return data.key.trim();
  }

  function loadAmapScript(key) {
    if (window.AMap && typeof window.AMap.Map === 'function') return Promise.resolve(window.AMap);
    window._AMapSecurityConfig = { serviceHost: AMAP_SERVICE_HOST };
    return new Promise((resolve, reject) => {
      const callbackName = `__photographyAmapReady_${Date.now()}_${Math.random().toString(16).slice(2)}`;
      const script = document.createElement('script');
      let settled = false;
      const finish = (error) => {
        if (settled) return;
        settled = true;
        window.clearTimeout(timer);
        delete window[callbackName];
        script.remove();
        if (error) reject(error); else resolve(window.AMap);
      };
      window[callbackName] = () => finish(null);
      script.async = true;
      script.src = `${AMAP_SCRIPT_URL}&key=${encodeURIComponent(key)}&callback=${encodeURIComponent(callbackName)}`;
      script.onerror = () => finish(new Error('amap_script_failed'));
      document.head.appendChild(script);
      const timer = window.setTimeout(() => finish(new Error('amap_script_timeout')), 9000);
    });
  }

  function addAmapMarkers(amap, map, data) {
    const markers = new Map();
    const windows = new Map();
    mapItems(data).forEach(item => {
      const point = toAmapPoint(Number(item.lat), Number(item.lng));
      const marker = new amap.Marker({ position: point, title: text(item.title, '未命名作品') });
      marker.setMap(map);
      const infoWindow = new amap.InfoWindow({ content: renderPopup(item), offset: new amap.Pixel(0, -28), closeWhenClickMap: true });
      marker.on('click', () => infoWindow.open(map, marker.getPosition()));
      if (item.id !== undefined && item.id !== null) {
        markers.set(String(item.id), marker);
        windows.set(String(item.id), infoWindow);
      }
    });
    attachCardActions(photoId => {
      const marker = markers.get(photoId);
      if (!marker) return null;
      return () => {
        const point = marker.getPosition();
        map.setZoomAndCenter(Math.max(map.getZoom(), 8), [point.lng, point.lat]);
        windows.get(photoId)?.open(map, point);
      };
    });
    return markers;
  }

  async function initAmap(container, data) {
    const key = await readAmapKey();
    const amap = await loadAmapScript(key);
    const settings = mapSettings(data);
    const center = toAmapPoint(settings.latitude, settings.longitude);
    const map = new amap.Map(container, {
      center,
      zoom: settings.zoom,
      resizeEnable: true,
      scrollWheel: true,
      zooms: [1, 20],
      viewMode: '2D',
    });
    if (typeof amap.plugin === 'function' && typeof amap.ToolBar === 'function') {
      amap.plugin(['AMap.ToolBar'], () => map.addControl(new amap.ToolBar({ position: 'LT' })));
    }
    addAmapMarkers(amap, map, data);
    const attribution = document.querySelector('.photography-map-attribution');
    if (attribution) attribution.textContent = '高德地图';
    container.dataset.initialized = 'true';
    container.dataset.mapProvider = 'amap';
    window.requestAnimationFrame(() => map.resize());
    window.setTimeout(() => map.resize(), 250);
    window.__photographyMap = map;
    return map;
  }

  function initLeaflet(container, data) {
    if (!window.L || typeof window.L.map !== 'function') {
      const fallback = container.querySelector('.photography-map-fallback');
      if (fallback) fallback.textContent = '地图暂时无法加载，作品列表仍可正常浏览。';
      return null;
    }
    container.replaceChildren();
    const settings = mapSettings(data);
    const map = window.L.map(container, { scrollWheelZoom: true }).setView([settings.latitude, settings.longitude], settings.zoom);
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
    const markers = new Map();
    mapItems(data).forEach(item => {
      const marker = window.L.marker([Number(item.lat), Number(item.lng)]).addTo(map);
      marker.bindPopup(renderPopup(item));
      if (item.id !== undefined && item.id !== null) markers.set(String(item.id), marker);
    });
    attachCardActions(photoId => {
      const marker = markers.get(photoId);
      if (!marker) return null;
      return () => {
        map.setView(marker.getLatLng(), Math.max(map.getZoom(), 8));
        marker.openPopup();
      };
    });
    container.dataset.initialized = 'true';
    container.dataset.mapProvider = 'osm';
    window.requestAnimationFrame(() => map.invalidateSize({ pan: false }));
    window.setTimeout(() => map.invalidateSize({ pan: false }), 250);
    window.__photographyMap = map;
    return map;
  }

  async function initPhotography() {
    const container = document.getElementById('photography-map');
    if (!container || container.dataset.initialized === 'true') return;
    guardMapWheel(container);
    const data = readData() || {};
    const fallback = container.querySelector('.photography-map-fallback');
    try {
      await initAmap(container, data);
      if (fallback) fallback.remove();
      return;
    } catch (error) {
      console.warn('[photography] AMap unavailable, using OSM fallback', error);
    }
    initLeaflet(container, data);
  }

  document.addEventListener('DOMContentLoaded', initPhotography);
  document.addEventListener('pjax:complete', initPhotography);
})();



