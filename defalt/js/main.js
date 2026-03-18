import { createAsciiCameraApp } from "./ascii-camera-app.js";

const app = createAsciiCameraApp({
  screen: document.getElementById("screen"),
  video: document.getElementById("camera"),
  buffer: document.getElementById("buffer"),
  overlay: document.getElementById("status-overlay")
});

app.initialize();

/* ── Fullscreen toggle helper (cross-browser) ── */
function toggleFullscreen() {
  const doc = document;
  const el = doc.documentElement;

  const isFullscreen = doc.fullscreenElement || doc.webkitFullscreenElement;

  if (isFullscreen) {
    const exitFullscreen = doc.exitFullscreen || doc.webkitExitFullscreen;
    if (!exitFullscreen) {
      return;
    }

    const result = exitFullscreen.call(doc);
    if (result?.catch) {
      result.catch(() => {});
    }
  } else {
    const requestFullscreen = el.requestFullscreen || el.webkitRequestFullscreen;
    if (!requestFullscreen) {
      return;
    }

    const result = requestFullscreen.call(el);
    if (result?.catch) {
      result.catch(() => {});
    }
  }
}

let pendingClickTimeoutId = 0;

function scheduleClickToggle() {
  if (pendingClickTimeoutId) {
    window.clearTimeout(pendingClickTimeoutId);
  }

  pendingClickTimeoutId = window.setTimeout(() => {
    pendingClickTimeoutId = 0;
    toggleFullscreen();
  }, 220);
}

function cancelPendingClickToggle() {
  if (!pendingClickTimeoutId) {
    return;
  }

  window.clearTimeout(pendingClickTimeoutId);
  pendingClickTimeoutId = 0;
}

document.addEventListener("click", scheduleClickToggle);

document.addEventListener("dblclick", (e) => {
  e.preventDefault();
  cancelPendingClickToggle();
  toggleFullscreen();
});

document.addEventListener("keydown", (e) => {
  if (e.key === "f" || e.key === "F" || e.key === "F11") {
    e.preventDefault();
    cancelPendingClickToggle();
    toggleFullscreen();
  }
});

window.addEventListener("beforeunload", () => {
  cancelPendingClickToggle();
  app.destroy();
});
