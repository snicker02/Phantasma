// Lightness & colour illusions, including stare-and-switch afterimages.

export default [
  {
    id: 'grid', name: 'Scintillating grid', cat: 'Lightness & colour',
    params: [
      { n: 'Variant', opts: ['Scintillating', 'Hermann'], v: 0 },
      { n: 'Cells', min: 4, max: 20, step: 1, v: 9 },
      { n: 'Line width', min: 0.05, max: 0.5, step: 0.005, v: 0.18 },
      { n: 'Dot size', min: 0.1, max: 1.8, step: 0.01, v: 1.3, show: p => p[0] === 0 },
      { n: 'Rotation °', min: 0, max: 45, step: 0.5, v: 0 },
    ],
    colors: [{ n: 'Squares', v: '#000000' }, { n: 'Grey lines', v: '#808080', show: p => p[0] === 0 }, { n: p => p[0] === 0 ? 'Dots' : 'Lines', v: '#ffffff' }],
    info: {
      see: 'Scintillating: black dots flash in the white discs wherever you are not looking. Hermann: grey smudges at the intersections.',
      why: 'Every disc is pure white. Classic lateral-inhibition accounts explain the Hermann spots, but the scintillating version breaks with a slight rotation or with curved lines, so orientation-tuned cortical cells are now thought to be involved. Try 45° rotation.',
    },
    glsl: `
vec3 illusion(vec2 p){
  p = rot(radians(P4)) * p;
  float s = 2.0 / P1;
  vec2 f = (fract(p / s + 0.5) - 0.5) * s;
  float lw = P2 * s * 0.5;
  vec3 lc = P0 < 0.5 ? C1 : C2;
  vec3 col = mix(C0, lc, fill(min(abs(f.x), abs(f.y)) - lw));
  if (P0 < 0.5) col = mix(col, C2, fill(length(f) - lw * P3));
  return col;
}`,
  },
  {
    id: 'contrast', name: 'Simultaneous contrast', cat: 'Lightness & colour',
    reveal: 'Flatten the background',
    params: [
      { n: 'Variant', opts: ['Gradient bar', 'Split squares'], v: 0 },
      { n: 'Target size', min: 0.05, max: 0.6, step: 0.005, v: 0.18 },
      { n: 'Background contrast', min: 0, max: 1, step: 0.01, v: 1 },
    ],
    colors: [{ n: 'Dark side', v: '#0d0d0d' }, { n: 'Light side', v: '#f2f2f2' }, { n: 'Target', v: '#7f7f7f' }],
    info: {
      see: 'The bar looks darker at the light end and lighter at the dark end; the square on black looks paler.',
      why: 'The target is one uniform grey. Lightness is computed relative to surroundings — the visual system is trying to estimate surface reflectance under unknown lighting, so a light surround implies the target reflects less.',
    },
    glsl: `
vec3 illusion(vec2 p){
  float c = u_reveal > 0.5 ? 0.0 : P2;
  vec3 mid = mix(C0, C1, 0.5);
  float t;
  float d;
  if (P0 < 0.5) {
    t = smoothstep(-1.5, 1.5, p.x);
    d = sdBox(p, vec2(1.35, P1 * 0.5));
  } else {
    t = 1.0 - fill(p.x);
    d = min(sdBox(p - vec2(-0.55, 0.0), vec2(P1)), sdBox(p - vec2(0.55, 0.0), vec2(P1)));
  }
  vec3 col = mix(mid, mix(C0, C1, t), c);
  return mix(col, C2, fill(d));
}`,
  },
  {
    id: 'whites', name: "White's illusion", cat: 'Lightness & colour',
    reveal: 'Fade the stripes',
    params: [
      { n: 'Stripes', min: 6, max: 40, step: 1, v: 18 },
      { n: 'Bar width', min: 0.05, max: 0.8, step: 0.005, v: 0.32 },
      { n: 'Bar height', min: 0.2, max: 1.6, step: 0.01, v: 0.8 },
      { n: 'Separation', min: 0.2, max: 1.4, step: 0.01, v: 0.8 },
      { n: 'Orientation', opts: ['Horizontal stripes', 'Vertical stripes'], v: 0 },
    ],
    colors: [{ n: 'Black', v: '#000000' }, { n: 'White', v: '#ffffff' }, { n: 'Grey', v: '#808080' }],
    info: {
      see: 'The grey bars on the left look clearly lighter than those on the right.',
      why: "Both sets are the same grey. Odd twist: the left bars replace black stripes and touch mostly white along their long edges, so plain contrast predicts they'd look darker — yet they look lighter. The grouping with the stripe they sit in wins over the neighbours they touch.",
    },
    glsl: `
vec3 illusion(vec2 p){
  if (P4 > 0.5) p = vec2(p.y, -p.x);
  float s = 2.0 / P0;
  float t = sq(p.y / s, s);
  vec3 bg = mix(C0, C1, t);
  if (u_reveal > 0.5) bg = mix(mix(C0, C1, 0.5), bg, 0.3);
  float inA = fill(sdBox(p - vec2(-P3 * 0.5, 0.0), vec2(P1 * 0.5, P2 * 0.5)));
  float inB = fill(sdBox(p - vec2(P3 * 0.5, 0.0), vec2(P1 * 0.5, P2 * 0.5)));
  return mix(bg, C2, clamp(inA * (1.0 - t) + inB * t, 0.0, 1.0));
}`,
  },
  {
    id: 'afterimage', name: 'Colour afterimage', cat: 'Lightness & colour', stare: 2,
    params: [
      { n: 'Pattern', opts: ['Rings', 'Checker', 'Star', 'Stripes'], v: 1 },
      { n: p => p[0] === 2 ? 'Points' : 'Scale', min: 2, max: 20, step: 0.5, v: 6 },
      { n: 'Stare (s)', min: 5, max: 60, step: 1, v: 20 },
      { n: 'Test grey', min: 0, max: 1, step: 0.01, v: 0.9 },
    ],
    colors: [{ n: 'Colour A', v: '#00c8c8' }, { n: 'Colour B', v: '#ffcc00' }, { n: 'Fixation', v: '#000000' }],
    info: {
      see: 'Press Start stare and fix the dot. When it switches to plain grey, the pattern reappears in opposite colours.',
      why: 'Cone-opponent channels adapt to the colour they are exposed to. On a neutral field the adapted channels under-respond, so you see the complementary hue — cyan leaves red, yellow leaves blue.',
    },
    glsl: `
vec3 illusion(vec2 p){
  float dot_ = fill(length(p) - 0.014);
  if (u_phase > 0.5) return mix(vec3(P3), C2, dot_);
  float r = max(length(p), 1e-3), th = atan(p.y, p.x);
  float c = 2.0 / P1;
  float t;
  if (P0 < 0.5) t = sq(r / c, c);
  else if (P0 < 1.5) t = xr(sq(p.x / c, c), sq(p.y / c, c));
  else if (P0 < 2.5) { float N = 2.0 * floor(P1); t = sq(th / TAU * N, TAU * r / N); }
  else t = sq(p.x / c, c);
  vec3 col = mix(C0, C1, t);
  col = mix(col, vec3(1.0), fill(length(p) - 0.022));
  return mix(col, C2, dot_);
}`,
  },
  {
    id: 'photo-afterimage', name: 'Photo afterimage', cat: 'Lightness & colour', stare: 0, tex: true,
    params: [
      { n: 'Stare (s)', min: 5, max: 60, step: 1, v: 20 },
      { n: 'Colour boost', min: 0.5, max: 3, step: 0.05, v: 1.6 },
      { n: 'Test image', opts: ['Greyscale photo', 'Plain grey'], v: 0 },
      { n: 'Image scale', min: 0.3, max: 3, step: 0.01, v: 1 },
    ],
    colors: [{ n: 'Fixation', v: '#ff2020' }],
    info: {
      see: 'Load any photo (or use the built-in scene), press Start stare. When it switches to black-and-white, the photo looks fully coloured for a few seconds.',
      why: 'The first image keeps the brightness but inverts the colour. Your colour channels adapt to that inverted colour, then the afterimage paints the true colours back onto the greyscale version. Cover the dot with a finger after the switch and look again — the colour lingers only around where you were fixating.',
    },
    glsl: `
vec3 scene(vec2 uv){
  vec3 col = mix(vec3(1.0, 0.55, 0.25), vec3(0.22, 0.42, 0.92), smoothstep(-0.1, 0.95, uv.y));
  col = mix(col, vec3(1.0, 0.88, 0.25), fill(length(uv - vec2(0.42, 0.32)) - 0.2));
  col = mix(col, vec3(0.2, 0.55, 0.3), fill(uv.y - (-0.12 + 0.12 * sin(uv.x * 2.6 + 1.0))));
  col = mix(col, vec3(0.1, 0.42, 0.2), fill(uv.y - (-0.38 + 0.08 * sin(uv.x * 4.3 + 2.0))));
  col = mix(col, vec3(0.1, 0.35, 0.75), fill(uv.y + 0.62));
  for (int i = 0; i < 5; i++) {
    float fi = float(i);
    vec2 c = vec2(-0.95 + fi * 0.42, -0.48 + 0.05 * sin(fi * 2.1));
    col = mix(col, vec3(0.1, 0.45, 0.15), fill(sdSeg(uv, c, c - vec2(0.0, 0.25)) - 0.012));
    col = mix(col, hsv(fract(0.95 + fi * 0.13), 0.85, 0.95), fill(length(uv - c) - 0.075));
    col = mix(col, vec3(1.0, 0.9, 0.2), fill(length(uv - c) - 0.025));
  }
  return col;
}
vec3 photo(vec2 p){
  vec2 q = p / P3;
  if (u_hasTex < 0.5) return scene(q);
  vec2 uv = vec2(q.x / u_texAspect, q.y) * 0.5 + 0.5;
  if (uv.x < 0.0 || uv.y < 0.0 || uv.x > 1.0 || uv.y > 1.0) return vec3(0.5);
  return texture2D(u_tex, uv).rgb;
}
vec3 illusion(vec2 p){
  vec3 c = photo(p);
  float y = luma(c);
  vec3 col = u_phase > 0.5 ? (P2 < 0.5 ? vec3(y) : vec3(0.55))
                           : clamp(vec3(y) + (vec3(y) - c) * P1, 0.0, 1.0);
  col = mix(col, vec3(1.0), fill(length(p) - 0.02));
  return mix(col, C0, fill(length(p) - 0.013));
}`,
  },
  {
    id: 'troxler', name: 'Troxler fading', cat: 'Lightness & colour',
    params: [
      { n: 'Blobs', min: 3, max: 16, step: 1, v: 8 },
      { n: 'Orbit radius', min: 0.2, max: 0.9, step: 0.005, v: 0.55 },
      { n: 'Blob size', min: 0.05, max: 0.4, step: 0.005, v: 0.17 },
      { n: 'Softness', min: 0, max: 1, step: 0.01, v: 0.9 },
      { n: 'Saturation', min: 0, max: 1, step: 0.01, v: 0.45 },
      { n: 'Hue offset', min: 0, max: 1, step: 0.01, v: 0 },
    ],
    colors: [{ n: 'Background', v: '#b4b4b4' }, { n: 'Fixation', v: '#000000' }],
    info: {
      see: 'Hold your gaze on the cross. Within 10–20 seconds the coloured blobs fade into the grey.',
      why: 'Neurons stop responding to unchanging input. Normally tiny eye movements refresh the image on the retina, but soft-edged, low-contrast stimuli in the periphery change too little, so they fade. Raise the saturation or lower the softness and they resist.',
    },
    glsl: `
vec3 illusion(vec2 p){
  vec3 col = C0;
  for (int i = 0; i < 16; i++) {
    float fi = float(i);
    if (fi >= P0) break;
    float a = fi / P0 * TAU;
    float d = length(p - P1 * vec2(cos(a), sin(a)));
    float w = 1.0 - smoothstep(P2 * (1.0 - P3), P2 * (1.0 + P3 * 0.6) + u_px, d);
    vec3 hc = mix(C0, hsv(fract(fi / P0 + P5), 1.0, 0.85), P4);
    col = mix(col, hc, w);
  }
  float cr = min(sdBox(p, vec2(0.03, 0.005)), sdBox(p, vec2(0.005, 0.03)));
  return mix(col, C1, fill(cr));
}`,
  },

  {
    id: 'shadow-checker', name: 'Shadow checker', cat: 'Lightness & colour',
    reveal: 'Connect the two tiles',
    params: [
      { n: 'Tiles', min: 4, max: 12, step: 1, v: 7 },
      { n: 'Shadow size', min: 0.2, max: 0.9, step: 0.005, v: 0.42 },
      { n: 'Shadow softness', min: 0.05, max: 0.7, step: 0.005, v: 0.4 },
      { n: 'Ball', opts: ['Show', 'Hide'], v: 0 },
    ],
    colors: [{ n: 'Dark tile', v: '#6b6b6b' }, { n: 'Light tile', v: '#c8c8c8' }, { n: 'Ball', v: '#3f9a4a', show: p => p[3] === 0 }, { n: 'Tile markers', v: '#e03a3a' }],
    info: {
      see: 'The marked dark tile in the light looks much darker than the marked light tile in the shadow.',
      why: "After Adelson's checker-shadow. The two marked tiles are exactly the same colour — the shadow is computed so that light-tile × shadow = dark tile. Your visual system discounts the shadow to recover each tile's true paint, which is the right answer for surfaces but the wrong one for pixels. Reveal joins them with a bar of that same grey.",
    },
    glsl: `
float shadowMask(vec2 p, vec2 sc, float s){
  float core = max(P1, s * 0.75);
  return 1.0 - smoothstep(core, core + P2, length((p - sc) * vec2(1.0, 1.35)));
}
vec3 illusion(vec2 p){
  float s = 2.0 / P0;
  // light where cell.x + cell.y is even (antialiased checker)
  float light = 1.0 - xr(sq(p.x / s, s), sq(p.y / s, s));
  vec2 bIdx = vec2(1.0, -1.0), aIdx = vec2(-2.0, 1.0);
  vec2 sc = (bIdx + 0.5) * s;
  vec3 k = C0 / max(C1, vec3(1e-3));
  float m = shadowMask(p, sc, s);
  vec3 base = mix(C0, C1, light);
  vec3 col = base * mix(vec3(1.0), k, m);
  if (P3 < 0.5) {
    vec2 bc = sc + vec2(1.25, 1.0) * s;   // up-right of the shadow, clear of tile B
    float br = s * 0.8;
    float d = length(p - bc) - br;
    vec2 l = normalize(vec2(-0.5, 0.7));
    float sh = clamp(dot(normalize(vec3((p - bc) / br, sqrt(max(0.0, 1.0 - dot((p - bc) / br, (p - bc) / br))))), vec3(l, 0.6)), 0.0, 1.0);
    col = mix(col, C2 * (0.35 + 0.75 * sh), fill(d));
  }
  float ma = abs(sdBox(p - (aIdx + 0.5) * s, vec2(s * 0.5))) - max(u_px * 1.2, s * 0.015);
  float mb = abs(sdBox(p - sc, vec2(s * 0.5))) - max(u_px * 1.2, s * 0.015);
  col = mix(col, C3, fill(min(ma, mb)));
  if (u_reveal > 0.5) {
    vec2 A = (aIdx + 0.5) * s, B = sc;
    float bar = min(sdBox(p - vec2(A.x, (A.y + B.y) * 0.5), vec2(s * 0.14, abs(A.y - B.y) * 0.5)),
                    sdBox(p - vec2((A.x + B.x) * 0.5, B.y), vec2(abs(A.x - B.x) * 0.5 + s * 0.14, s * 0.14)));
    col = mix(col, C0, fill(bar));
  }
  return col;
}`,
  },
  {
    id: 'cornsweet', name: 'Cornsweet edge', cat: 'Lightness & colour',
    reveal: 'Cover the edge',
    params: [
      { n: 'Edge width', min: 0.02, max: 0.6, step: 0.005, v: 0.2 },
      { n: 'Edge contrast', min: 0, max: 0.4, step: 0.005, v: 0.16 },
      { n: 'Base grey', min: 0.2, max: 0.8, step: 0.01, v: 0.5 },
      { n: 'Layout', opts: ['Left / right', 'Disc'], v: 0 },
      { n: 'Disc radius', min: 0.2, max: 0.9, step: 0.01, v: 0.5, show: p => p[3] === 1 },
    ],
    colors: [],
    info: {
      see: 'The right half (or the disc) looks clearly lighter than the left half (or the surround).',
      why: 'Far from the edge both sides are the identical grey. Only a narrow light/dark cusp at the border differs, and the visual system — which mostly encodes edges and fills in surfaces from them — spreads that edge contrast across the whole region. Cover the edge and the halves match.',
    },
    glsl: `
vec3 illusion(vec2 p){
  float x = P3 < 0.5 ? p.x : P4 - length(p);
  float v = P2 + P1 * sign(x) * exp(-abs(x) / max(P0 * 0.35, 1e-3));
  vec3 col = vec3(v);
  if (u_reveal > 0.5) {
    float cover = P3 < 0.5 ? abs(p.x) - P0 * 1.2 : abs(length(p) - P4) - P0 * 1.2;
    col = mix(col, vec3(0.08), fill(cover));
  }
  return col;
}`,
  },
  {
    id: 'mach-bands', name: 'Mach bands', cat: 'Lightness & colour',
    reveal: 'Plot the real brightness',
    params: [
      { n: 'Variant', opts: ['Staircase', 'Ramp'], v: 0 },
      { n: 'Steps', min: 3, max: 16, step: 1, v: 8, show: p => p[0] === 0 },
      { n: 'Ramp width', min: 0.1, max: 1.5, step: 0.01, v: 0.5, show: p => p[0] === 1 },
      { n: 'Contrast', min: 0.1, max: 1, step: 0.01, v: 0.7 },
    ],
    colors: [],
    info: {
      see: 'Each step looks lighter along its left edge and darker along its right edge (staircase); bright and dark stripes appear where the ramp starts and stops.',
      why: 'Every step is perfectly flat, and the ramp is linear. Lateral inhibition in the retina exaggerates changes in luminance, overshooting at each edge. Reveal plots the actual brightness under the pattern — flat steps, no stripes.',
    },
    glsl: `
float profile(float x){
  float lo = 0.5 - P3 * 0.5, hi = 0.5 + P3 * 0.5;
  if (P0 < 0.5) {
    float t = clamp((x + 1.6) / 3.2, 0.0, 0.9999);
    return mix(lo, hi, floor(t * P1) / max(P1 - 1.0, 1.0));
  }
  return mix(lo, hi, clamp(x / P2 + 0.5, 0.0, 1.0));
}
vec3 illusion(vec2 p){
  float v = profile(p.x);
  vec3 col = vec3(v);
  if (u_reveal > 0.5) {
    float base = -0.85, amp = 0.5;
    col = mix(col, vec3(0.0), fill(p.y - (base + amp + 0.06)) * fill(-(p.y - (base - 0.04))) * 0.75);
    float y = base + v * amp;
    col = mix(col, vec3(1.0, 0.25, 0.15), fill(abs(p.y - y) - max(u_px, 0.004)));
  }
  return col;
}`,
  },
  {
    id: 'munker-white', name: 'Munker colour', cat: 'Lightness & colour',
    reveal: 'Grey out the stripes',
    params: [
      { n: 'Stripes', min: 10, max: 60, step: 1, v: 30 },
      { n: 'Bar width', min: 0.1, max: 0.8, step: 0.005, v: 0.42 },
      { n: 'Bar height', min: 0.2, max: 1.6, step: 0.01, v: 1.05 },
      { n: 'Separation', min: 0.3, max: 1.4, step: 0.01, v: 0.9 },
    ],
    colors: [{ n: 'Target', v: '#e03c31' }, { n: 'Stripe A', v: '#2747d6' }, { n: 'Stripe B', v: '#f0d000' }],
    info: {
      see: 'The left bars look purplish-red, the right bars orange — two different colours.',
      why: "Every bar is the same red. Unlike ordinary contrast, here colours assimilate: each bar takes on some of the colour of the stripes it is interleaved with (the Munker–White effect), blue on the left and yellow on the right. It's strongest with thin stripes viewed from a distance — try zooming out.",
    },
    glsl: `
vec3 illusion(vec2 p){
  float s = 2.0 / P0;
  float t = sq(p.y / s, s);
  vec3 bg = mix(C1, C2, t);
  if (u_reveal > 0.5) bg = vec3(luma(mix(C1, C2, 0.5)));
  float inA = fill(sdBox(p - vec2(-P3 * 0.5, 0.0), vec2(P1 * 0.5, P2 * 0.5)));
  float inB = fill(sdBox(p - vec2(P3 * 0.5, 0.0), vec2(P1 * 0.5, P2 * 0.5)));
  // left bars replace yellow stripes (sit between blue); right bars replace blue (between yellow)
  return mix(bg, C0, clamp(inA * t + inB * (1.0 - t), 0.0, 1.0));
}`,
  },
  {
    id: 'ehrenstein', name: 'Ehrenstein & neon', cat: 'Lightness & colour',
    params: [
      { n: 'Layout', opts: ['Radial', 'Grid'], v: 0 },
      { n: 'Rays', min: 6, max: 48, step: 1, v: 16, show: p => p[0] === 0 },
      { n: 'Grid cells', min: 3, max: 10, step: 1, v: 5, show: p => p[0] === 1 },
      { n: 'Gap', min: 0.05, max: 0.5, step: 0.005, v: 0.22 },
      { n: 'Line width', min: 0.004, max: 0.03, step: 0.001, v: 0.01 },
      { n: 'Neon spreading', opts: ['Off', 'On'], v: 0 },
    ],
    colors: [{ n: 'Paper', v: '#ffffff' }, { n: 'Lines', v: '#111111' }, { n: 'Neon', v: '#e0262f', show: p => p[5] === 1 }],
    info: {
      see: 'A disc brighter than the paper fills each gap. With neon on, a glowing tinted disc appears instead.',
      why: 'No disc is drawn. Line ends arranged in a circle are best explained by an occluding disc, so the brain constructs one — with illusory contours and extra brightness (Ehrenstein). When the line segments inside the gap are coloured, the colour leaks out to fill the illusory disc: neon colour spreading.',
    },
    glsl: `
vec3 illusion(vec2 p){
  vec3 col = C0;
  float dl, r, gap;
  if (P0 < 0.5) {
    r = length(p);
    float a = atan(p.y, p.x);
    float st = TAU / P1;
    float ph = floor(a / st + 0.5) * st;
    vec2 d = vec2(cos(ph), sin(ph));
    dl = length(p - d * clamp(dot(p, d), 0.0, 0.95));
    gap = P3;
  } else {
    float cs = 2.0 / P2;
    vec2 f = (fract(p / cs + 0.5) - 0.5) * cs;
    dl = min(abs(f.x), abs(f.y));
    r = length(f);
    gap = P3 * cs;
  }
  float line = fill(dl - P4 * 0.5);
  float outside = fill(gap - r);
  col = mix(col, C1, line * outside);
  if (P5 > 0.5) col = mix(col, C2, line * (1.0 - outside));
  return col;
}`,
  },
];
