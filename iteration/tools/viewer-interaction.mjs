/**
 * viewer-interaction.mjs — what happens when the player opens a door.
 *
 * WHY THIS IS ITS OWN FILE
 * ------------------------
 * `check-viewer.mjs` asserts on these functions in node, and `bake-viewer.mjs`
 * serialises them into the page with `.toString()`, so the browser runs the same
 * bodies the assertions check. That is the same posture as the walker simulation:
 * one implementation, not a copy that can drift.
 *
 * THE DISTINCTION THIS FILE EXISTS TO MAKE
 * ----------------------------------------
 * The user's ruling:
 *
 *   「南侧的店面在世界里不存在：仍然需要设置可以走进去的交互操作，第一版交互反馈显示
 *     "内容开发中"即可。以还原现实为第一标准。」
 *
 * North and south are now **different kinds of enterable**:
 *
 *   north — the player really walks into a modelled 3-row room with a back wall (D-43).
 *   south — the player enters a shopfront that really exists and that this engine has
 *           no interior geometry for.
 *
 * A player who cannot tell those apart walks into a shell and believes they are
 * looking at a real layout. That is not "under development", it is a lie, and it is
 * what the ruling's closing clause forbids. So the distinguishing mark must be
 * **legible without any background knowledge**, and it must be the same mark every
 * time rather than a matter of wording:
 *
 *   - a modelled surface emits an annotation that is FACTUALLY TRUE and comes from
 *     the measurement — "you are at the doorway to <place>; the room behind it is
 *     three rows deep and closed by a back wall";
 *   - an unmodelled surface emits NO annotation, and the panel carries the ONE
 *     PLACEHOLDER string, which is a single constant here rather than per-branch
 *     prose;
 *   - and `drawRoom` is FALSE for the unmodelled branch, so nothing is drawn that a
 *     source does not describe. Faking a lobby is explicitly forbidden by the card.
 *
 * What the panel must never do is produce a room-shaped thing for the south side.
 * An absent diagram is honest; an invented one is the defect.
 */

/**
 * Constants are `var` declarations rather than `export const`, because
 * `bake-viewer.mjs` serialises these with `.toString()` into the page and `const`
 * does not survive that as re-evaluable source. Everything in this file is therefore
 * written in the one shape that works in both places, and re-exported at the bottom.
 */

/** The one placeholder string, used in exactly one place and asserted as such. */
var PLACEHOLDER_TEXT = '内容开发中';
var PLACEHOLDER_NOTE_ZH = '（本版本未建模，不是布局示意图）';

var SURFACE_MEASURED = 'measured-interior';
var SURFACE_UNMODELLED = 'unmodelled-interior';

/**
 * Resolve what opening `doorId` does.
 *
 * Returns a plain object — no DOM, no canvas, no node APIs — so it can be asserted
 * in node and serialised into the browser unchanged.
 *
 * @param {string} doorId
 * @param {object} openerContract the DECLARATION (surface kind, place, openable)
 * @param {object} payload        the baked scene payload (for the measured depth)
 */
function openDoor(doorId, openerContract, payload) {
  const declared = (openerContract && openerContract.openable ? openerContract.openable : [])
    .find((d) => d.doorId === doorId) || null;

  if (!declared) {
    // A door with no declaration is a defect, not a door. Say so rather than
    // defaulting to something enterable: "drop, don't correct" applies to
    // interaction as much as to facts.
    return {
      doorId,
      kind: 'undeclared',
      enterable: false,
      title: doorId,
      placeholder: null,
      placeholderNote: null,
      annotation: null,
      annotationZh: null,
      measuredInteriorRows: null,
      drawRoom: false,
    };
  }

  const measured = (payload && payload.doors ? payload.doors : []).find((d) => d.doorId === doorId) || null;
  const rows = declared.modelledInteriorRows;
  const real = declared.surface === SURFACE_MEASURED;

  if (real) {
    /**
     * The measured branch. The annotation states only what was measured: the room's
     * depth and the fact that a back wall closes it. It does NOT describe the room's
     * contents, because no source describes them.
     */
    return {
      doorId,
      kind: 'measured-interior',
      enterable: true,
      title: declared.placeNameJa || declared.placeId || doorId,
      placeholder: null,
      placeholderNote: null,
      annotation: rows === null
        ? 'the room behind this door exists in the world; the scene was not probed, so its depth is not stated here'
        : 'this room really exists in the model: ' + rows + ' row(s) deep, closed by a back wall (D-43)',
      annotationZh: rows === null
        ? '门后的房间在世界上真实存在；本次未探测场景，因此不给出深度'
        : '门后的房间在模型里真实存在：深 ' + rows + ' 格，尽头是一堵后墙（D-43）',
      measuredInteriorRows: rows,
      drawRoom: true,
    };
  }

  /**
   * The unmodelled branch: the ONE placeholder string, no annotation, nothing drawn.
   */
  return {
    doorId,
    kind: 'unmodelled-interior',
    enterable: true,
    title: declared.placeNameJa || declared.placeId || doorId,
    placeholder: PLACEHOLDER_TEXT,
    placeholderNote: PLACEHOLDER_NOTE_ZH,
    annotation: null,
    annotationZh: null,
    measuredInteriorRows: rows,
    drawRoom: false,
  };
}

/** Every door that resolves to the placeholder. Used by the checks and the page. */
function placeholderDoors(openerContract) {
  const list = openerContract && openerContract.openable ? openerContract.openable : [];
  return list.filter((d) => d.surface === SURFACE_UNMODELLED).map((d) => d.doorId);
}

/** Every door that resolves to a modelled room. */
function measuredDoors(openerContract) {
  const list = openerContract && openerContract.openable ? openerContract.openable : [];
  return list.filter((d) => d.surface === SURFACE_MEASURED).map((d) => d.doorId);
}

/* ==================================================================== *
 * P1 · the target function and the HUD slots   (play-systems.md §1.4, §1.7)
 *
 * Everything below is a PURE function of its arguments plus the two growing sets.
 * No scripts, no priority tables, no persistence, no clock. That is the point: the
 * target is an argmin of a distance, so it cannot quietly become a tutorial.
 * ==================================================================== */

/**
 * next := argmin{ grid distance to the walker : a not in derived }, ties to the smaller
 * alongStreetM. Spec §1.7 states it in one line and forbids a priority table; this is
 * that line.
 *
 * At spawn (0, 11) with derived empty this selects 四条烏丸交差点 東側横断歩道 — a place
 * WITH a source — and not a door. That is not luck, it is what the function does, and it
 * is what keeps the first thing the player is pointed at from being one of the three
 * placeholders (SOW §8.6's ordering trap).
 */
function nextAnchor(anchors, walker, derived) {
  var best = null, bestD = null;
  for (var i = 0; i < anchors.length; i += 1) {
    var a = anchors[i];
    if (derived && derived[a.id]) continue;
    var d = Math.abs(a.cellX - walker.x) + Math.abs(a.cellY - walker.row);
    if (bestD === null || d < bestD || (d === bestD && a.alongStreetM < best.alongStreetM)) {
      best = a; bestD = d;
    }
  }
  return best === null ? null : { anchor: best, dist: bestD };
}

/** Grid (Manhattan) distance, the same metric next minimises. */
function anchorDist(anchor, walker) {
  return anchor === null ? null : Math.abs(anchor.cellX - walker.x) + Math.abs(anchor.cellY - walker.row);
}

/** Is the anchor inside the current window? The S1 indicator hides when it is. */
function isVisible(anchor, camLeft, camTop, viewX, viewY) {
  if (!anchor) return false;
  return anchor.cellX >= camLeft && anchor.cellX < camLeft + viewX &&
    anchor.cellY >= camTop && anchor.cellY < camTop + viewY;
}

/** Integer metres, signed, from the walker to the anchor — the S1 readout. */
function signedMetres(anchor, walker) {
  return {
    dx: anchor.cellX - walker.x,
    dy: anchor.cellY - walker.row,
    manhattan: Math.abs(anchor.cellX - walker.x) + Math.abs(anchor.cellY - walker.row),
  };
}

/**
 * S3 — the status readout: 四条通 · 东行 x m · 最近 <real name> ±d m.
 * The name is a VALUE from the fact layer, never a string written here.
 */
function statusReadout(anchor, walker) {
  return {
    street: '四条通',
    direction: '东行',
    alongM: walker.x,
    nearestName: anchor === null ? null : anchor.nameJa,
    nearestDistM: anchor === null ? null : anchorDist(anchor, walker),
  };
}

/**
 * S2 — three counters that must NEVER be merged, with all three denominators taken
 * from the INPUT rather than from a literal. This repository has already gone red twice
 * for a hardcoded door count (task-23), so the denominators are arguments here.
 */
function counters(anchors, derived, guideCounts) {
  var streetTotal = 0, doorTotal = 0, streetDone = 0, doorDone = 0;
  for (var i = 0; i < anchors.length; i += 1) {
    var a = anchors[i];
    if (a.kind === 'place') { streetTotal += 1; if (derived[a.id]) streetDone += 1; }
    else { doorTotal += 1; if (derived[a.id]) doorDone += 1; }
  }
  return {
    streetDone: streetDone, streetTotal: streetTotal,
    doorDone: doorDone, doorTotal: doorTotal,
    outsideTotal: guideCounts.placeTotal - guideCounts.placeInWindow,
  };
}

export {
  openDoor, placeholderDoors, measuredDoors,
  nextAnchor, anchorDist, isVisible, signedMetres, statusReadout, counters,
  PLACEHOLDER_TEXT, PLACEHOLDER_NOTE_ZH,
  SURFACE_MEASURED, SURFACE_UNMODELLED,
};
