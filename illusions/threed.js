// 3D illusions: real 3D scenes (ray-traced / raymarched) that only work from one viewpoint,
// or 3D shape that the brain infers wrongly. `orbit: true` → dragging orbits the camera
// (u_orbit = yaw, pitch). `heavy: true` → no supersampling except at Best quality.

export default [
  {
    id: 'penrose-sculpture', name: 'Penrose sculpture', cat: '3D', orbit: true,
    reveal: 'Step to the side',
    params: [
      { n: 'Size', min: 0.4, max: 1.2, step: 0.01, v: 0.62 },
      { n: 'Beam width', min: 0.1, max: 0.32, step: 0.005, v: 0.2 },
      { n: 'Projection', opts: ['Orthographic', 'Perspective'], v: 0 },
      { n: 'Edge lines', min: 0, max: 3, step: 0.1, v: 1.2 },
      { n: 'Roll °', min: -180, max: 180, step: 1, v: -90 },
    ],
    colors: [{ n: 'Face X', v: '#ede3cf' }, { n: 'Face Y', v: '#a3937a' }, { n: 'Face Z', v: '#4e463b' }, { n: 'Background', v: '#20242c' }],
    info: {
      see: 'An impossible triangle — as a solid object you can walk around. Drag to orbit.',
      why: 'This is a real, possible object: three beams joined at right angles, but the third beam ends in mid-air in front of the first. Seen from exactly one direction the open end lines up perfectly with the start, so the gap disappears and the brain assumes the beams touch. Real sculptures in Perth and Gotschuchen use the same trick. Perspective projection, or the smallest change of viewpoint, gives the game away.',
    },
    glsl: `
float boxHit(vec3 ro, vec3 rd, vec3 bmin, vec3 bmax, out vec3 n){
  vec3 inv = 1.0 / rd;
  vec3 t0 = (bmin - ro) * inv, t1 = (bmax - ro) * inv;
  vec3 tmn = min(t0, t1), tmx = max(t0, t1);
  float tn = max(max(tmn.x, tmn.y), tmn.z);
  float tf = min(min(tmx.x, tmx.y), tmx.z);
  n = vec3(0.0);
  if (tn > tf || tf < 0.0) return 1e9;
  if (tn == tmn.x) n = vec3(-sign(rd.x), 0.0, 0.0);
  else if (tn == tmn.y) n = vec3(0.0, -sign(rd.y), 0.0);
  else n = vec3(0.0, 0.0, -sign(rd.z));
  return tn;
}
vec3 illusion(vec2 p){
  p = rot(radians(P4)) * p;
  float L = 1.0, w = P1;
  vec3 target = vec3((2.5 * L - w) / 3.0, 0.5 * L, (0.5 * L + w) / 3.0);
  vec2 orb = u_orbit + (u_reveal > 0.5 ? vec2(0.55, -0.22) : vec2(0.0));
  vec3 eye = orbitEye(target + normalize(vec3(1.0)) * 6.0, target, orb.x, orb.y);
  mat3 B = lookAt(eye, target);
  float scale = 1.0 / P0;
  vec3 ro, rd;
  if (P2 < 0.5) { ro = eye + B * vec3(p * scale * 0.62, 0.0); rd = B[2]; }
  else { ro = eye; rd = normalize(B * vec3(p * scale * 0.62, 6.0)); }
  rd += vec3(1e-6);
  // three beams: along x, then y, then z — the z beam's far end sits in front of the x beam's start
  vec3 mn0 = vec3(0.0),           mx0 = vec3(L, w, w);
  vec3 mn1 = vec3(L - w, 0.0, 0.0), mx1 = vec3(L, L, w);
  vec3 mn2 = vec3(L - w, L - w, 0.0), mx2 = vec3(L, L, L);
  vec3 n0, n1, n2;
  float t0 = boxHit(ro, rd, mn0, mx0, n0);
  float t1 = boxHit(ro, rd, mn1, mx1, n1);
  float t2 = boxHit(ro, rd, mn2, mx2, n2);
  float t = min(t0, min(t1, t2));
  if (t > 1e8) return C3;
  vec3 n = n0, bmn = mn0, bmx = mx0;
  if (t == t1) { n = n1; bmn = mn1; bmx = mx1; }
  if (t == t2) { n = n2; bmn = mn2; bmx = mx2; }
  vec3 an = abs(n);
  vec3 col = an.x > 0.5 ? C0 : (an.y > 0.5 ? C1 : C2);
  // dark edge lines along the box edges
  vec3 h = ro + rd * t;
  vec3 e3 = min(h - bmn, bmx - h);
  float e = an.x > 0.5 ? min(e3.y, e3.z) : (an.y > 0.5 ? min(e3.x, e3.z) : min(e3.x, e3.y));
  float lw = u_px * scale * 0.62 * P3;
  if (P3 > 0.0) col = mix(col, vec3(0.06), clamp(1.0 - (e - lw) / (u_px * scale * 0.62), 0.0, 1.0));
  return col;
}`,
  },
  {
    id: 'ames-room', name: 'Ames room', cat: '3D', orbit: true, heavy: true,
    reveal: 'Leave the peephole',
    params: [
      { n: 'Distortion', min: 0, max: 0.45, step: 0.005, v: 0.32 },
      { n: 'Person height', min: 0.3, max: 1.1, step: 0.01, v: 0.72 },
      { n: 'Floor tiles', min: 4, max: 16, step: 1, v: 8 },
      { n: 'Windows', opts: ['On', 'Off'], v: 0 },
    ],
    colors: [{ n: 'Floor A', v: '#ece5d3' }, { n: 'Floor B', v: '#2b2b2b' }, { n: 'Walls', v: '#b9c7d6' }, { n: 'People', v: '#c0392b' }],
    info: {
      see: 'Two identical people stand in the back corners of an ordinary room: one is a giant, the other tiny.',
      why: "The room isn't rectangular. Its left corner is much farther away than the right, and every wall is tilted so that, from the peephole, each corner lands exactly where a normal room's corner would. The brain trusts the familiar box shape over its knowledge of people's sizes, so distance is read as size. Leave the peephole (Reveal, or drag) to see the room's real shape; set Distortion to 0 to make the room normal.",
    },
    glsl: `
const float W = 1.0, H = 0.75, D = 3.2, ZF = 0.9;
float personSD(vec3 q, float h){
  float d = sdCapsule(q, vec3(0.0, h * 0.42, 0.0), vec3(0.0, h * 0.62, 0.0), h * 0.12);
  d = min(d, length(q - vec3(0.0, h * 0.84, 0.0)) - h * 0.11);
  d = min(d, sdCapsule(q, vec3(-h * 0.06, h * 0.03, 0.0), vec3(-h * 0.05, h * 0.42, 0.0), h * 0.05));
  d = min(d, sdCapsule(q, vec3(h * 0.06, h * 0.03, 0.0), vec3(h * 0.05, h * 0.42, 0.0), h * 0.05));
  d = min(d, sdCapsule(q, vec3(-h * 0.15, h * 0.66, 0.0), vec3(-h * 0.2, h * 0.36, 0.0), h * 0.04));
  d = min(d, sdCapsule(q, vec3(h * 0.15, h * 0.66, 0.0), vec3(h * 0.2, h * 0.36, 0.0), h * 0.04));
  return d;
}
// actual-space position of a normal-room point: P / (1 + beta * x)  (keeps it on the same sight line)
vec3 toActual(vec3 P){ return P / (1.0 + P0 * P.x); }
float people(vec3 q, out float which){
  vec3 fl = toActual(vec3(-0.6, -H, D - 0.35));
  vec3 fr = toActual(vec3(0.6, -H, D - 0.35));
  float a = personSD(q - fl, P1), b = personSD(q - fr, P1);
  which = a < b ? 0.0 : 1.0;
  return min(a, b);
}
float chk(vec2 uv, float blur){
  vec2 d = (0.25 - abs(fract(uv * 0.5 - 0.25) - 0.5)) * 2.0;
  vec2 v = clamp(0.5 + d / max(blur, 1e-3), 0.0, 1.0);
  return xr(v.x, v.y);
}
// trace one normal-room plane (a.P = d) in actual space; inner = sign of (a.P - d) inside the room
void plane(vec3 ro, vec3 rd, vec3 a, float d, float inner, int id, inout float tBest, inout vec3 Pbest, inout int idBest){
  vec3 a2 = a + vec3(d * P0, 0.0, 0.0);
  if ((dot(a2, ro) - d) * inner < 0.0) return;    // eye on the outside: see straight through (doll's-house view)
  float den = dot(a2, rd);
  if (abs(den) < 1e-6) return;
  float t = (d - dot(a2, ro)) / den;
  if (t <= 1e-4 || t >= tBest) return;
  vec3 Q = ro + rd * t;
  float k = 1.0 - P0 * Q.x;
  if (k <= 0.0) return;
  vec3 P = Q / k;
  bool ok;
  if (id == 0) ok = abs(P.x) <= W && P.z >= ZF && P.z <= D;
  else if (id == 3) ok = abs(P.x) <= W && P.y >= -H && P.y <= H;
  else ok = P.y >= -H && P.y <= H && P.z >= ZF && P.z <= D;
  if (!ok) return;
  tBest = t; Pbest = P; idBest = id;
}
vec3 illusion(vec2 p){
  vec3 target = vec3(0.0, 0.0, D * 0.6);
  vec2 orb = u_orbit + (u_reveal > 0.5 ? vec2(0.35, 0.95) : vec2(0.0));
  vec3 ro = orbitEye(vec3(0.0), target, orb.x, orb.y);
  mat3 B = lookAt(ro, target);
  if (length(orb) < 1e-4) B = mat3(1.0);           // exactly at the peephole, looking straight in
  vec3 rd = normalize(B * vec3(p, 2.3));
  float tRoom = 1e9; vec3 P = vec3(0.0); int id = -1;
  plane(ro, rd, vec3(0.0, 1.0, 0.0), -H, 1.0, 0, tRoom, P, id);   // floor
  plane(ro, rd, vec3(1.0, 0.0, 0.0), -W, 1.0, 1, tRoom, P, id);   // left wall
  plane(ro, rd, vec3(1.0, 0.0, 0.0), W, -1.0, 2, tRoom, P, id);   // right wall
  plane(ro, rd, vec3(0.0, 0.0, 1.0), D, -1.0, 3, tRoom, P, id);   // back wall
  vec3 col = mix(vec3(0.05, 0.06, 0.08), vec3(0.16, 0.18, 0.22), clamp(p.y * 0.5 + 0.5, 0.0, 1.0));
  if (id >= 0) {
    float k = 1.0 - P0 * (ro + rd * tRoom).x;
    float pix = tRoom * u_px / 2.3 / max(k, 0.05);
    if (id == 0) {
      float ts = 2.0 * W / P2;
      col = mix(C1, C0, chk(vec2(P.x + W, P.z - ZF) / ts, pix / ts * 1.5));
    } else {
      float shade = id == 1 ? 0.8 : (id == 2 ? 0.9 : 1.0);
      col = C2 * shade;
      if (id == 3 && P3 < 0.5) {
        vec2 wq = vec2(abs(P.x) - 0.5, P.y - 0.18);
        float win = sdBox(wq, vec2(0.17, 0.22));
        col = mix(col, vec3(0.92, 0.95, 1.0) * 0.75, clamp(0.5 - win / pix, 0.0, 1.0));
        col = mix(col, C2 * 0.45, clamp(0.5 - (abs(win) - 0.012) / pix, 0.0, 1.0));
      }
      col = mix(col, C2 * 0.4, clamp(0.5 - (P.y + H - 0.04) / pix, 0.0, 1.0));   // skirting board
    }
  }
  // the two people (identical, standing in actual space)
  float t = 0.0, which = 0.0, md = 1e9, tmd = 0.0;
  bool hit = false;
  for (int i = 0; i < 96; i++) {
    float d = people(ro + rd * t, which);
    if (d / max(t, 0.1) < md) { md = d / max(t, 0.1); tmd = t; }
    if (d < 0.0005 * t) { hit = true; break; }
    if (t > tRoom) break;
    t += max(d, 0.0008 * t);
  }
  if (!hit) t = tmd;
  float cov = hit && t < tRoom ? 1.0 : (tmd < tRoom ? clamp(0.5 - md / (u_px / 2.3), 0.0, 1.0) : 0.0);
  if (cov > 0.0) {
    vec3 h = ro + rd * t;
    vec2 e = vec2(0.002, 0.0);
    float w;
    vec3 n = normalize(vec3(people(h + e.xyy, w) - people(h - e.xyy, w),
                            people(h + e.yxy, w) - people(h - e.yxy, w),
                            people(h + e.yyx, w) - people(h - e.yyx, w)));
    float l = max(dot(n, normalize(vec3(-0.4, 0.8, -0.5))), 0.0);
    col = mix(col, C3 * (0.35 + 0.75 * l), cov);
  }
  return col;
}`,
  },
  {
    id: 'kinetic-depth', name: 'Kinetic depth', cat: '3D', animated: true,
    reveal: 'Add depth cues',
    params: [
      { n: 'Shape', opts: ['Cylinder', 'Sphere'], v: 0 },
      { n: 'Dot density', min: 6, max: 40, step: 1, v: 22 },
      { n: 'Dot size', min: 0.004, max: 0.03, step: 0.0005, v: 0.012 },
      { n: 'Spin speed', min: -2, max: 2, step: 0.01, v: 0.6 },
      { n: 'Radius', min: 0.3, max: 0.9, step: 0.005, v: 0.6 },
    ],
    colors: [{ n: 'Background', v: '#000000' }, { n: 'Dots', v: '#ffffff' }],
    info: {
      see: 'A swarm of flat dots becomes a solid cylinder (or ball) spinning in depth — and it flips direction if you watch long enough.',
      why: 'Structure from motion. Every frame is just dots sliding left and right on a flat screen, but the brain infers the 3D shape that would make those speeds coherent. With orthographic projection and identical dots there is no clue to which dots are in front, so both spin directions fit equally well. Reveal makes nearer dots bigger and brighter, and the ambiguity vanishes.',
    },
    glsl: `
float dotCov(vec2 xy, float th, float v, float phi, float R, float nU, float cellV, float vMin, float vMax, bool sphere, out float bright){
  float cov = 0.0;
  bright = 0.0;
  th = mod(th, TAU);
  float i = floor(th / TAU * nU), j = floor((v - vMin) / cellV);
  for (int di = -1; di <= 1; di++) {
    for (int dj = -1; dj <= 1; dj++) {
      float ii = mod(i + float(di) + nU, nU), jj = j + float(dj);
      float vd = vMin + (jj + 0.15 + 0.7 * hash21(vec2(ii, jj + 17.0))) * cellV;
      if (vd < vMin || vd > vMax) continue;
      float td = (ii + 0.15 + 0.7 * hash21(vec2(jj, ii + 41.0))) / nU * TAU + phi;
      float rho = sphere ? R * sqrt(max(0.0, 1.0 - vd * vd)) : R;
      vec2 XY = vec2(rho * sin(td), sphere ? R * vd : vd);
      float z = rho * cos(td) / R * 0.5 + 0.5;          // 0 back .. 1 front
      float r = P2 * (u_reveal > 0.5 ? mix(0.45, 1.5, z) : 1.0);
      float c = fill(length(xy - XY) - r);
      float b = u_reveal > 0.5 ? mix(0.25, 1.0, z) : 1.0;
      if (c * b > cov * bright || c > cov) { cov = max(cov, c); bright = max(bright, b); }
    }
  }
  return cov;
}
vec3 illusion(vec2 p){
  bool sphere = P0 > 0.5;
  float R = P4, phi = u_time * P3, nU = P1;
  float cellV, vMin, vMax, v, rho;
  if (sphere) { cellV = 2.0 / floor(nU / PI + 1.0); vMin = -1.0; vMax = 1.0; v = clamp(p.y / R, -1.0, 1.0); rho = R * sqrt(max(0.0, 1.0 - v * v)); }
  else { cellV = TAU * R / nU; vMin = -R * 1.25; vMax = R * 1.25; v = p.y; rho = R; }
  float s = asin(clamp(p.x / max(rho, 1e-4), -1.0, 1.0));
  float b1, b2;
  float c1 = dotCov(p, s - phi, v, phi, R, nU, cellV, vMin, vMax, sphere, b1);
  float c2 = dotCov(p, PI - s - phi, v, phi, R, nU, cellV, vMin, vMax, sphere, b2);
  float c = max(c1 * b1, c2 * b2);
  return mix(C0, C1, c);
}`,
  },
  {
    id: 'silhouette-spinner', name: 'Silhouette spinner', cat: '3D', animated: true, heavy: true,
    reveal: 'Light it up',
    params: [
      { n: 'Spin speed', min: -2, max: 2, step: 0.01, v: 0.7 },
      { n: 'Camera elevation °', min: -25, max: 25, step: 0.5, v: 8 },
      { n: 'Leg raise °', min: 30, max: 115, step: 1, v: 82 },
      { n: 'Arm reach', min: 0.2, max: 0.9, step: 0.01, v: 0.6 },
    ],
    colors: [{ n: 'Background', v: '#f3efe6' }, { n: 'Figure', v: '#111111' }],
    info: {
      see: 'The figure spins — clockwise or anticlockwise? Keep watching and it will reverse.',
      why: 'Like the famous spinning dancer, it is a pure silhouette under parallel projection. A figure turning one way seen from slightly above produces exactly the same outline as its mirror image turning the other way seen from slightly below, so the brain has to guess, and the guess flips. Lighting the figure adds shading that settles it at once.',
    },
    glsl: `
float figure(vec3 q){
  float r = radians(P2);
  vec3 hip = vec3(0.0, -0.1, 0.0);
  float d = sdCapsule(q, vec3(0.0, -0.95, 0.0), hip, 0.055);
  d = min(d, sdCapsule(q, hip, vec3(0.0, 0.42, 0.0), 0.1));
  d = min(d, length(q - vec3(0.0, 0.62, 0.0)) - 0.12);
  d = min(d, length(q - vec3(-0.06, 0.74, 0.04)) - 0.07);
  vec3 leg = normalize(vec3(sin(r) * 0.85, -cos(r), sin(r) * 0.5));
  d = min(d, sdCapsule(q, hip, hip + leg * 0.85, 0.05));
  vec3 sh = vec3(0.0, 0.36, 0.0);
  d = min(d, sdCapsule(q, sh, sh + normalize(vec3(-0.35, 0.9, 0.25)) * P3, 0.04));
  d = min(d, sdCapsule(q, sh, sh + normalize(vec3(0.9, 0.25, -0.3)) * P3, 0.04));
  return d;
}
float sceneSD(vec3 pos){
  float a = u_time * P0;
  float c = cos(a), s = sin(a);
  vec3 q = vec3(c * pos.x - s * pos.z, pos.y, s * pos.x + c * pos.z);
  return figure(q);
}
vec3 illusion(vec2 p){
  vec3 target = vec3(0.0, -0.05, 0.0);
  vec3 eye = orbitEye(vec3(0.0, -0.05, -5.0), target, u_orbit.x, u_orbit.y + radians(P1));
  mat3 B = lookAt(eye, target);
  float scale = 1.15;
  vec3 ro = eye + B * vec3(p * scale, 0.0), rd = B[2];
  float t = 3.0, md = 1e9;
  bool hit = false;
  for (int i = 0; i < 140; i++) {
    float d = sceneSD(ro + rd * t);
    md = min(md, d);
    if (d < 0.0008) { hit = true; break; }
    t += max(d * 0.9, 0.002);      // minimum step: grazing rays can't stall on an edge
    if (t > 7.0) break;
  }
  if (t <= 7.0) hit = true;          // ran out of steps without escaping: inside the silhouette
  float cov = hit ? 1.0 : clamp(0.5 - md / (u_px * scale), 0.0, 1.0);
  vec3 fig = C1;
  if (u_reveal > 0.5 && hit) {
    vec3 h = ro + rd * t;
    vec2 e = vec2(0.002, 0.0);
    vec3 n = normalize(vec3(sceneSD(h + e.xyy) - sceneSD(h - e.xyy), sceneSD(h + e.yxy) - sceneSD(h - e.yxy), sceneSD(h + e.yyx) - sceneSD(h - e.yyx)));
    float l = max(dot(n, normalize(vec3(-0.5, 0.7, -0.6))), 0.0);
    fig = mix(vec3(0.85, 0.55, 0.35) * (0.25 + 0.85 * l), vec3(1.0), pow(1.0 - max(dot(n, -rd), 0.0), 3.0) * 0.4);
  }
  return mix(C0, fig, cov);
}`,
  },
  {
    id: 'shape-from-shading', name: 'Bumps or dents', cat: '3D',
    reveal: 'Light from the other side',
    params: [
      { n: 'Grid', min: 3, max: 12, step: 1, v: 6 },
      { n: 'Disc size', min: 0.2, max: 0.48, step: 0.005, v: 0.4 },
      { n: 'Pattern', opts: ['Random mix', 'Checker', 'All the same'], v: 0 },
      { n: 'Light angle °', min: 0, max: 360, step: 1, v: 90 },
      { n: 'Relief', min: 0.2, max: 1, step: 0.01, v: 0.85 },
    ],
    colors: [{ n: 'Surface', v: '#bdb4a6' }],
    info: {
      see: 'Some discs bulge out, others are dents pushed in.',
      why: 'Every disc is the same flat shading pattern — half of them simply rotated 180°. Shading alone cannot tell a bump lit from above from a dent lit from below, so the brain assumes light comes from above. Rotate the view 180° (two-finger twist or View → Rotation) or press Reveal, and every bump becomes a dent.',
    },
    glsl: `
vec3 illusion(vec2 p){
  float s = 2.0 / P0;
  vec2 c = floor(p / s);
  vec2 f = (fract(p / s) - 0.5) * s;
  float r = P1 * s;
  float flip = P2 < 0.5 ? (hash21(c) > 0.5 ? 1.0 : -1.0) : (P2 < 1.5 ? (mod(c.x + c.y, 2.0) < 0.5 ? 1.0 : -1.0) : 1.0);
  float la = radians(P3) + (u_reveal > 0.5 ? PI : 0.0);
  vec3 L = normalize(vec3(cos(la), sin(la), 0.9));
  vec2 q = f / r;
  float d2 = dot(q, q);
  vec3 n = normalize(vec3(q * flip * P4, sqrt(max(0.0, 1.0 - d2))));
  float flat_ = L.z * 0.85 + 0.15;
  float sh = max(dot(n, L), 0.0) * 0.85 + 0.15;
  float inside = fill((sqrt(d2) - 1.0) * r);
  return clamp(C0 * mix(1.0, sh / flat_, inside), 0.0, 1.0);
}`,
  },
  {
    id: 'anamorphic', name: 'Anamorphic sculpture', cat: '3D', orbit: true, heavy: true,
    reveal: 'Step to the side',
    params: [
      { n: 'Shape', opts: ['Ring', 'Square', 'Cube'], v: 0 },
      { n: 'Depth scatter', min: 0, max: 1, step: 0.01, v: 0.75 },
      { n: 'Bar thickness', min: 0.01, max: 0.06, step: 0.001, v: 0.03 },
      { n: 'Ring pieces', min: 8, max: 24, step: 1, v: 16, show: p => p[0] === 0 },
      { n: 'Seed', min: 0, max: 100, step: 1, v: 7 },
    ],
    colors: [{ n: 'Pieces', v: '#e8b04a' }, { n: 'Sky', v: '#1c2433' }, { n: 'Ground', v: '#0b0e14' }],
    info: {
      see: 'A perfect ring (or square, or cube) floating in space. Drag to walk around it.',
      why: 'The shape is an anamorphosis: separate pieces scattered at very different distances, each scaled so that from one exact viewpoint it projects onto its slot in the outline. The brain assumes things that line up are connected. A step to the side breaks the alignment, and the pieces fly apart.',
    },
    glsl: `
const float Z0 = 4.0, FOC = 2.0;
void seg(float i, out vec2 a, out vec2 b){
  if (P0 < 0.5) {
    float n = P3;
    float a0 = i / n * TAU, a1 = (i + 1.0) / n * TAU;
    a = 0.72 * vec2(cos(a0), sin(a0)); b = 0.72 * vec2(cos(a1), sin(a1));
  } else if (P0 < 1.5) {
    float e = floor(i / 3.0), j = mod(i, 3.0);
    vec2 c0 = sign(vec2(cos(PI * 0.25 + e * PI * 0.5), sin(PI * 0.25 + e * PI * 0.5))) * 0.62;
    vec2 c1 = sign(vec2(cos(PI * 0.25 + (e + 1.0) * PI * 0.5), sin(PI * 0.25 + (e + 1.0) * PI * 0.5))) * 0.62;
    a = mix(c0, c1, j / 3.0); b = mix(c0, c1, (j + 1.0) / 3.0);
  } else {
    float e = floor(i / 2.0), j = mod(i, 2.0);
    float k = mod(e, 4.0);
    vec2 fo = vec2(-0.17, -0.14), bo = vec2(0.17, 0.14);
    vec2 c0 = sign(vec2(cos(PI * 0.25 + k * PI * 0.5), sin(PI * 0.25 + k * PI * 0.5))) * 0.45;
    vec2 c1 = sign(vec2(cos(PI * 0.25 + (k + 1.0) * PI * 0.5), sin(PI * 0.25 + (k + 1.0) * PI * 0.5))) * 0.45;
    vec2 A, Bp;
    if (e < 4.0) { A = fo + c0; Bp = fo + c1; }
    else if (e < 8.0) { A = bo + c0; Bp = bo + c1; }
    else { A = fo + c0; Bp = bo + c0; }
    a = mix(A, Bp, j / 2.0); b = mix(A, Bp, (j + 1.0) / 2.0);
  }
}
float count(){ return P0 < 0.5 ? P3 : (P0 < 1.5 ? 12.0 : 24.0); }
float depthK(float n){ return max(0.35, 1.0 + P1 * (hash11(n + P4 * 13.0) - 0.5) * 1.6); }
float sceneSD(vec3 pos, out vec3 axisPt){
  float d = 1e9;
  float N = count();
  axisPt = vec3(0.0);
  for (int k = 0; k < 24; k++) {
    float i = float(k);
    if (i >= N) break;
    vec2 a, b;
    seg(i, a, b);
    float ka = depthK(i * 2.0), kb = depthK(i * 2.0 + 1.0);
    vec3 A = vec3(a * Z0 / FOC, Z0) * ka, Bv = vec3(b * Z0 / FOC, Z0) * kb;
    vec3 pa = pos - A, ba = Bv - A;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    float r = P2 * Z0 / FOC * mix(ka, kb, h);
    float dd = length(pa - ba * h) - r;
    if (dd < d) { d = dd; axisPt = A + ba * h; }
  }
  return d;
}
vec3 illusion(vec2 p){
  vec3 target = vec3(0.0, 0.0, Z0);
  vec2 orb = u_orbit + (u_reveal > 0.5 ? vec2(0.6, 0.15) : vec2(0.0));
  vec3 ro = orbitEye(vec3(0.0), target, orb.x, orb.y);
  mat3 B = lookAt(ro, target);
  if (length(orb) < 1e-4) B = mat3(1.0);
  vec3 rd = normalize(B * vec3(p, FOC));
  vec3 col = mix(C2, C1, smoothstep(-1.0, 1.0, p.y));
  float t = 0.5, md = 1e9;
  vec3 ax;
  bool hit = false;
  for (int i = 0; i < 110; i++) {
    float d = sceneSD(ro + rd * t, ax);
    md = min(md, d / t);
    if (d < 0.0005 * t) { hit = true; break; }
    t += max(d, 0.0015 * t);
    if (t > 20.0) break;
  }
  float pixAng = u_px / FOC;
  float cov = hit ? 1.0 : clamp(0.5 - md / pixAng, 0.0, 1.0);
  if (cov > 0.0) {
    vec3 h = ro + rd * t;
    sceneSD(h, ax);
    vec3 n = normalize(h - ax);
    float l = max(dot(n, normalize(vec3(-0.5, 0.75, -0.45))), 0.0);
    vec3 pc = C0 * (0.3 + 0.8 * l) + vec3(0.25) * pow(max(dot(reflect(rd, n), normalize(vec3(-0.5, 0.75, -0.45))), 0.0), 24.0);
    col = mix(col, pc, cov);
  }
  return col;
}`,
  },
];
