// -----------------------------------------
// TABLE OF CONTENTS
// Generates a TOC from headings inside [data-toc-source],
// clones [data-toc-link] template for each heading,
// outputs into [data-toc-list], tracks active heading via ScrollTrigger.
//
// Attrs:
//   [data-toc-source]     — content element to scan for headings
//   [data-toc-mark]       — on an element inside the source, mark it as a TOC
//                           entry explicitly. When any marks exist, they override
//                           the heading scan entirely (use for templates that list
//                           eyebrows like "the problem" rather than headings).
//                           Optional value sets level, e.g. data-toc-mark="3".
//   [data-toc-list]       — container to output generated links
//   [data-toc-link]       — template link element (cloned per heading, removed after)
//   [data-toc-text]       — child of template that receives heading text (optional)
//   [data-toc-levels]     — comma-separated levels to include (default: "h2,h3,h4,h5,h6")
//   [data-toc-offset]     — scroll offset in px (default: nav height or 0)
//   [data-toc-ignore]     — on a heading, exclude it from the TOC
//   [data-toc-hide-hash]  — "true" to suppress URL hash updates
//   [data-toc-active]     — class added to active link (default: "is-active")
//
// Inline marker:
//   "{skip}" in a heading's text excludes it from the TOC and is stripped
//   from the visible heading.
// -----------------------------------------

const SKIP_MARKER = '{skip}';

let scrollTriggers = [];
let clickHandlers = [];
let templateEl = null;

export function initTOC(scope) {
  scope = scope || document;

  const source = scope.querySelector('[data-toc-source]');
  const list = scope.querySelector('[data-toc-list]');
  templateEl = scope.querySelector('[data-toc-link]');
  if (!source || !list || !templateEl) return;

  const hideHash = list.closest('[data-toc-hide-hash]')?.dataset.tocHideHash === 'true'
    || source.closest('[data-toc-hide-hash]')?.dataset.tocHideHash === 'true';
  const activeClass = list.dataset.tocActive || 'is-active';
  const offsetAttr = document.querySelector('[data-toc-offset]')?.dataset.tocOffset;
  const offset = resolveCssLength(offsetAttr);

  // Resolve entries: explicit [data-toc-mark] elements override the heading scan.
  // Lets templates list marked elements (e.g. eyebrows) instead of auto-scanning
  // headings. With no marks present, fall back to scanning by heading level.
  const marked = Array.from(source.querySelectorAll('[data-toc-mark]'));
  let candidates;

  if (marked.length) {
    candidates = marked;
  } else {
    const levelsAttr = source.closest('[data-toc-levels]')?.dataset.tocLevels
      || list.closest('[data-toc-levels]')?.dataset.tocLevels;
    const levels = (levelsAttr || 'h2,h3,h4,h5,h6')
      .split(',')
      .map(l => l.trim().toLowerCase())
      .filter(l => /^h[1-6]$/.test(l));
    if (!levels.length) return;
    candidates = Array.from(source.querySelectorAll(levels.join(',')));
  }

  // Apply ignore + {skip} + empty filters
  const headings = [];

  candidates.forEach(el => {
    if (el.hasAttribute('data-toc-ignore')) return;
    if (el.textContent.includes(SKIP_MARKER)) {
      stripMarker(el);
      return;
    }
    if (!el.textContent.trim()) return;
    headings.push(el);
  });

  if (!headings.length) return;

  // Remove template from DOM but keep reference
  const template = templateEl.cloneNode(true);
  template.removeAttribute('data-toc-link');
  templateEl.remove();

  // Build links
  const links = [];

  headings.forEach((heading, i) => {
    // Ensure heading has an ID
    if (!heading.id) {
      heading.id = slugify(heading.textContent) || `heading-${i}`;
    }
    // Deduplicate IDs
    heading.id = dedupeId(heading.id, i);

    // Apply scroll offset via CSS scroll-margin-top
    const scrollOffset = offset !== null
      ? offset
      : getCSSNavHeight();
    if (scrollOffset) {
      heading.style.scrollMarginTop = scrollOffset + 'px';
    }

    // Clone template and populate
    const link = template.cloneNode(true);
    link.classList.remove(activeClass);
    const textEl = link.querySelector('[data-toc-text]') || link;
    textEl.textContent = heading.textContent.trim();

    // Set level for optional CSS indentation:
    // explicit data-toc-mark="2|3|…" wins, else heading tag number, else 2.
    const markVal = heading.dataset.tocMark;
    link.dataset.tocLevel = (markVal && /^[1-6]$/.test(markVal))
      ? markVal
      : (/^H[1-6]$/.test(heading.tagName) ? heading.tagName.replace('H', '') : '2');

    // Set href
    if (link.tagName === 'A') {
      link.href = `#${heading.id}`;
    } else {
      const anchor = link.querySelector('a');
      if (anchor) anchor.href = `#${heading.id}`;
    }

    list.appendChild(link);
    links.push(link);
  });

  // Click handling — smooth scroll via Lenis
  links.forEach((link, i) => {
    const heading = headings[i];
    const handler = (e) => {
      e.preventDefault();

      const lenis = window.__buffMotionLenis;
      if (lenis) {
        lenis.scrollTo(heading, {
          offset: offset !== null ? -offset : -getCSSNavHeight(),
          duration: 1.2,
          easing: (t) => 1 - Math.pow(1 - t, 4) // easeOutQuart
        });
      } else {
        heading.scrollIntoView({ behavior: 'smooth' });
      }

      if (!hideHash) {
        history.replaceState(null, '', `#${heading.id}`);
      }
    };

    const clickTarget = link.tagName === 'A' ? link : (link.querySelector('a') || link);
    clickTarget.addEventListener('click', handler);
    clickHandlers.push({ el: clickTarget, handler });
  });

  // Active state tracking via ScrollTrigger
  if (typeof ScrollTrigger !== 'undefined') {
    const scrollOffset = offset !== null ? offset : getCSSNavHeight();

    function setActive(index) {
      links.forEach(link => link.classList.remove(activeClass));
      if (links[index]) links[index].classList.add(activeClass);
    }

    headings.forEach((heading, i) => {
      const nextHeading = headings[i + 1];

      const trigger = ScrollTrigger.create({
        trigger: heading,
        start: `top ${scrollOffset + 1}px`,
        endTrigger: nextHeading || source,
        end: nextHeading ? `top ${scrollOffset + 1}px` : 'bottom top',
        onToggle: self => {
          if (self.isActive) setActive(i);
        }
      });

      scrollTriggers.push(trigger);
    });

    // Initial active state — first heading if we're above it
    const firstTop = headings[0].getBoundingClientRect().top + window.scrollY;
    if (window.scrollY <= firstTop - scrollOffset) {
      setActive(0);
    }
  }

  // Handle initial hash
  if (window.location.hash) {
    const target = source.querySelector(window.location.hash);
    if (target) {
      requestAnimationFrame(() => {
        const lenis = window.__buffMotionLenis;
        if (lenis) {
          lenis.scrollTo(target, {
            offset: offset !== null ? -offset : -getCSSNavHeight(),
            immediate: true
          });
        }
      });
    }
  }
}

export function destroyTOC() {
  scrollTriggers.forEach(trigger => trigger.kill());
  scrollTriggers = [];
  clickHandlers.forEach(({ el, handler }) => {
    el.removeEventListener('click', handler);
  });
  clickHandlers = [];
}

function stripMarker(el) {
  const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
  let node;
  while ((node = walker.nextNode())) {
    if (node.textContent.includes(SKIP_MARKER)) {
      node.textContent = node.textContent.replace(SKIP_MARKER, '').trim();
    }
  }
}

function slugify(text) {
  return text
    .trim()
    .toLowerCase()
    .replace(/[\u200B-\u200D\uFEFF]/g, '') // zero-width chars
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function dedupeId(id, index) {
  if (!document.getElementById(id)) return id;
  let candidate = `${id}-${index + 1}`;
  let n = 2;
  while (document.getElementById(candidate)) {
    candidate = `${id}-${n++}`;
  }
  return candidate;
}

function getCSSNavHeight() {
  const val = getComputedStyle(document.documentElement).getPropertyValue('--nav-height');
  return val ? parseInt(val, 10) : 0;
}

// Resolve any CSS length value (px / em / rem / vh / % …) to px via a transient
// probe element. Plain digit-only values are treated as px directly. Returns
// null if the value can't be resolved.
//
// Lets data-toc-offset be written naturally — e.g. "7em" — without authors
// having to pre-convert to pixels and lose the relationship to root font-size.
function resolveCssLength(value) {
  if (value == null) return null;
  const str = String(value).trim();
  if (!str) return null;
  if (/^-?\d+(\.\d+)?$/.test(str)) return parseFloat(str);
  if (typeof document === 'undefined') return null;
  const probe = document.createElement('div');
  probe.style.position = 'absolute';
  probe.style.visibility = 'hidden';
  probe.style.pointerEvents = 'none';
  probe.style.left = '-9999px';
  probe.style.height = str;
  document.body.appendChild(probe);
  const px = probe.getBoundingClientRect().height;
  document.body.removeChild(probe);
  return Number.isFinite(px) && px > 0 ? px : null;
}
