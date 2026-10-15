const local = (en, zh) => Object.freeze({ en, zh });

// 坐标采用 2026-09-29 OSM 快照；原始证据保存在 city-packs/kyoto-shijo/evidence/。
export const PLACES = Object.freeze([
  Object.freeze({
    id: 'crossing', latitude: 35.0037600, longitude: 135.7599457,
    title: local('Shijō–Karasuma crossing', '四条乌丸路口'),
    detail: local('The north end of the crossing, beside Kyoto Mitsui Building.', '横道北端，位于京都三井大厦旁。'),
    image: 'perspectives/arrive.jpg',
    source: 'https://www.openstreetmap.org/node/4600871814',
    anchor: local('Mapped north sidewalk node 4600871814 on crossing way 465069430; OSM snapshot 2026-09-29.', '地图中的北侧人行道节点 4600871814，属于横道 465069430；OSM 快照日期为 2026-09-29。'),
  }),
  Object.freeze({
    id: 'mitsui', latitude: 35.0037814, longitude: 135.76012895,
    title: local('Kyoto Mitsui Building', '京都三井大厦'),
    detail: local('Pale walls, separate dark windows and a curved corner on the north side of Shijō.', '四条通北侧的浅色墙面、独立深色窗格与弧形转角。'),
    image: 'perspectives/mitsui-rhythm.jpg',
    source: 'https://www.openstreetmap.org/way/205732558',
    anchor: local('Representative frontage midpoint derived from OSM nodes 2157078408 and 2157078409. The actual entrance remains unverified.', '根据 OSM 节点 2157078408 与 2157078409 计算的临街立面中点，用作建筑位置参考；实际入口仍待核实。'),
  }),
  Object.freeze({
    id: 'mufg', latitude: 35.0035109, longitude: 135.7599181,
    title: local('MUFG · Kyoto Branch', '三菱 UFJ · 京都支店'),
    detail: local('The mapped bank inside Kyoto Daiya Building, on the south side of Shijō.', '地图记录的银行位于四条通南侧的京都钻石大厦内。'),
    image: 'perspectives/daiya-rhythm.jpg',
    source: 'https://www.openstreetmap.org/node/14196400744',
    anchor: local('Mapped bank POI 14196400744 inside building 205732536; OSM snapshot 2026-09-29. The actual entrance remains unverified.', '银行 POI 14196400744 位于建筑 205732536 内；OSM 快照日期为 2026-09-29。实际入口仍待核实。'),
  }),
]);

export const PLACE_IDS = Object.freeze(PLACES.map(place => place.id));
const byId = new Map(PLACES.map(place => [place.id, place]));

export function resolveStops(ids, locale = 'en') {
  const language = locale === 'zh' ? 'zh' : 'en';
  if (!Array.isArray(ids)) return [];
  return [...new Set(ids)].filter(id => byId.has(id)).map(id => {
    const place = byId.get(id);
    return { ...place, title: place.title[language], detail: place.detail[language], anchor: place.anchor[language] };
  });
}
