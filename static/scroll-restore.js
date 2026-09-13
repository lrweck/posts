(function () {
  "use strict";
  var KEY = "postsScrollPos";
  function save() {
    try {
      sessionStorage.setItem(KEY, String(window.scrollY));
    } catch (e) {}
  }
  function restore() {
    var y = 0;
    try {
      y = parseInt(sessionStorage.getItem(KEY), 10) || 0;
    } catch (e) {}
    sessionStorage.removeItem(KEY);
    if ("scrollRestoration" in history) {
      history.scrollRestoration = "manual";
    }
    window.scrollTo({ top: y, behavior: "instant" });
  }
  window.addEventListener("beforeunload", save);
  if (performance.getEntriesByType("navigation")[0].type === "reload") {
    restore();
  }
})();
