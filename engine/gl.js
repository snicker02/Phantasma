// Minimal WebGL1 renderer: one fullscreen triangle, cached programs per illusion+quality.
import { buildFragment } from './prelude.js';

const VERT = 'attribute vec2 a; void main(){ gl_Position = vec4(a, 0.0, 1.0); }';
const UNIFORMS = ['u_res', 'u_time', 'u_p', 'u_c0', 'u_c1', 'u_c2', 'u_c3', 'u_pan', 'u_zoom',
  'u_rot', 'u_reveal', 'u_phase', 'u_px', 'u_tex', 'u_texAspect', 'u_hasTex'];

export class Renderer {
  constructor(canvas) {
    const gl = canvas.getContext('webgl', { antialias: false, premultipliedAlpha: false, alpha: false });
    if (!gl) throw new Error('WebGL is not available in this browser.');
    this.gl = gl;
    this.canvas = canvas;
    this.cache = new Map();
    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    this.vs = this._shader(gl.VERTEX_SHADER, VERT);
    // default 1x1 texture so the sampler is always bound
    this.tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([128, 128, 128, 255]));
    this._texParams();
    this.texAspect = 1;
    this.hasTex = false;
    this.pbuf = new Float32Array(12);
  }

  _texParams() {
    const gl = this.gl;
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  _shader(type, src) {
    const gl = this.gl;
    const s = gl.createShader(type);
    gl.shaderSource(s, src);
    gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const log = gl.getShaderInfoLog(s);
      gl.deleteShader(s);
      throw new Error(log || 'shader compile failed');
    }
    return s;
  }

  program(ill, ss) {
    const key = ill.id + '|' + ss;
    if (this.cache.has(key)) return this.cache.get(key);
    const gl = this.gl;
    const fs = this._shader(gl.FRAGMENT_SHADER, buildFragment(ill, ss));
    const prog = gl.createProgram();
    gl.attachShader(prog, this.vs);
    gl.attachShader(prog, fs);
    gl.bindAttribLocation(prog, 0, 'a');
    gl.linkProgram(prog);
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog) || 'link failed');
    const loc = {};
    for (const u of UNIFORMS) loc[u] = gl.getUniformLocation(prog, u);
    const entry = { prog, loc };
    this.cache.set(key, entry);
    return entry;
  }

  setImage(img) {
    const gl = this.gl;
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false);
    this._texParams();
    this.texAspect = img.width / img.height;
    this.hasTex = true;
  }

  draw(ill, ss, u) {
    const gl = this.gl;
    const { prog, loc } = this.program(ill, ss);
    const w = this.canvas.width, h = this.canvas.height;
    gl.viewport(0, 0, w, h);
    gl.useProgram(prog);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.pbuf.fill(0);
    u.params.forEach((v, i) => { this.pbuf[i] = v; });
    gl.uniform2f(loc.u_res, w, h);
    gl.uniform1f(loc.u_time, u.time);
    gl.uniform1fv(loc.u_p, this.pbuf);
    for (let i = 0; i < 4; i++) {
      const c = u.colors[i] || [0, 0, 0];
      gl.uniform3f(loc['u_c' + i], c[0], c[1], c[2]);
    }
    gl.uniform2f(loc.u_pan, u.pan[0], u.pan[1]);
    gl.uniform1f(loc.u_zoom, u.zoom);
    gl.uniform1f(loc.u_rot, u.rot);
    gl.uniform1f(loc.u_reveal, u.reveal ? 1 : 0);
    gl.uniform1f(loc.u_phase, u.phase);
    gl.uniform1f(loc.u_px, 2 / (Math.min(w, h) * u.zoom));
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.tex);
    gl.uniform1i(loc.u_tex, 0);
    gl.uniform1f(loc.u_texAspect, this.texAspect);
    gl.uniform1f(loc.u_hasTex, this.hasTex ? 1 : 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
