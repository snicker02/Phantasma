# Phantasma — optical illusion lab

**v1.5.0**

Forty-two classic optical illusions, each rebuilt as a live, fully parametric WebGL1 shader. That includes real 3D scenes, ray-traced and raymarched in the fragment shader, that you can orbit around. Every illusion has sliders for its geometry and colours, a short note on what to look for and why it works, and — where it makes sense — a **Reveal** toggle that shows you the truth.

No dependencies, no build step. Open `index.html` from any static host (GitHub Pages works as-is).

## Illusions

42 illusions in five groups:

- **Geometric**: café wall, Zöllner lines, Fraser spiral, Hering & Wundt, Müller-Lyer, Ebbinghaus circles, Kanizsa triangle, Ponzo, Poggendorff, Jastrow, Orbison
- **Ambiguous & impossible**: Necker cube, Penrose triangle, Rubin vase
- **3D** (drag to orbit the camera where noted):
  - Penrose sculpture (orbit)
  - Ames room (orbit)
  - Anamorphic sculpture (orbit)
  - Kinetic depth
  - Silhouette spinner
  - Bumps or dents (shape from shading)
- **Motion**: rotating snakes, Ouchi, Pinna–Brelstaff rings, Enigma, lilac chaser, motion aftereffect (stare test), stepping feet, moiré, barber pole, breathing square, wagon wheel
- **Lightness & colour**: scintillating / Hermann grid, simultaneous contrast, White's illusion, colour afterimage (stare test), photo afterimage (stare test), Troxler fading, shadow checker, Cornsweet edge, Mach bands, Munker colour, Ehrenstein & neon spreading

## Features

- **Reveal** (R): straight guides on the café wall, Zöllner and Fraser figures, end guides on Müller-Lyer, flattened backgrounds for contrast illusions, and more.
- **Stare tests**: a countdown for the afterimage and motion-aftereffect illusions, then an automatic switch to the test image.
- **Photo afterimage**: load any photo. It's shown with its colours inverted (brightness kept), then switched to greyscale, and the afterimage makes it look coloured.
- **Colours**: every colour can be edited, inverted or reset. Settings are remembered for each illusion.
- **Reset everything** (bottom of the View tab, tap twice to confirm): returns every illusion's settings and colours, the view, quality, speed and export options to their defaults, and clears the loaded photo and saved tab.
- **View**: pan, zoom and rotate. Choose 1×, 4× or 9× supersampling and set the animation speed.
- **Export**:
  - PNG up to 4096², rendered at full resolution (all widths are in world units, so the image looks the same at any size)
  - **MP4 video (default)**: frames are rendered one at a time at exact time steps, encoded to H.264 with WebCodecs, and written by a built-in MP4 muxer (`engine/mp4.js`), so no frames are dropped. Choose the size (screen, 720p, 1080p, 1080 square, 1080×1920 vertical, 4K), 30 or 60 fps, and a length of 2–30 s. Browsers without WebCodecs H.264 but with MediaRecorder MP4 (older Safari) record the view in real time instead.
  - WebM video (real-time capture of the view)
  - Video controls only appear for animated illusions
  - a shareable link that encodes the illusion, its parameters and colours in the URL hash

## Controls

| | Mouse / keyboard | Touch |
|---|---|---|
| Pan | drag | one-finger drag, or two-finger drag |
| Zoom | wheel (at cursor) | pinch |
| Rotate | View → Rotation | two-finger twist |
| Orbit (3D illusions) | drag, or View → Orbit / Tilt; Shift- or right-drag pans | one-finger drag; two fingers pan |
| Reset view (and orbit) | double-click, `0` | double-tap |
| Previous / next illusion | `←` / `→` | ‹ › buttons |
| Reveal / play-pause / fullscreen | `R` / `Space` / `F` | header buttons |

On phones (≤ 760 px wide, or landscape ≤ 500 px tall) the view stays docked: on top in portrait, on the left in landscape. The panel sections become tabs, and the last tab you used is remembered.

There is no "Confirm changes before applying" mode: every control is a uniform change to a fragment shader, so updates are instant.

## Structure

```
index.html          markup
style.css           desktop + docked phone layout, touch sizing
main.js             UI, state, render loop, stare tests, export, share links
engine/mp4.js       dependency-free H.264 MP4 muxer + WebCodecs config probe
engine/prelude.js   shared GLSL (AA helpers, SDFs, orbit camera) + supersampling main()
engine/gl.js        WebGL1 renderer, program cache, photo texture
engine/view.js      pointer-event pan / pinch / twist / orbit / double-tap controller
engine/tabs.js      phone tab layout
illusions/*.js      illusion definitions by category: params, colours, info text, GLSL
tools/              validation scripts (not needed at runtime)
```

To add an illusion, append an object to one of the `illusions/*.js` arrays. It needs `id`, `name`, `cat`, `params` (P0–P11), `colors` (C0–C3), `info`, and `glsl` defining `vec3 illusion(vec2 p)`. Optional fields are `orbit` (drag orbits the camera; read `u_orbit`), `heavy` (no supersampling below Best), `animated`, `reveal: 'label'`, `stare: <param index>` and `tex: true`. A param or colour can also take `show: p => bool` (shown only when it applies, given the current param values `p`), and its `n` label can be a function `p => string`.

## Validation

```
node tools/validate-shaders.mjs   # glslangValidator, every shader at every quality level
node tools/layout-test.mjs        # headless Chrome: 390×844 + 844×390 touch, 1440×900
node tools/video-test.mjs         # MP4 + WebM export, verified with ffprobe / ffmpeg full decode
```

## Changelog

- **1.5.0**: **⇄ Shelf** in the top bar. You can send the view to other snicker02 apps, and load a shelf image as the photo.
- **1.4.0** — New **3D** category with six illusions:
  - Penrose sculpture: a real object of three beams that only closes from one viewpoint
  - Ames room: a projective-distorted room whose planes are ray-traced exactly, so orbiting shows the real trapezoid
  - Anamorphic sculpture: scattered pieces that align into a ring, square or cube
  - Kinetic depth: structure from motion on a cylinder or sphere
  - Silhouette spinner: a bistable spinning figure
  - Bumps or dents: shape from shading

  Also added an orbit camera (drag to orbit, Orbit and Tilt sliders shown only for 3D illusions, Shift- or right-drag to pan). Raymarched illusions skip supersampling except at Best quality, to stay smooth on phones.
- **1.3.0** — Added 15 illusions (36 total) and a new *Ambiguous & impossible* category:
  - Geometric: Ponzo, Poggendorff, Jastrow, Orbison
  - Ambiguous & impossible: Necker cube, Penrose triangle, Rubin vase
  - Motion: barber pole, breathing square, wagon wheel
  - Lightness & colour: shadow checker, Cornsweet edge, Mach bands, Munker colour, Ehrenstein & neon spreading

  Also added **Reset everything** (two-tap confirm).
- **1.2.0** — MP4 export is now the default. It renders frame-exact through WebCodecs H.264 and a built-in muxer, with selectable size and frame rate. WebM is still available, and MP4 falls back to real-time MediaRecorder where WebCodecs H.264 is missing. Video controls are hidden for still illusions.
- **1.1.0** — The panel now shows only the controls that apply to the current illusion and mode. Mode-specific sliders and colours hide when their mode is off (e.g. *Check twist* when the Fraser background is plain, *Dot size* in Hermann mode, *Wobble speed* when wobble is 0), and labels follow the mode (*Tightness* → *Ring density*). The Reveal, Play and animation-speed controls only appear for illusions that have them.
- **1.0.1** — Added Claude AI credit to the app and README.
- **1.0.0** — First release: 21 illusions, Reveal, stare tests, photo afterimage, PNG/WebM export, share links, phone layout.

## License

MIT — see [LICENSE](LICENSE).

---

Created with help from Claude AI

## Shared image shelf

The **⇄ Shelf** button opens the image shelf shared by all apps on [snicker02.github.io](https://snicker02.github.io/#shelf). It stores images in this browser only (IndexedDB), and every app on the site can read the same shelf.

- **Save current** puts the current view on the shelf.
- **Send to ↗** opens another app in a new tab with the image already loaded.
- **Load here** brings a shelf image into this app as the photo, the same as Load photo. Opening the app with `?shelf=<id>` does the same on start, which is how Send to works.

The shelf code lives in [`snicker02.github.io/shared/bridge.js`](https://github.com/snicker02/snicker02.github.io/blob/main/shared/bridge.js). If it can't load (for example when you're offline), the app works as before and the button is hidden.
