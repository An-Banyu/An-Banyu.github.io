(function () {
  'use strict';
  var widget = document.querySelector('.weather-clock');
  if (!widget) return;
  var time = widget.querySelector('[data-clock-time]');
  var date = widget.querySelector('[data-clock-date]');
  var summary = widget.querySelector('[data-weather-summary]');
  var details = widget.querySelector('[data-weather-details]');
  var refresh = widget.querySelector('[data-weather-refresh]');
  var city = widget.querySelector('[data-weather-city]');
  var locationNote = widget.querySelector('[data-location-note]');
  var fallback = { latitude: Number(widget.dataset.latitude), longitude: Number(widget.dataset.longitude), city: widget.dataset.city };
  var LOCATION_KEY = 'anbanyu.ip-city.v1';
  var CACHE_TTL = 20 * 60 * 1000;
  var request;
  var timer;
  var loading = false;
  var active = true;

  function updateTime() {
    var now = new Date();
    time.textContent = now.toLocaleTimeString('en-GB', { hour12: false });
    time.dateTime = now.toISOString();
    date.textContent = now.toLocaleDateString('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' });
  }
  function syncClock() {
    clearInterval(timer);
    updateTime();
    if (!document.hidden) timer = setInterval(updateTime, 1000);
  }
  function description(code) {
    if (code === 0) return '晴';
    if (code <= 2) return '多云';
    if (code === 3) return '阴';
    if (code === 45 || code === 48) return '雾';
    if (code >= 51 && code <= 57) return '毛毛雨';
    if (code >= 61 && code <= 67) return '雨';
    if (code >= 71 && code <= 77) return '雪';
    if (code >= 80 && code <= 82) return '阵雨';
    if (code === 85 || code === 86) return '阵雪';
    if (code >= 95) return '雷雨';
    return '天气';
  }
  function valid(data) {
    return data && Number.isFinite(data.temperature_2m) && Number.isFinite(data.weather_code)
      && Number.isFinite(data.relative_humidity_2m) && Number.isFinite(data.wind_speed_10m);
  }
  function render(data) {
    summary.textContent = description(data.weather_code) + ' ' + Math.round(data.temperature_2m) + ' °C';
    details.textContent = '湿度 ' + Math.round(data.relative_humidity_2m) + '% · 风速 ' + data.wind_speed_10m + ' km/h';
  }
  function readCache(key) {
    try {
      var cached = JSON.parse(sessionStorage.getItem(key));
      var age = cached && Date.now() - cached.at;
      return cached && age >= 0 && age < CACHE_TTL ? cached.data : null;
    } catch (_) { return null; }
  }
  function writeCache(key, data) {
    try { sessionStorage.setItem(key, JSON.stringify({ at: Date.now(), data: data })); } catch (_) {}
  }
  function validLocation(data) {
    return data && typeof data.city === 'string' && data.city.trim().length > 0
      && Number.isFinite(data.latitude) && Math.abs(data.latitude) <= 90
      && Number.isFinite(data.longitude) && Math.abs(data.longitude) <= 180;
  }
  async function fetchJSON(url, timeoutMs) {
    if (!active) throw new Error('Page inactive');
    var controller = new AbortController();
    request = controller;
    var timeout = setTimeout(function () { controller.abort(); }, timeoutMs);
    try {
      var response = await fetch(url, {
        signal: controller.signal, credentials: 'omit', referrerPolicy: 'no-referrer', cache: 'no-store'
      });
      if (!response.ok) throw new Error('Service unavailable');
      return await response.json();
    } finally {
      clearTimeout(timeout);
      if (request === controller) request = null;
    }
  }
  async function locate(force) {
    var cached = !force && readCache(LOCATION_KEY);
    if (validLocation(cached)) return cached;
    var data = await fetchJSON('https://get.geojs.io/v1/ip/geo.json', 4000);
    if (!data || data.latitude == null || data.longitude == null
      || String(data.latitude).trim() === '' || String(data.longitude).trim() === '') throw new Error('Missing coordinates');
    // Keep only city-level coordinates and the label, never the returned IP or ASN.
    var result = {
      latitude: Math.round(Number(data.latitude) * 100) / 100,
      longitude: Math.round(Number(data.longitude) * 100) / 100,
      city: typeof data.city === 'string' ? data.city.trim().slice(0, 100) : ''
    };
    if (!validLocation(result)) throw new Error('City unavailable');
    writeCache(LOCATION_KEY, result);
    return result;
  }
  async function loadWeather(force) {
    if (loading || !active) return;
    loading = true;
    refresh.disabled = true;
    summary.textContent = '天气加载中';
    details.textContent = '';
    try {
      var location;
      var isDefault = false;
      try { location = await locate(force); }
      catch (_) { location = fallback; isDefault = true; }
      if (!active) return;
      city.textContent = location.city;
      locationNote.textContent = isDefault ? '默认城市' : 'IP 估算城市';
      if (!validLocation(location)) throw new Error('Invalid location');
      var cacheKey = 'anbanyu.weather.v1.' + location.latitude + '.' + location.longitude;
      var cached = !force && readCache(cacheKey);
      if (valid(cached)) { render(cached); return; }
      var params = new URLSearchParams({
        latitude: String(location.latitude), longitude: String(location.longitude),
        current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m', timezone: 'auto'
      });
      var payload = await fetchJSON('https://api.open-meteo.com/v1/forecast?' + params, 8000);
      if (!active) return;
      if (!valid(payload.current)) throw new Error('Invalid weather response');
      render(payload.current);
      writeCache(cacheKey, payload.current);
    } catch (_) {
      summary.textContent = '天气暂不可用';
      details.textContent = '';
    } finally {
      loading = false;
      refresh.disabled = false;
    }
  }
  refresh.addEventListener('click', function () { loadWeather(true); });
  document.addEventListener('visibilitychange', syncClock);
  window.addEventListener('pagehide', function () {
    active = false;
    clearInterval(timer);
    if (request) request.abort();
  });
  window.addEventListener('pageshow', function (event) {
    active = true;
    syncClock();
    if (event.persisted) loadWeather(false);
  });
  syncClock();
  loadWeather(false);
})();
