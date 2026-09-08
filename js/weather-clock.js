(function () {
  'use strict';
  var widget = document.querySelector('.weather-clock');
  if (!widget) return;
  var time = widget.querySelector('[data-clock-time]');
  var date = widget.querySelector('[data-clock-date]');
  var summary = widget.querySelector('[data-weather-summary]');
  var details = widget.querySelector('[data-weather-details]');
  var refresh = widget.querySelector('[data-weather-refresh]');
  var latitude = Number(widget.dataset.latitude);
  var longitude = Number(widget.dataset.longitude);
  var cacheKey = 'anbanyu.weather.v1.' + latitude + '.' + longitude;
  var CACHE_TTL = 20 * 60 * 1000;
  var request;
  var timer;

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
  async function loadWeather(force) {
    if (request) return;
    if (!force) {
      try {
        var cached = JSON.parse(sessionStorage.getItem(cacheKey));
        var age = cached && Date.now() - cached.at;
        if (cached && age >= 0 && age < CACHE_TTL && valid(cached.data)) {
          render(cached.data);
          return;
        }
      } catch (_) {}
    }
    refresh.disabled = true;
    request = new AbortController();
    var timeout = setTimeout(function () { request && request.abort(); }, 8000);
    try {
      if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) throw new Error('Invalid location');
      var params = new URLSearchParams({
        latitude: String(latitude), longitude: String(longitude),
        current: 'temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m', timezone: 'auto'
      });
      var response = await fetch('https://api.open-meteo.com/v1/forecast?' + params, { signal: request.signal });
      if (!response.ok) throw new Error('Weather unavailable');
      var payload = await response.json();
      if (!valid(payload.current)) throw new Error('Invalid weather response');
      render(payload.current);
      try { sessionStorage.setItem(cacheKey, JSON.stringify({ at: Date.now(), data: payload.current })); } catch (_) {}
    } catch (_) {
      summary.textContent = '天气暂不可用';
      details.textContent = '';
    } finally {
      clearTimeout(timeout);
      request = null;
      refresh.disabled = false;
    }
  }
  refresh.addEventListener('click', function () { loadWeather(true); });
  document.addEventListener('visibilitychange', syncClock);
  window.addEventListener('pagehide', function () {
    clearInterval(timer);
    if (request) request.abort();
  });
  window.addEventListener('pageshow', syncClock);
  syncClock();
  loadWeather(false);
})();
