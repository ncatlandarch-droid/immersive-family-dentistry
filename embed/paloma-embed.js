/* ═══════════════════════════════════════════════════════════════════════════
   PALOMA Embeddable Chat Widget v1.0
   Self-contained — zero external dependencies.
   Drop ONE <script> tag onto any page.
   
   Usage:
   <script src="https://ljfamilydentist-paloma.netlify.app/embed/paloma-embed.js"
           data-practice="brenes"></script>
   
   © 2026 Think! Design and Planning, LLC
   ═══════════════════════════════════════════════════════════════════════════ */
;(function () {
  'use strict';

  // ── Prevent double-init ──────────────────────────────────────────────────
  if (window.__PALOMA_EMBED_LOADED__) return;
  window.__PALOMA_EMBED_LOADED__ = true;

  // ── Config ───────────────────────────────────────────────────────────────
  var scriptTag = document.currentScript || (function () {
    var scripts = document.getElementsByTagName('script');
    return scripts[scripts.length - 1];
  })();
  var PRACTICE   = scriptTag.getAttribute('data-practice') || 'brenes';
  var API_URL    = 'https://ljfamilydentist-paloma.netlify.app/.netlify/functions/paloma-chat';
  var LS_HISTORY = 'paloma-embed-history';
  var LS_LANG    = 'paloma-embed-lang';
  var MAX_HIST   = 20;
  var PREFIX     = 'paloma-embed-';

  // ── i18n Strings ─────────────────────────────────────────────────────────
  var i18n = {
    en: {
      greeting: '¡Hola! I\'m PALOMA, your dental health guide at Brenes Precision Dentistry. I can help with questions about our services, insurance, scheduling, or dental health tips. How can I help you today?',
      chips: [
        '🦷 What services do you offer?',
        '💰 Do you accept my insurance?',
        '📅 How do I book an appointment?',
        '🔬 Tell me about your technology'
      ],
      placeholder: 'Ask PALOMA anything...',
      subtitle: 'Your AI Dental Health Guide',
      disclaimer: '🔒 AI assistant, not medical advice. For emergencies call 911.',
      powered: 'Powered by PALOMA AI 🕊️',
      closeLbl: 'Close chat',
      sendLbl: 'Send message',
      openLbl: 'Open PALOMA chat'
    },
    es: {
      greeting: '¡Hola! Soy PALOMA, tu guía de salud dental en Brenes Precision Dentistry. Puedo ayudarte con preguntas sobre nuestros servicios, seguros, citas, o consejos de salud dental. ¿En qué puedo ayudarte hoy?',
      chips: [
        '🦷 ¿Qué servicios ofrecen?',
        '💰 ¿Aceptan mi seguro dental?',
        '📅 ¿Cómo puedo hacer una cita?',
        '🔬 Cuéntame sobre su tecnología'
      ],
      placeholder: 'Pregunta a PALOMA...',
      subtitle: 'Tu Guía de Salud Dental con IA',
      disclaimer: '🔒 Asistente de IA, no es consejo médico. Para emergencias llama al 911.',
      powered: 'Creado por PALOMA AI 🕊️',
      closeLbl: 'Cerrar chat',
      sendLbl: 'Enviar mensaje',
      openLbl: 'Abrir chat de PALOMA'
    }
  };

  // ── State ─────────────────────────────────────────────────────────────────
  var lang     = loadLang();
  var history  = loadHistory();
  var isOpen   = false;
  var isSending = false;

  // ── Helpers ───────────────────────────────────────────────────────────────
  function t(key) { return (i18n[lang] || i18n.en)[key] || ''; }
  function el(tag, cls, attrs) {
    var e = document.createElement(tag);
    if (cls) e.className = PREFIX + cls;
    if (attrs) Object.keys(attrs).forEach(function (k) { e.setAttribute(k, attrs[k]); });
    return e;
  }

  function loadHistory() {
    try { return JSON.parse(localStorage.getItem(LS_HISTORY)) || []; }
    catch (_) { return []; }
  }
  function saveHistory() {
    try { localStorage.setItem(LS_HISTORY, JSON.stringify(history.slice(-MAX_HIST))); }
    catch (_) {}
  }
  function loadLang() {
    try { return localStorage.getItem(LS_LANG) || 'en'; }
    catch (_) { return 'en'; }
  }
  function saveLang() {
    try { localStorage.setItem(LS_LANG, lang); }
    catch (_) {}
  }

  // ── Remote Config Loader ─────────────────────────────────────────────
  function loadConfig(callback) {
    if (!PRACTICE) {
      callback(null);
      return;
    }

    var apiBase = (scriptTag.src || '').replace(/\/embed\/paloma-embed\.js.*$/, '');
    var configUrl = apiBase + '/.netlify/functions/widget-config?practice=' + encodeURIComponent(PRACTICE);

    // Check localStorage cache first (5 min TTL)
    var cacheKey = 'paloma_config_' + PRACTICE;
    var cached;
    try { cached = localStorage.getItem(cacheKey); } catch (e) {}
    if (cached) {
      try {
        var parsed = JSON.parse(cached);
        if (parsed._ts && (Date.now() - parsed._ts) < 300000) {
          delete parsed._ts;
          callback(parsed);
          return;
        }
      } catch (e) {}
    }

    fetch(configUrl)
      .then(function (r) { return r.json(); })
      .then(function (config) {
        config._ts = Date.now();
        try { localStorage.setItem(cacheKey, JSON.stringify(config)); } catch (e) {}
        delete config._ts;
        callback(config);
      })
      .catch(function () { callback(null); });
  }

  // ── Apply Remote Config ──────────────────────────────────────────────
  function applyConfig(config) {
    if (!config) return;

    // Override greeting text
    if (config.greeting_en) i18n.en.greeting = config.greeting_en;
    if (config.greeting_es) i18n.es.greeting = config.greeting_es;

    // Override assistant name in UI strings
    if (config.name) {
      var name = config.name;
      i18n.en.placeholder = 'Ask ' + name + ' anything...';
      i18n.es.placeholder = 'Pregunta a ' + name + '...';
      i18n.en.openLbl = 'Open ' + name + ' chat';
      i18n.es.openLbl = 'Abrir chat de ' + name;
    }

    // If practice_name is provided, ensure greetings reference it
    if (config.practice_name) {
      var pn = config.practice_name;
      if (!config.greeting_en && i18n.en.greeting.indexOf('Brenes Precision Dentistry') !== -1) {
        i18n.en.greeting = i18n.en.greeting.replace('Brenes Precision Dentistry', pn);
      }
      if (!config.greeting_es && i18n.es.greeting.indexOf('Brenes Precision Dentistry') !== -1) {
        i18n.es.greeting = i18n.es.greeting.replace('Brenes Precision Dentistry', pn);
      }
    }

    // Custom suggestion chips
    if (config.chips_en && Array.isArray(config.chips_en)) i18n.en.chips = config.chips_en;
    if (config.chips_es && Array.isArray(config.chips_es)) i18n.es.chips = config.chips_es;
  }

  // ── Inject CSS ────────────────────────────────────────────────────────────
  function injectStyles() {
    var style = document.createElement('style');
    style.id = PREFIX + 'styles';
    style.textContent = getCSSText();
    document.head.appendChild(style);
  }

  function getCSSText() {
    var P = '.' + PREFIX;
    return ''

    // ─── Reset inside widget ─────────────────────────────────────────────
    + P + 'root, ' + P + 'root *, ' + P + 'root *::before, ' + P + 'root *::after {'
    + '  box-sizing: border-box;'
    + '  margin: 0; padding: 0;'
    + '  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;'
    + '  line-height: 1.5;'
    + '  -webkit-font-smoothing: antialiased;'
    + '}'

    // ─── FAB button ──────────────────────────────────────────────────────
    + P + 'fab {'
    + '  position: fixed; bottom: 24px; right: 24px;'
    + '  width: 60px; height: 60px;'
    + '  border-radius: 50%;'
    + '  background: linear-gradient(135deg, #2dd4bf, #0d9488);'
    + '  border: none; cursor: pointer;'
    + '  box-shadow: 0 4px 24px rgba(45,212,191,0.4);'
    + '  z-index: 99999;'
    + '  display: flex; align-items: center; justify-content: center;'
    + '  transition: transform 0.25s ease, box-shadow 0.25s ease;'
    + '  outline: none;'
    + '}'
    + P + 'fab:hover, ' + P + 'fab:focus-visible {'
    + '  transform: scale(1.1);'
    + '  box-shadow: 0 6px 32px rgba(45,212,191,0.55);'
    + '}'
    + P + 'fab-icon {'
    + '  font-size: 28px; line-height: 1; pointer-events: none;'
    + '}'

    // ─── Pulse ring animation ────────────────────────────────────────────
    + P + 'fab-ring {'
    + '  position: absolute; top: 50%; left: 50%;'
    + '  width: 60px; height: 60px;'
    + '  border-radius: 50%;'
    + '  border: 2px solid rgba(45,212,191,0.5);'
    + '  transform: translate(-50%, -50%) scale(1);'
    + '  animation: ' + PREFIX + 'pulse 2s ease-out 3;'
    + '  pointer-events: none;'
    + '}'
    + '@keyframes ' + PREFIX + 'pulse {'
    + '  0% { transform: translate(-50%,-50%) scale(1); opacity: 1; }'
    + '  100% { transform: translate(-50%,-50%) scale(2); opacity: 0; }'
    + '}'

    // ─── Panel ───────────────────────────────────────────────────────────
    + P + 'panel {'
    + '  position: fixed; bottom: 96px; right: 24px;'
    + '  width: 380px; height: 520px; max-height: 70vh;'
    + '  border-radius: 16px;'
    + '  background: #0f0f1a;'
    + '  box-shadow: 0 8px 40px rgba(0,0,0,0.5);'
    + '  z-index: 99998;'
    + '  display: flex; flex-direction: column;'
    + '  overflow: hidden;'
    + '  opacity: 0; transform: translateY(20px) scale(0.96);'
    + '  pointer-events: none;'
    + '  transition: opacity 0.3s ease, transform 0.3s ease;'
    + '}'
    + P + 'panel--open {'
    + '  opacity: 1; transform: translateY(0) scale(1);'
    + '  pointer-events: auto;'
    + '}'

    // ─── Header ──────────────────────────────────────────────────────────
    + P + 'header {'
    + '  background: linear-gradient(135deg, #1a1a2e, #16213e);'
    + '  padding: 16px;'
    + '  display: flex; align-items: center; gap: 12px;'
    + '  position: relative;'
    + '  flex-shrink: 0;'
    + '}'
    + P + 'avatar {'
    + '  width: 40px; height: 40px;'
    + '  border-radius: 50%;'
    + '  background: linear-gradient(135deg, #2dd4bf, #0d9488);'
    + '  display: flex; align-items: center; justify-content: center;'
    + '  font-size: 20px; flex-shrink: 0;'
    + '}'
    + P + 'header-text {'
    + '  flex: 1;'
    + '}'
    + P + 'title {'
    + '  color: #fff; font-weight: 700; font-size: 1rem; letter-spacing: 0.5px;'
    + '}'
    + P + 'subtitle {'
    + '  color: #9ca3af; font-size: 0.75rem;'
    + '}'

    // ─── Close button ────────────────────────────────────────────────────
    + P + 'close {'
    + '  position: absolute; top: 12px; right: 12px;'
    + '  width: 28px; height: 28px;'
    + '  border-radius: 50%;'
    + '  background: rgba(255,255,255,0.08);'
    + '  border: none; cursor: pointer;'
    + '  color: #9ca3af; font-size: 16px;'
    + '  display: flex; align-items: center; justify-content: center;'
    + '  transition: background 0.2s, color 0.2s;'
    + '  outline: none;'
    + '}'
    + P + 'close:hover, ' + P + 'close:focus-visible {'
    + '  background: rgba(255,255,255,0.16); color: #fff;'
    + '}'

    // ─── Language toggle ─────────────────────────────────────────────────
    + P + 'lang-toggle {'
    + '  display: flex; gap: 4px; margin-top: 6px;'
    + '}'
    + P + 'lang-btn {'
    + '  padding: 2px 10px; border-radius: 10px;'
    + '  border: 1px solid rgba(45,212,191,0.3);'
    + '  background: transparent;'
    + '  color: #9ca3af; font-size: 0.65rem; font-weight: 600;'
    + '  cursor: pointer; transition: all 0.2s; outline: none;'
    + '}'
    + P + 'lang-btn--active {'
    + '  background: rgba(45,212,191,0.2);'
    + '  color: #2dd4bf;'
    + '  border-color: #2dd4bf;'
    + '}'

    // ─── Messages area ───────────────────────────────────────────────────
    + P + 'messages {'
    + '  flex: 1; overflow-y: auto; padding: 16px;'
    + '  display: flex; flex-direction: column; gap: 10px;'
    + '  scroll-behavior: smooth;'
    + '}'
    + P + 'messages::-webkit-scrollbar { width: 4px; }'
    + P + 'messages::-webkit-scrollbar-track { background: transparent; }'
    + P + 'messages::-webkit-scrollbar-thumb { background: #2a2a3a; border-radius: 2px; }'

    // ─── Message bubbles ─────────────────────────────────────────────────
    + P + 'msg {'
    + '  max-width: 85%; padding: 10px 14px;'
    + '  font-size: 0.85rem; line-height: 1.55;'
    + '  word-wrap: break-word; white-space: pre-wrap;'
    + '  animation: ' + PREFIX + 'fadeIn 0.25s ease;'
    + '}'
    + '@keyframes ' + PREFIX + 'fadeIn {'
    + '  from { opacity: 0; transform: translateY(6px); }'
    + '  to { opacity: 1; transform: translateY(0); }'
    + '}'
    + P + 'msg--bot {'
    + '  align-self: flex-start;'
    + '  background: #1a1a2e; color: #e2e8f0;'
    + '  border-radius: 12px 12px 12px 4px;'
    + '}'
    + P + 'msg--user {'
    + '  align-self: flex-end;'
    + '  background: linear-gradient(135deg, #2dd4bf, #0d9488); color: #fff;'
    + '  border-radius: 12px 12px 4px 12px;'
    + '}'

    // ─── Markdown bold/italic in messages ────────────────────────────────
    + P + 'msg strong { font-weight: 700; }'
    + P + 'msg em { font-style: italic; }'

    // ─── Suggestion chips ────────────────────────────────────────────────
    + P + 'chips {'
    + '  display: flex; flex-wrap: wrap; gap: 8px;'
    + '  padding: 4px 0 8px;'
    + '}'
    + P + 'chip {'
    + '  background: rgba(45,212,191,0.1);'
    + '  border: 1px solid rgba(45,212,191,0.3);'
    + '  color: #2dd4bf;'
    + '  border-radius: 20px;'
    + '  padding: 6px 14px;'
    + '  font-size: 0.75rem;'
    + '  cursor: pointer;'
    + '  transition: background 0.2s, border-color 0.2s;'
    + '  outline: none;'
    + '}'
    + P + 'chip:hover, ' + P + 'chip:focus-visible {'
    + '  background: rgba(45,212,191,0.2);'
    + '  border-color: #2dd4bf;'
    + '}'

    // ─── Typing indicator ────────────────────────────────────────────────
    + P + 'typing {'
    + '  display: flex; gap: 5px; padding: 10px 14px;'
    + '  align-self: flex-start;'
    + '  background: #1a1a2e;'
    + '  border-radius: 12px 12px 12px 4px;'
    + '}'
    + P + 'typing-dot {'
    + '  width: 7px; height: 7px;'
    + '  border-radius: 50%;'
    + '  background: #2dd4bf;'
    + '  animation: ' + PREFIX + 'bounce 1.2s ease-in-out infinite;'
    + '}'
    + P + 'typing-dot:nth-child(2) { animation-delay: 0.15s; }'
    + P + 'typing-dot:nth-child(3) { animation-delay: 0.3s; }'
    + '@keyframes ' + PREFIX + 'bounce {'
    + '  0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }'
    + '  30% { transform: translateY(-6px); opacity: 1; }'
    + '}'

    // ─── Input area ──────────────────────────────────────────────────────
    + P + 'input-area {'
    + '  background: #1a1a2e;'
    + '  border-top: 1px solid #2a2a3a;'
    + '  padding: 12px;'
    + '  display: flex; gap: 8px; align-items: center;'
    + '  flex-shrink: 0;'
    + '}'
    + P + 'input {'
    + '  flex: 1; background: #0f0f1a;'
    + '  border: 1px solid #2a2a3a;'
    + '  border-radius: 24px;'
    + '  padding: 10px 16px;'
    + '  color: #e2e8f0; font-size: 0.85rem;'
    + '  outline: none;'
    + '  transition: border-color 0.2s;'
    + '  font-family: inherit;'
    + '}'
    + P + 'input::placeholder { color: #555; }'
    + P + 'input:focus { border-color: #2dd4bf; }'
    + P + 'send {'
    + '  width: 38px; height: 38px;'
    + '  border-radius: 50%;'
    + '  background: linear-gradient(135deg, #2dd4bf, #0d9488);'
    + '  border: none; cursor: pointer;'
    + '  color: #fff; font-size: 16px;'
    + '  display: flex; align-items: center; justify-content: center;'
    + '  transition: transform 0.15s, opacity 0.15s;'
    + '  flex-shrink: 0; outline: none;'
    + '}'
    + P + 'send:hover, ' + P + 'send:focus-visible { transform: scale(1.08); }'
    + P + 'send:disabled { opacity: 0.4; cursor: default; transform: none; }'

    // ─── Footer ──────────────────────────────────────────────────────────
    + P + 'footer {'
    + '  padding: 6px 16px 10px;'
    + '  text-align: center;'
    + '  flex-shrink: 0;'
    + '  background: #0f0f1a;'
    + '}'
    + P + 'disclaimer {'
    + '  color: #555; font-size: 0.6rem;'
    + '}'
    + P + 'powered {'
    + '  color: #444; font-size: 0.58rem; margin-top: 2px;'
    + '}'

    // ─── Responsive: mobile full-width ───────────────────────────────────
    + '@media (max-width: 480px) {'
    +   P + 'panel {'
    + '    width: calc(100vw - 16px); right: 8px; bottom: 88px;'
    + '    max-height: 75vh; height: 75vh;'
    + '    border-radius: 12px;'
    + '  }'
    +   P + 'fab { bottom: 16px; right: 16px; }'
    + '}'

    // ─── Reduced motion ──────────────────────────────────────────────────
    + '@media (prefers-reduced-motion: reduce) {'
    +   P + 'fab-ring { animation: none; }'
    +   P + 'panel { transition: none; }'
    +   P + 'msg { animation: none; }'
    +   P + 'typing-dot { animation: none; opacity: 0.7; }'
    + '}'

    // ─── Focus ring for keyboard nav ─────────────────────────────────────
    + P + 'fab:focus-visible, '
    + P + 'close:focus-visible, '
    + P + 'send:focus-visible, '
    + P + 'chip:focus-visible, '
    + P + 'lang-btn:focus-visible, '
    + P + 'input:focus-visible {'
    + '  outline: 2px solid #2dd4bf;'
    + '  outline-offset: 2px;'
    + '}';
  }

  // ── Render simple markdown (bold, italic, bullets) ────────────────────
  function renderMarkdown(text) {
    if (!text) return '';
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/^[-•]\s+(.+)/gm, '&nbsp;&nbsp;• $1')
      .replace(/\n/g, '<br>');
  }

  // ── Build DOM ─────────────────────────────────────────────────────────
  var root, fab, panel, messagesEl, inputEl, sendBtn, typingEl;
  var langBtnEn, langBtnEs, chipsEl;

  function buildWidget() {
    root = el('div', 'root');

    // ── FAB ────────────────────────────────────────────────────────────
    fab = el('button', 'fab', {
      'aria-label': t('openLbl'),
      'title': t('openLbl'),
      'type': 'button'
    });
    var fabIcon = el('span', 'fab-icon');
    fabIcon.textContent = '🕊️';
    var fabRing = el('span', 'fab-ring');
    fab.appendChild(fabIcon);
    fab.appendChild(fabRing);
    fab.addEventListener('click', togglePanel);
    root.appendChild(fab);

    // ── Panel ──────────────────────────────────────────────────────────
    panel = el('div', 'panel', {
      'role': 'dialog',
      'aria-label': 'PALOMA Chat',
      'aria-modal': 'true'
    });

    // Header
    var header = el('div', 'header');
    var avatar = el('div', 'avatar');
    avatar.textContent = '🕊️';
    var headerText = el('div', 'header-text');
    var titleEl = el('div', 'title');
    titleEl.textContent = 'PALOMA';
    var subtitleEl = el('div', 'subtitle');
    subtitleEl.textContent = t('subtitle');
    var langToggle = el('div', 'lang-toggle');
    langBtnEn = el('button', 'lang-btn' + (lang === 'en' ? ' ' + PREFIX + 'lang-btn--active' : ''), { type: 'button' });
    langBtnEn.textContent = 'EN';
    langBtnEs = el('button', 'lang-btn' + (lang === 'es' ? ' ' + PREFIX + 'lang-btn--active' : ''), { type: 'button' });
    langBtnEs.textContent = 'ES';
    langBtnEn.addEventListener('click', function () { setLang('en'); });
    langBtnEs.addEventListener('click', function () { setLang('es'); });
    langToggle.appendChild(langBtnEn);
    langToggle.appendChild(langBtnEs);
    headerText.appendChild(titleEl);
    headerText.appendChild(subtitleEl);
    headerText.appendChild(langToggle);

    var closeBtn = el('button', 'close', {
      'aria-label': t('closeLbl'),
      'title': t('closeLbl'),
      'type': 'button'
    });
    closeBtn.textContent = '✕';
    closeBtn.addEventListener('click', togglePanel);

    header.appendChild(avatar);
    header.appendChild(headerText);
    header.appendChild(closeBtn);
    panel.appendChild(header);

    // Messages
    messagesEl = el('div', 'messages', { 'role': 'log', 'aria-live': 'polite' });
    panel.appendChild(messagesEl);

    // Input area
    var inputArea = el('div', 'input-area');
    inputEl = el('input', 'input', {
      type: 'text',
      placeholder: t('placeholder'),
      'aria-label': t('placeholder'),
      autocomplete: 'off'
    });
    inputEl.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
    sendBtn = el('button', 'send', {
      'aria-label': t('sendLbl'),
      'title': t('sendLbl'),
      'type': 'button'
    });
    sendBtn.innerHTML = '&#10148;'; // ➤ arrow
    sendBtn.addEventListener('click', sendMessage);
    inputArea.appendChild(inputEl);
    inputArea.appendChild(sendBtn);
    panel.appendChild(inputArea);

    // Footer
    var footer = el('div', 'footer');
    var disc = el('div', 'disclaimer');
    disc.textContent = t('disclaimer');
    var pwrd = el('div', 'powered');
    pwrd.textContent = t('powered');
    footer.appendChild(disc);
    footer.appendChild(pwrd);
    panel.appendChild(footer);

    root.appendChild(panel);
    document.body.appendChild(root);

    // Render history or greeting
    if (history.length > 0) {
      renderAllHistory();
    } else {
      showGreeting();
    }
  }

  // ── Language switching ────────────────────────────────────────────────
  function setLang(newLang) {
    if (newLang === lang) return;
    lang = newLang;
    saveLang();

    // Update active states
    langBtnEn.className = PREFIX + 'lang-btn' + (lang === 'en' ? ' ' + PREFIX + 'lang-btn--active' : '');
    langBtnEs.className = PREFIX + 'lang-btn' + (lang === 'es' ? ' ' + PREFIX + 'lang-btn--active' : '');

    // Update dynamic text
    inputEl.setAttribute('placeholder', t('placeholder'));
    inputEl.setAttribute('aria-label', t('placeholder'));

    // Update subtitle
    var sub = panel.querySelector('.' + PREFIX + 'subtitle');
    if (sub) sub.textContent = t('subtitle');

    // Update footer
    var disc = panel.querySelector('.' + PREFIX + 'disclaimer');
    if (disc) disc.textContent = t('disclaimer');
    var pwrd = panel.querySelector('.' + PREFIX + 'powered');
    if (pwrd) pwrd.textContent = t('powered');

    // If no history, re-show greeting in new lang
    if (history.length === 0) {
      messagesEl.innerHTML = '';
      showGreeting();
    }
  }

  // ── Toggle panel ──────────────────────────────────────────────────────
  function togglePanel() {
    isOpen = !isOpen;
    if (isOpen) {
      panel.classList.add(PREFIX + 'panel--open');
      fab.setAttribute('aria-label', t('closeLbl'));
      // Focus input
      setTimeout(function () { inputEl.focus(); }, 350);
      // Scroll to bottom
      scrollBottom();
    } else {
      panel.classList.remove(PREFIX + 'panel--open');
      fab.setAttribute('aria-label', t('openLbl'));
      fab.focus();
    }
  }

  // ── Keyboard: Escape to close, trap focus inside panel ────────────────
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && isOpen) {
      togglePanel();
    }
  });

  // ── Greeting ──────────────────────────────────────────────────────────
  function showGreeting() {
    appendBotBubble(t('greeting'));
    showChips();
  }

  // ── Show suggestion chips ─────────────────────────────────────────────
  function showChips() {
    chipsEl = el('div', 'chips');
    var chips = t('chips');
    chips.forEach(function (text) {
      var chip = el('button', 'chip', { type: 'button' });
      chip.textContent = text;
      chip.addEventListener('click', function () {
        if (chipsEl && chipsEl.parentNode) chipsEl.parentNode.removeChild(chipsEl);
        chipsEl = null;
        handleUserMessage(text);
      });
      chipsEl.appendChild(chip);
    });
    messagesEl.appendChild(chipsEl);
    scrollBottom();
  }

  // ── Render all history from localStorage ──────────────────────────────
  function renderAllHistory() {
    messagesEl.innerHTML = '';
    history.forEach(function (msg) {
      if (msg.role === 'user') {
        appendUserBubble(msg.content, true);
      } else {
        appendBotBubble(msg.content, true);
      }
    });
    scrollBottom();
  }

  // ── Append message bubbles ────────────────────────────────────────────
  function appendBotBubble(text, noAnim) {
    var bubble = el('div', 'msg ' + PREFIX + 'msg--bot');
    bubble.innerHTML = renderMarkdown(text);
    if (noAnim) bubble.style.animation = 'none';
    messagesEl.appendChild(bubble);
    scrollBottom();
  }

  function appendUserBubble(text, noAnim) {
    var bubble = el('div', 'msg ' + PREFIX + 'msg--user');
    bubble.textContent = text;
    if (noAnim) bubble.style.animation = 'none';
    messagesEl.appendChild(bubble);
    scrollBottom();
  }

  // ── Typing indicator ─────────────────────────────────────────────────
  function showTyping() {
    typingEl = el('div', 'typing');
    for (var i = 0; i < 3; i++) {
      typingEl.appendChild(el('span', 'typing-dot'));
    }
    messagesEl.appendChild(typingEl);
    scrollBottom();
  }
  function hideTyping() {
    if (typingEl && typingEl.parentNode) {
      typingEl.parentNode.removeChild(typingEl);
    }
    typingEl = null;
  }

  function scrollBottom() {
    setTimeout(function () {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }, 50);
  }

  // ── Send message ──────────────────────────────────────────────────────
  function sendMessage() {
    var text = (inputEl.value || '').trim();
    if (!text || isSending) return;
    inputEl.value = '';
    handleUserMessage(text);
  }

  function handleUserMessage(text) {
    // Remove chips if they exist
    if (chipsEl && chipsEl.parentNode) {
      chipsEl.parentNode.removeChild(chipsEl);
      chipsEl = null;
    }

    // Show user bubble
    appendUserBubble(text);
    history.push({ role: 'user', content: text });
    saveHistory();

    // Call API
    isSending = true;
    sendBtn.disabled = true;
    showTyping();

    var payload = {
      message: text,
      history: history.slice(-8),
      lang: lang,
      mode: 'patient'
    };

    fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    .then(function (res) {
      if (!res.ok) throw new Error('Network error: ' + res.status);
      return res.json();
    })
    .then(function (data) {
      hideTyping();
      var reply = data.reply || (lang === 'es'
        ? 'Disculpa, no pude procesar tu solicitud. ¿Puedes intentar de nuevo?'
        : 'I apologize, I couldn\'t process that. Could you try again?');
      appendBotBubble(reply);
      history.push({ role: 'model', content: reply });
      saveHistory();
    })
    .catch(function (err) {
      hideTyping();
      console.error('PALOMA embed error:', err);
      var errMsg = lang === 'es'
        ? 'Lo siento, hubo un problema de conexión. Por favor intenta de nuevo o llámanos al (336) 545-4281. 🕊️'
        : 'Sorry, there was a connection issue. Please try again or call us at (336) 545-4281. 🕊️';
      appendBotBubble(errMsg);
    })
    .finally(function () {
      isSending = false;
      sendBtn.disabled = false;
      inputEl.focus();
    });
  }

  // ── Initialize ────────────────────────────────────────────────────────
  function init() {
    injectStyles();
    loadConfig(function (config) {
      applyConfig(config);
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', buildWidget);
      } else {
        buildWidget();
      }
    });
  }

  init();
})();
