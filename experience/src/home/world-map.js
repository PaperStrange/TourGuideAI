import { Map, Marker, NavigationControl, setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';

setWorkerUrl(workerUrl);
const collection = features => ({ type: 'FeatureCollection', features });
const colors = ['#df744f', '#487b77', '#8d76a5', '#c1a047', '#508da6'];
const styleURL = 'https://tiles.openfreemap.org/styles/liberty';
const uiLocales = {
  en: {
    'Map.Title': 'Map', 'Marker.Title': 'Map marker',
    'NavigationControl.ZoomIn': 'Zoom in', 'NavigationControl.ZoomOut': 'Zoom out',
    'NavigationControl.ResetBearing': 'Drag to rotate map, click to reset north',
    'AttributionControl.ToggleAttribution': 'Toggle attribution', 'AttributionControl.MapFeedback': 'Map feedback',
    'CooperativeGesturesHandler.WindowsHelpText': 'Use Ctrl + scroll to zoom the map',
    'CooperativeGesturesHandler.MacHelpText': 'Use ⌘ + scroll to zoom the map',
    'CooperativeGesturesHandler.MobileHelpText': 'Use two fingers to move the map',
  },
  zh: {
    'Map.Title': '地图', 'Marker.Title': '地图地点',
    'NavigationControl.ZoomIn': '放大地图', 'NavigationControl.ZoomOut': '缩小地图',
    'NavigationControl.ResetBearing': '拖动以旋转地图，点击以恢复朝北',
    'AttributionControl.ToggleAttribution': '显示或隐藏来源信息', 'AttributionControl.MapFeedback': '地图反馈',
    'CooperativeGesturesHandler.WindowsHelpText': '按住 Ctrl 并滚动以缩放地图',
    'CooperativeGesturesHandler.MacHelpText': '按住 ⌘ 并滚动以缩放地图',
    'CooperativeGesturesHandler.MobileHelpText': '使用双指移动地图',
  },
};

// 跨越日期变更线时保留最短经度跨度；线条表达行程顺序，不表示交通路线。
export function itineraryCoordinates(places) {
  const result = [];
  for (const place of places) {
    let longitude = place.longitude;
    const previous = result.at(-1)?.[0];
    if (previous !== undefined) {
      while (longitude - previous > 180) longitude -= 360;
      while (longitude - previous < -180) longitude += 360;
    }
    result.push([longitude, place.latitude]);
  }
  return result;
}

export function createWorldMap(host, { onSelect, onStatus, locale = 'en' } = {}) {
  let ready = false, styleReady = false, failed = false, destroyed = false, markers = [], pendingPlaces = [], pendingRoutes = [], pendingView = null;
  let selectedLocale = locale === 'zh' ? 'zh' : 'en', viewSignature = null, cameraTransitions = 0, renderedFrames = 0;
  let viewStarted = performance.now(), readyMs = null, markerSignature = null, featureSignature = null;
  const map = new Map({ container: host, style: styleURL, locale: uiLocales[selectedLocale],
    center: [35, 24], zoom: 1.5, minZoom: 1, maxZoom: 19, pitch: 0,
    attributionControl: { compact: true }, canvasContextAttributes: { antialias: true },
    cooperativeGestures: true });
  map.addControl(new NavigationControl({ visualizePitch: true }), 'top-right');
  function localizeControls() {
    if (destroyed) return;
    const strings = uiLocales[selectedLocale];
    for (const [selector, key] of [
      ['.maplibregl-ctrl-zoom-in', 'NavigationControl.ZoomIn'],
      ['.maplibregl-ctrl-zoom-out', 'NavigationControl.ZoomOut'],
      ['.maplibregl-ctrl-compass', 'NavigationControl.ResetBearing'],
      ['.maplibregl-ctrl-attrib-button', 'AttributionControl.ToggleAttribution'],
    ]) {
      for (const element of host.querySelectorAll(selector)) {
        element.title = strings[key]; element.setAttribute('aria-label', strings[key]);
      }
    }
    map.getCanvas().setAttribute('aria-label', strings['Map.Title']);
    for (const [selector, key] of [
      ['.maplibregl-desktop-message', navigator.userAgent.includes('Mac') ? 'CooperativeGesturesHandler.MacHelpText' : 'CooperativeGesturesHandler.WindowsHelpText'],
      ['.maplibregl-mobile-message', 'CooperativeGesturesHandler.MobileHelpText'],
      ['.maplibregl-ctrl-attrib a.maplibregl-ctrl-attrib-feedback', 'AttributionControl.MapFeedback'],
    ]) for (const element of host.querySelectorAll(selector)) {
      if (element.textContent !== strings[key]) element.textContent = strings[key];
    }
  }
  // MapLibre 6.14 的 locale 仅在构造时读取；保留地图实例并更新其现有控件文本。
  const controlObserver = new MutationObserver(localizeControls);
  controlObserver.observe(host, { childList: true, subtree: true });
  localizeControls();
  map.on('error', event => {
    failed = true; ready = false; readyMs = null;
    host.dataset.mapStatus = 'error'; onStatus?.('error', event.error);
  });
  map.on('render', () => { renderedFrames++; });
  map.on('style.load', () => {
    styleReady = true; featureSignature = null;
    map.addSource('journeys', { type: 'geojson', data: collection([]) });
    map.addLayer({ id: 'journey-halo', type: 'line', source: 'journeys', paint: {
      'line-color': '#fffaf0', 'line-width': 8, 'line-opacity': 0.85,
    }});
    map.addLayer({ id: 'journey-lines', type: 'line', source: 'journeys', paint: {
      'line-color': ['get', 'color'], 'line-width': 3, 'line-dasharray': [2, 1.5],
    }});
    render();
  });
  map.on('idle', () => {
    if (ready || !styleReady || failed || destroyed) return;
    ready = true; readyMs = performance.now() - viewStarted;
    host.dataset.mapStatus = 'ready'; onStatus?.('ready');
  });
  function render() {
    if (!styleReady) return;
    const nextMarkers = JSON.stringify(pendingPlaces);
    if (nextMarkers !== markerSignature) {
      markerSignature = nextMarkers;
      markers.forEach(marker => marker.remove()); markers = [];
      for (const [index, place] of pendingPlaces.entries()) {
        const element = document.createElement('button');
        element.className = 'destination-pin'; element.type = 'button';
        element.style.setProperty('--pin-color', colors[index % colors.length]);
        element.setAttribute('aria-label', place.title || place.name);
        const number = document.createElement('b'); number.textContent = String(index + 1);
        const label = document.createElement('span'); label.textContent = place.title || place.name;
        element.append(number, label);
        element.addEventListener('click', () => onSelect?.(place));
        markers.push(new Marker({ element }).setLngLat([place.longitude, place.latitude]).addTo(map));
      }
    }
    const features = pendingRoutes.filter(route => route.stops.length > 1).map((route, index) => ({
      type: 'Feature', properties: { color: colors[index % colors.length] },
      geometry: { type: 'LineString', coordinates: itineraryCoordinates(route.stops) },
    }));
    const nextFeatures = JSON.stringify(features);
    if (nextFeatures !== featureSignature) {
      featureSignature = nextFeatures;
      map.getSource('journeys').setData(collection(features));
    }
  }
  function move(view) {
    pendingView = view;
    const signature = JSON.stringify(view.kind === 'local'
      ? [view.kind, view.place.kind, view.place.longitude, view.place.latitude]
      : [view.kind, ...view.places.map(place => [place.longitude, place.latitude])]);
    if (signature === viewSignature) return;
    viewSignature = signature; cameraTransitions++;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const duration = reduced || !ready ? 0 : 900;
    ready = false; readyMs = null; viewStarted = performance.now();
    host.dataset.mapStatus = failed ? 'error' : 'loading'; onStatus?.(failed ? 'error' : 'loading');
    if (view.kind === 'local') {
      const country = view.place.kind === 'country';
      map.easeTo({ center: [view.place.longitude, view.place.latitude], zoom: country ? 4 : 16.3,
        pitch: country ? 0 : 56, bearing: country ? 0 : -18, duration });
    } else if (view.places?.length) {
      const points = itineraryCoordinates(view.places);
      const lngs = points.map(p => p[0]), lats = points.map(p => p[1]);
      map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        { padding: 90, maxZoom: 7, pitch: 0, bearing: 0, duration });
    } else map.easeTo({ center: [35, 24], zoom: 1.5, pitch: 0, bearing: 0, duration });
  }
  return {
    setPlaces(places, routes = []) { pendingPlaces = places; pendingRoutes = routes; render(); },
    local(place) { move({ kind: 'local', place }); },
    world(places = []) { move({ kind: 'world', places }); },
    resize() { map.resize(); },
    setLocale(value) { selectedLocale = value === 'zh' ? 'zh' : 'en'; localizeControls(); },
    retry() {
      if (destroyed) return;
      ready = false; styleReady = false; failed = false; readyMs = null; viewStarted = performance.now(); map.stop();
      host.dataset.mapStatus = 'loading'; onStatus?.('loading');
      map.setStyle(styleURL, { diff: false });
    },
    snapshot() { return { ready, failed, center: map.getCenter().toArray(), zoom: map.getZoom(), pitch: map.getPitch(),
      locale: selectedLocale, readyMs, renderedFrames, cameraTransitions, requestedView: pendingView?.kind ?? null,
      places: pendingPlaces.map(p => p.id), routes: pendingRoutes.map(r => r.stops.map(p => p.id)),
      buildingLayer: map.getLayer('building-3d')?.type || null,
      renderedBuildings: ready && map.getLayer('building-3d') ? map.queryRenderedFeatures({ layers: ['building-3d'] }).length : 0 }; },
    destroy() { destroyed = true; controlObserver.disconnect(); markers.forEach(marker => marker.remove()); map.remove(); },
  };
}
