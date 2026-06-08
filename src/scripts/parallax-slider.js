// -----------------------------------------
// PARALLAX IMAGE SLIDER — Smooothy + GSAP
// Smooothy-driven horizontal slider with per-slide parallax layer translation.
// Each frame, Smooothy's onUpdate hands us parallaxValues per slide; we clamp
// them and translateX an inner [data-parallax-inner] element accordingly.
// -----------------------------------------
// Attributes:
//   [data-parallax-init]      — root scope (each root can hold one slider)
//   [data-parallax-slider]    — Smooothy wrapper (slides are direct children)
//   [data-parallax-inner]     — inner element per slide that receives the parallax
//   [data-parallax-amount]    — parallax multiplier (default: 12)
//   [data-parallax-snap]      — "false" to disable snapping (default: on)
//   [data-parallax-infinite]  — "false" to disable infinite loop (default: on)
//   [data-parallax-lerp]      — slider lerp factor (default: 0.3)
//
// Requires Smooothy loaded globally (window.Smooothy). Add via Webflow site
// head custom code:
//   <script src="https://cdn.jsdelivr.net/npm/smooothy@latest/dist/smooothy.umd.js"></script>

const MAX_OFFSET = 25;

let instances = [];

export function initParallaxSlider(scope) {
  scope = scope || document;

  if (typeof Smooothy === "undefined") {
    console.warn("[buff] Smooothy not loaded — skipping parallax slider init");
    return;
  }

  scope.querySelectorAll("[data-parallax-init]").forEach((root) => {
    const wrapper = root.querySelector("[data-parallax-slider]");
    if (!wrapper) return;

    // Skip if already initialised — guards against double-init when both a
    // scoped afterEnter call and an unscoped fallback hit the same element.
    if (wrapper._parallaxSlider) return;

    // One parallax inner per slide (optional — null entries are skipped per frame)
    const parallaxItems = [...wrapper.children].map(
      (slide) => slide.querySelector("[data-parallax-inner]")
    );

    const amountAttr = wrapper.getAttribute("data-parallax-amount");
    const amount = amountAttr !== null ? parseFloat(amountAttr) : 12;

    const snap = wrapper.getAttribute("data-parallax-snap") !== "false";
    const infinite = wrapper.getAttribute("data-parallax-infinite") !== "false";

    const lerpAttr = wrapper.getAttribute("data-parallax-lerp");
    const lerp = lerpAttr !== null ? parseFloat(lerpAttr) : 0.3;

    const slider = new Smooothy(wrapper, {
      infinite,
      snap,
      lerpFactor: lerp,
      onUpdate: ({ parallaxValues }) => {
        parallaxItems.forEach((item, i) => {
          if (!item) return;
          const offset = gsap.utils.clamp(
            -MAX_OFFSET,
            MAX_OFFSET,
            parallaxValues[i] * amount
          );
          item.style.transform = `translateX(${offset}%)`;
        });
      },
    });

    // Drive Smooothy off GSAP's ticker so it shares Lenis's RAF cycle rather
    // than running its own loop in parallel — keeps frame budget tight.
    const tickerFn = () => slider.update();
    gsap.ticker.add(tickerFn);

    // Stash on the DOM element so destroy can clean up + double-init can
    // short-circuit. Matches the pattern used by Swiper instances elsewhere.
    wrapper._parallaxSlider = slider;
    wrapper._parallaxTicker = tickerFn;

    instances.push({ wrapper, slider, tickerFn });
  });
}

export function destroyParallaxSlider() {
  instances.forEach(({ wrapper, slider, tickerFn }) => {
    gsap.ticker.remove(tickerFn);
    if (slider && typeof slider.destroy === "function") {
      slider.destroy();
    }
    // Clear inline transforms left by the last onUpdate so a future re-init
    // doesn't start from a non-baseline state.
    wrapper.querySelectorAll("[data-parallax-inner]").forEach((el) => {
      el.style.transform = "";
    });
    delete wrapper._parallaxSlider;
    delete wrapper._parallaxTicker;
  });
  instances = [];
}
