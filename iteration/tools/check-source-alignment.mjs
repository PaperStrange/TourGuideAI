// D-14 and its class: the value must be in the source the record actually cites.
//
// THE DEFECT THIS EXISTS FOR. `kyoto-shijo-yasaka-nishiromon.addressJa` read
// 祇園町北側125 while its `source_url` pointed at the shrine's own access page, which says
// 祇園町北側625. The value came from the Kyoto municipal CSV (which does say 125) and the
// attribution named a different source. Both sources are internally fine; the record
// joined one source's value to another source's citation.
//
// The existing gates could not see this. validate-city-pack checks that a source_url is
// PRESENT. validate-city-pack-v2 check A checks the URL resolves to non-empty bytes. Both
// pass while the number in the record appears nowhere in the cited source.
//
// So: for every field whose value is a literal string that must appear in its source, look
// for it in the cited evidence bytes. Report three outcomes, and keep them distinct:
//   PRESENT     the literal is in the cited source file          -> pass
//   ABSENT      it is not in the cited source, but IS in another -> attribution error; D-14
//   UNKNOWN     it is in no captured source at all               -> do not guess; report it
import { readFileSync, existsSync, readdirSync, statSync } from 'node:fs';
import { resolve, join } from 'node:path';

const REPO = resolve(import.meta.dirname, '../..');
const PACK = join(REPO, 'city-packs', 'kyoto-shijo');
const EVID = join(PACK, 'evidence');
const JSON_OUT = process.argv.includes('--json');

const placesRaw = JSON.parse(readFileSync(join(PACK, 'places.json'), 'utf8'));
const places = Array.isArray(placesRaw) ? placesRaw : placesRaw.places ?? [];

// Fields whose value is a literal that must be findable in a source. Not every field:
// a curated category or a template name is ours and has no source string to match.
const LITERAL_FIELDS = ['addressJa', 'address', 'tel', 'telephone', 'postalCode', 'nameJa', 'nameEn'];

// Every captured source, read once, lowercased and whitespace-collapsed so a match is not
// defeated by presentation. Whole-file containment is coarse on purpose: a false PASS from
// a boilerplate string is possible, a false FAIL is not, and the check's job is to catch a
// value that appears in NO source or in the WRONG one.
const sources = new Map();
for (const n of existsSync(EVID) ? readdirSync(EVID) : []) {
  const p = join(EVID, n);
  if (!statSync(p).isFile()) continue;
  if (!/\.(txt|json|csv|html)$/i.test(n)) continue;
  try {
    sources.set(n, readFileSync(p, 'utf8').replace(/\s+/g, ' ').toLowerCase());
  } catch { /* unreadable: skip, the count below makes that visible */ }
}

const norm = (s) => String(s).replace(/\s+/g, ' ').toLowerCase().trim();

// Matching shape depends on the script, and getting this wrong is how a check earns the
// right to be ignored. Latin strings have word boundaries, so "Gion" (a district name that
// appears in a dozen snapshots) must not count as a hit for a PLACE named Gion -- an
// unanchored match made it look like an attribution error when the real problem was that
// a two-word district name is simply not identifying evidence. CJK has no word boundaries,
// so substring is the only option there.
const hasLatinWord = (s) => /[A-Za-z]/.test(s) && /\s|[A-Za-z]$/.test(s);
function findIn(literal) {
  const needle = norm(literal);
  if (needle.length < 3) return null;                // too short to be evidence of anything
  const wordBoundary = hasLatinWord(literal) && !/[\u3000-\u9fff\uff00-\uffef]/.test(literal);
  const re = wordBoundary
    ? new RegExp(`(?<![a-z0-9])${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}(?![a-z0-9])`, 'i')
    : null;
  const hits = [];
  for (const [name, text] of sources) {
    if (wordBoundary ? re.test(text) : text.includes(needle)) hits.push(name);
  }
  return hits;
}

// A value present in most sources is not evidence of anything. Report it separately so the
// ABSENT list stays actionable instead of being padded with district names.
const UBIQUITOUS = 6;

/** The captured files most likely to be "the source_url the record cites". */
function candidateFiles(url) {  if (!url) return [];
  // An OSM API url names no captured file: the extract is stored under a descriptive name
  // (osm-corridor-map.json, osm-block-q1-footprints.json) chosen by whoever fetched it, and
  // the url itself is a LIVE query. Match on the OSM family instead, and flag it, because a
  // live url is not the same claim as a captured file -- see the osmLive row in the output.
  if (/openstreetmap\.org|overpass/i.test(url)) {
    return [...sources.keys()].filter((n) => /^osm|overpass/i.test(n));
  }
  let host = '';
  let path = '';
  try { const u = new URL(url); host = u.hostname.replace(/^www\./, ''); path = u.pathname; } catch { return []; }
  const stem = (host.split('.')[0] || '') + (path.split('/').filter(Boolean).slice(-1)[0] ?? '');
  return [...sources.keys()].filter((n) => {
    const low = n.toLowerCase();
    return low.includes(host.split('.')[0]) || low.includes(String(stem).toLowerCase().slice(0, 18));
  });
}

const isLiveOsmUrl = (u) => /openstreetmap\.org|overpass/i.test(String(u ?? ''));

// A curated label like "八坂神社 西楼門" is a composition, not a quotation: the shrine's own
// pages carry 八坂神社 and 西楼門 as separate strings in separate places, so a whole-string
// containment test fails while every component is genuinely attested. Splitting on
// whitespace (both ASCII and the full-width ideographic space) and requiring every
// component to appear somewhere in the cited file tests the claim that is actually being
// made -- that each part is the source's own wording -- without demanding it occur
// contiguously, which it does not.
function findInParts(literal, citedFiles) {
  const parts = String(literal).split(/[\s\u3000]+/).filter((s) => s.length >= 2);
  if (parts.length < 2) return [];
  return citedFiles.filter((f) => {
    const text = sources.get(f) ?? '';
    return parts.every((p) => text.includes(norm(p)));
  });
}


// Is this value a near-variant of one that DOES appear in the cited source? Address 125
// versus 625 is the D-14 case: one digit apart, and precisely the kind of error a reader
// cannot catch by checking that a source exists.
function nearVariantInCited(literal, citedFiles) {
  const digits = String(literal).match(/\d+/g);
  if (!digits) return null;
  for (const n of digits) {
    if (n.length < 2) continue;
    const alts = new Set();
    for (let i = 0; i < n.length; i++) {
      for (let d = 0; d <= 9; d++) {
        const c = String(d) + n.slice(1);
        if (c !== n) alts.add(c);
      }
      break; // first digit is where a block number goes wrong
    }
    for (const alt of alts) {
      const candidate = String(literal).replace(n, alt);
      for (const f of citedFiles) {
        if ((sources.get(f) ?? '').includes(norm(candidate))) return { variant: candidate, file: f };
      }
    }
  }
  return null;
}

const rows = [];
for (const pl of places) {
  const url = pl.source_url;
  const cited = candidateFiles(url);
  // A permanent OSM element url (openstreetmap.org/way/205732558) is a good citation, and
  // the alteration file clause 4.6 asks for is the record's own osmRecord pointer into the
  // ODbL half. So for these records the captured bytes ARE the source, reached through
  // osmRecord, and an exact name match in the OSM extracts is the evidence -- not a
  // mismatch against a web page that was never fetched for this element.
  const osmElement = /openstreetmap\.org\/(way|node|relation)\/\d+/.test(String(url ?? ''));
  for (const field of LITERAL_FIELDS) {
    const v = pl[field];
    if (!v || typeof v !== 'string') continue;
    const hits = findIn(v);
    if (hits === null) continue;
    const inCited = cited.filter((c) => hits.includes(c));
    let verdict;
    if (inCited.length) verdict = 'PRESENT';
    else if (findInParts(v, cited).length) verdict = 'PRESENT-AS-PARTS';  // every component attested, not contiguous
    else if (osmElement && hits.length) verdict = 'PRESENT-OSM-ELEMENT';  // cited by element id, evidenced by the extract
    else if (hits.length >= UBIQUITOUS) verdict = 'UBIQUITOUS';           // in most sources: no signal
    else if (hits.length) verdict = 'ABSENT';                             // in some source, not the cited one
    else verdict = 'UNKNOWN';                                             // in no captured source
    const row = { place: pl.id, field, value: v, citedFiles: cited, hits, verdict, osmElement };
    if (verdict === 'ABSENT') {
      const nv = nearVariantInCited(v, cited);
      if (nv) { row.nearVariant = nv; row.verdict = 'ABSENT-NEAR-VARIANT'; }
    }
    rows.push(row);
  }
}

const bad = rows.filter((r) => r.verdict === 'ABSENT' || r.verdict === 'ABSENT-NEAR-VARIANT');
const unknown = rows.filter((r) => r.verdict === 'UNKNOWN');
const ubiquitous = rows.filter((r) => r.verdict === 'UBIQUITOUS');

if (JSON_OUT) {
  console.log(JSON.stringify({
    sourcesScanned: sources.size, checked: rows.length,
    present: rows.filter((r) => r.verdict === 'PRESENT').length,
    absent: bad.length, nearVariant: rows.filter((r) => r.verdict === 'ABSENT-NEAR-VARIANT').length,
    unknown: unknown.length, ubiquitous: ubiquitous.length, rows,
  }));
} else {
  console.log('source-value alignment — is the recorded value in the source the record cites?\n');
  console.log(`scanned ${sources.size} captured source files; checked ${rows.length} literal field(s)\n`);
  const near = rows.filter((r) => r.verdict === 'ABSENT-NEAR-VARIANT');
  if (near.length) {
    console.log('  --- near-variant: the cited source says almost this, differing by digits (the D-14 shape) ---');
    for (const r of near) {
      console.log(`  FAIL ${String(r.place).padEnd(32)} ${String(r.field).padEnd(11)} ${r.value}`);
      console.log(`         cited source contains instead: ${r.nearVariant.variant}   (${r.nearVariant.file})`);
    }
    console.log('');
  }
  const plainAbsent = rows.filter((r) => r.verdict === 'ABSENT');
  if (plainAbsent.length) {
    console.log('  --- present somewhere, but not in the cited source ---');
    for (const r of plainAbsent) {
      console.log(`  FAIL ${String(r.place).padEnd(32)} ${String(r.field).padEnd(11)} ${r.value}`);
      console.log(`         cited=${r.citedFiles.join(',') || '(no captured file matches the URL)'}`);
      console.log(`         found in=${r.hits.join(', ')}`);
    }
    console.log('');
  }
  if (unknown.length) {
    console.log(`  --- in NO captured source (${unknown.length}): curated, or unbacked. Not a failure by itself. ---`);
    for (const r of unknown) console.log(`  unk  ${String(r.place).padEnd(32)} ${String(r.field).padEnd(11)} ${r.value}`);
    console.log('');
  }
  const count = (v) => rows.filter((r) => r.verdict === v).length;
  console.log(`  PRESENT ${count('PRESENT')}   AS-PARTS ${count('PRESENT-AS-PARTS')}   OSM-ELEMENT ${count('PRESENT-OSM-ELEMENT')}   ABSENT ${plainAbsent.length}   NEAR-VARIANT ${near.length}   UNKNOWN ${unknown.length}   UBIQUITOUS ${ubiquitous.length}`);
  console.log('');
  if (near.length) {
    console.log(`  ${near.length} value(s) differ from the cited source only by digits. That is D-14:`);
    console.log('  a reader who opens the citation finds a different number, which is worse than');
    console.log('  finding nothing. Fix the value, or fix the source_url, so the two agree.');
  }
  if (plainAbsent.length) {
    console.log(`  ${plainAbsent.length} value(s) sit in a different source than the one cited.`);
    console.log('  Follow the evidence to whichever source the value actually came from and name that.');
  }
}

process.exit(bad.length ? 1 : 0);
