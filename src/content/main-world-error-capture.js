// MAIN world: capture page errors and forward to isolated bridge via DOM CustomEvent.
(function () {
  'use strict';
  if (window.__devlynxMainWorldLoaded) return;
  window.__devlynxMainWorldLoaded = true;
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

  window.onerror = function (msg, src, line, col, err) {
    const loc = (src || '') + ':' + (line || 0) + ':' + (col || 0);
    if (err && err.stack) forward(String(msg) + ' @ ' + loc + '\n' + err.stack);
    else forward(String(msg) + ' @ ' + loc);
  };

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

  // Hook fetch to capture failed network requests (4xx, 5xx, network errors)
  try {
    const origFetch = window.fetch;
    if (typeof origFetch === 'function') {
      window.fetch = function () {
        const req = arguments[0];
        const url = req instanceof Request ? req.url : String(req || '');
        const method = (arguments[1] && arguments[1].method) || (req instanceof Request && req.method) || 'GET';
        return origFetch.apply(this, arguments).then(
          function (res) {
            if (!res.ok) {
              forward('[Network] ' + method.toUpperCase() + ' ' + res.status + ' ' + res.statusText + ' — ' + url);
            }
            return res;
          },
          function (err) {
            forward('[Network] ' + method.toUpperCase() + ' failed — ' + url + (err && err.message ? ': ' + err.message : ''));
            throw err;
          }
        );
      };
    }
  } catch (e) {
    /* ignore */
  }

  // Hook XHR to capture failed network requests
  try {
    const origOpen = XMLHttpRequest.prototype.open;
    const origSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url) {
      this.__devlynx_url = String(url || '');
      this.__devlynx_method = String(method || 'GET').toUpperCase();
      return origOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function () {
      const xhr = this;
      xhr.addEventListener('load', function () {
        if (xhr.status >= 400) {
          forward('[Network] ' + xhr.__devlynx_method + ' ' + xhr.status + ' ' + xhr.statusText + ' — ' + xhr.__devlynx_url);
        }
      });
      xhr.addEventListener('error', function () {
        forward('[Network] ' + xhr.__devlynx_method + ' failed (network error) — ' + xhr.__devlynx_url);
      });
      return origSend.apply(this, arguments);
    };
  } catch (e) {
    /* ignore */
  }
})();
