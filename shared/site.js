const NOOP = () => {};

function setCssContentVariable(name, value) {
  document.documentElement.style.setProperty(name, JSON.stringify(value));
}

export function registerServiceWorker(path = "/sw.js") {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  navigator.serviceWorker.register(path).catch(NOOP);
}

export function bindCopyButton(
  button,
  {
    text,
    fallbackUrl = `mailto:${text}`,
    indicatorVariable = "--copy-text",
    desktopIdle = " [+]",
    desktopSuccess = " [COPIED]",
    mobileTarget = button?.querySelector(".mobile-only") ?? null,
    mobileIdle = "[+]",
    mobileSuccess = "[COPIED]",
    timeout = 2000,
  } = {}
) {
  if (!button || !text) {
    return;
  }

  let resetTimerId = 0;

  const resetIndicators = () => {
    setCssContentVariable(indicatorVariable, desktopIdle);
    if (mobileTarget) {
      mobileTarget.textContent = mobileIdle;
    }
  };

  resetIndicators();

  button.addEventListener("click", async () => {
    if (!navigator.clipboard?.writeText) {
      window.location.href = fallbackUrl;
      return;
    }

    try {
      await navigator.clipboard.writeText(text);
      setCssContentVariable(indicatorVariable, desktopSuccess);
      if (mobileTarget) {
        mobileTarget.textContent = mobileSuccess;
      }

      window.clearTimeout(resetTimerId);
      resetTimerId = window.setTimeout(resetIndicators, timeout);
    } catch {
      window.location.href = fallbackUrl;
    }
  });
}

export function setupThemeToggle(
  button,
  {
    target = document.documentElement,
    attribute = "data-theme",
    storageKey = "theme",
    themeCount = 5,
  } = {}
) {
  if (!button) {
    return;
  }

  try {
    const storedTheme = window.localStorage.getItem(storageKey);
    if (storedTheme) {
      target.setAttribute(attribute, storedTheme);
    }
  } catch {
    NOOP();
  }

  button.addEventListener("click", () => {
    const currentTheme = Number.parseInt(target.getAttribute(attribute) || "1", 10) || 1;
    const nextTheme = (currentTheme % themeCount) + 1;

    target.setAttribute(attribute, String(nextTheme));

    try {
      window.localStorage.setItem(storageKey, String(nextTheme));
    } catch {
      NOOP();
    }
  });
}

export function runTypingSequence(
  selector,
  { speed = 25, startDelay = 600, lineDelay = 120, visibleClass = "visible" } = {}
) {
  const lines = Array.from(document.querySelectorAll(selector));
  if (!lines.length) {
    return;
  }

  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function typeLine(line, text) {
    return new Promise((resolve) => {
      line.classList.add(visibleClass);

      if (reducedMotion) {
        line.textContent = text;
        resolve();
        return;
      }

      const cursor = document.createElement("span");
      cursor.className = "cursor";
      line.appendChild(cursor);

      let index = 0;

      function tick() {
        if (index < text.length) {
          line.insertBefore(document.createTextNode(text[index]), cursor);
          index += 1;
          window.setTimeout(tick, speed);
          return;
        }

        cursor.remove();
        resolve();
      }

      tick();
    });
  }

  window.setTimeout(() => {
    let currentIndex = 0;

    function runNext() {
      if (currentIndex >= lines.length) {
        return;
      }

      const line = lines[currentIndex];
      currentIndex += 1;

      typeLine(line, line.dataset.text || "").then(() => {
        window.setTimeout(runNext, lineDelay);
      });
    }

    runNext();
  }, startDelay);
}
