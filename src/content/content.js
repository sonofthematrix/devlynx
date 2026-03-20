// DevLynx AI – Browser Mod Builder content script
// Loads saved mods per site; injects CSS/JS; click-to-edit mode
// Draait NIET op Speed Dial / startpagina / browser-interne pagina's

(function () {
  'use strict';

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

  function injectMod(css, js) {
    if (css && typeof css === 'string') {
      const style = document.createElement('style');
      style.setAttribute('data-devlens-mod', '1');
      style.textContent = css;
      (document.head || document.documentElement).appendChild(style);
    }
    if (js && typeof js === 'string') {
      const script = document.createElement('script');
      script.setAttribute('data-devlens-mod', '1');
      script.textContent = js;
      (document.head || document.documentElement).appendChild(script);
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

  // Load saved mod for this hostname on page load
  const hostname = getHostname();
  if (hostname) {
    chrome.storage.local.get([STORAGE_PREFIX + hostname], (result) => {
      const data = result[STORAGE_PREFIX + hostname];
      if (data && (data.css || data.js)) injectMod(data.css, data.js);
    });
  }

  chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
    if (message.type === 'GET_SELECTION') {
      const text = window.getSelection ? window.getSelection().toString() : '';
      sendResponse({ text: text || '' });
      return true;
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
          injectMod(css || '', js || '');
          sendResponse({ ok: true });
        });
      });
      return true;
    }

    if (message.type === 'START_EXPLAIN_MODE') {
      startExplainMode();
      sendResponse({ ok: true });
      return true;
    }

    if (message.type === 'STOP_EXPLAIN_MODE') {
      stopExplainMode();
      sendResponse({ ok: true });
      return true;
    }

    if (message.type === 'START_INSPECT_MODE') {
      startInspectMode();
      sendResponse({ ok: true });
      return true;
    }

    if (message.type === 'STOP_INSPECT_MODE') {
      stopInspectMode();
      sendResponse({ ok: true });
      return true;
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
      // Return captured errors (needs a small interceptor at the top of the page ideally, but we'll return window.devlensErrors)
      sendResponse({ errors: window.devlensErrors || [] });
      return true;
    }

    if (message.type === 'SHOW_EXPLAIN_RESULT') {
      showExplainToast(message.answer != null ? String(message.answer) : '', false);
      sendResponse({ ok: true });
      return true;
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
      return true;
    }

    return false;
  });

  // --- UI for In-Page AI Explainer Toast ---
  let explainToastEl = null;

  function showExplainToast(text, isLoading) {
    if (!explainToastEl) {
      explainToastEl = document.createElement('div');
      explainToastEl.className = 'devlens-explainer-toast';
      document.body.appendChild(explainToastEl);
    }
    
    const contentHtml = isLoading 
      ? `<div class="devlens-loading-pulse">${text}</div>`
      : `<div>${text.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</div>`;

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

  // --- Capture console errors from MAIN world ---
  window.devlensErrors = [];
  
  // Listen for errors forwarded from the main world (injected via manifest.json)
  window.addEventListener('DevLynxErrorCaptured', (e) => {
    if (e.detail) {
      window.devlensErrors.push(e.detail);
    }
  });

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
    e.preventDefault();
    e.stopPropagation();
    const el = e.target;
    if (!el || el === overlayEl || (toolbarEl && toolbarEl.contains(el))) return;
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
    let left = rect.left + window.scrollX;
    let top = rect.top + window.scrollY - tRect.height - 6;
    if (top < 0) top = rect.top + rect.height + window.scrollY + 6;
    if (left + tRect.width > document.documentElement.scrollWidth) left = document.documentElement.scrollWidth - tRect.width - 8;
    if (left < 0) left = 8;
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
