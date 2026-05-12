// -----------------------------------------
// DYNAMIC TEXT CURSOR (Edge Aware)
// Custom cursor that follows the pointer,
// shows text from hovered [data-cursor]
// elements. Flips position near edges.
// Global — lives outside Barba container.
// -----------------------------------------

const X_OFFSET = 6;
const Y_OFFSET = 140;

let cursorItem = null;
let cursorParagraph = null;
let xTo = null;
let yTo = null;
let currentTarget = null;
let lastText = '';
let bound = false;

function getCursorEdgeThreshold() {
  return cursorItem.offsetWidth + 16;
}

function onMouseMove(e) {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const scrollY = window.scrollY;
  const cursorX = e.clientX;
  const cursorY = e.clientY + scrollY;

  let xPercent = X_OFFSET;
  let yPercent = Y_OFFSET;

  if (cursorX > windowWidth - getCursorEdgeThreshold()) {
    xPercent = -100;
  }

  if (cursorY > scrollY + windowHeight * 0.9) {
    yPercent = -120;
  }

  // Event delegation — check if mouse is over a [data-cursor] element
  const hit = e.target.closest("[data-cursor]");
  if (hit !== currentTarget) {
    currentTarget = hit;
    if (hit) {
      const newText = hit.getAttribute("data-cursor");
      if (newText !== lastText) {
        cursorParagraph.innerHTML = newText;
        lastText = newText;
      }
    }
  }

  gsap.to(cursorItem, { xPercent, yPercent, duration: 0.9, ease: "power3" });
  xTo(cursorX);
  yTo(cursorY - scrollY);
}

export function initCursorMarquee() {
  if (bound) return; // already running — global, init once

  cursorItem = document.querySelector(".cursor");
  if (!cursorItem || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  cursorParagraph = cursorItem.querySelector("p");
  if (!cursorParagraph) return;

  gsap.set(cursorItem, { xPercent: X_OFFSET, yPercent: Y_OFFSET });

  xTo = gsap.quickTo(cursorItem, "x", { ease: "power3" });
  yTo = gsap.quickTo(cursorItem, "y", { ease: "power3" });

  window.addEventListener("mousemove", onMouseMove, { passive: true });
  bound = true;
}

export function destroyCursorMarquee() {
  // Global cursor — don't tear down on page transitions.
  // Just reset hover state so stale targets don't persist.
  currentTarget = null;
  lastText = '';
}
