// -----------------------------------------
// VIDEO ON HOVER
// Lazy-loads and plays video when user hovers
// a [data-video-on-hover] wrapper. Pauses and
// resets on mouse leave.
// -----------------------------------------

let wrappers = [];
let handlers = [];

export function initVideoHover(scope) {
  scope = scope || document;
  wrappers = [...scope.querySelectorAll('[data-video-on-hover]')];

  wrappers.forEach(wrapper => {
    const video = wrapper.querySelector('video');
    const src = wrapper.getAttribute('data-video-src') || '';
    if (!video || !src) return;

    const enter = () => {
      if (!video.getAttribute('src')) {
        video.setAttribute('src', src);
      }
      wrapper.dataset.videoOnHover = 'active';
      video.play().catch(() => {});
    };

    const leave = () => {
      wrapper.dataset.videoOnHover = 'not-active';
      setTimeout(() => {
        video.pause();
        video.currentTime = 0;
      }, 200);
    };

    wrapper.addEventListener('mouseenter', enter);
    wrapper.addEventListener('mouseleave', leave);
    handlers.push({ wrapper, enter, leave });
  });
}

export function destroyVideoHover() {
  handlers.forEach(({ wrapper, enter, leave }) => {
    wrapper.removeEventListener('mouseenter', enter);
    wrapper.removeEventListener('mouseleave', leave);
  });
  wrappers = [];
  handlers = [];
}
