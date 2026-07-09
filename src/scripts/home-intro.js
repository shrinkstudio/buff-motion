// -----------------------------------------
// HOME INTRO — first-page-load preloader animation
// Three-word headline snaps on + swipes up (Hey, we're Buff), Lottie flourish
// draws underneath "Buff", panel slides up off-screen, hero video plays.
// Fires from the Barba `once` hook only — never re-plays on SPA transitions.
// -----------------------------------------
// Attributes:
//   [data-home-intro]              — root panel (full-screen overlay)
//   [data-home-intro-item]         — each word wrapper in the headline (rises in with stagger)
//   [data-home-intro-lottie]       — squiggle Lottie container, paired with [data-lottie-src]
//   [data-home-hero-video]         — wrapper containing the 100svh hero <video> to play on exit
//
// Lottie playback frames (overridable on the Lottie element):
//   [data-lottie-frame]            — initial hold frame (default 0)
//   [data-lottie-end-frame]        — last frame to play to (default = Lottie's totalFrames)
//
// Cadence (V2 — client easing pass: opacity snaps, words swipe up quicker):
//   0.20s — "Hey," snaps on + swipes up (y:15 → 0, 0.5s, buff ease)
//   0.30s — "we're" snaps + swipes (0.10s stagger)
//   0.40s — "Buff" snaps + swipes (0.10s stagger)
//   0.70s — Squiggle Lottie plays its draw-on
//   2.50s — EXIT: panel sweeps up (0.8s, panelOut) carrying the words, which
//           ride up + slightly fade as one unit; page content rises in sync
//   3.30s — Done, hero video plays
//   (Plays on all viewports — desktop, tablet AND mobile.)

let tl = null;
let lottieAnim = null;
let hasPlayed = false;

// FOUC fallback — hides intro items immediately on bundle load.
// Best practice is to ALSO add this rule to the Home page's <head> custom code
// so it's in place before HTML parsing finishes.
(function injectHomeIntroCSS() {
  if (typeof document === "undefined") return;
  if (document.getElementById("home-intro-defaults")) return;
  const style = document.createElement("style");
  style.id = "home-intro-defaults";
  style.textContent = `
    html:not(.wf-design-mode) [data-home-intro-item] {
      opacity: 0;
      visibility: hidden;
    }
    /* SPA return to Home: the <body> keeps data-home-intro-status="done" across
       Barba navigations (body is never swapped), so any freshly-injected intro
       panel / hero-video is hidden from the FIRST frame. The page-rise then
       reveals clean content, instead of showing them and ripping them out in
       afterEnter (the "load, then reload" jump the client flagged). First load
       is unaffected — status isn't "done" until the intro has finished. */
    html:not(.wf-design-mode) body[data-home-intro-status="done"] [data-home-intro],
    html:not(.wf-design-mode) body[data-home-intro-status="done"] [data-home-hero-video] {
      display: none !important;
    }
  `;
  document.head.appendChild(style);
})();

// SPA navigation back to Home — skip both the intro AND the hero video section.
// The hero video is a first-impression-only piece; returning visitors land directly
// on the main content below it ("We're a motion-first…").
function dismissInstantly(root) {
  root.remove();
  document.body.setAttribute("data-home-intro-status", "done");

  // Hide the hero video section so the page starts at the next section
  const videoWrap = document.querySelector("[data-home-hero-video]");
  if (videoWrap) {
    const videoEl = videoWrap.querySelector("video");
    if (videoEl) {
      videoEl.pause();
      try { videoEl.currentTime = 0; } catch (_) {}
    }
    videoWrap.style.display = "none";
  }
}

function loadIntroLottie(container) {
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

export function initHomeIntro(scope) {
  scope = scope || document;
  const root = scope.querySelector("[data-home-intro]");
  if (!root) return;

  if (hasPlayed) {
    // Already played on first load — user is SPA-navigating back to Home.
    // Skip the intro and just reveal the page.
    dismissInstantly(root);
    return;
  }
  hasPlayed = true;

  const items = root.querySelectorAll("[data-home-intro-item]");
  const lottieEl = root.querySelector("[data-home-intro-lottie]");
  const videoWrap = document.querySelector("[data-home-hero-video]");
  const videoEl = videoWrap ? videoWrap.querySelector("video") : null;
  // Target the Barba container for the site-load rise — same element that
  // page transitions tween (runPageEnterAnimation → tl.from(next, {y:"15dvh"})).
  // Falls back to body so the rise still happens if Barba's markup is missing.
  const pageContent = document.querySelector('[data-barba="container"]') || document.body;

  // Intro now plays on ALL viewports (client reinstated it on tablet/mobile).
  // The panel is display:flex / position:fixed / inset:0 at every breakpoint
  // (no CSS hide), so the same desktop sequence below runs everywhere. Only a
  // reduced-motion preference still short-circuits it.
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Pause the hero video on load so it doesn't burn cycles behind the preloader
  if (videoEl) {
    videoEl.pause();
    try { videoEl.currentTime = 0; } catch (_) {}
  }

  // Halt smooth scroll while preloader covers the page
  if (window.__buffMotionLenis) window.__buffMotionLenis.stop();
  document.body.setAttribute("data-home-intro-status", "playing");

  // Lock scroll position visually so a fast-loading page doesn't jump
  // behind the panel before the slide-up reveals it.
  const lockScroll = () => {
    document.documentElement.style.overflow = "hidden";
    document.body.style.overflow = "hidden";
  };
  const unlockScroll = () => {
    document.documentElement.style.overflow = "";
    document.body.style.overflow = "";
  };
  lockScroll();

  // Load Lottie (autoplay off — timeline triggers it)
  lottieAnim = loadIntroLottie(lottieEl);
  const startFrame = lottieEl ? parseInt(lottieEl.getAttribute("data-lottie-frame") || "0", 10) : 0;
  if (lottieAnim) {
    lottieAnim.addEventListener("DOMLoaded", () => lottieAnim.goToAndStop(startFrame, true));
  }

  // Build the timeline — buff easing throughout, ~3s total
  tl = gsap.timeline({
    defaults: { ease: "buff", duration: 0.6 },
    onComplete() {
      // Cleanup once the panel is fully off-screen — remove from DOM entirely.
      // First-load only, never replays, so no reason to keep the markup around.
      // (Also kills any future paint / accessibility-tree cost from the hidden panel.)
      if (lottieAnim) {
        lottieAnim.destroy();
        lottieAnim = null;
      }
      root.remove();
      // Clear the inline transform left by Phase 5's rise so the page content
      // is in a clean baseline state — matches resetPage() in transitions.js,
      // which clears the same props after a page-enter rise completes.
      gsap.set(pageContent, { clearProps: "y,transform,translate" });
      unlockScroll();
      if (window.__buffMotionLenis) window.__buffMotionLenis.start();
      document.body.setAttribute("data-home-intro-status", "done");
      // Kick off the hero video at the moment of reveal
      if (videoEl) {
        const playPromise = videoEl.play();
        if (playPromise && typeof playPromise.catch === "function") playPromise.catch(() => {});
      }
      // Dispatch a custom event so other modules can hook in
      document.dispatchEvent(new CustomEvent("buff:home-intro-done"));
    },
  });

  if (reducedMotion) {
    // No animation — just dismiss the panel and reveal the video
    tl.set(root, { autoAlpha: 0 });
    return;
  }

  // Phase 1: panel visible, items start hidden + nudged down 15px (V1's exact translate value).
  // autoAlpha 0 keeps them invisible until each word snaps on in Phase 2 — never a fade.
  tl.set(root, { autoAlpha: 1, yPercent: 0 });
  tl.set(items, { y: 15, autoAlpha: 0 });

  // Phase 2: words snap on at full opacity, then swipe up into place. Per client
  // feedback the opacity must NOT fade ("snap on at 100% opacity") and the gap
  // between words must be much shorter ("old motion is much quicker between the
  // words"). So opacity snaps per word (duration ~0, staggered) while the y swipe
  // — on the new "buff" curve — carries the visible motion. No mask, no fade.
  //   stagger 0.32 → 0.10, duration 0.75 → 0.5
  //   "Hey,"  snaps 0.20, lands 0.70
  //   "we're" snaps 0.30, lands 0.80
  //   "Buff"  snaps 0.40, lands 0.90
  const wordStagger = 0.1;
  tl.to(items, { autoAlpha: 1, duration: 0.001, stagger: wordStagger }, 0.2);
  tl.to(items, { y: 0, duration: 0.5, ease: "buff", stagger: wordStagger }, 0.2);

  // Phase 3: squiggle Lottie draws as "Buff" is landing (~45% into its swipe).
  // Pulled in from 1.15 → 0.7 to track the now-quicker word cadence.
  if (lottieAnim) {
    tl.call(() => {
      const endAttr = lottieEl.getAttribute("data-lottie-end-frame");
      const endFrame = endAttr ? parseInt(endAttr, 10) : lottieAnim.totalFrames;
      lottieAnim.playSegments([startFrame, endFrame], true);
    }, null, 0.7);
  }

  // Phase 4: EXIT — no in-place dissolve. The words ride UP with the panel (they
  // are children of root) and SLIGHTLY fade as ONE cohesive unit — a single fade
  // tween, NO stagger, so the three words read as one piece moving up with the
  // swipe rather than separate items "fading into darkness" (client). The panel
  // sweep carries them off-screen.
  const exitStart = 2.5;
  const exitDur = 0.8;

  // Slight, cohesive fade on all words together (panelOut so they stay visible
  // through most of the rise then fade as they whoosh out).
  tl.to(items, { autoAlpha: 0, duration: exitDur, ease: "panelOut" }, exitStart);

  // Panel sweeps up off-screen, carrying the words. Uses the page-transition OUT
  // curve (client: "the same curve it was before" — quicker feel than power2.inOut).
  tl.to(root, { yPercent: -100, duration: exitDur, ease: "panelOut" }, exitStart);

  // Page content rises and DECELERATES to a soft stop — power3.inOut, NOT panelOut.
  // panelOut accelerated INTO its end, so the home FIRST LOAD "just snapped into
  // position, bang, no easing" (client). Starts +0.3s after the panel lifts so the
  // ease lands in the open as the panel clears. Duration is DELIBERATELY slower
  // than the page-to-page transitions (1.2s here vs 0.9s there) — client: the
  // page transitions are fine, but the home first-load settle needs to be slower.
  // Words + panel above still ride up on panelOut as one unit — untouched.
  tl.fromTo(pageContent,
    { y: "7dvh" },
    { y: 0, duration: 1.2, ease: "power3.inOut" },
    exitStart + 0.3
  );
}

export function destroyHomeIntro() {
  if (tl) { tl.kill(); tl = null; }
  if (lottieAnim) { lottieAnim.destroy(); lottieAnim = null; }
  // hasPlayed is intentionally NOT reset — once the intro has played in this
  // session it stays played, so SPA-to-Home doesn't replay it.
}
