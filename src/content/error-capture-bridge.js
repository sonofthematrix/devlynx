// Isolated-world bridge: receives CustomEvents from main-world error capture (same DOM).
(function () {
  'use strict';
  window.devlensErrors = window.devlensErrors || [];
  window.addEventListener(
    'DevLynxErrorCaptured',
    function (e) {
      if (e && e.detail != null) window.devlensErrors.push(String(e.detail));
    },
    true
  );
})();
