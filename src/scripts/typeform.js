// -----------------------------------------
// TYPEFORM EMBED
// Attribute-driven Typeform embedding
// Put data-typeform="<form-id>" on any div
// -----------------------------------------

let scriptLoaded = false;
let styleInjected = false;

function loadTypeformScript() {
  if (scriptLoaded) return Promise.resolve();
  return new Promise((resolve) => {
    const s = document.createElement("script");
    s.src = "//embed.typeform.com/next/embed.js";
    s.onload = () => {
      scriptLoaded = true;
      resolve();
    };
    document.head.appendChild(s);
  });
}

function injectTypeformStyles() {
  if (styleInjected) return;
  styleInjected = true;
  const style = document.createElement("style");
  style.textContent = [
    "[data-typeform] { width: 100%; height: 100%; }",
    "[data-typeform] iframe { width: 100% !important; height: 100% !important; border: none; }",
  ].join("\n");
  document.head.appendChild(style);
}

export function initTypeform(scope) {
  scope = scope || document;
  const els = scope.querySelectorAll("[data-typeform]");
  if (!els.length) return;

  injectTypeformStyles();

  loadTypeformScript().then(() => {
    els.forEach((el) => {
      const formId = el.getAttribute("data-typeform");
      if (!formId || el.dataset.typeformInit) return;
      el.dataset.typeformInit = "true";
      el.setAttribute("data-tf-live", formId);
      window.tf?.load?.();
    });
  });
}

export function destroyTypeform() {
  scriptLoaded = false;
}
