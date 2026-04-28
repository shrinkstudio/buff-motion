// -----------------------------------------
// TABLE OF CONTENTS
// Generates a TOC from headings inside [data-toc-source],
// clones [data-toc-link] template for each heading,
// outputs into [data-toc-list], tracks active heading.
//
// Attrs:
//   [data-toc-source]     — content element to scan for headings
//   [data-toc-list]       — container to output generated links
//   [data-toc-link]       — template link element (cloned per heading, removed after)
//   [data-toc-offset]     — scroll offset in px (default: nav height or 0)
//   [data-toc-hide-hash]  — "true" to suppress URL hash updates
//   [data-toc-active]     — class added to active link (default: "is-active")
// -----------------------------------------

let observer = null;
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
  const offset = offsetAttr ? parseInt(offsetAttr, 10) : null;

  // Scan headings
  const headings = Array.from(source.querySelectorAll('h2, h3, h4, h5, h6'));
  if (!headings.length) return;

  // Remove template from DOM but keep reference
  const template = templateEl.cloneNode(true);
  template.removeAttribute('data-toc-link');
  templateEl.remove();

  // Build links
  const links = [];
  const headingMap = new Map();

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

    // Set heading level as data attr for optional CSS indentation
    link.dataset.tocLevel = heading.tagName.replace('H', '');

    // Set href
    if (link.tagName === 'A') {
      link.href = `#${heading.id}`;
    } else {
      const anchor = link.querySelector('a');
      if (anchor) anchor.href = `#${heading.id}`;
    }

    list.appendChild(link);
    links.push(link);
    headingMap.set(heading, link);
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

  // Active state tracking via IntersectionObserver
  const rootMargin = offset !== null
    ? `-${offset}px 0px -60% 0px`
    : `-${getCSSNavHeight()}px 0px -60% 0px`;

  let activeLink = null;

  observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      const link = headingMap.get(entry.target);
      if (!link) return;

      if (entry.isIntersecting) {
        if (activeLink) activeLink.classList.remove(activeClass);
        link.classList.add(activeClass);
        activeLink = link;
      }
    });
  }, {
    rootMargin,
    threshold: 0
  });

  headings.forEach(h => observer.observe(h));

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
  if (observer) {
    observer.disconnect();
    observer = null;
  }
  clickHandlers.forEach(({ el, handler }) => {
    el.removeEventListener('click', handler);
  });
  clickHandlers = [];
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
