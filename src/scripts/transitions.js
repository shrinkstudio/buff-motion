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
import { initSplitTextReveal, destroySplitTextReveal } from './split-text.js';
import { initCopyClip, destroyCopyClip } from './copy-clip.js';
import { initTOC, destroyTOC } from './toc.js';
import { initContentReveal, destroyContentReveal } from './content-reveal.js';

gsap.registerPlugin(CustomEase);
if (typeof ScrollTrigger !== 'undefined') gsap.registerPlugin(ScrollTrigger);
if (typeof SplitText !== 'undefined') gsap.registerPlugin(SplitText);

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

CustomEase.create("buff", "0.76, 0.007, 0.25, 1");
gsap.defaults({ ease: "buff", duration: durationDefault });

console.log("[buff] Bundle loaded — barba:", typeof barba, "gsap:", typeof gsap, "lenis:", hasLenis, "lottie:", typeof lottie);


// -----------------------------------------
// TRANSITION LOTTIE SETUP
// -----------------------------------------

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
}

function playTransitionLottie() {
  if (!transitionLottie) return;
  transitionLottie.goToAndStop(0, true);
  transitionLottie.play();
}

function resetTransitionLottie() {
  if (!transitionLottie) return;
  transitionLottie.goToAndStop(0, true);
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
  destroySplitTextReveal();
  destroyCopyClip();
  destroyTOC();
  destroyContentReveal();
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
  if (has('[data-split]'))                          initSplitTextReveal(nextPage);
  if (has('[data-copy]'))                           initCopyClip(nextPage);
  if (has('[data-toc-source]'))                     initTOC(nextPage);
  if (has('[data-reveal-group]'))                   initContentReveal(nextPage);

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

  // Play the Lottie as panel covers the screen
  tl.call(() => {
    playTransitionLottie();
  }, null, 0.4);

  // Current page slides up as it gets covered
  tl.fromTo(current, {
    y: "0vh"
  }, {
    y: "-10dvh",
    duration: 1,
  }, 0);

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

  // Lottie plays during the leave — no gap before reveal
  tl.add("startEnter", 0.1);

  // Show new page
  tl.set(next, {
    autoAlpha: 1,
  }, "startEnter");

  // Panel continues upward out of view
  tl.fromTo(transitionPanel, {
    yPercent: -100,
  }, {
    yPercent: -200,
    duration: 1.2,
    overwrite: "auto",
    immediateRender: false
  }, "startEnter");

  // Counter-animate lottie to stay fixed while panel exits
  tl.fromTo(transitionLottieEl, {
    yPercent: 100,
  }, {
    yPercent: 200,
    duration: 1.2,
    overwrite: "auto",
    immediateRender: false
  }, "startEnter");

  // Bottom curve scales out — rounded trailing edge
  tl.fromTo(transitionPanelBottom, {
    scaleY: 1
  }, {
    scaleY: 0,
    duration: 1.2,
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
    duration: 1.2,
  }, "startEnter");

  tl.add("pageReady");
  tl.call(() => {
    resetTransitionLottie();
  }, null, "pageReady");
  tl.call(resetPage, [next], "pageReady");

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
  gsap.set(container, { clearProps: "position,top,left,right" });

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
