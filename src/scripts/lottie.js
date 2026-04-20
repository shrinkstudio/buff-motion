// -----------------------------------------
// LOTTIE (Shrink Boilerplate)
// Scroll-triggered Lottie with lazy load + reduced motion
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
