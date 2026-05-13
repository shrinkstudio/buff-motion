// -----------------------------------------
// FIXED UNDERLAY NAVIGATION
// Menu sits behind page content at z:1,
// page slides left to reveal it.
// Lottie arrow button + background squiggle.
// -----------------------------------------

let toggleBtn = null;
let overlayEl = null;
let isOpen = false;
let tl = null;
let enterEndTime = 0;
let resizeTimer = null;
let toggleHandler = null;
let overlayHandler = null;
let keyHandler = null;
let resizeHandler = null;
let arrowLottie = null;
let bgLottie = null;

// Prevent menu flash on load — CSS injected before JS init
(function injectUnderlayCSS() {
  if (document.getElementById("underlay-nav-defaults")) return;
  const style = document.createElement("style");
  style.id = "underlay-nav-defaults";
  style.textContent = `
    .underlay-nav__overlay { visibility: hidden; pointer-events: none; }
    .underlay-nav [data-reveal-l],
    .underlay-nav [data-reveal-s] { opacity: 0; visibility: hidden; }
    .underlay-nav__bottom-border { transform: scaleX(0); }
    .underlay-nav__dark { opacity: 0; }
    .underlay-nav__menu { visibility: hidden; }
    [data-nav-lottie-bg] { opacity: 0; }
  `;
  document.head.appendChild(style);
})();

// -----------------------------------------
// LOTTIE HELPERS
// -----------------------------------------

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

// -----------------------------------------
// INIT
// -----------------------------------------

export function initUnderlayNav() {
  toggleBtn = document.querySelector("[data-underlay-nav-toggle]");
  const toggleLabels = document.querySelectorAll(".underlay-nav__toggle-label");
  const toggleBars = document.querySelectorAll(".underlay-nav__toggle-bar");
  const menuEl = document.querySelector("[data-underlay-nav-menu]");
  const largeItems = document.querySelectorAll("[data-reveal-l]");
  const smallItems = document.querySelectorAll("[data-reveal-s]");
  const menuBorder = document.querySelector(".underlay-nav__bottom-border");
  const mainEl = document.querySelector("[data-main]");
  overlayEl = document.querySelector("[data-underlay-nav-overlay]");
  const darkEl = document.querySelector(".underlay-nav__dark");
  const corners = document.querySelectorAll(".underlay-nav__corner");
  const overlayBorders = document.querySelectorAll(".underlay-nav__border-row");
  const navBanner = document.querySelector("[data-nav-banner]");
  const arrowEl = document.querySelector("[data-nav-lottie-arrow]");
  const bgEl = document.querySelector("[data-nav-lottie-bg]");

  if (!toggleBtn || !menuEl || !mainEl || !overlayEl) return;

  // Load Lotties
  arrowLottie = loadNavLottie(arrowEl);
  bgLottie = loadNavLottie(bgEl);

  // Arrow starts at frame 35 (closed state)
  if (arrowLottie) {
    arrowLottie.addEventListener("DOMLoaded", () => {
      arrowLottie.goToAndStop(35, true);
    });
  }

  const closedColor = getComputedStyle(toggleBtn).color;
  const openColor = getComputedStyle(menuEl).color;

  isOpen = false;

  const getMenuOffset = () => -menuEl.offsetWidth;

  // --- Initial states ---
  gsap.set(overlayEl, { visibility: "hidden", pointerEvents: "none" });
  gsap.set(darkEl, { autoAlpha: 0 });
  gsap.set(mainEl, { x: 0 });
  if (navBanner) gsap.set(navBanner, { x: 0 });
  gsap.set(toggleLabels, { yPercent: 0 });
  gsap.set(toggleBars, { y: 0, rotation: 0 });
  if (menuBorder) gsap.set(menuBorder, { scaleX: 0 });
  gsap.set(overlayBorders[0], { yPercent: -100 });
  gsap.set(overlayBorders[1], { yPercent: 100 });
  gsap.set(corners, { scale: 0 });

  // --- Build timeline ---
  tl = gsap.timeline({
    paused: true,
    defaults: {
      ease: "buff",
    }
  });

  const slideEls = navBanner ? [mainEl, overlayEl, navBanner] : [mainEl, overlayEl];

  // Show menu + overlay
  tl.set(overlayEl, { visibility: "visible", pointerEvents: "auto" }, 0);
  tl.set(menuEl, { visibility: "visible" }, 0);

  // Page slides left to reveal menu
  tl.to(slideEls, {
    x: getMenuOffset,
    duration: 0.7,
  }, 0)

  // Dark overlay fades in
  .to(darkEl, {
    autoAlpha: 1,
    duration: 0.5,
  }, 0)

  // Corner radius scales in
  .to(corners, {
    scale: 1,
    duration: 0.5,
  }, 0)

  // Border rows slide in
  .to(overlayBorders, {
    yPercent: 0,
    duration: 0.5,
  }, 0)

  // Toggle label slides up (Menu → Close)
  .to(toggleLabels, {
    yPercent: -100,
    duration: 0.4,
  }, 0)

  // Toggle button color changes
  .to(toggleBtn, {
    color: openColor,
    duration: 0.4,
  }, 0)

  // Toggle bars animate to X
  .to(toggleBars[0], {
    y: "0.25em",
    rotation: 45,
    duration: 0.35,
    ease: "back.out(1.4)",
  }, 0.05)

  .to(toggleBars[1], {
    y: "-0.25em",
    rotation: -45,
    duration: 0.35,
    ease: "back.out(1.4)",
  }, 0.05)

  // Nav links animate in from top — buff ease, staggered
  .fromTo(largeItems,
    { autoAlpha: 0, yPercent: -40 },
    {
      autoAlpha: 1,
      yPercent: 0,
      duration: 0.6,
      stagger: 0.06,
      ease: "buff",
    },
    0.15
  )

  // Small items (socials, quick links) fade up
  .fromTo(smallItems,
    { autoAlpha: 0, yPercent: 50 },
    {
      autoAlpha: 1,
      yPercent: 0,
      duration: 0.5,
      stagger: 0.03,
      ease: "buff",
    },
    0.35
  )

  // Bottom border scales in
  if (menuBorder) {
    tl.to(menuBorder, {
      scaleX: 1,
      duration: 0.5,
    }, "<");
  }

  // BG lottie fades in
  if (bgEl) {
    tl.to(bgEl, {
      autoAlpha: 1,
      duration: 0.4,
    }, 0.1);
  }

  // Lottie callbacks — fire during timeline
  tl.call(() => {
    if (arrowLottie) {
      arrowLottie.setDirection(1);
      arrowLottie.goToAndPlay(35, true);
    }
    if (bgLottie) {
      bgLottie.goToAndPlay(0, true);
    }
  }, null, 0);

  enterEndTime = tl.duration();

  // --- Close phase (after addPause) ---
  tl.addPause();

  // Items fade out
  tl.to([largeItems, smallItems], {
    autoAlpha: 0,
    duration: 0.25,
  }, "<")

  // BG lottie fades out
  if (bgEl) {
    tl.to(bgEl, {
      autoAlpha: 0,
      duration: 0.25,
    }, "<");
  }

  // Page slides back
  tl.to(slideEls, {
    x: 0,
    duration: 0.6,
    ease: "power2.inOut",
  }, "<")

  // Dark overlay fades
  .to(darkEl, {
    autoAlpha: 0,
    duration: 0.35,
    ease: "power2.inOut",
  }, "<")

  // Corners scale out
  .to(corners, {
    scale: 0,
    duration: 0.5,
  }, "<")

  // Border rows slide out
  .to(overlayBorders[0], {
    yPercent: -100,
    duration: 0.5,
  }, "<")

  .to(overlayBorders[1], {
    yPercent: 100,
    duration: 0.5,
  }, "<")

  // Toggle button color back
  .to(toggleBtn, {
    color: closedColor,
    duration: 0.25,
  }, "<+=0.1")

  // Toggle labels back
  .to(toggleLabels, {
    yPercent: 0,
    duration: 0.25,
    ease: "power3.in",
  }, "<")

  // Toggle bars back
  .to(toggleBars, {
    y: 0,
    rotation: 0,
    duration: 0.25,
    ease: "power3.in",
  }, "<")

  // Hide overlay + menu
  .set(overlayEl, {
    visibility: "hidden",
    pointerEvents: "none"
  })

  .set(menuEl, {
    visibility: "hidden"
  });

  // Border reset
  if (menuBorder) {
    tl.set(menuBorder, { scaleX: 0 });
  }

  // --- Event handlers ---

  function toggle() {
    isOpen = !isOpen;
    toggleBtn.setAttribute("aria-expanded", String(isOpen));
    toggleBtn.setAttribute("aria-label", isOpen ? "close menu" : "open menu");
    document.body.setAttribute("data-menu-status", isOpen ? "open" : "");

    if (isOpen) {
      tl.invalidate();
      if (tl.time() >= enterEndTime) tl.timeScale(1).restart();
      else tl.timeScale(1).play();
    } else {
      // Reverse arrow Lottie on close
      if (arrowLottie) {
        arrowLottie.setDirection(-1);
        arrowLottie.play();
      }

      if (tl.time() < enterEndTime) tl.timeScale(1).reverse();
      else tl.timeScale(1).play();
    }
  }

  toggleHandler = toggle;
  toggleBtn.addEventListener("click", toggleHandler);

  overlayHandler = () => { if (isOpen) toggle(); };
  overlayEl.addEventListener("click", overlayHandler);

  keyHandler = (e) => {
    if (e.key === "Escape" && isOpen) {
      toggle();
      toggleBtn.focus();
    }
  };
  document.addEventListener("keydown", keyHandler);

  resizeHandler = () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      if (isOpen) {
        gsap.set(slideEls, { x: getMenuOffset() });
      } else {
        tl.invalidate();
      }
    }, 150);
  };
  window.addEventListener("resize", resizeHandler);
}

export function destroyUnderlayNav() {
  if (toggleBtn && toggleHandler) toggleBtn.removeEventListener("click", toggleHandler);
  if (overlayEl && overlayHandler) overlayEl.removeEventListener("click", overlayHandler);
  if (keyHandler) document.removeEventListener("keydown", keyHandler);
  if (resizeHandler) window.removeEventListener("resize", resizeHandler);
  if (tl) { tl.kill(); tl = null; }
  if (arrowLottie) { arrowLottie.destroy(); arrowLottie = null; }
  if (bgLottie) { bgLottie.destroy(); bgLottie = null; }
  clearTimeout(resizeTimer);
  toggleBtn = null;
  overlayEl = null;
  isOpen = false;
  enterEndTime = 0;
  toggleHandler = null;
  overlayHandler = null;
  keyHandler = null;
  resizeHandler = null;
}
