// -----------------------------------------
// FIXED UNDERLAY NAVIGATION
// Menu sits behind page content at z:1,
// page slides left to reveal it.
// From Osmo's underlay nav pattern.
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

  if (!toggleBtn || !menuEl || !mainEl || !overlayEl) return;

  const closedColor = getComputedStyle(toggleBtn).color;
  const openColor = getComputedStyle(menuEl).color;

  isOpen = false;

  const getMenuOffset = () => -menuEl.offsetWidth;

  gsap.set(overlayEl, { visibility: "hidden", pointerEvents: "none" });
  gsap.set(darkEl, { autoAlpha: 0 });
  gsap.set(mainEl, { x: 0 });
  gsap.set(toggleLabels, { yPercent: 0 });
  gsap.set(toggleBars, { y: 0, rotation: 0 });
  gsap.set(menuBorder, { scaleX: 0 });
  gsap.set(overlayBorders[0], { yPercent: -100 });
  gsap.set(overlayBorders[1], { yPercent: 100 });
  gsap.set(corners, { scale: 0 });

  tl = gsap.timeline({
    paused: true,
    defaults: {
      ease: "energy",
      easeReverse: "power2.inOut"
    }
  });

  tl.set(overlayEl, { visibility: "visible", pointerEvents: "auto" }, 0);

  tl.to([mainEl, overlayEl], {
    x: getMenuOffset,
    duration: 0.7,
  }, 0)

  .to(darkEl, {
    autoAlpha: 1,
    duration: 0.5,
  }, 0)

  .to(corners, {
    scale: 1,
    duration: 0.5,
  }, 0)

  .to(overlayBorders, {
    yPercent: 0,
    duration: 0.5,
  }, 0)

  .to(toggleLabels, {
    yPercent: -100,
    duration: 0.4,
  }, 0)

  .to(toggleBtn, {
    color: openColor,
    duration: 0.4,
  }, 0)

  .to(toggleBars[0], {
    y: "0.25em",
    rotation: 45,
    duration: 0.35,
    ease: "back.out(1.4)",
    easeReverse: "power3.out",
  }, 0.05)

  .to(toggleBars[1], {
    y: "-0.25em",
    rotation: -45,
    duration: 0.35,
    ease: "back.out(1.4)",
    easeReverse: "power3.out",
  }, 0.05)

  .fromTo(largeItems,
    { autoAlpha: 0, xPercent: 25 },
    {
      autoAlpha: 1,
      xPercent: 0,
      duration: 0.7,
      stagger: 0.05,
    },
    0
  )

  .fromTo(smallItems,
    { autoAlpha: 0, yPercent: 100 },
    {
      autoAlpha: 1,
      yPercent: 0,
      duration: 0.5,
      stagger: 0.03,
      ease: "power3.out"
    },
    0.3
  )

  .to(menuBorder, {
    scaleX: 1,
    duration: 0.5,
  }, "<");

  enterEndTime = tl.duration();

  tl.addPause();

  tl.to([largeItems, smallItems], {
    autoAlpha: 0,
    duration: 0.3,
  }, "<")

  .to([mainEl, overlayEl], {
    x: 0,
    duration: 0.6,
  }, "<")

  .to(darkEl, {
    autoAlpha: 0,
    duration: 0.35,
    ease: "power2.inOut",
  }, "<")

  .to(corners, {
    scale: 0,
    duration: 0.5,
  }, "<")

  .to(overlayBorders[0], {
    yPercent: -100,
    duration: 0.5,
  }, "<")

  .to(overlayBorders[1], {
    yPercent: 100,
    duration: 0.5,
  }, "<")

  .to(toggleBtn, {
    color: closedColor,
    duration: 0.25,
  }, "<+=0.1")

  .to(toggleLabels, {
    yPercent: 0,
    duration: 0.25,
    ease: "power3.in",
  }, "<")

  .to(toggleBars, {
    y: 0,
    rotation: 0,
    duration: 0.25,
    ease: "power3.in",
  }, "<")

  .set(overlayEl, {
    visibility: "hidden",
    pointerEvents: "none"
  });

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
        gsap.set([mainEl, overlayEl], { x: getMenuOffset() });
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
