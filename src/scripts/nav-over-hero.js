// -----------------------------------------
// NAV OVER HERO — contextual background when the nav sits over a hero element
//
// Toggles a body-level attribute (`data-nav-over-hero`) based on whether the
// page is currently scrolled within a designated hero zone. CSS reacts to the
// attribute and applies whatever background the nav needs for legibility.
//
// Built for the home page's sticky video pattern: while the video is still
// visible behind the nav, the nav needs SOMETHING for legibility — but once
// the user scrolls past the video and the hero text content covers the area
// behind the nav, the nav can go transparent again (as designed).
// -----------------------------------------
// Attribute contract:
//   [data-nav-over-hero-trigger]  — the element whose visible zone defines the
//                                   "over hero" range. While the user has
//                                   scrolled less than this element's height
//                                   from its top, the body carries
//                                   data-nav-over-hero="true".
//
// Defaults to the first element matching the trigger attribute. The element
// can be any visible block — typically the home page's video section.
//
// CSS to apply (page-head custom code):
//   body[data-nav-over-hero="true"] [data-nav] {
//     background-color: <whatever fits the video>;
//     transition: background-color 0.3s ease;
//   }
//
// -----------------------------------------

let tickerFn = null;
let triggerEl = null;
let lastState = null;
let cachedNaturalBottom = 0;
let resizeObserver = null;
let resizeFn = null;

// Walk the offsetParent chain to compute an element's document-absolute top.
// offsetTop is relative to offsetParent, so we sum across the chain to get
// the actual page-y position — works for sticky elements too, because
// offsetTop reflects NATURAL layout position, not the sticky-pinned position.
function getDocumentTop(el) {
  let top = 0;
  let current = el;
  while (current && current !== document.body && current !== document.documentElement) {
    top += current.offsetTop || 0;
    current = current.offsetParent;
  }
  return top;
}

// Measure the actual nav element so we can extend the bg-release point by its
// height. By the time scrollY crosses (triggerBottom + navHeight), the section
// below has already crossed UNDER the nav — so when the bg snaps off, there's
// already a solid background behind the nav and the flip is invisible.
// .sidenav matches Buff's nav selector; fallback walks common alternatives.
function getNavHeight() {
  const nav = document.querySelector('.sidenav')
    || document.querySelector('.nav')
    || document.querySelector('[data-nav]');
  if (nav) return nav.offsetHeight;
  // CSS variable fallback if no nav element is queryable
  const val = getComputedStyle(document.documentElement).getPropertyValue('--nav-height');
  return val ? parseInt(val, 10) : 0;
}

function recomputeNaturalBottom() {
  if (!triggerEl) return;
  cachedNaturalBottom = getDocumentTop(triggerEl) + triggerEl.offsetHeight + getNavHeight();
}

export function initNavOverHero(scope) {
  scope = scope || document;
  // Look in scope first (Barba-aware) then fall back to document — the trigger
  // element may live in a global header outside the Barba container.
  triggerEl = scope.querySelector("[data-nav-over-hero-trigger]")
    || document.querySelector("[data-nav-over-hero-trigger]");
  if (!triggerEl) return;

  recomputeNaturalBottom();

  // Recompute on resize — viewport changes affect the 100svh-sized trigger,
  // and any layout shift above the trigger affects its offsetTop. Cheap.
  resizeFn = () => recomputeNaturalBottom();
  window.addEventListener("resize", resizeFn, { passive: true });
  if (typeof ResizeObserver !== "undefined") {
    resizeObserver = new ResizeObserver(recomputeNaturalBottom);
    resizeObserver.observe(triggerEl);
  }

  // Use gsap.ticker rather than scroll events so we share the same RAF cycle
  // as Lenis + the rest of the bundle's tweens.
  //
  // Comparison is scrollY vs the trigger's NATURAL document-bottom (NOT its
  // getBoundingClientRect, which returns the sticky-pinned position and would
  // tell us "still in view" all the way down the page). Once the user has
  // scrolled past the trigger's natural footprint, the hero text (or
  // whatever's below) is now under the nav and the nav bg is no longer needed.
  tickerFn = () => {
    const overHero = window.scrollY < cachedNaturalBottom;
    if (overHero === lastState) return; // only flip when state actually changes
    lastState = overHero;
    document.body.setAttribute("data-nav-over-hero", overHero ? "true" : "false");
  };

  // Run once to set initial state, then attach to the ticker.
  tickerFn();
  gsap.ticker.add(tickerFn);
}

export function destroyNavOverHero() {
  if (tickerFn) {
    gsap.ticker.remove(tickerFn);
    tickerFn = null;
  }
  if (resizeFn) {
    window.removeEventListener("resize", resizeFn);
    resizeFn = null;
  }
  if (resizeObserver) {
    resizeObserver.disconnect();
    resizeObserver = null;
  }
  triggerEl = null;
  lastState = null;
  cachedNaturalBottom = 0;
  document.body.removeAttribute("data-nav-over-hero");
}
