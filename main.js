// Phantasma — optical illusion lab. UI, state, render loop, export.
import { ILLUSIONS, CATEGORIES, byId } from './illusions/index.js';
import { Renderer } from './engine/gl.js';
import { ViewController } from './engine/view.js';
import { setupTabs } from './engine/tabs.js';

export const VERSION = '1.0.1';
const KEY = 'phantasma';
const TAB_QUERY = '(max-width: 760px), (max-height: 500px) and (orientation: landscape)';
const $ = id => document.getElementById(id);

// ---------- persistence ----------
let store = {};
try { store = JSON.parse(localStorage.getItem(KEY + '.state')) || {}; } catch { store = {}; }
store.p = store.p || {}; store.c = store.c || {};
let saveTimer = 0;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try { localStorage.setItem(KEY + '.state', JSON.stringify(store)); } catch { /* full or blocked */ }
  }, 250);
  scheduleHash();
}

// ---------- state ----------
const S = {
  ill: null, params: [], colors: [], reveal: false,
  playing: true, speed: clampNum(store.speed, 0, 3, 1), quality: [1, 2, 3].includes(store.quality) ? store.quality : 2,
  time: 0, phase: 0, stare: null, recording: false,
};

const canvas = $('cv');
let renderer;
try { renderer = new Renderer(canvas); } catch (e) { showErr(e.message); throw e; }

let dirty = true;
const vc = new ViewController(canvas, () => { syncViewInputs(); dirty = true; hideHintSoon(); });

// ---------- helpers ----------
function clampNum(v, lo, hi, d) { v = Number(v); return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : d; }
function hex2rgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16 & 255) / 255, (n >> 8 & 255) / 255, (n & 255) / 255]; }
function validHex(h) { return typeof h === 'string' && /^#[0-9a-f]{6}$/i.test(h); }
function decimals(step) { const s = String(step); return s.includes('.') ? s.split('.')[1].length : 0; }
function fmt(p, v) { return p.opts ? p.opts[v] : Number(v).toFixed(decimals(p.step)); }
function defaults(ill) { return { params: ill.params.map(p => p.v), colors: ill.colors.map(c => c.v) }; }
function snap(p, v) {
  if (p.opts) return Math.max(0, Math.min(p.opts.length - 1, Math.round(v)));
  const s = Math.round((v - p.min) / p.step) * p.step + p.min;
  return Number(Math.min(p.max, Math.max(p.min, s)).toFixed(6));
}
function showErr(msg) { const e = $('err'); e.textContent = msg; e.hidden = !msg; }
function typing() {
  const a = document.activeElement;
  return a && (a.tagName === 'INPUT' && a.type !== 'checkbox' && a.type !== 'range' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT');
}

// ---------- illusion list + picker ----------
const listEl = $('list'), pick = $('pick');
const listBtns = new Map();
for (const cat of CATEGORIES) {
  const head = document.createElement('div'); head.className = 'cat'; head.textContent = cat;
  const grp = document.createElement('div'); grp.className = 'grp';
  const og = document.createElement('optgroup'); og.label = cat;
  for (const ill of ILLUSIONS.filter(i => i.cat === cat)) {
    const b = document.createElement('button');
    b.type = 'button'; b.textContent = ill.name;
    b.addEventListener('click', () => select(ill.id));
    grp.appendChild(b); listBtns.set(ill.id, b);
    const o = document.createElement('option'); o.value = ill.id; o.textContent = ill.name; og.appendChild(o);
  }
  listEl.append(head, grp); pick.appendChild(og);
}
pick.addEventListener('change', () => select(pick.value));
function step(d) {
  const i = ILLUSIONS.indexOf(S.ill);
  select(ILLUSIONS[(i + d + ILLUSIONS.length) % ILLUSIONS.length].id);
}
$('prev').addEventListener('click', () => step(-1));
$('next').addEventListener('click', () => step(1));

// ---------- select ----------
function select(id, init = null) {
  const ill = byId(id) || ILLUSIONS[0];
  S.ill = ill;
  const d = defaults(ill);
  const sp = init?.params || store.p[ill.id];
  const sc = init?.colors || store.c[ill.id];
  S.params = ill.params.map((p, i) => (Array.isArray(sp) && Number.isFinite(+sp[i])) ? snap(p, +sp[i]) : d.params[i]);
  S.colors = ill.colors.map((c, i) => (Array.isArray(sc) && validHex(sc[i])) ? sc[i].toLowerCase() : d.colors[i]);
  S.reveal = false; S.time = 0;
  stopStare();
  store.id = ill.id;
  remember();
  pick.value = ill.id;
  for (const [bid, b] of listBtns) b.classList.toggle('on', bid === ill.id);
  $('infoSee').textContent = ill.info.see;
  $('infoWhy').textContent = ill.info.why;
  $('revealRow').hidden = !ill.reveal;
  $('revealLbl').textContent = ill.reveal || 'Reveal';
  $('revealBtn').disabled = !ill.reveal;
  $('revealBtn').title = ill.reveal ? ill.reveal + ' (R)' : 'Nothing to reveal here';
  $('stareRow').hidden = ill.stare === undefined;
  $('photoRow').hidden = !ill.tex;
  $('sec-colors').hidden = ill.colors.length === 0;
  syncReveal(); syncPlay();
  buildParams(); buildColors();
  if (!init?.keepView) vc.reset();
  showErr('');
  dirty = true;
}

function remember() {
  store.p[S.ill.id] = S.params.slice();
  store.c[S.ill.id] = S.colors.slice();
  save();
}

// ---------- parameter controls ----------
function buildParams() {
  const box = $('params');
  box.textContent = '';
  S.ill.params.forEach((p, i) => {
    const wrap = document.createElement('div'); wrap.className = 'ctl';
    const lab = document.createElement('label');
    const out = document.createElement('output');
    lab.append(p.n + ' ', out);
    let input;
    if (p.opts) {
      input = document.createElement('select');
      p.opts.forEach((o, k) => { const op = document.createElement('option'); op.value = k; op.textContent = o; input.appendChild(op); });
      input.value = S.params[i];
      out.textContent = '';
      input.addEventListener('change', () => { S.params[i] = +input.value; remember(); dirty = true; });
    } else {
      input = document.createElement('input');
      input.type = 'range'; input.min = p.min; input.max = p.max; input.step = p.step; input.value = S.params[i];
      out.textContent = fmt(p, S.params[i]);
      input.addEventListener('input', () => {
        S.params[i] = +input.value; out.textContent = fmt(p, S.params[i]); remember(); dirty = true;
      });
    }
    input.setAttribute('aria-label', p.n);
    input.dataset.idx = i;
    wrap.append(lab, input);
    box.appendChild(wrap);
  });
}

function buildColors() {
  const box = $('colors');
  box.textContent = '';
  S.ill.colors.forEach((c, i) => {
    const row = document.createElement('label'); row.className = 'colrow';
    const inp = document.createElement('input'); inp.type = 'color'; inp.value = S.colors[i];
    inp.addEventListener('input', () => { S.colors[i] = inp.value; remember(); dirty = true; });
    row.append(c.n, inp);
    box.appendChild(row);
  });
}

$('randBtn').addEventListener('click', () => {
  S.params = S.ill.params.map((p, i) => {
    if (i === S.ill.stare) return S.params[i];
    if (p.opts) return Math.floor(Math.random() * p.opts.length);
    // bias toward the middle of the range so most rolls stay readable
    const t = (Math.random() + Math.random()) / 2;
    return snap(p, p.min + t * (p.max - p.min));
  });
  stopStare(); remember(); buildParams(); dirty = true;
});
$('resetBtn').addEventListener('click', () => {
  S.params = defaults(S.ill).params; stopStare(); remember(); buildParams(); dirty = true;
});
$('colReset').addEventListener('click', () => { S.colors = defaults(S.ill).colors; remember(); buildColors(); dirty = true; });
$('invertBtn').addEventListener('click', () => {
  S.colors = S.colors.map(h => '#' + (0xffffff ^ parseInt(h.slice(1), 16)).toString(16).padStart(6, '0'));
  remember(); buildColors(); dirty = true;
});

// ---------- reveal / play ----------
function syncReveal() {
  $('revealChk').checked = S.reveal;
  $('revealBtn').classList.toggle('on', S.reveal);
}
function setReveal(v) { if (!S.ill.reveal) return; S.reveal = v; syncReveal(); dirty = true; }
$('revealChk').addEventListener('change', e => setReveal(e.target.checked));
$('revealBtn').addEventListener('click', () => setReveal(!S.reveal));

function syncPlay() {
  const b = $('playBtn');
  b.disabled = !S.ill.animated;
  b.textContent = S.playing ? 'Pause' : 'Play';
  b.title = S.ill.animated ? 'Play / pause (Space)' : 'This one is a still image';
}
$('playBtn').addEventListener('click', () => { S.playing = !S.playing; syncPlay(); });

// ---------- stare test ----------
const stareEl = $('stare');
function startStare() {
  S.stare = { t0: performance.now(), dur: S.params[S.ill.stare] * 1000, done: false, last: '' };
  S.phase = 0; S.playing = true; syncPlay();
  $('stareBtn').textContent = 'Stop';
  $('stareBtn').classList.remove('accent');
  stareEl.hidden = false;
  dirty = true;
}
function stopStare() {
  S.stare = null; S.phase = 0;
  stareEl.hidden = true;
  $('stareBtn').textContent = 'Start stare';
  $('stareBtn').classList.add('accent');
  dirty = true;
}
function tickStare(now) {
  const st = S.stare;
  if (!st || st.done) return;
  const left = Math.ceil((st.dur - (now - st.t0)) / 1000);
  if (left <= 0) {
    st.done = true; S.phase = 1; dirty = true;
    stareEl.textContent = 'Keep looking at the dot…';
    $('stareBtn').textContent = 'Start stare';
    $('stareBtn').classList.add('accent');
    return;
  }
  const txt = `Stare at the dot · ${left}`;
  if (txt !== st.last) { stareEl.textContent = txt; st.last = txt; }
}
$('stareBtn').addEventListener('click', () => {
  if (S.stare && !S.stare.done) stopStare(); else startStare();
});

// ---------- photo ----------
$('photoIn').addEventListener('change', async e => {
  const f = e.target.files[0];
  if (!f) return;
  try {
    const img = await loadImage(f);
    const k = Math.min(1, 2048 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    renderer.setImage(c);
    stopStare(); dirty = true;
  } catch { showErr('Could not read that image.'); }
  e.target.value = '';
});
function loadImage(file) {
  return new Promise((res, rej) => {
    const url = URL.createObjectURL(file);
    const im = new Image();
    im.onload = () => { URL.revokeObjectURL(url); res(im); };
    im.onerror = () => { URL.revokeObjectURL(url); rej(new Error('bad image')); };
    im.src = url;
  });
}

// ---------- view inputs ----------
const zoomIn = $('zoom'), rotIn = $('rotIn'), speedIn = $('speed'), qualIn = $('quality');
function syncViewInputs() {
  zoomIn.value = Math.log(vc.zoom);
  $('zoomOut').textContent = vc.zoom.toFixed(2) + '×';
  let deg = vc.rot * 180 / Math.PI;
  deg = ((deg + 180) % 360 + 360) % 360 - 180;
  rotIn.value = deg;
  $('rotOut').textContent = Math.round(deg) + '°';
}
zoomIn.addEventListener('input', () => { vc.set({ zoom: Math.exp(+zoomIn.value) }); syncViewInputs(); dirty = true; });
rotIn.addEventListener('input', () => { vc.set({ rot: +rotIn.value * Math.PI / 180 }); syncViewInputs(); dirty = true; });
speedIn.value = S.speed;
$('speedOut').textContent = S.speed.toFixed(2) + '×';
speedIn.addEventListener('input', () => {
  S.speed = +speedIn.value; $('speedOut').textContent = S.speed.toFixed(2) + '×'; store.speed = S.speed; save();
});
qualIn.value = S.quality;
qualIn.addEventListener('change', () => { S.quality = +qualIn.value; store.quality = S.quality; save(); dirty = true; });
$('viewReset').addEventListener('click', () => vc.reset());
$('fsBtn').addEventListener('click', () => {
  const v = $('view');
  if (document.fullscreenElement) document.exitFullscreen?.();
  else (v.requestFullscreen || v.webkitRequestFullscreen)?.call(v);
});

// ---------- hint ----------
const coarse = matchMedia('(pointer: coarse)').matches;
$('hint').textContent = coarse
  ? 'Drag · pinch · two fingers pan & twist · double-tap resets'
  : 'Drag to pan · wheel to zoom · double-click resets · ← → switch · R reveal';
let hintTimer = setTimeout(() => { $('hint').hidden = true; }, 9000);
function hideHintSoon() { clearTimeout(hintTimer); hintTimer = setTimeout(() => { $('hint').hidden = true; }, 1500); }

// ---------- keyboard ----------
addEventListener('keydown', e => {
  if (typing() || e.metaKey || e.ctrlKey || e.altKey) return;
  const tag = document.activeElement?.tagName;
  if (e.key === 'ArrowLeft' && tag !== 'INPUT') { step(-1); e.preventDefault(); }
  else if (e.key === 'ArrowRight' && tag !== 'INPUT') { step(1); e.preventDefault(); }
  else if (e.key === 'r' || e.key === 'R') setReveal(!S.reveal);
  else if (e.key === ' ' && tag !== 'BUTTON') { S.playing = !S.playing; syncPlay(); e.preventDefault(); }
  else if (e.key === 'f' || e.key === 'F') $('fsBtn').click();
  else if (e.key === '0') vc.reset();
});

// ---------- sizing ----------
function resize() {
  const r = $('view').getBoundingClientRect();
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const w = Math.max(1, Math.round(r.width * dpr)), h = Math.max(1, Math.round(r.height * dpr));
  if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; dirty = true; }
}
new ResizeObserver(resize).observe($('view'));

// ---------- render ----------
function uniforms() {
  return {
    time: S.time, params: S.params, colors: S.colors.map(hex2rgb),
    pan: vc.pan, zoom: vc.zoom, rot: vc.rot, reveal: S.reveal, phase: S.phase,
  };
}
function draw(quality = S.quality) {
  try { renderer.draw(S.ill, quality, uniforms()); }
  catch (e) { showErr(`${S.ill.name}: ${e.message}`); }
}
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (S.ill.animated && S.playing) { S.time += dt * S.speed; dirty = true; }
  tickStare(now);
  if (dirty || S.recording) { draw(); dirty = false; }
  requestAnimationFrame(frame);
}

// ---------- export: PNG ----------
const note = $('exportNote');
$('pngBtn').addEventListener('click', () => {
  const v = $('pngSize').value;
  const ow = canvas.width, oh = canvas.height;
  let w, h;
  if (v.includes('x')) [w, h] = v.split('x').map(Number);
  else { w = Math.round(ow * +v); h = Math.round(oh * +v); }
  const gl = renderer.gl;
  const maxDim = Math.min(...gl.getParameter(gl.MAX_VIEWPORT_DIMS), gl.getParameter(gl.MAX_RENDERBUFFER_SIZE));
  const k = Math.min(1, maxDim / Math.max(w, h));
  w = Math.floor(w * k); h = Math.floor(h * k);
  canvas.width = w; canvas.height = h;
  draw(Math.max(2, S.quality));
  const aw = gl.drawingBufferWidth, ah = gl.drawingBufferHeight;
  const url = canvas.toDataURL('image/png');
  canvas.width = ow; canvas.height = oh;
  draw();
  download(url, `phantasma-${S.ill.id}-${aw}x${ah}.png`);
  note.textContent = `Saved ${aw} × ${ah} PNG.`;
});
function download(href, name) {
  const a = document.createElement('a');
  a.href = href; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
}

// ---------- export: video ----------
let rec = null;
const recLen = $('recLen');
$('recOut').textContent = recLen.value + ' s';
recLen.addEventListener('input', () => { $('recOut').textContent = recLen.value + ' s'; });
$('recBtn').addEventListener('click', () => {
  if (rec) { rec.stop(); return; }
  if (!window.MediaRecorder || !canvas.captureStream) { note.textContent = 'Video recording is not supported in this browser.'; return; }
  const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm', 'video/mp4'].find(m => MediaRecorder.isTypeSupported(m));
  if (!mime) { note.textContent = 'No supported video format in this browser.'; return; }
  const stream = canvas.captureStream(60);
  const chunks = [];
  rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12e6 });
  rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  rec.onstop = () => {
    S.recording = false; rec = null;
    stream.getTracks().forEach(t => t.stop());
    clearInterval(recTimer);
    $('recBtn').textContent = 'Record ' + (mime.includes('mp4') ? 'MP4' : 'WebM');
    $('recBtn').classList.remove('pending');
    const blob = new Blob(chunks, { type: mime.split(';')[0] });
    const url = URL.createObjectURL(blob);
    download(url, `phantasma-${S.ill.id}.${mime.includes('mp4') ? 'mp4' : 'webm'}`);
    setTimeout(() => URL.revokeObjectURL(url), 10000);
    note.textContent = `Saved ${(blob.size / 1e6).toFixed(1)} MB video.`;
  };
  S.recording = true;
  rec.start(250);
  const t0 = performance.now(), len = +recLen.value;
  const recTimer = setInterval(() => {
    const left = Math.ceil(len - (performance.now() - t0) / 1000);
    $('recBtn').textContent = `Recording… ${Math.max(0, left)} s (tap to stop)`;
    if (left <= 0 && rec && rec.state === 'recording') rec.stop();
  }, 200);
  $('recBtn').classList.add('pending');
});

// ---------- share link ----------
let hashTimer = 0;
function scheduleHash() {
  clearTimeout(hashTimer);
  hashTimer = setTimeout(() => {
    if (!S.ill) return;
    const h = `#i=${S.ill.id}&p=${S.params.join(',')}&c=${S.colors.map(c => c.slice(1)).join(',')}`;
    try { history.replaceState(null, '', h); } catch { /* sandboxed */ }
  }, 400);
}
function parseHash() {
  const q = new URLSearchParams(location.hash.slice(1));
  const id = q.get('i');
  if (!id || !byId(id)) return null;
  return {
    id,
    params: q.get('p')?.split(',').map(Number),
    colors: q.get('c')?.split(',').map(c => '#' + c),
  };
}
$('linkBtn').addEventListener('click', async () => {
  scheduleHash();
  await new Promise(r => setTimeout(r, 450));
  try { await navigator.clipboard.writeText(location.href); note.textContent = 'Link copied.'; }
  catch { note.textContent = location.href; }
});

// ---------- boot ----------
$('ver').textContent = 'v' + VERSION;
setupTabs({
  strip: $('tabstrip'),
  sections: [...document.querySelectorAll('#secs .sec')],
  storageKey: KEY + '.tab',
  query: TAB_QUERY,
});
const fromHash = parseHash();
if (fromHash) select(fromHash.id, fromHash);
else select(store.id && byId(store.id) ? store.id : ILLUSIONS[0].id);
resize();
syncViewInputs();
requestAnimationFrame(frame);

// test / debugging hook
window.__phantasma = { VERSION, ILLUSIONS, S, select, draw, renderer, vc };
