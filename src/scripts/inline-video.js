// -----------------------------------------
// INLINE VIDEO (Shrink Boilerplate)
// Lazy loading, scroll-play, hover-play, playback controls
// -----------------------------------------

let videoLib = null;

class VideoLibrary {
  constructor(scope, options = {}) {
    this.scope = scope || document;
    this.options = {
      rootMargin: options.rootMargin || "100px",
      threshold: options.threshold || 0,
      scrollTriggerThreshold: options.scrollTriggerThreshold || 0.5,
      ...options,
    };

    this.prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;
    this.videoObserver = null;
    this.scrollObservers = new Map();
    this.pictureElementCache = new WeakMap();
    this.eventListeners = new WeakMap();
    this.resizeHandler = null;
    this.resizeTimeout = null;

    this.init();
  }

  init() {
    const videos = this.scope.querySelectorAll("video[data-video]");
    if (videos.length === 0) return;

    this.removeDesktopOnlyVideos();
    this.setupLazyLoading();
    this.setupVideoControls();
    this.setupHoverPlay();

    const desktopOnlyVideos = this.scope.querySelectorAll(
      'video[data-video-desktop-only="true"]'
    );
    if (desktopOnlyVideos.length > 0) {
      this.resizeHandler = () => {
        if (this.resizeTimeout) clearTimeout(this.resizeTimeout);
        this.resizeTimeout = setTimeout(() => {
          this.removeDesktopOnlyVideos();
        }, 150);
      };
      window.addEventListener("resize", this.resizeHandler);
    }
  }

  getComponentContainer(video) {
    return (
      video.closest('[data-video="component"]') ||
      video.parentElement ||
      null
    );
  }

  removeDesktopOnlyVideos() {
    const desktopOnlyVideos = this.scope.querySelectorAll('video[data-video-desktop-only="true"]');
    const isSmallScreen = window.innerWidth <= 991;

    desktopOnlyVideos.forEach((video) => {
      const videoContainer = this.getComponentContainer(video);
      const playbackWrapper = videoContainer
        ? videoContainer.querySelector('[data-video-playback="wrapper"]')
        : null;

      if (isSmallScreen) {
        video.style.display = "none";
        this.showPictureElement(video);
        if (playbackWrapper) {
          playbackWrapper.style.display = "none";
          playbackWrapper.style.visibility = "hidden";
          playbackWrapper.setAttribute("aria-hidden", "true");
        }
      } else {
        video.style.display = "";
        this.hidePictureElement(video);
        if (playbackWrapper) {
          playbackWrapper.style.display = "";
          playbackWrapper.style.visibility = "";
          playbackWrapper.setAttribute("aria-hidden", "false");
        }
      }
    });
  }

  setupLazyLoading() {
    const videos = this.scope.querySelectorAll("video[data-video]");
    if (videos.length === 0) return;

    const observerOptions = {
      root: null,
      rootMargin: this.options.rootMargin,
      threshold: this.options.threshold,
    };

    const videoObserverCallback = (entries, observer) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const video = entry.target;
          this.lazyLoadVideo(video)
            .then(() => observer.unobserve(video))
            .catch(console.error);
        }
      });
    };

    this.videoObserver = new IntersectionObserver(
      videoObserverCallback,
      observerOptions
    );

    videos.forEach((video) => {
      const scrollInPlay = video.getAttribute("data-video-scroll-in-play") === "true";
      const hoverPlay = video.getAttribute("data-video-hover") === "true";

      this.videoObserver.observe(video);

      if (hoverPlay && scrollInPlay) {
        this.setupScrollInPlayForHover(video);
      } else if (hoverPlay) {
        // Hover-only: handled in setupHoverPlay
      } else if (this.prefersReducedMotion) {
        video.pause();
      } else if (scrollInPlay) {
        this.setupScrollInPlay(video);
      } else {
        this.setupAutoplay(video);
      }
    });
  }

  lazyLoadVideo(video) {
    return new Promise((resolve, reject) => {
      const source = video.querySelector("source[data-src]");
      if (source && !source.src) {
        source.src = source.getAttribute("data-src");
        video.load();

        video.addEventListener("canplaythrough", function onCanPlayThrough() {
          video.removeEventListener("canplaythrough", onCanPlayThrough);
          resolve();
        });

        video.addEventListener("error", function onError() {
          video.removeEventListener("error", onError);
          reject(new Error(`Error loading video: ${source.src}`));
        });
      } else {
        resolve();
      }
    });
  }

  showPictureElement(video) {
    const pictureElement = this.findPictureElement(video);
    if (pictureElement) pictureElement.style.display = "block";
  }

  hidePictureElement(video) {
    const pictureElement = this.findPictureElement(video);
    if (pictureElement) pictureElement.style.display = "none";
  }

  findPictureElement(video) {
    if (this.pictureElementCache.has(video)) {
      return this.pictureElementCache.get(video);
    }

    let pictureElement = null;
    let sibling = video.previousElementSibling;
    while (sibling) {
      if (sibling.tagName === "PICTURE" || sibling.tagName === "IMG") {
        pictureElement = sibling;
        break;
      }
      sibling = sibling.previousElementSibling;
    }

    if (!pictureElement) {
      const container = this.getComponentContainer(video);
      if (container) {
        pictureElement = container.querySelector('picture, img');
      }
    }

    this.pictureElementCache.set(video, pictureElement);
    return pictureElement;
  }

  setupVideoControls() {
    const videos = this.scope.querySelectorAll("video[data-video]");
    videos.forEach((video) => this.handlePlaybackButtons(video));
  }

  setupHoverPlay() {
    const hoverVideos = this.scope.querySelectorAll('video[data-video-hover="true"]');

    hoverVideos.forEach((video) => {
      const container = this.getComponentContainer(video);
      const trigger = container || video;
      let hasPlayedOnce = false;

      if (trigger) {
        this.showPictureElement(video);

        if (container) {
          const playbackButton = container.querySelector('[data-video-playback="button"]');
          if (playbackButton) {
            playbackButton.setAttribute("aria-hidden", "true");
            playbackButton.setAttribute("tabindex", "-1");
          }
        }

        const mouseEnterHandler = async () => {
          if (this.prefersReducedMotion) return;
          try {
            this.hidePictureElement(video);
            await this.lazyLoadVideo(video);
            if (!hasPlayedOnce) {
              video.currentTime = 0;
              hasPlayedOnce = true;
            }
            video.play();
          } catch (error) {
            console.error('Error playing hover video:', error);
          }
        };

        const mouseLeaveHandler = () => {
          video.pause();
        };

        trigger.addEventListener("mouseenter", mouseEnterHandler);
        trigger.addEventListener("mouseleave", mouseLeaveHandler);

        if (!this.eventListeners.has(video)) {
          this.eventListeners.set(video, []);
        }
        this.eventListeners.get(video).push(
          { element: trigger, type: "mouseenter", handler: mouseEnterHandler },
          { element: trigger, type: "mouseleave", handler: mouseLeaveHandler }
        );
      }
    });
  }

  setupAutoplay(video) {
    video.addEventListener("canplaythrough", () => {
      if (!this.prefersReducedMotion) {
        this.hidePictureElement(video);
        video.play().catch(console.error);
      }
    });
  }

  setupScrollInPlay(video) {
    let hasPlayedOnce = false;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.lazyLoadVideo(video)
              .then(() => {
                if (!this.prefersReducedMotion) {
                  this.hidePictureElement(video);
                  if (!hasPlayedOnce) {
                    video.currentTime = 0;
                    hasPlayedOnce = true;
                  }
                  video.play();
                }
              })
              .catch(console.error);
          } else {
            video.pause();
          }
        }
      },
      { threshold: this.options.scrollTriggerThreshold }
    );

    observer.observe(video);
    this.scrollObservers.set(video, observer);
  }

  setupScrollInPlayForHover(video) {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            this.lazyLoadVideo(video)
              .then(() => {
                video.pause();
                this.showPictureElement(video);
              })
              .catch(console.error);
          }
        }
      },
      { threshold: this.options.scrollTriggerThreshold }
    );

    observer.observe(video);
    this.scrollObservers.set(video, observer);
  }

  handlePlaybackButtons(video) {
    const container = this.getComponentContainer(video);
    if (!container) return;

    const playbackButton = container.querySelector('[data-video-playback="button"]');
    if (!playbackButton) return;

    const playIcon = playbackButton.querySelector('[data-video-playback="play"]');
    const pauseIcon = playbackButton.querySelector('[data-video-playback="pause"]');
    if (!playIcon || !pauseIcon) return;

    const toggleButtonState = (isPlaying) => {
      if (isPlaying) {
        playIcon.style.display = "none";
        playIcon.style.visibility = "hidden";
        playIcon.setAttribute("aria-hidden", "true");
        pauseIcon.style.display = "flex";
        pauseIcon.style.visibility = "visible";
        pauseIcon.setAttribute("aria-hidden", "false");
        playbackButton.setAttribute("aria-label", "Pause video");
      } else {
        playIcon.style.display = "flex";
        playIcon.style.visibility = "visible";
        playIcon.setAttribute("aria-hidden", "false");
        pauseIcon.style.display = "none";
        pauseIcon.style.visibility = "hidden";
        pauseIcon.setAttribute("aria-hidden", "true");
        playbackButton.setAttribute("aria-label", "Play video");
      }
    };

    toggleButtonState(!video.paused);

    const clickHandler = async (event) => {
      event.stopPropagation();
      if (video.paused) {
        try {
          await this.lazyLoadVideo(video);
          this.hidePictureElement(video);
          video.play();
          toggleButtonState(true);
        } catch (error) {
          console.error(error);
        }
      } else {
        video.pause();
        toggleButtonState(false);
      }
    };

    const playHandler = () => toggleButtonState(true);
    const pauseHandler = () => toggleButtonState(false);

    playbackButton.addEventListener("click", clickHandler);
    video.addEventListener("play", playHandler);
    video.addEventListener("pause", pauseHandler);

    if (!this.eventListeners.has(video)) {
      this.eventListeners.set(video, []);
    }
    this.eventListeners.get(video).push(
      { element: playbackButton, type: "click", handler: clickHandler },
      { element: video, type: "play", handler: playHandler },
      { element: video, type: "pause", handler: pauseHandler }
    );
  }

  destroy() {
    if (this.videoObserver) {
      this.videoObserver.disconnect();
    }

    this.scrollObservers.forEach((observer) => observer.disconnect());
    this.scrollObservers.clear();

    this.eventListeners.forEach((listeners) => {
      listeners.forEach(({ element, type, handler }) => {
        element.removeEventListener(type, handler);
      });
    });
    this.eventListeners = new WeakMap();

    if (this.resizeHandler) {
      window.removeEventListener("resize", this.resizeHandler);
      this.resizeHandler = null;
    }

    if (this.resizeTimeout) {
      clearTimeout(this.resizeTimeout);
      this.resizeTimeout = null;
    }

    this.pictureElementCache = new WeakMap();
  }
}

export function initInlineVideos(scope) {
  scope = scope || document;
  const videos = scope.querySelectorAll("video[data-video]");
  if (videos.length === 0) return;
  videoLib = new VideoLibrary(scope);
}

export function destroyInlineVideos() {
  if (videoLib) {
    videoLib.destroy();
    videoLib = null;
  }
}
