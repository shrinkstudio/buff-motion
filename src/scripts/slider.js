// -----------------------------------------
// SLIDER (Shrink Boilerplate)
// Swiper.js wrapper with data-attribute config
// -----------------------------------------

let instances = [];
let resizeTimeout = null;
let lastWidth = window.innerWidth;
let resizeHandler = null;

function processWebflowCMSLists(element) {
  const webflowSelectors = [".w-dyn-list", ".w-dyn-items", ".w-dyn-item"];
  webflowSelectors.forEach((selector) => {
    const webflowElements = element.querySelectorAll(selector);
    webflowElements.forEach((webflowElement) => {
      const children = Array.from(webflowElement.childNodes);
      children.forEach((child) => {
        webflowElement.parentNode.insertBefore(child, webflowElement);
      });
      webflowElement.remove();
    });
  });
}

function getSwiperConfig(element) {
  const computedStyle = getComputedStyle(element);
  const xs = parseFloat(computedStyle.getPropertyValue("--xs").trim()) || 1;
  const sm = parseFloat(computedStyle.getPropertyValue("--sm").trim()) || 1;
  const md = parseFloat(computedStyle.getPropertyValue("--md").trim()) || 2;
  const lg = parseFloat(computedStyle.getPropertyValue("--lg").trim()) || 3;
  const spaceBetween = parseInt(computedStyle.getPropertyValue("--gap").trim()) || 24;

  const config = {
    breakpoints: {
      0: { slidesPerView: xs, spaceBetween: spaceBetween },
      480: { slidesPerView: sm, spaceBetween: spaceBetween },
      768: { slidesPerView: md, spaceBetween: spaceBetween },
      992: { slidesPerView: lg, spaceBetween: spaceBetween },
    },
    watchSlidesProgress: true,
    simulateTouch: true,
    allowTouchMove: true,
    keyboard: { enabled: true, onlyInViewport: true },
    a11y: { enabled: true },
    watchOverflow: true,
    normalizeSlideIndex: false,
    roundLengths: false,
  };

  const grabCursor = element.dataset.grabCursor;
  config.grabCursor = grabCursor !== "false";

  const componentWrapper = element.closest('[data-slider="component"]');

  const nextEl = componentWrapper.querySelector('[data-slider="next"]');
  const prevEl = componentWrapper.querySelector('[data-slider="previous"]');
  if (nextEl && prevEl) {
    config.navigation = { nextEl, prevEl };
  }

  const paginationEl = componentWrapper.querySelector('[data-slider="pagination"]');
  if (paginationEl) {
    config.pagination = {
      el: paginationEl,
      clickable: true,
      bulletElement: "button",
      bulletClass: "slider-pagination_button",
      bulletActiveClass: "cc-active",
    };
  }

  if (element.dataset.loop === "true") {
    config.loop = true;
    config.loopFillGroupWithBlank = true;
    const loopAdditionalSlides = element.dataset.loopAdditionalSlides;
    if (loopAdditionalSlides && !isNaN(loopAdditionalSlides)) {
      config.loopAdditionalSlides = parseInt(loopAdditionalSlides);
    }
  }

  const autoplayDelay = element.dataset.autoplay;
  if (autoplayDelay && autoplayDelay !== "false" && !isNaN(autoplayDelay)) {
    config.autoplay = {
      delay: parseInt(autoplayDelay),
      disableOnInteraction: false,
      pauseOnMouseEnter: true,
    };
  }

  if (element.dataset.centered === "true") {
    config.centeredSlides = true;
    config.centeredSlidesBounds = true;
  }

  if (element.dataset.effect === "fade") {
    config.effect = "fade";
    config.fadeEffect = { crossFade: true };
  }

  const speed = element.dataset.speed;
  if (speed && !isNaN(speed)) {
    config.speed = parseInt(speed);
  }

  return config;
}

function setupHeightCalculation(element, swiper) {
  function updateSliderHeight() {
    const slides = element.querySelectorAll('.swiper-slide');
    if (slides.length === 0) return;

    let maxHeight = 0;
    slides.forEach(slide => {
      slide.style.height = 'auto';
      const slideHeight = slide.offsetHeight;
      if (slideHeight > maxHeight) {
        maxHeight = slideHeight;
      }
    });

    if (maxHeight > 0) {
      element.style.height = maxHeight + 'px';
    }
  }

  updateSliderHeight();
  swiper.on('slideChange', updateSliderHeight);
  swiper.on('slideChangeTransitionEnd', updateSliderHeight);
  swiper.on('touchEnd', updateSliderHeight);
  swiper.on('resize', updateSliderHeight);
}

function initializeSwiper(element, index) {
  try {
    processWebflowCMSLists(element);
    const config = getSwiperConfig(element);
    const swiper = new Swiper(element, config);
    element.swiperInstance = swiper;
    setupHeightCalculation(element, swiper);
    instances.push(element);
  } catch (error) {
    console.error("Swiper initialization failed:", error);
  }
}

export function initSliders(scope) {
  if (typeof Swiper === "undefined") {
    return;
  }

  scope = scope || document;
  const swiperElements = scope.querySelectorAll('[data-slider="slider"]');
  if (swiperElements.length === 0) return;

  swiperElements.forEach((element, index) => {
    initializeSwiper(element, index);
  });

  // Setup resize handler
  if (!resizeHandler) {
    resizeHandler = function() {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(() => {
        const currentWidth = window.innerWidth;
        if (currentWidth !== lastWidth) {
          lastWidth = currentWidth;
          // Destroy and reinit all current sliders
          const currentInstances = [...instances];
          destroySliders();
          currentInstances.forEach((element, index) => {
            if (element.isConnected) {
              initializeSwiper(element, index);
            }
          });
        }
      }, 250);
    };
    window.addEventListener("resize", resizeHandler);
  }
}

export function destroySliders() {
  instances.forEach((element) => {
    if (element.swiperInstance) {
      element.swiperInstance.destroy(true, true);
      delete element.swiperInstance;
    }
  });
  instances = [];

  if (resizeHandler) {
    window.removeEventListener("resize", resizeHandler);
    resizeHandler = null;
  }

  if (resizeTimeout) {
    clearTimeout(resizeTimeout);
    resizeTimeout = null;
  }
}
