(function (window, document) {
  const THEME_QUERY_KEY = "t";

  function getQueryTheme() {
    return new URLSearchParams(window.location.search).get(THEME_QUERY_KEY);
  }

  function getStoredTheme() {
    try {
      return window.localStorage.getItem("theme");
    } catch (_error) {
      return null;
    }
  }

  function setStoredTheme(theme) {
    try {
      window.localStorage.setItem("theme", theme);
    } catch (_error) {
      // Ignore storage failures in private browsing or restricted contexts.
    }
  }

  function getActiveTheme() {
    return document.documentElement.getAttribute("data-theme") || getStoredTheme() || "1";
  }

  function setActiveTheme(theme) {
    const normalized = String(theme);
    document.documentElement.setAttribute("data-theme", normalized);
    setStoredTheme(normalized);
    return normalized;
  }

  function cycleTheme(minTheme, maxTheme) {
    const current = Number.parseInt(getActiveTheme(), 10) || minTheme;
    const nextTheme = current >= maxTheme ? minTheme : Math.max(minTheme, current + 1);
    return setActiveTheme(nextTheme);
  }

  function buildThemedUrl(url) {
    const target = new URL(url, window.location.href);
    if (target.hostname.endsWith("o5102o.com")) {
      target.searchParams.set(THEME_QUERY_KEY, getActiveTheme());
    }
    return target.toString();
  }

  function updateBackLink(selector) {
    const theme = getQueryTheme();
    const backLink = document.querySelector(selector || ".back");

    if (!theme || !backLink) {
      return;
    }

    const target = new URL(backLink.href, window.location.href);
    target.searchParams.set(THEME_QUERY_KEY, theme);
    backLink.href = target.toString();
  }

  function openExternal(url, options) {
    const settings = options || {};
    const finalUrl = settings.themeAware ? buildThemedUrl(url) : url;
    const target = settings.target || "_blank";

    if (target === "_self") {
      window.location.href = finalUrl;
      return finalUrl;
    }

    const newWindow = window.open(finalUrl, target, "noopener");
    if (newWindow) {
      newWindow.opener = null;
    }

    return finalUrl;
  }

  function registerServiceWorker(path) {
    if (!("serviceWorker" in navigator)) {
      return Promise.resolve(null);
    }

    return navigator.serviceWorker.register(path || "/sw.js").catch(function () {
      return null;
    });
  }

  async function copyText(text) {
    if (!navigator.clipboard || !navigator.clipboard.writeText) {
      return false;
    }

    await navigator.clipboard.writeText(text);
    return true;
  }

  window.o5102oSite = {
    buildThemedUrl,
    copyText,
    cycleTheme,
    getActiveTheme,
    getQueryTheme,
    openExternal,
    registerServiceWorker,
    setActiveTheme,
    updateBackLink,
  };
})(window, document);
