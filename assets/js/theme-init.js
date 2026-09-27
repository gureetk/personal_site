/* Runs before first paint so a saved theme choice doesn't flash. */
(function () {
  var root = document.documentElement;
  try {
    var saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") root.setAttribute("data-theme", saved);
  } catch (e) {
    /* Storage can be blocked; the system theme still applies. */
  }
  root.classList.remove("no-js");
  root.classList.add("js");
})();
