(function (window, document) {
  'use strict';

  // Old theme preference is no longer used; colors follow the system setting.
  try {
    window.localStorage.removeItem('theme');
  } catch (_error) {}

  function registerServiceWorker(path) {
    if (!('serviceWorker' in navigator)) return Promise.resolve(null);
    return navigator.serviceWorker.register(path || '/sw.js').catch(function () {
      return null;
    });
  }

  function init() {
    document.querySelectorAll('.js-year').forEach(function (node) {
      node.textContent = String(new Date().getFullYear());
    });
  }

  window.o5102oSite = {
    registerServiceWorker,
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})(window, document);
