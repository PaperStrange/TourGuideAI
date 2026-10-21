const text = (en, zh) => ({ en, zh });

// semanticGroup 和尺寸属于当前作者模型；文字事实来自已审阅的建筑参考。
export const INSPECTION_FEATURES = Object.freeze([
  {
    id: 'mitsui-window-bays',
    semanticGroups: ['NorthUpper'],
    materials: ['pale-stone', 'glazing', 'glazing-blinds', 'glass-dark', 'bronze-frame', 'dark-metal'],
    title: text('Mitsui: separate window bays', '三井：独立窗格'),
    detail: text('The reference photograph shows pale stone-like cladding and separate dark rectangular windows. Move sideways to look at the authored recesses and reflections.',
      '参考照片中有浅色、石材般的饰面与独立的深色矩形窗。横向移动，可以观察场景中制作的窗洞深度与反射变化。'),
    sources: [{ label: 'Kyoto Mitsui exterior · inunami · 2021 · CC BY 2.0',
      url: 'https://commons.wikimedia.org/wiki/File:Kyoto_Mitsui_Building_night_20210103183745.jpg' }],
  },
  {
    id: 'daiya-vertical-facade',
    semanticGroups: ['SouthUpper'],
    materials: ['pale-stone', 'glazing', 'glazing-blinds', 'glass-dark', 'bronze-frame', 'dark-metal'],
    title: text('Daiya: vertical facade rhythm', '钻石大厦：竖向立面节奏'),
    detail: text('The reference photograph shows pale vertical ribs and tall glazing. Change your angle to see how the authored ribs overlap the windows.',
      '参考照片中有浅色竖向凸肋与高挑玻璃窗。改变观察角度，可以看到场景中制作的凸肋如何遮挡窗面。'),
    sources: [{ label: 'Kyoto Daiya exterior · inunami · 2021 · CC BY 2.0',
      url: 'https://commons.wikimedia.org/wiki/File:Kyoto_Dia_Building_at_Shijo-Karasuma_intersection_20210103183825.jpg' }],
  },
]);

export const getInspectionFeature = id => INSPECTION_FEATURES.find(feature => feature.id === id) ?? null;

export function featureForSurface(mesh, materialIndex = 0, features = INSPECTION_FEATURES, face) {
  const material = Array.isArray(mesh.material) ? mesh.material[materialIndex] : mesh.material;
  const attribute = mesh.geometry?.getAttribute('_source_index');
  const sourceIndex = attribute && face ? attribute.getX(face.a) : null;
  const source = sourceIndex === null ? null : mesh.userData.featureTable?.[sourceIndex];
  const sourceFeatures = Array.isArray(source) ? source : source?.featureIds ?? [];
  const ids = source ? sourceFeatures : mesh.userData.inspectionFeatureIds ?? [];
  return features.find(feature => (ids.includes(feature.id) &&
    (!feature.materials || feature.materials.includes(material?.name))) ||
    (!source && feature.semanticGroups?.includes(mesh.userData.semanticGroup) && feature.materials?.includes(material?.name))) ?? null;
}
