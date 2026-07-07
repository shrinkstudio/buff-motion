// -----------------------------------------
// LOTTIE (Shrink Boilerplate)
// Scroll-triggered Lottie with lazy load + reduced motion
//
// Transform attributes (applied via gsap.set on init):
//   data-lottie-x         — translateX  (default: "0%")
//   data-lottie-y         — translateY  (default: "0%")
//   data-lottie-scale     — scale       (default: 1)
//   data-lottie-rotate    — rotation    (default: 0, degrees)
//   data-lottie-z         — zIndex      (default: auto)
//
// Playback attributes:
//   data-lottie-loop      — "true"/"false"  (default: "true")
//   data-lottie-start     — start % of total frames (default: 0)
//   data-lottie-end       — end % of total frames   (default: 100)
//   data-lottie-static    — "true" → never animate, hold the END frame (the
//                           finished/fully-drawn pose). For neutralising a Lottie
//                           whose draw-on glitches in the SVG renderer.
//
// Container attribute (on parent, e.g. Grid Column):
//   data-lottie-only      — hides this element below 768px (tablet)
// -----------------------------------------

let triggers = [];
let lottieOnlyStyle = null;

export function initLottieAnimations(scope, opts = {}) {
  // Hide data-lottie-only containers below tablet
  if (!lottieOnlyStyle) {
    lottieOnlyStyle = document.createElement("style");
    lottieOnlyStyle.textContent = "@media (max-width: 767px) { [data-lottie-only='true'] { display: none !important; } }";
    document.head.appendChild(lottieOnlyStyle);
  }
  if (typeof lottie === "undefined") return;

  scope = scope || document;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasScrollTrigger = typeof ScrollTrigger !== "undefined";
  // staticOnly pass — runs EARLY (beforeEnter, during the page transition) and
  // only touches [data-lottie-static] elements, so they're rendered before the
  // page reveals instead of snapping in afterEnter. The full afterEnter pass
  // then skips them (data-lottie-fired) and wires the animated ones normally.
  const staticOnly = opts.staticOnly === true;

  // HOME first load: hold the ENTIRE lottie init until the intro preloader has
  // lifted. The hero squiggle is above the fold, so it would otherwise fire
  // instantly — out of sight, behind the welcome panel. Deferring also means the
  // above-the-fold detection (st.isActive) runs against the SETTLED, unlocked
  // page; during the intro the page is scroll-locked + covered, which made that
  // measurement unreliable. Re-enters once buff:home-intro-done fires (status is
  // "done" by then, so this branch is skipped on the second pass). Reduced-motion
  // and every non-home page init immediately.
  const introActive = !reduceMotion
    && document.body.getAttribute("data-home-intro-status") !== "done"
    && !!document.querySelector("[data-home-intro]");
  if (introActive && !staticOnly) {
    let done = false;
    let timer;
    const go = () => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      document.removeEventListener("buff:home-intro-done", go);
      initLottieAnimations(scope);
    };
    document.addEventListener("buff:home-intro-done", go, { once: true });
    timer = setTimeout(go, 8000); // safety net if the event never arrives
    return;
  }

  const selector = staticOnly ? "[data-lottie][data-lottie-static='true']" : "[data-lottie]";
  scope.querySelectorAll(selector).forEach(target => {
    // Skip if already fired (e.g. transition lottie, or static pre-inited in beforeEnter)
    if (target.hasAttribute("data-lottie-fired")) return;

    // Apply attribute-driven transforms
    const transforms = {};
    const lx = target.getAttribute("data-lottie-x");
    const ly = target.getAttribute("data-lottie-y");
    const ls = target.getAttribute("data-lottie-scale");
    const lr = target.getAttribute("data-lottie-rotate");
    const lz = target.getAttribute("data-lottie-z");
    if (lx) transforms.xPercent = parseFloat(lx);
    if (ly) transforms.yPercent = parseFloat(ly);
    if (ls) transforms.scale = parseFloat(ls);
    if (lr) transforms.rotation = parseFloat(lr);
    if (lz) transforms.zIndex = parseInt(lz, 10);
    if (Object.keys(transforms).length) {
      gsap.set(target, transforms);
    }

    let anim = null;
    // STATIC: hold the finished (end) frame, never animate. Use to neutralise a
    // Lottie whose draw-on trim-path glitches in the SVG renderer — the final
    // drawn frame renders clean. Remove the attribute to re-animate.
    const isStatic = target.getAttribute("data-lottie-static") === "true";

    function handleEnter() {
      if (!target.hasAttribute("data-lottie-fired")) {
        target.setAttribute("data-lottie-fired", "true");

        const shouldLoop = target.getAttribute("data-lottie-loop") !== "false";
        const startPct = parseFloat(target.getAttribute("data-lottie-start") || "0");
        const endPct = parseFloat(target.getAttribute("data-lottie-end") || "100");

        anim = lottie.loadAnimation({
          container: target,
          renderer: "svg",
          loop: shouldLoop,
          autoplay: false,
          path: target.getAttribute("data-lottie-src"),
        });

        anim.addEventListener("DOMLoaded", () => {
          const totalFrames = anim.totalFrames;
          const startFrame = Math.round((startPct / 100) * totalFrames);
          const endFrame = Math.round((endPct / 100) * totalFrames);

          // Static — hold the finished frame, no animation.
          if (isStatic) {
            anim.goToAndStop(endFrame, true);
            return;
          }
          // Reduced motion — hold the configured rest frame (default 0).
          if (reduceMotion) {
            const frame = parseInt(target.getAttribute("data-lottie-frame") || "0", 10);
            anim.goToAndStop(frame, true);
            return;
          }

          // Stop at end frame when not looping
          if (!shouldLoop) {
            anim.addEventListener("enterFrame", () => {
              if (anim.currentFrame >= endFrame - 1) {
                anim.pause();
              }
            });
          }

          anim.goToAndPlay(startFrame, true);
        });
      } else if (anim && !reduceMotion && !isStatic) {
        anim.play();
      }
    }

    function handleLeave() {
      if (anim && !reduceMotion && !isStatic) {
        anim.pause();
      }
    }

    if (isStatic) {
      // STATIC — no scroll choreography. Render it NOW so it's present with the
      // page (it loads in beforeEnter, before the reveal) instead of snapping in
      // after the transition. Tracked with a null st so destroy still cleans it up.
      handleEnter();
      triggers.push({ st: null, anim: () => anim, target });
    } else if (hasScrollTrigger) {
      const st = ScrollTrigger.create({
        trigger: target,
        start: "top bottom+=50%",
        end: "bottom top-=25%",
        onEnter: handleEnter,
        onEnterBack: handleEnter,
        onLeave: handleLeave,
        onLeaveBack: handleLeave,
      });

      triggers.push({ st, anim: () => anim, target });

      // ScrollTrigger only fires onEnter/onEnterBack on actual scroll direction
      // changes — NOT on initial page load. If a lottie's trigger is already
      // past its start line at scroll=0 (above the fold, or because the user
      // navigated to a page where this section is visible immediately), the
      // callback would never fire and the lottie would never play.
      //
      // Defer to the next frame so ScrollTrigger has finished its initial
      // measurement (and our own ScrollTrigger.refresh() at the end of
      // initAfterEnterFunctions has run), then manually fire handleEnter if
      // the trigger is currently active. Matches the manual initial-state
      // check content-reveal does for data-reveal-group above the fold.
      // (The home hero squiggle no longer needs special handling here — on the
      // home first load the WHOLE lottie init is deferred until the intro lifts,
      // see the introActive guard at the top of initLottieAnimations. By the time
      // this runs, the page is settled + unlocked so st.isActive is reliable.)
      requestAnimationFrame(() => {
        if (st.isActive) handleEnter();
      });
    } else {
      // No ScrollTrigger — just load immediately
      handleEnter();
    }
  });
}

export function destroyLottieAnimations() {
  triggers.forEach(({ st, anim, target }) => {
    if (st) st.kill(); // static entries have no ScrollTrigger
    const a = anim();
    if (a) {
      a.destroy();
    }
    target.removeAttribute("data-lottie-fired");
    // Clear the container so lottie can reinit cleanly
    target.innerHTML = "";
  });
  triggers = [];
}
