// DevLynx AI – Browser Mod Builder content script
// Loads saved mods per site; injects CSS/JS; click-to-edit mode
// Draait NIET op Speed Dial / startpagina / browser-interne pagina's

(function () {
  'use strict';

  // Remove any stale onMessage listener from a previous injection (e.g. after extension reload).
  // Using remove+re-add instead of a skip-guard so the listener is always live and up-to-date.
  if (typeof window.__devlynxOnMessageHandler === 'function') {
    try { chrome.runtime.onMessage.removeListener(window.__devlynxOnMessageHandler); } catch (_) {}
    window.__devlynxOnMessageHandler = null;
  }

  // Nooit draaien op browser-interne of startpagina's (dubbel veilig naast manifest exclude_matches)
  try {
    const p = window.location.protocol;
    const h = (window.location.hostname || '').toLowerCase();
    if (p !== 'http:' && p !== 'https:') return;
    if (h === 'start.opera.com' || h === 'newtab.opera.com') return;
  } catch (e) {
    return;
  }

  const STORAGE_PREFIX = 'devlens_browser_mod_';

  function getHostname() {
    try {
      return new URL(window.location.href).hostname || window.location.hostname || '';
    } catch {
      return '';
    }
  }

  function injectMod(css, js, showFeedback) {
    if (css && typeof css === 'string') {
      // insertCSS (via background) is exempt from the page's CSP — works on Stripe, GitHub, etc.
      chrome.runtime.sendMessage({ type: 'APPLY_CSS_MOD', css }).catch(() => {});
    }
    if (js && typeof js === 'string') {
      // Background will try executeScript (MAIN world). If the page CSP blocks eval,
      // it sends SHOW_MOD_STATUS back so we can notify the user. showFeedback=false
      // suppresses the toast on silent page-load restoration.
      chrome.runtime.sendMessage({ type: 'EXECUTE_MOD_JS', code: js, showFeedback: !!showFeedback }).catch(() => {});
    }
  }

  function getSelector(el) {
    if (!el || !el.tagName) return null;
    if (el.id && /^[a-zA-Z][\w-]*$/.test(el.id)) return '#' + el.id;
    const path = [];
    let current = el;
    while (current && current !== document.body) {
      let part = current.tagName.toLowerCase();
      if (current.id && /^[a-zA-Z][\w-]*$/.test(current.id)) {
        part += '#' + current.id;
        path.unshift(part);
        break;
      }
      const parent = current.parentElement;
      if (!parent) break;
      const siblings = Array.from(parent.children).filter((c) => c.tagName === current.tagName);
      if (siblings.length > 1) {
        const idx = siblings.indexOf(current) + 1;
        part += ':nth-of-type(' + idx + ')';
      }
      path.unshift(part);
      current = parent;
    }
    return path.join(' > ');
  }

  // Load saved mod for this hostname on page load — silent (no CSP toast on restoration)
  const hostname = getHostname();
  if (hostname) {
    chrome.storage.local.get([STORAGE_PREFIX + hostname], (result) => {
      const data = result[STORAGE_PREFIX + hostname];
      if (data && (data.css || data.js)) injectMod(data.css, data.js, false);
    });
  }

  try { console.log('🔧 DevLynx content script loaded'); } catch (_) {}
  // Persist across re-injections so errors captured before a reload aren't lost.
  window.__devlynxCapturedErrors = window.__devlynxCapturedErrors || [];
  const capturedErrors = window.__devlynxCapturedErrors;
  window.__devlynxMainWorldErrors = window.__devlynxMainWorldErrors || [];
  const mainWorldPostedErrors = window.__devlynxMainWorldErrors;

  // Remove-then-re-add so re-injections never leave a second listener alive.
  if (typeof window.__devlynxContentMsgHandler === 'function') {
    try { window.removeEventListener('message', window.__devlynxContentMsgHandler, false); } catch (_) {}
  }
  window.__devlynxContentMsgHandler = function (ev) {
    try {
      if (ev.source !== window) return; // reject messages from other frames
      if (!ev.data || ev.data.source !== '__DEVLYNX_ERR__') return;
      if (typeof ev.data.detail !== 'string' || !ev.data.detail) return;
      mainWorldPostedErrors.push(ev.data.detail);
    } catch (_) {}
  };
  window.addEventListener('message', window.__devlynxContentMsgHandler, false);

  function toErrorText(arg) {
    if (arg == null) return String(arg);
    if (typeof arg === 'object') {
      try { return JSON.stringify(arg, null, 2); } catch (_) { return String(arg); }
    }
    return String(arg);
  }

  function getAllCapturedErrors() {
    // Deduplicate each source individually first, then cross-deduplicate in the merge loop.
    // This handles any residual double-push from listeners that fired twice.
    const bridgeErrors = [...new Set(Array.isArray(window.devlensErrors) ? window.devlensErrors : [])];
    const mainErrors = [...new Set(mainWorldPostedErrors)];
const merged = mainErrors.concat(bridgeErrors).concat([...new Set(capturedErrors)]);
    const seen = new Set();
    const out = [];
    for (let i = 0; i < merged.length; i++) {
      const s = String(merged[i] || '').trim();
      if (!s || seen.has(s)) continue;
      seen.add(s);
      out.push(merged[i]);
    }
    return out;
  }

  if (typeof console !== 'undefined' && !window.__devlynxContentConsoleHook) {
    window.__devlynxContentConsoleHook = true;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalLog = console.log;

    console.error = function (...args) {
      try {
        capturedErrors.push('[ERROR] ' + args.map(toErrorText).join(' '));
      } catch (_) {}
      return originalError.apply(console, args);
    };

    console.warn = function (...args) {
      try {
        capturedErrors.push('[WARN] ' + args.map(toErrorText).join(' '));
      } catch (_) {}
      return originalWarn.apply(console, args);
    };

    console.log = function (...args) {
      try {
        const line = args.map(toErrorText).join(' ');
        if (/error|fail|404|401|403|429|500/i.test(line) && !line.startsWith('[DevLynx')) {
          capturedErrors.push('[LOG] ' + line);
        }
      } catch (_) {}
      return originalLog.apply(console, args);
    };
  }

  window.__devlynxOnMessageHandler = (message, _sender, sendResponse) => {
    if (message && message.action === 'getErrors') {
      const errors = getAllCapturedErrors();
      sendResponse({ success: true, errors, count: errors.length, timestamp: Date.now() });
      return false;
    }

    if (message && message.action === 'ping') {
      sendResponse({ alive: true, script: 'content.js', timestamp: Date.now() });
      return false;
    }

    if (message.type === 'GET_SELECTION') {
      const text = window.getSelection ? window.getSelection().toString() : '';
      sendResponse({ text: text || '' });
      return false;
    }
    if (message.type === 'INJECT_AND_SAVE_MOD') {
      const { css, js, hostname: targetHost } = message;
      const h = targetHost || getHostname();
      if (!h) {
        sendResponse({ ok: false, error: 'No hostname' });
        return true;
      }
      const key = STORAGE_PREFIX + h;
      chrome.storage.local.get([key], (result) => {
        const existing = result[key] || { css: '', js: '' };
        const newCss = (existing.css ? existing.css + '\n' : '') + (css || '');
        const newJs = (existing.js ? existing.js + '\n' : '') + (js || '');
        const payload = { css: newCss, js: newJs };
        chrome.storage.local.set({ [key]: payload }, () => {
          injectMod(css || '', js || '', true); // showFeedback=true — user actively applied this mod
          sendResponse({ ok: true });
        });
      });
      return true;
    }

    if (message.type === 'START_EXPLAIN_MODE') {
      if (inspectMode) stopInspectMode();
      startExplainMode();
      sendResponse({ ok: true });
      return false;
    }

    if (message.type === 'STOP_EXPLAIN_MODE') {
      stopExplainMode();
      sendResponse({ ok: true });
      return false;
    }

    if (message.type === 'START_INSPECT_MODE') {
      if (explainMode) stopExplainMode();
      startInspectMode();
      sendResponse({ ok: true });
      return false;
    }

    if (message.type === 'STOP_INSPECT_MODE') {
      stopInspectMode();
      sendResponse({ ok: true });
      return false;
    }

    if (message.type === 'RESET_PAGE_MODS') {
      const h = getHostname();
      if (!h) {
        sendResponse({ ok: false, error: 'No hostname' });
        return true;
      }
      chrome.storage.local.remove([STORAGE_PREFIX + h], () => {
        sendResponse({ ok: true });
        window.location.reload();
      });
      return true;
    }

    if (message.type === 'GET_CONSOLE_ERRORS') {
      sendResponse({ errors: getAllCapturedErrors() });
      return false;
    }

    if (message.type === 'SHOW_EXPLAIN_RESULT') {
      showExplainToast(message.answer != null ? String(message.answer) : '', false);
      sendResponse({ ok: true });
      return false;
    }

    if (message.type === 'SHOW_MOD_STATUS') {
      showExplainToast(message.message != null ? String(message.message) : '', false);
      sendResponse({ ok: true });
      return false;
    }

    if (message.type === 'EXPLAIN_LAST_RIGHT_CLICKED_ELEMENT') {
      const el = lastRightClickTarget;
      lastRightClickTarget = null;
      if (el && el.tagName) {
        explainElement(el);
        sendResponse({ ok: true });
      } else {
        sendResponse({ ok: false, error: 'No element. Click Try it! then click an element on the page.' });
      }
      return false;
    }

    return false;
  };
  chrome.runtime.onMessage.addListener(window.__devlynxOnMessageHandler);

  // --- UI for In-Page AI Explainer Toast ---
  let explainToastEl = null;

  function showExplainToast(text, isLoading) {
    if (!explainToastEl) {
      explainToastEl = document.createElement('div');
      explainToastEl.className = 'devlens-explainer-toast';
      document.body.appendChild(explainToastEl);
    }
    
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const contentHtml = isLoading
      ? `<div class="devlens-loading-pulse">${escaped}</div>`
      : `<div>${escaped}</div>`;

    explainToastEl.innerHTML = `
      <div class="devlens-explainer-header">
        <div class="devlens-explainer-title">✨ DevLynx AI Explain Element</div>
        <button class="devlens-explainer-close" title="Close">✕</button>
      </div>
      <div class="devlens-explainer-content">${contentHtml}</div>
    `;

    explainToastEl.querySelector('.devlens-explainer-close').addEventListener('click', () => {
      explainToastEl.classList.remove('show');
    });

    // Force reflow for animation
    void explainToastEl.offsetWidth;
    explainToastEl.classList.add('show');
  }

  // Console errors: captured in isolated `error-capture-bridge.js` + MAIN `main-world-error-capture.js` (manifest).

  let lastRightClickTarget = null;
  document.addEventListener('contextmenu', (e) => {
    lastRightClickTarget = e.target;
  }, true);

  let inspectMode = false;
  let explainMode = false;
  let overlayEl = null;
  let toolbarEl = null;
  let currentTarget = null;

  function startInspectMode() {
    if (inspectMode || explainMode) return;
    inspectMode = true;
    document.body.classList.add('devlens-inspect-mode');
    document.addEventListener('click', onPageClick, true);
    document.addEventListener('mouseover', onPageHover, true);
    document.addEventListener('mouseout', onPageOut, true);
  }

  function stopInspectMode() {
    if (!inspectMode) return;
    inspectMode = false;
    document.body.classList.remove('devlens-inspect-mode');
    document.removeEventListener('click', onPageClick, true);
    document.removeEventListener('mouseover', onPageHover, true);
    document.removeEventListener('mouseout', onPageOut, true);
    removeToolbar();
    currentTarget = null;
  }

  function startExplainMode() {
    if (inspectMode || explainMode) return;
    explainMode = true;
    document.body.classList.add('devlens-inspect-mode');
    document.addEventListener('click', onExplainClick, true);
    document.addEventListener('mouseover', onPageHover, true);
    document.addEventListener('mouseout', onPageOut, true);
  }

  function stopExplainMode() {
    if (!explainMode) return;
    explainMode = false;
    document.body.classList.remove('devlens-inspect-mode');
    document.removeEventListener('click', onExplainClick, true);
    document.removeEventListener('mouseover', onPageHover, true);
    document.removeEventListener('mouseout', onPageOut, true);
    currentTarget = null;
  }

  const SMALL_ELEMENT_TAGS = ['SPAN', 'SVG', 'I', 'PATH', 'IMG'];
  const PARENT_HTML_MAX_LEN = 1000;

  function explainElement(el) {
    if (!el || !el.tagName) return;
    // Use parent as target when user clicked a small element (icon, span, svg)
    let target = el;
    if (SMALL_ELEMENT_TAGS.includes(el.tagName) && el.parentElement && el.parentElement !== document.body) {
      target = el.parentElement;
    }
    const tagName = target.tagName.toLowerCase();
    const id = target.id ? `#${target.id}` : '';
    const classes = target.className && typeof target.className === 'string' ? target.className.trim() : '';
    const selector = `${tagName}${id}${(classes && '.' + classes.split(/\s+/).join('.')) || ''}`;

    // Parent: full HTML (truncated) so AI can see hero/navbar/card/form context
    let parentHtml = '';
    if (target.parentElement && target.parentElement !== document.body) {
      let raw = target.parentElement.outerHTML || '';
      if (raw.length > PARENT_HTML_MAX_LEN) raw = raw.substring(0, PARENT_HTML_MAX_LEN) + '…';
      parentHtml = raw.replace(/src="data:image\/[^"]+"/g, 'src="data:image/..."').replace(/<path d="[^"]+"/g, '<path d="..."');
    }

    // Get computed styles (the visual reality)
    const computed = window.getComputedStyle(target);
    const stylesToKeep = ['display', 'position', 'background-color', 'color', 'font-family', 'font-size', 'padding', 'margin', 'border-radius'];
    const styleObj = {};
    stylesToKeep.forEach(prop => {
      const val = computed.getPropertyValue(prop);
      if (val && val !== 'rgba(0, 0, 0, 0)' && val !== 'none' && val !== '0px') {
        styleObj[prop] = val;
      }
    });

    // Clean up target HTML (remove huge data URIs or SVG paths that eat tokens)
    let cleanHtml = target.outerHTML;
    if (cleanHtml.length > 500) {
      cleanHtml = cleanHtml.replace(/src="data:image\/[^"]+"/g, 'src="data:image/..."');
      cleanHtml = cleanHtml.replace(/<path d="[^"]+"/g, '<path d="..."');
    }

    const payloadHtml = `
Tag: ${target.tagName}
Classes: ${classes || '(none)'}
Parent container HTML:
${parentHtml || '(none)'}

Target HTML:
${cleanHtml.substring(0, 1500)}

Computed Styles:
${JSON.stringify(styleObj, null, 2)}
    `.trim();

    showExplainToast('Analyzing element…', true);

    chrome.runtime.sendMessage({
      type: 'ELEMENT_EXPLAIN_DATA',
      html: payloadHtml,
      selector: selector
    });
  }

  function onExplainClick(e) {
    e.preventDefault();
    e.stopPropagation();
    const el = e.target;
    if (!el) return;
    if (el.classList.contains('devlens-inspect-hover')) el.classList.remove('devlens-inspect-hover');
    stopExplainMode();
    explainElement(el);
  }

  function onPageHover(e) {
    const el = e.target;
    if (!el || el === overlayEl || (toolbarEl && toolbarEl.contains(el))) return;
    el.classList.add('devlens-inspect-hover');
  }

  function onPageOut(e) {
    if (e.target) e.target.classList.remove('devlens-inspect-hover');
  }

  function onPageClick(e) {
    const el = e.target;
    if (!el || el === overlayEl || (toolbarEl && toolbarEl.contains(el))) return;
    e.preventDefault();
    e.stopPropagation();
    if (el.classList.contains('devlens-inspect-hover')) el.classList.remove('devlens-inspect-hover');
    currentTarget = el;
    showToolbar(el);
  }

  function removeToolbar() {
    if (toolbarEl && toolbarEl.parentNode) toolbarEl.parentNode.removeChild(toolbarEl);
    toolbarEl = null;
  }

  function showToolbar(el) {
    removeToolbar();
    const rect = el.getBoundingClientRect();
    toolbarEl = document.createElement('div');
    toolbarEl.className = 'devlens-mod-toolbar';
    toolbarEl.innerHTML = [
      '<button type="button" data-action="text">Change text</button>',
      '<button type="button" data-action="color">Color</button>',
      '<button type="button" data-action="hide">Hide</button>',
      '<button type="button" data-action="button">Add button</button>',
      '<button type="button" data-action="close">✕</button>'
    ].join('');
    document.body.appendChild(toolbarEl);
    const tRect = toolbarEl.getBoundingClientRect();
    // position: fixed — coords are viewport-relative, no scroll offset needed
    let left = rect.left;
    let top = rect.top - tRect.height - 6;
    if (top < 4) top = rect.bottom + 6;
    if (left + tRect.width > window.innerWidth - 4) left = window.innerWidth - tRect.width - 8;
    if (left < 4) left = 4;
    toolbarEl.style.left = left + 'px';
    toolbarEl.style.top = top + 'px';

    toolbarEl.querySelector('[data-action="close"]').addEventListener('click', () => {
      stopInspectMode();
    });
    toolbarEl.querySelector('[data-action="text"]').addEventListener('click', () => applyAction('text', el));
    toolbarEl.querySelector('[data-action="color"]').addEventListener('click', () => applyAction('color', el));
    toolbarEl.querySelector('[data-action="hide"]').addEventListener('click', () => applyAction('hide', el));
    toolbarEl.querySelector('[data-action="button"]').addEventListener('click', () => applyAction('button', el));
  }

  function applyAction(action, el) {
    const selector = getSelector(el);
    if (!selector) return;
    const h = getHostname();
    const key = STORAGE_PREFIX + h;

    if (action === 'text') {
      const newText = window.prompt('New text:', el.textContent ? el.textContent.slice(0, 80) : '');
      if (newText == null) return;
      const js = `(function(){ var e = document.querySelector("${selector.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"); if(e) e.textContent = ${JSON.stringify(newText)}; })();`;
      appendAndSave(key, '', js);
      el.textContent = newText;
    } else if (action === 'color') {
      const color = window.prompt('Color (e.g. #333 or red):', '#333333');
      if (color == null) return;
      const css = `${selector} { color: ${color} !important; }\n`;
      appendAndSave(key, css, '');
      el.style.setProperty('color', color, 'important');
    } else if (action === 'hide') {
      const css = `${selector} { display: none !important; }\n`;
      appendAndSave(key, css, '');
      el.style.setProperty('display', 'none', 'important');
    } else if (action === 'button') {
      if (!el.parentElement) return;
      const label = window.prompt('Button label:', 'Click');
      if (label == null) return;
      const parentSelector = getSelector(el.parentElement) || 'body';
      const js = `(function(){ var p = document.querySelector("${parentSelector.replace(/\\/g, '\\\\').replace(/"/g, '\\"')}"); if(p){ var b = document.createElement("button"); b.textContent = ${JSON.stringify(label)}; b.onclick = function(){ alert("Button added by Mod Builder"); }; p.appendChild(b); } })();`;
      appendAndSave(key, '', js);
      const btn = document.createElement('button');
      btn.textContent = label;
      btn.onclick = () => alert('Button added by Mod Builder');
      el.parentElement.appendChild(btn);
    }
    removeToolbar();
    currentTarget = null;
  }

  function appendAndSave(key, css, js) {
    chrome.storage.local.get([key], (result) => {
      const existing = result[key] || { css: '', js: '' };
      const payload = {
        css: existing.css + (css || ''),
        js: existing.js + (js || '')
      };
      chrome.storage.local.set({ [key]: payload });
    });
  }
})();
