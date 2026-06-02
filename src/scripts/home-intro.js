// -----------------------------------------
// HOME INTRO — first-page-load preloader animation
// Three-word headline rises + fades in (Hey, we're Buff), Lottie flourish
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
// Cadence (matches V1 buffmotion.com feel):
//   0.20s — "Hey," rises (y:15 → 0, autoAlpha 0 → 1, 0.55s, buff ease)
//   0.45s — "we're" rises (0.25s stagger)
//   0.70s — "Buff" rises (0.25s stagger)
//   0.95s — Squiggle Lottie plays its draw-on
//   2.30s — Panel slides up off-screen (0.8s)
//   3.10s — Done, hero video plays

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

  // Phase 1: panel visible, items start hidden + nudged down 15px (V1's exact translate value)
  tl.set(root, { autoAlpha: 1, yPercent: 0 });
  tl.set(items, { y: 15, autoAlpha: 0 });

  // Phase 2: words rise + fade in, 0.25s stagger between them — matches V1 rhythm
  tl.to(items, { y: 0, autoAlpha: 1, stagger: 0.25, duration: 0.55 }, 0.2);

  // Phase 3: squiggle Lottie draws as "Buff" lands (~0.95s — third word started at 0.70s)
  if (lottieAnim) {
    tl.call(() => {
      const endAttr = lottieEl.getAttribute("data-lottie-end-frame");
      const endFrame = endAttr ? parseInt(endAttr, 10) : lottieAnim.totalFrames;
      lottieAnim.playSegments([startFrame, endFrame], true);
    }, null, 0.95);
  }

  // Phase 4: hold for the squiggle (~1.3s draw), then slide the panel up off-screen
  tl.to(root, { yPercent: -100, duration: 0.8, ease: "buff" }, 2.3);
}

export function destroyHomeIntro() {
  if (tl) { tl.kill(); tl = null; }
  if (lottieAnim) { lottieAnim.destroy(); lottieAnim = null; }
  // hasPlayed is intentionally NOT reset — once the intro has played in this
  // session it stays played, so SPA-to-Home doesn't replay it.
}
