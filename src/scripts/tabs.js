// -----------------------------------------
// TABS (Shrink Boilerplate)
// Full-featured tabs with autoplay, mobile dropdown, keyboard nav
// -----------------------------------------

// Track initialized components for cleanup
let initializedComponents = [];

/**
 * Initialize a single tabs component
 */
function initTabsComponent(component) {
  const tabMenu = component.querySelector('[data-tabs-menu]');
  const dropdownMenu = component.querySelector('[data-tabs-menu-dropdown-menu]');
  const tabMenuWrapper = component.querySelector('[data-tabs-menu-wrapper]');
  const tabLinks = component.querySelectorAll('[data-tabs-link]');
  const tabPanes = component.querySelectorAll('[data-tabs-pane]');

  if (!tabMenu || !dropdownMenu || !tabMenuWrapper || !tabLinks.length || !tabPanes.length) {
    return;
  }

  const tabLinksArray = Array.from(tabLinks);
  const tabPanesArray = Array.from(tabPanes);

  // State
  let currentActiveIndex = 0;
  let dropdownToggle = tabMenu.querySelector('[data-tabs-menu-dropdown-toggle]');
  let dropdownText = dropdownToggle ? dropdownToggle.querySelector('[data-tabs-menu-dropdown-text]') : null;
  let isMobileDropdown = tabMenu.getAttribute('data-tab-mobile-dropdown') === 'true';

  let autoplayToggleButton = component.querySelector('[data-tabs-autoplay-toggle]');

  // Autoplay state
  let autoplayEnabled = tabMenu.getAttribute('data-tabs-autoplay') === 'true';
  let autoplayDuration = parseFloat(tabMenu.getAttribute('data-tabs-autoplay-duration')) || 5;
  let autoplayHoverPause = tabMenu.getAttribute('data-tabs-autoplay-hover-pause') === 'true';
  let autoplayTimer = null;
  let autoplayObserver = null;
  let isAutoplayPaused = false;
  let autoplayStartTime = null;
  let autoplayElapsedTime = 0;

  let cachedWindowWidth = window.innerWidth;
  let resizeTimer = null;

  const eventListeners = [];

  function setActiveTab(index) {
    if (index < 0 || index >= tabLinksArray.length) return;

    const overlays = [];
    const isActiveStates = [];

    for (let i = 0; i < tabLinksArray.length; i++) {
      overlays.push(tabLinksArray[i].querySelector('[data-tabs-link-button]'));
      isActiveStates.push(i === index);
    }

    for (let i = 0; i < tabLinksArray.length; i++) {
      const link = tabLinksArray[i];
      const isActive = isActiveStates[i];
      link.setAttribute('aria-selected', isActive);
      link.classList.toggle('cc-active', isActive);
      if (overlays[i]) {
        overlays[i].setAttribute('tabindex', isActive ? '0' : '-1');
      }
    }

    for (let i = 0; i < tabPanesArray.length; i++) {
      tabPanesArray[i].setAttribute('aria-hidden', i !== index);
    }

    currentActiveIndex = index;

    if (dropdownText && isMobileDropdown) {
      const activeTabName = tabLinksArray[index].getAttribute('data-tab-link-name');
      dropdownText.textContent = activeTabName || tabLinksArray[index].textContent;
    }

    if (dropdownToggle && dropdownMenu.classList.contains('cc-open')) {
      closeDropdown();
    }

    if (!isMobileDropdown) {
      const activeLink = tabLinksArray[index];
      const scrollContainer = tabMenuWrapper;
      const containerLeft = scrollContainer.scrollLeft;
      const containerWidth = scrollContainer.clientWidth;
      const tabLeft = activeLink.offsetLeft;
      const tabWidth = activeLink.offsetWidth;

      if (tabLeft < containerLeft || tabLeft + tabWidth > containerLeft + containerWidth) {
        scrollContainer.scrollTo({ left: tabLeft, behavior: 'smooth' });
      }
    }

    if (autoplayEnabled) {
      if (isAutoplayPaused) {
        autoplayElapsedTime = 0;
      } else {
        restartAutoplay();
      }
    }
  }

  function openDropdown() {
    if (!dropdownToggle || !dropdownMenu) return;
    dropdownMenu.classList.add('cc-open');
    dropdownToggle.classList.add('cc-open');
    dropdownToggle.setAttribute('aria-expanded', 'true');
  }

  function closeDropdown() {
    if (!dropdownToggle || !dropdownMenu) return;
    dropdownMenu.classList.remove('cc-open');
    dropdownToggle.classList.remove('cc-open');
    dropdownToggle.setAttribute('aria-expanded', 'false');
  }

  function toggleDropdown() {
    if (dropdownMenu.classList.contains('cc-open')) {
      closeDropdown();
    } else {
      openDropdown();
    }
  }

  function setupMobileDropdown() {
    if (!isMobileDropdown || !dropdownToggle) return;

    dropdownToggle.setAttribute('aria-haspopup', 'true');
    dropdownToggle.setAttribute('aria-expanded', 'false');

    const activeLink = component.querySelector('[data-tabs-link][aria-selected="true"]') ||
                        component.querySelector('[data-tabs-link].cc-active') ||
                        tabLinksArray[0];
    if (dropdownText && activeLink) {
      const activeTabName = activeLink.getAttribute('data-tab-link-name');
      dropdownText.textContent = activeTabName || activeLink.textContent;
    }

    const toggleHandler = function(e) {
      e.stopPropagation();
      toggleDropdown();
    };
    dropdownToggle.addEventListener('click', toggleHandler);
    eventListeners.push({ element: dropdownToggle, type: 'click', handler: toggleHandler });

    const outsideClickHandler = function(e) {
      if (!component.contains(e.target)) {
        closeDropdown();
      }
    };
    document.addEventListener('click', outsideClickHandler);
    eventListeners.push({ element: document, type: 'click', handler: outsideClickHandler });

    const escapeHandler = function(e) {
      if (e.key === 'Escape' && dropdownMenu.classList.contains('cc-open')) {
        closeDropdown();
        dropdownToggle.focus();
      }
    };
    document.addEventListener('keydown', escapeHandler);
    eventListeners.push({ element: document, type: 'keydown', handler: escapeHandler });
  }

  function setupAutoplayProgressBars() {
    if (!autoplayEnabled) return;
    component.style.setProperty('--autoplay-duration', `${autoplayDuration}s`);
  }

  function startAutoplay() {
    if (!autoplayEnabled || isAutoplayPaused) return;
    stopAutoplay();
    const remainingTime = (autoplayDuration * 1000) - autoplayElapsedTime;
    autoplayStartTime = Date.now();
    autoplayTimer = setTimeout(() => {
      const nextIndex = (currentActiveIndex + 1) % tabLinksArray.length;
      setActiveTab(nextIndex);
    }, remainingTime);
  }

  function stopAutoplay() {
    if (autoplayTimer) {
      clearTimeout(autoplayTimer);
      autoplayTimer = null;
    }
    autoplayStartTime = null;
  }

  function restartAutoplay() {
    if (!autoplayEnabled) return;
    autoplayElapsedTime = 0;
    const activeLink = tabLinksArray[currentActiveIndex];
    const progressBar = activeLink.querySelector('[data-tabs-autoplay-progress]');
    if (progressBar) {
      progressBar.style.animation = 'none';
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          progressBar.style.animation = '';
        });
      });
    }
    startAutoplay();
  }

  function updateToggleButton() {
    if (!autoplayToggleButton) return;
    autoplayToggleButton.setAttribute('aria-label', isAutoplayPaused ? 'Play autoplay' : 'Pause autoplay');
  }

  function pauseAutoplay() {
    if (!autoplayEnabled) return;
    if (autoplayStartTime !== null) {
      autoplayElapsedTime += Date.now() - autoplayStartTime;
    }
    isAutoplayPaused = true;
    component.classList.add('autoplay-paused');
    stopAutoplay();
    updateToggleButton();
  }

  function resumeAutoplay() {
    if (!autoplayEnabled) return;
    isAutoplayPaused = false;
    component.classList.remove('autoplay-paused');
    startAutoplay();
    updateToggleButton();
  }

  function setupAutoplayObserver() {
    if (!autoplayEnabled) return;
    autoplayObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          resumeAutoplay();
        } else {
          pauseAutoplay();
        }
      });
    }, { threshold: 0.5 });
    autoplayObserver.observe(component);
  }

  function setupAutoplayHoverPause() {
    if (!autoplayEnabled || !autoplayHoverPause) return;
    const mouseEnterHandler = () => pauseAutoplay();
    const mouseLeaveHandler = () => resumeAutoplay();
    component.addEventListener('mouseenter', mouseEnterHandler);
    component.addEventListener('mouseleave', mouseLeaveHandler);
    eventListeners.push({ element: component, type: 'mouseenter', handler: mouseEnterHandler });
    eventListeners.push({ element: component, type: 'mouseleave', handler: mouseLeaveHandler });
  }

  function setupAutoplayToggle() {
    if (!autoplayEnabled || !autoplayToggleButton) return;
    const toggleHandler = () => {
      if (isAutoplayPaused) { resumeAutoplay(); } else { pauseAutoplay(); }
    };
    autoplayToggleButton.addEventListener('click', toggleHandler);
    eventListeners.push({ element: autoplayToggleButton, type: 'click', handler: toggleHandler });
  }

  function findInitialActiveIndex() {
    if (window.location.hash) {
      const hash = window.location.hash.substring(1);
      const matchIndex = tabLinksArray.findIndex(link => link.id === hash);
      if (matchIndex !== -1) return matchIndex;
    }
    const customActiveIndex = tabLinksArray.findIndex(link => link.classList.contains('cc-active'));
    if (customActiveIndex !== -1) return customActiveIndex;
    return 0;
  }

  function setupKeyboardNav() {
    const tabLinksLength = tabLinksArray.length;
    tabLinksArray.forEach((link) => {
      const overlay = link.querySelector('[data-tabs-link-button]');
      if (!overlay) return;
      const keydownHandler = function(e) {
        let newIndex = currentActiveIndex;
        switch(e.key) {
          case 'ArrowLeft':
            e.preventDefault();
            newIndex = currentActiveIndex > 0 ? currentActiveIndex - 1 : tabLinksLength - 1;
            break;
          case 'ArrowRight':
            e.preventDefault();
            newIndex = currentActiveIndex < tabLinksLength - 1 ? currentActiveIndex + 1 : 0;
            break;
          case 'Home':
            e.preventDefault();
            newIndex = 0;
            break;
          case 'End':
            e.preventDefault();
            newIndex = tabLinksLength - 1;
            break;
          default:
            return;
        }
        setActiveTab(newIndex);
        const nextOverlay = tabLinksArray[newIndex].querySelector('[data-tabs-link-button]');
        if (nextOverlay) nextOverlay.focus();
      };
      overlay.addEventListener('keydown', keydownHandler);
      eventListeners.push({ element: overlay, type: 'keydown', handler: keydownHandler });
    });
  }

  function setupClickHandlers() {
    tabLinksArray.forEach((link, index) => {
      const overlay = link.querySelector('[data-tabs-link-button]');
      if (!overlay) return;
      const clickHandler = function(e) {
        e.preventDefault();
        setActiveTab(index);
        if (cachedWindowWidth < 768 && !isMobileDropdown) {
          link.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
        }
      };
      overlay.addEventListener('click', clickHandler);
      eventListeners.push({ element: overlay, type: 'click', handler: clickHandler });
    });
  }

  function setupResizeHandler() {
    const resizeHandler = function() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(() => {
        cachedWindowWidth = window.innerWidth;
      }, 150);
    };
    window.addEventListener('resize', resizeHandler);
    eventListeners.push({ element: window, type: 'resize', handler: resizeHandler });
  }

  function cleanup() {
    eventListeners.forEach(({ element, type, handler }) => {
      element.removeEventListener(type, handler);
    });
    if (autoplayObserver) {
      autoplayObserver.disconnect();
    }
    stopAutoplay();
    clearTimeout(resizeTimer);
  }

  // Initialize this component
  setupMobileDropdown();
  setupAutoplayProgressBars();
  setupAutoplayObserver();
  setupAutoplayHoverPause();
  setupAutoplayToggle();

  const initialIndex = findInitialActiveIndex();
  setActiveTab(initialIndex);

  setupClickHandlers();
  setupKeyboardNav();
  setupResizeHandler();

  if (autoplayEnabled) {
    startAutoplay();
  }

  const hashChangeHandler = function() {
    if (window.location.hash) {
      const hash = window.location.hash.substring(1);
      const matchIndex = tabLinksArray.findIndex(link => link.id === hash);
      if (matchIndex !== -1) setActiveTab(matchIndex);
    }
  };
  window.addEventListener('hashchange', hashChangeHandler);
  eventListeners.push({ element: window, type: 'hashchange', handler: hashChangeHandler });

  component.__tabsCleanup = cleanup;
  initializedComponents.push(component);
}

export function initTabs(scope) {
  scope = scope || document;
  const components = scope.querySelectorAll('[data-tabs-component]');
  if (!components.length) return;
  components.forEach(initTabsComponent);
}

export function destroyTabs() {
  initializedComponents.forEach(component => {
    if (component.__tabsCleanup) {
      component.__tabsCleanup();
      delete component.__tabsCleanup;
    }
  });
  initializedComponents = [];
}
