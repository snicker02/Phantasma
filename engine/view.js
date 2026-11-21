// Pan / zoom / rotate controller for the canvas.
// Mouse: drag pans, wheel zooms at cursor. Touch: one finger drags, pinch zooms,
// two-finger drag pans, two-finger twist rotates. Double-tap / double-click resets.

export class ViewController {
  constructor(el, onChange) {
    this.el = el;
    this.onChange = onChange;
    this.zoom = 1; this.rot = 0; this.pan = [0, 0];
    this.pointers = new Map();
    this.gesture = null;
    this.lastTap = { t: 0, x: 0, y: 0 };
    el.style.touchAction = 'none';
    el.addEventListener('pointerdown', e => this._down(e));
    el.addEventListener('pointermove', e => this._move(e));
    el.addEventListener('pointerup', e => this._up(e, false));
    el.addEventListener('pointercancel', e => this._up(e, true));
    el.addEventListener('wheel', e => this._wheel(e), { passive: false });
  }

  set(v) {
    if (v.zoom !== undefined) this.zoom = v.zoom;
    if (v.rot !== undefined) this.rot = v.rot;
    if (v.pan !== undefined) this.pan = [v.pan[0], v.pan[1]];
  }

  reset() { this.zoom = 1; this.rot = 0; this.pan = [0, 0]; this._emit(); }

  _emit() { this.onChange({ zoom: this.zoom, rot: this.rot, pan: this.pan }); }

  _local(e) {
    const r = this.el.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top, w: r.width, h: r.height };
  }

  // screen (css px) -> world, matching the shader: p = R(rot) * s + pan
  _world(x, y, w, h, zoom = this.zoom, rot = this.rot, pan = this.pan) {
    const k = 2 / (Math.min(w, h) * zoom);
    const sx = (x - w / 2) * k, sy = -(y - h / 2) * k;
    const c = Math.cos(rot), s = Math.sin(rot);
    return [c * sx - s * sy + pan[0], s * sx + c * sy + pan[1]];
  }

  // pan that puts world point W under screen point (x, y)
  _panFor(W, x, y, w, h, zoom, rot) {
    const p0 = this._world(x, y, w, h, zoom, rot, [0, 0]);
    return [W[0] - p0[0], W[1] - p0[1]];
  }

  _startGesture() {
    const pts = [...this.pointers.values()];
    if (pts.length >= 2) {
      const [a, b] = pts;
      const r = this.el.getBoundingClientRect();
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      this.gesture = {
        type: 'pinch',
        W: this._world(mx, my, r.width, r.height),
        d0: Math.hypot(b.x - a.x, b.y - a.y) || 1,
        a0: Math.atan2(-(b.y - a.y), b.x - a.x),
        z0: this.zoom, r0: this.rot,
      };
    } else if (pts.length === 1) {
      this.gesture = { type: 'drag', x: pts[0].x, y: pts[0].y };
    } else this.gesture = null;
  }

  _down(e) {
    if (e.button !== undefined && e.button > 0 && e.pointerType === 'mouse') return;
    this.el.setPointerCapture?.(e.pointerId);
    const l = this._local(e);
    this.pointers.set(e.pointerId, { x: l.x, y: l.y, t: performance.now(), sx: l.x, sy: l.y });
    this._startGesture();
  }

  _move(e) {
    const p = this.pointers.get(e.pointerId);
    if (!p || !this.gesture) return;
    const l = this._local(e);
    p.x = l.x; p.y = l.y;
    const g = this.gesture;
    if (g.type === 'drag' && this.pointers.size === 1) {
      const W0 = this._world(g.x, g.y, l.w, l.h);
      const W1 = this._world(l.x, l.y, l.w, l.h);
      this.pan = [this.pan[0] + W0[0] - W1[0], this.pan[1] + W0[1] - W1[1]];
      g.x = l.x; g.y = l.y;
      this._emit();
    } else if (g.type === 'pinch' && this.pointers.size >= 2) {
      const [a, b] = [...this.pointers.values()];
      const d = Math.hypot(b.x - a.x, b.y - a.y) || 1;
      const ang = Math.atan2(-(b.y - a.y), b.x - a.x);
      this.zoom = clampZoom(g.z0 * d / g.d0);
      this.rot = g.r0 - (ang - g.a0);
      const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2;
      this.pan = this._panFor(g.W, mx, my, l.w, l.h, this.zoom, this.rot);
      this._emit();
    }
  }

  _up(e, cancelled) {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    this.pointers.delete(e.pointerId);
    if (!cancelled && this.pointers.size === 0) {
      const now = performance.now();
      const moved = Math.hypot(p.x - p.sx, p.y - p.sy);
      if (now - p.t < 300 && moved < 10) {
        const lt = this.lastTap;
        if (now - lt.t < 320 && Math.hypot(p.x - lt.x, p.y - lt.y) < 30) {
          this.lastTap = { t: 0, x: 0, y: 0 }; // guard: consume so a third tap isn't another double
          this.reset();
        } else this.lastTap = { t: now, x: p.x, y: p.y };
      } else this.lastTap = { t: 0, x: 0, y: 0 };
    }
    this._startGesture();
  }

  _wheel(e) {
    e.preventDefault();
    const l = this._local(e);
    const W = this._world(l.x, l.y, l.w, l.h);
    const f = Math.exp(-e.deltaY * (e.deltaMode === 1 ? 0.05 : 0.0015));
    this.zoom = clampZoom(this.zoom * f);
    this.pan = this._panFor(W, l.x, l.y, l.w, l.h, this.zoom, this.rot);
    this._emit();
  }
}

export function clampZoom(z) { return Math.min(40, Math.max(0.1, z)); }
