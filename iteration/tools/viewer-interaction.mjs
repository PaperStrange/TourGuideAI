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

export {
  openDoor, placeholderDoors, measuredDoors,
  PLACEHOLDER_TEXT, PLACEHOLDER_NOTE_ZH,
  SURFACE_MEASURED, SURFACE_UNMODELLED,
};
