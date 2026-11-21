# Phantasma — optical illusion lab

**v1.1.0**

Twenty-one classic optical illusions, each rebuilt as a live, fully parametric WebGL1 shader. Every illusion has sliders for its geometry and colours, a short note on what to look for and why it works, and — where it makes sense — a **Reveal** toggle that shows you the truth.

No dependencies, no build step. Open `index.html` from any static host (GitHub Pages works as-is).

## Illusions

| Geometric | Motion | Lightness & colour |
|---|---|---|
| Café wall | Rotating snakes (peripheral drift) | Scintillating / Hermann grid |
| Zöllner lines | Ouchi | Simultaneous contrast (gradient bar / split squares) |
| Fraser spiral | Pinna–Brelstaff rings | White's illusion |
| Hering & Wundt | Enigma | Colour afterimage (stare test) |
| Müller-Lyer | Lilac chaser | Photo afterimage — load your own photo (stare test) |
| Ebbinghaus circles | Motion aftereffect (stare test) | Troxler fading |
| Kanizsa triangle | Stepping feet | |
| | Moiré | |

## Features

- **Reveal** (R): straight guides on the café wall, Zöllner and Fraser figures, end guides on Müller-Lyer, flattened backgrounds for contrast illusions, and more.
- **Stare tests**: a countdown for the afterimage and motion-aftereffect illusions, then an automatic switch to the test image.
- **Photo afterimage**: load any photo. It's shown with its colours inverted (brightness kept), then switched to greyscale, and the afterimage makes it look coloured.
- **Colours**: every colour can be edited, inverted or reset. Settings are remembered for each illusion.
- **View**: pan, zoom and rotate. Choose 1×, 4× or 9× supersampling and set the animation speed.
- **Export**:
  - PNG up to 4096², rendered at full resolution (all widths are in world units, so the image looks the same at any size)
  - WebM video recording
  - a shareable link that encodes the illusion, its parameters and colours in the URL hash

## Controls

| | Mouse / keyboard | Touch |
|---|---|---|
| Pan | drag | one-finger drag, or two-finger drag |
| Zoom | wheel (at cursor) | pinch |
| Rotate | View → Rotation | two-finger twist |
| Reset view | double-click, `0` | double-tap |
| Previous / next illusion | `←` / `→` | ‹ › buttons |
| Reveal / play-pause / fullscreen | `R` / `Space` / `F` | header buttons |

On phones (≤ 760 px wide, or landscape ≤ 500 px tall) the view stays docked: on top in portrait, on the left in landscape. The panel sections become tabs, and the last tab you used is remembered.

There is no "Confirm changes before applying" mode: every control is a uniform change to a fragment shader, so updates are instant.

## Structure

```
index.html          markup
style.css           desktop + docked phone layout, touch sizing
main.js             UI, state, render loop, stare tests, export, share links
engine/prelude.js   shared GLSL (AA helpers, SDFs) + supersampling main()
engine/gl.js        WebGL1 renderer, program cache, photo texture
engine/view.js      pointer-event pan / pinch / twist / double-tap controller
engine/tabs.js      phone tab layout
illusions/*.js      illusion definitions: params, colours, info text, GLSL
tools/              validation scripts (not needed at runtime)
```

To add an illusion, append an object to one of the `illusions/*.js` arrays. It needs `id`, `name`, `cat`, `params` (P0–P11), `colors` (C0–C3), `info`, and `glsl` defining `vec3 illusion(vec2 p)`. Optional fields are `animated`, `reveal: 'label'`, `stare: <param index>` and `tex: true`. A param or colour can also take `show: p => bool` (shown only when it applies, given the current param values `p`), and its `n` label can be a function `p => string`.

## Validation

```
node tools/validate-shaders.mjs   # glslangValidator, every shader at every quality level
node tools/layout-test.mjs        # headless Chrome: 390×844 + 844×390 touch, 1440×900
```

## Changelog

- **1.1.0** — The panel now shows only the controls that apply to the current illusion and mode. Mode-specific sliders and colours hide when their mode is off (e.g. *Check twist* when the Fraser background is plain, *Dot size* in Hermann mode, *Wobble speed* when wobble is 0), and labels follow the mode (*Tightness* → *Ring density*). The Reveal, Play and animation-speed controls only appear for illusions that have them.
- **1.0.1** — Added Claude AI credit to the app and README.
- **1.0.0** — First release: 21 illusions, Reveal, stare tests, photo afterimage, PNG/WebM export, share links, phone layout.

---

Created with help from Claude AI
