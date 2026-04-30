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
// -----------------------------------------

let triggers = [];

export function initLottieAnimations(scope) {
  if (typeof lottie === "undefined") return;

  scope = scope || document;
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const hasScrollTrigger = typeof ScrollTrigger !== "undefined";

  scope.querySelectorAll("[data-lottie]").forEach(target => {
    // Skip if already fired (e.g. transition lottie)
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
          if (reduceMotion) {
            const frame = parseInt(target.getAttribute("data-lottie-frame") || "0", 10);
            anim.goToAndStop(frame, true);
            return;
          }

          const totalFrames = anim.totalFrames;
          const startFrame = Math.round((startPct / 100) * totalFrames);
          const endFrame = Math.round((endPct / 100) * totalFrames);

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
      } else if (anim && !reduceMotion) {
        anim.play();
      }
    }

    function handleLeave() {
      if (anim && !reduceMotion) {
        anim.pause();
      }
    }

    if (hasScrollTrigger) {
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
    } else {
      // No ScrollTrigger — just load immediately
      handleEnter();
    }
  });
}

export function destroyLottieAnimations() {
  triggers.forEach(({ st, anim, target }) => {
    st.kill();
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
