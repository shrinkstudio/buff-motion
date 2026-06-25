# Buff Motion

JavaScript bundle for the [buffmotion.com](https://buffmotion.com) Webflow site. Built with esbuild, served via the jsDelivr CDN, loaded by the Webflow site's custom code.

Built and handed over by [Shrink Studio](https://shrink.studio) — a full rebuild of buffmotion.com (the previous site was a Webflow IX2 / GSAP build; this is a from-scratch esbuild bundle).

**Stack:** Barba.js (page transitions) · GSAP + plugins (animation) · Lenis (smooth scroll) · Lottie-web (vector animations) · Swiper (sliders).

---

## Repo layout

```
src/
  scripts/
    index.js            ← entry — imports transitions.js
    transitions.js      ← Barba + GSAP + Lenis + Lottie orchestration, custom
                          eases, the page transition, and the module init/destroy
                          registry (every module is wired here)
    home-intro.js       ← first-load preloader ("Hey, we're Buff" → squiggle →
                          panel sweep). Plays on ALL viewports. Fires from Barba once.
    sidenav.js          ← underlay side-nav (Osmo pattern): menu panels, link
                          reveal, button arrow Lottie + bg squiggle Lottie
    lottie.js           ← scroll-triggered Lottie player ([data-lottie])
    inline-video.js     ← lazy/scroll/hover video + play-pause + mute controls
    filter.js           ← button-driven multi-token CMS filter (blog / projects)
    accordion.js        · content-reveal.js · copy-clip.js · cursor-marquee.js
    draggable-marquee.js · hero-parallax.js · logo-wall.js · modal.js
    nav-over-hero.js    · parallax-slider.js · slider.js · social-share.js
    split-text.js       · tabs.js · toc.js · typeform.js · utilities.js
    video-hover.js
build.js                ← esbuild config
dist/
  index.min.js          ← bundled output (committed so jsDelivr can serve it)
CHANGELOG.md
```

Each module carries a detailed header comment describing its attribute API — read the file for the full contract.

---

## Deploy model

> **Note on history:** this bundle was briefly deployed via the Webflow **Scripts API** (a registered inline loader). When the site moved into Buff's Webflow workspace that API access was lost, so it was reverted to a **plain `<script>` embed** — which is also the cleaner setup for handover. The instructions below are the current, canonical setup.

The site loads the bundle with a single embed in **Site Settings → Custom Code → Footer Code**:

```html
<!-- Buff Bundle -->
<link rel="preload" href="https://cdn.jsdelivr.net/gh/shrinkstudio/buff-motion@main/dist/index.min.js" as="script">
<script src="https://cdn.jsdelivr.net/gh/shrinkstudio/buff-motion@main/dist/index.min.js" defer></script>
```

`@main` pulls the latest commit on the `main` branch of `shrinkstudio/buff-motion`. **Any commit to `main` reaches production within a few minutes** (jsDelivr cache TTL + the manual purge below). `defer` is required — the bundle runs top-level code that needs GSAP/Barba (which are also `defer`-loaded in the head) to exist first.

⚠️ **Do not run both this embed and any Webflow-registered "BuffBundleLoader" script at the same time** — that double-loads the bundle (two of every Lottie, double Barba init). There should be exactly one loader.

### Updating production

```bash
# 1. Make changes under src/scripts/
# 2. Build
npm run build

# 3. Commit + push (the built dist must be committed — jsDelivr serves it)
git add src/scripts dist/index.min.js
git commit -m "your message"
git push

# 4. Purge the jsDelivr cache
curl https://purge.jsdelivr.net/gh/shrinkstudio/buff-motion@main/dist/index.min.js
```

Hard-reload (Cmd+Shift+R) to bypass the browser/Webflow cache. The home intro only plays on a cold load, so use an incognito window to re-watch it.

### Vendoring for supply-chain isolation (recommended at handover)

`@main` is an unpinned, live source. For a stricter setup, pin to an immutable commit instead — replace `@main` with a commit SHA (e.g. `@375d6e7`) in the embed above. The bundle becomes frozen until you deliberately bump the SHA, so no upstream commit can change production unexpectedly. The `v1.0.0` tag marks the launch baseline; its `dist/index.min.js` SHA256 is recorded in `CHANGELOG.md`.

---

## Local development

```bash
npm install
npm run build     # one-time build
npm run watch     # rebuild on save (then push to update prod)
```

There's no local dev server bound to the Webflow site — local builds aren't loaded by buffmotion.com. For non-trivial work, push to a feature branch and temporarily point the embed at it (`@your-branch` instead of `@main`).

`build.js` runs esbuild with `bundle: true`, `format: 'iife'`, `target: 'es2020'`, `minify: true`. Output → `dist/index.min.js`, committed for jsDelivr.

---

## Webflow head dependencies

The bundle expects these globals before it runs. They're in the Webflow **Head Code**, all `defer` (so they execute in order, before the deferred footer bundle):

```html
<!-- Lenis CSS -->
<link rel="stylesheet" href="https://unpkg.com/lenis@1.3.17/dist/lenis.css" />

<!-- JS deps -->
<script src="https://cdn.jsdelivr.net/npm/@barba/core@2.10.3/dist/barba.umd.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/lenis@1.3.17/dist/lenis.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15/dist/gsap.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15/dist/ScrollTrigger.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15/dist/CustomEase.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/gsap@3.15/dist/Observer.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/lottie-web@5.12.2/build/player/lottie.min.js" defer></script>
<script src="https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js" defer></script>
<script src="https://unpkg.com/smooothy" defer></script>
```

(The Swiper CSS is also loaded for slider styling.) Custom **CSS** for the sidenav, home intro (FOUC guard), logo scroll-fade and link-hover lives in the Webflow Site/page custom code — it is **not** in this repo.

---

## Custom GSAP eases (registered in `transitions.js`)

| Name | Curve | Used for |
|---|---|---|
| `buff` | `cubic-bezier(0, 0.837, 0.2, 0.999)` | **Global default** ease (client-supplied "osmo" curve). Smooth fast-out. Nav, intro words, most tweens. |
| `energy` | `cubic-bezier(0.32, 0.72, 0, 1)` | Punchier secondary ease. |
| `panelIn` | `cubic-bezier(0.048, 0.465, 0.123, 0.989)` | Page-transition panel **cover** sweep. |
| `panelOut` | `cubic-bezier(1, 0, 0.831, 0.992)` | Page-transition panel **reveal** sweep. |

`gsap.defaults({ ease: "buff" })` — anything not overriding `ease` uses the `buff` curve. Lenis instance is exposed globally as `window.__buffMotionLenis`.

---

## Module reference

All modules are wired through `transitions.js` — destroyed in `initBeforeEnterFunctions()`, booted in `initAfterEnterFunctions()` behind a `has(...)` selector guard. Trigger attributes below are the entry points; see each file's header for the full API.

| Module | Trigger (approx) | What it does |
|---|---|---|
| `home-intro.js` | `[data-home-intro]` | First-load preloader. Words snap on + swipe up, squiggle Lottie, panel sweeps up to reveal hero. Dispatches `buff:home-intro-done`. |
| `sidenav.js` | `[data-sidenav-wrap]` | Underlay side-nav. Panel wipe, link reveal, button arrow Lottie (open/close), bg squiggle Lottie. |
| `lottie.js` | `[data-lottie]` | Scroll-triggered Lottie playback with `data-lottie-*` transforms/frames. Defers home-page init until the intro finishes. |
| `inline-video.js` | `video[data-video]` | Lazy-load, scroll-play, hover-play, play/pause + **mute** buttons (`[data-video-playback]`). |
| `filter.js` | `[data-filter-group]` | Button-driven multi-token CMS filter (blog & projects). |
| `accordion.js` | `[data-accordion]` | Accordion open/close. |
| `content-reveal.js` | `[data-reveal]` | Scroll-in content reveal. |
| `copy-clip.js` | `[data-copy="link"]` | Copy-to-clipboard (with message target). |
| `tabs.js` | `[data-tabs-component]` | Tabs UI. |
| `toc.js` | `[data-toc]` | Table of contents / scroll-spy. |
| `social-share.js` | `[data-social-share]` | Social share links. |
| `split-text.js` | `[data-split-text]` | Split-text reveal animations. |
| `slider.js` | `[data-slider]` | Swiper slider (data-attribute config). |
| `parallax-slider.js` | `[data-parallax-slider]` | Parallax slider. |
| `cursor-marquee.js` / `draggable-marquee.js` | marquee attrs | Cursor-follow / draggable marquees. |
| `hero-parallax.js` | hero attrs | Hero parallax. |
| `logo-wall.js` | logo-wall attrs | Logo wall animation. |
| `nav-over-hero.js` | `[data-nav-over-hero-trigger]` | Toggles `data-nav-over-hero` on body for nav legibility over the hero video. |
| `video-hover.js` | hover attrs | Hover-to-play video. |
| `modal.js` | `<dialog>` | Modal dialogs (event delegation). |
| `typeform.js` | `[data-typeform]` | Typeform embed. |
| `utilities.js` | misc | Footer year, skip link, font-size detect, etc. |

---

## Lifecycle

Barba.js manages SPA-style content swaps (`sync: true`) so the bundle doesn't reparse per navigation and Lenis stays warm.

1. **First load** (Barba `once`) → `initOnceFunctions()` — Lenis, the transition Lottie, document-level delegation, and the **home intro** (only when `[data-home-intro]` is present).
2. **Before next page** (`beforeEnter`) → `initBeforeEnterFunctions()` — destroys current-page module instances. (Sidenav destroy is deferred to afterEnter so the menu close happens invisibly behind the transition panel.)
3. **After new page** (`afterEnter`) → `initAfterEnterFunctions()` — boots each module behind a `has(...)` guard, resizes Lenis, refreshes ScrollTrigger.

**Page transition:** flat blue panel sweeps up to cover (panelIn), a squiggle Lottie draws across it, the panel sweeps out to reveal (panelOut) while the new page rises into place. Lives in `runPageLeaveAnimation` / `runPageEnterAnimation` (`transitions.js`).

---

## Adding a new module

1. Create `src/scripts/your-feature.js` with `initYourFeature(scope)` + `destroyYourFeature()` named exports (`scope` is the page container).
2. `import` it in `transitions.js`.
3. Call `destroyYourFeature()` in `initBeforeEnterFunctions()`.
4. Call `if (has('[data-your-feature]')) initYourFeature(nextPage);` in `initAfterEnterFunctions()`.
5. `npm run build`, commit, push, purge.

---

## Watch out for

- **`@main` is live** — any push to `main` becomes production within minutes. Use a feature branch + `@branch-name` for non-trivial work, or pin the embed to a commit SHA for a frozen handover.
- **Webflow service worker** caches bundles aggressively. If a deploy doesn't show after push + purge, suspect Webflow's `sw.js` first: DevTools → Application → Service Workers → unregister, then hard-reload.
- **Never double-load** — one bundle loader only (see the deploy warning above).
- **Lottie sizing on CMS templates** — decorative squiggles are `position:absolute; width/height:100%` of their column, so their rendered size tracks each project's content height. Give them a fixed/`aspect-ratio` size to keep them consistent. Lottie strokes thicker than ~10% of the canvas also render with artifacts ("round caps", flicker) in lottie-web's **SVG** renderer during trim-path draw-on — fix by thinning/outlining the stroke on re-export (canvas renderer isn't an option because the squiggles are CSS-scaled).
- **Home intro plays on all viewports.** Its `[data-home-intro]` panel sits OUTSIDE the Barba container; it's removed on completion (first load) and stays gone on SPA returns. Removing the `@media (max-width:767px){[data-home-intro]{display:none}}` rule from the head custom code is what re-enabled mobile.
- **Reduced motion** short-circuits the intro and most heavy motion.

---

## License

All rights reserved. Built by [Shrink Studio](https://shrink.studio) for Buff Motion.
