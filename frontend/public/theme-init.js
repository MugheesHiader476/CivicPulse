// Runs before first paint so a saved theme preference never flashes the wrong colours.
// Kept as an external file because the Content-Security-Policy forbids inline scripts.
(function () {
  try {
    var saved = window.localStorage.getItem("civicpulse.theme");
    if (saved === "light" || saved === "dark") {
      document.documentElement.setAttribute("data-theme", saved);
    }
  } catch (e) {
    // Storage can be unavailable (private mode, blocked site data). The OS preference still applies.
  }
})();
