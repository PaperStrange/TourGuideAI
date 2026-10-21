import geography from '../neighborhoods/shijo-east/geography.json' with { type: 'json' };
import { SIGHTS } from '../neighborhoods/shijo-east/sights.js';

const text = (en, zh) => ({ en, zh });

export const SHIJO_EAST_PACK = {
  id: geography.id, revision: geography.revision, title: geography.title, frame: geography.frame,
  description: text('A continuous, source-grounded neighborhood walk. Building detail and level ground are authored interpretations.',
    '依据来源制作的连续街区步行场景；建筑细节与水平地面为设计表达。'),
  place: { id: geography.id, kind: 'poi', latitude: geography.sights[0].latitude, longitude: geography.sights[0].longitude,
    source: 'OpenStreetMap contributors', url: `https://www.openstreetmap.org/#map=17/${geography.sights[0].latitude}/${geography.sights[0].longitude}` },
  placeIds: [geography.id, ...SIGHTS.map(sight => `${geography.id}:${sight.id}`)],
  world: { bounds: geography.bounds, spawn: geography.spawn }, targets: [], navigation: geography.navigation,
  route: { ...geography.selectedRoute, sights: geography.sights, frame: geography.frame },
  assets: { sections: 'assets/neighborhoods/shijo-east/manifest.json', traveller: 'models/traveller.glb', materialPolicy: 'shared-pbr' },
  lighting: { rig: 'assets/neighborhoods/shijo-east/lighting.json' },
  camera: { fov: 48, far: 350, legacyFrontage: false, preserveFramingOnWalk: true,
    initial: { azimuth: .22, polar: 1.1, distance: 22 }, followOffset: { x: 1.2, y: -2.2, height: 1.6 },
    limits: { polar: [.55, 1.49], distance: [5, 55], targetXY: 40, targetHeight: [.5, 40] } },
  inspection: { maxDistance: 65, features: SIGHTS.map(sight => ({ id: sight.featureId, title: sight.title,
    detail: sight.detail, sources: sight.sources })) },
};
