// Isolated-world bridge: receives errors from MAIN-world capture script.
// Runs at document_start so it catches all errors from the very beginning of page load.
// content.js only runs at document_idle — errors between document_start and document_idle
// would be lost without this bridge.
(function () {
  'use strict';
  window.devlensErrors = window.devlensErrors || [];

  // Remove any previously registered listeners before re-adding — prevents duplicates
  // when the bridge is injected both by the manifest and programmatically.
  if (window.__devlynxBridgeMsgHandler) {
    try { window.removeEventListener('message', window.__devlynxBridgeMsgHandler, false); } catch (_) {}
  }
  if (window.__devlynxBridgeEventHandler) {
    try { window.removeEventListener('DevLynxErrorCaptured', window.__devlynxBridgeEventHandler, true); } catch (_) {}
  }

  window.__devlynxBridgeMsgHandler = function (ev) {
    try {
      if (ev.source !== window) return; // reject messages from other frames
      if (!ev.data || ev.data.source !== '__DEVLYNX_ERR__') return;
      if (typeof ev.data.detail !== 'string' || !ev.data.detail) return;
      window.devlensErrors.push(ev.data.detail);
    } catch (_) {}
  };

  // CustomEvent path — fallback (may work in some Chrome builds, harmless if not).
  window.__devlynxBridgeEventHandler = function (e) {
    if (e && e.detail != null) window.devlensErrors.push(String(e.detail));
  };

  window.addEventListener('message', window.__devlynxBridgeMsgHandler, false);
  window.addEventListener('DevLynxErrorCaptured', window.__devlynxBridgeEventHandler, true);
})();
