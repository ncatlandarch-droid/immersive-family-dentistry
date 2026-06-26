/* ═══════════════════════════════════════════════════════════════════════════
   HIPAA Technical Safeguards — Admin Dashboard Module
   ═══════════════════════════════════════════════════════════════════════════
   Implements the following HIPAA Security Rule requirements:

   §164.312(a)(2)(iii) — Automatic Logoff
   §164.312(b)         — Audit Controls
   §164.312(c)(1)      — Integrity (PHI access awareness)
   §164.530(c)         — Administrative Safeguards (monitoring notice)

   Self-contained IIFE. Depends on Firebase Auth + Firestore (compat SDK).
   Exports: window.HIPAAAudit, window.HIPAASession
   ═══════════════════════════════════════════════════════════════════════════ */

;(function () {
  'use strict';

  // ─── Constants ────────────────────────────────────────────────────────────
  var SESSION_TIMEOUT_MS  = 15 * 60 * 1000;   // 15 minutes — HIPAA §164.312(a)(2)(iii)
  var WARNING_BEFORE_MS   =  2 * 60 * 1000;   // Show warning 2 min before timeout
  var WARNING_AT_MS       = SESSION_TIMEOUT_MS - WARNING_BEFORE_MS; // 13 minutes
  var TICK_INTERVAL_MS    = 1000;              // Update countdown every second
  var ACTIVITY_EVENTS     = ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'];
  var AUDIT_COLLECTION    = 'audit_logs';
  var PREFIX              = '[HIPAA]';

  // ─── Internal State ───────────────────────────────────────────────────────
  var _lastActivity    = Date.now();
  var _tickTimer       = null;
  var _warningVisible  = false;
  var _initialized     = false;

  // Cached DOM references (created at init)
  var _warningModal    = null;
  var _countdownEl     = null;
  var _bannerEl        = null;
  var _bannerTimerEl   = null;
  var _toastEl         = null;

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. SESSION TIMEOUT — HIPAA §164.312(a)(2)(iii)
  //    "Implement electronic procedures that terminate an electronic session
  //     after a predetermined time of inactivity."
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Reset the inactivity timer on user interaction.
   * If the warning modal is showing, dismiss it.
   */
  function _resetActivity() {
    _lastActivity = Date.now();
    if (_warningVisible) {
      _hideWarning();
    }
  }

  /**
   * Bind activity listeners on the document (passive for scroll/mouse perf).
   */
  function _bindActivityListeners() {
    ACTIVITY_EVENTS.forEach(function (evt) {
      document.addEventListener(evt, _resetActivity, { passive: true });
    });
  }

  /**
   * Unbind activity listeners (cleanup on logout).
   */
  function _unbindActivityListeners() {
    ACTIVITY_EVENTS.forEach(function (evt) {
      document.removeEventListener(evt, _resetActivity);
    });
  }

  /**
   * Main tick — runs every second, checks elapsed idle time.
   */
  function _tick() {
    var elapsed = Date.now() - _lastActivity;
    var remaining = SESSION_TIMEOUT_MS - elapsed;

    // Update the PHI banner timer
    if (_bannerTimerEl) {
      _bannerTimerEl.textContent = _formatTime(Math.max(0, remaining));
    }

    // Timeout reached — force logout
    if (remaining <= 0) {
      _performLogout('session_timeout');
      return;
    }

    // Show warning at 13 minutes of inactivity
    if (elapsed >= WARNING_AT_MS && !_warningVisible) {
      _showWarning();
    }

    // Update countdown inside the warning modal
    if (_warningVisible && _countdownEl) {
      _countdownEl.textContent = _formatTime(remaining);
    }
  }

  /**
   * Format milliseconds as M:SS for human display.
   */
  function _formatTime(ms) {
    var totalSeconds = Math.max(0, Math.ceil(ms / 1000));
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds % 60;
    return minutes + ':' + (seconds < 10 ? '0' : '') + seconds;
  }

  /**
   * Build and show the session-timeout warning modal.
   */
  function _showWarning() {
    if (_warningVisible) return;
    _warningVisible = true;

    // Create modal overlay
    _warningModal = document.createElement('div');
    _warningModal.id = 'hipaa-timeout-modal';
    _warningModal.setAttribute('role', 'alertdialog');
    _warningModal.setAttribute('aria-modal', 'true');
    _warningModal.setAttribute('aria-label', 'Session timeout warning');
    _warningModal.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:100000',
      'display:flex', 'align-items:center', 'justify-content:center',
      'background:rgba(0,0,0,0.65)', 'backdrop-filter:blur(4px)'
    ].join(';');

    // Modal card
    var card = document.createElement('div');
    card.style.cssText = [
      'background:#1a1f2e', 'border:1px solid rgba(255,255,255,0.1)',
      'border-radius:14px', 'padding:32px 36px', 'max-width:420px',
      'width:90%', 'text-align:center', 'box-shadow:0 20px 60px rgba(0,0,0,0.5)',
      'font-family:Inter,-apple-system,sans-serif', 'color:#F1F5F9'
    ].join(';');

    // Icon
    var icon = document.createElement('div');
    icon.textContent = '⏳';
    icon.style.cssText = 'font-size:48px;margin-bottom:12px;';
    card.appendChild(icon);

    // Title
    var title = document.createElement('h2');
    title.textContent = 'Session Expiring Soon';
    title.style.cssText = 'font-size:20px;font-weight:600;margin-bottom:8px;';
    card.appendChild(title);

    // Message
    var msg = document.createElement('p');
    msg.style.cssText = 'color:#94A3B8;font-size:14px;line-height:1.5;margin-bottom:4px;';
    msg.textContent = 'For HIPAA compliance, your session will automatically end due to inactivity.';
    card.appendChild(msg);

    // Countdown
    _countdownEl = document.createElement('div');
    _countdownEl.id = 'hipaa-countdown';
    _countdownEl.style.cssText = [
      'font-size:36px', 'font-weight:700', 'color:#EF4444',
      'margin:16px 0 24px', 'font-variant-numeric:tabular-nums'
    ].join(';');
    _countdownEl.textContent = _formatTime(WARNING_BEFORE_MS);
    card.appendChild(_countdownEl);

    // Button row
    var btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:12px;justify-content:center;';

    // Continue button
    var continueBtn = document.createElement('button');
    continueBtn.textContent = 'Continue Session';
    continueBtn.style.cssText = [
      'background:#14B8A6', 'color:#fff', 'border:none', 'border-radius:8px',
      'padding:10px 24px', 'font-size:14px', 'font-weight:600', 'cursor:pointer',
      'transition:background 0.2s'
    ].join(';');
    continueBtn.addEventListener('mouseenter', function () { this.style.background = '#0D9488'; });
    continueBtn.addEventListener('mouseleave', function () { this.style.background = '#14B8A6'; });
    continueBtn.addEventListener('click', function () {
      _resetActivity();
      _logAudit('session_extended', 'session', null, 'User chose to continue session');
    });
    btnRow.appendChild(continueBtn);

    // Logout button
    var logoutBtn = document.createElement('button');
    logoutBtn.textContent = 'Log Out';
    logoutBtn.style.cssText = [
      'background:transparent', 'color:#EF4444',
      'border:1px solid rgba(239,68,68,0.4)', 'border-radius:8px',
      'padding:10px 24px', 'font-size:14px', 'font-weight:600', 'cursor:pointer',
      'transition:border-color 0.2s,color 0.2s'
    ].join(';');
    logoutBtn.addEventListener('mouseenter', function () {
      this.style.borderColor = '#EF4444';
      this.style.background = 'rgba(239,68,68,0.1)';
    });
    logoutBtn.addEventListener('mouseleave', function () {
      this.style.borderColor = 'rgba(239,68,68,0.4)';
      this.style.background = 'transparent';
    });
    logoutBtn.addEventListener('click', function () {
      _performLogout('user_manual');
    });
    btnRow.appendChild(logoutBtn);

    card.appendChild(btnRow);
    _warningModal.appendChild(card);
    document.body.appendChild(_warningModal);

    // Focus the continue button for keyboard accessibility
    continueBtn.focus();
  }

  /**
   * Dismiss the warning modal.
   */
  function _hideWarning() {
    _warningVisible = false;
    if (_warningModal && _warningModal.parentNode) {
      _warningModal.parentNode.removeChild(_warningModal);
    }
    _warningModal = null;
    _countdownEl = null;
  }

  /**
   * Perform logout — log the event, sign out of Firebase, redirect.
   * @param {string} reason  'session_timeout' | 'user_manual'
   */
  function _performLogout(reason) {
    // Stop the clock
    clearInterval(_tickTimer);
    _tickTimer = null;
    _unbindActivityListeners();
    _hideWarning();

    // Audit the logout
    _logAudit('logout', 'session', null, 'Reason: ' + reason);

    // Firebase sign out (gracefully handle missing auth)
    try {
      if (typeof firebase !== 'undefined' && firebase.auth) {
        firebase.auth().signOut().then(function () {
          _redirectToLogin();
        }).catch(function () {
          _redirectToLogin();
        });
      } else {
        _redirectToLogin();
      }
    } catch (e) {
      _redirectToLogin();
    }
  }

  /**
   * Redirect to the login page. Falls back to reloading the current page
   * (which typically shows the auth gate).
   */
  function _redirectToLogin() {
    // Try the standard admin auth gate approach — show gate, hide dashboard
    var authGate  = document.getElementById('auth-gate');
    var dashboard = document.getElementById('dashboard');
    if (authGate && dashboard) {
      dashboard.style.display = 'none';
      authGate.style.display  = 'flex';
      _removeBanner();
      return;
    }
    // Fallback
    window.location.reload();
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // 2. AUDIT LOGGER — HIPAA §164.312(b)
  //    "Implement hardware, software, and/or procedural mechanisms that record
  //     and examine activity in information systems that contain or use ePHI."
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Write an audit log entry to Firestore.
   *
   * @param {string}      action        'view_patient', 'edit_patient', 'login', etc.
   * @param {string}      resourceType  'patient', 'conversation', 'appointment', etc.
   * @param {string|null} resourceId    Firestore document ID (nullable).
   * @param {string}      [details]     Optional human-readable context string.
   */
  function _logAudit(action, resourceType, resourceId, details) {
    // Resolve user
    var user = null;
    try {
      if (typeof firebase !== 'undefined' && firebase.auth) {
        user = firebase.auth().currentUser;
      }
    } catch (_) { /* auth not ready */ }

    var entry = {
      user_email:    user ? user.email    : 'unknown',
      user_uid:      user ? user.uid      : 'unknown',
      action:        action        || 'unknown',
      resource_type: resourceType  || 'unknown',
      resource_id:   resourceId    || null,
      ip_address:    null,            // Placeholder — populated by Cloud Function in production
      timestamp:     _serverTimestamp(),
      details:       details       || null
    };

    // Write to Firestore (fire-and-forget; never block the UI)
    try {
      if (typeof firebase !== 'undefined' && firebase.firestore) {
        firebase.firestore()
          .collection(AUDIT_COLLECTION)
          .add(entry)
          .catch(function (err) {
            _safeLog('warn', PREFIX + ' Audit write failed:', err.message);
          });
      } else {
        _safeLog('warn', PREFIX + ' Firestore unavailable — audit entry queued to console:', entry);
      }
    } catch (e) {
      _safeLog('warn', PREFIX + ' Audit write exception:', e.message);
    }
  }

  /**
   * Return a Firestore server timestamp, or fall back to a Date.
   */
  function _serverTimestamp() {
    try {
      if (typeof firebase !== 'undefined' &&
          firebase.firestore &&
          firebase.firestore.FieldValue &&
          firebase.firestore.FieldValue.serverTimestamp) {
        return firebase.firestore.FieldValue.serverTimestamp();
      }
    } catch (_) { /* swallow */ }
    return new Date();
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // 3. PHI ACCESS BANNER — HIPAA §164.530(c)
  //    "A covered entity must … notify individuals of its privacy practices."
  //    Continuous on-screen reminder that the environment contains ePHI.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Inject a fixed banner at the top of the page.
   */
  function _createBanner() {
    if (document.getElementById('hipaa-banner')) return;

    var user = null;
    try { user = firebase.auth().currentUser; } catch (_) {}

    _bannerEl = document.createElement('div');
    _bannerEl.id = 'hipaa-banner';
    _bannerEl.style.cssText = [
      'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:10000',
      'height:28px', 'display:flex', 'align-items:center', 'justify-content:center',
      'gap:16px', 'background:#111318', 'border-bottom:1px solid rgba(255,255,255,0.06)',
      'font-family:Inter,-apple-system,sans-serif', 'font-size:11px',
      'color:#94A3B8', 'letter-spacing:0.3px', 'user-select:none',
      'padding:0 16px'
    ].join(';');

    // Left section — HIPAA notice
    var notice = document.createElement('span');
    notice.textContent = '\uD83D\uDD12 HIPAA-Protected Environment \u2014 All access is logged and monitored';
    notice.style.cssText = 'flex:1;text-align:center;';

    // Right section — user + timer
    var meta = document.createElement('span');
    meta.style.cssText = 'display:flex;align-items:center;gap:10px;white-space:nowrap;flex-shrink:0;';

    if (user && user.email) {
      var emailSpan = document.createElement('span');
      emailSpan.style.color = '#64748B';
      emailSpan.textContent = user.email;
      meta.appendChild(emailSpan);

      var sep = document.createElement('span');
      sep.style.cssText = 'width:1px;height:12px;background:rgba(255,255,255,0.1);';
      meta.appendChild(sep);
    }

    _bannerTimerEl = document.createElement('span');
    _bannerTimerEl.id = 'hipaa-session-timer';
    _bannerTimerEl.style.cssText = 'color:#14B8A6;font-variant-numeric:tabular-nums;font-weight:500;';
    _bannerTimerEl.textContent = _formatTime(SESSION_TIMEOUT_MS);
    meta.appendChild(_bannerTimerEl);

    _bannerEl.appendChild(notice);
    _bannerEl.appendChild(meta);
    document.body.appendChild(_bannerEl);

    // Push page content down by banner height
    document.body.style.paddingTop = '28px';
  }

  /**
   * Remove the PHI banner (on logout).
   */
  function _removeBanner() {
    if (_bannerEl && _bannerEl.parentNode) {
      _bannerEl.parentNode.removeChild(_bannerEl);
    }
    _bannerEl = null;
    _bannerTimerEl = null;
    document.body.style.paddingTop = '';
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // 4. CONSOLE.LOG SANITIZER — Defense in depth
  //    Prevents accidental PHI leakage through browser console output in
  //    production environments. Satisfies the spirit of §164.312(c)(1)
  //    (Integrity) by minimising ePHI exposure surfaces.
  // ═══════════════════════════════════════════════════════════════════════════

  // Preserve original console methods for internal use and dev mode
  var _origConsole = {
    log:   console.log.bind(console),
    warn:  console.warn.bind(console),
    error: console.error.bind(console)
  };

  /**
   * Safe internal logger that always uses the original console (pre-override).
   */
  function _safeLog(level, /* ...args */) {
    var args = Array.prototype.slice.call(arguments, 1);
    (_origConsole[level] || _origConsole.log).apply(console, args);
  }

  /**
   * Redact PHI patterns from a string.
   * Patterns targeted:
   *   - US phone numbers:  (123) 456-7890, 123-456-7890, 123.456.7890, 1234567890
   *   - Email addresses:   user@domain.tld
   *   - SSN:               123-45-6789
   */
  var PHI_PATTERNS = [
    { regex: /\b\d{3}[-.]?\d{2}[-.]?\d{4}\b/g,                       label: 'SSN'   },  // SSN must be checked first (subset of phone)
    { regex: /\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}\b/g,               label: 'PHONE' },
    { regex: /[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}/g,   label: 'EMAIL' }
  ];

  /**
   * Sanitize a single value. Strings get regex-scrubbed; other types pass through.
   */
  function _sanitize(val) {
    if (typeof val !== 'string') return val;
    var out = val;
    for (var i = 0; i < PHI_PATTERNS.length; i++) {
      out = out.replace(PHI_PATTERNS[i].regex, '[REDACTED]');
    }
    return out;
  }

  /**
   * Replace console.log / .warn / .error with sanitized versions.
   * Only active in production (hostname !== 'localhost').
   */
  function _installConsoleSanitizer() {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      _safeLog('log', PREFIX + ' Console sanitizer SKIPPED (dev mode)');
      return;
    }

    ['log', 'warn', 'error'].forEach(function (method) {
      console[method] = function () {
        var sanitized = Array.prototype.slice.call(arguments).map(_sanitize);
        _origConsole[method].apply(console, sanitized);
      };
    });

    _safeLog('log', PREFIX + ' Console sanitizer ACTIVE (production mode)');
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // 5. SECURE CLIPBOARD — HIPAA §164.312(c)(1) Integrity
  //    Intercept copy events on PHI fields. We allow the copy (don't break UX)
  //    but ensure it is audit-logged and the user is notified.
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Attach a delegated copy listener for .phi-field elements.
   */
  function _installClipboardGuard() {
    document.addEventListener('copy', function (e) {
      // Walk up from the selection anchor to see if it's inside a .phi-field
      var sel = window.getSelection();
      if (!sel || !sel.anchorNode) return;

      var target = sel.anchorNode.nodeType === Node.ELEMENT_NODE
        ? sel.anchorNode
        : sel.anchorNode.parentElement;

      if (!target) return;

      var phiField = target.closest('.phi-field');
      if (!phiField) return;

      // Log the copy action
      var fieldLabel = phiField.getAttribute('data-phi-label')
        || phiField.getAttribute('aria-label')
        || 'unknown-field';
      _logAudit('copy_phi', 'phi_field', fieldLabel, 'User copied PHI field content');

      // Show toast notification
      _showToast('Copying patient data is logged for HIPAA compliance');
    });
  }

  /**
   * Show a brief toast notification.
   * @param {string} message
   */
  function _showToast(message) {
    // Remove existing toast if present
    if (_toastEl && _toastEl.parentNode) {
      _toastEl.parentNode.removeChild(_toastEl);
    }

    _toastEl = document.createElement('div');
    _toastEl.className = 'hipaa-toast';
    _toastEl.setAttribute('role', 'status');
    _toastEl.setAttribute('aria-live', 'polite');
    _toastEl.style.cssText = [
      'position:fixed', 'bottom:24px', 'left:50%', 'transform:translateX(-50%)',
      'background:#1E293B', 'color:#F1F5F9', 'border:1px solid rgba(255,255,255,0.1)',
      'border-radius:8px', 'padding:10px 20px', 'font-size:13px',
      'font-family:Inter,-apple-system,sans-serif', 'z-index:100001',
      'box-shadow:0 8px 30px rgba(0,0,0,0.4)', 'opacity:0',
      'transition:opacity 0.3s ease'
    ].join(';');
    _toastEl.textContent = '\uD83D\uDD12 ' + message;
    document.body.appendChild(_toastEl);

    // Animate in
    requestAnimationFrame(function () {
      _toastEl.style.opacity = '1';
    });

    // Auto-dismiss after 3 seconds
    setTimeout(function () {
      if (_toastEl) {
        _toastEl.style.opacity = '0';
        setTimeout(function () {
          if (_toastEl && _toastEl.parentNode) {
            _toastEl.parentNode.removeChild(_toastEl);
            _toastEl = null;
          }
        }, 300);
      }
    }, 3000);
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // INITIALIZATION
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * Main init — called on DOMContentLoaded.
   * Waits for Firebase Auth state before activating safeguards.
   */
  function _init() {
    if (_initialized) return;

    // Guard: Firebase must be loaded
    if (typeof firebase === 'undefined' || !firebase.auth) {
      _safeLog('warn', PREFIX + ' Firebase Auth SDK not found — safeguards deferred.');
      return;
    }

    // Listen for auth state changes
    firebase.auth().onAuthStateChanged(function (user) {
      if (user) {
        _activate(user);
      } else {
        _deactivate();
      }
    });

    // Install the console sanitizer immediately (no auth dependency)
    _installConsoleSanitizer();

    _safeLog('log', PREFIX + ' Safeguards initialized');
  }

  /**
   * Activate all safeguards for an authenticated user.
   */
  function _activate(user) {
    if (_initialized) return;
    _initialized = true;

    _safeLog('log', PREFIX + ' Activating for:', user.email);

    // Log the login event
    _logAudit('login', 'session', null, 'Dashboard accessed');

    // Start the session timer
    _lastActivity = Date.now();
    _tickTimer = setInterval(_tick, TICK_INTERVAL_MS);
    _bindActivityListeners();

    // Inject PHI banner
    _createBanner();

    // Clipboard guard
    _installClipboardGuard();
  }

  /**
   * Deactivate safeguards (user signed out or was never logged in).
   */
  function _deactivate() {
    _initialized = false;
    clearInterval(_tickTimer);
    _tickTimer = null;
    _unbindActivityListeners();
    _hideWarning();
    _removeBanner();
  }


  // ═══════════════════════════════════════════════════════════════════════════
  // PUBLIC API — Exposed on window
  // ═══════════════════════════════════════════════════════════════════════════

  /**
   * window.HIPAAAudit — Global audit logging interface.
   * Usage:
   *   HIPAAAudit.log('view_patient', 'patient', 'abc123', 'Viewed demographics');
   */
  window.HIPAAAudit = {
    /**
     * Log an auditable action.
     * @param {string}      action        Action verb — 'view_patient', 'edit_patient',
     *                                    'view_conversation', 'export_data', etc.
     * @param {string}      resourceType  Resource category — 'patient', 'conversation',
     *                                    'appointment', 'report', etc.
     * @param {string|null} resourceId    The Firestore document ID (or null).
     * @param {string}      [details]     Optional freeform context string.
     */
    log: function (action, resourceType, resourceId, details) {
      _logAudit(action, resourceType, resourceId, details);
    }
  };

  /**
   * window.HIPAASession — Session control interface.
   * Usage:
   *   HIPAASession.extend();    // Reset the idle timer manually
   *   HIPAASession.logout();    // Trigger a controlled logout
   *   HIPAASession.remaining(); // ms until session expires
   */
  window.HIPAASession = {
    /** Reset the inactivity timer. */
    extend: function () {
      _resetActivity();
    },
    /** Manually trigger HIPAA-compliant logout. */
    logout: function () {
      _performLogout('api_call');
    },
    /** Returns milliseconds remaining until auto-logout. */
    remaining: function () {
      return Math.max(0, SESSION_TIMEOUT_MS - (Date.now() - _lastActivity));
    }
  };


  // ═══════════════════════════════════════════════════════════════════════════
  // BOOTSTRAP
  // ═══════════════════════════════════════════════════════════════════════════

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    // DOM already ready (script loaded defer / at bottom of body)
    _init();
  }

})();
