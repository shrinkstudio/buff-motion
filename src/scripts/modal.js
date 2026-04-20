// -----------------------------------------
// MODAL (Shrink Boilerplate)
// Dialog management with auto-open and cooldown
// -----------------------------------------

let dialogHandlers = [];
let delegationBound = false;

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

  // Handle close modal buttons
  if (target.closest('dialog button.modal_close-button, dialog button[data-modal="close"]')) {
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
  const dialogs = scope.querySelectorAll("dialog");
  if (dialogs.length === 0) return;

  dialogs.forEach(setupDialogClickOutside);
  dialogs.forEach(handleAutoOpenModal);
}

export function destroyModals() {
  // Close any open dialogs
  dialogHandlers.forEach(({ element }) => {
    if (element.tagName === "DIALOG" && element.open) {
      element.close();
    }
  });

  // Remove per-dialog handlers
  dialogHandlers.forEach(({ element, type, handler }) => {
    element.removeEventListener(type, handler);
  });
  dialogHandlers = [];
}
