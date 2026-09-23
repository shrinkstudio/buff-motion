// -----------------------------------------
// TYPEFORM EMBED
// Attribute-driven Typeform embedding
//
// Inline embed:
//   data-typeform="<id>"        — on any div; the form renders inside it
//
// Popup on click:
//   data-typeform-popup="<id>"  — on any button/link (or a wrapper around
//                                 one); clicking it opens the form in a
//                                 full-screen popup
//
// <id> can be a real form ID (from form.typeform.com/to/<id>) or a
// live-embed ID (the 01M2... value from a data-tf-live snippet). Live IDs
// are resolved to the real form ID on first click.
// -----------------------------------------

const SCRIPT_SRC = "//embed.typeform.com/next/embed.js";
const POPUP_CSS = "https://embed.typeform.com/next/css/popup.css";
const LIVE_ID_RE = /^01[0-9A-HJKMNP-TV-Z]{24}$/;

let scriptPromise = null;
let styleInjected = false;
let popupDelegationBound = false;
const popups = {};

// Load embed.js once. The global popover snippet in Site Settings also
// loads it, so reuse that copy instead of adding a second one.
function loadTypeformScript() {
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise((resolve) => {
    if (window.tf) return resolve();
    let s = document.querySelector('script[src*="embed.typeform.com/next/embed.js"]');
    if (!s) {
      s = document.createElement("script");
      s.src = SCRIPT_SRC;
      document.head.appendChild(s);
    }
    // Poll rather than listen for "load" — an existing tag may have
    // already fired it
    const poll = setInterval(() => {
      if (window.tf) { clearInterval(poll); resolve(); }
    }, 50);
  });
  return scriptPromise;
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

function injectPopupCss() {
  if (document.querySelector(`link[href="${POPUP_CSS}"]`)) return;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = POPUP_CSS;
  document.head.appendChild(link);
}

// Live-embed IDs point at a snippet stored in Typeform. Fetch it (the same
// request embed.js makes for data-tf-live) and pull the form ID out of it.
function resolveFormId(id) {
  if (!LIVE_ID_RE.test(id)) return Promise.resolve(id);
  return fetch(`https://api.typeform.com/single-embed/${id}`)
    .then((res) => res.json())
    .then(({ html }) => {
      const match = /data-tf-(?:widget|popup|slider|popover|sidetab)="([^"]+)"/.exec(html || "");
      if (!match) throw new Error(`[typeform] No form ID found for live embed ${id}`);
      return match[1];
    });
}

function getPopup(id) {
  if (!popups[id]) {
    popups[id] = Promise.all([resolveFormId(id), loadTypeformScript()]).then(([formId]) =>
      window.tf.createPopup(formId, {
        onReady: () => window.__buffMotionLenis?.stop(),
        onClose: () => window.__buffMotionLenis?.start(),
      })
    );
    popups[id].catch(() => delete popups[id]);
  }
  return popups[id];
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

// Document-level click delegation — bind once, works across Barba swaps.
export function initTypeformPopupDelegation() {
  if (popupDelegationBound) return;
  popupDelegationBound = true;

  document.addEventListener("click", (e) => {
    const trigger = e.target.closest("[data-typeform-popup]");
    if (!trigger) return;
    const id = trigger.getAttribute("data-typeform-popup");
    if (!id) return;
    e.preventDefault();
    injectPopupCss();
    getPopup(id)
      .then((popup) => popup.open())
      .catch((err) => console.error(err));
  });
}

export function destroyTypeform() {
  // embed.js stays loaded between pages — nothing to tear down
}
