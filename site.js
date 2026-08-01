(function (window, document) {
  'use strict';

  const THEME_QUERY_KEY = 't';
  const DEFAULT_THEME = '3';
  const THEMES = {
    2: { name: 'GRAPHITE', color: '#171719' },
    3: { name: 'COBALT', color: '#1b00c8' },
    4: { name: 'SIGNAL', color: '#090b09' },
    5: { name: 'SUN', color: '#ffe916' },
  };

  function normalizeTheme(theme) {
    const value = String(theme || '');
    return Object.prototype.hasOwnProperty.call(THEMES, value) ? value : null;
  }

  function getQueryTheme() {
    try {
      return normalizeTheme(new URLSearchParams(window.location.search).get(THEME_QUERY_KEY));
    } catch (_error) {
      return null;
    }
  }

  function getStoredTheme() {
    try {
      return normalizeTheme(window.localStorage.getItem('theme'));
    } catch (_error) {
      return null;
    }
  }

  function setStoredTheme(theme) {
    try {
      window.localStorage.setItem('theme', theme);
    } catch (_error) {
      // Storage may be unavailable in private or restricted contexts.
    }
  }

  function getActiveTheme() {
    return normalizeTheme(document.documentElement.getAttribute('data-theme')) || getStoredTheme() || DEFAULT_THEME;
  }

  function updateThemeUi(theme) {
    const config = THEMES[theme] || THEMES[DEFAULT_THEME];
    const themeColor = document.querySelector('meta[name="theme-color"]');

    if (themeColor) {
      themeColor.setAttribute('content', config.color);
    }

    document.querySelectorAll('.theme-name').forEach(function (node) {
      node.textContent = config.name;
    });

    document.querySelectorAll('[data-theme-toggle]').forEach(function (button) {
      button.setAttribute('aria-label', '테마 변경. 현재 ' + config.name);
      button.setAttribute('title', 'Theme: ' + config.name);
    });
  }

  function setActiveTheme(theme) {
    const normalized = normalizeTheme(theme) || DEFAULT_THEME;
    document.documentElement.setAttribute('data-theme', normalized);
    setStoredTheme(normalized);
    updateThemeUi(normalized);
    return normalized;
  }

  function cycleTheme(minTheme, maxTheme) {
    const availableThemes = Object.keys(THEMES)
      .map(Number)
      .filter(function (theme) {
        return (!minTheme || theme >= minTheme) && (!maxTheme || theme <= maxTheme);
      })
      .sort(function (a, b) {
        return a - b;
      });
    const current = Number(getActiveTheme());
    const currentIndex = availableThemes.indexOf(current);
    const nextIndex = currentIndex < 0 || currentIndex === availableThemes.length - 1 ? 0 : currentIndex + 1;
    return setActiveTheme(String(availableThemes[nextIndex] || DEFAULT_THEME));
  }

  function buildThemedUrl(url) {
    const target = new URL(url, window.location.href);
    const ownedHost = target.hostname === 'o5102o.com' || target.hostname.endsWith('.o5102o.com');
    if (target.hostname === 'default.o5102o.com') {
      target.searchParams.delete(THEME_QUERY_KEY);
    } else if (ownedHost) {
      target.searchParams.set(THEME_QUERY_KEY, getActiveTheme());
    }
    return target.toString();
  }

  function syncThemedLinks() {
    document.querySelectorAll('a[data-themed]').forEach(function (anchor) {
      const originalHref = anchor.dataset.baseHref || anchor.getAttribute('href');
      if (!originalHref) return;
      anchor.dataset.baseHref = originalHref;
      anchor.href = buildThemedUrl(originalHref);
    });
  }

  function updateBackLink(selector) {
    const backLinks = document.querySelectorAll(selector || '[data-back-link], .back');
    backLinks.forEach(function (backLink) {
      if (!backLink.getAttribute('href')) return;
      backLink.dataset.baseHref = backLink.dataset.baseHref || backLink.getAttribute('href');
      backLink.href = buildThemedUrl(backLink.dataset.baseHref);
    });
  }

  function openExternal(url, options) {
    const settings = options || {};
    const finalUrl = settings.themeAware ? buildThemedUrl(url) : url;
    const target = settings.target || '_blank';

    if (target === '_self') {
      window.location.href = finalUrl;
      return finalUrl;
    }

    const newWindow = window.open(finalUrl, target, 'noopener');
    if (newWindow) newWindow.opener = null;
    return finalUrl;
  }

  function registerServiceWorker(path) {
    if (!('serviceWorker' in navigator)) return Promise.resolve(null);
    return navigator.serviceWorker.register(path || '/sw.js').catch(function () {
      return null;
    });
  }

  async function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      await navigator.clipboard.writeText(text);
      return true;
    }

    const field = document.createElement('textarea');
    field.value = text;
    field.setAttribute('readonly', '');
    field.style.position = 'fixed';
    field.style.opacity = '0';
    document.body.appendChild(field);
    field.select();

    let copied = false;
    try {
      copied = document.execCommand('copy');
    } catch (_error) {
      copied = false;
    }

    field.remove();
    return copied;
  }

  function announce(message) {
    let region = document.getElementById('site-live-region');
    if (!region) {
      region = document.createElement('div');
      region.id = 'site-live-region';
      region.className = 'sr-only';
      region.setAttribute('role', 'status');
      region.setAttribute('aria-live', 'polite');
      document.body.appendChild(region);
    }
    region.textContent = '';
    window.requestAnimationFrame(function () {
      region.textContent = message;
    });
  }

  function setupThemeControls() {
    document.querySelectorAll('[data-theme-toggle]').forEach(function (button) {
      button.addEventListener('click', function () {
        const theme = cycleTheme(2, 5);
        syncThemedLinks();
        updateBackLink();
        announce('테마를 ' + THEMES[theme].name + '으로 변경했습니다.');
      });
    });
  }

  function setupCopyButtons() {
    document.querySelectorAll('[data-copy]').forEach(function (button) {
      const defaultLabel = button.dataset.copyLabel || button.textContent.trim();
      const defaultAriaLabel = button.dataset.copyAriaLabel || button.getAttribute('aria-label') || defaultLabel;
      const status = button.querySelector('[data-copy-status]');
      if (status) status.textContent = defaultLabel;
      button.setAttribute('aria-label', defaultAriaLabel);
      button.addEventListener('click', async function (event) {
        event.preventDefault();
        const value = button.dataset.copy || '';
        const copied = await copyText(value).catch(function () {
          return false;
        });

        if (!copied) {
          if (button.dataset.fallbackHref) window.location.href = button.dataset.fallbackHref;
          return;
        }

        if (status) status.textContent = 'COPIED';
        button.setAttribute('aria-label', defaultLabel + ' 복사됨');
        announce('이메일 주소를 복사했습니다.');
        window.setTimeout(function () {
          if (status) status.textContent = defaultLabel;
          button.setAttribute('aria-label', defaultAriaLabel);
        }, 1800);
      });
    });
  }

  function setupReveals() {
    const nodes = Array.from(document.querySelectorAll('[data-reveal]'));
    if (!nodes.length) return;

    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    nodes.forEach(function (node, index) {
      if (!reducedMotion) node.style.transitionDelay = Math.min(index * 65, 325) + 'ms';
      window.requestAnimationFrame(function () {
        node.classList.add('is-visible');
      });
    });
  }

  function init() {
    setActiveTheme(getQueryTheme() || getStoredTheme() || getActiveTheme());
    syncThemedLinks();
    updateBackLink();
    setupThemeControls();
    setupCopyButtons();
    setupReveals();

    document.querySelectorAll('.js-year').forEach(function (node) {
      node.textContent = String(new Date().getFullYear());
    });

    window.addEventListener('storage', function (event) {
      if (event.key === 'theme' && normalizeTheme(event.newValue)) {
        setActiveTheme(event.newValue);
        syncThemedLinks();
      }
    });
  }

  window.o5102oSite = {
    THEMES,
    buildThemedUrl,
    copyText,
    cycleTheme,
    getActiveTheme,
    getQueryTheme,
    init,
    openExternal,
    registerServiceWorker,
    setActiveTheme,
    syncThemedLinks,
    updateBackLink,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})(window, document);
