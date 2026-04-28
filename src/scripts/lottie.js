// -----------------------------------------
// LOTTIE (Shrink Boilerplate)
// Scroll-triggered Lottie with lazy load + reduced motion
//
// Transform attributes (applied via gsap.set on init):
//   data-lottie-x         — translateX  (default: "0%")
//   data-lottie-y         — translateY  (default: "0%")
//   data-lottie-scale     — scale       (default: 1)
//   data-lottie-rotate    — rotation    (default: 0, degrees)
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
    if (lx) transforms.xPercent = parseFloat(lx);
    if (ly) transforms.yPercent = parseFloat(ly);
    if (ls) transforms.scale = parseFloat(ls);
    if (lr) transforms.rotation = parseFloat(lr);
    if (Object.keys(transforms).length) {
      gsap.set(target, transforms);
    }

    let anim = null;

    function handleEnter() {
      if (!target.hasAttribute("data-lottie-fired")) {
        target.setAttribute("data-lottie-fired", "true");

        anim = lottie.loadAnimation({
          container: target,
          renderer: "svg",
          loop: true,
          autoplay: !reduceMotion,
          path: target.getAttribute("data-lottie-src"),
        });

        anim.addEventListener("DOMLoaded", () => {
          if (reduceMotion) {
            const frame = parseInt(target.getAttribute("data-lottie-frame") || "0", 10);
            anim.goToAndStop(frame, true);
          }
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
