// Phantasma — optical illusion lab. UI, state, render loop, export.
import { ILLUSIONS, CATEGORIES, byId } from './illusions/index.js';
import { Renderer } from './engine/gl.js';
import { ViewController } from './engine/view.js';
import { setupTabs } from './engine/tabs.js';
import { MP4Muxer, findAvcConfig } from './engine/mp4.js';

export const VERSION = '1.5.0';
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
  time: 0, phase: 0, stare: null, recording: false, exporting: false,
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
  $('revealBtn').hidden = !ill.reveal;
  $('revealBtn').title = ill.reveal ? ill.reveal + ' (R)' : '';
  $('playBtn').hidden = !ill.animated;
  $('speedCtl').hidden = !ill.animated;
  $('videoCtl').hidden = !ill.animated;
  $('stareRow').hidden = ill.stare === undefined;
  $('photoRow').hidden = !ill.tex;
  syncReveal(); syncPlay();
  paramRows = []; colorRows = [];
  buildParams(); buildColors();
  vc.setOrbitMode(!!ill.orbit);
  $('orbitCtl').hidden = !ill.orbit;
  $('tiltCtl').hidden = !ill.orbit;
  setHint();
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
// A param or colour may declare `show: params => bool` (only shown when it applies to the
// current mode) and `n` may be a function of params (label changes with the mode).
// Hidden values are kept, so switching back restores them.
const label = (x, params) => (typeof x.n === 'function' ? x.n(params) : x.n);
const applies = (x, params) => !x.show || x.show(params);
let paramRows = [], colorRows = [];

function refreshApplicable() {
  for (const r of paramRows) {
    r.wrap.hidden = !applies(r.p, S.params);
    r.name.textContent = label(r.p, S.params) + ' ';
    r.input.setAttribute('aria-label', label(r.p, S.params));
  }
  for (const r of colorRows) {
    r.row.hidden = !applies(r.c, S.params);
    r.name.textContent = label(r.c, S.params);
  }
  // only once the colour rows for this illusion exist, so the tab doesn't flicker away
  if (colorRows.length === S.ill.colors.length) $('sec-colors').hidden = !colorRows.some(r => !r.row.hidden);
}

function buildParams() {
  const box = $('params');
  box.textContent = '';
  paramRows = S.ill.params.map((p, i) => {
    const wrap = document.createElement('div'); wrap.className = 'ctl';
    const lab = document.createElement('label');
    const name = document.createElement('span');
    const out = document.createElement('output');
    lab.append(name, out);
    let input;
    if (p.opts) {
      input = document.createElement('select');
      p.opts.forEach((o, k) => { const op = document.createElement('option'); op.value = k; op.textContent = o; input.appendChild(op); });
      input.value = S.params[i];
      input.addEventListener('change', () => { S.params[i] = +input.value; remember(); refreshApplicable(); dirty = true; });
    } else {
      input = document.createElement('input');
      input.type = 'range'; input.min = p.min; input.max = p.max; input.step = p.step; input.value = S.params[i];
      out.textContent = fmt(p, S.params[i]);
      input.addEventListener('input', () => {
        S.params[i] = +input.value; out.textContent = fmt(p, S.params[i]); remember(); refreshApplicable(); dirty = true;
      });
    }
    input.dataset.idx = i;
    wrap.append(lab, input);
    box.appendChild(wrap);
    return { p, wrap, name, input };
  });
  refreshApplicable();
}

function buildColors() {
  const box = $('colors');
  box.textContent = '';
  colorRows = S.ill.colors.map((c, i) => {
    const row = document.createElement('label'); row.className = 'colrow';
    const name = document.createElement('span');
    const inp = document.createElement('input'); inp.type = 'color'; inp.value = S.colors[i];
    inp.addEventListener('input', () => { S.colors[i] = inp.value; remember(); dirty = true; });
    row.append(name, inp);
    box.appendChild(row);
    return { c, row, name };
  });
  refreshApplicable();
}

$('randBtn').addEventListener('click', () => {
  S.params = S.ill.params.map((p, i) => {
    if (i === S.ill.stare) return S.params[i];
    if (p.opts) return Math.floor(Math.random() * p.opts.length);
    // bias toward the middle of the range so most rolls stay readable
    const t = (Math.random() + Math.random()) / 2;
    return snap(p, p.min + t * (p.max - p.min));
  });
  stopStare(); remember(); buildParams(); refreshApplicable(); dirty = true;
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
  e.target.value = '';
  if (f) await loadPhoto(f);
});
async function loadPhoto(f) {
  try {
    const img = await loadImage(f);
    const k = Math.min(1, 2048 / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(img.width * k)); c.height = Math.max(1, Math.round(img.height * k));
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    renderer.setImage(c);
    stopStare(); dirty = true;
  } catch { showErr('Could not read that image.'); }
}
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
  const yaw = ((vc.orbit[0] * 180 / Math.PI + 180) % 360 + 360) % 360 - 180;
  const pitch = vc.orbit[1] * 180 / Math.PI;
  orbitIn.value = yaw; $('orbitOut').textContent = Math.round(yaw) + '°';
  tiltIn.value = pitch; $('tiltOut').textContent = Math.round(pitch) + '°';
}
const orbitIn = $('orbitIn'), tiltIn = $('tiltIn');
orbitIn.addEventListener('input', () => { vc.set({ orbit: [+orbitIn.value * Math.PI / 180, vc.orbit[1]] }); syncViewInputs(); dirty = true; });
tiltIn.addEventListener('input', () => { vc.set({ orbit: [vc.orbit[0], +tiltIn.value * Math.PI / 180] }); syncViewInputs(); dirty = true; });
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
function setHint() {
  const orbit = !!S.ill?.orbit;
  $('hint').textContent = coarse
    ? (orbit ? 'Drag to orbit · pinch zoom · two fingers pan · double-tap resets'
             : 'Drag · pinch · two fingers pan & twist · double-tap resets')
    : (orbit ? 'Drag to orbit · Shift- or right-drag to pan · wheel zoom · double-click resets'
             : 'Drag to pan · wheel to zoom · double-click resets · ← → switch · R reveal');
}
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
  if (S.exporting) return;
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
    pan: vc.pan, zoom: vc.zoom, rot: vc.rot, reveal: S.reveal, phase: S.phase, orbit: vc.orbit,
  };
}
// raymarched (heavy) illusions skip supersampling except at Best quality, to stay smooth on phones
function samples(quality) { return S.ill.heavy ? (quality >= 3 ? 2 : 1) : quality; }
function draw(quality = S.quality) {
  try { renderer.draw(S.ill, samples(quality), uniforms()); }
  catch (e) { showErr(`${S.ill.name}: ${e.message}`); }
}
let last = performance.now();
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  if (S.ill.animated && S.playing) { S.time += dt * S.speed; dirty = true; }
  tickStare(now);
  if (S.exporting) { requestAnimationFrame(frame); return; }
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
  draw(S.ill.heavy ? 3 : Math.max(2, S.quality));
  const aw = gl.drawingBufferWidth, ah = gl.drawingBufferHeight;
  const url = canvas.toDataURL('image/png');
  canvas.width = ow; canvas.height = oh;
  draw();
  download(url, `phantasma-${S.ill.id}-${aw}x${ah}.png`);
  note.textContent = `Saved ${aw} × ${ah} PNG.`;
});
function fmtBytes(n) { return n < 1e6 ? Math.max(1, Math.round(n / 1e3)) + ' KB' : (n / 1e6).toFixed(1) + ' MB'; }
function download(href, name) {
  const a = document.createElement('a');
  a.href = href; a.download = name;
  document.body.appendChild(a); a.click(); a.remove();
}

// ---------- export: video ----------
// MP4 (default): frames are rendered one by one at exact time steps and encoded with
// WebCodecs H.264, then muxed by engine/mp4.js — any size/fps, no dropped frames.
// If WebCodecs H.264 isn't available, MP4 falls back to real-time MediaRecorder capture
// where the browser supports it (Safari). WebM always uses real-time MediaRecorder.
let rec = null, offlineJob = null;
const vid = Object.assign({ fmt: 'mp4', size: '1920x1080', fps: 60, len: 6 }, store.video || {});
const vidFmt = $('vidFmt'), vidSize = $('vidSize'), vidFps = $('vidFps'), recLen = $('recLen'), recBtn = $('recBtn');
const hasWebCodecs = typeof VideoEncoder !== 'undefined' && typeof VideoFrame !== 'undefined';
const recMime = fmt => {
  if (!window.MediaRecorder || !canvas.captureStream) return null;
  const list = fmt === 'mp4'
    ? ['video/mp4;codecs=avc1.640028', 'video/mp4;codecs=avc1', 'video/mp4']
    : ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm'];
  return list.find(m => MediaRecorder.isTypeSupported(m)) || null;
};
let mp4Mode = hasWebCodecs ? 'webcodecs' : (recMime('mp4') ? 'recorder' : null);
if (!recMime('webm')) vidFmt.querySelector('option[value=webm]').disabled = true;

function syncVideoUI() {
  const fmt = vidFmt.value;
  const offline = fmt === 'mp4' && mp4Mode === 'webcodecs';
  $('vidSizeCtl').hidden = !offline;
  $('vidFpsCtl').hidden = !offline;
  if (!rec && !offlineJob) recBtn.textContent = 'Export ' + fmt.toUpperCase();
  $('recOut').textContent = recLen.value + ' s';
}
function saveVideo() {
  store.video = { fmt: vidFmt.value, size: vidSize.value, fps: +vidFps.value, len: +recLen.value };
  save();
}
vidFmt.value = vid.fmt; vidSize.value = vid.size; vidFps.value = String(vid.fps); recLen.value = vid.len;
if (vidFmt.selectedIndex < 0 || vidFmt.selectedOptions[0].disabled) vidFmt.value = 'mp4';
if (vidSize.selectedIndex < 0) vidSize.value = '1920x1080';
if (vidFps.selectedIndex < 0) vidFps.value = '60';
for (const el of [vidFmt, vidSize, vidFps]) el.addEventListener('change', () => { syncVideoUI(); saveVideo(); });
recLen.addEventListener('input', () => { syncVideoUI(); saveVideo(); });

// confirm H.264 encoding really works here; otherwise degrade gracefully
if (hasWebCodecs) {
  findAvcConfig(1280, 720, 30, 5e6).then(cfg => {
    if (!cfg) mp4Mode = recMime('mp4') ? 'recorder' : null;
    if (!mp4Mode) {
      vidFmt.querySelector('option[value=mp4]').disabled = true;
      if (!vidFmt.querySelector('option[value=webm]').disabled) vidFmt.value = 'webm';
      note.textContent = 'MP4 export is not supported in this browser — using WebM.';
    }
    syncVideoUI();
  });
} else if (!mp4Mode) {
  vidFmt.querySelector('option[value=mp4]').disabled = true;
  if (!vidFmt.querySelector('option[value=webm]').disabled) vidFmt.value = 'webm';
}
syncVideoUI();

const even = v => Math.max(2, Math.floor(v / 2) * 2);
function videoDims() {
  if (vidSize.value === 'screen') return [even(canvas.width), even(canvas.height)];
  return vidSize.value.split('x').map(Number);
}

recBtn.addEventListener('click', async () => {
  if (offlineJob) { offlineJob.stop = true; return; }
  if (rec) { rec.stop(); return; }
  const fmt = vidFmt.value;
  if (fmt === 'mp4' && mp4Mode === 'webcodecs') {
    const [w, h] = videoDims();
    const fps = +vidFps.value;
    const bitrate = Math.round(Math.min(60e6, Math.max(4e6, w * h * fps * 0.15)));
    const cfg = await findAvcConfig(w, h, fps, bitrate);
    if (cfg) { await exportOffline(cfg, w, h, fps, +recLen.value); return; }
    if (!recMime('mp4')) { note.textContent = `This browser can't encode H.264 at ${w} × ${h}. Try a smaller size.`; return; }
    note.textContent = `H.264 at ${w} × ${h} isn't available here — recording the view in real time instead.`;
  }
  recordRealtime(fmt);
});

async function exportOffline(cfg, w, h, fps, len) {
  const gl = renderer.gl;
  const ow = canvas.width, oh = canvas.height, t0 = S.time;
  const total = Math.round(len * fps);
  const animate = S.ill.animated && S.playing;
  const job = offlineJob = { stop: false };
  const mux = new MP4Muxer({ width: w, height: h, fps });
  let encErr = null;
  const encoder = new VideoEncoder({ output: (c, m) => mux.addChunk(c, m), error: e => { encErr = e; } });
  S.exporting = true;
  recBtn.classList.add('pending');
  let done = 0;
  try {
    canvas.width = w; canvas.height = h;
    if (gl.drawingBufferWidth !== w || gl.drawingBufferHeight !== h) throw new Error(`GPU limit: can't render ${w} × ${h} here.`);
    encoder.configure(cfg);
    for (let i = 0; i < total && !job.stop; i++) {
      if (encErr) throw encErr;
      if (animate) S.time = t0 + (i / fps) * S.speed;
      draw();
      const frame = new VideoFrame(canvas, { timestamp: Math.round(i * 1e6 / fps), duration: Math.round(1e6 / fps) });
      encoder.encode(frame, { keyFrame: i % (fps * 2) === 0 });
      frame.close();
      done = i + 1;
      while (encoder.encodeQueueSize > 4) await new Promise(r => setTimeout(r, 1));
      if (i % 4 === 0) {
        recBtn.textContent = `Rendering ${Math.round(done / total * 100)}% (tap to stop)`;
        await new Promise(r => setTimeout(r, 0));
      }
    }
    await encoder.flush();
    if (encErr) throw encErr;
    const blob = mux.finalize();
    const url = URL.createObjectURL(blob);
    download(url, `phantasma-${S.ill.id}-${w}x${h}-${fps}fps.mp4`);
    setTimeout(() => URL.revokeObjectURL(url), 15000);
    note.textContent = `Saved ${w} × ${h} MP4, ${(done / fps).toFixed(1)} s, ${fmtBytes(blob.size)}.`;
  } catch (e) {
    note.textContent = 'MP4 export failed: ' + (e?.message || e);
  } finally {
    try { if (encoder.state !== 'closed') encoder.close(); } catch { /* already closed */ }
    canvas.width = ow; canvas.height = oh;
    S.time = t0;
    S.exporting = false;
    offlineJob = null;
    recBtn.classList.remove('pending');
    syncVideoUI();
    resize();
    dirty = true;
  }
}

function recordRealtime(fmt) {
  const mime = recMime(fmt);
  if (!mime) { note.textContent = `${fmt.toUpperCase()} recording is not supported in this browser.`; return; }
  const ext = mime.includes('mp4') ? 'mp4' : 'webm';
  const stream = canvas.captureStream(60);
  const chunks = [];
  rec = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 12e6 });
  rec.ondataavailable = e => { if (e.data.size) chunks.push(e.data); };
  let recTimer = 0;
  rec.onstop = () => {
    S.recording = false; rec = null;
    stream.getTracks().forEach(t => t.stop());
    clearInterval(recTimer);
    recBtn.classList.remove('pending');
    syncVideoUI();
    const blob = new Blob(chunks, { type: mime.split(';')[0] });
    const url = URL.createObjectURL(blob);
    download(url, `phantasma-${S.ill.id}.${ext}`);
    setTimeout(() => URL.revokeObjectURL(url), 15000);
    note.textContent = `Saved ${fmtBytes(blob.size)} ${ext.toUpperCase()} (real-time capture of the view).`;
  };
  S.recording = true;
  rec.start(250);
  const t0 = performance.now(), len = +recLen.value;
  recTimer = setInterval(() => {
    const left = Math.ceil(len - (performance.now() - t0) / 1000);
    recBtn.textContent = `Recording… ${Math.max(0, left)} s (tap to stop)`;
    if (left <= 0 && rec && rec.state === 'recording') rec.stop();
  }, 200);
  recBtn.classList.add('pending');
}

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

// ---------- reset everything ----------
// Two-tap confirm (no modal): first tap arms the button for 4 s, second tap resets.
const resetAllBtn = $('resetAll');
let resetArmed = 0;
function disarmReset() {
  clearTimeout(resetArmed); resetArmed = 0;
  resetAllBtn.classList.remove('armed');
  resetAllBtn.textContent = 'Reset everything';
}
resetAllBtn.addEventListener('click', () => {
  if (S.exporting || rec) { resetAllBtn.textContent = 'Finish the export first'; setTimeout(disarmReset, 1500); return; }
  if (!resetArmed) {
    resetAllBtn.classList.add('armed');
    resetAllBtn.textContent = 'Tap again to reset everything';
    resetArmed = setTimeout(disarmReset, 4000);
    return;
  }
  disarmReset();
  resetEverything();
  resetAllBtn.textContent = 'Everything reset ✓';
  setTimeout(() => { if (!resetArmed) resetAllBtn.textContent = 'Reset everything'; }, 1600);
});
function resetEverything() {
  clearTimeout(saveTimer);
  try {
    for (const k of Object.keys(localStorage)) if (k.startsWith(KEY + '.')) localStorage.removeItem(k);
  } catch { /* storage unavailable */ }
  store = { p: {}, c: {} };
  // global preferences
  S.playing = true; S.speed = 1; S.quality = 2; S.time = 0;
  speedIn.value = 1; $('speedOut').textContent = '1.00×';
  qualIn.value = 2;
  $('pngSize').value = '2';
  vidFmt.value = vidFmt.querySelector('option[value=mp4]').disabled ? 'webm' : 'mp4';
  vidSize.value = '1920x1080'; vidFps.value = '60'; recLen.value = 6;
  syncVideoUI();
  note.textContent = '';
  renderer.clearImage();
  if (document.fullscreenElement) document.exitFullscreen?.();
  try { history.replaceState(null, '', location.pathname + location.search); } catch { /* sandboxed */ }
  // first illusion with defaults (also resets reveal, stare, view, params, colours)
  select(ILLUSIONS[0].id);
  tabs.select('sec-illusion');
  $('secs').scrollTop = 0;
  $('hint').hidden = false;
  clearTimeout(hintTimer);
  hintTimer = setTimeout(() => { $('hint').hidden = true; }, 6000);
}

// ---------- boot ----------
$('ver').textContent = 'v' + VERSION;
const tabs = setupTabs({
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
window.__phantasma = { VERSION, ILLUSIONS, S, select, draw, renderer, vc, resetEverything, get store() { return store; } };

// ---------- shared image shelf (snicker02.github.io/shared/bridge.js) ----------
// The canvas has no preserved drawing buffer, so draw and read it back in the same task.
if (window.SnickerShelf) {
  window.SnickerShelf.mount({
    app: 'Phantasma',
    button: $('shelfBtn'),
    onImage: f => loadPhoto(f),
    getImage: () => { draw(); return new Promise((res, rej) => canvas.toBlob(b => b ? res(b) : rej(new Error('encode failed')), 'image/png')); },
    getMeta: () => ({ name: `phantasma-${S.ill.id}.png` }),
  });
} else {
  $('shelfBtn').hidden = true;
}
