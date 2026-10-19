import source from '../../content/ginza-wako/source.json' with { type: 'json' };

const text = (en, zh) => ({ en, zh });
const line = source.sidewalk.centerline.map(({ x, y }) => ({ x, y }));
const footprint = source.building.footprint.map(({ x, y }) => ({ x, y }));
const all = [...line, ...footprint];
const reference = source.references.find(item => item.id === 'wako-2024');
const photo = { label: `${reference.title} · ${reference.author} · ${reference.license}`, url: reference.sourceUrl };
const operator = { label: 'SEIKO HOUSE · building specifications',
  url: source.sources.find(item => item.id === 'seiko-building-specifications').url };

export const GINZA_PACK = {
  id: source.id, revision: source.revision,
  title: text('Ginza Wako corner, Tokyo', '东京银座和光转角'),
  description: text('An interpreted 1932 building and an authored sidewalk corridor following mapped points.',
    '依据来源制作的 1932 年建筑，以及沿地图节点设计的人行道范围。'),
  place: { id: 'osm:way:' + source.identity.osmId, kind: 'poi',
    latitude: source.identity.representativePoint.latitude, longitude: source.identity.representativePoint.longitude,
    source: 'OpenStreetMap · SEIKO HOUSE', url: source.identity.url },
  coverage: { latitude: source.identity.representativePoint.latitude, longitude: source.identity.representativePoint.longitude,
    latitudeRadius: 0.00024, longitudeRadius: 0.00032 },
  world: { bounds: { minX: Math.min(...all.map(p => p.x)) - 10, maxX: Math.max(...all.map(p => p.x)) + 10,
    minY: Math.min(...all.map(p => p.y)) - 10, maxY: Math.max(...all.map(p => p.y)) + 10 },
    spawn: { x: source.authoredNavigation.spawn.x, y: source.authoredNavigation.spawn.y } },
  navigation: { kind: 'corridor', centerline: line, width: source.authoredNavigation.fullWidthMetres, footprint },
  targets: [],
  assets: { manifest: 'packs/ginza-wako/manifest.json', scene: 'packs/ginza-wako/scene.glb',
    traveller: 'models/traveller.glb', materialPolicy: 'embedded-pbr', materialPolicyId: 'ginza-wako-materials-v1' },
  lighting: { rig: 'packs/ginza-wako/lighting.json' },
  camera: { fov: 48, legacyFrontage: false, preserveFramingOnWalk: true, initial: { azimuth: 0.05, polar: 1.49, distance: 64,
    targetOffset: { x: 13.7, y: 0, height: 24.5 } },
    followOffset: { x: 2, y: 2, height: 3 },
    limits: { polar: [0.55, 1.49], distance: [10, 64], targetXY: 40, targetHeight: [0.5, 44] } },
  inspection: { maxDistance: 70, features: [
    { id: 'wako-clock', materials: ['wako-clock-dial', 'wako-clock-ink'], title: text('Wako: the clock tower', '和光：钟楼'),
      detail: text('SEIKO reports a 2.4 m clock dial and a 39.39 m height to the tower top. The tower shape and clock mounting in this scene are authored.',
        'SEIKO 公布的钟面直径为 2.4 米，钟楼顶部距地面 39.39 米。场景中的钟楼形状与钟面安装细节为设计表达。'), sources: [operator, photo] },
    { id: 'wako-rounded-corner', title: text('Wako: the rounded corner', '和光：圆弧转角'),
      detail: text('The mapped footprint and reference photograph show the curved corner joining two street fronts. Walk around it to see the frontage change.',
        '地图轮廓与参考照片呈现了连接两侧街面的弧形转角。沿转角行走，可以观察立面如何变化。'),
      sources: [photo, { label: 'OpenStreetMap · Wako building footprint', url: 'https://www.openstreetmap.org/way/103509469' }] },
    { id: 'wako-window-hierarchy', materials: ['wako-glass', 'wako-ground-glass', 'wako-frame'], title: text('Wako: upper windows', '和光：上层窗组'),
      detail: text('The reference photograph shows different upper window shapes and recessed lower glazing. Their spacing and depth here are authored.',
        '参考照片呈现了不同形状的上层窗组与内凹的下层玻璃。场景中的间距与深度为设计表达。'), sources: [photo] },
    { id: 'wako-stone-cornice', materials: ['wako-upper-granite', 'wako-lower-polished-stone', 'wako-trim'], title: text('Wako: stone and cornices', '和光：石材与檐口'),
      detail: text('SEIKO identifies polished Mannari stone on the lower two floors and a tapped granite finish above. The cornice depths and material colours here are authored.',
        'SEIKO 记载，下方两层使用抛光万成石，上层使用敲凿饰面的花岗岩。场景中的檐口深度与材质颜色为设计表达。'), sources: [operator, photo] },
  ] },
};
