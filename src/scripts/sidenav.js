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
  //   [data-lottie-frame="N"]        — closed/resting frame (default 35)
  //   [data-lottie-open-frame="N"]   — open/active frame (default 60)
  const closedFrame = arrowLottieEl
    ? parseInt(arrowLottieEl.getAttribute("data-lottie-frame") || "35", 10)
    : 35;
  const openFrame = arrowLottieEl
    ? parseInt(arrowLottieEl.getAttribute("data-lottie-open-frame") || "60", 10)
    : 60;
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
      // Overlay dim + panel wipe + label slide all begin together
      .fromTo(overlay, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6 }, 0)
      .fromTo(menuButtonTexts, { yPercent: 0 }, { yPercent: -100, stagger: 0.06, duration: 0.5 }, 0)
      .fromTo(bgPanels, { xPercent: 101 }, { xPercent: 0, stagger: 0.08, duration: 1 }, 0)
      // Links rise + fade in once the panels have most of the wipe done
      .fromTo(menuLinks,
        { yPercent: 110, autoAlpha: 0 },
        { yPercent: 0, autoAlpha: 1, stagger: 0.07, duration: 0.9 },
        0.35)
      // Socials/details ride in just behind the links
      .fromTo(fadeTargets,
        { autoAlpha: 0, yPercent: 30 },
        { autoAlpha: 1, yPercent: 0, stagger: 0.04, duration: 0.6 },
        0.55);

    // Lottie arrow plays from current frame to the open frame. Fallback: rotate the static icon.
    if (arrowLottie) {
      tl.call(() => {
        arrowLottie.playSegments([arrowLottie.currentFrame, openFrame], true);
      }, null, 0);
    } else if (menuButtonIcon) {
      tl.fromTo(menuButtonIcon, { rotate: 0 }, { rotate: 315 }, 0);
    }

    // Background Lottie replays its intro from frame 0 every time the menu opens
    if (bgLottie) {
      tl.call(() => bgLottie.goToAndPlay(0, true), null, 0);
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
      // Inner content fades down first
      .to(fadeTargets, { autoAlpha: 0, yPercent: 20, stagger: 0.03, duration: 0.3 }, 0)
      .to(menuLinks, { autoAlpha: 0, yPercent: 40, stagger: 0.04, duration: 0.45 }, 0.05)
      // Panels wipe back out, staggered the same way
      .to(bgPanels, { xPercent: 101, stagger: 0.06, duration: 0.7 }, 0.1)
      // Overlay fades + button label slides in tandem
      .to(overlay, { autoAlpha: 0, duration: 0.5 }, 0.15)
      .to(menuButtonTexts, { yPercent: 0, duration: 0.5 }, 0.1)
      // Hide the wrap once everything has cleared
      .set(navWrap, { display: "none" });

    // Lottie arrow plays from current frame back to the closed frame. Fallback: rotate the static icon back.
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
