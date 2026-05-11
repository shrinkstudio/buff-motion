// -----------------------------------------
// CURSOR MARQUEE EFFECT
// Custom cursor that follows the pointer with
// marquee text, activated by hovering elements
// with data-cursor-marquee-text="Your Text"
// -----------------------------------------

const HOVER_OUT_DELAY = 0.4;
const FOLLOW_DURATION = 0.4;
const SPEED_MULTIPLIER = 5;

let cursor = null;
let targets = [];
let xTo = null;
let yTo = null;
let pauseTimeout = null;
let activeEl = null;
let lastX = 0;
let lastY = 0;
let moveBound = null;
let scrollBound = null;

function playFor(el) {
  if (!el) return;
  if (pauseTimeout) clearTimeout(pauseTimeout);
  const text = el.getAttribute("data-cursor-marquee-text") || "";
  const sec = (text.length || 1) / SPEED_MULTIPLIER;
  targets.forEach((t) => {
    t.textContent = text;
    t.style.animationPlayState = "running";
    t.style.animationDuration = sec + "s";
  });
  cursor.setAttribute("data-cursor-marquee-status", "active");
  activeEl = el;
}

function pauseLater() {
  cursor.setAttribute("data-cursor-marquee-status", "not-active");
  if (pauseTimeout) clearTimeout(pauseTimeout);
  pauseTimeout = setTimeout(() => {
    targets.forEach((t) => {
      t.style.animationPlayState = "paused";
    });
  }, HOVER_OUT_DELAY * 1000);
  activeEl = null;
}

function checkTarget() {
  const el = document.elementFromPoint(lastX, lastY);
  const hit = el && el.closest("[data-cursor-marquee-text]");
  if (hit !== activeEl) {
    if (activeEl) pauseLater();
    if (hit) playFor(hit);
  }
}

function onPointerMove(e) {
  lastX = e.clientX;
  lastY = e.clientY;
  xTo(lastX);
  yTo(lastY);
  checkTarget();
}

function onScroll() {
  xTo(lastX);
  yTo(lastY);
  checkTarget();
}

export function initCursorMarquee() {
  cursor = document.querySelector("[data-cursor-marquee-status]");
  if (!cursor) return;
  targets = cursor.querySelectorAll("[data-cursor-marquee-text-target]");

  xTo = gsap.quickTo(cursor, "x", { duration: FOLLOW_DURATION, ease: "power3" });
  yTo = gsap.quickTo(cursor, "y", { duration: FOLLOW_DURATION, ease: "power3" });

  moveBound = onPointerMove;
  scrollBound = onScroll;

  window.addEventListener("pointermove", moveBound, { passive: true });
  window.addEventListener("scroll", scrollBound, { passive: true });

  setTimeout(() => {
    cursor.setAttribute("data-cursor-marquee-status", "not-active");
  }, 500);
}

export function destroyCursorMarquee() {
  if (moveBound) window.removeEventListener("pointermove", moveBound);
  if (scrollBound) window.removeEventListener("scroll", scrollBound);
  if (pauseTimeout) clearTimeout(pauseTimeout);
  cursor = null;
  targets = [];
  xTo = null;
  yTo = null;
  moveBound = null;
  scrollBound = null;
  activeEl = null;
  pauseTimeout = null;
}
