// Headless Chrome check: layouts at 390×844 / 844×390 (touch) and 1440×900, every illusion
// compiles and renders non-blank, touch gestures pan/zoom/reset.
// Usage: node tools/layout-test.mjs [chromePath]   (needs playwright available to node)
import http from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { extname, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
let pw;
try { pw = require('playwright'); } catch { pw = require(join(process.env.PW_PATH || '/opt/npm-tools/node_modules', 'playwright')); }

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png' };
const server = http.createServer(async (req, res) => {
  const p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  try {
    const body = await readFile(join(root, p === '/' ? 'index.html' : p));
    res.writeHead(200, { 'content-type': types[extname(p) || '.html'] || 'application/octet-stream' });
    res.end(body);
  } catch { res.writeHead(404); res.end(); }
}).listen(0);
const url = `http://127.0.0.1:${server.address().port}/`;
const shots = join(root, 'tools', 'shots');
await mkdir(shots, { recursive: true });

const browser = await pw.chromium.launch({
  executablePath: process.argv[2] || '/usr/bin/google-chrome',
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'],
});
let fails = 0;
const fail = m => { fails++; console.error('FAIL', m); };

const configs = [
  { name: 'phone-portrait', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, tabbed: true },
  { name: 'phone-landscape', viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2, tabbed: true },
  { name: 'desktop', viewport: { width: 1440, height: 900 }, isMobile: false, hasTouch: false, deviceScaleFactor: 1, tabbed: false },
];

for (const cfg of configs) {
  const ctx = await browser.newContext(cfg);
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', e => errors.push(e.message));
  await page.goto(url);
  await page.waitForFunction(() => window.__phantasma);
  await page.waitForTimeout(300);

  const L = await page.evaluate(() => {
    const r = el => { const b = document.querySelector(el).getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height, r: b.right, b: b.bottom }; };
    const vis = [...document.querySelectorAll('#secs .sec')].filter(s => getComputedStyle(s).display !== 'none').map(s => s.id);
    const cv = document.getElementById('cv');
    return {
      tabbed: document.body.classList.contains('tabbed'),
      view: r('#view'), strip: r('#tabstrip'), top: r('#top'), secs: r('#secs'),
      vis, cw: cv.width, ch: cv.height, docH: document.documentElement.scrollHeight, winH: innerHeight,
      tabs: [...document.querySelectorAll('.tabbtn')].filter(b => !b.hidden).map(b => b.textContent),
      h2shown: [...document.querySelectorAll('#secs .sec.tabon > h2')].some(h => getComputedStyle(h).display !== 'none'),
    };
  });
  console.log(cfg.name, JSON.stringify({ tabbed: L.tabbed, view: L.view, strip: L.strip, vis: L.vis, canvas: [L.cw, L.ch], tabs: L.tabs }));
  if (L.tabbed !== cfg.tabbed) fail(`${cfg.name}: tabbed=${L.tabbed}`);
  if (L.top.h > 60) fail(`${cfg.name}: header wraps (${L.top.h}px)`);
  if (L.docH > L.winH + 1) fail(`${cfg.name}: page scrolls (${L.docH} > ${L.winH})`);
  if (L.cw < 10 || L.ch < 10) fail(`${cfg.name}: canvas not sized`);
  if (cfg.tabbed) {
    if (L.vis.length !== 1) fail(`${cfg.name}: ${L.vis.length} sections visible`);
    if (L.h2shown) fail(`${cfg.name}: heading visible inside tab`);
    if (cfg.viewport.height > cfg.viewport.width) {
      const frac = L.view.h / cfg.viewport.height;
      if (frac < 0.44 || frac > 0.54) fail(`${cfg.name}: view is ${(frac * 100).toFixed(0)}% of height`);
      if (Math.abs(L.strip.y - L.view.b) > 2) fail(`${cfg.name}: tab bar not directly under view`);
    } else {
      if (Math.abs(L.strip.x - L.view.r) > 2) fail(`${cfg.name}: right column not beside view`);
      if (L.strip.y - L.view.y > 2) fail(`${cfg.name}: tab bar not at top of right column`);
      if (Math.abs(L.secs.w - 300) > 2 && L.secs.w > 320) fail(`${cfg.name}: column width ${L.secs.w}`);
    }
    // tab switching + persistence
    await page.click('.tabbtn:nth-child(3)');
    const vis2 = await page.evaluate(() => [...document.querySelectorAll('#secs .sec')].filter(s => getComputedStyle(s).display !== 'none').map(s => s.id));
    if (vis2[0] !== 'sec-colors') fail(`${cfg.name}: tab click shows ${vis2}`);
    await page.reload(); await page.waitForFunction(() => window.__phantasma);
    const vis3 = await page.evaluate(() => document.querySelector('.sec.tabon')?.id);
    if (vis3 !== 'sec-colors') fail(`${cfg.name}: tab not remembered (${vis3})`);
    await page.click('.tabbtn:nth-child(1)');
  } else if (L.vis.length !== 5) fail(`${cfg.name}: desktop should show all sections`);

  // every illusion renders without error and isn't blank
  const ids = await page.evaluate(() => window.__phantasma.ILLUSIONS.map(i => i.id));
  for (const id of ids) {
    await page.evaluate(i => window.__phantasma.select(i), id);
    await page.waitForTimeout(cfg.name === 'desktop' ? 120 : 40);
    const res = await page.evaluate(() => {
      const P = window.__phantasma; P.draw();
      const gl = P.renderer.gl;
      const w = gl.drawingBufferWidth, h = gl.drawingBufferHeight;
      const px = new Uint8Array(w * h * 4);
      gl.readPixels(0, 0, w, h, gl.RGBA, gl.UNSIGNED_BYTE, px);
      let mn = 255, mx = 0;
      for (let i = 0; i < px.length; i += 4 * 97) { const v = px[i] + px[i + 1] + px[i + 2]; mn = Math.min(mn, v); mx = Math.max(mx, v); }
      return { err: document.getElementById('err').hidden ? '' : document.getElementById('err').textContent, range: mx - mn, glErr: gl.getError() };
    });
    if (res.err) fail(`${cfg.name} ${id}: ${res.err}`);
    if (res.glErr) fail(`${cfg.name} ${id}: gl error ${res.glErr}`);
    if (res.range < 30) fail(`${cfg.name} ${id}: looks blank (range ${res.range})`);
    if (cfg.name === 'desktop') await page.screenshot({ path: join(shots, `ill-${id}.png`) });
    // reveal path compiles too
    await page.evaluate(() => { const P = window.__phantasma; if (P.S.ill.reveal) { P.S.reveal = true; P.draw(); P.S.reveal = false; } });
  }

  // only applicable controls are shown
  const vis = await page.evaluate(() => {
    const P = window.__phantasma;
    const names = () => [...document.querySelectorAll('#params .ctl')].filter(c => !c.hidden).map(c => c.querySelector('span').textContent.trim());
    const cols = () => [...document.querySelectorAll('#colors .colrow')].filter(c => !c.hidden).map(c => c.textContent.trim());
    const setOpt = (i, v) => { const el = document.querySelector(`#params [data-idx="${i}"]`); el.value = v; el.dispatchEvent(new Event('change')); };
    const out = {};
    P.select('fraser'); out.fraserChecks = [names().includes('Check twist'), cols().length];
    setOpt(4, 1); out.fraserPlain = [names().includes('Check twist'), cols()];
    P.select('grid'); setOpt(0, 1); out.hermann = [names().includes('Dot size'), cols()];
    P.select('aftereffect'); setOpt(4, 1); out.rings = [names().includes('Arms'), names()[0]];
    P.select('cafe-wall'); out.still = [document.getElementById('playBtn').hidden, document.getElementById('revealBtn').hidden];
    P.select('troxler'); out.noReveal = [document.getElementById('revealBtn').hidden, document.getElementById('revealRow').hidden];
    P.select('fraser'); setOpt(4, 0);
    return out;
  });
  const exp = { fraserChecks: [true, 4], fraserPlain: [false, ['Strand A', 'Strand B', 'Background']], hermann: [false, ['Squares', 'Lines']], rings: [false, 'Ring density'], still: [true, false], noReveal: [true, true] };
  for (const k in exp) if (JSON.stringify(vis[k]) !== JSON.stringify(exp[k])) fail(`${cfg.name} applicable controls ${k}: ${JSON.stringify(vis[k])}`);

  // Reset everything: one tap only arms, second tap restores defaults everywhere
  {
    const res = await page.evaluate(async () => {
      const P = window.__phantasma;
      const $ = id => document.getElementById(id);
      P.select('fraser');
      const sl = document.querySelector('#params [data-idx="0"]'); sl.value = 13; sl.dispatchEvent(new Event('input'));
      const ci = document.querySelector('#colors input'); ci.value = '#ff00ff'; ci.dispatchEvent(new Event('input'));
      $('speed').value = 2.5; $('speed').dispatchEvent(new Event('input'));
      $('quality').value = 3; $('quality').dispatchEvent(new Event('change'));
      $('vidFmt').value = 'webm'; $('vidFmt').dispatchEvent(new Event('change'));
      P.vc.set({ zoom: 3, rot: 1, pan: [0.4, 0.2] });
      await new Promise(r => setTimeout(r, 700));        // let state + hash persist
      const before = { keys: Object.keys(localStorage).filter(k => k.startsWith('phantasma.')).length, hash: location.hash.length };
      $('resetAll').click();
      const armedOnly = P.S.ill.id === 'fraser' && P.S.params[0] === 13 && $('resetAll').classList.contains('armed');
      $('resetAll').click();
      const s = P.store;
      const d = P.ILLUSIONS[0];
      return {
        before, armedOnly,
        id: P.S.ill.id, paramsDefault: JSON.stringify(P.S.params) === JSON.stringify(d.params.map(p => p.v)),
        fraserForgotten: !s.p.fraser, speed: P.S.speed, quality: P.S.quality, vidFmt: $('vidFmt').value,
        zoom: P.vc.zoom, pan: P.vc.pan.join(','), rot: P.vc.rot, hasTex: P.renderer.hasTex,
        keysAfter: Object.keys(localStorage).filter(k => k.startsWith('phantasma.') && k !== 'phantasma.tab'),
      };
    });
    const ok = res.before.keys > 0 && res.armedOnly && res.id === 'cafe-wall' && res.paramsDefault && res.fraserForgotten &&
      res.speed === 1 && res.quality === 2 && res.vidFmt === 'mp4' && res.zoom === 1 && res.pan === '0,0' && res.rot === 0 && !res.hasTex;
    if (!ok) fail(`${cfg.name}: reset everything ${JSON.stringify(res)}`);
    await page.reload(); await page.waitForFunction(() => window.__phantasma);
    const after = await page.evaluate(() => ({ id: window.__phantasma.S.ill.id, p0: window.__phantasma.S.params[0], speed: window.__phantasma.S.speed }));
    if (after.id !== 'cafe-wall' || after.speed !== 1) fail(`${cfg.name}: reset did not persist across reload ${JSON.stringify(after)}`);
  }

  if (cfg.hasTouch) {
    // touch: one-finger drag pans, pinch zooms, double-tap resets
    await page.evaluate(() => window.__phantasma.select('cafe-wall'));
    const cdp = await ctx.newCDPSession(page);
    const b = L.view;
    const cx = b.x + b.w / 2, cy = b.y + b.h / 2;
    const touch = (type, pts) => cdp.send('Input.dispatchTouchEvent', { type, touchPoints: pts.map((p, i) => ({ x: p[0], y: p[1], id: i })) });
    await touch('touchStart', [[cx, cy]]);
    for (let k = 1; k <= 5; k++) await touch('touchMove', [[cx + k * 12, cy]]);
    await touch('touchEnd', []);
    const afterDrag = await page.evaluate(() => window.__phantasma.vc.pan.slice());
    if (!(afterDrag[0] < -0.05)) fail(`${cfg.name}: drag did not pan (${afterDrag})`);
    await touch('touchStart', [[cx - 30, cy], [cx + 30, cy]]);
    for (let k = 1; k <= 6; k++) await touch('touchMove', [[cx - 30 - k * 10, cy], [cx + 30 + k * 10, cy]]);
    await touch('touchEnd', []);
    const z = await page.evaluate(() => window.__phantasma.vc.zoom);
    if (!(z > 1.8)) fail(`${cfg.name}: pinch did not zoom (${z})`);
    for (let k = 0; k < 2; k++) { await touch('touchStart', [[cx, cy]]); await touch('touchEnd', []); await page.waitForTimeout(80); }
    const v = await page.evaluate(() => ({ z: window.__phantasma.vc.zoom, p: window.__phantasma.vc.pan }));
    if (v.z !== 1 || v.p[0] !== 0) fail(`${cfg.name}: double-tap did not reset (${JSON.stringify(v)})`);
    const hint = await page.textContent('#hint');
    if (!/pinch/.test(hint)) fail(`${cfg.name}: touch hint missing`);
  }

  await page.evaluate(() => window.__phantasma.select('rotating-snakes'));
  await page.waitForTimeout(200);
  await page.screenshot({ path: join(shots, `layout-${cfg.name}.png`) });
  if (errors.length) fail(`${cfg.name}: console errors: ${errors.join(' | ')}`);
  await ctx.close();
}
await browser.close();
server.close();
console.log(fails ? `${fails} failure(s)` : 'layout + render tests passed');
process.exit(fails ? 1 : 0);
