// -----------------------------------------
// BUFF MOTION — LOGO WALL CYCLE
// Shuffled logo rotation with scroll-triggered play/pause
// -----------------------------------------

const LOOP_DELAY = 1.5;
const SWAP_DURATION = 0.9;

let instances = [];

function isVisible(el) {
  return window.getComputedStyle(el).display !== 'none';
}

function shuffleArray(arr) {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function createInstance(root) {
  const list = root.querySelector('[data-logo-wall-list]');
  if (!list) return null;

  const items = Array.from(list.querySelectorAll('[data-logo-wall-item]'));
  if (!items.length) return null;

  const shuffleFront = root.getAttribute('data-logo-wall-shuffle') !== 'false';
  const originalTargets = items
    .map(item => item.querySelector('[data-logo-wall-target]'))
    .filter(Boolean);

  if (!originalTargets.length) return null;

  let visibleItems = [];
  let visibleCount = 0;
  let pool = [];
  let pattern = [];
  let patternIndex = 0;
  let tl = null;
  let st = null;

  function setup() {
    if (tl) tl.kill();

    visibleItems = items.filter(isVisible);
    visibleCount = visibleItems.length;
    if (!visibleCount) return;

    pattern = shuffleArray(Array.from({ length: visibleCount }, (_, i) => i));
    patternIndex = 0;

    // Clear injected targets
    items.forEach(item => {
      item.querySelectorAll('[data-logo-wall-target]').forEach(el => el.remove());
    });

    pool = originalTargets.map(n => n.cloneNode(true));

    let front, rest;
    if (shuffleFront) {
      const shuffled = shuffleArray(pool);
      front = shuffled.slice(0, visibleCount);
      rest = shuffleArray(shuffled.slice(visibleCount));
    } else {
      front = pool.slice(0, visibleCount);
      rest = shuffleArray(pool.slice(visibleCount));
    }
    pool = front.concat(rest);

    for (let i = 0; i < visibleCount; i++) {
      const parent =
        visibleItems[i].querySelector('[data-logo-wall-target-parent]') ||
        visibleItems[i];
      parent.appendChild(pool.shift());
    }

    tl = gsap.timeline({ repeat: -1, repeatDelay: LOOP_DELAY });
    tl.call(swapNext);
    tl.play();
  }

  function swapNext() {
    const nowCount = items.filter(isVisible).length;
    if (nowCount !== visibleCount) {
      setup();
      return;
    }
    if (!pool.length) return;

    const idx = pattern[patternIndex % visibleCount];
    patternIndex++;

    const container = visibleItems[idx];
    const parent =
      container.querySelector('[data-logo-wall-target-parent]') ||
      container.querySelector('*:has(> [data-logo-wall-target])') ||
      container;

    if (parent.querySelectorAll('[data-logo-wall-target]').length > 1) return;

    const current = parent.querySelector('[data-logo-wall-target]');
    const incoming = pool.shift();

    gsap.set(incoming, { yPercent: 50, autoAlpha: 0 });
    parent.appendChild(incoming);

    if (current) {
      gsap.to(current, {
        yPercent: -50,
        autoAlpha: 0,
        duration: SWAP_DURATION,
        ease: 'expo.inOut',
        onComplete: () => {
          current.remove();
          pool.push(current);
        }
      });
    }

    gsap.to(incoming, {
      yPercent: 0,
      autoAlpha: 1,
      duration: SWAP_DURATION,
      delay: 0.1,
      ease: 'expo.inOut'
    });
  }

  function onVisibilityChange() {
    if (!tl) return;
    document.hidden ? tl.pause() : tl.play();
  }

  // Init
  setup();

  st = ScrollTrigger.create({
    trigger: root,
    start: 'top bottom',
    end: 'bottom top',
    onEnter: () => tl && tl.play(),
    onLeave: () => tl && tl.pause(),
    onEnterBack: () => tl && tl.play(),
    onLeaveBack: () => tl && tl.pause()
  });

  document.addEventListener('visibilitychange', onVisibilityChange);

  return {
    destroy() {
      if (tl) tl.kill();
      if (st) st.kill();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      // Clear injected targets
      items.forEach(item => {
        item.querySelectorAll('[data-logo-wall-target]').forEach(el => el.remove());
      });
      tl = null;
      st = null;
    }
  };
}

export function initLogoWall(container) {
  const roots = (container || document).querySelectorAll('[data-logo-wall-cycle-init]');
  roots.forEach(root => {
    const inst = createInstance(root);
    if (inst) instances.push(inst);
  });
}

export function destroyLogoWall() {
  instances.forEach(inst => inst.destroy());
  instances = [];
}
