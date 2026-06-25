# Changelog

All notable changes to the Buff Motion Webflow bundle. Dates are commit dates.

## v1.0.0 — 2026-06-25

Launch baseline. Full rebuild of buffmotion.com on a new Webflow build, live on `buffmotion.com` in Buff's workspace.

### Bundle

- Lifecycle orchestrated by Barba.js (`sync: true`) — persistent Lenis scroll (`window.__buffMotionLenis`), per-page module init/destroy registry, no full-page reparse on navigation.
- 24 page modules incl. `home-intro`, `sidenav`, `lottie`, `inline-video`, `filter`, `content-reveal`, plus marquees, sliders, tabs, TOC, split-text and helpers.
- 4 custom GSAP eases: `buff` (global default — the client "osmo" curve), `energy`, `panelIn`, `panelOut`.
- esbuild output: ~57 KB minified, IIFE, ES2020.

### Notable behaviour

- **Home intro** ("Hey, we're Buff") plays on **all viewports** (desktop, tablet, mobile). Words snap on at full opacity then swipe up, a welcome squiggle draws, then the panel sweeps up and the words ride up + slightly fade as one unit. Dispatches `buff:home-intro-done`, which the hero Lottie waits on (the whole `lottie.js` init defers on the home page until the intro lifts).
- **Page transition** — flat blue panel sweeps up (`panelIn`), a squiggle Lottie draws across it (~1.0s), the panel sweeps out (`panelOut`) while the new page rises `7dvh` into place on a gentle `power2.out`. (Mobile runs at the same speed as desktop.)
- **Side-nav** (Osmo underlay pattern) — links snap on then lift up (no mask), button arrow Lottie opens `31.5 → 63` and closes by rotating neatly back (`→ 90`, avoiding the wind-up frames), bg squiggle Lottie animates on all viewports.
- **Inline video** — lazy/scroll/hover play plus play-pause and **mute** toggle on the shared `[data-video-playback]` attribute family.

### Deploy

- Served via jsDelivr from `@main`: <https://cdn.jsdelivr.net/gh/shrinkstudio/buff-motion@main/dist/index.min.js>
- Loaded by a `defer` `<script>` (+ preload) in the Webflow **Footer** custom code. GSAP/Barba/Lenis/Lottie/Swiper deps are `defer`-loaded in the Head.
- Briefly trialled the Webflow Scripts API (inline loader); reverted to the plain embed when the site moved to Buff's workspace and that API access was lost.
- `dist/index.min.js` SHA256 at this tag: `8016dec9459fa929e15c07108f9f9c841b30031c8fb1df967d5e9ec68753230f`

### Cleanup at handover

- Added handover `README.md` and this `CHANGELOG`.
- Removed one-off blog-migration tooling (`scripts/*.py`) and git-ignored local CMS-import working files (`.tmp/`, `data/`, `redirects-projects.md`).
