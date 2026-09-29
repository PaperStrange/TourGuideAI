// The guide gate's entry point: BAKE, then VALIDATE.
//
// WHY THIS EXISTS. `build/` is gitignored, correctly -- the guide is a build product, not
// tracked content. But that means a clean checkout has no guide, and the first version of the
// gate pointed straight at validate-guide.mjs: it passed on my machine, where the file happened
// to exist, and exited 2 with "could not RUN" on a fresh clone. A verdict that depends on how
// the working copy was prepared is not a verdict about the repository. This is the sixth time
// that shape has appeared in this harness -- R1 assumed a single-branch clone carries every
// branch, R7 required a per-clone hook, branch-sync read an empty branch list as "not a repo" --
// and the fix is the same every time: make the gate self-sufficient.
//
// It must bake before validating, and that order is load-bearing rather than tidiness. The guide
// refuses to describe a scene baked under different frozen constants:
//
//   G1 FAIL: scene.bin was baked under contract F50E4144... but the contract is now E2E9307C...
//            A guide may not describe a world built under different frozen constants.
//
// That refusal caught a real moment during the datum change, so it stays. Baking here means the
// gate exercises it rather than working around it.
//
// Exit codes, matching the other gates: 0 = pass, 1 = an assertion failed, 2 = environment.
import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const REPO = join(import.meta.dirname, '..', '..');
const run = (name, args) => {
  const r = spawnSync(process.execPath, args, { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
  const out = `${r.stdout ?? ''}${r.stderr ?? ''}`.trim();
  if (r.status !== 0) {
    console.log(`--- ${name} failed (exit ${r.status}) ---`);
    for (const line of out.split('\n').slice(-12)) console.log(line);
  }
  return { code: r.status, out };
};

// The scene must exist and be current before a guide can describe it. emit-guide re-checks the
// contract fingerprint itself, so a stale scene is caught there rather than here -- but the
// scene has to be present, and baking it is part of what this gate means.
const scene = join(REPO, 'build', 'scene.bin');
if (!existsSync(scene)) {
  const baked = run('emit-scene', [join(REPO, 'iteration', 'tools', 'emit-scene.mjs')]);
  if (baked.code !== 0) { console.log(`ENV  could not bake the scene (exit ${baked.code})`); process.exit(2); }
}

const emitted = run('emit-guide', [join(REPO, 'iteration', 'tools', 'emit-guide.mjs')]);
if (emitted.code !== 0) {
  console.log(`FAIL  emit-guide exited ${emitted.code}`);
  process.exit(emitted.code === 2 ? 2 : 1);
}

const validated = run('validate-guide', [join(REPO, 'iteration', 'tools', 'validate-guide.mjs')]);
const summary = (validated.out.match(/\d+\/\d+ assertions passed, \d+ failed/) ?? [])[0]
  ?? (validated.out.split('\n').filter(Boolean).slice(-1)[0] ?? '(no output)');
console.log(summary);
process.exit(validated.code ?? 1);
