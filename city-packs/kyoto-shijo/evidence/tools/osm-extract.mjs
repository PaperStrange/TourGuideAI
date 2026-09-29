#!/usr/bin/env node
/**
 * osm-extract.mjs — read the corridor OSM map extract and print the facts a
 * curator needs, with the tag values quoted verbatim.
 *
 * This is a *reading* aid for city-packs/kyoto-shijo/evidence/osm-corridor-map.json
 * (ODbL 1.0, © OpenStreetMap contributors). It does not decide anything.
 *
 * Usage: node osm-extract.mjs <map.json> <mode> [arg]
 *   modes: roads | stations | buses | entrances | way <id> | tag <key> [value] | named <regex>
 */
import { readFileSync } from 'node:fs';

const [, , src, mode, arg1, arg2] = process.argv;
if (!src || !mode) { console.error('usage: node osm-extract.mjs <map.json> <mode> [arg]'); process.exit(2); }
const doc = JSON.parse(readFileSync(src, 'utf8'));
const els = doc.elements || [];
const nodes = new Map();
for (const e of els) if (e.type === 'node') nodes.set(e.id, e);

const has = (e, k) => e.tags && e.tags[k] !== undefined;
const show = (e) => {
  const t = e.tags || {};
  const extra = Object.keys(t).filter((k) => k !== 'name').sort().map((k) => `${k}=${t[k]}`).join(' | ');
  return `${e.type}/${e.id}\t${t.name ?? '(unnamed)'}\t${extra}`;
};
const coords = (e) => (e.type === 'node'
  ? `${e.lat},${e.lon}`
  : `center≈${(e.nodes || []).map((n) => nodes.get(n)).filter(Boolean).slice(0, 1).map((n) => `${n.lat},${n.lon}`).join('')}`);

switch (mode) {
  case 'roads': {
    const w = els.filter((e) => e.type === 'way' && has(e, 'highway') && e.tags.name);
    console.log(`${w.length} named highway ways`);
    for (const e of w.sort((a, b) => a.tags.name.localeCompare(b.tags.name, 'ja'))) console.log(show(e));
    break;
  }
  case 'stations': {
    const w = els.filter((e) => has(e, 'railway') || has(e, 'station') || has(e, 'public_transport'));
    for (const e of w) console.log(`${show(e)}\t${coords(e)}`);
    break;
  }
  case 'buses': {
    for (const e of els.filter((e) => e.tags?.highway === 'bus_stop' || e.tags?.public_transport === 'platform')) {
      console.log(`${show(e)}\t${coords(e)}`);
    }
    break;
  }
  case 'entrances': {
    for (const e of els.filter((e) => e.tags?.entrance || e.tags?.railway === 'subway_entrance')) {
      console.log(`${show(e)}\t${coords(e)}`);
    }
    break;
  }
  case 'way': {
    const e = els.find((x) => x.type === 'way' && String(x.id) === String(arg1));
    if (!e) { console.error(`way ${arg1} not in extract`); process.exit(1); }
    console.log(show(e));
    console.log(`nodes: ${(e.nodes || []).length}`);
    for (const n of e.nodes || []) {
      const nd = nodes.get(n);
      console.log(`  ${n}\t${nd ? `${nd.lat},${nd.lon}` : '(absent from extract)'}`);
    }
    break;
  }
  case 'tag': {
    const list = els.filter((e) => has(e, arg1) && (arg2 === undefined || e.tags[arg1] === arg2));
    console.log(`${list.length} elements with ${arg1}${arg2 ? `=${arg2}` : ''}`);
    for (const e of list) console.log(`${show(e)}\t${coords(e)}`);
    break;
  }
  case 'named': {
    const re = new RegExp(arg1);
    for (const e of els.filter((e) => e.tags?.name && re.test(e.tags.name))) console.log(`${show(e)}\t${coords(e)}`);
    break;
  }
  default:
    console.error(`unknown mode ${mode}`);
    process.exit(2);
}
