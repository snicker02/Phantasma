// Compiles every illusion shader (quality 1–3) with glslangValidator as GLSL ES 1.00.
// Usage: node tools/validate-shaders.mjs
import { execFileSync } from 'node:child_process';
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ILLUSIONS } from '../illusions/index.js';
import { buildFragment } from '../engine/prelude.js';

const dir = mkdtempSync(join(tmpdir(), 'phantasma-'));
let fail = 0;
const ids = new Set();
for (const ill of ILLUSIONS) {
  if (ids.has(ill.id)) { console.error('duplicate id', ill.id); fail++; }
  ids.add(ill.id);
  if (ill.params.length > 12) { console.error(ill.id, 'too many params'); fail++; }
  if (ill.colors.length > 4) { console.error(ill.id, 'too many colours'); fail++; }
  if (ill.stare !== undefined && !/stare/i.test(ill.params[ill.stare]?.n || '')) { console.error(ill.id, 'stare index wrong'); fail++; }
  for (const ss of [1, 2, 3]) {
    const f = join(dir, `${ill.id}-${ss}.frag`);
    writeFileSync(f, '#version 100\n' + buildFragment(ill, ss));
    try {
      execFileSync('glslangValidator', [f], { stdio: 'pipe' });
    } catch (e) {
      fail++;
      console.error(`FAIL ${ill.id} ss=${ss}\n` + e.stdout.toString());
    }
  }
}
console.log(`${ILLUSIONS.length} illusions × 3 quality levels: ${fail ? fail + ' failure(s)' : 'all shaders OK'}`);
process.exit(fail ? 1 : 0);
