import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

const root = resolve(process.argv[2]);
const geography = JSON.parse(await readFile(resolve(root, 'experience/src/neighborhoods/shijo-east/geography.json')));
const { createRouteNavigation } = await import(pathToFileURL(resolve(root, 'experience/src/simulation/route-navigation.js')));
const navigation = createRouteNavigation(geography.navigation);
const edges = new Map(geography.navigation.edges.map(edge => [edge.id, edge]));
const observations = geography.selectedRoute.edgeIds.map((id, ordinal) => {
  const edge = edges.get(id), a = edge.points[0], b = edge.points[1];
  const length = Math.hypot(b.x - a.x, b.y - a.y);
  const middle = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, height: (a.height + b.height) / 2, edgeId: id, edgeDistance: length / 2 };
  const at = navigation.locate(middle);
  const normal = { x: -(b.y - a.y) / length, y: (b.x - a.x) / length };
  const lateral = [-1, 1].map(sign => {
    const projected = navigation.project(at.x + normal.x * sign, at.y + normal.y * sign, at);
    return { sign, requestedDisplacementMetres: 1, acceptedDisplacementMetres: Math.hypot(projected.x - at.x, projected.y - at.y), projected };
  });
  return { ordinal: ordinal + 1, id, centerlineLocateDisplacementMetres: Math.hypot(at.x - middle.x, at.y - middle.y),
    sourceTags: edge.sourceTags, widthMetres: edge.width, centerRadiusMetres: edge.width / 2 - geography.navigation.playerRadius,
    points: edge.points, lateral };
});
console.log(JSON.stringify({ method: 'Execute the actual createRouteNavigation module; locate midpoint and project one-metre lateral requests in both directions on every selected edge',
  rendererMapping: 'route-world-view uses toScene(state.x,state.y,height); toScene maps x,height,-y without lateral offset',
  observations }, null, 2));
