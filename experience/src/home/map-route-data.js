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

export function journeyGeometry(route) {
  if (route.geometry === undefined) {
    return { type: 'LineString', coordinates: itineraryCoordinates(route.stops) };
  }
  const geometry = route.geometry;
  if (geometry?.type !== 'LineString' || !Array.isArray(geometry.coordinates) || geometry.coordinates.length < 2
    || geometry.coordinates.some(point => !Array.isArray(point) || point.length !== 2
      || !point.every(Number.isFinite) || Math.abs(point[0]) > 180 || Math.abs(point[1]) > 90)) {
    throw new TypeError('A walking route requires valid WGS84 LineString geometry.');
  }
  return { type: 'LineString', coordinates: geometry.coordinates.map(point => [...point]) };
}

export function journeyFeatures(routes, colors) {
  return routes.filter(route => route.geometry !== undefined || route.stops.length > 1).map((route, index) => ({
    type: 'Feature', properties: { color: colors[index % colors.length],
      path: route.geometry === undefined ? 'visiting-order' : 'walking-route' },
    geometry: journeyGeometry(route),
  }));
}
