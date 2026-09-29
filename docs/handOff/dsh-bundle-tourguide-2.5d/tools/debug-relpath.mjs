import { resolve, join, dirname, normalize } from 'node:path';
import { existsSync } from 'node:fs';

const ROOT = process.cwd();
const NEW = resolve(ROOT, 'docs/handOff');
const OLD = resolve(ROOT, 'docs/handOff');

function relPath(fromDir, toPath) {
  const from = fromDir.split(/[\\/]/).filter(Boolean);
  const to = toPath.split(/[\\/]/).filter(Boolean);
  let k = 0;
  while (k < from.length && k < to.length && from[k] === to[k]) k += 1;
  const ups = new Array(from.length - k).fill('..');
  return ups.concat(to.slice(k)).join('/') || '.';
}

for (const target of ['../package.json', '../src/App.js', '../.dsh/skills/tourguide-fact-integrity/SKILL.md']) {
  const m = /^(\.{1,2}\/)+/.exec(target);
  const prefix = m ? m[0] : '';
  const rest = target.slice(prefix.length);
  const ups = (prefix.match(/\.\.\//g) || []).length;
  const absTarget = normalize(join(OLD, ...new Array(ups).fill('..'), rest));
  const rebased = relPath(NEW, absTarget);
  const resolvedFromNew = normalize(join(NEW, rebased));
  console.log(`${target}
   prefix="${prefix}" ups=${ups} rest="${rest}"
   absTarget   = ${absTarget}
   exists      = ${existsSync(absTarget)}
   rebased     = ${rebased}
   resolves to = ${resolvedFromNew}
   round-trip  = ${resolvedFromNew === absTarget ? 'OK' : 'MISMATCH'}`);
}
