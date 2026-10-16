export const MAX_STOPS = 1000;
export const MAX_MAPS_URL_LENGTH = 2048;
export const MAX_STOPS_PER_LINK = 5;

function validatedStops(input) {
  if (!Array.isArray(input)) throw new TypeError('Expected an array of selected places.');
  if (input.length > MAX_STOPS) throw new RangeError(`At most ${MAX_STOPS} places are supported.`);
  return Array.from(input, (stop, index) => {
    if (!stop || typeof stop !== 'object' || Array.isArray(stop)) throw new TypeError(`Invalid place at index ${index}.`);
    const { latitude, longitude, title = '' } = stop;
    if (typeof latitude !== 'number' || typeof longitude !== 'number'
      || !Number.isFinite(latitude) || !Number.isFinite(longitude)
      || Math.abs(latitude) > 90 || Math.abs(longitude) > 180) {
      throw new RangeError(`Invalid coordinates at index ${index}.`);
    }
    if (typeof title !== 'string') throw new TypeError(`Invalid title at index ${index}.`);
    return { ...(typeof stop.id === 'string' ? { id: stop.id } : {}), title, latitude, longitude };
  });
}

const coordinates = stop => `${stop.latitude},${stop.longitude}`;

function mapsURL(stops) {
  const single = stops.length === 1;
  const url = new URL(single ? 'https://www.google.com/maps/search/' : 'https://www.google.com/maps/dir/');
  url.searchParams.set('api', '1');
  if (single) url.searchParams.set('query', coordinates(stops[0]));
  else {
    url.searchParams.set('origin', coordinates(stops[0]));
    url.searchParams.set('destination', coordinates(stops.at(-1)));
    url.searchParams.set('travelmode', 'walking');
    if (stops.length > 2) url.searchParams.set('waypoints', stops.slice(1, -1).map(coordinates).join('|'));
  }
  if (url.href.length > MAX_MAPS_URL_LENGTH) throw new RangeError('Google Maps URL exceeds 2048 characters.');
  return url.href;
}

function journeyFor(stops) {
  const parts = [], legs = [];
  if (stops.length === 1) parts.push({ startIndex: 0, endIndex: 0, url: mapsURL(stops), stops: stops.slice() });
  for (let startIndex = 0; startIndex < stops.length - 1;) {
    const endIndex = Math.min(startIndex + MAX_STOPS_PER_LINK - 1, stops.length - 1);
    const group = stops.slice(startIndex, endIndex + 1);
    parts.push({ startIndex, endIndex, url: mapsURL(group), stops: group });
    // 相邻分组共用一个端点，保留原有地点顺序和全部路段。
    startIndex = endIndex;
  }
  for (let index = 0; index < stops.length - 1; index++) {
    legs.push({ startIndex: index, endIndex: index + 1, url: mapsURL(stops.slice(index, index + 2)) });
  }
  return { parts, legs };
}

export function buildMapsJourney(input) {
  return journeyFor(validatedStops(input));
}

export function mapsShareText(input, locale = 'en') {
  const stops = validatedStops(input);
  if (!stops.length) return '';
  const zh = locale === 'zh', { parts } = journeyFor(stops);
  const heading = stops.length === 1
    ? (zh ? '选定地点 · Google Maps' : 'Selected place · Google Maps')
    : (zh ? '选定地点 · Google Maps 步行路线' : 'Selected places · Google Maps walking directions');
  const placeLines = stops.map((stop, index) => `${index + 1}. ${stop.title || coordinates(stop)}`);
  const linkLines = parts.map(part => {
    const range = `${part.startIndex + 1}–${part.endIndex + 1}`;
    const label = stops.length === 1 ? (zh ? '地点' : 'Place') : (zh ? `地点 ${range}` : `Places ${range}`);
    return `${label}: ${part.url}`;
  });
  return [heading, ...placeLines, '', ...linkLines].join('\n');
}

function csvCell(value) {
  let text = String(value);
  // 引号保留逗号和换行；前置单引号阻止表格软件执行地点名称中的公式。
  if (/^[\s\uFEFF]*[=+@-]/u.test(text) || /^[\t\r\n]/u.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export function journeyCSV(input) {
  const stops = validatedStops(input);
  return [
    'Name,Latitude,Longitude',
    ...stops.map(stop => [csvCell(stop.title || coordinates(stop)), stop.latitude, stop.longitude].join(',')),
  ].join('\r\n') + '\r\n';
}
