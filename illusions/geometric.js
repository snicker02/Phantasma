// Geometric illusions: straight looks bent, equal looks unequal, edges appear from nothing.
// Param order maps to P0..P11, colours to C0..C3.

export default [
  {
    id: 'cafe-wall', name: 'Café wall', cat: 'Geometric',
    reveal: 'Show true lines',
    params: [
      { n: 'Rows', min: 4, max: 24, step: 1, v: 10 },
      { n: 'Row shift', min: 0, max: 1, step: 0.01, v: 0.5 },
      { n: 'Mortar width', min: 0, max: 0.3, step: 0.005, v: 0.08 },
      { n: 'Row pattern', opts: ['Zigzag', 'Alternate', 'Staircase'], v: 0 },
    ],
    colors: [{ n: 'Tile A', v: '#111111' }, { n: 'Tile B', v: '#f0f0f0' }, { n: 'Mortar', v: '#7f7f7f' }],
    info: {
      see: 'The grey mortar lines look like wedges, tilting alternately up and down.',
      why: 'Where a dark tile meets a light one across thin mid-grey mortar, early edge detectors in the visual cortex combine the small luminance steps into tilted edge signals. Set mortar to 0 or make it black or white and the tilt disappears.',
    },
    glsl: `
vec3 illusion(vec2 p){
  float s = 2.0 / P0;
  float row = floor(p.y / s);
  float k = P3 < 0.5 ? abs(mod(row, 4.0) - 2.0) * 0.5 : (P3 < 1.5 ? mod(row, 2.0) : mod(row, 4.0) * 0.5);
  float t = sq(p.x / s + k * P1, s);
  vec3 col = mix(C0, C1, t);
  float fy = fract(p.y / s);
  float dy = min(fy, 1.0 - fy) * s;
  col = mix(col, C2, fill(dy - P2 * s * 0.5));
  if (u_reveal > 0.5) col = mix(col, vec3(1.0, 0.15, 0.1), fill(dy - max(1.2 * u_px, P2 * s * 0.2)));
  return col;
}`,
  },
  {
    id: 'zollner', name: 'Zöllner lines', cat: 'Geometric',
    reveal: 'Fade the hatching',
    params: [
      { n: 'Lines', min: 3, max: 16, step: 1, v: 7 },
      { n: 'Hatch angle °', min: 10, max: 80, step: 1, v: 45 },
      { n: 'Hatch spacing', min: 0.02, max: 0.2, step: 0.002, v: 0.07 },
      { n: 'Hatch length', min: 0.02, max: 0.2, step: 0.002, v: 0.055 },
      { n: 'Line width', min: 0.002, max: 0.03, step: 0.001, v: 0.008 },
      { n: 'Tilt °', min: -90, max: 90, step: 1, v: 45 },
    ],
    colors: [{ n: 'Paper', v: '#f4f1ea' }, { n: 'Ink', v: '#141414' }],
    info: {
      see: 'Parallel long lines seem to converge and diverge in alternation.',
      why: 'The short crossing strokes bias the perceived orientation of the long lines — acute angles tend to be over-estimated, so each line is pulled away from its hatching. The effect is strongest when the long lines are tilted around 45°.',
    },
    glsl: `
vec3 illusion(vec2 p){
  vec2 q = rot(radians(P5)) * p;
  float sp = 2.0 / P0;
  float i = floor(q.x / sp + 0.5);
  float u = q.x - i * sp;
  float d = abs(u) - P4 * 0.5;
  float sgn = mod(i, 2.0) < 0.5 ? 1.0 : -1.0;
  float h = radians(P1) * sgn;
  vec2 dir = vec2(cos(h), sin(h));
  float j0 = floor(q.y / P2 + 0.5);
  float dh = 1e9;
  for (int k = -2; k <= 2; k++) {
    float yc = (j0 + float(k)) * P2;
    dh = min(dh, sdSeg(vec2(u, q.y - yc), -dir * P3, dir * P3));
  }
  dh -= P4 * 0.5;
  float a = u_reveal > 0.5 ? 0.15 : 1.0;
  vec3 col = mix(C0, C1, fill(dh) * a);
  col = mix(col, u_reveal > 0.5 ? vec3(0.85, 0.1, 0.1) : C1, fill(d));
  return col;
}`,
  },
  {
    id: 'fraser', name: 'Fraser spiral', cat: 'Geometric',
    reveal: 'Trace one circle',
    params: [
      { n: 'Rings', min: 3, max: 14, step: 1, v: 8 },
      { n: 'Cord width', min: 0.2, max: 0.95, step: 0.01, v: 0.42 },
      { n: 'Strand size', min: 0.3, max: 3, step: 0.05, v: 0.6 },
      { n: 'Cord twist', min: -3, max: 3, step: 0.05, v: 0.75 },
      { n: 'Background', opts: ['Spiral checks', 'Plain'], v: 0 },
      { n: 'Check twist', min: -3, max: 3, step: 0.05, v: -0.6, show: p => p[4] === 0 },
    ],
    colors: [{ n: 'Strand A', v: '#111111' }, { n: 'Strand B', v: '#f5f5f5' }, { n: p => p[4] === 0 ? 'Check A' : 'Background', v: '#3c8c5a' }, { n: 'Check B', v: '#4b6cc4', show: p => p[4] === 0 }],
    info: {
      see: 'A spiral winding into the centre.',
      why: 'Every cord is a perfect circle. The tilted black and white strands each signal a local orientation, and the visual system integrates those tilts into a continuous spiral. Try following one ring with your finger, or press Reveal.',
    },
    glsl: `
vec3 illusion(vec2 p){
  float r = length(p);
  float th = atan(p.y, p.x);
  float sp = 1.0 / P0;
  float k = floor(r / sp + 0.5);
  float w = sp * P1;
  float d = r - k * sp;
  float rr = max(r, 1e-3);
  vec3 col = C2;
  if (P4 < 0.5) {
    float N = 6.0 * P0;
    float lr = log(rr);
    float cell = TAU * rr / N;
    float a = th / TAU * N + lr * N / TAU * P5;
    float b = lr * N / TAU;
    col = mix(C2, C3, xr(sq(a, cell), sq(b, cell)));
  }
  if (k > 0.5) {
    float M = max(4.0, 2.0 * floor(TAU * k * sp / (w * P2) * 0.5));
    float s = d / w + 0.5;
    float ph = th / TAU * M + s * P3;
    vec3 cord = mix(C0, C1, sq(ph, TAU * rr / M));
    col = mix(col, cord, fill(abs(d) - w * 0.5));
  }
  if (u_reveal > 0.5) {
    float kk = max(1.0, floor(P0 * 0.6));
    col = mix(col, vec3(1.0, 0.1, 0.1), fill(abs(r - kk * sp) - max(u_px * 1.2, w * 0.08)));
  }
  return col;
}`,
  },
  {
    id: 'hering', name: 'Hering & Wundt', cat: 'Geometric',
    reveal: 'Fade the rays',
    params: [
      { n: 'Variant', opts: ['Hering (bow out)', 'Wundt (bow in)'], v: 0 },
      { n: 'Rays', min: 8, max: 120, step: 2, v: 48 },
      { n: 'Line gap', min: 0.1, max: 1.4, step: 0.01, v: 0.55 },
      { n: 'Ray width', min: 0.001, max: 0.02, step: 0.0005, v: 0.004 },
      { n: 'Line width', min: 0.004, max: 0.04, step: 0.001, v: 0.014 },
      { n: 'Orientation', opts: ['Horizontal', 'Vertical'], v: 0 },
    ],
    colors: [{ n: 'Paper', v: '#fafafa' }, { n: 'Rays', v: '#262626' }, { n: 'Lines', v: '#1b3fbf' }],
    info: {
      see: 'Two straight parallel lines look bowed — outward over a central fan (Hering), inward over side fans (Wundt).',
      why: 'The rays create a strong sense of perspective and local angle contrast. Each crossing angle is misjudged slightly, and summed along the line those errors bend it. One theory says the brain is predicting where the lines will be a moment later as you move forward.',
    },
    glsl: `
float rays(vec2 p, vec2 c, float n){
  vec2 v = p - c;
  float a = atan(v.y, v.x);
  float st = PI / n;
  float ph = floor(a / st + 0.5) * st;
  return abs(v.x * sin(ph) - v.y * cos(ph));
}
vec3 illusion(vec2 p){
  if (P5 > 0.5) p = vec2(p.y, -p.x);
  float dr = P0 < 0.5 ? rays(p, vec2(0.0), P1)
                      : min(rays(p, vec2(-1.6, 0.0), P1 * 0.5), rays(p, vec2(1.6, 0.0), P1 * 0.5));
  float dl = abs(abs(p.y) - P2 * 0.5) - P4 * 0.5;
  vec3 col = mix(C0, C1, fill(dr - P3 * 0.5) * (u_reveal > 0.5 ? 0.2 : 1.0));
  col = mix(col, C2, fill(dl));
  return col;
}`,
  },
  {
    id: 'muller-lyer', name: 'Müller-Lyer', cat: 'Geometric',
    reveal: 'Show end guides',
    params: [
      { n: 'Shaft length', min: 0.3, max: 1.6, step: 0.01, v: 1.0 },
      { n: 'Fin length', min: 0.05, max: 0.5, step: 0.005, v: 0.22 },
      { n: 'Fin angle °', min: 10, max: 80, step: 1, v: 35 },
      { n: 'Line width', min: 0.004, max: 0.04, step: 0.001, v: 0.014 },
      { n: 'Rows', opts: ['Two', 'Three (with plain)'], v: 1 },
      { n: 'Row gap', min: 0.2, max: 0.9, step: 0.01, v: 0.45 },
    ],
    colors: [{ n: 'Paper', v: '#f7f3e8' }, { n: 'Ink', v: '#1a1a1a' }],
    info: {
      see: 'The shaft with outward fins looks clearly longer than the one with arrowheads.',
      why: 'All shafts are the same length. Fins pointing out resemble the inside corner of a room (far away), arrowheads resemble an outside corner (near). Size constancy then scales them differently. Fin angle and length change the strength — try 10° versus 70°.',
    },
    glsl: `
float arrow(vec2 p, float L, float f, float a, float dir){
  float h = L * 0.5;
  float d = sdSeg(p, vec2(-h, 0.0), vec2(h, 0.0));
  if (abs(dir) > 0.5) {
    vec2 e = vec2(cos(a), sin(a)) * f;
    vec2 r = vec2(h, 0.0), l = vec2(-h, 0.0);
    d = min(d, sdSeg(p, r, r + vec2(dir * e.x, e.y)));
    d = min(d, sdSeg(p, r, r + vec2(dir * e.x, -e.y)));
    d = min(d, sdSeg(p, l, l + vec2(-dir * e.x, e.y)));
    d = min(d, sdSeg(p, l, l + vec2(-dir * e.x, -e.y)));
  }
  return d;
}
vec3 illusion(vec2 p){
  float a = radians(P2);
  float n = P4 < 0.5 ? 2.0 : 3.0;
  float y0 = (n - 1.0) * 0.5 * P5;
  float d = 1e9;
  for (int i = 0; i < 3; i++) {
    float fi = float(i);
    if (fi >= n) break;
    float dir = fi < 0.5 ? -1.0 : (fi < 1.5 ? 1.0 : 0.0);
    d = min(d, arrow(p - vec2(0.0, y0 - fi * P5), P0, P1, a, dir));
  }
  vec3 col = mix(C0, C1, fill(d - P3 * 0.5));
  if (u_reveal > 0.5) {
    float gx = abs(abs(p.x) - P0 * 0.5) - max(u_px, 0.003);
    col = mix(col, vec3(0.9, 0.1, 0.1), fill(gx) * 0.85);
  }
  return col;
}`,
  },
  {
    id: 'ebbinghaus', name: 'Ebbinghaus circles', cat: 'Geometric',
    reveal: 'Show equal tangents',
    params: [
      { n: 'Centre size', min: 0.05, max: 0.3, step: 0.005, v: 0.12 },
      { n: 'Large surround', min: 0.1, max: 0.4, step: 0.005, v: 0.21 },
      { n: 'Small surround', min: 0.02, max: 0.12, step: 0.002, v: 0.045 },
      { n: 'Large count', min: 3, max: 10, step: 1, v: 6 },
      { n: 'Small count', min: 4, max: 16, step: 1, v: 8 },
      { n: 'Separation', min: 0.6, max: 1.8, step: 0.01, v: 1.15 },
      { n: 'Surround gap', min: 0.01, max: 0.2, step: 0.002, v: 0.05 },
    ],
    colors: [{ n: 'Paper', v: '#fbfbfb' }, { n: 'Centre', v: '#e3712b' }, { n: 'Surround', v: '#6f8fc9' }],
    info: {
      see: 'The orange circle among small circles looks larger than the one among large circles.',
      why: 'Both centre circles are identical. Size is judged relative to neighbours, so big surrounds shrink the centre and small surrounds enlarge it. Distance matters too — push the surround gap up and the effect weakens or flips.',
    },
    glsl: `
float ringOf(vec2 p, float n, float orb, float rr){
  float a = atan(p.y, p.x);
  float st = TAU / n;
  float ang = floor(a / st + 0.5) * st;
  return length(p - orb * vec2(cos(ang), sin(ang))) - rr;
}
vec3 illusion(vec2 p){
  vec2 L = p - vec2(-P5 * 0.5, 0.0), R = p - vec2(P5 * 0.5, 0.0);
  float dc = min(length(L), length(R)) - P0;
  float db = ringOf(L, P3, P0 + P6 * 1.6 + P1, P1);
  float ds = ringOf(R, P4, P0 + P6 + P2, P2);
  vec3 col = mix(C0, C2, fill(min(db, ds)));
  col = mix(col, C1, fill(dc));
  if (u_reveal > 0.5) {
    float g = abs(abs(p.y) - P0) - max(u_px, 0.002);
    col = mix(col, vec3(0.85, 0.1, 0.1), fill(g) * 0.9);
  }
  return col;
}`,
  },
  {
    id: 'kanizsa', name: 'Kanizsa triangle', cat: 'Geometric',
    reveal: 'Turn the pac-men away',
    params: [
      { n: 'Size', min: 0.3, max: 1.0, step: 0.01, v: 0.6 },
      { n: 'Disc radius', min: 0.05, max: 0.4, step: 0.005, v: 0.18 },
      { n: 'Mouth angle °', min: 20, max: 120, step: 1, v: 60 },
      { n: 'Outline triangle', opts: ['On', 'Off'], v: 0 },
      { n: 'V length', min: 0.1, max: 0.45, step: 0.005, v: 0.27, show: p => p[3] === 0 },
      { n: 'Line width', min: 0.004, max: 0.03, step: 0.001, v: 0.01, show: p => p[3] === 0 },
    ],
    colors: [{ n: 'Paper', v: '#ffffff' }, { n: 'Shapes', v: '#111111' }],
    info: {
      see: 'A bright white triangle with sharp edges floating on top.',
      why: 'No triangle is drawn. The visual system prefers the simplest explanation for three aligned notches — an occluding shape — and fills in illusory contours, even making the interior look brighter than the paper. Mouth angles away from 60° weaken it.',
    },
    glsl: `
vec3 illusion(vec2 p){
  float S = P0;
  float h = radians(P2) * 0.5;
  float d = 1e9;
  for (int i = 0; i < 3; i++) {
    float a = radians(90.0 + 120.0 * float(i));
    vec2 v = S * vec2(cos(a), sin(a));
    vec2 dirIn = -normalize(v) * (u_reveal > 0.5 ? -1.0 : 1.0);
    vec2 q = p - v;
    float x = dot(q, dirIn), y = dot(q, vec2(-dirIn.y, dirIn.x));
    float w = abs(y) * cos(h) - x * sin(h);
    d = min(d, max(length(q) - P1, -w));
  }
  float dl = 1e9;
  if (P3 < 0.5) {
    for (int i = 0; i < 3; i++) {
      float a = radians(270.0 + 120.0 * float(i));
      vec2 u = S * vec2(cos(a), sin(a));
      vec2 b1 = S * vec2(cos(a + radians(120.0)), sin(a + radians(120.0)));
      vec2 b2 = S * vec2(cos(a - radians(120.0)), sin(a - radians(120.0)));
      dl = min(dl, sdSeg(p, u, mix(u, b1, P4)));
      dl = min(dl, sdSeg(p, u, mix(u, b2, P4)));
    }
  }
  vec3 col = mix(C0, C1, fill(dl - P5 * 0.5));
  col = mix(col, C1, fill(d));
  return col;
}`,
  },
];
