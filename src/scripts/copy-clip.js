// -----------------------------------------
// COPY TO CLIPBOARD — Click-to-copy with success state
// -----------------------------------------
// Attributes:
//   [data-copy="trigger"]       — clickable element; resolves text via target/sibling/text-attr/textContent
//   [data-copy="link"]          — clickable <a>; copies its href as an absolute URL (for CMS slug-bound links)
//   [data-copy="target"]        — element whose text gets copied (optional)
//   [data-copy="sibling"]       — sibling target scoped to trigger's parent (optional)
//   [data-copy-text]            — hardcoded string to copy (overrides target)
//   [data-copy-message]         — success message shown on trigger after copy
//   [data-copy-duration]        — ms to hold success state (default: 1000)
//   [data-copy-active-class]    — class added during success state (default: "is-copied")
//
// Listener: document-level CAPTURE-phase delegation so the handler runs
// before Barba's own capture-phase link interceptor. Without that, Barba
// would SPA-navigate to the href before preventDefault could fire.

let docHandler = null;

function copy(trigger, e) {
  if (trigger._copyBusy) return;

  var isLinkMode = trigger.getAttribute('data-copy') === 'link';

  // In link mode the click must NOT navigate (browser nav OR Barba SPA nav).
  if (isLinkMode) {
    e.preventDefault();
    e.stopPropagation();
  }

  // Resolve text to copy
  var text = trigger.getAttribute('data-copy-text');

  if (!text && isLinkMode) {
    var href = trigger.getAttribute('href') || '';
    if (href) {
      try { text = new URL(href, window.location.origin).href; } catch (err) { text = href; }
    }
  }

  if (!text) {
    var target = null;
    var sibling = trigger.parentElement && trigger.parentElement.querySelector('[data-copy="sibling"]');
    if (sibling && sibling !== trigger) {
      target = sibling;
    } else {
      target = document.querySelector('[data-copy="target"]');
    }

    if (target) {
      text = target.value !== undefined && target.tagName && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'SELECT')
        ? target.value
        : target.textContent;
    } else {
      text = trigger.textContent;
    }
  }

  if (!text) return;

  if (!navigator.clipboard) {
    window.prompt('Copy this:', text);
    return;
  }

  navigator.clipboard.writeText(text.trim()).then(function () {
    trigger._copyBusy = true;

    var duration = parseInt(trigger.getAttribute('data-copy-duration'), 10) || 1000;
    var activeClass = trigger.getAttribute('data-copy-active-class') || 'is-copied';
    var message = trigger.getAttribute('data-copy-message');

    // Store original text and swap if message provided
    var originalText = null;
    if (message) {
      // Prefer a heading/span/p inside the trigger so we don't blast button icons
      var textEl = trigger.querySelector('h1,h2,h3,h4,h5,h6,span,p') || trigger;
      originalText = textEl.textContent;
      textEl.textContent = message;
      trigger._copyTextEl = textEl;
    }

    trigger.classList.add(activeClass);

    setTimeout(function () {
      trigger.classList.remove(activeClass);
      if (originalText !== null && trigger._copyTextEl) {
        trigger._copyTextEl.textContent = originalText;
        trigger._copyTextEl = null;
      }
      trigger._copyBusy = false;
    }, duration);
  }).catch(function () {
    window.prompt('Copy this:', text);
  });
}

export function initCopyClip(scope) {
  scope = scope || document;
  // Nothing to bind to in this scope — bail
  if (!scope.querySelector('[data-copy="trigger"], [data-copy="link"]')) return;
  // Already delegated at document level — no need to re-bind on Barba page change
  if (docHandler) return;

  docHandler = function (e) {
    var trigger = e.target.closest('[data-copy="trigger"], [data-copy="link"]');
    if (!trigger) return;
    copy(trigger, e);
  };

  // Capture phase — runs before Barba's capture-phase link interceptor
  document.addEventListener('click', docHandler, true);
}

export function destroyCopyClip() {
  if (docHandler) {
    document.removeEventListener('click', docHandler, true);
    docHandler = null;
  }
}
