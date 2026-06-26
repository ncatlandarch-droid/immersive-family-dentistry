// ═══════════════════════════════════════════════════════════════════════════════
// PALOMA Chat History Module
// ═══════════════════════════════════════════════════════════════════════════════
// Manages conversation history display, search, and replay in admin dashboard.
// Integrates with firebase-db.js (saveConversation, getConversations,
// getConversationMessages, addMessage) and the admin SPA switchView() pattern.
//
// Usage:
//   Called from the main admin when the PALOMA AI view is loaded:
//     ChatHistory.init();
//
// Dependencies:
//   - Firebase Firestore (firebase.firestore)
//   - firebase-db.js  (getConversations, getConversationMessages, etc.)
//   - Lucide icons     (lucide.createIcons)
//   - Admin SPA        (switchView, showToast)
// ═══════════════════════════════════════════════════════════════════════════════

const ChatHistory = (function () {

  // ── State ──────────────────────────────────────────────────────────────────
  let conversations = [];
  let currentFilter = 'all';
  let selectedConversation = null;

  // ── Initialisation ─────────────────────────────────────────────────────────

  /**
   * Bootstrap the chat history panel.
   * Loads conversations from Firestore, renders the list, and wires events.
   */
  async function init() {
    await loadConversations();
    renderConversationList();
    bindEvents();
  }

  // ── Event Binding ──────────────────────────────────────────────────────────

  /**
   * Attach listeners for filter tabs and the search input.
   * Filter tabs are identified by the `.chat-filter-tab` class and a
   * `data-filter` attribute whose value matches a filter key
   * ('all' | 'booked' | 'active' | 'ended').
   */
  function bindEvents() {
    // Filter tabs
    document.querySelectorAll('.chat-filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        currentFilter = tab.dataset.filter;
        document.querySelectorAll('.chat-filter-tab').forEach(t =>
          t.classList.remove('active')
        );
        tab.classList.add('active');
        renderConversationList();
      });
    });

    // Live search
    const searchInput = document.getElementById('conversation-search');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        renderConversationList(e.target.value);
      });
    }
  }

  // ── Data Loading ───────────────────────────────────────────────────────────

  /**
   * Fetch conversations from Firestore.
   * Prefers the shared `getConversations` helper exposed by firebase-db.js;
   * falls back to a direct Firestore query when the helper is unavailable.
   *
   * @param {Object} filters – optional query filters forwarded to the helper
   */
  async function loadConversations(filters = {}) {
    try {
      if (typeof getConversations === 'function') {
        conversations = await getConversations({ ...filters, limit: 50 });
      } else {
        // Direct Firestore fallback
        const db = firebase.firestore();
        const snapshot = await db
          .collection('conversations')
          .orderBy('created_at', 'desc')
          .limit(50)
          .get();
        conversations = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }
    } catch (err) {
      console.warn('Chat history: Could not load conversations', err);
      conversations = [];
    }
  }

  // ── Conversation List Rendering ────────────────────────────────────────────

  /**
   * Render the conversation sidebar list into `#conversation-list`.
   * Applies the active status filter and an optional free-text search over
   * visitor name, email, and AI-generated summary.
   *
   * @param {string} searchQuery – optional search string
   */
  function renderConversationList(searchQuery = '') {
    const container = document.getElementById('conversation-list');
    if (!container) return;

    let filtered = conversations;

    // ── Status filter ────────────────────────────────────────────────────────
    if (currentFilter === 'booked') {
      filtered = filtered.filter(c => c.booked_appointment);
    } else if (currentFilter === 'active') {
      filtered = filtered.filter(c => c.status === 'active');
    } else if (currentFilter === 'ended') {
      filtered = filtered.filter(c => c.status === 'ended');
    }

    // ── Search filter ────────────────────────────────────────────────────────
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(c =>
        (c.visitor_name || '').toLowerCase().includes(q) ||
        (c.visitor_email || '').toLowerCase().includes(q) ||
        (c.summary || '').toLowerCase().includes(q)
      );
    }

    // ── Empty state ──────────────────────────────────────────────────────────
    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i data-lucide="message-square-off"
             style="width:48px;height:48px;color:var(--text-muted,#888)"></i>
          <p style="color:var(--text-muted,#888);margin-top:12px">
            No conversations yet
          </p>
          <p style="color:var(--text-muted,#888);font-size:0.85rem">
            Conversations from PALOMA will appear here
          </p>
        </div>`;
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    // ── Card list ────────────────────────────────────────────────────────────
    container.innerHTML = filtered.map(conv => {
      const date      = conv.created_at?.toDate?.() || new Date();
      const timeAgo   = getTimeAgo(date);
      const name      = conv.visitor_name || 'Anonymous Visitor';
      const msgCount  = conv.message_count || 0;
      const lang      = conv.language === 'es' ? '🇪🇸' : '🇺🇸';
      const statusCls = conv.status === 'active' ? 'status-active' : 'status-ended';

      const bookedBadge = conv.booked_appointment
        ? '<span class="badge badge-success">Booked</span>'
        : '';

      const sourceIcon = conv.source === 'admin'
        ? '<i data-lucide="shield" style="width:14px;height:14px"></i>'
        : '<i data-lucide="globe" style="width:14px;height:14px"></i>';

      return `
        <div class="conversation-card ${selectedConversation === conv.id ? 'selected' : ''}"
             data-session-id="${conv.id}"
             onclick="ChatHistory.selectConversation('${conv.id}')">
          <div class="conv-header">
            <div class="conv-visitor">
              <div class="conv-avatar">${name.charAt(0).toUpperCase()}</div>
              <div>
                <div class="conv-name">${name} ${lang}</div>
                <div class="conv-meta">${sourceIcon} ${timeAgo} · ${msgCount} messages</div>
              </div>
            </div>
            <div class="conv-status">
              <span class="status-dot ${statusCls}"></span>
              ${bookedBadge}
            </div>
          </div>
          ${conv.summary ? `<div class="conv-summary">${conv.summary}</div>` : ''}
        </div>`;
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  // ── Conversation Detail / Message Replay ───────────────────────────────────

  /**
   * Select a conversation and render its full message thread into
   * `#conversation-detail`.
   *
   * @param {string} sessionId – Firestore document ID of the conversation
   */
  async function selectConversation(sessionId) {
    selectedConversation = sessionId;
    renderConversationList(); // Re-render to highlight selection

    const detailPanel = document.getElementById('conversation-detail');
    if (!detailPanel) return;

    detailPanel.innerHTML =
      '<div class="loading-spinner">Loading messages...</div>';

    try {
      // Fetch messages
      let messages = [];
      if (typeof getConversationMessages === 'function') {
        messages = await getConversationMessages(sessionId);
      } else {
        const db = firebase.firestore();
        const snapshot = await db
          .collection('conversations')
          .doc(sessionId)
          .collection('messages')
          .orderBy('timestamp', 'asc')
          .get();
        messages = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
      }

      const conv = conversations.find(c => c.id === sessionId);
      const name = conv?.visitor_name || 'Anonymous Visitor';

      // ── Build detail header + action buttons ───────────────────────────────
      const patientAction = conv?.patient_id
        ? `<button class="btn btn-sm"
                   onclick="ChatHistory.viewPatient('${conv.patient_id}')">
             <i data-lucide="user" style="width:14px;height:14px"></i>
             View Patient
           </button>`
        : `<button class="btn btn-sm btn-primary"
                   onclick="ChatHistory.createPatientFromConversation('${sessionId}')">
             <i data-lucide="user-plus" style="width:14px;height:14px"></i>
             Create Patient
           </button>`;

      // ── Render messages ────────────────────────────────────────────────────
      const messagesHTML = messages.length === 0
        ? '<p class="text-muted">No messages found</p>'
        : messages.map(msg => `
            <div class="conv-msg ${msg.role === 'user' ? 'msg-user' : 'msg-assistant'}">
              <div class="msg-bubble">
                <div class="msg-content">${msg.content}</div>
                <div class="msg-time">
                  ${msg.timestamp?.toDate?.() ? formatTime(msg.timestamp.toDate()) : ''}
                </div>
              </div>
            </div>`).join('');

      detailPanel.innerHTML = `
        <div class="conv-detail-header">
          <div class="conv-detail-info">
            <h3>${name}</h3>
            <span>${conv?.visitor_email || ''} ${conv?.visitor_phone || ''}</span>
          </div>
          <div class="conv-detail-actions">
            ${patientAction}
          </div>
        </div>
        <div class="conv-messages">
          ${messagesHTML}
        </div>`;

      if (typeof lucide !== 'undefined') lucide.createIcons();
    } catch (err) {
      detailPanel.innerHTML =
        '<p class="text-muted">Error loading conversation</p>';
      console.error('Error loading conversation detail:', err);
    }
  }

  // ── Patient Creation ───────────────────────────────────────────────────────

  /**
   * Create a new patient record pre-filled with data captured during the
   * PALOMA chat session, then link the conversation to the new patient.
   *
   * @param {string} sessionId – conversation to create a patient from
   */
  async function createPatientFromConversation(sessionId) {
    const conv = conversations.find(c => c.id === sessionId);
    if (!conv) return;

    const patientData = {
      first_name:          conv.visitor_name?.split(' ')[0] || '',
      last_name:           conv.visitor_name?.split(' ').slice(1).join(' ') || '',
      display_name:        conv.visitor_name || 'New Patient',
      phone:               conv.visitor_phone || '',
      email:               conv.visitor_email || '',
      preferred_language:  conv.language || 'en',
      status:              'potential',
      source:              'paloma_chat',
      last_conversation_id: sessionId,
      conversation_count:  1
    };

    try {
      let patientId;

      if (typeof savePatient === 'function') {
        patientId = await savePatient(patientData);
      } else {
        // Direct Firestore fallback
        const db = firebase.firestore();
        const ref = await db.collection('patients').add({
          ...patientData,
          created_at: firebase.firestore.FieldValue.serverTimestamp(),
          updated_at: firebase.firestore.FieldValue.serverTimestamp()
        });
        patientId = ref.id;
      }

      // Link conversation → patient
      if (typeof linkConversationToPatient === 'function') {
        await linkConversationToPatient(sessionId, patientId);
      }

      showToast('Patient created from conversation', 'success');
      await selectConversation(sessionId); // Refresh detail panel
    } catch (err) {
      console.error('Error creating patient:', err);
      showToast('Error creating patient', 'error');
    }
  }

  // ── Navigation ─────────────────────────────────────────────────────────────

  /**
   * Navigate the admin SPA to the Patients view and auto-select a patient.
   *
   * @param {string} patientId – Firestore patient document ID
   */
  function viewPatient(patientId) {
    if (typeof switchView === 'function') {
      switchView('patients');
      // Allow the view transition to complete before selecting
      setTimeout(() => {
        if (typeof PatientProfiles !== 'undefined') {
          PatientProfiles.selectPatient(patientId);
        }
      }, 300);
    }
  }

  // ── Notification Badge ─────────────────────────────────────────────────────

  /**
   * Return the number of conversations created since the admin last viewed
   * the PALOMA panel. Uses localStorage for persistence across sessions.
   *
   * @returns {number}
   */
  function getNewCount() {
    const lastSeen = localStorage.getItem('paloma-last-seen-conversations');
    if (!lastSeen) return conversations.length;
    const lastSeenDate = new Date(lastSeen);
    return conversations.filter(c => {
      const created = c.created_at?.toDate?.() || new Date(0);
      return created > lastSeenDate;
    }).length;
  }

  /**
   * Mark all current conversations as seen and refresh the badge.
   */
  function markAllSeen() {
    localStorage.setItem(
      'paloma-last-seen-conversations',
      new Date().toISOString()
    );
    updateNotificationBadge();
  }

  /**
   * Update the `#paloma-notification-badge` element with the current
   * unseen count (hidden when zero, capped display at "99+").
   */
  function updateNotificationBadge() {
    const badge = document.getElementById('paloma-notification-badge');
    if (!badge) return;

    const count = getNewCount();
    if (count > 0) {
      badge.textContent = count > 99 ? '99+' : count;
      badge.style.display = 'flex';
    } else {
      badge.style.display = 'none';
    }
  }

  // ── Utilities ──────────────────────────────────────────────────────────────

  /**
   * Human-friendly relative timestamp.
   *
   * @param {Date} date
   * @returns {string} e.g. "Just now", "5m ago", "3h ago", "2d ago"
   */
  function getTimeAgo(date) {
    const now  = new Date();
    const diff = now - date;
    const mins = Math.floor(diff / 60000);

    if (mins < 1)   return 'Just now';
    if (mins < 60)  return `${mins}m ago`;

    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;

    const days = Math.floor(hours / 24);
    if (days < 7)   return `${days}d ago`;

    return date.toLocaleDateString();
  }

  /**
   * Format a Date into a short time string (HH:MM).
   *
   * @param {Date} date
   * @returns {string}
   */
  function formatTime(date) {
    return date.toLocaleTimeString([], {
      hour:   '2-digit',
      minute: '2-digit'
    });
  }

  /**
   * Display a toast notification via the admin shell's global toast system.
   * Falls back to console output when the shell helper is unavailable.
   *
   * @param {string} message
   * @param {string} type – 'info' | 'success' | 'error' | 'warning'
   */
  function showToast(message, type = 'info') {
    if (typeof window.showToast === 'function') {
      window.showToast(message, type);
    } else {
      console.log(`[${type}] ${message}`);
    }
  }

  // ── Public API ─────────────────────────────────────────────────────────────
  return {
    init,
    loadConversations,
    selectConversation,
    createPatientFromConversation,
    viewPatient,
    getNewCount,
    markAllSeen,
    updateNotificationBadge
  };

})();
