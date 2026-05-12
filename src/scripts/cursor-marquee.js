// -----------------------------------------
// DYNAMIC TEXT CURSOR (Edge Aware)
// Custom cursor that follows the pointer,
// shows text from hovered [data-cursor]
// elements. Flips position near edges.
// Runs via DOMContentLoaded, independent of Barba.
// -----------------------------------------

function initDynamicCustomTextCursor() {
  let cursorItem = document.querySelector(".cursor");
  if (!cursorItem) return;

  let cursorParagraph = cursorItem.querySelector("p");
  if (!cursorParagraph) return;

  let targets = document.querySelectorAll("[data-cursor]");
  let xOffset = 6;
  let yOffset = 140;
  let cursorIsOnRight = false;
  let currentTarget = null;
  let lastText = '';

  gsap.set(cursorItem, { xPercent: xOffset, yPercent: yOffset });

  let xTo = gsap.quickTo(cursorItem, "x", { ease: "power3" });
  let yTo = gsap.quickTo(cursorItem, "y", { ease: "power3" });

  const getCursorEdgeThreshold = () => {
    return cursorItem.offsetWidth + 16;
  };

  window.addEventListener("mousemove", e => {
    let windowWidth = window.innerWidth;
    let windowHeight = window.innerHeight;
    let scrollY = window.scrollY;
    let cursorX = e.clientX;
    let cursorY = e.clientY + scrollY;

    let xPercent = xOffset;
    let yPercent = yOffset;

    let cursorEdgeThreshold = getCursorEdgeThreshold();
    if (cursorX > windowWidth - cursorEdgeThreshold) {
      cursorIsOnRight = true;
      xPercent = -100;
    } else {
      cursorIsOnRight = false;
    }

    if (cursorY > scrollY + windowHeight * 0.9) {
      yPercent = -120;
    }

    if (currentTarget) {
      let newText = currentTarget.getAttribute("data-cursor");
      if (newText !== lastText) {
        cursorParagraph.innerHTML = newText;
        lastText = newText;
        cursorEdgeThreshold = getCursorEdgeThreshold();
      }
    }

    gsap.to(cursorItem, { xPercent: xPercent, yPercent: yPercent, duration: 0.9, ease: "power3" });
    xTo(cursorX);
    yTo(cursorY - scrollY);
  });

  targets.forEach(target => {
    target.addEventListener("mouseenter", () => {
      currentTarget = target;

      let newText = target.getAttribute("data-cursor");
      if (newText !== lastText) {
        cursorParagraph.innerHTML = newText;
        lastText = newText;
      }
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initDynamicCustomTextCursor();
});

// Keep exports so transitions.js doesn't break
export function initCursorMarquee() {}
export function destroyCursorMarquee() {}
