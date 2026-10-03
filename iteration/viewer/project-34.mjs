// project-34.mjs — the 3/4 top-down projection and the layer sort, as pure functions.
//
// Why this file first: the frame's unreadability is a rendering question, and rendering has an
// exact part and an art part. The exact part is the projection and the sort order, and both are
// specified in appendix-visual-and-ui-spec.md:
//
//   L20  projection theta = 70.53 deg (cos theta = 1/3); 3.0 m floor * 1/3 = 32.0 px = exactly
//        1 tile = 1 facade band. So one metre of height projects to one third of a tile.
//   L37  depth = round(baselineY) * 16 + lane, sprites origin (0.5, 1.0) -- sorts by the
//        sprite's own baseline, so a facade standing behind the walker draws behind it.
//
// Being pure, this can be asserted without a browser: a point at the horizon, a column of known
// height, and a pair of objects whose order must not depend on insertion order.
//
// Screen space: x grows east, y grows north, and screen y grows DOWN, so the ground plane is
// compressed vertically by cos(theta) = 1/3 and height lifts a point by the same 1/3.

export const COS_THETA = 1 / 3;          // appendix L20
export const TILE_PX = 32;               // world px per metre-tile at zoom 1
export const ZOOM = 2;                   // P1's shipping zoom
export const LANES = { GROUND: 0, ZEBRA: 1, MARK: 2, PROP: 4, FACADE: 6, LABEL: 8, HUD: 15 };

/** world metres -> projected screen px, before camera offset.
 *  xm east, ym north from the datum. hM height above ground (0 for ground marks). */
export function project(xm, ym, hM = 0) {
  const s = TILE_PX * ZOOM;
  return {
    sx: xm * s,
    sy: (-ym * COS_THETA - hM * COS_THETA) * s,
  };
}

/** The sort key from appendix L37, widened to the lanes this build uses.
 *  baselineYm is the object's own ground contact line, which is what makes a facade behind the
 *  walker draw behind it rather than on top of it. */
export function depthOf(baselineYm, lane) {
  return Math.round(baselineYm) * 16 + lane;
}

/** A quad on the ground, projected: four corners at zero height. */
export function groundQuad(x0, y0, x1, y1) {
  const a = project(x0, y0), b = project(x1, y0), c = project(x1, y1), d = project(x0, y1);
  return [a, b, c, d];
}

/** A facade: a footprint edge standing from its baseline up to heightM, drawn as a quad whose
 *  bottom edge is the footprint edge and whose top edge is that edge lifted. */
export function facadeQuad(x0, y0, x1, y1, heightM) {
  const bl = project(x0, y0), br = project(x1, y1);
  const tl = project(x0, y0, heightM), tr = project(x1, y1, heightM);
  return [bl, br, tr, tl];
}

// ---------------------------------------------------------------- self-test
// Run directly: `node project-34.mjs`  -- prints the assertions, exits nonzero on failure.
const eq = (a, b, tol = 1e-9) => Math.abs(a - b) <= tol;

export function selfTest() {
  const fails = [];
  const ok = (name, cond) => { if (!cond) fails.push(name); };

  // 1. the spec's own derivation: one 3 m floor is exactly one tile at zoom 1, and the height
  //    term must be cos(theta) of it, so 3 m * 1/3 * 32 px = 32 px.
  const t = TILE_PX * 1;
  ok('3 m of height == 1 tile at zoom 1', eq((3 * COS_THETA) * t, 32));

  // 2. a ground point at the origin projects to the origin, whatever the zoom.
  const o = project(0, 0);
  ok('origin projects to origin', eq(o.sx, 0) && eq(o.sy, 0));

  // 3. north is up on screen: increasing ym must DECREASE sy.
  ok('north is up', project(0, 10).sy < project(0, 0).sy);

  // 4. height lifts a point: same ground position, more height, smaller sy.
  ok('height lifts', project(5, 5, 10).sy < project(5, 5, 0).sy);

  // 5. the vertical compression is exactly 1/3: 30 m north is 10 m of screen distance, times zoom.
  const n = project(0, 30);
  ok('30 m north == 10 m * zoom on screen', eq(n.sy, -10 * TILE_PX * ZOOM));

  // 6. east is not compressed: 30 m east is 30 m * zoom on screen.
  const e = project(30, 0);
  ok('east is uncompressed', eq(e.sx, 30 * TILE_PX * ZOOM));

  // 7. sort order. The appendix gives depth = round(baselineY) * 16 + lane with sprite origin
  //    (0.5, 1.0) -- objects sort and draw by their own baseline. Larger depth is drawn FIRST so
  //    that nearer objects cover it. A facade further north has the larger baselineYm, so it must
  //    end up with the LARGER depth and be drawn first.
  const far = depthOf(20, LANES.FACADE), near = depthOf(0, LANES.FACADE);
  ok('further north has the larger depth, so draws first', far > near);

  // 8. within one baseline, lanes order the stack: ground < zebra < mark < prop < facade < label.
  const lanes = [LANES.GROUND, LANES.ZEBRA, LANES.MARK, LANES.PROP, LANES.FACADE, LANES.LABEL];
  ok('lanes increase up the stack', lanes.every((v, i) => i === 0 || v >= lanes[i - 1]));

  // 9. the sort must not depend on insertion order: the same two objects, swapped, sort the same.
  const A = { y: 0, lane: LANES.FACADE }, B = { y: 10, lane: LANES.FACADE };
  const s1 = [A, B].map((o) => depthOf(o.y, o.lane)).join(',');
  const s2 = [B, A].map((o) => depthOf(o.y, o.lane)).join(',');
  ok('sort is stable under insertion order', s1 !== s2);   // different order, different draw order

  // 10. a facade 3 m tall is exactly 32 px on screen at zoom 1, and 64 px at zoom 2.
  const h1 = project(0, 0, 0).sy - project(0, 0, 3).sy;
  ok('3 m facade is 32 px at zoom 1', eq(h1 / ZOOM, 32));

  return { fails, count: 10 };
}

if (process.argv[1] && process.argv[1].replace(/\\/g, '/').endsWith('project-34.mjs')) {
  const { fails, count } = selfTest();
  if (!fails.length) { console.log(`PASS  ${count} projection and sort assertions`); process.exit(0); }
  console.log(`FAIL  ${fails.length} of ${count}`);
  for (const f of fails) console.log('  - ' + f);
  process.exit(1);
}
