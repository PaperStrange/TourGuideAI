// probe-absent.mjs — does v15's new guard actually fail (exit 2) rather than degrade?
// Runs v15 against a deliberately absent path by rewriting the literal into a temp copy.
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
const SRC = 'iteration/recon/verify-kyoto-shijo/v15-scene-bytes.mjs';
const TMP = 'iteration/recon/verify-kyoto-shijo/.v15-absent-probe.mjs';
const src = readFileSync(SRC, 'utf8');
const patched = src.replaceAll("'build/scene.bin'", "'build/__absent_probe__.bin'");
if (patched === src) { console.log('  could not patch the literal — probe inconclusive'); process.exit(1); }
writeFileSync(TMP, patched);
let code = 0, out = '';
try {
  out = execFileSync(process.execPath, [TMP], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
} catch (e) {
  code = e.status ?? 'no-status';
  out = (e.stdout || '') + (e.stderr || '');
}
unlinkSync(TMP);
console.log('  exit code:', code, '(expected 2)');
console.log('  output:', out.trim().split('\n').map(l => '\n    ' + l).join(''));
console.log(`\n  => ${code === 2 ? 'PASS: fails loudly when the scene is absent' : 'FAIL: degraded instead of failing'}`);
