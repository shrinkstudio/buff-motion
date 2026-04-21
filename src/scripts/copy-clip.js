// -----------------------------------------
// COPY TO CLIPBOARD — Click-to-copy with success state
// -----------------------------------------
// Attributes:
//   [data-copy="trigger"]       — clickable element
//   [data-copy="target"]        — element whose text gets copied (optional)
//   [data-copy="sibling"]       — sibling target scoped to trigger's parent (optional)
//   [data-copy-text]            — hardcoded string to copy (overrides target)
//   [data-copy-message]         — success message shown on trigger after copy
//   [data-copy-duration]        — ms to hold success state (default: 1000)
//   [data-copy-active-class]    — class added during success state (default: "is-copied")

let listeners = [];

function handleClick(e) {
  var trigger = e.currentTarget;
  if (trigger._copyBusy) return;

  // Resolve text to copy
  var text = trigger.getAttribute('data-copy-text');

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

  // Copy to clipboard
  navigator.clipboard.writeText(text.trim()).then(function () {
    trigger._copyBusy = true;

    var duration = parseInt(trigger.getAttribute('data-copy-duration'), 10) || 1000;
    var activeClass = trigger.getAttribute('data-copy-active-class') || 'is-copied';
    var message = trigger.getAttribute('data-copy-message');

    // Store original text and swap if message provided
    var originalText = null;
    if (message) {
      originalText = trigger.textContent;
      trigger.textContent = message;
    }

    trigger.classList.add(activeClass);

    setTimeout(function () {
      trigger.classList.remove(activeClass);
      if (originalText !== null) trigger.textContent = originalText;
      trigger._copyBusy = false;
    }, duration);
  });
}

export function initCopyClip(scope) {
  scope = scope || document;
  var triggers = scope.querySelectorAll('[data-copy="trigger"]');
  if (!triggers.length) return;

  triggers.forEach(function (trigger) {
    trigger.addEventListener('click', handleClick);
    listeners.push(trigger);
  });
}

export function destroyCopyClip() {
  listeners.forEach(function (trigger) {
    trigger.removeEventListener('click', handleClick);
    trigger._copyBusy = false;
  });
  listeners = [];
}
