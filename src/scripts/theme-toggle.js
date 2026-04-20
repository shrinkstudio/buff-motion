// -----------------------------------------
// THEME TOGGLE (Shrink Boilerplate)
// Dark/light mode with localStorage persistence
// -----------------------------------------

const docEl = document.documentElement;
const prefersColorScheme = window.matchMedia("(prefers-color-scheme: dark)");

// Module state
let isLight;

// Apply mode classes globally
function applyMode(light) {
  docEl.classList.toggle("u-mode-light", light);
  docEl.classList.toggle("u-mode-dark", !light);
}

// Update label visibility for a specific toggle instance
function updateLabels(light, darkLabel, lightLabel) {
  if (darkLabel && lightLabel) {
    darkLabel.style.display = light ? "none" : "block";
    lightLabel.style.display = light ? "block" : "none";
  }
}

// --- Flash prevention: runs immediately at bundle load ---
const savedTheme = localStorage.getItem("savedTheme");
isLight = savedTheme !== null ? savedTheme === "light" : !prefersColorScheme.matches;
applyMode(isLight);

// Listen for OS preference changes if no saved preference
if (savedTheme === null) {
  prefersColorScheme.addEventListener("change", function (e) {
    isLight = !e.matches;
    applyMode(isLight);
  });
}

// --- Init: bind checkbox toggles (call after each Barba transition) ---
export function initThemeToggle(scope) {
  scope = scope || document;
  const checkboxes = scope.querySelectorAll('[data-theme-toggle="checkbox"]');
  if (!checkboxes.length) return;

  // Re-read current state from localStorage in case it changed
  const current = localStorage.getItem("savedTheme");
  if (current !== null) {
    isLight = current === "light";
  }

  const toggleInstances = Array.from(checkboxes).map(function (checkbox) {
    return {
      checkbox: checkbox,
      darkLabel: checkbox.parentElement.querySelector('[data-theme-toggle="dark-label"]'),
      lightLabel: checkbox.parentElement.querySelector('[data-theme-toggle="light-label"]')
    };
  });

  function syncAllToggles(light) {
    toggleInstances.forEach(function (instance) {
      instance.checkbox.checked = light;
      updateLabels(light, instance.darkLabel, instance.lightLabel);
    });
  }

  // Set initial checkbox state
  syncAllToggles(isLight);

  // Bind change listeners
  toggleInstances.forEach(function (instance) {
    instance.checkbox.addEventListener("change", function () {
      isLight = instance.checkbox.checked;
      applyMode(isLight);
      localStorage.setItem("savedTheme", isLight ? "light" : "dark");
      syncAllToggles(isLight);
    });
  });
}
