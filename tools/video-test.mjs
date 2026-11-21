// Headless Chrome: export MP4 (WebCodecs path) and WebM, then verify the files with ffprobe.
// Usage: node tools/video-test.mjs [chromePath]
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';

const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require(join(process.env.PW_PATH || '/opt/npm-tools/node_modules', 'playwright')); }
const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer(async (req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  try { const b = await readFile(join(root, p === '/' ? 'index.html' : p)); res.writeHead(200, { 'content-type': types[extname(p) || '.html'] || 'application/octet-stream' }); res.end(b); }
  catch { res.writeHead(404); res.end(); }
}).listen(0);
const browser = await pw.chromium.launch({
  executablePath: process.argv[2] || '/usr/bin/google-chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
const page = await (await browser.newContext({ acceptDownloads: true, viewport: { width: 1440, height: 900 } })).newPage();
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
await page.goto(`http://127.0.0.1:${server.address().port}/`);
await page.waitForFunction(() => window.__phantasma);
let fails = 0;
const fail = m => { fails++; console.error('FAIL', m); };

function probe(file) {
  try {
    const out = execFileSync('ffprobe', ['-v', 'error', '-select_streams', 'v:0', '-count_frames',
      '-show_entries', 'stream=codec_name,width,height,r_frame_rate,nb_read_frames', '-of', 'json', file]).toString();
    // full decode must be clean too
    execFileSync('ffmpeg', ['-v', 'error', '-xerror', '-i', file, '-f', 'null', '-']);
    return JSON.parse(out).streams[0];
  } catch (e) { return { error: (e.stderr || e.message).toString() }; }
}

async function exportOne(id, fmt, size, fps, len, expect) {
  await page.evaluate(i => window.__phantasma.select(i), id);
  await page.selectOption('#vidFmt', fmt);
  if (size) await page.selectOption('#vidSize', size);
  if (fps) await page.selectOption('#vidFps', String(fps));
  await page.evaluate(l => { const r = document.getElementById('recLen'); r.value = l; r.dispatchEvent(new Event('input')); }, len);
  const label = await page.textContent('#recBtn');
  const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 180000 }), page.click('#recBtn')]);
  const f = join(tmpdir(), dl.suggestedFilename());
  await dl.saveAs(f);
  const info = probe(f);
  const note = await page.textContent('#exportNote');
  console.log(fmt, size || '', fps || '', '→', dl.suggestedFilename(), JSON.stringify(info), '|', note, '| button was:', label);
  if (info.error) return fail(`${fmt}: ffprobe/ffmpeg error ${info.error}`);
  for (const k in expect) if (String(info[k]) !== String(expect[k])) fail(`${fmt} ${size}: ${k}=${info[k]} expected ${expect[k]}`);
}

await exportOne('lilac-chaser', 'mp4', '1280x720', 30, 2, { codec_name: 'h264', width: 1280, height: 720, r_frame_rate: '30/1', nb_read_frames: 60 });
await exportOne('moire', 'mp4', '1080x1920', 60, 2, { codec_name: 'h264', width: 1080, height: 1920, r_frame_rate: '60/1', nb_read_frames: 120 });
await exportOne('ouchi', 'webm', null, null, 2, { codec_name: 'vp9' });

// default format is MP4 and video controls hide for still illusions
await page.evaluate(() => localStorage.removeItem('phantasma.state'));
await page.reload(); await page.waitForFunction(() => window.__phantasma);
await page.waitForTimeout(300);
const d = await page.evaluate(() => {
  const P = window.__phantasma;
  P.select('ouchi');
  const a = { fmt: document.getElementById('vidFmt').value, btn: document.getElementById('recBtn').textContent, shown: !document.getElementById('videoCtl').hidden };
  P.select('cafe-wall');
  a.stillHidden = document.getElementById('videoCtl').hidden;
  document.getElementById('vidFmt').value = 'webm'; document.getElementById('vidFmt').dispatchEvent(new Event('change'));
  P.select('ouchi');
  a.webmHidesSize = document.getElementById('vidSizeCtl').hidden && document.getElementById('vidFpsCtl').hidden;
  return a;
});
console.log('defaults', JSON.stringify(d));
if (d.fmt !== 'mp4' || d.btn !== 'Export MP4' || !d.shown || !d.stillHidden || !d.webmHidesSize) fail('default/visibility ' + JSON.stringify(d));
if (errors.length) fail('console errors: ' + errors.join(' | '));
await browser.close(); server.close();
console.log(fails ? `${fails} failure(s)` : 'video export tests passed');
process.exit(fails ? 1 : 0);
