// -----------------------------------------
// HERO PARALLAX — scrub-driven scale + opacity on a sticky-pinned hero
//
// Adds parallax-y depth to the sticky-overlap pattern: as the user scrolls,
// the target element (typically the video wrapper inside the hero section)
// scales down slightly and fades, so the hero text "burns through" rather
// than just sliding over a static pinned video. Subtle by default — feels
// filmic, not gimmicky.
// -----------------------------------------
// Attribute contract:
//   [data-nav-over-hero-trigger]  — re-used as the trigger element (same as
//                                   nav-over-hero), so the parallax tracks
//                                   the same scroll zone the nav bg reacts to
//   [data-hero-parallax-target]   — optional override of the scaled/faded
//                                   element. If omitted, falls back to the
//                                   first .inline-video-component inside the
//                                   trigger.
//
// Optional per-instance overrides on the trigger element:
//   [data-hero-parallax-scale]    — end scale (default 0.95)
//   [data-hero-parallax-opacity]  — end opacity (default 0.7)
//   [data-hero-parallax-distance] — scrub distance in svh (default 100)
//
// -----------------------------------------

let trigger = null;
let targetEl = null;

export function initHeroParallax(scope) {
  if (typeof ScrollTrigger === "undefined") return;
  scope = scope || document;

  const triggerEl = scope.querySelector("[data-nav-over-hero-trigger]")
    || document.querySelector("[data-nav-over-hero-trigger]");
  if (!triggerEl) return;

  // Target precedence:
  //   1. explicit [data-hero-parallax-target] inside the trigger
  //   2. .inline-video-component (the default Webflow inline video wrapper)
  // Never the trigger section itself — it usually contains absolute-positioned
  // overlay content (logo, "discover more" cue) we don't want to fade with the video.
  targetEl = triggerEl.querySelector("[data-hero-parallax-target]")
    || triggerEl.querySelector(".inline-video-component");
  if (!targetEl) return;

  const endScale = parseFloat(triggerEl.getAttribute("data-hero-parallax-scale")) || 0.95;
  const endOpacity = parseFloat(triggerEl.getAttribute("data-hero-parallax-opacity")) || 0.7;
  const distance = parseFloat(triggerEl.getAttribute("data-hero-parallax-distance")) || 100;

  // Set will-change so the browser pre-promotes the layer — avoids a flicker
  // on the first frame of scroll when the compositor would otherwise be
  // catching up. Cleared in destroy so it doesn't burn memory across SPA
  // navigations.
  targetEl.style.willChange = "transform, opacity";

  trigger = ScrollTrigger.create({
    trigger: triggerEl,
    start: "top top",
    // Use a `+=` offset rather than "bottom top" because the trigger is
    // sticky-pinned — its bottom never actually crosses the viewport top.
    // Scrub progresses over `distance` svh of native scroll past the start.
    end: `+=${distance}svh`,
    // scrub: 0.5 adds a half-second catch-up so the animation lags slightly
    // behind raw scroll input. Reads as "fluid" rather than the rigid 1:1
    // mapping of scrub: true. End state is identical, just the in-between
    // beats are smoothed.
    scrub: 0.5,
    animation: gsap.timeline()
      .to(targetEl, {
        scale: endScale,
        opacity: endOpacity,
        ease: "none",
      }),
  });
}

export function destroyHeroParallax() {
  if (trigger) {
    trigger.kill();
    trigger = null;
  }
  if (targetEl) {
    // Wipe inline state so the element is back to its baseline for the next
    // page or a re-init. clearProps handles scale + opacity; will-change is
    // a manual style.
    gsap.set(targetEl, { clearProps: "scale,opacity,transform" });
    targetEl.style.willChange = "";
    targetEl = null;
  }
}
