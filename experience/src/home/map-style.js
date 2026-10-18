export const TRAVEL_MAP_STYLE_ID = 'tourguideai-travel-map-v1';

const layerColors = (ids, type, paint) => ids.map(id => Object.freeze({ id, type, paint: Object.freeze({ ...paint }) }));

// 图层依据 2026-10-18 保存的 OpenFreeMap Liberty；颜色为设计表达。
export const TRAVEL_MAP_PAINT = Object.freeze([
  ...layerColors(['background'], 'background', { 'background-color': '#f4f2e8' }),
  ...layerColors(['landuse_residential'], 'fill', { 'fill-color': '#e9e6db' }),
  ...layerColors(['park'], 'fill', { 'fill-color': '#b9c9b1', 'fill-outline-color': '#96ad91' }),
  ...layerColors(['park_outline'], 'line', { 'line-color': '#96ad91' }),
  ...layerColors(['landcover_wood'], 'fill', { 'fill-color': '#9fb799' }),
  ...layerColors(['landcover_grass', 'landuse_pitch', 'landuse_track', 'landuse_cemetery'], 'fill', { 'fill-color': '#c5d1b9' }),
  ...layerColors(['landuse_school'], 'fill', { 'fill-color': '#e5e1c9' }),
  ...layerColors(['landuse_hospital'], 'fill', { 'fill-color': '#ead9d3' }),
  ...layerColors(['landcover_sand'], 'fill', { 'fill-color': '#e8ddbf' }),
  ...layerColors(['water'], 'fill', { 'fill-color': '#a5bec3' }),
  ...layerColors(['waterway_tunnel', 'waterway_river', 'waterway_other'], 'line', { 'line-color': '#91aeb7' }),
  ...layerColors(['building'], 'fill', { 'fill-color': '#cfc6b7', 'fill-outline-color': '#a79f91' }),
  ...layerColors(['building-3d'], 'fill-extrusion', { 'fill-extrusion-color': '#cfc6b7' }),
  ...layerColors([
    'road_motorway_link_casing', 'road_service_track_casing', 'road_link_casing', 'road_minor_casing',
    'road_secondary_tertiary_casing', 'road_trunk_primary_casing', 'road_motorway_casing',
    'bridge_motorway_link_casing', 'bridge_service_track_casing', 'bridge_link_casing', 'bridge_street_casing',
    'bridge_path_pedestrian_casing', 'bridge_secondary_tertiary_casing', 'bridge_trunk_primary_casing', 'bridge_motorway_casing',
    'tunnel_motorway_link_casing', 'tunnel_service_track_casing', 'tunnel_link_casing', 'tunnel_street_casing',
    'tunnel_secondary_tertiary_casing', 'tunnel_trunk_primary_casing', 'tunnel_motorway_casing',
  ], 'line', { 'line-color': '#b7b4a8' }),
  ...layerColors([
    'road_service_track', 'road_link', 'road_minor', 'bridge_service_track', 'bridge_link', 'bridge_street',
    'tunnel_service_track', 'tunnel_link', 'tunnel_minor',
  ], 'line', { 'line-color': '#fffdf5' }),
  ...layerColors(['road_path_pedestrian', 'bridge_path_pedestrian', 'tunnel_path_pedestrian'], 'line', { 'line-color': '#f7f1df' }),
  ...layerColors(['road_secondary_tertiary', 'bridge_secondary_tertiary', 'tunnel_secondary_tertiary'], 'line', { 'line-color': '#eee5ce' }),
  ...layerColors(['road_trunk_primary', 'bridge_trunk_primary', 'tunnel_trunk_primary'], 'line', { 'line-color': '#e5d4af' }),
  ...layerColors([
    'road_motorway', 'road_motorway_link', 'bridge_motorway', 'bridge_motorway_link',
    'tunnel_motorway', 'tunnel_motorway_link',
  ], 'line', { 'line-color': '#dcc498' }),
]);

// 在每次 style.load 后调用；先核对所有图层，再设置颜色，重试可重复调用。
export function applyTravelMapStyle(map) {
  for (const { id, type } of TRAVEL_MAP_PAINT) {
    const layer = map.getLayer(id);
    if (!layer || layer.type !== type) throw new Error(`Travel map style requires Liberty layer ${id} (${type}).`);
  }
  for (const { id, paint } of TRAVEL_MAP_PAINT) {
    for (const [property, color] of Object.entries(paint)) map.setPaintProperty(id, property, color);
  }
  return TRAVEL_MAP_STYLE_ID;
}
