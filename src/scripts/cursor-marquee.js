// -----------------------------------------
// DYNAMIC TEXT CURSOR (Edge Aware)
// Custom cursor that follows the pointer,
// shows text from hovered [data-cursor]
// elements. Flips position near edges.
// -----------------------------------------

const X_OFFSET = 6;
const Y_OFFSET = 140;

let cursorItem = null;
let cursorParagraph = null;
let targets = [];
let xTo = null;
let yTo = null;
let currentTarget = null;
let lastText = '';
let moveBound = null;
let enterHandlers = [];

function getCursorEdgeThreshold() {
  return cursorItem.offsetWidth + 16;
}

function onPointerMove(e) {
  const windowWidth = window.innerWidth;
  const windowHeight = window.innerHeight;
  const scrollY = window.scrollY;
  const cursorX = e.clientX;
  const cursorY = e.clientY + scrollY;

  let xPercent = X_OFFSET;
  let yPercent = Y_OFFSET;

  // Flip X when cursor + label would overflow right edge
  if (cursorX > windowWidth - getCursorEdgeThreshold()) {
    xPercent = -100;
  }

  // Flip Y when in the bottom 10% of the viewport
  if (cursorY > scrollY + windowHeight * 0.9) {
    yPercent = -120;
  }

  // Update text if target changed
  if (currentTarget) {
    const newText = currentTarget.getAttribute("data-cursor");
    if (newText !== lastText) {
      cursorParagraph.innerHTML = newText;
      lastText = newText;
    }
  }

  gsap.to(cursorItem, { xPercent, yPercent, duration: 0.9, ease: "power3" });
  xTo(cursorX);
  yTo(cursorY - scrollY);
}

export function initCursorMarquee() {
  cursorItem = document.querySelector(".cursor");
  if (!cursorItem || !window.matchMedia("(hover: hover) and (pointer: fine)").matches) return;

  cursorParagraph = cursorItem.querySelector("p");
  if (!cursorParagraph) return;

  targets = [...document.querySelectorAll("[data-cursor]")];

  gsap.set(cursorItem, { xPercent: X_OFFSET, yPercent: Y_OFFSET });

  xTo = gsap.quickTo(cursorItem, "x", { ease: "power3" });
  yTo = gsap.quickTo(cursorItem, "y", { ease: "power3" });

  moveBound = onPointerMove;
  window.addEventListener("mousemove", moveBound, { passive: true });

  // Bind mouseenter per target
  enterHandlers = targets.map(target => {
    const handler = () => {
      currentTarget = target;
      const newText = target.getAttribute("data-cursor");
      if (newText !== lastText) {
        cursorParagraph.innerHTML = newText;
        lastText = newText;
      }
    };
    target.addEventListener("mouseenter", handler);
    return { target, handler };
  });
}

export function destroyCursorMarquee() {
  if (moveBound) window.removeEventListener("mousemove", moveBound);
  enterHandlers.forEach(({ target, handler }) => {
    target.removeEventListener("mouseenter", handler);
  });
  cursorItem = null;
  cursorParagraph = null;
  targets = [];
  xTo = null;
  yTo = null;
  currentTarget = null;
  lastText = '';
  moveBound = null;
  enterHandlers = [];
}
