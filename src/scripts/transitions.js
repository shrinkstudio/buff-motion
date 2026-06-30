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
import { initDraggableMarquee, destroyDraggableMarquee } from './draggable-marquee.js';
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

// "buff" — project ease (client-supplied, cubic-bezier(0, 0.837, 0.2, 0.999)).
// Smooth fast-out curve that settles without the jolt of the old in-out buff
// curve. This is the bundle's global default ease (see gsap.defaults below), so
// it sets the motion character for every tween that doesn't override `ease`.
CustomEase.create("buff", "M0,0 C0,0.837 0.2,0.999 1,1");
CustomEase.create("energy", "M0,0 C0.32,0.72 0,1 1,1");
// Page-transition panel curves (client-supplied).
// panelIn  = cubic-bezier(0.048, 0.465, 0.123, 0.989) — fast cover, settles (the sweep-up cover).
// panelOut = cubic-bezier(1, 0, 0.831, 0.992)         — slow start, accelerates away (the sweep-out reveal).
CustomEase.create("panelIn", "M0,0 C0.048,0.465 0.123,0.989 1,1");
CustomEase.create("panelOut", "M0,0 C1,0 0.831,0.992 1,1");
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
  destroyDraggableMarquee();
  destroyNavOverHero();
  destroyHeroParallax();
  destroySocialShare();
  destroyFilter();
  // NOTE: destroySidenav intentionally NOT called here. With sync:true
  // transitions, beforeEnter fires BEFORE leave/enter — so destroying the
  // sidenav here snap-closes the menu, creating the "jolt" the client
  // flagged before the transition panel even starts moving.
  //
  // Deferred to afterEnter (below) where it runs AFTER the leave panel has
  // covered the viewport AND the new page has settled in. The menu close
  // happens invisibly behind the transition panel.
  //
  // CAUTION: this was tried before (commit e4160b5) and reverted (999af6d)
  // because the new page's menu didn't open afterwards. The cause was the
  // OLD sidenav timeline still being mid-flight when the new init ran —
  // GSAP targets ended up pointing at stale closures. THIS attempt mitigates
  // by adding an unconditional tl.kill() + gsap.set clearProps in destroy,
  // ensuring the OLD state is fully wiped before the NEW init runs (which
  // happens in the same tick, immediately after destroy, in afterEnter).

  // STATIC lotties only — pre-init the NEW page's [data-lottie-static] elements
  // NOW (beforeEnter, while the transition panel still covers the screen) so they
  // render BEFORE the page reveals, instead of snapping in during afterEnter.
  // The full afterEnter pass skips them (already data-lottie-fired).
  if (has('[data-lottie-static="true"]')) initLottieAnimations(nextPage, { staticOnly: true });
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
  if (has('[data-parallax-init]'))                 initDraggableMarquee(nextPage);
  if (has('[data-nav-over-hero-trigger]'))         initNavOverHero(nextPage);
  if (has('[data-nav-over-hero-trigger]'))         initHeroParallax(nextPage);
  if (has('[data-social-share]'))                  initSocialShare(nextPage);
  if (has('[data-filter-group]'))                  initFilter(nextPage);
  if (has('[data-home-intro]'))                    initHomeIntro(nextPage);
  // Sidenav lives inside the Barba container, so it's swapped on every page
  // navigation. Destroy now happens here (deferred from beforeEnter) so the
  // menu close happens INVISIBLY behind the transition panel — no jolt.
  // Order matters: destroy first to kill old timeline + clear all GSAP
  // inline transforms, then init on the new page's DOM.
  destroySidenav();
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
// PAGE TRANSITIONS (Flat panel wipe + Lottie squiggle)
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
  const transitionLottieEl = transitionWrap.querySelector("[data-transition-lottie]");

  const tl = gsap.timeline({
    onComplete: () => { current.remove(); }
  });

  if (reducedMotion) {
    return tl.set(current, { autoAlpha: 0 });
  }

  // Flat panel now (curved top/bottom removed in the Designer) — quicker, tighter.
  const COVER_DUR = 0.65;
  // Squiggle plays the full draw-on→off file. Slowed 0.75 → 1.0 (client: slow the
  // lottie a bit). The panel (blue bg) cover/reveal timing is UNCHANGED — client
  // said its speed/timing is perfect — so only the squiggle draws more calmly.
  const SQUIGGLE_DUR = 1.0;

  // Panel + squiggle visible, incoming page hidden behind it
  tl.set(transitionPanel, { autoAlpha: 1 }, 0);
  tl.set(transitionLottieEl, { autoAlpha: 1 }, 0);
  tl.set(next, { autoAlpha: 0 }, 0);

  // Panel sweeps up to cover — STRONG ease-off (power4.out): responds fast to the
  // click then decelerates smoothly into the covered position. Replaces panelIn,
  // which covered ~99% in the first ~12% of its time — that read as a hard SNAP
  // on press (client: "snapping when you press another page").
  tl.fromTo(transitionPanel,
    { yPercent: 0 },
    { yPercent: -100, duration: COVER_DUR, ease: "power4.out" },
    0);

  // Current page parallaxes up with the cover, same curve (power4.out)
  tl.fromTo(current,
    { y: "0vh" },
    { y: "-10dvh", duration: COVER_DUR, ease: "power4.out" },
    0);

  // Squiggle kicks partway through the cover and plays quickly, so it's ~3/4
  // through exactly as the reveal sweep begins (startEnter=0.85 in
  // runPageEnterAnimation, shared clock via sync:true). Overlapping
  // cover→squiggle→reveal removes the old static-blue dwell (client: "holds on
  // plain blue for ~½s") and makes the whole thing quicker.
  tl.call(() => {
    playLottieSegment(lottieRange?.ip, lottieRange?.op, SQUIGGLE_DUR);
  }, null, 0.3);

  // Mobile runs at the SAME speed as desktop now (client: the 1.6x mobile
  // speed-up made the transition "very fast" on phones). No timeScale here.

  return tl;
}

function runPageEnterAnimation(next) {
  console.log("[buff] enter — page enter animation");

  const transitionWrap = document.querySelector("[data-transition-wrap]");
  const transitionPanel = transitionWrap.querySelector("[data-transition-panel]");
  const transitionLottieEl = transitionWrap.querySelector("[data-transition-lottie]");

  const tl = gsap.timeline();

  if (reducedMotion) {
    tl.set(next, { autoAlpha: 1 });
    tl.add("pageReady");
    tl.call(resetPage, [next], "pageReady");
    return new Promise(resolve => tl.call(resolve, null, "pageReady"));
  }

  const REVEAL_DUR = 0.65;

  // Reveal begins when the squiggle is ~3/4 through (client: "squiggle 3/4 of the
  // way through as the screen goes up"). Shared clock with the leave timeline via
  // sync:true — leave plays the squiggle at 0.3 over 0.75s, so its 3/4 point is
  // ~0.86; the reveal kicks at 0.85. Quicker overall, no static-blue dwell.
  tl.add("startEnter", 0.85);

  // Show new page
  tl.set(next, { autoAlpha: 1 }, "startEnter");

  // Panel sweeps up and out — Panel Out curve (slow start, accelerates away)
  tl.fromTo(transitionPanel,
    { yPercent: -100 },
    { yPercent: -200, duration: REVEAL_DUR, ease: "panelOut", overwrite: "auto", immediateRender: false },
    "startEnter");

  // New page rises into place — IDENTICAL to the hero intro exit: panel + page
  // share ONE curve (panelOut), the SAME start, and the SAME duration, so they
  // move as a single locked unit (client: "match the hero, the page-in is
  // perfect"). The old power3.out gave the page a different curve from the panel
  // — same start/duration but a mismatched shape — which read as out-of-sync /
  // glitchy. Travel 7dvh — at 15dvh the rise momentarily exposed layout edges on
  // Home (nav bar + a peek of hero-text past the sticky hero); 7dvh is the value
  // the intro settled on for the same reason.
  tl.from(next, {
    y: "7dvh",
    duration: REVEAL_DUR,
    ease: "panelOut",
  }, "startEnter");

  // Hide panel + lottie once they've swept out
  tl.set(transitionPanel, { autoAlpha: 0 }, ">");
  tl.set(transitionLottieEl, { autoAlpha: 0 }, "<");

  tl.add("pageReady");
  tl.call(() => {
    resetTransitionLottie();
  }, null, "pageReady");
  tl.call(resetPage, [next], "pageReady");

  // Mobile runs at the SAME speed as desktop now (client: mobile transition was
  // "very fast"). The leave timeline matches — both unscaled — so sync:true holds.

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
