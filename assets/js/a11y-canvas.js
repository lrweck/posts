// Wire the theme's a11y toggles to this site's actual chrome:
// the site-wide #background-canvas and the card/menu backdrop-blur layers.
// (The theme's own handlers target hero-specific elements that this site does
// not render: #background-image and script[data-blur-id].)
(function () {
  var SIG = "bf-a11y-canvas-wired";

  function apply() {
    var s = (window.A11yPanel && window.A11yPanel.getSettings()) || {};

    var canvas = document.getElementById("background-canvas");
    if (canvas) canvas.style.display = s.disableImages ? "none" : "";

    var style = document.getElementById("a11y-no-blur");
    if (s.disableBlur) {
      if (!style) {
        style = document.createElement("style");
        style.id = "a11y-no-blur";
        style.textContent =
          "* { backdrop-filter: none !important; -webkit-backdrop-filter: none !important; }";
        document.head.appendChild(style);
      }
    } else if (style) {
      style.remove();
    }
  }

  function wire(selector) {
    document.querySelectorAll(selector).forEach(function (cb) {
      if (cb.getAttribute("data-" + SIG)) return;
      cb.setAttribute("data-" + SIG, "1");
      var orig = cb.onchange;
      cb.onchange = function (e) {
        orig && orig(e);
        apply();
      };
    });
  }

  function init() {
    apply();
    wire("[id$='-disable-images']");
    wire("[id$='-disable-blur']");
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();