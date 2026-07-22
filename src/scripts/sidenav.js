// -----------------------------------------
// SIDENAV — wipe-effect side navigation (Osmo Supply port)
// Slides menu in from the right with staggered colored panels,
// button label/icon morph, and staggered link + fade-in details.
// -----------------------------------------
// Attributes:
//   [data-sidenav-wrap]     — outer wrapper. State stored on [data-nav-state="open|closed"].
//   [data-sidenav-toggle]   — any element that opens/closes the nav (button, overlay, etc.)
//   [data-sidenav-overlay]  — dim overlay behind the menu (also typically a toggle)
//   [data-sidenav-menu]     — sliding menu container (animated horizontally)
//   [data-sidenav-panel]    — colored backdrop panels (staggered wipe in)
//   [data-sidenav-link]     — menu links (stagger up + un-rotate)
//   [data-sidenav-fade]     — secondary fade-in targets (socials, labels)
//   [data-sidenav-button]   — the toggle button containing label + icon
//   [data-sidenav-label]    — the button labels (Menu/Close — vertical swap, optional)
//   [data-sidenav-icon]     — the button icon (rotates on open — only if no Lottie present)
//   [data-nav-lottie-arrow] + [data-lottie-src]  — optional Lottie arrow inside the button.
//                                                  Holds at the configured closed frame, plays to the open
//                                                  frame on open, and back on close.
//   [data-nav-lottie-bg]    + [data-lottie-src]  — optional background Lottie inside the menu.
//                                                  Plays from frame 0 every time the menu opens.

let tl = null;
let navWrap = null;
let toggleHandlers = [];
let keyHandler = null;
let arrowLottie = null;
let preloadedArrow = null;
let bgLottie = null;

// Resets all sidenav DOM state to a clean closed baseline. Called at the
// start of init (in case stale state survives a Barba container swap, eg the
// user clicked a sidenav link mid-open) and inside destroy.
//
// Why: when the user navigates while the nav is open, destroy.kill() halts
// the open timeline but doesn't revert the inline transforms GSAP applied —
// so overlay/panels/labels stay frozen at their mid-open positions on the
// next page, the burger gets z-stacked underneath them, body still carries
// data-menu-status="open" (Lenis stays stopped), and clicking the burger
// reads "open" → triggers close on an already-stale state.
function resetSidenavState() {
  // Query the whole document — sidenav often lives in a global header
  // outside the Barba container, so scope-limited queries miss it after
  // a transition.
  const wrap = document.querySelector("[data-sidenav-wrap]");
  if (wrap) {
    wrap.setAttribute("data-nav-state", "closed");
    const targets = [
      wrap,
      wrap.querySelector("[data-sidenav-overlay]"),
      wrap.querySelector("[data-sidenav-menu]"),
      ...wrap.querySelectorAll("[data-sidenav-panel]"),
      ...wrap.querySelectorAll("[data-sidenav-link]"),
      ...wrap.querySelectorAll("[data-sidenav-fade]"),
    ].filter(Boolean);
    if (targets.length) gsap.set(targets, { clearProps: "all" });
    // Ensure the wrap itself is hidden again (its CSS may rely on display:none
    // for closed state).
    gsap.set(wrap, { display: "none" });
  }

  const button = document.querySelector("[data-sidenav-button]");
  if (button) {
    const targets = [
      button,
      ...button.querySelectorAll("[data-sidenav-label]"),
      button.querySelector("[data-sidenav-icon]"),
    ].filter(Boolean);
    if (targets.length) gsap.set(targets, { clearProps: "all" });
  }

  document.body.setAttribute("data-menu-status", "");
  if (window.__buffMotionLenis && typeof window.__buffMotionLenis.start === "function") {
    window.__buffMotionLenis.start();
  }

  // Recover any stuck Lottie playheads from a prior toggle that was killed
  // mid-animation (Barba transition, rapid double-click, etc). Without this
  // the arrow can land "pointing up-right" — its frame-60 X pose — and stay
  // there because the close's playSegments never reached its target. Reading
  // the closed frame off the live attribute keeps this in sync with any
  // override the user has set in Webflow.
  if (arrowLottie && typeof arrowLottie.goToAndStop === "function") {
    const arrowEl = document.querySelector("[data-nav-lottie-arrow]");
    const closed = arrowEl
      ? parseFloat(arrowEl.getAttribute("data-lottie-frame") || "31.5")
      : 31.5;
    arrowLottie.goToAndStop(closed, true);
  }
  if (bgLottie && typeof bgLottie.goToAndStop === "function") {
    // Reset to frame 0 (un-drawn) on every viewport — the squiggle now draws on
    // each open across all breakpoints (mobile included).
    bgLottie.goToAndStop(0, true);
  }
}

function loadNavLottie(container) {
  if (!container || typeof lottie === "undefined") return null;
  const src = container.getAttribute("data-lottie-src") || container.getAttribute("data-src");
  if (!src) return null;
  return lottie.loadAnimation({
    container,
    renderer: "svg",
    loop: false,
    autoplay: false,
    path: src,
  });
}

// Pre-render the nav arrow at its resting frame DURING the transition cover
// (called from beforeEnter), so it's present in the button as the page reveals
// and rises WITH the page — the logo does this natively because it's an inline
// SVG; the arrow is an async Lottie, so without this it only draws in afterEnter
// (after the reveal) and pops in. Held in a SEPARATE var so the afterEnter
// destroy (which kills the OLD page's arrowLottie) doesn't touch this incoming
// one; initSidenav then ADOPTS it instead of re-loading (a reload would clear
// the button and pop the arrow in again).
export function preloadNavArrow(scope) {
  scope = scope || document;
  const arrowEl = scope.querySelector("[data-nav-lottie-arrow]") || document.querySelector("[data-nav-lottie-arrow]");
  if (!arrowEl) return;
  if (arrowLottie && arrowLottie.__navArrowEl === arrowEl) return;      // already the active one
  if (preloadedArrow && preloadedArrow.__navArrowEl === arrowEl) return; // already queued
  if (preloadedArrow) { try { preloadedArrow.destroy(); } catch (e) {} preloadedArrow = null; }
  const anim = loadNavLottie(arrowEl);
  if (!anim) return;
  anim.__navArrowEl = arrowEl;
  const closedFrame = parseFloat(arrowEl.getAttribute("data-lottie-frame") || "31.5");
  anim.addEventListener("DOMLoaded", () => anim.goToAndStop(closedFrame, true));
  preloadedArrow = anim;
}

// NO MASK (major client ask). Each [sidenav__menu-list-item] ships with
// overflow:hidden from Webflow — that clip is the "mask" the links were revealed
// from behind. Override it to visible so the snap-on + lift-up reveal is fully
// unmasked. Injected from the bundle so it's guaranteed regardless of Webflow
// state. Skipped in the Designer so editing still behaves normally.
function injectSidenavCSS() {
  if (typeof document === "undefined") return;
  if (document.getElementById("sidenav-no-mask")) return;
  const style = document.createElement("style");
  style.id = "sidenav-no-mask";
  style.textContent = `
    html:not(.wf-design-mode) .sidenav__menu-list-item { overflow: visible !important; }
  `;
  document.head.appendChild(style);
}

export function initSidenav(scope) {
  scope = scope || document;
  // Sidenav often lives in a global header outside the Barba container, so a
  // scope-limited query misses it after navigation. Fall back to document.
  navWrap = scope.querySelector("[data-sidenav-wrap]") || document.querySelector("[data-sidenav-wrap]");
  if (!navWrap) return;

  injectSidenavCSS();

  // Idempotency guard — remove any handlers a PREVIOUS init left bound before
  // binding fresh. On first page load Barba fires initSidenav from BOTH the
  // `once` hook and `afterEnter`, so without this every toggle element ends up
  // with two click listeners and a single click runs toggle() twice
  // (open → close → open). That's the "click to close just reopens it" bug.
  // Cheap no-op when there's nothing bound yet.
  toggleHandlers.forEach(({ el, handler }) => el.removeEventListener("click", handler));
  toggleHandlers = [];
  if (keyHandler) {
    document.removeEventListener("keydown", keyHandler);
    keyHandler = null;
  }

  // Force a clean closed baseline before binding handlers. If the user
  // navigated mid-open, the DOM still carries stale GSAP transforms from
  // the killed open timeline — wiping them here means the first click on
  // the new page reads "closed" and runs openNav correctly.
  resetSidenavState();

  // The "buff" ease is registered globally in transitions.js (cubic-bezier(.76, .007, .25, 1)).
  // Used throughout the sidenav timeline below.

  const overlay = navWrap.querySelector("[data-sidenav-overlay]");
  const menu = navWrap.querySelector("[data-sidenav-menu]");
  const bgPanels = navWrap.querySelectorAll("[data-sidenav-panel]");
  const menuToggles = document.querySelectorAll("[data-sidenav-toggle]");
  const menuLinks = navWrap.querySelectorAll("[data-sidenav-link]");
  const fadeTargets = navWrap.querySelectorAll("[data-sidenav-fade]");
  const menuButton = document.querySelector("[data-sidenav-button]");
  const menuButtonTexts = menuButton ? menuButton.querySelectorAll("[data-sidenav-label]") : [];
  const menuButtonIcon = menuButton ? menuButton.querySelector("[data-sidenav-icon]") : null;
  const arrowLottieEl = document.querySelector("[data-nav-lottie-arrow]");

  // Load arrow Lottie + hold at the configured "closed" frame.
  //
  // buff_menu_arrow_black.json (0–90 @ 30fps) frame map:
  //   26–32  straight ↗   (rot 0°, pos 0,0)
  //   32–47  WIND-UP — the arrow slides sideways (~140u) and back. This is the
  //          baked-in "snap" the client kept feeling.
  //   47–60  rotate into the X
  //   60–65  hold X
  //   65–85  rotate back to straight (small ±4–5° overshoot)
  //   85–90  straight ↗ again (rot 0°, pos 0,0 — identical pose to 30)
  //
  // KEY: frames 47–90 have ZERO positional movement — pure rotation. So we rest
  // at 85 (the post-rotation straight pose) and toggle between 60 ↔ 85, which
  // stays entirely inside the no-slide zone. The wind-up (32–47) never plays in
  // either direction, so there's no sideways kick.
  //   85 — straight ↗ at rest (closed)   ← was 30, which sat just BEFORE the wind-up
  //   60 — X / close icon (open)
  //
  // Open  plays 85 → 60 (rotate to X, no slide). Close plays 60 → 85 (rotate
  // back, no slide) and ENDS at the rest frame, so no re-arm/reset is needed.
  //
  // NOTE: a small ±4–5° rotation overshoot is still baked into 65–85; no
  // playback removes it — only a clean re-export of the Lottie would. The
  // big sideways snap, however, is gone.
  //
  // Override per-element via:
  //   [data-lottie-frame="N"]       — closed/resting frame (default 85)
  //   [data-lottie-open-frame="N"]  — open/active frame (default 60)
  // Client-specified cadence (from the Webflow Lottie scrub):
  //   closed / resting = frame 31.5 (35% of 90)
  //   open / active    = frame 63   (70% of 90)
  //   open plays 31.5 → 63 in 0.9s
  // parseFloat — 31.5 is fractional.
  const closedFrame = arrowLottieEl
    ? parseFloat(arrowLottieEl.getAttribute("data-lottie-frame") || "31.5")
    : 31.5;
  const openFrame = arrowLottieEl
    ? parseFloat(arrowLottieEl.getAttribute("data-lottie-open-frame") || "63")
    : 63;
  // CLOSE settles to frame 90, NOT back down to 31.5. Closing 63→31.5 reverses
  // through the 32–47 wind-up (the sideways "moves forward" kick the client
  // flagged). Frames 47–90 are pure rotation (no slide), so 63→90 rotates the X
  // neatly back to a straight arrow with no sideways move. Frame 90 is the same
  // visual pose as 31.5 (both rot 0°, pos 0,0), so the next open's playSegments
  // jumps 90→31.5 invisibly before the flourish — no re-arm needed.
  const settleFrame = arrowLottieEl
    ? parseFloat(arrowLottieEl.getAttribute("data-lottie-settle-frame") || "90")
    : 90;
  // Adopt the arrow pre-rendered in beforeEnter (already showing the resting
  // frame, so it rose in WITH the page) rather than re-loading — a reload clears
  // the button and pops the arrow in again after the reveal. Falls back to a
  // fresh load when no preload ran (e.g. a direct first paint).
  if (preloadedArrow && preloadedArrow.__navArrowEl === arrowLottieEl) {
    arrowLottie = preloadedArrow;
    preloadedArrow = null;
  } else {
    if (preloadedArrow) { try { preloadedArrow.destroy(); } catch (e) {} preloadedArrow = null; }
    arrowLottie = loadNavLottie(arrowLottieEl);
    if (arrowLottie) arrowLottie.__navArrowEl = arrowLottieEl;
  }
  if (arrowLottie) {
    // Drive playback so 31.5 → 63 takes 0.9s. Lottie is 90f @ 30fps; playSegments
    // runs at native fps, so set speed = segmentFrames / (duration * fps) to hit
    // the client's 0.9s. Linear playback (matches the IX2 "Linear (None)" easing).
    const NATIVE_FPS = 30, OPEN_DURATION = 0.9;
    const arrowSpeed = Math.abs(openFrame - closedFrame) / (OPEN_DURATION * NATIVE_FPS);
    const applyRest = () => {
      arrowLottie.setSpeed(arrowSpeed);
      arrowLottie.goToAndStop(closedFrame, true);
    };
    // A preloaded arrow may already be loaded (DOMLoaded won't fire again) — apply now.
    if (arrowLottie.isLoaded) applyRest();
    else arrowLottie.addEventListener("DOMLoaded", applyRest);
  }

  // The bg squiggle Lottie now ANIMATES on every viewport (client reinstated it
  // on mobile — "turn back on the lottie, smooth af"). It used to be static below
  // 991px to save the per-frame SVG draw on lower-spec CPUs; if mobile jank shows
  // up, flip this back to a matchMedia("(max-width: 991px)") check.
  const bgLottieStatic = () => false;

  // Background Lottie inside the menu — desktop: held at frame 0 until the menu
  // opens (then draws on). Mobile: snapped to the last frame (fully drawn, static).
  const bgLottieEl = document.querySelector("[data-nav-lottie-bg]");
  bgLottie = loadNavLottie(bgLottieEl);
  if (bgLottie) {
    bgLottie.addEventListener("DOMLoaded", () => {
      bgLottie.goToAndStop(bgLottieStatic() ? bgLottie.totalFrames : 0, true);
    });
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const setBodyState = (open) => {
    document.body.setAttribute("data-menu-status", open ? "open" : "");
  };

  // Build a fresh timeline on every toggle so the playhead can't get stranded past the
  // new tweens' duration when we clear() + re-chain (the bug behind "close does nothing").
  const buildTimeline = () => {
    if (tl) tl.kill();
    tl = gsap.timeline({ defaults: { ease: "buff", duration: 0.9 } });
    return tl;
  };

  const openNav = () => {
    navWrap.setAttribute("data-nav-state", "open");
    setBodyState(true);
    if (window.__buffMotionLenis) window.__buffMotionLenis.stop();

    buildTimeline();

    if (reducedMotion) {
      tl.set(navWrap, { display: "block", autoAlpha: 1 });
      return;
    }

    tl.set(navWrap, { display: "block" })
      .set(menu, { xPercent: 0 }, "<")
      // Phase 1 (0 — ~0.55s): panels wipe in fast, overlay dims, button label flips.
      // Tighter staggers than before (0.05→0.03, 0.06→0.04) — same visual rhythm
      // but a shorter "busy window" so frame drops have less time to compound.
      .fromTo(overlay, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.45 }, 0)
      .fromTo(menuButtonTexts, { yPercent: 0 }, { yPercent: -100, stagger: 0.03, duration: 0.45 }, 0)
      .fromTo(bgPanels, { xPercent: 101 }, { xPercent: 0, stagger: 0.04, duration: 0.55 }, 0)
      // Phase 2: bg squiggle starts AFTER the panels have settled (0.6s, was 0.5s).
      // Deferring by 100ms separates the SVG render cost from the link/fade
      // stagger that kicks in at 0.55s — stops the t=0.5s GPU/CPU spike where
      // panels finish + bg Lottie starts + links begin all happen in one frame.
      // Mobile: bg squiggle is static (already drawn at last frame) — skip the
      // play entirely so there's no per-frame render during the open.
      .call(() => {
        if (!bgLottie) return;
        if (bgLottieStatic()) {
          bgLottie.goToAndStop(bgLottie.totalFrames, true);
        } else {
          bgLottie.goToAndPlay(0, true);
        }
      }, null, 0.45)
      // Phase 3 (~0.2s onwards): links come in ONE AT A TIME — each SNAPS on at
      // full opacity (no fade) then LIFTS up into place. CRITICAL client ask: NO
      // MASK. The [sidenav__menu-list-item] overflow:hidden clip is overridden to
      // visible (see injectSidenavCSS), so the link is fully visible the whole
      // lift — nothing is revealed from behind a clip. Opacity snaps per link
      // (duration ~0) while a small y-lift carries the motion; both share the
      // stagger so each link pops + lifts as a unit.
      // Pulled in further → 0.2 (client wanted everything ever so slightly earlier;
      // was 0.55, then 0.3) so the links start right as the panels begin wiping in.
      .set(menuLinks, { y: 45, autoAlpha: 0 }, 0)
      .to(menuLinks, { autoAlpha: 1, duration: 0.001, stagger: 0.08 }, 0.2)
      .to(menuLinks, { y: 0, duration: 0.5, ease: "buff", stagger: 0.08 }, 0.2)
      .fromTo(fadeTargets,
        { autoAlpha: 0, yPercent: 30 },
        { autoAlpha: 1, yPercent: 0, stagger: 0.025, duration: 0.6 },
        0.45);

    // Arrow Lottie plays at t=0 — must react instantly to the click, not delayed.
    // EXPLICIT absolute frames [closedFrame, openFrame] = 31.5 → 63. Do NOT use
    // arrowLottie.currentFrame — lottie reports it relative to the active segment,
    // so it read ~0 and the arrow jumped to the very start before the real move.
    if (arrowLottie) {
      tl.call(() => {
        arrowLottie.playSegments([closedFrame, openFrame], true);
      }, null, 0);
    } else if (menuButtonIcon) {
      tl.fromTo(menuButtonIcon, { rotate: 0 }, { rotate: 315 }, 0);
    }
  };

  const closeNav = () => {
    navWrap.setAttribute("data-nav-state", "closed");
    setBodyState(false);
    if (window.__buffMotionLenis) window.__buffMotionLenis.start();

    buildTimeline();

    if (reducedMotion) {
      tl.set(navWrap, { display: "none" });
      return;
    }

    tl
      // Inner content drops out fast so nothing trails as the menu slides
      .to([menuLinks, fadeTargets], { autoAlpha: 0, duration: 0.25 }, 0)
      // Whole menu container slides off — carries panels, bg Lottie, everything.
      // EASE: deliberately NOT the global "buff" default. buff is now the intro
      // curve (aggressive ease-out — ~85% of travel in the first instant), which
      // on a full-panel slide-off lurches then lingers — the "quick/glitchy"
      // minimise the client flagged. power2.inOut accelerates + decelerates
      // smoothly so it reads as a graceful minimise. (Item motion still uses buff.)
      .to(menu, { xPercent: 120, duration: 0.8, ease: "power2.inOut" }, 0.05)
      // Overlay fades + button label resets alongside the slide
      .to(overlay, { autoAlpha: 0, duration: 0.55 }, 0.1)
      .to(menuButtonTexts, { yPercent: 0, duration: 0.45 }, 0.05)
      // Hide wrap once it's all cleared, then reset panels off-screen ready for the next open's wipe-in
      .set(navWrap, { display: "none" })
      .set(bgPanels, { xPercent: 101 })
      // Reset the bg squiggle to frame 0 + wipe any inline transforms on the
      // menu inner content. Two perf-and-correctness wins in one call:
      //   1. The bg Lottie was burning SVG render cycles inside the hidden
      //      menu container until the next open re-triggered goToAndPlay(0).
      //      Resetting here stops that idle render churn and guarantees a
      //      clean playhead for the next open.
      //   2. GSAP's kill() on the timeline (when the user toggles mid-anim)
      //      halts tweens but does NOT clear inline transforms — so the next
      //      open's fromTo() would land on a non-baseline start state,
      //      causing the "glitchy" snap into the open animation. clearProps
      //      wipes the slate.
      .call(() => {
        if (!bgLottie) return;
        // Mobile: keep it parked at the last frame (static-drawn) ready for the
        // next open. Desktop: reset to frame 0 so the next open draws on fresh.
        bgLottie.goToAndStop(bgLottieStatic() ? bgLottie.totalFrames : 0, true);
      })
      .set([menuLinks, fadeTargets], { clearProps: "all" });

    // Arrow Lottie close: rotate the X NEATLY back to a straight arrow (client:
    // "rotate neatly back to OG, doesn't need to move forwards as much"). EXPLICIT
    // absolute frames [openFrame, settleFrame] = 63 → 90, which stays inside the
    // 47–90 no-slide zone — pure rotation, no sideways wind-up. Do NOT use
    // arrowLottie.currentFrame (it reads relative to the active segment).
    if (arrowLottie) {
      tl.call(() => {
        arrowLottie.playSegments([openFrame, settleFrame], true);
      }, null, 0);
    } else if (menuButtonIcon) {
      tl.to(menuButtonIcon, { rotate: 0 }, 0);
    }
  };

  const toggle = () => {
    const state = navWrap.getAttribute("data-nav-state");
    if (state === "open") closeNav();
    else openNav();
  };

  menuToggles.forEach((el) => {
    el.addEventListener("click", toggle);
    toggleHandlers.push({ el, handler: toggle });
  });

  // (Hover nudge removed — it fought the close: leaving the button mid-close
  // fired a mouseleave that interrupted the 63→31.5 play and snapped. Hover is
  // being handled separately in the Webflow Designer.)

  keyHandler = (e) => {
    if (e.key === "Escape" && navWrap.getAttribute("data-nav-state") === "open") {
      closeNav();
    }
  };
  document.addEventListener("keydown", keyHandler);
}

export function destroySidenav() {
  toggleHandlers.forEach(({ el, handler }) => el.removeEventListener("click", handler));
  toggleHandlers = [];
  if (keyHandler) document.removeEventListener("keydown", keyHandler);
  keyHandler = null;

  // Kill any in-flight open/close timeline so a half-played playhead doesn't
  // get stranded across the Barba container swap.
  if (tl) {
    tl.kill();
    tl = null;
  }

  // Unconditional state reset — clears inline GSAP transforms, hides the wrap,
  // resets data-nav-state, restarts Lenis. Covers the mid-open-navigation case
  // (where the body still carries data-menu-status="open") AND the all-closed
  // case (cheap no-op).
  resetSidenavState();

  if (arrowLottie) {
    arrowLottie.destroy();
    arrowLottie = null;
  }
  if (bgLottie) {
    bgLottie.destroy();
    bgLottie = null;
  }
  navWrap = null;
}
