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
  navWrap = scope.querySelector("[data-sidenav-wrap]");
  if (!navWrap) return;

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
  // Override per-element on the Lottie element via:
  //   [data-lottie-frame="N"]            — closed/resting frame (default 35)
  //   [data-lottie-open-frame="N"]       — open/active frame (default 70)
  //   [data-lottie-close-end-frame="N"]  — frame to play to on close before resetting (default 100)
  const closedFrame = arrowLottieEl
    ? parseInt(arrowLottieEl.getAttribute("data-lottie-frame") || "35", 10)
    : 35;
  const openFrame = arrowLottieEl
    ? parseInt(arrowLottieEl.getAttribute("data-lottie-open-frame") || "70", 10)
    : 70;
  const closeEndFrame = arrowLottieEl
    ? parseInt(arrowLottieEl.getAttribute("data-lottie-close-end-frame") || "100", 10)
    : 100;
  arrowLottie = loadNavLottie(arrowLottieEl);
  if (arrowLottie) {
    arrowLottie.addEventListener("DOMLoaded", () => arrowLottie.goToAndStop(closedFrame, true));
  }

  // Background Lottie inside the menu — held at frame 0 until menu opens
  const bgLottieEl = document.querySelector("[data-nav-lottie-bg]");
  bgLottie = loadNavLottie(bgLottieEl);
  if (bgLottie) {
    bgLottie.addEventListener("DOMLoaded", () => bgLottie.goToAndStop(0, true));
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Timeline-scoped defaults — explicit buff ease + 0.9s so the menu glides like the V1 site.
  tl = gsap.timeline({ defaults: { ease: "buff", duration: 0.9 } });

  const setBodyState = (open) => {
    document.body.setAttribute("data-menu-status", open ? "open" : "");
  };

  const openNav = () => {
    navWrap.setAttribute("data-nav-state", "open");
    setBodyState(true);

    if (reducedMotion) {
      tl.clear().set(navWrap, { display: "block", autoAlpha: 1 });
      return;
    }

    tl.clear()
      .set(navWrap, { display: "block" })
      .set(menu, { xPercent: 0 }, "<")
      // Phase 1 (0 — ~0.55s): panels wipe in fast, overlay dims, button label flips
      .fromTo(overlay, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.45 }, 0)
      .fromTo(menuButtonTexts, { yPercent: 0 }, { yPercent: -100, stagger: 0.05, duration: 0.45 }, 0)
      .fromTo(bgPanels, { xPercent: 101 }, { xPercent: 0, stagger: 0.06, duration: 0.55 }, 0)
      // Phase 2 (~0.5s onwards): bg squiggle starts drawing into the now-settled panels
      .call(() => { if (bgLottie) bgLottie.goToAndPlay(0, true); }, null, 0.5)
      // Phase 3 (~0.55s onwards): items animate in on top of the drawing squiggle
      .fromTo(menuLinks,
        { yPercent: 120, autoAlpha: 0 },
        { yPercent: 0, autoAlpha: 1, stagger: 0.08, duration: 0.9 },
        0.55)
      .fromTo(fadeTargets,
        { autoAlpha: 0, yPercent: 30 },
        { autoAlpha: 1, yPercent: 0, stagger: 0.04, duration: 0.6 },
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

    if (reducedMotion) {
      tl.clear().set(navWrap, { display: "none" });
      return;
    }

    tl.clear()
      // Inner content drops out first, snappy
      .to(fadeTargets, { autoAlpha: 0, yPercent: 20, stagger: 0.02, duration: 0.25 }, 0)
      .to(menuLinks, { autoAlpha: 0, yPercent: 40, stagger: 0.03, duration: 0.35 }, 0.05)
      // Panels wipe back out, staggered the same way
      .to(bgPanels, { xPercent: 101, stagger: 0.05, duration: 0.7 }, 0.15)
      // Overlay fades + button label slides in tandem with the panels
      .to(overlay, { autoAlpha: 0, duration: 0.5 }, 0.2)
      .to(menuButtonTexts, { yPercent: 0, duration: 0.45 }, 0.15)
      .set(navWrap, { display: "none" });

    // Lottie arrow plays from current frame forward to the close-end frame,
    // then silently resets to the closed frame (visually identical pose) ready for next open.
    if (arrowLottie) {
      tl.call(() => {
        const onComplete = () => {
          arrowLottie.removeEventListener("complete", onComplete);
          arrowLottie.goToAndStop(closedFrame, true);
        };
        arrowLottie.addEventListener("complete", onComplete);
        arrowLottie.playSegments([arrowLottie.currentFrame, closeEndFrame], true);
      }, null, 0);
    } else if (menuButtonIcon) {
      tl.to(menuButtonIcon, { rotate: 0 }, 0);
    }
  };

  const toggle = (e) => {
    const state = navWrap.getAttribute("data-nav-state");
    const source = e && e.currentTarget ? (e.currentTarget.getAttribute("data-sidenav-overlay") !== null ? "overlay" : "button") : "?";
    console.log("[buff] sidenav toggle", { from: source, state });
    if (state === "open") closeNav();
    else openNav();
  };

  menuToggles.forEach((el) => {
    el.addEventListener("click", toggle);
    toggleHandlers.push({ el, handler: toggle });
  });
  console.log("[buff] sidenav toggles bound:", menuToggles.length);

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
  if (tl) {
    tl.kill();
    tl = null;
  }
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
