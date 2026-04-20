// -----------------------------------------
// ACCORDION (Shrink Boilerplate)
// Animated <details>/<summary> with GSAP fallback
// -----------------------------------------

let ctx = null;
let prefersReducedMotion = false;

try {
  const reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  prefersReducedMotion = reducedMotionQuery.matches;
  reducedMotionQuery.addEventListener("change", (e) => {
    prefersReducedMotion = e.matches;
  });
} catch (e) {
  prefersReducedMotion = false;
}

export function initAccordions(scope) {
  scope = scope || document;
  const detailsElements = scope.querySelectorAll("details");
  if (detailsElements.length === 0) return;

  // Use gsap.context for easy cleanup
  if (typeof gsap !== "undefined") {
    ctx = gsap.context(() => {
      setupAccordions(detailsElements);
    }, scope);
  } else {
    setupAccordions(detailsElements);
  }
}

function setupAccordions(detailsElements) {
  // Handle open attribute based on data-accordion-start-open
  detailsElements.forEach((details) => {
    if (details.hasAttribute("open")) {
      const startOpen = details.getAttribute("data-accordion-start-open");
      if (startOpen !== "true") {
        details.removeAttribute("open");
      }
    }
  });

  detailsElements.forEach((details) => {
    const summary = details.querySelector("summary");
    const content = details.querySelector("[data-accordion='content']");
    if (!summary || !content) return;

    // Set initial collapsed state
    const startOpen = details.getAttribute("data-accordion-start-open");
    if (startOpen !== "true") {
      if (typeof gsap !== "undefined") {
        gsap.set(content, { height: 0, overflow: "clip" });
      } else {
        content.style.height = "0px";
        content.style.overflow = "clip";
      }
    }

    summary.addEventListener("click", (event) => {
      const isClosing = details.hasAttribute("open");

      if (isClosing) {
        event.preventDefault();

        if (prefersReducedMotion) {
          details.removeAttribute("open");
        } else {
          content.style.height = `${content.scrollHeight}px`;
          content.offsetHeight; // force reflow

          if (typeof gsap !== "undefined") {
            gsap.to(content, {
              height: 0,
              duration: 0.4,
              ease: "power3.inOut",
              onComplete: () => {
                details.removeAttribute("open");
              },
            });
          } else {
            content.style.transition = "height 0.4s ease-in-out";
            content.style.height = "0px";
            setTimeout(() => {
              details.removeAttribute("open");
              content.style.transition = "";
            }, 400);
          }
        }
      }
    });

    details.addEventListener("toggle", () => {
      if (details.open) {
        const fullHeight = content.scrollHeight;

        if (prefersReducedMotion) {
          content.style.height = "auto";
        } else {
          if (typeof gsap !== "undefined") {
            gsap.to(content, {
              height: fullHeight,
              duration: 0.4,
              ease: "power3.out",
              onComplete: () => {
                content.style.height = "auto";
              },
            });
          } else {
            content.style.transition = "height 0.4s ease-out";
            content.style.height = `${fullHeight}px`;
            setTimeout(() => {
              content.style.height = "auto";
              content.style.transition = "";
            }, 400);
          }
        }
      }
    });
  });
}

export function destroyAccordions() {
  if (ctx) {
    ctx.revert();
    ctx = null;
  }
}
