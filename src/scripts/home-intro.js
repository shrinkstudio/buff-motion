// -----------------------------------------
// HOME INTRO — first-page-load preloader animation
// Three-word headline rises + fades in (Hey, we're Buff), Lottie flourish
// draws underneath "Buff", panel slides up off-screen, hero video plays.
// Fires from the Barba `once` hook only — never re-plays on SPA transitions.
// -----------------------------------------
// Attributes:
//   [data-home-intro]              — root panel (full-screen overlay)
//   [data-home-intro-word]         — each word in the headline (rises in with stagger)
//   [data-home-intro-buff]         — the wrapping element for the word "Buff" (Lottie anchor)
//   [data-home-intro-lottie]       — Lottie container, paired with [data-lottie-src]
//   [data-home-hero-video]         — wrapper containing the 100svh hero <video> to play on exit
//
// Lottie playback frames (overridable on the Lottie element):
//   [data-lottie-frame]            — initial hold frame (default 0)
//   [data-lottie-end-frame]        — last frame to play to (default = Lottie's totalFrames)

let tl = null;
let lottieAnim = null;
let initialised = false;

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
  if (initialised) return;          // belt and braces — never run twice
  scope = scope || document;
  const root = scope.querySelector("[data-home-intro]");
  if (!root) return;
  initialised = true;

  const words = root.querySelectorAll("[data-home-intro-word]");
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
      // Cleanup once the panel is fully off-screen
      root.style.visibility = "hidden";
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

  // Phase 1: panel visible, words start hidden
  tl.set(root, { autoAlpha: 1, yPercent: 0 });
  tl.set(words, { yPercent: 100, autoAlpha: 0 });

  // Phase 2: words rise + fade in, staggered (matches V1's 15px+fade pattern, scaled to yPercent for clean line-height handling)
  tl.to(words, { yPercent: 0, autoAlpha: 1, stagger: 0.08, duration: 0.55 }, 0.1);

  // Phase 3: Lottie underline draws on once the words have landed
  if (lottieAnim) {
    tl.call(() => {
      const endAttr = lottieEl.getAttribute("data-lottie-end-frame");
      const endFrame = endAttr ? parseInt(endAttr, 10) : lottieAnim.totalFrames;
      lottieAnim.playSegments([startFrame, endFrame], true);
    }, null, 0.55);
  }

  // Hold roughly 1.5s for the Lottie to draw, then slide the panel up off-screen
  tl.to(root, { yPercent: -100, duration: 0.7, ease: "buff" }, 2.2);
}

export function destroyHomeIntro() {
  if (tl) { tl.kill(); tl = null; }
  if (lottieAnim) { lottieAnim.destroy(); lottieAnim = null; }
  initialised = false;
}
