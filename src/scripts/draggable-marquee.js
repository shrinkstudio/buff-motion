// -----------------------------------------
// DRAGGABLE MARQUEE — GSAP loop + Observer drag (Osmo pattern)
// Continuously-drifting image strip that clones its content to fill ANY
// viewport width (so there's never a gap on big/ultrawide screens), loops
// seamlessly, and responds to pointer/touch drag with momentum.
//
// Replaces the Smooothy parallax slider for the culture gallery. The reason
// for the switch: a finite static slider can't fill a viewport wider than its
// total content, leaving a gap on 4K/5K/6K. A marquee clones to fill, and the
// constant drift makes that repetition read as intentional rather than a bug.
// -----------------------------------------
// Reuses the EXISTING markup — no Webflow structure changes needed:
//   [data-parallax-init]      — root / viewport scope (.parallax-slider__group)
//   [data-parallax-slider]    — the 100vw full-bleed viewport (.parallax-slider__list)
//     › direct children       — the slides (.parallax-slider__item)
//
// Optional config attributes on [data-parallax-init] (all default sensibly):
//   data-marquee-duration     — seconds for one full content-length pass (default 30)
//   data-direction            — "left" (default) or "right" — initial drift
//   data-marquee-sensitivity  — drag velocity → timeScale factor (default 0.01)
//   data-marquee-multiplier   — max timeScale a fling can reach (default 40)
//
// Requires GSAP Observer plugin loaded globally. Add to Webflow site head:
//   <script src="https://cdn.jsdelivr.net/npm/gsap@3.15/dist/Observer.min.js" defer></script>
// -----------------------------------------

let instances = [];
let resizeHandler = null;
let resizeTimeout = null;
let lastWidth = typeof window !== "undefined" ? window.innerWidth : 0;
let lastScope = null;

function num(el, attr, fallback) {
  const v = parseFloat(el.getAttribute(attr));
  return Number.isFinite(v) ? v : fallback;
}

function buildMarquee(group) {
  if (typeof gsap === "undefined") return null;

  const viewport = group.querySelector("[data-parallax-slider]");
  if (!viewport) return null;

  // Original slides (fresh init = every child; guards against re-wrapping)
  const originalItems = Array.from(viewport.children).filter(
    (el) => el.nodeType === 1 && !el.hasAttribute("data-marquee-track")
  );
  if (!originalItems.length) return null;

  // Default 360s for one full content-length pass — a slow, stately drift
  // (client direction). Still overridable per-instance via data-marquee-duration.
  const duration = num(group, "data-marquee-duration", 360);
  const sensitivity = num(group, "data-marquee-sensitivity", 0.01);
  const multiplier = num(group, "data-marquee-multiplier", 40);
  const directionAttr = (group.getAttribute("data-direction") || "left").toLowerCase();
  const baseDirection = directionAttr === "right" ? -1 : 1;

  // The viewport (.parallax-slider__list) is already 100vw + overflow:hidden in
  // the Webflow CSS — perfect full-bleed clip. We add an inner TRACK that holds
  // the slides and is the single element GSAP translates. flex:none stops the
  // flex viewport from shrink-fitting the (wider-than-screen) track.
  const track = document.createElement("div");
  track.setAttribute("data-marquee-track", "");
  track.style.cssText = "display:flex;flex:none;width:max-content;will-change:transform;user-select:none;";
  originalItems.forEach((item) => track.appendChild(item));
  viewport.appendChild(track);

  const originalWidth = track.scrollWidth;
  const viewportWidth = viewport.getBoundingClientRect().width;
  if (!originalWidth || !viewportWidth) return null;

  // Clone the whole original set repeatedly until the track is at least one
  // full content-length WIDER than the viewport. That guarantees a seamless
  // wrap (looping x by -originalWidth lands clones exactly where originals
  // were) AND that the strip always overflows the screen → no gap, ever.
  let safety = 0;
  while (track.scrollWidth < viewportWidth + originalWidth && safety < 60) {
    originalItems.forEach((item) => {
      const clone = item.cloneNode(true);
      clone.setAttribute("data-marquee-clone", "");
      clone.setAttribute("aria-hidden", "true");
      track.appendChild(clone);
    });
    safety++;
  }

  const wrapX = gsap.utils.wrap(-originalWidth, 0);
  gsap.set(track, { x: 0 });

  const loop = gsap.to(track, {
    x: -originalWidth,
    duration,
    ease: "none",
    repeat: -1,
    modifiers: { x: (x) => wrapX(parseFloat(x)) + "px" },
  });

  const timeScale = { value: baseDirection };
  const applyTimeScale = () => {
    loop.timeScale(timeScale.value);
    group.setAttribute("data-direction", timeScale.value < 0 ? "right" : "left");
  };
  applyTimeScale();
  if (baseDirection < 0) loop.progress(1); // start reverse from the looped phase, no jump

  // Drag → momentum. Observer is optional: without it the strip still drifts,
  // it just isn't grabbable.
  let observer = null;
  if (typeof Observer !== "undefined") {
    if (gsap.registerPlugin) {
      try { gsap.registerPlugin(Observer); } catch (_) {}
    }
    observer = Observer.create({
      target: viewport,
      type: "pointer,touch",
      // lockAxis + no preventDefault → a vertical drag still scrolls the page
      // on mobile; only horizontal drags drive the marquee.
      lockAxis: true,
      tolerance: 10,
      onChangeX: (e) => {
        let v = gsap.utils.clamp(-multiplier, multiplier, e.velocityX * -sensitivity);
        gsap.killTweensOf(timeScale);
        const resting = v < 0 ? -1 : 1; // fling sets the ongoing drift direction
        gsap.timeline({ onUpdate: applyTimeScale })
          .to(timeScale, { value: v, duration: 0.1, overwrite: true })
          .to(timeScale, { value: resting, duration: 1.0 });
      },
    });
  }

  // Pause the loop (and drag) while off-screen — no wasted RAF churn.
  let st = null;
  if (typeof ScrollTrigger !== "undefined") {
    st = ScrollTrigger.create({
      trigger: group,
      start: "top bottom",
      end: "bottom top",
      onEnter: () => { loop.resume(); applyTimeScale(); observer && observer.enable(); },
      onEnterBack: () => { loop.resume(); applyTimeScale(); observer && observer.enable(); },
      onLeave: () => { loop.pause(); observer && observer.disable(); },
      onLeaveBack: () => { loop.pause(); observer && observer.disable(); },
    });
  }

  return { group, viewport, track, originalItems, loop, observer, st };
}

export function initDraggableMarquee(scope) {
  scope = scope || document;
  if (typeof gsap === "undefined") return;

  const groups = scope.querySelectorAll("[data-parallax-init]");
  if (!groups.length) return;

  groups.forEach((group) => {
    const inst = buildMarquee(group);
    if (inst) instances.push(inst);
  });

  // Re-measure + re-clone on viewport-width change (a strip cloned for 1440px
  // won't have enough copies to fill 5K). Debounced, width-delta-gated to
  // ignore noise like mobile address-bar collapse. Mirrors the slider pattern.
  lastScope = scope;
  if (!resizeHandler) {
    resizeHandler = () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        if (window.innerWidth === lastWidth) return;
        lastWidth = window.innerWidth;
        if (!instances.length) return;
        destroyDraggableMarquee(/* preserveResize */ true);
        if (lastScope) initDraggableMarquee(lastScope);
      }, 250);
    };
    window.addEventListener("resize", resizeHandler);
  }
}

export function destroyDraggableMarquee(preserveResize) {
  instances.forEach((inst) => {
    if (!inst) return;
    if (inst.st) inst.st.kill();
    if (inst.observer) inst.observer.kill();
    if (inst.loop) inst.loop.kill();

    // Restore the DOM to its pre-init state: move the original slides back out
    // of the track and onto the viewport, then drop the track (which takes the
    // clones with it). Leaves the markup exactly as Webflow rendered it, so a
    // resize-reinit (or a Barba re-init) builds cleanly from scratch.
    if (inst.track && inst.viewport) {
      inst.originalItems.forEach((item) => inst.viewport.appendChild(item));
      inst.track.remove();
    }
  });
  instances = [];

  if (!preserveResize) {
    if (resizeHandler) {
      window.removeEventListener("resize", resizeHandler);
      resizeHandler = null;
    }
    if (resizeTimeout) {
      clearTimeout(resizeTimeout);
      resizeTimeout = null;
    }
    lastScope = null;
  }
}
