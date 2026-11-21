// Shared GLSL ES 1.0 prelude + main() wrapper. Each illusion supplies
// `vec3 illusion(vec2 p)` where p is world space: the shorter screen side
// spans [-1, 1] at zoom 1. All widths are in world units, so output is
// resolution independent (PNG export at 4K looks identical to the screen).

export const PRELUDE = `
precision highp float;
uniform vec2 u_res;
uniform float u_time;
uniform float u_p[12];
uniform vec3 u_c0;
uniform vec3 u_c1;
uniform vec3 u_c2;
uniform vec3 u_c3;
uniform vec2 u_pan;
uniform float u_zoom;
uniform float u_rot;
uniform float u_reveal;
uniform float u_phase;
uniform float u_px;
uniform sampler2D u_tex;
uniform float u_texAspect;
uniform float u_hasTex;
uniform vec2 u_orbit;   // camera yaw, pitch (radians) for 3D illusions

#define P0 u_p[0]
#define P1 u_p[1]
#define P2 u_p[2]
#define P3 u_p[3]
#define P4 u_p[4]
#define P5 u_p[5]
#define P6 u_p[6]
#define P7 u_p[7]
#define P8 u_p[8]
#define P9 u_p[9]
#define P10 u_p[10]
#define P11 u_p[11]
#define C0 u_c0
#define C1 u_c1
#define C2 u_c2
#define C3 u_c3
#define PI 3.14159265359
#define TAU 6.28318530718

// coverage of a signed distance (negative inside), one pixel wide AA
float fill(float sd){ return clamp(0.5 - sd / u_px, 0.0, 1.0); }
// antialiased square wave: x in cell units (period = 2 cells), cell = world size of one cell.
// returns 1 on odd cells [1,2) mod 2, 0 on even cells.
float sq(float x, float cell){
  float d = (0.25 - abs(fract(x * 0.5 - 0.25) - 0.5)) * 2.0 * cell;
  return clamp(0.5 + d / u_px, 0.0, 1.0);
}
float xr(float a, float b){ return a + b - 2.0 * a * b; }
mat2 rot(float a){ float c = cos(a), s = sin(a); return mat2(c, s, -s, c); }
float sdSeg(vec2 p, vec2 a, vec2 b){
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}
float sdBox(vec2 p, vec2 b){
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}
vec3 hsv(float h, float s, float v){
  vec3 k = clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0);
  return v * mix(vec3(1.0), k, s);
}
float luma(vec3 c){ return dot(c, vec3(0.299, 0.587, 0.114)); }
float hash11(float n){ return fract(sin(n * 127.1 + 311.7) * 43758.5453); }
float hash21(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

// ---- 3D helpers ----
// move eye0 around target by yaw (about +y) and pitch (elevation), keeping the distance
vec3 orbitEye(vec3 eye0, vec3 target, float yaw, float pitch){
  vec3 d = eye0 - target;
  float r = length(d);
  float h = length(d.xz);
  vec2 dir = h > 1e-5 ? d.xz / h : vec2(0.0, -1.0);
  float c = cos(yaw), s = sin(yaw);
  dir = vec2(c * dir.x + s * dir.y, -s * dir.x + c * dir.y);
  float el = clamp(atan(d.y, h) + pitch, -1.45, 1.45);
  return target + vec3(dir.x * cos(el), sin(el), dir.y * cos(el)) * r;
}
// camera basis: columns = right, up, forward (screen x right, y up)
mat3 lookAt(vec3 ro, vec3 ta){
  vec3 f = normalize(ta - ro);
  vec3 r = normalize(cross(vec3(0.0, 1.0, 0.0), f));
  vec3 u = cross(f, r);
  return mat3(r, u, f);
}
float sdCapsule(vec3 p, vec3 a, vec3 b, float r){
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}
`;

export function mainWrapper(ss) {
  return `
void main(){
  vec3 col = vec3(0.0);
  float m = min(u_res.x, u_res.y);
  for (int i = 0; i < ${ss}; i++) {
    for (int j = 0; j < ${ss}; j++) {
      vec2 f = gl_FragCoord.xy + (vec2(float(i), float(j)) + 0.5) / ${ss}.0 - 0.5;
      vec2 p = (f - 0.5 * u_res) / m * 2.0 / u_zoom;
      p = rot(u_rot) * p + u_pan;
      col += illusion(p);
    }
  }
  gl_FragColor = vec4(clamp(col / ${ss * ss}.0, 0.0, 1.0), 1.0);
}
`;
}

export function buildFragment(ill, ss) {
  return PRELUDE + '\n' + ill.glsl + '\n' + mainWrapper(ss);
}
