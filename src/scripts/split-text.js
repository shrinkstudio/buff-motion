// -----------------------------------------
// SPLIT TEXT REVEAL (Shrink Boilerplate)
// GSAP SplitText + ScrollTrigger masked line reveal
// -----------------------------------------

let splitInstances = [];

const splitConfig = {
  lines: { duration: 0.8, stagger: 0.08 },
  words: { duration: 0.6, stagger: 0.06 },
  chars: { duration: 0.4, stagger: 0.01 }
};

export function initSplitTextReveal(scope) {
  if (typeof SplitText === "undefined") return;

  scope = scope || document;
  const headings = scope.querySelectorAll('[data-split="heading"]');
  if (!headings.length) return;

  const hasScrollTrigger = typeof ScrollTrigger !== "undefined";

  headings.forEach(heading => {
    // FOUC prevention — show the element before animating
    gsap.set(heading, { autoAlpha: 1 });

    const type = heading.dataset.splitReveal || "lines";
    const typesToSplit =
      type === "lines" ? ["lines"] :
      type === "words" ? ["lines", "words"] :
      ["lines", "words", "chars"];

    const instance = SplitText.create(heading, {
      type: typesToSplit.join(", "),
      mask: "lines",
      autoSplit: true,
      linesClass: "line",
      wordsClass: "word",
      charsClass: "letter",
      onSplit: function (inst) {
        const targets = inst[type];
        const config = splitConfig[type];

        const tweenConfig = {
          yPercent: 110,
          duration: config.duration,
          stagger: config.stagger,
          ease: "expo.out",
        };

        if (hasScrollTrigger) {
          tweenConfig.scrollTrigger = {
            trigger: heading,
            start: "clamp(top 80%)",
            once: true,
          };
        }

        return gsap.from(targets, tweenConfig);
      }
    });

    splitInstances.push(instance);
  });
}

export function destroySplitTextReveal() {
  splitInstances.forEach(instance => {
    if (instance && typeof instance.revert === "function") {
      instance.revert();
    }
  });
  splitInstances = [];
}
