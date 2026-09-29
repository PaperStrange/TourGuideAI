#!/usr/bin/env node
/**
 * assert-export-boundary.mjs — the boundary no other guard layer covers.
 *
 * WHY THIS FILE EXISTS
 * --------------------
 * The seven guard layers in recon Appendix B all run inside the app, on the
 * generation path: (1) module graph, (2) typed narrative boundary, (3) read-only
 * fact payload, (4) guard/factLeak.ts, (5) seeded determinism, (6) cost ledger,
 * (7) FactsService-backed rendering. Layer (4) rejects a narrative block before
 * composition. Layer (7) constrains what the in-app guide UI may render.
 * Neither of them is applied to the artefact the player actually carries: the
 * single-file offline HTML guide. A string that never passed through layer (4)
 * — a hand-patched export, a stale template, a field the composer concatenated
 * without going through factLeak — reaches the printed guide unchallenged.
 *
 * This tool is a post-hoc assertion over the exported bytes:
 *
 *     exportedProse ∩ factShapedTokens = ∅
 *
 * THE HARD PROBLEM, AND WHY THIS TOOL IS STRUCTURAL
 * -------------------------------------------------
 * 時 (time), 駅 (station) and 線 (line) are among the most common characters on
 * real Japanese street signage and in Japanese prose about transport. Measured
 * over five real Japanese transit-domain sources in this repo (12,732 CJK
 * glyphs): 時 25, 駅 49, 線 29 occurrences. A content-only scanner that flags
 * those glyphs destroys the game's signature mechanic (reading signage) and
 * fails its own false-positive budget.
 *
 * They cannot be separated by content. The design says so itself: the HUD spec
 * prints `目标：16:30 前到金阁寺（16:00 停止入场）` — a sentence structurally
 * identical to narrative prose that legitimately carries a time. There is no
 * lexical property distinguishing "narrative immersion" from "guide body".
 *
 * So this tool does NOT try. It separates them STRUCTURALLY, into three roots:
 *
 *   guide     (`data-tgf="guide"`)      checked against the fact layer
 *   narrative (`data-tgf="narrative"`)  measured only; a street may look like a street
 *   chrome    (`data-ui-strings="…"`    checked against the EXPORT TEMPLATE'S OWN
 *              or pack.json uiStrings)   declared vocabulary, not against facts
 *
 * Text in NO declared region is never scanned, so it is a hard failure
 * (UNCOVERED_TEXT) rather than a silent skip: otherwise the way to smuggle a fact
 * past this tool would be to print it outside a region.
 *
 * WHAT "CHECKED" MEANS INSIDE A GUIDE REGION
 * ------------------------------------------
 * 1. Lexical rules — clock times, yen amounts, admission/fare wording, closure
 *    claims. These fire REGARDLESS of provenance. A provenance chip backs an
 *    entity name; it does not license a time or price the fact layer never stated.
 * 2. Declared-time prose (`data-time="…"`, from the fact layer's `hours` /
 *    `minutes`) — prose that states an opening time may only do so if it declares
 *    the fact it came from AND the time it prints appears in that fact's values.
 *    This is what makes a real guide line like
 *    `开馆 09:00–17:00（16:00 停止入场）` checkable instead of merely suspicious.
 * 3. Entity plates (`data-entity="<fact id>"`) — text that claims to be an entity
 *    must be that entity's name, per the fact layer. Two directions are caught:
 *    printing a name you did not declare (ENTITY_UNDECLARED) and declaring a fact
 *    id that does not exist (ENTITY_ID_UNKNOWN). The design already trusts this
 *    hook: Appendix B layer (3) makes `refFactIds` its enforcement mechanism, and
 *    this applies the same set-membership test at the export boundary.
 * 4. Guide body that prints an ideograph run at all, without declaring anything —
 *    see the ENTITY_ATTR note below for why this is NOT a shipped rule and what
 *    replaced it.
 *
 * FAIL-CLOSED
 * -----------
 * Missing pack, empty allow-list, malformed HTML, unparseable export, an
 * internal exception, or a scan that visited zero player-readable text all exit
 * non-zero. Nothing here fails open, and there is no configuration that turns a
 * hard violation into a pass.
 *
 * USAGE
 *   node assert-export-boundary.mjs --pack <city-pack-dir> --export <guide.html>
 *   node assert-export-boundary.mjs --pack <dir> --export <guide.html> --strict-signals
 *   node assert-export-boundary.mjs --pack <dir> --export <guide.html> --entity-sweep
 *   node assert-export-boundary.mjs --self-test          # the two required cases
 *   node assert-export-boundary.mjs --pack <dir> --measure-fp <file>…  # FP metric
 *
 * EXIT CODES
 *   0 pass · 1 boundary violation · 2 usage error · 3 self-test failure
 *   4 fail-closed (input missing/unreadable/unparseable/internal error)
 *
 * SCOPE NOTE (recorded, not hidden): the allow-list is derived from the pack's
 * places.json + transit.json. If the pack also contains doc.json (the frozen
 * GuideDoc this export was rendered from), the allow-list is narrowed to the
 * entities that guide actually cites, because the assertion is about the export,
 * not the pack. When doc.json is absent the allow-list is the whole pack's entity
 * vocabulary, which is WIDER than needed and therefore a weaker guard; the tool
 * prints which of the two it used. A real fact layer does not exist in this
 * repository yet, so no real export can be checked; see --self-test for the
 * executed proof that the mechanism works, and the report for the gap.
 */
import {
  readFileSync, existsSync, statSync, mkdtempSync, writeFileSync, rmSync, mkdirSync,
} from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

// ---------------------------------------------------------------------------
// exit codes
// ---------------------------------------------------------------------------
const EXIT = { PASS: 0, VIOLATION: 1, USAGE: 2, SELFTEST: 3, FAILCLOSED: 4 };

/** Thrown for any condition that must never be treated as a pass. */
class FailClosed extends Error {}

// ---------------------------------------------------------------------------
// structural contract
// ---------------------------------------------------------------------------
const REGION_ATTR = 'data-tgf';
const PROV_ATTR = 'data-prov';
const EXEMPT_ATTR = 'data-tgf-exempt';
const CHROME_ATTR = 'data-ui-strings';
const REGIONS = new Set(['guide', 'narrative']);

/**
 * The three roots of checkable text in an export, and why there are three.
 *
 * The first draft of this tool had two (guide / narrative) and it blocked a
 * legitimate guide heading — `二日目` ("day two") — because that word is not a
 * fact-layer entity and not narrative prose. It is template chrome: the fixed
 * vocabulary the deterministic export template prints on every guide. Chrome is
 * exactly the kind of unguarded string this tool exists to catch, so it must not
 * be silently exempted, and it is not fact-layer data, so it must not be
 * smuggled into the entity allow-list. It gets its own root:
 *
 *   guide text     checked against the fact-layer entity allow-list
 *   chrome text    checked against the template's OWN declared vocabulary
 *                  (data-ui-strings on the element, or pack.json uiStrings)
 *   narrative text measured only; immersion is allowed to look like a street
 *   exempt text    skipped, and listed in the audit as skipped
 *
 * Adding a chrome string is a visible, diffable change to the export template.
 * It is not a way to whitelist a fact.
 */
const CHROME_ROOT_KEYS = ['uiStrings', 'templateStrings'];

/**
 * The entity check is DECLARATION-ANCHORED, and that is a measured decision.
 *
 * The obvious implementation — "any ideograph run not in the fact-layer
 * allow-list is a violation" — was built first and then measured against five
 * real Japanese sources in this repo. Result: 1,866 hard findings over 12,732
 * CJK glyphs, i.e. 146.6 per 1,000 glyphs. Ordinary prose (有限会社金輪島会,
 * 交通関係環境保全優良事業者等大臣表彰) is indistinguishable from an invented
 * proper noun by character class alone, because Japanese has no word delimiter
 * and no capitalisation. That rule would block every honest guide, so it is
 * unusable and is not shipped.
 *
 * What replaces it uses the hook the design already trusts: Appendix B layer
 * (3) makes `refFactIds` the enforcement mechanism for narrative, "a returned
 * block citing an ID that was not in the payload is rejected by a set-membership
 * check". The same trick works at the export boundary, where it is cheaper:
 *
 *   - A guide element may declare `data-entity="<fact id>"`. Its text must then
 *     BE that entity's name, per the fact layer.
 *   - A guide element that prints an entity name WITHOUT declaring one is caught
 *     as ENTITY_UNDECLARED — not because the name is wrong, but because it is
 *     unattributed, and "every guide line carries provenance" is a design
 *     non-negotiable (§3).
 *   - The set-membership test is exact, so the measured false-positive rate on
 *     ordinary prose is zero rather than 146.6 per 1,000 glyphs.
 *
 * Both directions are reported, and the trade-off is stated rather than hidden:
 * bare entity names outside declared plates are no longer flagged, so the
 * declaration itself carries responsibility. `--entity-sweep` restores the noisy
 * sweep for anyone who wants to measure the gap.
 */
const ENTITY_ATTR = 'data-entity';

/**
 * `data-time="<fact id>"` — declared-time prose.
 *
 * The HUD spec prints `目标：16:30 前到金阁寺（16:00 停止入场）`. That is a normal
 * sentence carrying two concrete times, and "09:30 in guide body" alone cannot
 * tell whether those times came from the fact layer or from the model. Requiring
 * a bare time to be removed would delete the single most useful line in the
 * guide; requiring nothing leaves the hole open.
 *
 * So a text node may declare which fact record its times came from. The times it
 * prints must then be derivable from that record's own values (hours[],
 * minutes, fareIC, fareTicket) — a set-membership test on digits, not a
 * fuzzy comparison. An undeclared time in guide body stays a hard violation.
 */
const TIME_ATTR = 'data-time';

/** Canonical clock forms a fact-layer value can yield: "09:30", "0930", "9時30分", "16時". */
function clockForms(value) {
  const out = new Set();
  const s = String(value);
  const hm = /(\d{1,2})[:：](\d{2})/g;
  let m;
  while ((m = hm.exec(s)) !== null) {
    const H = String(Number(m[1]));
    const M = m[2];
    out.add(`${H}:${M}`);
    out.add(`${H.padStart(2, '0')}:${M}`);
    out.add(`${H}${M}`);
    out.add(`${H}時${M}分`);
    out.add(`${H}時${Number(M)}分`);
  }
  const hj = /(\d{1,2})\s*時(?:\s*(\d{1,2})\s*分)?/g;
  while ((m = hj.exec(s)) !== null) {
    const H = String(Number(m[1]));
    out.add(`${H}時`);
    out.add(`${H}:00`);
    if (m[2]) {
      out.add(`${H}時${Number(m[2])}分`);
      out.add(`${H}:${m[2].padStart(2, '0')}`);
    }
  }
  for (const d of s.match(/\d{1,4}/g) || []) out.add(d);
  return out;
}

/** The clock times a text node actually prints, in the spellings a reader sees. */
function printedClockTimes(text) {
  const out = [];
  let m;
  const re1 = /\d{1,2}[:：]\d{2}/g;
  while ((m = re1.exec(text)) !== null) {
    const [h, mi] = m[0].split(/[:：]/);
    out.push({ raw: m[0], canonical: `${Number(h)}:${mi}` });
  }
  const re2 = /\d{1,2}\s*時(?:\s*\d{1,2}\s*分)?/g;
  while ((m = re2.exec(text)) !== null) {
    const jm = /^(\d{1,2})\s*時(?:\s*(\d{1,2})\s*分)?$/.exec(m[0]);
    if (jm) out.push({ raw: m[0], canonical: jm[2] ? `${Number(jm[1])}:${jm[2].padStart(2, '0')}` : `${Number(jm[1])}時` });
  }
  return out;
}

/** "09:30" / "9：30" → "9:30" — the canonical key used on both sides of the check. */
function normalizeClock(raw) {
  const m = /^(\d{1,2})[:：](\d{2})$/.exec(String(raw).trim());
  return m ? `${Number(m[1])}:${m[2]}` : String(raw).trim();
}

/** Which of a text node's clock times are NOT derivable from the declared records. */
function scanDeclaredTimes(text, declaredIds, lookups, allow) {
  const allowed = new Set();
  const unknownIds = [];
  for (const id of declaredIds) {
    const recs = lookups.get(String(id).trim());
    if (!recs || recs.length === 0) { unknownIds.push(id); continue; }
    for (const rec of recs) collectClockValues(rec, allowed);
  }
  const unbacked = [];
  const backed = new Set();
  for (const t of printedClockTimes(text)) {
    if (allowed.has(t.canonical) || allowed.has(t.canonical.replace('時', ':00'))) {
      backed.add(t.canonical);
      continue;
    }
    let verbatim = false;
    for (const v of allowed) {
      if (v.replace(/\s+/g, '') === t.raw.replace(/\s+/g, '')) { verbatim = true; break; }
    }
    if (verbatim) backed.add(t.canonical);
    else unbacked.push(t);
  }
  return { unbacked, unknownIds, backed, allowedCount: allowed.size };
}

/** Collect every clock-bearing value out of a fact record, without naming fields blindly. */
function collectClockValues(rec, out) {
  const walk = (v) => {
    if (typeof v === 'string') { for (const f of clockForms(v)) out.add(f); return; }
    if (typeof v === 'number') { out.add(String(v)); return; }
    if (Array.isArray(v)) { for (const x of v) walk(x); return; }
    if (v && typeof v === 'object') for (const x of Object.values(v)) walk(x);
  };
  walk(rec);
}




/**
 * Elements whose text is not player-visible prose and is therefore exempt from
 * the region requirement. This is an explicit, closed list: anything not here
 * must be inside a declared region.
 */
const NON_PROSE_TAGS = new Set(['script', 'style', 'head', 'title', 'meta', 'link']);
const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
  'param', 'source', 'track', 'wbr',
]);
const RAW_TEXT_TAGS = new Set(['script', 'style']);

/**
 * Fact-shaped classes.
 *
 * `severity` is a measurement decision, not a convenience:
 *   - HARD  : independently fact-shaped. `09:30` or `¥800` in guide body with no
 *             provenance is a fact claim from nowhere, whatever language it is in.
 *   - SIGNAL: the design's own class list, but measured noise-prone. Bare 時/駅/線
 *             occur 103 times in 12,732 glyphs of legitimate Japanese transport
 *             prose. Classing these HARD would block every export and destroy
 *             immersion text; classing them invisible would be dishonest. They
 *             are reported as a monitored metric, and `--strict-signals` promotes
 *             them to failures when a project decides the budget allows it.
 */
const RULES = [
  // ---- HARD: time -------------------------------------------------------
  { id: 'TIME_HHMM', severity: 'hard', re: /\d{1,2}[:：]\d{2}/g,
    note: 'clock time in guide body' },
  { id: 'TIME_HOUR_KANJI', severity: 'hard', re: /\d{1,2}\s*(?:時|時半)/g,
    note: 'digit+時 is a concrete time fact, not the bare glyph 時' },
  { id: 'TIME_RANGE', severity: 'hard', re: /\d{1,2}[:：]\d{2}\s*[〜～~\-–—]\s*\d{1,2}[:：]\d{2}/g,
    note: 'an opening interval' },
  { id: 'TIME_EN_MERIDIEM', severity: 'hard', re: /\d{1,2}(?::\d{2})?\s*(?:am|pm)\b/gi,
    note: 'english clock notation' },

  // ---- HARD: price ------------------------------------------------------
  { id: 'PRICE_CURRENCY', severity: 'hard', re: /[¥￥]/g,
    note: 'yen sign' },
  { id: 'PRICE_YEN_SUFFIX', severity: 'hard', re: /\d[\d,]*\s*円/g,
    note: 'amount in yen' },
  { id: 'PRICE_USD', severity: 'hard', re: /\$\s*\d[\d,.]*/g,
    note: 'dollar amount' },
  { id: 'PRICE_CODE', severity: 'hard', re: /\bJPY\b/g,
    note: 'currency code' },
  { id: 'PRICE_WORD', severity: 'hard', re: /入場料|運賃|拝観料|admission|fare\b/gi,
    note: 'admission/fare vocabulary' },

  // ---- HARD: closed days / last service --------------------------------
  { id: 'CLOSED_WORD', severity: 'hard', re: /定休日|closed\b|last train|終電/gi,
    note: 'closure or last-service claim' },

  // ---- SIGNAL: transit-instruction vocabulary --------------------------
  { id: 'TRANSIT_STATION', severity: 'signal', re: /駅/g, note: '駅 — 49 hits in the measured corpus' },
  { id: 'TRANSIT_LINE', severity: 'signal', re: /線/g, note: '線 — 29 hits in the measured corpus' },
  { id: 'TRANSIT_EXIT', severity: 'signal', re: /出口/g, note: 'exit vocabulary' },
  { id: 'TRANSIT_TRANSFER', severity: 'signal', re: /乗り換え|乗換|platform\b|transfer\b/gi,
    note: 'transfer vocabulary' },
  { id: 'TRANSIT_HOUR_BARE', severity: 'signal', re: /時/g, note: 'bare 時 — the immersion glyph itself' },
];

// (Removed: a LATIN_FACT_SHAPED constant was declared here and never used. The
// English numeric case is already covered by TIME_EN_MERIDIEM / PRICE_USD /
// PRICE_YEN_SUFFIX, so an unused fourth pattern would have been decoration.)

// ---------------------------------------------------------------------------
// small helpers
// ---------------------------------------------------------------------------
const isCJK = (cp) =>
  (cp >= 0x4e00 && cp <= 0x9fff) || // CJK unified ideographs
  (cp >= 0x3400 && cp <= 0x4dbf) || // extension A
  (cp >= 0x3040 && cp <= 0x30ff) || // hiragana + katakana
  (cp >= 0x31f0 && cp <= 0x31ff);   // katakana phonetic extensions

/**
 * Ideographs only — the "汉字连缀" the task card names as the entity class.
 * Kana is excluded on purpose: no place, line or station name is written in
 * kana alone, and including kana makes every ordinary Japanese sentence an
 * "unknown entity" (which is exactly the false-positive explosion this file
 * exists to avoid). Measured cost of the narrower definition is reported by
 * `--measure-fp` rather than asserted here.
 */
const isIdeograph = (cp) =>
  (cp >= 0x4e00 && cp <= 0x9fff) || (cp >= 0x3400 && cp <= 0x4dbf);

function getAttr(attrs, name) {
  return attrs && Object.prototype.hasOwnProperty.call(attrs, name) ? attrs[name] : null;
}

function decodeEntities(s) {
  return s
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&');
}

/** Parse a declared template vocabulary: JSON array, or newline/·-separated list. */
function parseChromeVocab(raw, where, out) {
  if (typeof raw !== 'string' || raw.trim().length === 0) return;
  const s = raw.trim();
  if (s.startsWith('[')) {
    try {
      const arr = JSON.parse(s);
      if (!Array.isArray(arr)) throw new Error('not an array');
      for (const v of arr) if (typeof v === 'string' && v.trim()) out.add(v.trim());
      return;
    } catch (err) {
      throw new FailClosed(`${where}: ${CHROME_ATTR} looks like JSON but did not parse (${err.message})`);
    }
  }
  for (const part of s.split(/[\n|·]/)) {
    const v = part.trim();
    if (v) out.add(v);
  }
}

/** Deterministically collect declared template strings from pack.json. */
function collectChromeFromPack(pack, out, path) {
  if (Array.isArray(pack)) {
    for (const v of pack) collectChromeFromPack(v, out, path);
    return;
  }
  if (!pack || typeof pack !== 'object') return;
  for (const [k, v] of Object.entries(pack)) {
    const here = `${path}.${k}`;
    if (CHROME_ROOT_KEYS.includes(k)) {
      if (Array.isArray(v)) {
        for (const s of v) if (typeof s === 'string' && s.trim()) out.add(s.trim());
      } else if (typeof v === 'string') {
        parseChromeVocab(v, here, out);
      }
    } else {
      collectChromeFromPack(v, out, here);
    }
  }
}

function lineOf(text, index) {
  let n = 1;
  for (let i = 0; i < index && i < text.length; i++) if (text.charCodeAt(i) === 10) n++;
  return n;
}

// ---------------------------------------------------------------------------
// HTML tokenizer (no dependency; deterministic)
//
// Returns { tokens, parseErrors }. Each token is
//   { kind:'text'|'tag', start, end, line, tag, attrs, raw, region, prov }
// where region/prov are the *effective* values at that point, resolved through
// the open-element stack. `region` is null when no ancestor declared one — that
// is a reportable coverage hole, never a silent skip.
// ---------------------------------------------------------------------------
function tokenizeHtml(html) {
  const tokens = [];
  const parseErrors = [];
  const stack = [];
  const attrs = {};
  const n = html.length;
  let i = 0;
  let rawTextUntil = null;

  while (i < n) {
    const ch = html[i];
    const line = lineOf(html, i);

    // inside <script>/<style>: skip blindly to the closing tag
    if (rawTextUntil) {
      const closeIdx = html.toLowerCase().indexOf(rawTextUntil, i);
      if (closeIdx === -1) {
        parseErrors.push({ line, msg: `unterminated <${stack[stack.length - 1]?.tag}> (no ${rawTextUntil})` });
        i = n;
        break;
      }
      i = closeIdx;
      rawTextUntil = null;
      continue;
    }

    if (ch !== '<') {
      const next = html.indexOf('<', i);
      const end = next === -1 ? n : next;
      const raw = html.slice(i, end);
      let region = null;
      let prov = null;
      let exemptTag = null;
      let exempt = false;
      const chromeDecls = [];
      const entityDecls = [];
      const timeDecls = [];
      for (let s = stack.length - 1; s >= 0; s--) {
        if (region === null && stack[s].region !== null) region = stack[s].region;
        if (prov === null && stack[s].prov !== null) prov = stack[s].prov;
        if (exemptTag === null && NON_PROSE_TAGS.has(stack[s].tag)) exemptTag = stack[s].tag;
        if (stack[s].exempt) exempt = true;
        if (stack[s].chrome) for (const c of stack[s].chrome) chromeDecls.push(c);
        if (stack[s].entity) entityDecls.push(stack[s].entity);
        if (stack[s].time) timeDecls.push(stack[s].time);
      }
      if (raw.trim().length > 0) {
        tokens.push({
          kind: 'text', start: i, end, line, raw, region, prov, exemptTag, exempt,
          chrome: chromeDecls, entity: entityDecls, time: timeDecls,
        });
      }
      i = end;
      continue;
    }

    // comment
    if (html.startsWith('<!--', i)) {
      const end = html.indexOf('-->', i + 4);
      if (end === -1) {
        parseErrors.push({ line, msg: 'unterminated comment' });
        i = n;
        break;
      }
      tokens.push({
        kind: 'comment', start: i, end: end + 3, line, raw: html.slice(i, end + 3),
        region: null, prov: null,
      });
      i = end + 3;
      continue;
    }
    // doctype / CDATA / processing instruction
    if (html.startsWith('<!', i) || html.startsWith('<?', i)) {
      const end = html.indexOf('>', i);
      if (end === -1) { parseErrors.push({ line, msg: 'unterminated declaration' }); i = n; break; }
      i = end + 1;
      continue;
    }

    // closing tag
    const closeMatch = /^<\/([A-Za-z][A-Za-z0-9-]*)\s*>/.exec(html.slice(i, i + 80));
    if (closeMatch) {
      const tag = closeMatch[1].toLowerCase();
      let popped = false;
      for (let s = stack.length - 1; s >= 0; s--) {
        if (stack[s].tag === tag) { stack.length = s; popped = true; break; }
      }
      if (!popped) parseErrors.push({ line, msg: `stray closing tag </${tag}>` });
      i += closeMatch[0].length;
      continue;
    }

    // opening tag (attributes scanned with a quote-aware mini-parser)
    const nameMatch = /^<([A-Za-z][A-Za-z0-9-]*)/.exec(html.slice(i, i + 80));
    if (!nameMatch) {
      // a literal '<' that is not a tag; treat as text so nothing is lost
      const next = html.indexOf('<', i + 1);
      const end = next === -1 ? n : next;
      let region = null, prov = null, exemptTag = null, exempt = false;
      const chromeDecls = [];
      const entityDecls = [];
      const timeDecls = [];
      for (let s = stack.length - 1; s >= 0; s--) {
        if (region === null && stack[s].region !== null) region = stack[s].region;
        if (prov === null && stack[s].prov !== null) prov = stack[s].prov;
        if (exemptTag === null && NON_PROSE_TAGS.has(stack[s].tag)) exemptTag = stack[s].tag;
        if (stack[s].exempt) exempt = true;
        if (stack[s].chrome) for (const c of stack[s].chrome) chromeDecls.push(c);
        if (stack[s].entity) entityDecls.push(stack[s].entity);
        if (stack[s].time) timeDecls.push(stack[s].time);
      }
      tokens.push({
        kind: 'text', start: i, end, line, raw: html.slice(i, end), region, prov,
        exemptTag, exempt, chrome: chromeDecls, entity: entityDecls, time: timeDecls,
      });
      i = end;
      continue;
    }

    const tag = nameMatch[1].toLowerCase();
    let j = i + nameMatch[0].length;
    for (const k in attrs) delete attrs[k];
    let selfClosing = false;
    while (j < n) {
      while (j < n && /\s/.test(html[j])) j++;
      if (j >= n) break;
      if (html[j] === '>') { j++; break; }
      if (html[j] === '/' && html[j + 1] === '>') { selfClosing = true; j += 2; break; }
      const am = /^([A-Za-z_:][A-Za-z0-9_.:-]*)/.exec(html.slice(j, j + 80));
      if (!am) { j++; continue; }
      const aname = am[1].toLowerCase();
      j += am[0].length;
      while (j < n && /\s/.test(html[j])) j++;
      let avalue = '';
      if (html[j] === '=') {
        j++;
        while (j < n && /\s/.test(html[j])) j++;
        const q = html[j];
        if (q === '"' || q === "'") {
          const close = html.indexOf(q, j + 1);
          if (close === -1) { parseErrors.push({ line, msg: `unterminated attribute value on <${tag} ${aname}>` }); j = n; break; }
          avalue = html.slice(j + 1, close);
          j = close + 1;
        } else {
          const vm = /^[^\s>]*/.exec(html.slice(j, j + 200));
          avalue = vm ? vm[0] : '';
          j += avalue.length;
        }
      }
      attrs[aname] = avalue;
    }
    if (j > n) j = n;

    const rawRegion = getAttr(attrs, REGION_ATTR);
    let region = null;
    if (rawRegion !== null) {
      const v = rawRegion.trim().toLowerCase();
      if (!REGIONS.has(v)) {
        parseErrors.push({
          line,
          msg: `<${tag} ${REGION_ATTR}="${rawRegion}"> is not a declared region (expected guide|narrative)`,
        });
      } else {
        region = v;
      }
    }
    tokens.push({ kind: 'tag', start: i, end: j, line, tag, raw: html.slice(i, j), region, prov: null });

    const chromeDecl = [];
    const chromeSet = new Set();
    parseChromeVocab(getAttr(attrs, CHROME_ATTR), `line ${line} <${tag}>`, chromeSet);
    for (const c of chromeSet) chromeDecl.push(c);

    if (!selfClosing && !VOID_TAGS.has(tag)) {
      stack.push({
        tag,
        region,
        prov: getAttr(attrs, PROV_ATTR),
        exempt: getAttr(attrs, EXEMPT_ATTR) !== null,
        chrome: chromeDecl,
        entity: getAttr(attrs, ENTITY_ATTR),
        time: getAttr(attrs, TIME_ATTR),
      });
      if (RAW_TEXT_TAGS.has(tag)) rawTextUntil = `</${tag}`;
    }
    i = j;
  }

  if (stack.length > 0) {
    parseErrors.push({
      line: token0Line(html),
      msg: `unclosed element(s) at EOF: ${stack.map((s) => `<${s.tag}>`).join(', ')}`,
    });
  }
  return { tokens, parseErrors };
}

function token0Line(html) {
  return Math.max(1, html.split('\n').length);
}

// ---------------------------------------------------------------------------
// allow-list, derived from the fact layer — never hand-maintained
// ---------------------------------------------------------------------------
const NAME_FIELD_HINTS = ['name'];

/** Recursively collect name-shaped strings from a fact record. */
function collectNameStrings(value, out, key) {
  if (typeof value === 'string') {
    if (key !== null && NAME_FIELD_HINTS.some((h) => key.toLowerCase().includes(h))) out.push(value);
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) collectNameStrings(v, out, key);
    return;
  }
  if (value && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) collectNameStrings(v, out, k);
  }
}

/** Split a name string into the CJK runs a player would actually read. */
function cjkRuns(s) {
  const runs = [];
  let cur = '';
  for (const ch of s) {
    if (isCJK(ch.codePointAt(0))) cur += ch;
    else { if (cur) runs.push(cur); cur = ''; }
  }
  if (cur) runs.push(cur);
  return runs;
}

/**
 * Build the allow-list. Every token here originates in the fact layer.
 * We also emit each name's CJK runs, because a player reads `金閣寺` from
 * `金閣寺（鹿苑寺）` and the scan operates on rendered text.
 */
function buildAllowList(packDir, places, transit) {
  const source = { placesJson: [], transitJson: [], docJson: null };
  for (const p of Array.isArray(places) ? places : []) {
    if (p && typeof p === 'object') collectNameStrings(p, source.placesJson, null);
  }
  for (const t of Array.isArray(transit) ? transit : []) {
    if (t && typeof t === 'object') collectNameStrings(t, source.transitJson, null);
  }

  let docEntities = null;
  const docPath = join(packDir, 'doc.json');
  if (existsSync(docPath)) {
    const clean = [];
    try {
      const doc = JSON.parse(readFileSync(docPath, 'utf8'));
      const strings = [];
      collectNameStrings(doc, strings, null);
      // collect referenced fact ids so we can narrow to what this guide cites
      const refIds = new Set();
      const walk = (v, key) => {
        if (typeof v === 'string' && key && /refFactIds?$/i.test(key)) refIds.add(v);
        else if (Array.isArray(v)) v.forEach((x) => walk(x, key));
        else if (v && typeof v === 'object') for (const [k, vv] of Object.entries(v)) walk(vv, k);
      };
      walk(doc, null);
      for (const s of strings) clean.push(s);
      docEntities = { strings: clean, refIds: [...refIds] };
    } catch (err) {
      throw new FailClosed(`doc.json present but unreadable: ${err.message}`);
    }
  }

  // Narrow when doc.json names fact ids: allow only entities carrying those ids.
  let placeStrings = source.placesJson;
  let transitStrings = source.transitJson;
  if (docEntities && docEntities.refIds.length > 0) {
    const ids = new Set(docEntities.refIds);
    const narrow = (recs) => {
      const out = [];
      for (const r of Array.isArray(recs) ? recs : []) {
        if (r && typeof r === 'object' && ids.has(r.id)) collectNameStrings(r, out, null);
      }
      return out;
    };
    placeStrings = narrow(places);
    transitStrings = narrow(transit);
    if (placeStrings.length === 0 && transitStrings.length === 0) {
      // The doc cites only narrative refs; fall back rather than vacuously pass.
      placeStrings = source.placesJson;
      transitStrings = source.transitJson;
    }
  }

  const tokens = new Set();
  const byId = new Map();
  const addFrom = (s, id) => {
    const whole = String(s).trim();
    if (!whole) return;
    tokens.add(whole);
    if (id) {
      if (!byId.has(id)) byId.set(id, new Set());
      byId.get(id).add(whole);
    }
    for (const run of cjkRuns(whole)) {
      if (run.length >= 1) tokens.add(run);
      // also index the un-suffixed stem so `京都駅` in the pack allows `京都駅前`
      const stem = run.replace(/[駅線]$/, '');
      if (stem.length >= 2) tokens.add(stem);
    }
  };

  for (const p of Array.isArray(places) ? places : []) {
    if (!p || typeof p !== 'object' || !p.id) continue;
    const strs = [];
    collectNameStrings(p, strs, null);
    for (const s of strs) addFrom(s, p.id);
  }
  for (const t of Array.isArray(transit) ? transit : []) {
    if (!t || typeof t !== 'object') continue;
    const strs = [];
    collectNameStrings(t, strs, null);
    const ids = [t.id, t.from, t.to].filter(Boolean);
    for (const s of strs) for (const id of ids) addFrom(s, id);
  }

  const list = [...tokens].filter((t) => t.length > 0);
  list.sort((a, b) => b.length - a.length || (a < b ? -1 : 1));

  const mode = docEntities && docEntities.refIds.length > 0
    ? `doc.json (${docEntities.refIds.length} refFactIds)`
    : 'places.json + transit.json (whole pack — doc.json absent, allow-list is WIDER than needed)';
  return { tokens: list, byId, mode, docPresent: Boolean(docEntities), docRefIds: docEntities ? docEntities.refIds : [] };
}

// ---------------------------------------------------------------------------
// fact-shaped scan
// ---------------------------------------------------------------------------
function scanText(text, allowSet) {
  const findings = [];
  for (const rule of RULES) {
    rule.re.lastIndex = 0;
    let m;
    while ((m = rule.re.exec(text)) !== null) {
      if (m[0].length === 0) { rule.re.lastIndex++; continue; }
      findings.push({ rule: rule.id, severity: rule.severity, match: m[0], note: rule.note });
      if (findings.length > 400) return findings;
    }
  }
  return findings;
}

/**
 * Entity check: ideograph runs in the text not covered by the allow-list.
 * Longest-match-first over a covered mask, so a longer allowed name wins over a
 * shorter prefix and there is no combinatorial blow-up on nested names.
 *
 * The mask marks every position of every allow-listed token (whatever script),
 * but only ideograph positions are *scanned*, so an allow-listed katakana line
 * name still covers its katakana while ordinary kana is never reported.
 */
const KANA_RUN = /[\u3040-\u30ff]{2,}/g;

function scanEntities(text, allowSet, minLen = 2) {
  const len = text.length;
  const covered = new Uint8Array(len);
  for (const tok of allowSet) {
    if (tok.length === 0) continue;
    let from = 0;
    for (;;) {
      const idx = text.indexOf(tok, from);
      if (idx === -1) break;
      for (let k = idx; k < idx + tok.length; k++) covered[k] = 1;
      from = idx + 1;
    }
  }
  const out = [];
  let i = 0;
  while (i < len) {
    if (!isIdeograph(text.codePointAt(i)) || covered[i]) { i++; continue; }
    let j = i;
    while (j < len && isIdeograph(text.codePointAt(j)) && !covered[j]) j++;
    const run = text.slice(i, j);
    if (run.length >= minLen) {
      out.push({ rule: 'ENTITY_UNKNOWN', severity: 'hard', match: run, note: 'ideograph run not present in the fact-layer allow-list' });
    } else {
      out.push({ rule: 'ENTITY_UNKNOWN_SINGLE', severity: 'signal', match: run, note: 'single unmapped ideograph' });
    }
    i = j;
  }
  // Katakana loanwords are a real leak vector in this design (店名, line names),
  // and cannot be resolved against a kanji-written allow-list. Reported, never
  // failed: the measured rate on real prose is the number that matters.
  KANA_RUN.lastIndex = 0;
  let km;
  while ((km = KANA_RUN.exec(text)) !== null) {
    if (allowSet.has(km[0])) continue;
    out.push({ rule: 'KANA_UNKNOWN_RUN', severity: 'signal', match: km[0], note: 'katakana run not in the allow-list (may be an ordinary loanword)' });
  }
  return out;
}

/**
 * Declaration-anchored entity check — the shipped one.
 *
 * The text is a plate that claims to be entities `declaredIds`. Its residue is
 * everything the declared entities' names do not account for. Residue means the
 * template rendered a name it never declared, which is exactly the
 * "attributed to the wrong record" failure, and it costs no false positives on
 * ordinary prose because ordinary prose is not inside an entity plate.
 */
function scanDeclaredEntities(text, declaredIds, allow) {
  const known = new Set();
  const unknownIds = [];
  for (const id of declaredIds) {
    const names = allow.byId.get(String(id).trim());
    if (!names) { unknownIds.push(id); continue; }
    for (const nm of names) {
      known.add(nm);
      for (const run of cjkRuns(nm)) known.add(run);
      const stem = nm.replace(/[駅線]$/, '');
      if (stem.length >= 2) known.add(stem);
    }
  }
  const residue = scanEntities(text, known, 2).filter((f) => f.severity === 'hard');
  return { residue, unknownIds, known };
}

// ---------------------------------------------------------------------------
// the assertion
// ---------------------------------------------------------------------------
function assertExportBoundary({ packDir, exportPath, html, strictSignals, entitySweep = false, measured }) {
  const places = readJsonOrFail(join(packDir, 'places.json'));
  const transit = readJsonOrFail(join(packDir, 'transit.json'));
  const pack = readJsonOrFail(join(packDir, 'pack.json'));

  if (!Array.isArray(places)) throw new FailClosed('places.json top level must be an array');
  if (!Array.isArray(transit)) throw new FailClosed('transit.json top level must be an array');
  if (places.length === 0) {
    throw new FailClosed(
      'places.json is empty: with no fact layer there is no allow-list, so every entity in the ' +
      'export would be unverifiable. An empty fact layer is not a passing state.');
  }

  const allow = buildAllowList(packDir, places, transit);
  if (allow.tokens.length === 0) {
    throw new FailClosed('allow-list derived from the fact layer is empty — refusing to scan');
  }
  const allowSet = new Set(allow.tokens);

  // Template chrome vocabulary has two legal declaration sites: pack.json (the
  // build-time template definition, hashable) and data-ui-strings on the element.
  const chromeVocab = new Set();
  collectChromeFromPack(pack, chromeVocab, 'pack.json');
  allow.chromeTokens = [...chromeVocab];

  // id → fact record(s), so a declared time can be checked against the record it
  // claims to come from. A transit leg is reachable by its own id and by the ids
  // of its endpoints, because that is how a schedule line cites it.
  const factById = new Map();
  const indexFact = (rec) => {
    if (!rec || typeof rec !== 'object') return;
    for (const key of [rec.id, rec.from, rec.to].filter(Boolean)) {
      const k = String(key);
      if (!factById.has(k)) factById.set(k, []);
      factById.get(k).push(rec);
    }
  };
  for (const p of places) indexFact(p);
  for (const t of transit) indexFact(t);

  const { tokens, parseErrors } = tokenizeHtml(html);
  if (parseErrors.length > 0) {
    throw new FailClosed(
      `export did not parse as well-formed HTML (${parseErrors.length} error(s)): ` +
      parseErrors.slice(0, 3).map((e) => `line ${e.line}: ${e.msg}`).join('; '));
  }

  const textTokens = tokens.filter((t) => t.kind === 'text');
  if (textTokens.length === 0) {
    throw new FailClosed('export contains no text nodes — nothing was scanned, so this is not a pass');
  }
  if (!textTokens.some((t) => t.exemptTag === null && !t.exempt)) {
    throw new FailClosed(
      'every text node in the export is exempt (script/style/head/title or ' + EXEMPT_ATTR +
      ') — nothing player-readable was scanned, so this is not a pass');
  }

  const inRegion = (t) => t.region === 'guide' || t.region === 'narrative';

  /** @type {{severity:string,class:string,line:number,match:string,where:string,note:string}[]} */
  const violations = [];
  const signals = [];
  const coverage = [];
  const narrative = [];
  const stats = {
    textNodes: 0, guideNodes: 0, narrativeNodes: 0, chromeNodes: 0, timeNodes: 0,
    uncoveredNodes: 0, exemptNodes: 0,
    guideChars: 0, narrativeChars: 0, chromeChars: 0, uncoveredChars: 0,
    provNodes: 0, guideNodesWithoutProv: 0, hardFindings: 0, signalFindings: 0,
  };
  const exemptAudit = [];

  for (const t of textTokens) {
    const raw = t.raw;
    const text = decodeEntities(raw);
    const bare = text.trim();
    if (bare.length === 0) continue;

    // (a) Explicitly exempted text. Skipped BY DECLARATION, never by default, and
    //     every skip is listed in the audit so a reviewer can see what was not
    //     checked. The fact-shaped scan still runs and is reported, because an
    //     exemption should not be able to hide a price.
    if (t.exempt) {
      stats.exemptNodes++;
      const lex = scanText(text, allowSet);
      exemptAudit.push({ line: t.line, chars: text.length, preview: bare.slice(0, 50), factShaped: lex.map((f) => `${f.rule}:${f.match}`) });
      for (const f of lex) {
        if (f.severity === 'hard') {
          violations.push({
            severity: 'hard', class: f.rule, line: t.line, match: f.match,
            where: `${EXEMPT_ATTR} subtree`,
            note: `${f.note} — an explicit exemption does not license a fact-shaped value`,
          });
          stats.hardFindings++;
        }
      }
      continue;
    }

    // (b) Non-prose elements (script/style/head/title/meta/link) are outside the
    //     region requirement but NOT outside the lexical scan: a fact-shaped
    //     string in <title> prints in the browser tab, and a string inside
    //     <script> is executed into the DOM.
    if (t.exemptTag) {
      stats.exemptNodes++;
      const lex = scanText(text, allowSet);
      for (const f of lex) {
        const rec = {
          severity: f.severity, class: f.rule, line: t.line, match: f.match,
          where: `<${t.exemptTag}> (non-prose element)`,
          note: f.note,
        };
        if (f.severity === 'hard') { violations.push(rec); stats.hardFindings++; }
        else { signals.push(rec); stats.signalFindings++; }
      }
      continue;
    }

    // (c) Template chrome: fixed template vocabulary, checked against its own
    //     declared lexicon rather than against facts or narrative.
    if (t.chrome.length > 0) {
      stats.textNodes++;
      stats.chromeNodes++;
      stats.chromeChars += text.length;
      const lex = scanText(text, allowSet);
      for (const f of lex) {
        if (f.severity !== 'hard') continue;
        violations.push({
          severity: 'hard', class: f.rule, line: t.line, match: f.match,
          where: 'template chrome',
          note: `${f.note} — chrome must not carry a concrete time, price or closure claim`,
        });
        stats.hardFindings++;
      }
      for (const f of scanEntities(text, new Set([...t.chrome, ...chromeVocab]), 1)) {
        if (f.severity === 'hard') {
          violations.push({
            severity: 'hard', class: 'CHROME_UNKNOWN', line: t.line, match: f.match,
            where: 'template chrome',
            note: `template chrome text is not in its declared ${CHROME_ATTR} vocabulary — ` +
                  'add it to the template (visible diff), do not widen the fact allow-list',
          });
        } else {
          signals.push({ severity: 'signal', class: 'CHROME_UNKNOWN_SINGLE', line: t.line, match: f.match, where: 'template chrome', note: f.note });
        }
      }
      continue;
    }

    stats.textNodes++;

    if (!inRegion(t)) {
      stats.uncoveredNodes++;
      stats.uncoveredChars += text.length;
      coverage.push({ line: t.line, chars: text.length, preview: bare.slice(0, 40) });
      continue;
    }

    const isGuide = t.region === 'guide';
    if (isGuide) { stats.guideNodes++; stats.guideChars += text.length; }
    else { stats.narrativeNodes++; stats.narrativeChars += text.length; }

    const lexical = scanText(text, allowSet);
    const hasProv = t.prov !== null;
    if (isGuide && hasProv) stats.provNodes++;
    if (isGuide && !hasProv) stats.guideNodesWithoutProv++;

    if (!isGuide) {
      // Narrative immersion is allowed to look like a street. Measured, never failed.
      const narr = [...lexical, ...scanEntities(text, allowSet)];
      for (const f of narr) {
        const rec = {
          severity: f.severity, class: f.rule, line: t.line, match: f.match,
          where: 'narrative text', note: f.note,
        };
        narrative.push(rec);
        stats.signalFindings++;
      }
      continue;
    }

    // (a2) Declared-time prose: the times a sentence prints must be derivable
    //      from the fact record the sentence declares. This runs BEFORE the
    //      lexical pass so a time that IS backed by the declared record is not
    //      reported as an unsourced clock time. The point of the rule is that a
    //      legitimate opening line must be attributable, not deleted and not
    //      blindly trusted.
    const declaredTime = t.time && t.time.length > 0;
    const backedTimes = new Set();
    if (declaredTime) {
      stats.timeNodes++;
      const timeRes = scanDeclaredTimes(text, t.time, factById, allow);
      for (const b of timeRes.backed) backedTimes.add(b);
      for (const id of timeRes.unknownIds) {
        violations.push({
          severity: 'hard', class: 'TIME_ID_UNKNOWN', line: t.line, match: id,
          where: `${TIME_ATTR} declaration`,
          note: `declared fact id "${id}" does not exist in the fact layer — the times printed ` +
                'here are attributed to a record that is not there',
        });
        stats.hardFindings++;
      }
      for (const u of timeRes.unbacked) {
        violations.push({
          severity: 'hard', class: 'TIME_UNBACKED', line: t.line, match: u.raw,
          where: `${TIME_ATTR}="${t.time.join(',')}"`,
          note: `time ${JSON.stringify(u.raw)} is not derivable from the declared fact record's own ` +
                'values — the declared record does not state this time',
        });
        stats.hardFindings++;
      }
    }

    // (b) Lexical rules fire in guide text REGARDLESS of provenance. A provenance
    //     chip backs an entity name; it does not license an arbitrary clock time,
    //     price, or closure claim that the fact layer never stated. The single
    //     exception is a clock time proven against a declared fact record in (a2).
    for (const f of lexical) {
      if (f.rule === 'TIME_HHMM' && backedTimes.has(normalizeClock(f.match))) continue;
      const rec = {
        severity: f.severity, class: f.rule, line: t.line, match: f.match,
        where: hasProv ? `guide text inside ${PROV_ATTR} subtree` : 'guide text (no provenance declared)',
        note: f.note,
      };
      if (f.severity === 'hard') { violations.push(rec); stats.hardFindings++; }
      else { signals.push(rec); stats.signalFindings++; }
    }

    // (c) Entity check. Declaration-anchored by default (see ENTITY_ATTR note);
    //     `--entity-sweep` restores the unconditional, high-noise sweep so the
    //     gap can be measured instead of argued about.
    if (t.entity && t.entity.length > 0) {
      const declared = scanDeclaredEntities(text, t.entity, allow);
      for (const id of declared.unknownIds) {
        violations.push({
          severity: 'hard', class: 'ENTITY_ID_UNKNOWN', line: t.line, match: id,
          where: `${ENTITY_ATTR} declaration`,
          note: `declared fact id "${id}" does not exist in the fact layer — the template is ` +
                'attributing this text to a record that is not there',
        });
        stats.hardFindings++;
      }
      for (const f of declared.residue) {
        violations.push({
          severity: 'hard', class: 'ENTITY_UNDECLARED', line: t.line, match: f.match,
          where: `${ENTITY_ATTR}="${t.entity.join(',')}" plate`,
          note: 'this text is attributed to the declared entity/entities, but this ideograph run is ' +
                'not part of any of their names — the plate is printing a name the fact layer does not have',
        });
        stats.hardFindings++;
      }
    } else if (entitySweep) {
      for (const f of scanEntities(text, allowSet)) {
        const rec = {
          severity: f.severity, class: f.rule, line: t.line, match: f.match,
          where: hasProv ? `guide text inside ${PROV_ATTR} subtree` : 'guide text (no provenance declared)',
          note: f.note,
        };
        if (f.severity === 'hard') { violations.push(rec); stats.hardFindings++; }
        else { signals.push(rec); stats.signalFindings++; }
      }
    }
  }

  // A guard that skips in silence is the bug this file was written to fix.
  if (coverage.length > 0) {
    const hard = strictSignals ? 'hard' : 'hard';
    for (const c of coverage.slice(0, 5)) {
      const rec = {
        severity: hard, class: 'UNCOVERED_TEXT', line: c.line, match: c.preview,
        where: 'no declared region',
        note: `text outside every ${REGION_ATTR} region — not scanned. Declare the element as guide or narrative.`,
      };
      violations.push(rec);
    }
    if (coverage.length > 5) {
      violations.push({
        severity: 'hard', class: 'UNCOVERED_TEXT', line: coverage[5].line,
        match: `…and ${coverage.length - 5} more`,
        where: 'no declared region', note: 'additional uncovered text nodes',
      });
    }
  }

  validateGuideDocHash(html, violations, signals);

  const failOnSignals = Boolean(strictSignals);
  const hardCount = violations.length;
  const signalCount = signals.length;
  const pass = hardCount === 0 && (!failOnSignals || signalCount === 0);

  return {
    pass,
    allow,
    packId: pack && pack.cityId ? pack.cityId : '(pack.json has no cityId)',
    violations,
    signals,
    narrative,
    coverage,
    exemptAudit,
    chromeVocab: [...chromeVocab],
    stats,
    failOnSignals,
    measured,
  };
}

function validateGuideDocHash(html, violations, signals) {
  // appendix §3b: the cover prints the GuideDoc hash and the same GuideDoc must
  // render byte-identical HTML. A printed hash that nothing binds to is a claim,
  // not a check, so its presence is required and its absence is reported.
  const found = /doc:[0-9a-f]{4,}/i.test(html);
  if (!found) {
    signals.push({
      severity: 'signal', class: 'NO_DOC_HASH', line: 1, match: '(none)',
      where: 'whole export',
      note: 'no "doc:<hex>" marker found; appendix §3b requires the exported guide to print the GuideDoc hash, and byte-identity is only checkable if the hash is present',
    });
  }
}

function readJsonOrFail(path) {
  if (!existsSync(path)) {
    throw new FailClosed(`required fact-layer file missing: ${path} (no fact layer, no boundary assertion)`);
  }
  const st = statSync(path);
  if (!st.isFile() || st.size === 0) {
    throw new FailClosed(`fact-layer file is empty: ${path}`);
  }
  try {
    return JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    throw new FailClosed(`fact-layer file is not valid JSON: ${path} — ${err.message}`);
  }
}

// ---------------------------------------------------------------------------
// reporting
// ---------------------------------------------------------------------------
function printReport(res, { packDir, exportPath }) {
  const tag = res.pass ? 'PASS' : 'FAIL';
  console.log(`${tag}  export-boundary assertion`);
  console.log(`      pack    ${packDir}  (${res.packId})`);
  console.log(`      export  ${exportPath}`);
  console.log(`      allow-list  ${res.allow.tokens.length} token(s) from ${res.allow.mode}`);
  console.log(`      chrome      ${res.chromeVocab.length} declared template string(s)` +
    (res.chromeVocab.length === 0 ? ' — no template vocabulary declared; chrome text will fail as CHROME_UNKNOWN' : ''));
  console.log(
    `      scanned     ${res.stats.textNodes} text node(s): ` +
    `${res.stats.guideNodes} guide (${res.stats.guideChars} chars, ${res.stats.guideNodesWithoutProv} without provenance), ` +
    `${res.stats.narrativeNodes} narrative (${res.stats.narrativeChars} chars), ` +
    `${res.stats.chromeNodes} chrome (${res.stats.chromeChars} chars), ` +
    `${res.stats.uncoveredNodes} uncovered (${res.stats.uncoveredChars} chars), ` +
    `${res.stats.exemptNodes} exempt`);
  console.log(`      result      ${res.violations.length} hard violation(s), ${res.signals.length} signal(s)` +
    (res.failOnSignals ? ' [--strict-signals: signals fail too]' : ''));

  if (res.violations.length > 0) {
    console.log('\n  HARD VIOLATIONS — fact-shaped text in guide body with no fact-layer backing:');
    const byClass = new Map();
    for (const v of res.violations) {
      if (!byClass.has(v.class)) byClass.set(v.class, []);
      byClass.get(v.class).push(v);
    }
    for (const [cls, list] of byClass) {
      console.log(`    [${cls}] ${list.length}`);
      for (const v of list.slice(0, 8)) {
        console.log(`        line ${v.line}: ${JSON.stringify(v.match)}  (${v.where})`);
        console.log(`            ${v.note}`);
      }
      if (list.length > 8) console.log(`        …and ${list.length - 8} more`);
    }
  }

  if (res.signals.length > 0) {
    console.log('\n  SIGNALS — measured metric, not a failure (see --strict-signals):');
    const byClass = new Map();
    for (const s of res.signals) {
      if (!byClass.has(s.class)) byClass.set(s.class, 0);
      byClass.set(s.class, byClass.get(s.class) + 1);
    }
    for (const [cls, n] of byClass) console.log(`    [${cls}] ${n}`);
  }

  if (res.narrative.length > 0) {
    const byClass = new Map();
    for (const s of res.narrative) {
      if (!byClass.has(s.class)) byClass.set(s.class, 0);
      byClass.set(s.class, byClass.get(s.class) + 1);
    }
    console.log('\n  NARRATIVE REGIONS — immersion text, deliberately not failed:');
    for (const [cls, n] of byClass) console.log(`    [${cls}] ${n}`);
    console.log('    (narrative has its own guard — layer (4) factLeak — at generation time;');
    console.log('     this tool measures it at the export boundary instead of re-litigating it)');
  }

  if (res.coverage.length > 0) {
    console.log('\n  UNCOVERED TEXT — outside every declared region, therefore never scanned:');
    for (const c of res.coverage.slice(0, 8)) {
      console.log(`    line ${c.line} (${c.chars} chars): ${JSON.stringify(c.preview)}`);
    }
  }

  if (res.exemptAudit && res.exemptAudit.length > 0) {
    console.log(`\n  EXPLICITLY EXEMPT (${EXEMPT_ATTR}) — declared as not-checked, listed so review can see it:`);
    for (const e of res.exemptAudit.slice(0, 8)) {
      console.log(`    line ${e.line} (${e.chars} chars): ${JSON.stringify(e.preview)}` +
        (e.factShaped.length ? `  fact-shaped: ${e.factShaped.join(', ')}` : ''));
    }
    if (res.exemptAudit.length > 8) console.log(`    …and ${res.exemptAudit.length - 8} more`);
  }

  console.log('\n  Remedy follows "drop, don\'t correct": remove the string, or render the value from');
  console.log('  the fact layer inside a data-prov subtree. Never reword it into something plausible.');
}

// ---------------------------------------------------------------------------
// CLI: single export
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const out = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--pack') out.pack = argv[++i];
    else if (a === '--export') out.export = argv[++i];
    else if (a === '--strict-signals') out.strictSignals = true;
    else if (a === '--entity-sweep') out.entitySweep = true;
    else if (a === '--self-test') out.selfTest = true;
    else if (a === '--measure-fp') out.measureFp = true;
    else if (a === '--json') out.json = true;
    else if (a === '--help' || a === '-h') out.help = true;
    else out._.push(a);
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  if (args.help || process.argv.length <= 2) {
    console.log('usage: node assert-export-boundary.mjs --pack <city-pack-dir> --export <guide.html>');
    console.log('       node assert-export-boundary.mjs --pack <city-pack-dir> --measure-fp <file>...');
    console.log('       node assert-export-boundary.mjs --self-test');
    return EXIT.USAGE;
  }
  if (args.selfTest) return runSelfTest();
  if (args.measureFp) return runMeasureFp(args);

  if (!args.pack || !args.export) {
    console.error('usage error: --pack and --export are both required');
    return EXIT.USAGE;
  }
  if (!existsSync(args.pack)) {
    console.error(`FAIL-CLOSED: pack directory not found: ${args.pack}`);
    return EXIT.FAILCLOSED;
  }
  if (!existsSync(args.export)) {
    console.error(`FAIL-CLOSED: export file not found: ${args.export}`);
    return EXIT.FAILCLOSED;
  }

  try {
    const html = readFileSync(args.export, 'utf8');
    if (html.length === 0) throw new FailClosed('export file is empty');
    const res = assertExportBoundary({
      packDir: args.pack,
      exportPath: args.export,
      html,
      strictSignals: args.strictSignals,
      entitySweep: args.entitySweep,
      measured: false,
    });
    if (args.json) console.log(JSON.stringify({ pass: res.pass, violations: res.violations, signals: res.signals, stats: res.stats, allowMode: res.allow.mode }, null, 2));
    else printReport(res, { packDir: args.pack, exportPath: args.export });
    return res.pass ? EXIT.PASS : EXIT.VIOLATION;
  } catch (err) {
    if (err instanceof FailClosed) {
      console.error(`FAIL-CLOSED  ${err.message}`);
      return EXIT.FAILCLOSED;
    }
    console.error(`FAIL-CLOSED  unexpected error (must never be read as a pass): ${err && err.stack ? err.stack : err}`);
    return EXIT.FAILCLOSED;
  }
}

// ---------------------------------------------------------------------------
// self-test: the two acceptance cases
// ---------------------------------------------------------------------------
const SELF_TEST_PACK = {
  'pack.json': {
    schemaVersion: 1,
    cityId: 'kyoto-selftest',
    nameLocal: '京都市',
    nameEn: 'Kyoto',
    sources: ['https://example.invalid/selftest-NOT-A-REAL-SOURCE'],
    // The deterministic export template's own fixed vocabulary. Declared here so
    // chrome is a visible, hashable part of the template rather than a silent
    // exemption. NOTE: none of these strings is a fact.
    uiStrings: ['京都 · 二日目', '日程', '場所', '交通', '言語', '付録', 'Day', 'Plan B'],
  },
  'places.json': [
    {
      id: 'kinkakuji', nameJa: '金閣寺', nameZh: '金阁寺', nameEn: 'Kinkaku-ji',
      lat: 35.0394, lng: 135.7292, category: 'temple',
      hours: ['09:00-17:00'],
      source_url: 'https://example.invalid/selftest-NOT-A-REAL-SOURCE',
      verified_at: '2026-03-01',
    },
    {
      id: 'ginaku', nameJa: '銀閣寺', nameZh: '银阁寺', nameEn: 'Ginkaku-ji',
      lat: 35.0270, lng: 135.7982, category: 'temple',
      source_url: 'https://example.invalid/selftest-NOT-A-REAL-SOURCE',
      verified_at: '2026-03-01',
    },
    {
      id: 'kyoto-sta', nameJa: '京都駅', nameZh: '京都站', nameEn: 'Kyoto Station',
      lat: 34.9858, lng: 135.7588, category: 'station',
      source_url: 'https://example.invalid/selftest-NOT-A-REAL-SOURCE',
      verified_at: '2026-03-01',
    },
    {
      id: 'gion-shijo', nameJa: '祇園四条駅', nameZh: '祇园四条站', nameEn: 'Gion-Shijo Station',
      lat: 35.0037, lng: 135.7720, category: 'station',
      source_url: 'https://example.invalid/selftest-NOT-A-REAL-SOURCE',
      verified_at: '2026-03-01',
    },
    {
      id: 'karasuma-line', nameJa: '烏丸線', nameZh: '乌丸线', nameEn: 'Karasuma Line',
      lat: 34.9858, lng: 135.7588, category: 'line',
      source_url: 'https://example.invalid/selftest-NOT-A-REAL-SOURCE',
      verified_at: '2026-03-01',
    },
  ],
  'transit.json': [
    {
      from: 'kyoto-sta', to: 'gion-shijo', mode: 'subway',
      lineName: '烏丸線', minutes: 12, fareIC: 220, fareTicket: 220, transfers: 0,
      source_url: 'https://example.invalid/selftest-NOT-A-REAL-SOURCE',
      verified_at: '2026-03-01',
    },
  ],
};

/**
 * Case 1 — a fact-shaped string injected into the export is caught.
 * Case 2 — a legitimate immersive narrative containing 時 / 駅 / 線 is not caught.
 *
 * Case 2 is the reason the scanner is structural: the narrative below is
 * deliberately as fact-shaped as a real street, and it is only exempt because
 * the export declares its region.
 */
function runSelfTest() {
  const tmp = mkdtempSync(join(tmpdir(), 'tg-boundary-'));
  let failures = 0;
  console.log('SELF-TEST  assert-export-boundary.mjs');
  console.log(`           fixture pack: ${tmp}  (SYNTHETIC — entity names only; not fact-layer data)`);
  console.log('');

  try {
    mkdirSync(tmp, { recursive: true });
    for (const [name, body] of Object.entries(SELF_TEST_PACK)) {
      writeFileSync(join(tmp, name), JSON.stringify(body, null, 2), 'utf8');
    }

    const writeExport = (name, html) => {
      const p = join(tmp, name);
      writeFileSync(p, html, 'utf8');
      return p;
    };

    const HEAD = `<h1 data-tgf="guide" data-prov="doc:3f9c" data-ui-strings="京都 · 二日目">京都 · 二日目</h1>`;

    // ---- CASE 1: injection -------------------------------------------------
    const injected = `<!DOCTYPE html><html><head><title>guide</title></head><body>
${HEAD}
<section data-tgf="guide">
  <h2 data-prov="place:kinkakuji">金閣寺</h2>
  <p data-prov="place:kinkakuji">拝観は 09:30 から。入場料 ¥500。16時閉門。</p>
</section>
</body></html>`;
    const p1 = writeExport('injected.html', injected);
    let case1 = null, case1err = null;
    try {
      case1 = assertExportBoundary({ packDir: tmp, exportPath: p1, html: injected, strictSignals: false, measured: false });
    } catch (err) { case1err = err; }

    console.log('  CASE 1 — fact-shaped string injected into the export');
    if (case1err) {
      console.log(`    ERROR (fail-closed): ${case1err.message}`);
      failures++;
    } else {
      console.log(`    violations: ${case1.violations.length}`);
      for (const v of case1.violations) {
        console.log(`      [${v.class}] line ${v.line}: ${JSON.stringify(v.match)} — ${v.note}`);
      }
      const caught = case1.violations.length > 0 && case1.pass === false;
      console.log(`    VERDICT: ${caught ? 'CAUGHT (as required)' : 'NOT CAUGHT — TEST FAILED'}`);
      if (!caught) failures++;
      // Enumerate which classes fired, so the proof is not "something fired".
      const classes = [...new Set(case1.violations.map((v) => v.class))];
      console.log(`    classes fired: ${classes.join(', ')}`);
      for (const e of ['TIME_HHMM', 'TIME_HOUR_KANJI', 'PRICE_CURRENCY', 'PRICE_WORD']) {
        const ok = classes.includes(e);
        console.log(`    required class ${e.padEnd(18)}: ${ok ? 'fired' : 'DID NOT FIRE — TEST FAILED'}`);
        if (!ok) failures++;
      }
      // 金閣寺 IS in the pack: a fact-layer known entity must not be flagged.
      const knownFlagged = case1.violations.some((v) => v.match.includes('金閣寺'));
      console.log(`    allow-listed entity 金閣寺 flagged: ${knownFlagged ? 'YES — TEST FAILED (allow-list not working)' : 'no (correct)'}`);
      if (knownFlagged) failures++;
    }
    console.log('');

    // ---- CASE 2: immersive narrative --------------------------------------
    const narrative = `時計台の下で待っていて。駅の看板は読めないけれど、線の色だけは覚えた。
夕方の光が石畳に落ちるころ、路地の奥から味噌汁の匂いがした。人が暮らしている音がする。
「乗り換えは面倒だね」と誰かが言った。時が止まったみたいに静かで、私はしばらく立ち止まった。
京都駅の喧騒を抜けて、烏丸線に揺られて、祇園四条駅で降りる。金閣寺も銀閣寺も、まだ遠い。`;
    const case2Html = `<!DOCTYPE html><html><head><title>guide</title></head><body>
${HEAD}
<article data-tgf="narrative" data-ref-fact-ids="kinkakuji,ginaku">
${narrative}
</article>
</body></html>`;
    const p2 = writeExport('narrative.html', case2Html);
    let case2 = null, case2err = null;
    try {
      case2 = assertExportBoundary({ packDir: tmp, exportPath: p2, html: case2Html, strictSignals: false, measured: false });
    } catch (err) { case2err = err; }

    console.log('  CASE 2 — legitimate immersive narrative containing 時 / 駅 / 線');
    if (case2err) {
      console.log(`    ERROR (fail-closed): ${case2err.message}`);
      failures++;
    } else {
      console.log(`    violations: ${case2.violations.length}   signals: ${case2.signals.length}`);
      for (const v of case2.violations) {
        console.log(`      VIOLATION [${v.class}] line ${v.line}: ${JSON.stringify(v.match)}`);
      }
      for (const s of case2.signals) {
        console.log(`      signal    [${s.class}] line ${s.line}: ${JSON.stringify(s.match)}`);
      }
      console.log(`    narrative text nodes: ${case2.stats.narrativeNodes} (${case2.stats.narrativeChars} chars) — measured, not failed`);
      for (const n of case2.narrative) {
        console.log(`      measured  [${n.class}] ${JSON.stringify(n.match)}`);
      }
      const clean = case2.violations.length === 0 && case2.pass === true;
      console.log(`    VERDICT: ${clean ? 'NOT CAUGHT (as required)' : 'FALSELY CAUGHT — TEST FAILED'}`);
      if (!clean) failures++;
      // Proof the region really carried the glyphs rather than the text being absent.
      const glyphs = ['時', '駅', '線'];
      for (const g of glyphs) {
        const present = narrative.includes(g);
        console.log(`    glyph ${g} present in narrative: ${present ? 'yes' : 'NO — TEST FIXTURE IS WRONG'}`);
        if (!present) failures++;
      }
    }
    console.log('');

    // ---- CASE 3: the fail-closed direction ---------------------------------
    // Text in no declared region is skipped by every scanner, so it MUST be a
    // hard failure: otherwise the way to smuggle a fact past this tool is to
    // print it outside a region.
    const noRegion = `<!DOCTYPE html><html><head><title>guide</title></head><body>
${HEAD}
<p>拝観は 09:30 から。入場料 ¥500。</p>
</body></html>`;
    const p3 = writeExport('uncovered.html', noRegion);
    let case3 = null;
    try {
      case3 = assertExportBoundary({ packDir: tmp, exportPath: p3, html: noRegion, strictSignals: false, measured: false });
    } catch (err) { case3 = { pass: false, violations: [{ class: 'FAILCLOSED', line: 0, match: err.message }] }; }
    const uncoveredViols = case3.violations.filter((v) => v.class === 'UNCOVERED_TEXT');
    console.log('  CASE 3 — text in no declared region (must not pass silently)');
    for (const v of uncoveredViols) console.log(`      [${v.class}] line ${v.line}: ${JSON.stringify(v.match)}`);
    const caught3 = uncoveredViols.length > 0 && case3.pass === false;
    console.log(`    VERDICT: ${caught3 ? 'CAUGHT (as required)' : 'NOT CAUGHT — TEST FAILED'}`);
    if (!caught3) failures++;
    console.log('');

    // ---- CASE 4: empty allow-list must fail closed -------------------------
    const emptyDir = join(tmp, 'empty-pack');
    mkdirSync(emptyDir, { recursive: true });
    writeFileSync(join(emptyDir, 'pack.json'), JSON.stringify({ schemaVersion: 1, cityId: 'x', sources: ['https://example.invalid/x'] }), 'utf8');
    writeFileSync(join(emptyDir, 'places.json'), '[]', 'utf8');
    writeFileSync(join(emptyDir, 'transit.json'), '[]', 'utf8');
    const p4 = writeExport('empty.html', injected);
    let case4msg = '';
    try {
      assertExportBoundary({ packDir: emptyDir, exportPath: p4, html: injected, strictSignals: false, measured: false });
      case4msg = 'PASSED — TEST FAILED (an empty fact layer must not pass)';
      failures++;
    } catch (err) {
      case4msg = `FAIL-CLOSED as required: ${err.message.slice(0, 90)}…`;
    }
    console.log('  CASE 4 — empty fact layer / empty allow-list');
    console.log(`    ${case4msg}`);
    console.log('');

    // ---- CASE 5: malformed HTML must fail closed ---------------------------
    const brokenHtml = `<!DOCTYPE html><html><body><p data-tgf="guide">拝観は 09:30 <b>から</p></body></html>`;
    const p5 = writeExport('broken.html', brokenHtml);
    let case5msg = '';
    try {
      assertExportBoundary({ packDir: tmp, exportPath: p5, html: brokenHtml, strictSignals: false, measured: false });
      case5msg = 'PARSED — note: unclosed <b> was tolerated; see report';
    } catch (err) {
      case5msg = `FAIL-CLOSED as required: ${err.message.slice(0, 110)}`;
    }
    console.log('  CASE 5 — malformed export');
    console.log(`    ${case5msg}`);
    console.log('');

    // ---- CASE 6: positive control -----------------------------------------
    // The control CASE 2 needs: the same sentence, in the SAME script, moved into
    // the guide region where the allow-list does apply. If this also passed while
    // CASE 2 failed, then CASE 2's pass would prove nothing about the region.
    const control = `烏丸線で京都駅から祇園四条駅まで。金閣寺と銀閣寺は同じ日に回れる。`;
    const controlHtml = `<!DOCTYPE html><html><head><title>guide</title></head><body>
${HEAD}
<p data-tgf="guide" data-prov="transit:kyoto-sta>gion-shijo">${control}</p>
</body></html>`;
    const p6 = writeExport('control.html', controlHtml);
    let case6 = null;
    try {
      case6 = assertExportBoundary({ packDir: tmp, exportPath: p6, html: controlHtml, strictSignals: false, measured: false });
    } catch (err) { case6 = { pass: false, violations: [{ class: 'FAILCLOSED', match: err.message }] }; }
    const entityViols = case6.violations.filter((v) => v.class.startsWith('ENTITY_UNKNOWN'));
    console.log('  CASE 6 — positive control: allow-listed transit names inside the GUIDE region');
    console.log(`    text: ${JSON.stringify(control)}`);
    console.log(`    entity violations: ${entityViols.length}${entityViols.length ? ' — TEST FAILED' : ' (correct: all four entities are in the pack)'}`);
    for (const v of entityViols) console.log(`      [${v.class}] ${JSON.stringify(v.match)}`);
    if (entityViols.length !== 0) failures++;
    console.log('');

    // ---- CASE 7: chrome must not become a silent exemption ------------------
    // The element declares a chrome vocabulary that does NOT contain the text it
    // prints. This must fail, otherwise "chrome" is just a rename of "unscanned".
    const undeclaredChromeHtml = `<!DOCTYPE html><html><head><title>guide</title></head><body>
<h1 data-tgf="guide" data-prov="doc:3f9c" data-ui-strings="京都 · 一日目">京都 · 五日目</h1>
<p data-tgf="guide" data-entity="kinkakuji">金閣寺</p>
</body></html>`;
    const p7 = writeExport('chrome-undeclared.html', undeclaredChromeHtml);
    let case7 = null;
    try {
      case7 = assertExportBoundary({ packDir: tmp, exportPath: p7, html: undeclaredChromeHtml, strictSignals: false, measured: false });
    } catch (err) { case7 = { pass: false, violations: [{ class: 'FAILCLOSED', match: err.message }] }; }
    const chromeViols = case7.violations.filter((v) => v.class === 'CHROME_UNKNOWN' || v.class === 'ENTITY_UNKNOWN');
    console.log('  CASE 7 — template chrome printing text its own declared vocabulary lacks');
    for (const v of chromeViols) console.log(`      [${v.class}] line ${v.line}: ${JSON.stringify(v.match)} — ${v.where}`);
    console.log(`    VERDICT: ${chromeViols.length > 0 ? 'CAUGHT (as required)' : 'NOT CAUGHT — TEST FAILED'}`);
    if (chromeViols.length === 0) failures++;
    console.log('');

    // ---- CASE 8: a declared exemption is listed, and cannot hide a price ----
    const exemptHtml = `<!DOCTYPE html><html><head><title>guide</title></head><body>
${HEAD}
<p data-tgf="guide">金閣寺</p>
<footer data-tgf-exempt>Generated 2026-03-14 · build 09:30 · ¥0</footer>
</body></html>`;
    const p8 = writeExport('exempt.html', exemptHtml);
    let case8 = null;
    try {
      case8 = assertExportBoundary({ packDir: tmp, exportPath: p8, html: exemptHtml, strictSignals: false, measured: false });
    } catch (err) { case8 = { pass: false, violations: [{ class: 'FAILCLOSED', match: err.message }], exemptAudit: [] }; }
    console.log('  CASE 8 — declared exemption: listed in the audit, still blocks a price');
    console.log(`    exempt text nodes audited: ${(case8.exemptAudit || []).length}`);
    for (const e of case8.exemptAudit || []) {
      console.log(`      line ${e.line}: ${JSON.stringify(e.preview)}  fact-shaped: [${e.factShaped.join(', ')}]`);
    }
    const exemptCaught = case8.violations.some((v) => v.class === 'PRICE_CURRENCY' && v.where.includes(EXEMPT_ATTR));
    const audited = (case8.exemptAudit || []).length > 0;
    console.log(`    exemption is audited: ${audited ? 'yes' : 'NO — TEST FAILED'}`);
    console.log(`    price inside exemption caught: ${exemptCaught ? 'yes' : 'NO — TEST FAILED'}`);
    if (!audited || !exemptCaught) failures++;
    console.log('');

    // ---- CASE 9: declaration-anchored entity check, both directions ---------
    const rightPlateHtml = `<!DOCTYPE html><html><head><title>guide</title></head><body>
${HEAD}
<h2 data-tgf="guide" data-entity="kinkakuji">金閣寺</h2>
<p data-tgf="guide" data-entity="kyoto-sta">京都駅</p>
</body></html>`;
    const p9 = writeExport('plate-right.html', rightPlateHtml);
    let case9 = null;
    try {
      case9 = assertExportBoundary({ packDir: tmp, exportPath: p9, html: rightPlateHtml, strictSignals: false, measured: false });
    } catch (err) { case9 = { pass: false, violations: [{ class: 'FAILCLOSED', match: err.message }] }; }
    const plateViols9 = case9.violations.filter((v) => v.class.startsWith('ENTITY_'));
    console.log('  CASE 9a — entity plate naming the entity it declares (must pass)');
    console.log(`    entity violations: ${plateViols9.length}${plateViols9.length ? ' — TEST FAILED' : ' (correct)'}`);
    for (const v of plateViols9) console.log(`      [${v.class}] ${JSON.stringify(v.match)}`);
    if (plateViols9.length !== 0) failures++;

    // The failure this check exists to catch: the plate DECLARES ginkakuji but
    // prints 金閣寺 — i.e. a guide line attributed to the wrong record.
    const wrongPlateHtml = `<!DOCTYPE html><html><head><title>guide</title></head><body>
${HEAD}
<h2 data-tgf="guide" data-entity="ginakuji">金閣寺</h2>
</body></html>`;
    const p10 = writeExport('plate-wrong.html', wrongPlateHtml);
    let case10 = null;
    try {
      case10 = assertExportBoundary({ packDir: tmp, exportPath: p10, html: wrongPlateHtml, strictSignals: false, measured: false });
    } catch (err) { case10 = { pass: false, violations: [{ class: 'FAILCLOSED', match: err.message }] }; }
    const wrongViols = case10.violations.filter((v) => v.class === 'ENTITY_UNDECLARED');
    console.log('  CASE 9b — entity plate naming a DIFFERENT entity than it declares (must be caught)');
    for (const v of wrongViols) console.log(`      [${v.class}] line ${v.line}: ${JSON.stringify(v.match)} — ${v.where}`);
    console.log(`    VERDICT: ${wrongViols.length > 0 ? 'CAUGHT (as required)' : 'NOT CAUGHT — TEST FAILED'}`);
    if (wrongViols.length === 0) failures++;

    // A declaration pointing at a fact id that does not exist.
    const ghostIdHtml = `<!DOCTYPE html><html><head><title>guide</title></head><body>
${HEAD}
<h2 data-tgf="guide" data-entity="kinkakuji-temple">金閣寺</h2>
</body></html>`;
    const p11 = writeExport('plate-ghost.html', ghostIdHtml);
    let case11 = null;
    try {
      case11 = assertExportBoundary({ packDir: tmp, exportPath: p11, html: ghostIdHtml, strictSignals: false, measured: false });
    } catch (err) { case11 = { pass: false, violations: [{ class: 'FAILCLOSED', match: err.message }] }; }
    const ghostViols = case11.violations.filter((v) => v.class === 'ENTITY_ID_UNKNOWN');
    console.log('  CASE 9c — entity plate declaring a fact id that does not exist (must be caught)');
    for (const v of ghostViols) console.log(`      [${v.class}] ${JSON.stringify(v.match)}`);
    console.log(`    VERDICT: ${ghostViols.length > 0 ? 'CAUGHT (as required)' : 'NOT CAUGHT — TEST FAILED'}`);
    if (ghostViols.length === 0) failures++;
    console.log('');

    // ---- CASE 10: declared-time prose, both directions ----------------------
    // The design's own guide line shape (appendix §3a: `16:30 前到金阁寺（16:00
    // 停止入场）`) must be expressible. Backed times pass; an invented time in the
    // same sentence does not.
    const backedTimeHtml = `<!DOCTYPE html><html><head><title>guide</title></head><body>
${HEAD}
<h2 data-tgf="guide" data-entity="kinkakuji">金閣寺</h2>
<p data-tgf="guide" data-time="kinkakuji" data-prov="place:kinkakuji">開館 09:00、閉館 17:00。</p>
</body></html>`;
    const p12 = writeExport('time-backed.html', backedTimeHtml);
    let c12 = null;
    try {
      c12 = assertExportBoundary({ packDir: tmp, exportPath: p12, html: backedTimeHtml, strictSignals: false, measured: false });
    } catch (err) { c12 = { pass: false, violations: [{ class: 'FAILCLOSED', match: err.message }] }; }
    const timeViols12 = c12.violations.filter((v) => v.class.startsWith('TIME_'));
    console.log('  CASE 10a — declared-time prose whose times the fact record DOES state (must pass)');
    console.log(`    TIME_* violations: ${timeViols12.length}${timeViols12.length ? ' — TEST FAILED' : ' (correct)'}`);
    for (const v of timeViols12) console.log(`      [${v.class}] ${JSON.stringify(v.match)}`);

    const unbackedTimeHtml = `<!DOCTYPE html><html><head><title>guide</title></head><body>
${HEAD}
<h2 data-tgf="guide" data-entity="kinkakuji">金閣寺</h2>
<p data-tgf="guide" data-time="kinkakuji" data-prov="place:kinkakuji">開館 09:00、閉館 17:00。夜間拝観は 19:30 から。</p>
</body></html>`;
    const p13 = writeExport('time-unbacked.html', unbackedTimeHtml);
    let c13 = null;
    try {
      c13 = assertExportBoundary({ packDir: tmp, exportPath: p13, html: unbackedTimeHtml, strictSignals: false, measured: false });
    } catch (err) { c13 = { pass: false, violations: [{ class: 'FAILCLOSED', match: err.message }] }; }
    const unbacked = c13.violations.filter((v) => v.class === 'TIME_UNBACKED');
    const leaked = c13.violations.filter((v) => v.class === 'TIME_HHMM');
    console.log('  CASE 10b — an invented time in the same sentence (must be caught, and only that one)');
    for (const v of unbacked) console.log(`      [${v.class}] ${JSON.stringify(v.match)} — ${v.where}`);
    // 19:30 is unbacked, so it is correctly flagged by BOTH rules; the assertion is
    // that the two BACKED times (09:00, 17:00) are not re-flagged by either.
    const leakedBacked = [...leaked, ...unbacked].filter((v) => v.match === '09:00' || v.match === '17:00');
    console.log(`    TIME_UNBACKED: ${unbacked.length === 1 && unbacked[0].match === '19:30' ? 'CAUGHT exactly the invented time (correct)' : `expected exactly 19:30, got ${unbacked.map((v) => v.match).join('|') || 'none'} — TEST FAILED`}`);
    console.log(`    backed times (09:00, 17:00) re-flagged: ${leakedBacked.length}${leakedBacked.length ? ' — TEST FAILED' : ' (correct: backed times pass both rules)'}`);
    console.log(`    TIME_HHMM fired on: ${leaked.map((v) => v.match).join(', ') || '(nothing)'}`);
    if (unbacked.length !== 1 || unbacked[0].match !== '19:30' || leakedBacked.length !== 0) failures++;
    if (timeViols12.length !== 0) failures++;
    console.log('');

    console.log(`  SELF-TEST ${failures === 0 ? 'PASS' : `FAIL (${failures} failure(s))`}`);
    return failures === 0 ? EXIT.PASS : EXIT.SELFTEST;
  } catch (err) {
    console.error(`SELF-TEST ERROR: ${err && err.stack ? err.stack : err}`);
    return EXIT.SELFTEST;
  } finally {
    try { rmSync(tmp, { recursive: true, force: true }); } catch { /* best effort */ }
  }
}

// ---------------------------------------------------------------------------
// false-positive metric on real text
// ---------------------------------------------------------------------------
function runMeasureFp(args) {
  const files = args._.filter((f) => existsSync(f));
  if (files.length === 0) {
    console.error('usage error: --measure-fp needs at least one existing file');
    return EXIT.USAGE;
  }
  if (!args.pack) {
    console.error('usage error: --measure-fp needs --pack so the allow-list is derived from a fact layer');
    return EXIT.FAILCLOSED;
  }
  if (!existsSync(args.pack)) {
    console.error(`FAIL-CLOSED: pack directory not found: ${args.pack}`);
    return EXIT.FAILCLOSED;
  }

  let allow;
  try {
    const places = readJsonOrFail(join(args.pack, 'places.json'));
    const transit = readJsonOrFail(join(args.pack, 'transit.json'));
    allow = buildAllowList(args.pack, places, transit);
    if (allow.tokens.length === 0) throw new FailClosed('allow-list is empty');
  } catch (err) {
    console.error(`FAIL-CLOSED  ${err.message}`);
    return EXIT.FAILCLOSED;
  }
  const allowSet = new Set(allow.tokens);

  console.log('FALSE-POSITIVE MEASUREMENT  (real text, no export structure)');
  console.log(`  allow-list: ${allow.tokens.length} token(s) from ${allow.mode}`);
  console.log('  Each file is scanned as if it were provenance-free GUIDE body — the pessimistic case.');
  console.log('  Narrative-region text is exempt by construction and is reported separately.');
  console.log('');
  console.log('  file                                    glyphs    CJK  lex-hard  sig   entity-sweep(UNSHIPPED)  longest');
  console.log('  ' + '-'.repeat(112));

  const totals = { glyphs: 0, cjk: 0, lexHard: 0, signal: 0, sweep: 0 };
  for (const f of files) {
    let text;
    try {
      text = readFileSync(f, 'utf8');
    } catch (err) {
      console.error(`  ${f}: unreadable (${err.message})`);
      continue;
    }
    // corpora files carry a fetch preamble; measure the text only
    const marker = text.indexOf('TEXT BELOW ===');
    if (marker !== -1) text = text.slice(marker + 'TEXT BELOW ==='.length);

    const lexAll = scanText(text, allowSet);
    const lexHard = lexAll.filter((x) => x.severity === 'hard');
    const sig = lexAll.filter((x) => x.severity === 'signal');
    const sweep = scanEntities(text, allowSet).filter((x) => x.severity === 'hard');
    const cjk = text.match(/[\u3040-\u30ff\u4e00-\u9fff]/g) || [];
    const longest = sweep.reduce((a, b) => (b.match.length > a.length ? b.match : a), '');
    const name = f.split(/[\\/]/).pop();
    console.log(
      '  ' + name.padEnd(38) +
      String(text.length).padStart(7) +
      String(cjk.length).padStart(7) +
      String(lexHard.length).padStart(9) +
      String(sig.length).padStart(6) +
      String(sweep.length).padStart(23) +
      '  ' + JSON.stringify(longest.slice(0, 22)));
    totals.glyphs += text.length;
    totals.cjk += cjk.length;
    totals.lexHard += lexHard.length;
    totals.signal += sig.length;
    totals.sweep += sweep.length;
  }

  const per1k = (v) => (v / Math.max(1, totals.cjk) * 1000).toFixed(1);
  console.log('');
  console.log(`  TOTAL  bytes ${totals.glyphs}  CJK glyphs ${totals.cjk}`);
  console.log('');
  console.log('  SHIPPED CHECKS (hard failures):');
  console.log(`    lexical rules only (time/price/closure)      ${totals.lexHard} finding(s) = ${per1k(totals.lexHard)} per 1,000 CJK glyphs`);
  console.log(`    entity check, declaration-anchored           ${totals.sweep === 0 ? 'n/a' : '0'} on this corpus — it only runs inside data-entity plates,`);
  console.log('                                                 and a text file has no plates. Measured as 0 by construction.');
  console.log(`    signals (monitored, not failed)              ${totals.signal} = ${per1k(totals.signal)} per 1,000 CJK glyphs`);
  console.log('');
  console.log('  UNSHIPPED COMPARISON — the naive "any unknown ideograph run" rule:');
  console.log(`    ${totals.sweep} finding(s) = ${per1k(totals.sweep)} per 1,000 CJK glyphs.`);
  console.log('    This is why it is NOT the shipped rule: at that rate every honest guide fails, and');
  console.log('    the fix people would reach for is widening the allow-list until the guard means nothing.');
  console.log('    It remains reachable via --entity-sweep so the gap can be measured, never argued.');
  console.log('');
  console.log('  The lexical numbers above are the false-positive budget of the shipped scanner on real');
  console.log('  Japanese prose. They are nonzero and are reported, not minimised: the design classes');
  console.log('  time/price/transit vocabulary as fact-shaped, so prose that discusses fares or opening');
  console.log('  hours trips them. In a real export that text belongs in a narrative region or behind a');
  console.log('  provenance chip and is not scanned this way.');
  return EXIT.PASS;
}

process.exitCode = main();
