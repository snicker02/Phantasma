// Ambiguous and impossible figures: one image, two readings — or a reading that can't exist.

export default [
  {
    id: 'necker', name: 'Necker cube', cat: 'Ambiguous & impossible',
    params: [
      { n: 'Size', min: 0.2, max: 0.8, step: 0.005, v: 0.42 },
      { n: 'Depth X', min: -0.6, max: 0.6, step: 0.005, v: 0.3 },
      { n: 'Depth Y', min: -0.6, max: 0.6, step: 0.005, v: 0.26 },
      { n: 'Line width', min: 0.004, max: 0.03, step: 0.001, v: 0.012 },
      { n: 'Hint', opts: ['None (wireframe)', 'Shade lower-left face', 'Shade upper-right face'], v: 0 },
      { n: 'Rotation °', min: -45, max: 45, step: 1, v: 0 },
    ],
    colors: [{ n: 'Paper', v: '#f4f1ea' }, { n: 'Lines', v: '#1b1b1b' }, { n: 'Shade', v: '#9fb7d8', show: p => p[4] !== 0 }],
    info: {
      see: 'Keep looking: the cube flips — sometimes viewed from above, sometimes from below.',
      why: 'A line drawing has no depth cues, so two 3D interpretations fit equally well. The brain cannot hold both, and neural adaptation to the current one lets the other take over every few seconds. Shading one face tips the balance — try the hints.',
    },
    glsl: `
vec3 illusion(vec2 p){
  p = rot(radians(-P5)) * p;
  vec2 off = vec2(P1, P2);
  vec2 F = -off * 0.5, B = off * 0.5;
  float s = P0;
  float d = 1e9;
  for (int i = 0; i < 4; i++) {
    float a0 = PI * 0.25 + float(i) * PI * 0.5;
    vec2 c0 = sign(vec2(cos(a0), sin(a0))) * s;
    vec2 c1 = sign(vec2(cos(a0 + PI * 0.5), sin(a0 + PI * 0.5))) * s;
    d = min(d, sdSeg(p, F + c0, F + c1));
    d = min(d, sdSeg(p, B + c0, B + c1));
    d = min(d, sdSeg(p, F + c0, B + c0));
  }
  vec3 col = C0;
  if (P4 > 0.5) {
    vec2 fc = P4 < 1.5 ? F : B;
    col = mix(col, C2, fill(sdBox(p - fc, vec2(s))) * 0.75);
  }
  return mix(col, C1, fill(d - P3 * 0.5));
}`,
  },
  {
    id: 'penrose', name: 'Penrose triangle', cat: 'Ambiguous & impossible',
    reveal: 'Make it possible',
    params: [
      { n: 'Size', min: 0.6, max: 2.2, step: 0.01, v: 1.6 },
      { n: 'Beam width', min: 0.06, max: 0.16, step: 0.0025, v: 0.12 },
      { n: 'Twist', opts: ['Clockwise', 'Counter-clockwise'], v: 0 },
      { n: 'Outline', min: 0, max: 0.02, step: 0.0005, v: 0.005 },
      { n: 'Rotation °', min: -180, max: 180, step: 1, v: 0 },
    ],
    colors: [{ n: 'Face A', v: '#ede3cf' }, { n: 'Face B', v: '#a3937a' }, { n: 'Face C', v: '#4e463b' }, { n: 'Paper', v: '#20242c' }],
    info: {
      see: 'A solid triangle of square beams, each joined at right angles to the next.',
      why: 'No such object can exist in 3D. Every corner is locally consistent — one beam passes in front of the next — but the "in front of" relation goes round in a loop, which no real depth ordering can do. Reveal draws the beams in one fixed order, and one corner instantly breaks.',
    },
    glsl: `
void face(inout vec3 col, float sd, vec3 c, float ow){
  col = mix(col, vec3(0.06), fill(sd));
  col = mix(col, c, fill(sd + ow));
}
vec3 illusion(vec2 p){
  const float h = 0.8660254;
  float L = P0, w = P1, ow = P3;
  p = rot(radians(-P4)) * p;
  if (P2 > 0.5) p.x = -p.x;                       // opposite twist = mirror image
  vec2 q = p / L + vec2(0.5, h / 3.0);
  float b = q.y / h;
  float a = q.x - b * 0.5;
  float c = a + b;
  float k = h * L;
  // beams: bottom (b), left (a), right (1 - c); each split into outer and inner face
  float tri = max(max(-a, -b), c - 1.0);
  float bO = max(tri, b - w) * k,              bI = max(max(tri, w - b), b - 2.0 * w) * k;
  float lO = max(tri, a - w) * k,              lI = max(max(tri, w - a), a - 2.0 * w) * k;
  float rO = max(tri, (1.0 - w) - c) * k,      rI = max(max(tri, c - (1.0 - w)), (1.0 - 2.0 * w) - c) * k;
  // each shade is one face direction: it runs along one beam's outer face and turns the
  // corner into the next beam's inner face (an L-shaped face)
  float F0 = min(bO, lI), F1 = min(rO, bI), F2 = min(lO, rI);
  vec3 col = C3;
  float dBL = length(q), dBR = length(q - vec2(1.0, 0.0)), dT = length(q - vec2(0.5, h));
  int zone = (dBL < dBR && dBL < dT) ? 0 : (dBR < dT ? 1 : 2);
  if (u_reveal > 0.5) zone = 0;                   // one fixed order everywhere: a possible object, so it breaks
  if (zone == 0) {        // bottom-left: bottom's outer turns into left's inner; left's outer on top
    face(col, rO, C1, ow); face(col, rI, C2, ow);
    face(col, bI, C1, ow); face(col, F0, C0, ow); face(col, lO, C2, ow);
  } else if (zone == 1) { // bottom-right: right's outer turns into bottom's inner; bottom's outer on top
    face(col, lO, C2, ow); face(col, lI, C0, ow);
    face(col, rI, C2, ow); face(col, F1, C1, ow); face(col, bO, C0, ow);
  } else {                // top: left's outer turns into right's inner; right's outer on top
    face(col, bO, C0, ow); face(col, bI, C1, ow);
    face(col, lI, C0, ow); face(col, F2, C2, ow); face(col, rO, C1, ow);
  }
  return col;
}`,
  },
  {
    id: 'rubin', name: 'Rubin vase', cat: 'Ambiguous & impossible',
    params: [
      { n: 'Height', min: 0.6, max: 1.4, step: 0.01, v: 1 },
      { n: 'Vase width', min: 0.2, max: 0.7, step: 0.005, v: 0.4 },
      { n: 'Nose', min: 0, max: 0.3, step: 0.005, v: 0.16 },
      { n: 'Lips', min: 0, max: 0.12, step: 0.002, v: 0.05 },
      { n: 'Chin', min: 0, max: 0.2, step: 0.005, v: 0.09 },
      { n: 'Eyes', opts: ['No', 'Yes (favours faces)'], v: 0 },
    ],
    colors: [{ n: 'Vase', v: '#111111' }, { n: 'Faces', v: '#f2f2f2' }, { n: 'Eyes', v: '#111111', show: p => p[5] === 1 }],
    info: {
      see: 'A vase — or two faces in profile looking at each other. You can see either, but never both at once.',
      why: 'Figure–ground ambiguity (Edgar Rubin, 1915). The shared contour can only be "owned" by one side at a time, and whichever side owns it becomes the figure while the other becomes shapeless background. Adding eyes, or making the vase wider, biases which wins.',
    },
    glsl: `
float g(float y, float c, float s){ float t = (y - c) / s; return exp(-t * t); }
float halfWidth(float y){
  float w = P1;
  w -= 0.04 * g(y, 0.56, 0.07);           // brow
  w += 0.03 * g(y, 0.43, 0.04);           // eye socket
  w -= P2 * g(y, 0.24, 0.085);            // nose
  w -= P3 * g(y, -0.02, 0.035);           // upper lip
  w -= P3 * g(y, -0.13, 0.035);           // lower lip
  w -= P4 * g(y, -0.34, 0.075);           // chin
  w += 0.12 * smoothstep(-0.45, -0.78, y); // neck falls back -> vase base widens
  w += 0.16 * smoothstep(0.72, 0.95, y);   // back of head -> vase rim
  return w;
}
vec3 illusion(vec2 p){
  vec2 q = p / P0;
  float H = 0.95;
  float d = max(abs(q.x) - halfWidth(q.y), abs(q.y) - H) * P0;
  vec3 col = mix(C1, C0, fill(d));
  if (P5 > 0.5) {
    vec2 e = vec2(halfWidth(0.43) + 0.12, 0.43);
    float de = (length(vec2(abs(q.x), q.y) - e) - 0.025) * P0;
    col = mix(col, C2, fill(de));
  }
  return col;
}`,
  },
];
