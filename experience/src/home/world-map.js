import { Map, Marker, NavigationControl, setWorkerUrl } from 'maplibre-gl';
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url';
import 'maplibre-gl/dist/maplibre-gl.css';

setWorkerUrl(workerUrl);
const collection = features => ({ type: 'FeatureCollection', features });
const colors = ['#df744f', '#487b77', '#8d76a5', '#c1a047', '#508da6'];

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

export function createWorldMap(host, { onSelect, onStatus } = {}) {
  let ready = false, markers = [], pendingPlaces = [], pendingRoutes = [], pendingView = null;
  const map = new Map({ container: host, style: 'https://tiles.openfreemap.org/styles/liberty',
    center: [35, 24], zoom: 1.5, minZoom: 1, maxZoom: 19, pitch: 0,
    attributionControl: { compact: true }, canvasContextAttributes: { antialias: true },
    cooperativeGestures: true });
  map.addControl(new NavigationControl({ visualizePitch: true }), 'top-right');
  map.on('error', event => { host.dataset.mapStatus = 'error'; onStatus?.('error', event.error); });
  map.on('load', () => {
    ready = true; host.dataset.mapStatus = 'ready'; onStatus?.('ready');
    map.addSource('journeys', { type: 'geojson', data: collection([]) });
    map.addLayer({ id: 'journey-halo', type: 'line', source: 'journeys', paint: {
      'line-color': '#fffaf0', 'line-width': 8, 'line-opacity': 0.85,
    }});
    map.addLayer({ id: 'journey-lines', type: 'line', source: 'journeys', paint: {
      'line-color': ['get', 'color'], 'line-width': 3, 'line-dasharray': [2, 1.5],
    }});
    render();
    if (pendingView) move(pendingView);
  });
  function render() {
    if (!ready) return;
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
    const features = pendingRoutes.filter(route => route.stops.length > 1).map((route, index) => ({
      type: 'Feature', properties: { color: colors[index % colors.length] },
      geometry: { type: 'LineString', coordinates: itineraryCoordinates(route.stops) },
    }));
    map.getSource('journeys').setData(collection(features));
  }
  function move(view) {
    pendingView = view;
    if (!ready) return;
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (view.kind === 'local') {
      const country = view.place.kind === 'country';
      map.easeTo({ center: [view.place.longitude, view.place.latitude], zoom: country ? 4 : 16.3,
        pitch: country ? 0 : 56, bearing: country ? 0 : -18, duration: reduced ? 0 : 900 });
    } else if (view.places?.length) {
      const points = itineraryCoordinates(view.places);
      const lngs = points.map(p => p[0]), lats = points.map(p => p[1]);
      map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]],
        { padding: 90, maxZoom: 7, pitch: 0, bearing: 0, duration: reduced ? 0 : 900 });
    } else map.easeTo({ center: [35, 24], zoom: 1.5, pitch: 0, bearing: 0, duration: reduced ? 0 : 900 });
  }
  return {
    setPlaces(places, routes = []) { pendingPlaces = places; pendingRoutes = routes; render(); },
    local(place) { move({ kind: 'local', place }); },
    world(places = []) { move({ kind: 'world', places }); },
    resize() { map.resize(); },
    snapshot() { return { ready, center: map.getCenter().toArray(), zoom: map.getZoom(), pitch: map.getPitch(),
      places: pendingPlaces.map(p => p.id), routes: pendingRoutes.map(r => r.stops.map(p => p.id)),
      buildingLayer: map.getLayer('building-3d')?.type || null,
      renderedBuildings: ready && map.getLayer('building-3d') ? map.queryRenderedFeatures({ layers: ['building-3d'] }).length : 0 }; },
    destroy() { markers.forEach(marker => marker.remove()); map.remove(); },
  };
}
