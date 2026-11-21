// Lightness & colour illusions, including stare-and-switch afterimages.

export default [
  {
    id: 'grid', name: 'Scintillating grid', cat: 'Lightness & colour',
    params: [
      { n: 'Variant', opts: ['Scintillating', 'Hermann'], v: 0 },
      { n: 'Cells', min: 4, max: 20, step: 1, v: 9 },
      { n: 'Line width', min: 0.05, max: 0.5, step: 0.005, v: 0.18 },
      { n: 'Dot size', min: 0.1, max: 1.8, step: 0.01, v: 1.3 },
      { n: 'Rotation °', min: 0, max: 45, step: 0.5, v: 0 },
    ],
    colors: [{ n: 'Squares', v: '#000000' }, { n: 'Grey lines', v: '#808080' }, { n: 'Dots / white lines', v: '#ffffff' }],
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
      { n: 'Scale', min: 2, max: 20, step: 0.5, v: 6 },
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
];
