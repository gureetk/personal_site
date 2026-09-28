/* Runs before first paint so a saved theme doesn't flash. */
(function () {
  var root = document.documentElement;
  try {
    var saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") root.setAttribute("data-theme", saved);
  } catch (e) {
    /* Storage blocked: the system theme applies. */
  }
})();
