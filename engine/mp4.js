// Minimal MP4 (ISO BMFF) muxer for a single H.264 video track, no dependencies.
// Feed it EncodedVideoChunks from a WebCodecs VideoEncoder configured with avc: { format: 'avc' }
// (length-prefixed NAL units + avcC description). Produces a "fast start" file:
// ftyp, moov, mdat — moov first so players can start before the whole file loads.

const enc = new TextEncoder();

class Writer {
  constructor() { this.parts = []; this.size = 0; }
  bytes(b) { this.parts.push(b); this.size += b.length; return this; }
  u8(v) { return this.bytes(Uint8Array.of(v & 255)); }
  u16(v) { return this.bytes(Uint8Array.of(v >>> 8 & 255, v & 255)); }
  u32(v) { return this.bytes(Uint8Array.of(v >>> 24 & 255, v >>> 16 & 255, v >>> 8 & 255, v & 255)); }
  i32(v) { return this.u32(v >>> 0); }
  str(s) { return this.bytes(enc.encode(s)); }
  zeros(n) { return this.bytes(new Uint8Array(n)); }
  concat() {
    const out = new Uint8Array(this.size);
    let o = 0;
    for (const p of this.parts) { out.set(p, o); o += p.length; }
    return out;
  }
}

function box(type, ...children) {
  const w = new Writer();
  for (const c of children) w.bytes(c instanceof Uint8Array ? c : c.concat());
  const body = w.concat();
  return new Writer().u32(body.length + 8).str(type).bytes(body).concat();
}
function fullBox(type, version, flags, ...children) {
  const head = new Writer().u8(version).u8(flags >> 16).u8(flags >> 8).u8(flags);
  return box(type, head, ...children);
}
const MATRIX = [0x00010000, 0, 0, 0, 0x00010000, 0, 0, 0, 0x40000000];
function matrix(w) { for (const m of MATRIX) w.u32(m); return w; }

export class MP4Muxer {
  constructor({ width, height, fps }) {
    this.width = width; this.height = height; this.fps = fps;
    this.timescale = Math.round(fps * 1000);
    this.frameDur = 1000; // timescale / fps
    this.samples = [];    // { size, key, cts (in timescale units, presentation time) }
    this.chunks = [];
    this.dataSize = 0;
    this.avcC = null;
  }

  addChunk(chunk, meta) {
    if (meta?.decoderConfig?.description && !this.avcC) {
      const d = meta.decoderConfig.description;
      this.avcC = new Uint8Array(d instanceof ArrayBuffer ? d : d.buffer.slice(d.byteOffset, d.byteOffset + d.byteLength));
    }
    const data = new Uint8Array(chunk.byteLength);
    chunk.copyTo(data);
    this.chunks.push(data);
    this.dataSize += data.length;
    this.samples.push({
      size: data.length,
      key: chunk.type === 'key',
      cts: Math.round(chunk.timestamp * this.timescale / 1e6),
    });
  }

  finalize() {
    if (!this.avcC) throw new Error('encoder produced no avcC configuration');
    if (!this.samples.length) throw new Error('no frames were encoded');
    if (this.dataSize > 0xfffffff0) throw new Error('video too large for this muxer (> 4 GB)');
    const n = this.samples.length;
    const duration = n * this.frameDur;
    const ftyp = box('ftyp', new Writer().str('isom').u32(512).str('isom').str('iso2').str('avc1').str('mp41'));
    const build = mdatOffset => this._moov(duration, mdatOffset);
    let moov = build(0);
    const dataStart = ftyp.length + moov.length + 8;
    moov = build(dataStart);
    const mdatHead = new Writer().u32(this.dataSize + 8).str('mdat').concat();
    return new Blob([ftyp, moov, mdatHead, ...this.chunks], { type: 'video/mp4' });
  }

  _moov(duration, chunkOffset) {
    const { width, height, timescale, samples, frameDur } = this;
    const n = samples.length;

    const mvhd = new Writer().u32(0).u32(0).u32(timescale).u32(duration)
      .u32(0x00010000).u16(0x0100).zeros(10);
    matrix(mvhd).zeros(24).u32(2);

    const tkhd = new Writer().u32(0).u32(0).u32(1).u32(0).u32(duration).zeros(8)
      .u16(0).u16(0).u16(0).u16(0);
    matrix(tkhd).u32(width << 16).u32(height << 16);

    const mdhd = new Writer().u32(0).u32(0).u32(timescale).u32(duration).u16(0x55c4).u16(0);
    const hdlr = new Writer().u32(0).str('vide').zeros(12).str('VideoHandler\0');
    const vmhd = new Writer().u16(0).zeros(6);
    const dref = fullBox('dref', 0, 0, new Writer().u32(1), fullBox('url ', 0, 1));

    const name = 'Phantasma H.264';
    const avc1 = box('avc1',
      new Writer().zeros(6).u16(1).u16(0).u16(0).zeros(12)
        .u16(width).u16(height).u32(0x00480000).u32(0x00480000).u32(0).u16(1)
        .u8(name.length).str(name).zeros(31 - name.length)
        .u16(0x0018).u16(0xffff),
      box('avcC', this.avcC));
    const stsd = fullBox('stsd', 0, 0, new Writer().u32(1), avc1);

    const stts = fullBox('stts', 0, 0, new Writer().u32(1).u32(n).u32(frameDur));

    // composition offsets only if the encoder reordered frames (B-frames)
    const offs = samples.map((s, i) => s.cts - i * frameDur);
    const needCtts = offs.some(o => o !== 0);
    let ctts = null;
    if (needCtts) {
      const runs = [];
      for (const o of offs) {
        const last = runs[runs.length - 1];
        if (last && last[1] === o) last[0]++; else runs.push([1, o]);
      }
      const w = new Writer().u32(runs.length);
      for (const [c, o] of runs) w.u32(c).i32(o);
      ctts = fullBox('ctts', 1, 0, w);
    }

    const keys = samples.map((s, i) => (s.key ? i + 1 : 0)).filter(Boolean);
    const stssW = new Writer().u32(keys.length);
    for (const k of keys) stssW.u32(k);
    const stss = fullBox('stss', 0, 0, stssW);

    const stsc = fullBox('stsc', 0, 0, new Writer().u32(1).u32(1).u32(n).u32(1));
    const stszW = new Writer().u32(0).u32(n);
    for (const s of samples) stszW.u32(s.size);
    const stsz = fullBox('stsz', 0, 0, stszW);
    const stco = fullBox('stco', 0, 0, new Writer().u32(1).u32(chunkOffset));

    const stblKids = [stsd, stts];
    if (ctts) stblKids.push(ctts);
    stblKids.push(stss, stsc, stsz, stco);

    return box('moov',
      fullBox('mvhd', 0, 0, mvhd),
      box('trak',
        fullBox('tkhd', 0, 3, tkhd),
        box('mdia',
          fullBox('mdhd', 0, 0, mdhd),
          fullBox('hdlr', 0, 0, hdlr),
          box('minf',
            fullBox('vmhd', 0, 1, vmhd),
            box('dinf', dref),
            box('stbl', ...stblKids)))));
  }
}

// Pick an H.264 configuration this browser can encode at the given size.
export async function findAvcConfig(width, height, fps, bitrate) {
  if (typeof VideoEncoder === 'undefined') return null;
  const codecs = ['avc1.640034', 'avc1.640033', 'avc1.640028', 'avc1.4d0034', 'avc1.4d0028', 'avc1.42e034', 'avc1.42e028', 'avc1.42e01f'];
  for (const codec of codecs) {
    for (const hardwareAcceleration of ['no-preference', 'prefer-software']) {
      const config = { codec, width, height, framerate: fps, bitrate, bitrateMode: 'variable', avc: { format: 'avc' }, hardwareAcceleration };
      try {
        const r = await VideoEncoder.isConfigSupported(config);
        if (r.supported) return r.config || config;
      } catch { /* try next */ }
    }
  }
  return null;
}
