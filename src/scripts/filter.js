// -----------------------------------------
// FILTER — multi-match, button-driven token filter
// Items can declare multiple match tokens; clicking a button activates one target.
// "all" target clears the filter and shows everything.
// -----------------------------------------
// Attributes:
//   [data-filter-group]                — wrapper containing both buttons and items
//   [data-filter-target="<token>"]     — on each filter button (value = token, or "all")
//   [data-filter-name="<token...>"]    — on each item (space-separated tokens it matches)
//   [data-filter-name-collect="<tok>"] — alternative: collected from child elements on init
//                                         and written back into the item's data-filter-name
//   [data-filter-status]               — set by JS on items + buttons:
//                                         "active" | "not-active" | "transition-out"
//                                         (drives visibility / styling via CSS)
//
// The transition-out → not-active swap gives CSS time to animate before items hide.

const TRANSITION_DELAY = 300; // ms

let registered = [];

export function initFilter(scope) {
  scope = scope || document;
  const groupEls = [...scope.querySelectorAll('[data-filter-group]')];
  if (!groupEls.length) return;

  groupEls.forEach(group => {
    const buttons = [...group.querySelectorAll('[data-filter-target]')];
    const items = [...group.querySelectorAll('[data-filter-name]')];

    // Collect tokens from [data-filter-name-collect] children (init only)
    items.forEach(item => {
      const cs = item.querySelectorAll('[data-filter-name-collect]');
      if (!cs.length) return;
      const seen = new Set();
      const out = [];
      cs.forEach(c => {
        const v = (c.getAttribute('data-filter-name-collect') || '').trim().toLowerCase();
        if (v && !seen.has(v)) {
          seen.add(v);
          out.push(v);
        }
      });
      if (out.length) item.setAttribute('data-filter-name', out.join(' '));
    });

    // Cache token sets per item
    const itemTokens = new Map();
    items.forEach(el => {
      const tokens = ((el.getAttribute('data-filter-name') || '').trim().toLowerCase().split(/\s+/)).filter(Boolean);
      itemTokens.set(el, new Set(tokens));
    });

    const setItemState = (el, on) => {
      const next = on ? 'active' : 'not-active';
      if (el.getAttribute('data-filter-status') !== next) {
        el.setAttribute('data-filter-status', next);
        el.setAttribute('aria-hidden', on ? 'false' : 'true');
      }
    };
    const setButtonState = (btn, on) => {
      const next = on ? 'active' : 'not-active';
      if (btn.getAttribute('data-filter-status') !== next) {
        btn.setAttribute('data-filter-status', next);
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      }
    };

    let activeTarget = null;
    const itemMatches = el => {
      if (!activeTarget || activeTarget === 'all') return true;
      const tokens = itemTokens.get(el);
      return tokens ? tokens.has(activeTarget) : false;
    };

    const paint = rawTarget => {
      const target = (rawTarget || '').trim().toLowerCase();
      activeTarget = (!target || target === 'all') ? 'all' : target;

      items.forEach(el => {
        if (el._ft) clearTimeout(el._ft);
        const next = itemMatches(el);
        const cur = el.getAttribute('data-filter-status');
        if (cur === 'active' && TRANSITION_DELAY > 0) {
          el.setAttribute('data-filter-status', 'transition-out');
          el._ft = setTimeout(() => { setItemState(el, next); el._ft = null; }, TRANSITION_DELAY);
        } else if (TRANSITION_DELAY > 0) {
          el._ft = setTimeout(() => { setItemState(el, next); el._ft = null; }, TRANSITION_DELAY);
        } else {
          setItemState(el, next);
        }
      });

      buttons.forEach(btn => {
        const t = (btn.getAttribute('data-filter-target') || '').trim().toLowerCase();
        setButtonState(btn, (activeTarget === 'all' && t === 'all') || (t && t === activeTarget));
      });
    };

    const handler = e => {
      const btn = e.target.closest('[data-filter-target]');
      if (btn && group.contains(btn)) paint(btn.getAttribute('data-filter-target'));
    };
    group.addEventListener('click', handler);

    registered.push({ group, handler, items });
  });
}

export function destroyFilter() {
  registered.forEach(({ group, handler, items }) => {
    group.removeEventListener('click', handler);
    items.forEach(el => {
      if (el._ft) {
        clearTimeout(el._ft);
        el._ft = null;
      }
    });
  });
  registered = [];
}
