// Motion illusions: static images that drift, and animations that fool motion perception.

export default [
  {
    id: 'rotating-snakes', name: 'Rotating snakes', cat: 'Motion',
    params: [
      { n: 'Wheels across', min: 1, max: 6, step: 1, v: 3 },
      { n: 'Rings', min: 2, max: 8, step: 1, v: 5 },
      { n: 'Segments', min: 8, max: 60, step: 1, v: 28 },
      { n: 'Skew', min: -2, max: 2, step: 0.01, v: 0.6 },
      { n: 'Dark/light band', min: 0.1, max: 0.45, step: 0.005, v: 0.32 },
      { n: 'Wheel spin', opts: ['Alternate', 'All same'], v: 0 },
      { n: 'Hub', min: 0, max: 0.4, step: 0.005, v: 0.12 },
    ],
    colors: [{ n: 'Black', v: '#000000' }, { n: 'Dark step', v: '#1d45c6' }, { n: 'White', v: '#ffffff' }, { n: 'Light step', v: '#e9cf25' }],
    info: {
      see: 'The wheels seem to turn slowly — but only in your peripheral vision. Stare at one and it stops.',
      why: 'Peripheral drift (after Kitaoka). The repeating black → dark → white → light sequence is processed at slightly different speeds by the visual system (high contrast is faster), producing a motion signal in the black→dark direction. Fixational eye movements keep refreshing it. Swap the two step colours to reverse the spin.',
    },
    glsl: `
vec3 wheel(vec2 q, float R, float dir, out float inside){
  float r = length(q);
  inside = fill(r - R);
  float th = atan(q.y, q.x);
  float rr = r / R;
  float s = (rr - P6) / max(1.0 - P6, 1e-3) * P1;
  float k = floor(s);
  float rdir = mod(k, 2.0) < 0.5 ? 1.0 : -1.0;
  float ph = th / TAU * P2 + fract(s) * P3 * rdir;
  float f = fract(ph * rdir * dir);
  float a = P4;
  vec3 c = f < a ? C0 : (f < 0.5 ? C1 : (f < 0.5 + a ? C2 : C3));
  if (rr < P6) c = mix(C0, C2, 0.5);
  return c;
}
vec3 illusion(vec2 p){
  float S = 2.0 / P0;
  vec2 g = floor(p / S);
  vec2 q = (fract(p / S) - 0.5) * S;
  float dir = P5 < 0.5 ? (mod(g.x + g.y, 2.0) < 0.5 ? 1.0 : -1.0) : 1.0;
  float in1;
  vec3 c1 = wheel(q, S * 0.48, dir, in1);
  vec2 g2 = floor(p / S + 0.5);
  vec2 q2 = (fract(p / S + 0.5) - 0.5) * S;
  float dir2 = P5 < 0.5 ? (mod(g2.x + g2.y, 2.0) < 0.5 ? -1.0 : 1.0) : 1.0;
  float in2;
  vec3 c2 = wheel(q2, S * 0.19, dir2, in2);
  vec3 col = mix(C0, C2, 0.5);
  col = mix(col, c2, in2);
  col = mix(col, c1, in1);
  return col;
}`,
  },
  {
    id: 'ouchi', name: 'Ouchi', cat: 'Motion', animated: true,
    params: [
      { n: 'Brick size', min: 0.02, max: 0.2, step: 0.001, v: 0.055 },
      { n: 'Brick aspect', min: 1.5, max: 6, step: 0.05, v: 4 },
      { n: 'Disc radius', min: 0.1, max: 0.9, step: 0.01, v: 0.45 },
      { n: 'Inner offset', min: 0, max: 1, step: 0.01, v: 0 },
      { n: 'Wobble', min: 0, max: 0.05, step: 0.0005, v: 0.012 },
      { n: 'Wobble speed', min: 0.1, max: 5, step: 0.05, v: 1.5 },
    ],
    colors: [{ n: 'Brick A', v: '#000000' }, { n: 'Brick B', v: '#ffffff' }],
    info: {
      see: 'The central disc seems to float and slide separately from the background as the image wobbles.',
      why: 'The whole picture moves rigidly. Elongated bricks give strong motion signals only perpendicular to their long side (the aperture problem), so the disc and surround report different motions and the brain treats them as separate layers. Set Wobble to 0 and move your head instead.',
    },
    glsl: `
vec3 illusion(vec2 p){
  vec2 q = p + vec2(sin(u_time * P5), cos(u_time * P5 * 1.3)) * P4;
  float s = P0, a = P1;
  float outer = xr(sq(q.x / (s * a), s * a), sq(q.y / s, s));
  vec2 qi = q + vec2(0.0, P3 * s);
  float inner = xr(sq(qi.x / s, s), sq(qi.y / (s * a), s * a));
  float m = fill(length(q) - P2);
  return mix(C0, C1, mix(outer, inner, m));
}`,
  },
  {
    id: 'pinna', name: 'Pinna–Brelstaff rings', cat: 'Motion', animated: true,
    params: [
      { n: 'Squares / ring', min: 12, max: 60, step: 1, v: 36 },
      { n: 'Inner radius', min: 0.2, max: 0.8, step: 0.005, v: 0.45 },
      { n: 'Outer radius', min: 0.4, max: 1.2, step: 0.005, v: 0.68 },
      { n: 'Square size', min: 0.01, max: 0.06, step: 0.0005, v: 0.026 },
      { n: 'Tilt °', min: -45, max: 45, step: 1, v: 20 },
      { n: 'Pulse', min: 0, max: 0.3, step: 0.005, v: 0.12 },
      { n: 'Pulse speed', min: 0.2, max: 3, step: 0.05, v: 0.9 },
      { n: 'Edge width', min: 0.002, max: 0.012, step: 0.0005, v: 0.005 },
    ],
    colors: [{ n: 'Background', v: '#9a9a9a' }, { n: 'Dark edge', v: '#000000' }, { n: 'Light edge', v: '#ffffff' }],
    info: {
      see: 'While the rings pulse in and out, they appear to rotate in opposite directions.',
      why: 'Nothing rotates — the image only scales. The tilted dark/light edge pairs make local motion detectors report a sideways component, and with opposite tilts the two rings report opposite rotations. Set Pulse to 0 and move your head toward the screen to get the original effect.',
    },
    glsl: `
float pinnaRing(vec2 p, float R, float N, float tilt, out float side){
  float th = atan(p.y, p.x);
  float st = TAU / N;
  float a = floor(th / st + 0.5) * st;
  vec2 q = rot(-(a + tilt)) * (p - R * vec2(cos(a), sin(a)));
  side = clamp(0.5 + (q.y - q.x) / (2.0 * u_px), 0.0, 1.0);
  return abs(sdBox(q, vec2(P3))) - P7 * 0.5;
}
vec3 illusion(vec2 p){
  float sc = 1.0 + P5 * sin(u_time * P6 * PI);
  p /= sc;
  float s1, s2;
  float N2 = floor(P0 * P2 / P1 + 0.5);
  float d1 = pinnaRing(p, P1, P0, radians(P4), s1);
  float d2 = pinnaRing(p, P2, N2, -radians(P4), s2);
  vec3 col = C0;
  col = mix(col, mix(C2, C1, s1), fill(d1));
  col = mix(col, mix(C2, C1, s2), fill(d2));
  col = mix(col, C1, fill(length(p) - 0.012));
  return col;
}`,
  },
  {
    id: 'enigma', name: 'Enigma', cat: 'Motion',
    params: [
      { n: 'Rays', min: 40, max: 240, step: 2, v: 120 },
      { n: 'Rings', min: 1, max: 4, step: 1, v: 3 },
      { n: 'Ring width', min: 0.02, max: 0.15, step: 0.001, v: 0.07 },
      { n: 'Ring spacing', min: 0.1, max: 0.4, step: 0.005, v: 0.22 },
      { n: 'Border', min: 0.002, max: 0.03, step: 0.0005, v: 0.01 },
      { n: 'Centre', min: 0, max: 0.15, step: 0.002, v: 0.05 },
    ],
    colors: [{ n: 'Ray A', v: '#000000' }, { n: 'Ray B', v: '#ffffff' }, { n: 'Ring', v: '#8a4fc8' }, { n: 'Ring border', v: '#1a1a40' }],
    info: {
      see: 'A rapid streaming or swirling motion inside the purple rings.',
      why: "After Isia Leviant's Enigma. The fine radial rays plus tiny involuntary eye movements (microsaccades) produce strong, fleeting motion signals that leak into the uniform rings. Studies link the strength of the effect to how often you make microsaccades.",
    },
    glsl: `
vec3 illusion(vec2 p){
  float r = length(p), th = atan(p.y, p.x);
  float N = 2.0 * floor(P0 * 0.5);
  vec3 col = mix(C0, C1, sq(th / TAU * N, TAU * max(r, 1e-3) / N));
  for (int i = 0; i < 4; i++) {
    if (float(i) >= P1) break;
    float R = P5 + P3 * (float(i) + 1.0);
    float d = abs(r - R) - P2 * 0.5;
    col = mix(col, C3, fill(d - P4));
    col = mix(col, C2, fill(d));
  }
  col = mix(col, C3, fill(r - P5 - P4));
  col = mix(col, C2, fill(r - P5));
  return col;
}`,
  },
  {
    id: 'lilac-chaser', name: 'Lilac chaser', cat: 'Motion', animated: true,
    reveal: 'Remove the blur',
    params: [
      { n: 'Discs', min: 6, max: 18, step: 1, v: 12 },
      { n: 'Circle radius', min: 0.3, max: 0.9, step: 0.005, v: 0.62 },
      { n: 'Disc size', min: 0.03, max: 0.15, step: 0.001, v: 0.085 },
      { n: 'Blur', min: 0, max: 1, step: 0.01, v: 0.8 },
      { n: 'Steps / s', min: 1, max: 20, step: 0.5, v: 8 },
      { n: 'Cross size', min: 0.02, max: 0.08, step: 0.001, v: 0.035 },
    ],
    colors: [{ n: 'Background', v: '#bfbfbf' }, { n: 'Disc', v: '#d57ad5' }, { n: 'Cross', v: '#000000' }],
    info: {
      see: 'Stare at the cross for 20 s: the lilac discs vanish and a single green disc races around the circle.',
      why: 'Three effects stack. The gap reads as apparent motion (phi). Steady fixation makes the blurred, low-contrast discs fade away (Troxler fading). And each gap shows a green afterimage — the complement of lilac. Remove the blur and the discs refuse to fade.',
    },
    glsl: `
vec3 illusion(vec2 p){
  float n = floor(P0);
  float th = atan(p.y, p.x);
  float st = TAU / n;
  float k = floor(th / st + 0.5);
  float a = k * st;
  float kk = mod(k + n, n);
  float hide = mod(floor(u_time * P4), n);
  float d = length(p - P1 * vec2(cos(a), sin(a)));
  float b = u_reveal > 0.5 ? 0.0 : P3;
  float v = mix(fill(d - P2), exp(-pow(d / (P2 * 1.15), 2.0)), b);
  if (abs(kk - hide) < 0.5) v = 0.0;
  vec3 col = mix(C0, C1, v);
  float cr = min(sdBox(p, vec2(P5, P5 * 0.16)), sdBox(p, vec2(P5 * 0.16, P5)));
  return mix(col, C2, fill(cr));
}`,
  },
  {
    id: 'aftereffect', name: 'Motion aftereffect', cat: 'Motion', animated: true,
    stare: 3,
    params: [
      { n: 'Arms', min: 1, max: 12, step: 1, v: 4 },
      { n: 'Tightness', min: 1, max: 12, step: 0.1, v: 5 },
      { n: 'Spin speed', min: -3, max: 3, step: 0.05, v: 1 },
      { n: 'Stare (s)', min: 5, max: 60, step: 1, v: 25 },
      { n: 'Pattern', opts: ['Spiral', 'Rings', 'Waterfall'], v: 0 },
    ],
    colors: [{ n: 'Band A', v: '#111111' }, { n: 'Band B', v: '#f2f2f2' }, { n: 'Fixation', v: '#e03030' }],
    info: {
      see: 'Press Start stare and fixate the red dot. When the motion stops, the still pattern appears to move the opposite way.',
      why: 'The waterfall illusion. Direction-selective neurons tuned to the adapting motion fatigue, so when the stimulus stops the balance tips toward the opposite direction. After a spiral, the stationary picture — or your own hand — seems to shrink or swell.',
    },
    glsl: `
vec3 illusion(vec2 p){
  float r = max(length(p), 1e-3), th = atan(p.y, p.x);
  float tt = u_phase > 0.5 ? 0.0 : u_time * P2;
  float v;
  if (P4 < 0.5) {
    float ph = th / TAU * P0 + log(r) * P1 * 0.5 - tt;
    v = sq(ph * 2.0, r / (2.0 * sqrt(pow(P0 / TAU, 2.0) + pow(P1 * 0.5, 2.0))));
  } else if (P4 < 1.5) {
    float ph = r * P1 - tt;
    v = sq(ph * 2.0, 0.5 / P1);
  } else {
    float ph = p.y * P1 * 0.5 + tt;
    v = sq(ph * 2.0, 1.0 / P1);
  }
  vec3 col = mix(C0, C1, v);
  col = mix(col, vec3(1.0), fill(length(p) - 0.022));
  return mix(col, C2, fill(length(p) - 0.015));
}`,
  },
  {
    id: 'stepping-feet', name: 'Stepping feet', cat: 'Motion', animated: true,
    reveal: 'Hide the stripes',
    params: [
      { n: 'Stripes', min: 6, max: 60, step: 1, v: 24 },
      { n: 'Speed', min: 0.05, max: 1, step: 0.01, v: 0.22 },
      { n: 'Bar length', min: 0.1, max: 0.6, step: 0.005, v: 0.3 },
      { n: 'Bar height', min: 0.04, max: 0.3, step: 0.005, v: 0.1 },
      { n: 'Stripe contrast', min: 0, max: 1, step: 0.01, v: 1 },
      { n: 'Bar gap', min: 0.1, max: 0.8, step: 0.005, v: 0.35 },
    ],
    colors: [{ n: 'Stripe A', v: '#000000' }, { n: 'Stripe B', v: '#ffffff' }, { n: 'Bar 1', v: '#f2d31b' }, { n: 'Bar 2', v: '#1b2a8c' }],
    info: {
      see: 'The yellow and blue bars seem to take turns stepping forward like feet.',
      why: "Both bars move at exactly the same constant speed. Perceived speed depends on edge contrast: when a bar's leading edge sits against a stripe that contrasts strongly with it, it looks faster; low contrast looks slower. Yellow and blue get high contrast on opposite stripes, so they alternate.",
    },
    glsl: `
vec3 illusion(vec2 p){
  float cell = 2.0 / P0;
  float t = sq(p.x / cell, cell);
  float c = u_reveal > 0.5 ? 0.0 : P4;
  vec3 col = mix(C0, C1, 0.5 + (t - 0.5) * c);
  float x = mod(u_time * P1 + 1.8, 3.6) - 1.8;
  vec2 hb = vec2(P2 * 0.5, P3 * 0.5);
  col = mix(col, C2, fill(sdBox(p - vec2(x, P5 * 0.5), hb)));
  col = mix(col, C3, fill(sdBox(p - vec2(x, -P5 * 0.5), hb)));
  return col;
}`,
  },
  {
    id: 'moire', name: 'Moiré', cat: 'Motion', animated: true,
    params: [
      { n: 'Pattern', opts: ['Lines', 'Rings', 'Radial', 'Dots'], v: 1 },
      { n: 'Frequency', min: 10, max: 120, step: 1, v: 40 },
      { n: 'Angle offset °', min: 0, max: 30, step: 0.1, v: 3 },
      { n: 'Motion', min: 0, max: 1, step: 0.01, v: 0.25 },
      { n: 'Ink fraction', min: 0.1, max: 0.9, step: 0.01, v: 0.5 },
      { n: 'Separation', min: 0, max: 0.5, step: 0.005, v: 0.12 },
    ],
    colors: [{ n: 'Paper', v: '#ffffff' }, { n: 'Ink', v: '#000000' }],
    info: {
      see: 'Large, slow bands sweep across two fine patterns as they slide over each other.',
      why: 'Moiré is not a brain illusion but a physical one: two gratings multiply, and their small difference in frequency or angle creates a beat pattern far larger than either. Small changes to angle offset produce huge changes in the fringes.',
    },
    glsl: `
float layer(vec2 q){
  float f = P1;
  if (P0 < 0.5) {
    return fill((abs(fract(q.x * f) - 0.5) - P4 * 0.5) / f);
  } else if (P0 < 1.5) {
    return fill((abs(fract(length(q) * f) - 0.5) - P4 * 0.5) / f);
  } else if (P0 < 2.5) {
    float N = floor(f * 2.0);
    float r = max(length(q), 1e-3);
    float x = atan(q.y, q.x) / TAU * N;
    return fill((abs(fract(x) - 0.5) - P4 * 0.5) * TAU * r / N);
  }
  return fill((length(fract(q * f) - 0.5) - P4 * 0.5) / f);
}
vec3 illusion(vec2 p){
  float a = layer(p);
  vec2 q = rot(radians(P2) + u_time * P3 * 0.15) * (p - vec2(P5 * sin(u_time * P3), 0.0));
  float b = layer(q);
  float ink = 1.0 - (1.0 - a) * (1.0 - b);
  return mix(C0, C1, ink);
}`,
  },
];
