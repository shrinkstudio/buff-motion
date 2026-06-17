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
      ? parseInt(arrowEl.getAttribute("data-lottie-frame") || "85", 10)
      : 85;
    arrowLottie.goToAndStop(closed, true);
  }
  if (bgLottie && typeof bgLottie.goToAndStop === "function") {
    // Mobile keeps the squiggle static-drawn (last frame); desktop resets to 0.
    const mobileStatic = window.matchMedia("(max-width: 991px)").matches;
    bgLottie.goToAndStop(mobileStatic ? bgLottie.totalFrames : 0, true);
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

export function initSidenav(scope) {
  scope = scope || document;
  // Sidenav often lives in a global header outside the Barba container, so a
  // scope-limited query misses it after navigation. Fall back to document.
  navWrap = scope.querySelector("[data-sidenav-wrap]") || document.querySelector("[data-sidenav-wrap]");
  if (!navWrap) return;

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
  const closedFrame = arrowLottieEl
    ? parseInt(arrowLottieEl.getAttribute("data-lottie-frame") || "85", 10)
    : 85;
  const openFrame = arrowLottieEl
    ? parseInt(arrowLottieEl.getAttribute("data-lottie-open-frame") || "60", 10)
    : 60;
  arrowLottie = loadNavLottie(arrowLottieEl);
  if (arrowLottie) {
    arrowLottie.addEventListener("DOMLoaded", () => arrowLottie.goToAndStop(closedFrame, true));
  }

  // Mobile: the bg squiggle Lottie is the heaviest per-frame render in the nav
  // (animated SVG path drawing). On mobile we make it STATIC — show it fully
  // drawn at its last frame but never run the per-frame draw-on. Takes weight
  // out of the menu open/close and reduces jank on lower-spec mobile CPUs.
  // Checked live (not cached) so a desktop→mobile resize is honoured.
  const bgLottieStatic = () => window.matchMedia("(max-width: 991px)").matches;

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
      }, null, 0.6)
      // Phase 3 (~0.55s onwards): items animate in on top of the drawing squiggle.
      // Stagger reduced (0.08→0.05) — same visual feel, finishes ~0.2s sooner so
      // the whole open animation completes in a tighter window.
      .fromTo(menuLinks,
        { yPercent: 120, autoAlpha: 0 },
        { yPercent: 0, autoAlpha: 1, stagger: 0.05, duration: 0.9 },
        0.55)
      .fromTo(fadeTargets,
        { autoAlpha: 0, yPercent: 30 },
        { autoAlpha: 1, yPercent: 0, stagger: 0.025, duration: 0.6 },
        0.8);

    // Arrow Lottie plays at t=0 — must react instantly to the click, not delayed.
    if (arrowLottie) {
      tl.call(() => {
        arrowLottie.playSegments([arrowLottie.currentFrame, openFrame], true);
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
      // Whole menu container slides off — carries panels, bg Lottie, everything
      .to(menu, { xPercent: 120, duration: 0.7 }, 0.05)
      // Overlay fades + button label resets alongside the slide
      .to(overlay, { autoAlpha: 0, duration: 0.5 }, 0.1)
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

    // Arrow Lottie: play current frame → closedFrame (60 → 85), i.e. X rotating
    // back to the straight arrow. This stays inside the no-slide zone (47–90),
    // so there's no sideways kick, and it ENDS exactly on the rest frame (85) —
    // no re-arm/reset needed (the old approach played to 90 then snapped back
    // to 30, and earlier still it reversed through the wind-up — both were the
    // "snap"). playSegments from currentFrame handles a mid-open interruption.
    if (arrowLottie) {
      tl.call(() => {
        arrowLottie.playSegments([arrowLottie.currentFrame, closedFrame], true);
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
