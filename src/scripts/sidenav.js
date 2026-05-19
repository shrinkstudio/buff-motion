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
//   [data-nav-lottie-arrow] + [data-lottie-src]  — optional Lottie arrow inside the button
//                                                  Holds at frame 35, plays fwd on open, reverses on close.

let tl = null;
let navWrap = null;
let toggleHandlers = [];
let keyHandler = null;
let arrowLottie = null;

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

  // Register the sidenav-specific ease (idempotent) without touching global gsap defaults
  if (typeof CustomEase !== "undefined" && !gsap.parseEase("sidenav")) {
    CustomEase.create("sidenav", "0.65, 0.01, 0.05, 0.99");
  }

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

  // Load arrow Lottie + hold at the configured "closed" frame (default 35).
  // Override per-element via [data-lottie-frame="N"] on the Lottie element.
  const closedFrame = arrowLottieEl
    ? parseInt(arrowLottieEl.getAttribute("data-lottie-frame") || "35", 10)
    : 35;
  arrowLottie = loadNavLottie(arrowLottieEl);
  if (arrowLottie) {
    arrowLottie.addEventListener("DOMLoaded", () => arrowLottie.goToAndStop(closedFrame, true));
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // Timeline-scoped defaults — does not override global gsap defaults ("buff" ease)
  tl = gsap.timeline({ defaults: { ease: "sidenav", duration: 0.7 } });

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
      .fromTo(menuButtonTexts, { yPercent: 0 }, { yPercent: -100, stagger: 0.2 })
      .fromTo(overlay, { autoAlpha: 0 }, { autoAlpha: 1 }, "<")
      .fromTo(bgPanels, { xPercent: 101 }, { xPercent: 0, stagger: 0.12, duration: 0.575 }, "<")
      .fromTo(menuLinks, { yPercent: 140, rotate: 10 }, { yPercent: 0, rotate: 0, stagger: 0.05 }, "<+=0.35")
      .fromTo(fadeTargets, { autoAlpha: 0, yPercent: 50 }, { autoAlpha: 1, yPercent: 0, stagger: 0.04 }, "<+=0.2");

    // Lottie arrow plays forward from the configured closed frame. Fallback: rotate the static icon.
    if (arrowLottie) {
      tl.call(() => {
        arrowLottie.setDirection(1);
        arrowLottie.goToAndPlay(closedFrame, true);
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
      .to(overlay, { autoAlpha: 0 })
      .to(menu, { xPercent: 120 }, "<")
      .to(menuButtonTexts, { yPercent: 0 }, "<")
      .set(navWrap, { display: "none" });

    // Lottie arrow plays in reverse on close. Fallback: rotate the static icon back.
    if (arrowLottie) {
      tl.call(() => {
        arrowLottie.setDirection(-1);
        arrowLottie.play();
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
  navWrap = null;
}
