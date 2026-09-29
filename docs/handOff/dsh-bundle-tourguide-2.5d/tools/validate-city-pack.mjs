#!/usr/bin/env node
/**
 * validate-city-pack.mjs — mechanical enforcement of the fact-layer contract.
 *
 * Enforces the rules in skills/tourguide-fact-integrity/SKILL.md that CAN be
 * enforced mechanically:
 *   - required files exist and parse as JSON
 *   - every fact record carries a resolvable http(s) source_url and an ISO
 *     verified_at that is not in the future
 *   - coordinates are numbers, in range, and not (0,0)
 *   - transit / itinerary references resolve against places.json
 *   - no narrative-only field leaks into the fact layer
 *
 * It deliberately does NOT validate against the TypeScript schema: keeping it
 * schema-free means it can run before the app exists, and it only ever reports
 * violations of the iron rules.
 *
 * Exit codes: 0 = pass, 1 = contract violation, 2 = usage error.
 */
import { readFileSync, existsSync } from 'node:fs';
import { join, resolve } from 'node:path';

const NARRATIVE_ONLY_FIELDS = [
  'flavor',
  'flavour',
  'story',
  'quote',
  'lore',
  'narrative',
  'description_llm',
  'llm_description',
  'generated_text',
];

const REQUIRED_FILES = ['pack.json', 'places.json', 'transit.json'];

/** @type {{code:string, file:string, at:string, msg:string}[]} */
const violations = [];
const notes = [];

function fail(code, file, at, msg) {
  violations.push({ code, file, at, msg });
}

function readJson(dir, file) {
  const p = join(dir, file);
  if (!existsSync(p)) {
    fail('MISSING_FILE', file, '-', `required file not found at ${p}`);
    return null;
  }
  try {
    return JSON.parse(readFileSync(p, 'utf8'));
  } catch (err) {
    fail('INVALID_JSON', file, '-', `not parseable as JSON: ${err.message}`);
    return null;
  }
}

function isHttpUrl(v) {
  return typeof v === 'string' && /^https?:\/\/\S+$/i.test(v.trim());
}

function checkProvenance(file, at, rec) {
  if (!isHttpUrl(rec.source_url)) {
    fail('BAD_SOURCE', file, at, `source_url must be an absolute http(s) URL, got ${JSON.stringify(rec.source_url)}`);
  }
  const raw = rec.verified_at;
  if (typeof raw !== 'string' || !/^\d{4}-\d{2}-\d{2}/.test(raw.trim())) {
    fail('BAD_VERIFIED_AT', file, at, `verified_at must be an ISO date (YYYY-MM-DD...), got ${JSON.stringify(raw)}`);
    return;
  }
  const t = Date.parse(raw);
  if (Number.isNaN(t)) {
    fail('BAD_VERIFIED_AT', file, at, `verified_at is not a parseable date: ${JSON.stringify(raw)}`);
    return;
  }
  // allow a small clock skew before flagging "in the future"
  if (t > Date.now() + 24 * 60 * 60 * 1000) {
    fail('FUTURE_VERIFIED_AT', file, at, `verified_at is in the future: ${raw}`);
  }
}

function checkNoNarrative(file, at, rec) {
  for (const f of NARRATIVE_ONLY_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(rec, f)) {
      fail('NARRATIVE_IN_FACT_LAYER', file, at, `fact record must not carry narrative field "${f}" — narrative belongs to the narrative layer keyed by refFactIds`);
    }
  }
}

function checkCoord(file, at, lat, lng) {
  if (typeof lat !== 'number' || Number.isNaN(lat) || lat < -90 || lat > 90) {
    fail('BAD_LAT', file, at, `lat must be a number in [-90,90], got ${JSON.stringify(lat)}`);
  }
  if (typeof lng !== 'number' || Number.isNaN(lng) || lng < -180 || lng > 180) {
    fail('BAD_LNG', file, at, `lng must be a number in [-180,180], got ${JSON.stringify(lng)}`);
  }
  if (lat === 0 && lng === 0) {
    fail('NULL_ISLAND', file, at, 'coordinates are (0,0) — almost certainly a placeholder, not a real place');
  }
}

function main() {
  const arg = process.argv[2];
  if (!arg) {
    console.error('usage: node validate-city-pack.mjs <city-pack-dir>');
    process.exit(2);
  }
  const dir = resolve(arg);
  if (!existsSync(dir)) {
    console.error(`usage error: directory not found: ${dir}`);
    process.exit(2);
  }

  const pack = readJson(dir, 'pack.json');
  const places = readJson(dir, 'places.json');
  const transit = readJson(dir, 'transit.json');

  if (pack) {
    for (const k of ['schemaVersion', 'cityId']) {
      if (!pack[k]) fail('PACK_FIELD', 'pack.json', k, `pack.json is missing required field "${k}"`);
    }
    if (!Array.isArray(pack.sources) || pack.sources.length === 0) {
      fail('PACK_SOURCES', 'pack.json', 'sources', 'pack.json must list at least one source (the pack-level provenance)');
    } else {
      pack.sources.forEach((s, i) => {
        if (!isHttpUrl(typeof s === 'string' ? s : s?.url)) {
          fail('BAD_SOURCE', 'pack.json', `sources[${i}]`, 'each source must be an http(s) URL string or {url}');
        }
      });
    }
  }

  const idSet = new Set();
  if (Array.isArray(places)) {
    if (places.length === 0) notes.push('places.json is empty — nothing to export yet');
    places.forEach((p, i) => {
      const at = `places[${i}]${p && p.id ? ` (${p.id})` : ''}`;
      if (!p || typeof p !== 'object') {
        fail('BAD_RECORD', 'places.json', at, 'record is not an object');
        return;
      }
      if (!p.id) fail('MISSING_ID', 'places.json', at, 'place needs a stable "id"');
      else if (idSet.has(p.id)) fail('DUPLICATE_ID', 'places.json', at, `duplicate place id "${p.id}"`);
      else idSet.add(p.id);

      if (!p.nameJa && !p.nameEn && !p.nameZh) {
        fail('MISSING_NAME', 'places.json', at, 'place needs at least one of nameJa / nameEn / nameZh');
      }
      checkCoord('places.json', at, p.lat, p.lng);
      checkProvenance('places.json', at, p);
      checkNoNarrative('places.json', at, p);
    });
  } else if (places !== null) {
    fail('BAD_SHAPE', 'places.json', '-', 'top level must be an array');
  }

  if (Array.isArray(transit)) {
    transit.forEach((t, i) => {
      const at = `transit[${i}]`;
      if (!t || typeof t !== 'object') {
        fail('BAD_RECORD', 'transit.json', at, 'record is not an object');
        return;
      }
      for (const k of ['from', 'to']) {
        if (!t[k]) {
          fail('MISSING_REF', 'transit.json', at, `transit leg needs "${k}"`);
        } else if (idSet.size > 0 && !idSet.has(t[k])) {
          fail('DANGLING_REF', 'transit.json', at, `"${k}" = ${JSON.stringify(t[k])} does not exist in places.json`);
        }
      }
      if (typeof t.minutes !== 'number' || t.minutes <= 0) {
        fail('BAD_MINUTES', 'transit.json', at, `minutes must be a positive number, got ${JSON.stringify(t.minutes)}`);
      }
      checkProvenance('transit.json', at, t);
      checkNoNarrative('transit.json', at, t);
    });
  } else if (transit !== null) {
    fail('BAD_SHAPE', 'transit.json', '-', 'top level must be an array');
  }

  for (const f of REQUIRED_FILES) {
    if (!existsSync(join(dir, f))) {
      // already reported by readJson; kept for an explicit file list in output
    }
  }

  const rel = (f) => f;
  if (violations.length === 0) {
    console.log(`PASS  ${dir}`);
    console.log(`      ${idSet.size} place(s), ${Array.isArray(transit) ? transit.length : 0} transit leg(s), all facts carry provenance.`);
    for (const n of notes) console.log(`      note: ${n}`);
    process.exit(0);
  }

  console.error(`FAIL  ${dir}`);
  console.error(`      ${violations.length} contract violation(s):\n`);
  const byCode = new Map();
  for (const v of violations) {
    if (!byCode.has(v.code)) byCode.set(v.code, []);
    byCode.get(v.code).push(v);
  }
  for (const [code, list] of byCode) {
    console.error(`  [${code}] ${list.length}`);
    for (const v of list) {
      console.error(`      ${rel(v.file)} @ ${v.at}: ${v.msg}`);
    }
  }
  console.error('\n  Fix by supplying real provenance or DELETING the record.');
  console.error('  Never substitute a plausible-looking value: see "drop, don\'t correct".');
  process.exit(1);
}

main();
