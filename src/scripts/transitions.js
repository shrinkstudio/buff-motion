// -----------------------------------------
// BUFF MOTION — PAGE TRANSITIONS
// Barba.js + GSAP + Lenis + Lottie wipe
// -----------------------------------------

import { initAccordions, destroyAccordions } from './accordion.js';
import { initTabs, destroyTabs } from './tabs.js';
import { initSliders, destroySliders } from './slider.js';
import { initInlineVideos, destroyInlineVideos } from './inline-video.js';
import { initModalDelegation, initModals, destroyModals } from './modal.js';
import { initFontSizeDetect, initFooterYear, initSkipLink } from './utilities.js';
import { initLottieAnimations, destroyLottieAnimations } from './lottie.js';
import { initCopyClip, destroyCopyClip } from './copy-clip.js';
import { initTOC, destroyTOC } from './toc.js';
import { initContentReveal, destroyContentReveal } from './content-reveal.js';
import { initTypeform, destroyTypeform } from './typeform.js';
import { initCursorMarquee, destroyCursorMarquee } from './cursor-marquee.js';
import { initLogoWall, destroyLogoWall } from './logo-wall.js';
import { initVideoHover, destroyVideoHover } from './video-hover.js';
import { initSidenav, destroySidenav } from './sidenav.js';
import { initSocialShare, destroySocialShare } from './social-share.js';
import { initFilter, destroyFilter } from './filter.js';
import { initHomeIntro, destroyHomeIntro } from './home-intro.js';
import { initParallaxSlider, destroyParallaxSlider } from './parallax-slider.js';
import { initNavOverHero, destroyNavOverHero } from './nav-over-hero.js';
import { initHeroParallax, destroyHeroParallax } from './hero-parallax.js';

gsap.registerPlugin(CustomEase);
if (typeof ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);

history.scrollRestoration = "manual";

let lenis = null;
let nextPage = document;
let onceFunctionsInitialized = false;

// Transition Lottie — loaded once, replayed each transition
let transitionLottie = null;


const hasLenis = typeof window.Lenis !== "undefined";
const hasScrollTrigger = typeof window.ScrollTrigger !== "undefined";

const rmMQ = window.matchMedia("(prefers-reduced-motion: reduce)");
let reducedMotion = rmMQ.matches;
rmMQ.addEventListener?.("change", e => (reducedMotion = e.matches));
rmMQ.addListener?.(e => (reducedMotion = e.matches));

const has = (s) => !!nextPage.querySelector(s);

let staggerDefault = 0.05;
let durationDefault = 0.6;

CustomEase.create("buff", "M0,0 C1,0.0028 0,1.0005 1,1");
CustomEase.create("energy", "M0,0 C0.32,0.72 0,1 1,1");
gsap.defaults({ ease: "buff", duration: durationDefault });

console.log("[buff] Bundle loaded — barba:", typeof barba, "gsap:", typeof gsap, "lenis:", hasLenis, "lottie:", typeof lottie);


// -----------------------------------------
// TRANSITION LOTTIE SETUP
// -----------------------------------------

// Captured ONCE when the Lottie's JSON has loaded, so we don't reach into
// lottie-web internals during the transition itself. Stores absolute file
// frames for the active range — works whether the file is the -40 crop
// (ip=43, op=107) or the uncropped V1 (ip=0, op=107) or anything else.
let lottieRange = null; // { ip, half, op } | null

function initTransitionLottie() {
  const container = document.querySelector("[data-transition-lottie]");
  if (!container || transitionLottie) return;

  const src = container.getAttribute("data-lottie-src");
  if (!src) {
    console.warn("[buff] No data-lottie-src on transition lottie element");
    return;
  }

  transitionLottie = lottie.loadAnimation({
    container: container,
    renderer: "svg",
    loop: false,
    autoplay: false,
    path: src,
  });

  // Capture the file's active range once the JSON finishes parsing. We use
  // playSegments later, which takes absolute file frames — so we need the
  // file's real ip/op, not lottie-web's raw-frame indices.
  transitionLottie.addEventListener("DOMLoaded", () => {
    const ip = typeof transitionLottie.firstFrame === "number" ? transitionLottie.firstFrame : 0;
    const total = transitionLottie.totalFrames || 0;
    if (total > 0) {
      lottieRange = {
        ip: ip,
        half: ip + Math.floor(total / 2),
        op: ip + total,
      };
      // Park the playhead on the first active frame so the Lottie is in a
      // known state before the first transition fires.
      transitionLottie.goToAndStop(ip, true);
      console.log("[buff] Transition Lottie loaded — active range:", lottieRange);
    } else {
      console.warn("[buff] Transition Lottie loaded but totalFrames is 0 — falling back to native play");
    }
  });
}

// Play a segment of the transition Lottie (start frame → end frame) stretched
// to fill `desiredDuration` seconds. Uses lottie-web's native playSegments +
// setSpeed instead of a GSAP-driven scrub — same visual result (squiggle
// playhead tracks the transition phase), but lottie-web handles the absolute-
// frame mapping internally so there's no chance of "scrubbed into a clamped
// range" or "proxy tween created with null range" failure modes.
//
// IMPORTANT: this is meant to be wrapped in an arrow function at the call
// site so lottieRange is resolved at PLAYBACK time, not at timeline-build
// time. On the very first click (before the Lottie's DOMLoaded fires) this
// gives us a free retry — by the time the call() position plays, the file
// has had milliseconds to load and the range is populated.
function playLottieSegment(startFrame, endFrame, desiredDuration) {
  if (!transitionLottie) return;
  if (typeof startFrame !== "number" || typeof endFrame !== "number") {
    // Range wasn't captured — let the file play at native speed from wherever
    // it is. Worst case it plays in 1.28s instead of the desired window;
    // it's never invisible.
    transitionLottie.setSpeed(1);
    transitionLottie.play();
    return;
  }
  const segmentFrames = Math.abs(endFrame - startFrame);
  const fps = transitionLottie.frameRate || 50;
  const nativeDuration = segmentFrames / fps;
  const speed = desiredDuration > 0 ? nativeDuration / desiredDuration : 1;
  transitionLottie.setSpeed(speed);
  transitionLottie.playSegments([startFrame, endFrame], true);
}

function resetTransitionLottie() {
  if (!transitionLottie) return;
  // playSegments mutates firstFrame/totalFrames on the lottie instance — reset
  // to the file's natural range first so subsequent transitions don't read
  // a stale segment as "the file".
  if (typeof transitionLottie.resetSegments === "function") {
    transitionLottie.resetSegments(true);
  }
  transitionLottie.setSpeed(1);
  const startFrame = lottieRange ? lottieRange.ip : 0;
  transitionLottie.goToAndStop(startFrame, true);
}


// -----------------------------------------
// FUNCTION REGISTRY
// -----------------------------------------

function initOnceFunctions() {
  initLenis();
  initTransitionLottie();
  if (onceFunctionsInitialized) return;
  onceFunctionsInitialized = true;

  // Document-level delegation (bind once)
  initModalDelegation();
  initFontSizeDetect();
  initSkipLink();

  // Home page preloader animation — only fires on first page load and only when the panel exists
  if (document.querySelector('[data-home-intro]')) initHomeIntro();
}

function initBeforeEnterFunctions(next) {
  nextPage = next || document;

  // Destroy old instances before new page enters
  destroyAccordions();
  destroyTabs();
  destroySliders();
  destroyInlineVideos();
  destroyModals();
  destroyLottieAnimations();
  destroyCopyClip();
  destroyTOC();
  destroyContentReveal();
  destroyTypeform();
  destroyCursorMarquee();
  destroyLogoWall();
  destroyVideoHover();
  destroyParallaxSlider();
  destroyNavOverHero();
  destroyHeroParallax();
  destroySocialShare();
  destroyFilter();
  destroySidenav();
}

function initAfterEnterFunctions(next) {
  nextPage = next || document;

  if (has('details'))                               initAccordions(nextPage);
  if (has('[data-tabs-component]'))                 initTabs(nextPage);
  if (has('[data-slider]'))                         initSliders(nextPage);
  if (has('[data-video]'))                          initInlineVideos(nextPage);
  if (has('dialog'))                                initModals(nextPage);
  if (has('[data-footer-year]'))                    initFooterYear(nextPage);
  if (has('[data-lottie]'))                         initLottieAnimations(nextPage);
  if (has('[data-copy]'))                           initCopyClip(nextPage);
  if (has('[data-toc-source]'))                     initTOC(nextPage);
  if (has('[data-reveal-group]'))                   initContentReveal(nextPage);
  if (has('[data-typeform]'))                       initTypeform(nextPage);
  if (document.querySelector('.cursor'))             initCursorMarquee();
  if (has('[data-logo-wall-cycle-init]'))           initLogoWall(nextPage);
  if (has('[data-video-on-hover]'))                initVideoHover(nextPage);
  if (has('[data-parallax-init]'))                 initParallaxSlider(nextPage);
  if (has('[data-nav-over-hero-trigger]'))         initNavOverHero(nextPage);
  if (has('[data-nav-over-hero-trigger]'))         initHeroParallax(nextPage);
  if (has('[data-social-share]'))                  initSocialShare(nextPage);
  if (has('[data-filter-group]'))                  initFilter(nextPage);
  if (has('[data-home-intro]'))                    initHomeIntro(nextPage);
  // Sidenav lives inside the Barba container, so it's swapped on every page
  // navigation. Destroy happens in beforeEnter (alongside the other modules)
  // and init happens here. The querySelector is document-wide because `has`
  // (scoped to nextPage) is matched here for consistency — both work.
  if (document.querySelector('[data-sidenav-wrap]')) initSidenav(nextPage);

  // Re-evaluate inline scripts inside the new container (Webflow embeds)
  reinitScripts(nextPage);

  // Webflow IX2 reinit — fixes native nav dropdowns
  if (window.Webflow && window.Webflow.ready) {
    window.Webflow.ready();
  }

  if (hasLenis) {
    lenis.resize();
  }

  if (hasScrollTrigger) {
    ScrollTrigger.refresh();
  }
}


// -----------------------------------------
// PAGE TRANSITIONS (Curved Wipe + Lottie)
// -----------------------------------------

function runPageOnceAnimation(next) {
  console.log("[buff] once — first page load");
  const tl = gsap.timeline();

  tl.call(() => {
    resetPage(next);
  }, null, 0);

  return tl;
}

function runPageLeaveAnimation(current, next) {
  console.log("[buff] leave — page exit animation");

  const transitionWrap = document.querySelector("[data-transition-wrap]");
  const transitionPanel = transitionWrap.querySelector("[data-transition-panel]");
  const transitionPanelTop = transitionWrap.querySelector("[data-transition-panel-top]");
  const transitionPanelBottom = transitionWrap.querySelector("[data-transition-panel-bottom]");
  const transitionLottieEl = transitionWrap.querySelector("[data-transition-lottie]");

  const tl = gsap.timeline({
    onComplete: () => { current.remove(); }
  });

  if (reducedMotion) {
    return tl.set(current, { autoAlpha: 0 });
  }

  // Reset panel state
  tl.set(transitionPanel, {
    autoAlpha: 1
  }, 0);

  tl.set(transitionPanelTop, {
    scaleY: 0,
    height: "5vw"
  }, 0);

  tl.set(transitionPanelBottom, {
    scaleY: 1,
    height: "8vw"
  }, 0);

  tl.set(transitionLottieEl, {
    autoAlpha: 1
  }, 0);

  tl.set(next, {
    autoAlpha: 0
  }, 0);

  // Panel sweeps up from bottom to cover screen
  tl.fromTo(transitionPanel, {
    yPercent: 0
  }, {
    yPercent: -100,
    duration: 1,
  }, 0);

  // Counter-animate lottie so it stays fixed on screen
  tl.fromTo(transitionLottieEl, {
    yPercent: 0
  }, {
    yPercent: 100,
    duration: 1,
  }, 0);

  // Top curve scales in — rounded leading edge
  tl.fromTo(transitionPanelTop, {
    scaleY: 0
  }, {
    scaleY: 1,
    duration: 1,
  }, "<");

  // Squiggle's in-half — kicks at 0.2s into the leave so the panel gets a
  // brief solo anticipation beat, then the squiggle joins and lands midpoint
  // at 1s (panel cover). Wrapped in an arrow function so lottieRange is read
  // at PLAYBACK time, not build time — first-click safety in case the
  // Lottie's DOMLoaded hasn't fired by the time the user clicks.
  tl.call(() => {
    playLottieSegment(lottieRange?.ip, lottieRange?.half, 0.8);
  }, null, 0.2);

  // Current page slides up as it gets covered
  tl.fromTo(current, {
    y: "0vh"
  }, {
    y: "-10dvh",
    duration: 1,
  }, 0);

  // Speed up on mobile (~1.6x faster), matching Forest's mobile pace
  if (window.matchMedia('(max-width: 767px)').matches) {
    tl.timeScale(1.6);
  }

  return tl;
}

function runPageEnterAnimation(next) {
  console.log("[buff] enter — page enter animation");

  const transitionWrap = document.querySelector("[data-transition-wrap]");
  const transitionPanel = transitionWrap.querySelector("[data-transition-panel]");
  const transitionPanelBottom = transitionWrap.querySelector("[data-transition-panel-bottom]");
  const transitionLottieEl = transitionWrap.querySelector("[data-transition-lottie]");

  const tl = gsap.timeline();

  if (reducedMotion) {
    tl.set(next, { autoAlpha: 1 });
    tl.add("pageReady");
    tl.call(resetPage, [next], "pageReady");
    return new Promise(resolve => tl.call(resolve, null, "pageReady"));
  }

  // Wait for the leave's 1s panel-cover to fully complete + 0.35s "dwell"
  // before starting the reveal. Matches Forest's smooth pattern.
  tl.add("startEnter", 1.35);

  // Show new page
  tl.set(next, {
    autoAlpha: 1,
  }, "startEnter");

  // Panel continues upward out of view
  tl.fromTo(transitionPanel, {
    yPercent: -100,
  }, {
    yPercent: -200,
    duration: 1,
    overwrite: "auto",
    immediateRender: false
  }, "startEnter");

  // Counter-animate lottie to stay fixed while panel exits
  tl.fromTo(transitionLottieEl, {
    yPercent: 100,
  }, {
    yPercent: 200,
    duration: 1,
    overwrite: "auto",
    immediateRender: false
  }, "startEnter");

  // Squiggle's out-half kicks at startEnter — picks up from midpoint where
  // the in-half left off, stretched to fill the full 1s of panel exit so the
  // final frame lands exactly with the panel done. Arrow-wrapped for the
  // same playback-time read as the in-half above.
  tl.call(() => {
    playLottieSegment(lottieRange?.half, lottieRange?.op, 1.0);
  }, null, "startEnter");

  // Bottom curve scales out — rounded trailing edge
  tl.fromTo(transitionPanelBottom, {
    scaleY: 1
  }, {
    scaleY: 0,
    duration: 1,
  }, "<");

  // Hide panel + lottie after it exits
  tl.set(transitionPanel, {
    autoAlpha: 0
  }, ">");

  tl.set(transitionLottieEl, {
    autoAlpha: 0
  }, "<");

  // New page slides up from below
  tl.from(next, {
    y: "15dvh",
    duration: 1,
  }, "startEnter");

  tl.add("pageReady");
  tl.call(() => {
    resetTransitionLottie();
  }, null, "pageReady");
  tl.call(resetPage, [next], "pageReady");

  // Speed up on mobile (~1.6x faster), matching Forest's mobile pace
  if (window.matchMedia('(max-width: 767px)').matches) {
    tl.timeScale(1.6);
  }

  return new Promise(resolve => {
    tl.call(resolve, null, "pageReady");
  });
}


// -----------------------------------------
// BARBA HOOKS + INIT
// -----------------------------------------

barba.hooks.beforeEnter(data => {
  // Position new container on top
  gsap.set(data.next.container, {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
  });

  if (lenis && typeof lenis.stop === "function") {
    lenis.stop();
  }

  initBeforeEnterFunctions(data.next.container);
  applyThemeFrom(data.next.container);
});

barba.hooks.afterLeave(() => {
  if (hasScrollTrigger) {
    ScrollTrigger.getAll().forEach(trigger => trigger.kill());
  }
});

barba.hooks.enter(data => {
  initBarbaNavUpdate(data);
});

barba.hooks.afterEnter(data => {
  initAfterEnterFunctions(data.next.container);

  if (hasLenis) {
    lenis.resize();
    lenis.start();
  }

  if (hasScrollTrigger) {
    ScrollTrigger.refresh();
  }
});

barba.init({
  debug: true, // Set to false in production
  timeout: 7000,
  preventRunning: true,
  transitions: [
    {
      name: "default",
      sync: true,

      async once(data) {
        initOnceFunctions();
        return runPageOnceAnimation(data.next.container);
      },

      async leave(data) {
        return runPageLeaveAnimation(data.current.container, data.next.container);
      },

      async enter(data) {
        return runPageEnterAnimation(data.next.container);
      }
    }
  ],
});


// -----------------------------------------
// HELPERS
// -----------------------------------------

const themeConfig = {
  light: {
    nav: "dark",
    transition: "light"
  },
  dark: {
    nav: "light",
    transition: "dark"
  }
};

function applyThemeFrom(container) {
  const pageTheme = container?.dataset?.pageTheme || "light";
  const config = themeConfig[pageTheme] || themeConfig.light;

  document.body.dataset.pageTheme = pageTheme;
  const transitionEl = document.querySelector('[data-theme-transition]');
  if (transitionEl) {
    transitionEl.dataset.themeTransition = config.transition;
  }

  const nav = document.querySelector('[data-theme-nav]');
  if (nav) {
    nav.dataset.themeNav = config.nav;
  }
}

function initLenis() {
  if (lenis) return;
  if (!hasLenis) return;

  lenis = new Lenis({
    lerp: 0.165,
    wheelMultiplier: 1.25,
  });

  // Expose for other scripts
  window.__buffMotionLenis = lenis;

  if (hasScrollTrigger) {
    lenis.on("scroll", ScrollTrigger.update);
  }

  gsap.ticker.add((time) => {
    lenis.raf(time * 1000);
  });

  gsap.ticker.lagSmoothing(0);
}

function resetPage(container) {
  window.scrollTo(0, 0);
  gsap.set(container, {
    clearProps: "position,top,left,right,transform,translate,x,y,xPercent,yPercent,scale,rotate"
  });

  // Belt-and-braces: GSAP's clearProps reliably zeros out transform-related
  // values but may leave behind `transform: translate(0px, 0px)` (identity)
  // rather than actually removing the inline style. Per CSS spec, ANY
  // computed transform value other than `none` (INCLUDING identity matrix)
  // makes the element a containing block for position:fixed descendants.
  // That's what was leaking after the transform clearProps in the previous
  // commit didn't fully fix the sidenav-scrolls-with-page bug.
  //
  // Force-remove these inline styles directly so the element returns to a
  // truly transform-less state. Page-main no longer creates a containing
  // block; position:fixed children (sidenav, modals, transition panels)
  // anchor to the viewport again.
  ['transform', 'translate', 'scale', 'rotate'].forEach(prop => {
    container.style.removeProperty(prop);
  });

  if (hasLenis) {
    lenis.resize();
    lenis.start();
  }
}

function reinitScripts(container) {
  container.querySelectorAll('script').forEach(oldScript => {
    const newScript = document.createElement('script');
    [...oldScript.attributes].forEach(attr => {
      newScript.setAttribute(attr.name, attr.value);
    });
    newScript.textContent = oldScript.textContent;
    oldScript.parentNode.replaceChild(newScript, oldScript);
  });
}

function initBarbaNavUpdate(data) {
  var tpl = document.createElement('template');
  tpl.innerHTML = data.next.html.trim();
  var nextNodes = tpl.content.querySelectorAll('[data-barba-update]');
  var currentNodes = document.querySelectorAll('nav [data-barba-update]');

  currentNodes.forEach(function (curr, index) {
    var next = nextNodes[index];
    if (!next) return;

    var newStatus = next.getAttribute('aria-current');
    if (newStatus !== null) {
      curr.setAttribute('aria-current', newStatus);
    } else {
      curr.removeAttribute('aria-current');
    }

    var newClassList = next.getAttribute('class') || '';
    curr.setAttribute('class', newClassList);
  });
}
