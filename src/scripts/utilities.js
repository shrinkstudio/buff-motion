// -----------------------------------------
// UTILITIES
// Small scripts pulled from Webflow custom code
// -----------------------------------------

// ---- Font size increase detection (accessibility) ----

let fontSizeObserver = null;

function detectFontSizeIncrease() {
  const rootFontSize = parseFloat(
    getComputedStyle(document.documentElement).fontSize
  );
  const defaultSize = 16;
  const multiplier = rootFontSize / defaultSize;
  if (multiplier >= 2) {
    document.body.classList.add('font-size-increased');
  } else {
    document.body.classList.remove('font-size-increased');
  }
}

export function initFontSizeDetect() {
  if (fontSizeObserver) return; // already running
  detectFontSizeIncrease();
  fontSizeObserver = new ResizeObserver(() => {
    detectFontSizeIncrease();
  });
  fontSizeObserver.observe(document.documentElement);
}

// ---- Footer year ----

export function initFooterYear(scope) {
  scope = scope || document;
  scope.querySelectorAll('[data-footer-year]').forEach(el => {
    el.textContent = new Date().getFullYear();
  });
}

// ---- Skip to main ----

let skipLinkBound = false;

function handleSkipLink(e) {
  if (e.type === 'keydown' && e.key !== 'Enter') return;
  e.preventDefault();
  const target = document.querySelector('main');
  if (target) {
    target.setAttribute('tabindex', '-1');
    target.focus();
  }
}

export function initSkipLink() {
  if (skipLinkBound) return; // bind once
  const skipLinkEle = document.getElementById('skip-link');
  if (!skipLinkEle) return;
  skipLinkEle.addEventListener('click', handleSkipLink);
  skipLinkEle.addEventListener('keydown', handleSkipLink);
  skipLinkBound = true;
}
