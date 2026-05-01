// -----------------------------------------
// MODAL (Shrink Boilerplate)
// Dialog management with auto-open and cooldown
//
// Supports both <dialog> elements and div panels:
//   <dialog>               — uses native showModal()/close()
//   [data-modal-panel]     — uses class "is-open" + body scroll lock
//
// Triggers:
//   dialog + button        — opens preceding <dialog>
//   [data-modal="open"]    — with data-modal-target:
//                             "sibling" = finds [data-modal-panel] or <dialog> in same parent
//                             "#selector" = finds element by CSS selector
//   [data-modal="close"]   — closes nearest modal (dialog or panel)
// -----------------------------------------

let dialogHandlers = [];
let delegationBound = false;
const OPEN_CLASS = "is-open";

function openModal(modal) {
  if (modal.tagName === "DIALOG") {
    modal.showModal();
  } else {
    modal.classList.add(OPEN_CLASS);
    document.body.style.overflow = "hidden";
    const lenis = window.__buffMotionLenis;
    if (lenis) lenis.stop();
    animateModalIn(modal);
  }
}

function closeModal(modal) {
  if (modal.tagName === "DIALOG") {
    modal.close();
  } else {
    gsap.killTweensOf(modal.querySelectorAll("*"));
    modal.classList.remove(OPEN_CLASS);
    document.body.style.overflow = "";
    const lenis = window.__buffMotionLenis;
    if (lenis) lenis.start();
  }
}

function animateModalIn(modal) {
  // Fade in the overlay
  gsap.fromTo(modal, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4 });

  // Stagger children of the content container
  const container = modal.querySelector("[data-modal-panel-content]");
  if (container) {
    const children = Array.from(container.children);
    gsap.fromTo(children, {
      autoAlpha: 0,
      y: 40,
    }, {
      autoAlpha: 1,
      y: 0,
      duration: 0.8,
      stagger: 0.1,
      delay: 0.15,
    });
  }
}

// --- Document-level delegation (bind once in initOnceFunctions) ---

function handleModalClicks(e) {
  const target = e.target;

  // Handle show modal buttons (buttons that immediately follow dialogs)
  if (target.closest("dialog + button")) {
    e.preventDefault();
    const btn = target.closest("dialog + button");
    const dialog = btn.previousElementSibling;
    if (dialog && dialog.tagName === "DIALOG") {
      dialog.showModal();
    }
    return;
  }

  // Handle data-modal="open" triggers with data-modal-target
  const openTrigger = target.closest('[data-modal="open"]');
  if (openTrigger) {
    e.preventDefault();
    const targetAttr = openTrigger.getAttribute("data-modal-target");
    let modal = null;

    if (targetAttr === "sibling") {
      modal = openTrigger.parentElement?.querySelector("dialog, [data-modal-panel]");
    } else if (targetAttr) {
      modal = document.querySelector(targetAttr);
    }

    if (modal) openModal(modal);
    return;
  }

  // Handle close modal buttons
  const closeTrigger = target.closest('[data-modal="close"]');
  if (closeTrigger) {
    e.preventDefault();
    const modal = closeTrigger.closest("dialog, [data-modal-panel]");
    if (modal) closeModal(modal);
    return;
  }

  // Legacy: dialog button.modal_close-button
  if (target.closest('dialog button.modal_close-button')) {
    e.preventDefault();
    const dialog = target.closest("dialog");
    if (dialog) dialog.close();
    return;
  }
}

export function initModalDelegation() {
  if (delegationBound) return;
  document.addEventListener("click", handleModalClicks);
  delegationBound = true;
}

// --- Per-dialog setup (call after each Barba transition) ---

function getModalId(dialog) {
  const parent = dialog.parentElement;
  if (!parent || !parent.id) return null;
  return parent.id;
}

function isInCooldown(modalId) {
  try {
    const storageKey = `modal-cooldown-${modalId}`;
    const cooldownUntil = localStorage.getItem(storageKey);
    if (!cooldownUntil) return false;

    const now = Date.now();
    const cooldownTime = parseInt(cooldownUntil, 10);

    if (now > cooldownTime) {
      localStorage.removeItem(storageKey);
      return false;
    }
    return true;
  } catch (error) {
    console.warn("Error checking modal cooldown:", error);
    return false;
  }
}

function storeCooldownTimestamp(modalId, days) {
  try {
    const storageKey = `modal-cooldown-${modalId}`;
    const cooldownUntil = Date.now() + (days * 24 * 60 * 60 * 1000);
    localStorage.setItem(storageKey, cooldownUntil.toString());
  } catch (error) {
    console.warn("Error storing modal cooldown:", error);
  }
}

function handleModalClose(dialog) {
  const cooldownDays = parseInt(dialog.dataset.modalCooldownDays, 10);
  if (cooldownDays > 0) {
    const modalId = getModalId(dialog);
    if (modalId) storeCooldownTimestamp(modalId, cooldownDays);
  }
}

function setupDialogClickOutside(dialog) {
  const clickHandler = function (e) {
    if (e.target === dialog) dialog.close();
  };
  const closeHandler = function () {
    handleModalClose(dialog);
  };

  dialog.addEventListener("click", clickHandler);
  dialog.addEventListener("close", closeHandler);

  dialogHandlers.push(
    { element: dialog, type: "click", handler: clickHandler },
    { element: dialog, type: "close", handler: closeHandler }
  );
}

function handleAutoOpenModal(dialog) {
  const shouldOpenOnLoad = dialog.dataset.modalOpenOnLoad === "true";
  if (!shouldOpenOnLoad) return;

  const cooldownDays = parseInt(dialog.dataset.modalCooldownDays, 10) || 0;
  const modalId = getModalId(dialog);
  if (!modalId) return;

  if (cooldownDays > 0 && isInCooldown(modalId)) return;

  dialog.showModal();
}

export function initModals(scope) {
  scope = scope || document;

  // Native dialogs
  const dialogs = scope.querySelectorAll("dialog");
  dialogs.forEach(setupDialogClickOutside);
  dialogs.forEach(handleAutoOpenModal);

  // Panel modals — click outside to close + Escape key
  const panels = scope.querySelectorAll("[data-modal-panel]");
  panels.forEach(panel => {
    const clickHandler = function (e) {
      // Close if clicking directly on the overlay (not content inside)
      if (e.target === panel) closeModal(panel);
    };
    const keyHandler = function (e) {
      if (e.key === "Escape" && panel.classList.contains(OPEN_CLASS)) {
        closeModal(panel);
      }
    };
    panel.addEventListener("click", clickHandler);
    document.addEventListener("keydown", keyHandler);
    dialogHandlers.push(
      { element: panel, type: "click", handler: clickHandler },
      { element: document, type: "keydown", handler: keyHandler }
    );
  });
}

export function destroyModals() {
  // Close any open modals
  dialogHandlers.forEach(({ element }) => {
    if (element.tagName === "DIALOG" && element.open) {
      element.close();
    }
    if (element.classList?.contains(OPEN_CLASS)) {
      closeModal(element);
    }
  });

  // Remove handlers
  dialogHandlers.forEach(({ element, type, handler }) => {
    element.removeEventListener(type, handler);
  });
  dialogHandlers = [];
}
