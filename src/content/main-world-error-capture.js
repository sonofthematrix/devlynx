// MAIN world: capture page errors and forward to isolated bridge via DOM CustomEvent.
(function () {
  'use strict';
  try {
    const p = window.location.protocol;
    const h = (window.location.hostname || '').toLowerCase();
    if (p !== 'http:' && p !== 'https:') return;
    if (h === 'start.opera.com' || h === 'newtab.opera.com') return;
  } catch (e) {
    return;
  }

  function forward(detail) {
    if (detail == null || detail === '') return;
    const text = String(detail);
    try {
      document.dispatchEvent(
        new CustomEvent('DevLynxErrorCaptured', { detail: text, bubbles: true, cancelable: false })
      );
    } catch (e) {
      /* ignore */
    }
    // Isolated content scripts often do NOT receive CustomEvents from MAIN; postMessage is reliable.
    try {
      window.postMessage({ source: '__DEVLYNX_ERR__', detail: text }, '*');
    } catch (e) {
      /* ignore */
    }
  }

  window.addEventListener(
    'error',
    function (ev) {
      const msg = ev.message || 'Error';
      const loc = (ev.filename || '') + ':' + (ev.lineno || 0) + ':' + (ev.colno || 0);
      if (ev.error && ev.error.stack) forward(msg + ' @ ' + loc + '\n' + ev.error.stack);
      else forward(msg + ' @ ' + loc);
    },
    true
  );

  window.addEventListener('unhandledrejection', function (ev) {
    const r = ev.reason;
    const text =
      r && typeof r === 'object' && r.stack
        ? String(r.message != null ? r.message : r) + '\n' + r.stack
        : String(r != null ? r : 'Unhandled rejection');
    forward(text);
  });

  try {
    const orig = console.error;
    if (typeof orig !== 'function') return;
    console.error = function () {
      try {
        const parts = Array.prototype.slice.call(arguments).map(function (x) {
          if (x && typeof x === 'object' && x.stack) {
            return String(x.message != null ? x.message : x) + '\n' + x.stack;
          }
          try {
            return String(x);
          } catch (e) {
            return '[object]';
          }
        });
        const line = parts.join(' ');
        if (line) forward('[console.error] ' + line);
      } catch (e) {
        /* ignore */
      }
      return orig.apply(console, arguments);
    };
  } catch (e) {
    /* page may have locked console */
  }
})();
