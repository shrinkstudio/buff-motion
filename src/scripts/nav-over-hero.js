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

export function initNavOverHero(scope) {
  scope = scope || document;
  // Look in scope first (Barba-aware) then fall back to document — the trigger
  // element may live in a global header outside the Barba container.
  triggerEl = scope.querySelector("[data-nav-over-hero-trigger]")
    || document.querySelector("[data-nav-over-hero-trigger]");
  if (!triggerEl) return;

  // Use gsap.ticker rather than scroll events so we share the same RAF cycle
  // as Lenis + the rest of the bundle's tweens. One frame, one read.
  tickerFn = () => {
    // The trigger element's "in-view" zone is its position from the top of
    // the document down to its bottom edge. While scrollY is within that
    // range, the user is still over the hero — nav needs a bg.
    //
    // Using getBoundingClientRect().bottom against the viewport top (0) is
    // the most robust read: it works whether the trigger is statically
    // positioned, sticky-pinned, or transformed. The trigger is "still
    // visible from the top" as long as its bottom edge is below the
    // viewport top.
    const bottom = triggerEl.getBoundingClientRect().bottom;
    const overHero = bottom > 0;
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
  triggerEl = null;
  lastState = null;
  document.body.removeAttribute("data-nav-over-hero");
}
