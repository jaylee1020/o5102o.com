import { bindCopyButton, registerServiceWorker, runTypingSequence, setupThemeToggle } from "/shared/site.js";

bindCopyButton(document.getElementById("email-btn"), {
  text: "jyounglee1020@gmail.com",
  fallbackUrl: "mailto:jyounglee1020@gmail.com",
});

setupThemeToggle(document.getElementById("theme-btn"));
runTypingSequence(".intro-line");
registerServiceWorker();
