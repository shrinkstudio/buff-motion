// -----------------------------------------
// SOCIAL SHARE — click-to-share + copy-link
// -----------------------------------------
// Attributes:
//   [data-social-share]              — root container (delegates clicks)
//   [data-social-share-link]         — URL to share (defaults to location.href)
//   [data-social-share-title]        — title/text (defaults to document.title)
//   [data-social-share-type]         — on each child trigger; one of:
//                                       x | linkedin | reddit | telegram |
//                                       whatsapp | mail | facebook |
//                                       pinterest | clipboard
//   [data-social-share-success]      — added to a clipboard trigger for 2s after copy
//   [data-social-share-duration]     — ms to hold success state (default: 2000)

let listeners = [];

const URL_MAP = {
  x: (u, t) => `https://twitter.com/intent/tweet?text=${t}&url=${u}`,
  linkedin: (u) => `https://www.linkedin.com/sharing/share-offsite/?url=${u}`,
  reddit: (u, t) => `https://www.reddit.com/submit?url=${u}&title=${t}`,
  telegram: (u, t) => `https://t.me/share/url?url=${u}&text=${t}`,
  whatsapp: (u, t) => `https://api.whatsapp.com/send?text=${t}%20${u}`,
  mail: (u, t) => `mailto:?subject=${t}&body=${t}%0A%0A${u}`,
  facebook: (u) => `https://www.facebook.com/sharer/sharer.php?u=${u}`,
  pinterest: (u, t) => `https://www.pinterest.com/pin/create/button/?url=${u}&description=${t}`,
};

function makeHandler(root) {
  return function handleClick(e) {
    const btn = e.target.closest('[data-social-share-type]');
    if (!btn || !root.contains(btn)) return;
    e.preventDefault();

    const link = root.getAttribute('data-social-share-link') || location.href;
    const title = root.getAttribute('data-social-share-title') || document.title;
    const type = btn.getAttribute('data-social-share-type');

    if (type === 'clipboard') {
      if (!navigator.clipboard) return;
      navigator.clipboard.writeText(link).then(() => {
        const duration = parseInt(btn.getAttribute('data-social-share-duration'), 10) || 2000;
        btn.setAttribute('data-social-share-success', '');
        setTimeout(() => btn.removeAttribute('data-social-share-success'), duration);
      });
      return;
    }

    const builder = URL_MAP[type];
    if (!builder) return;

    const u = encodeURIComponent(link);
    const t = encodeURIComponent(title);
    window.open(builder(u, t), '_blank', 'noopener,noreferrer');
  };
}

export function initSocialShare(scope) {
  scope = scope || document;
  const roots = scope.querySelectorAll('[data-social-share]');
  if (!roots.length) return;

  roots.forEach((root) => {
    if (root._socialShareBound) return;
    root._socialShareBound = true;
    const handler = makeHandler(root);
    root.addEventListener('click', handler);
    listeners.push({ root, handler });
  });
}

export function destroySocialShare() {
  listeners.forEach(({ root, handler }) => {
    root.removeEventListener('click', handler);
    root._socialShareBound = false;
  });
  listeners = [];
}
