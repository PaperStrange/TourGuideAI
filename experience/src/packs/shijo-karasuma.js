import { WORLD, TARGETS } from '../content/kyoto.js';
import { INSPECTION_FEATURES } from '../runtime/inspection-features.js';
import { PLACES } from '../travel/places.js';

const crossing = PLACES.find(place => place.id === 'crossing');

export const SHIJO_PACK = {
  id: 'shijo-karasuma', revision: 1,
  title: { en: 'Shijō–Karasuma, Kyoto', zh: '京都四条乌丸' },
  description: { en: 'Shijō–Karasuma · An interpreted street scene, grounded in mapped building features.', zh: '四条乌丸 · 依据地图中的建筑特征制作的街景表达。' },
  place: { id: crossing.id, latitude: crossing.latitude, longitude: crossing.longitude,
    kind: 'poi', source: 'OpenStreetMap', url: crossing.source },
  coverage: { latitude: 35.00376, longitude: 135.75995, latitudeRadius: 0.00055, longitudeRadius: 0.00065 },
  world: WORLD, targets: TARGETS,
  navigation: { kind: 'rect-crossing', world: WORLD },
  assets: {
    scene: 'models/shijo-block.glb', traveller: 'models/traveller.glb',
    finishes: 'materials/architectural/', materialPolicy: 'kyoto-architectural',
  },
  lighting: { rig: 'lighting/rig.json', profile: 'kyoto-architectural' },
  camera: { legacyFrontage: true, initial: { azimuth: 0.22, polar: 0.88, distance: 24 },
    limits: { polar: [0.55, 1.2], distance: [10, 48], targetXY: 32, targetHeight: [0.5, 20] } },
  inspection: { features: INSPECTION_FEATURES, maxDistance: 65 },
};
