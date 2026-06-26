// ═══ Patient Profiles Module ═══
// Manages patient list, detail view, and CRUD operations

const PatientProfiles = (function() {
  let patients = [];
  let currentFilter = 'all';
  let selectedPatientId = null;
  let searchQuery = '';

  async function init() {
    await loadPatients();
    renderPatientList();
    bindEvents();
  }

  function bindEvents() {
    // Filter tabs: All | Active | Potential | Inactive
    document.querySelectorAll('.patient-filter-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        currentFilter = tab.dataset.filter;
        document.querySelectorAll('.patient-filter-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        renderPatientList();
      });
    });
    
    // Search
    const searchInput = document.getElementById('patient-search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        searchQuery = e.target.value;
        renderPatientList();
      });
    }

    // Add Patient button
    const addBtn = document.getElementById('btn-add-patient');
    if (addBtn) {
      addBtn.addEventListener('click', showAddPatientForm);
    }
  }

  async function loadPatients() {
    try {
      if (typeof getPatients === 'function') {
        patients = await getPatients({ status: currentFilter === 'all' ? null : currentFilter, limit: 200 });
      } else {
        const db = firebase.firestore();
        let query = db.collection('patients').orderBy('updated_at', 'desc').limit(200);
        const snapshot = await query.get();
        patients = snapshot.docs.map(doc => ({ patient_id: doc.id, ...doc.data() }));
      }
    } catch (err) {
      console.warn('Patient profiles: Could not load patients', err);
      patients = [];
    }
  }

  function renderPatientList() {
    const container = document.getElementById('patient-list-container');
    if (!container) return;

    let filtered = patients;
    
    // Status filter (client-side since we loaded all)
    if (currentFilter !== 'all') {
      filtered = filtered.filter(p => p.status === currentFilter);
    }

    // Search filter
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(p => 
        (p.display_name || '').toLowerCase().includes(q) ||
        (p.first_name || '').toLowerCase().includes(q) ||
        (p.last_name || '').toLowerCase().includes(q) ||
        (p.phone || '').includes(q) ||
        (p.email || '').toLowerCase().includes(q) ||
        (p.insurance_provider || '').toLowerCase().includes(q)
      );
    }

    // Stats bar
    const statsBar = document.getElementById('patient-stats-bar');
    if (statsBar) {
      const total = patients.length;
      const active = patients.filter(p => p.status === 'active').length;
      const potential = patients.filter(p => p.status === 'potential').length;
      const inactive = patients.filter(p => p.status === 'inactive' || p.status === 'archived').length;
      statsBar.innerHTML = `
        <span class="stat-chip"><strong>${total}</strong> Total</span>
        <span class="stat-chip stat-active"><strong>${active}</strong> Active</span>
        <span class="stat-chip stat-potential"><strong>${potential}</strong> Potential</span>
        <span class="stat-chip stat-inactive"><strong>${inactive}</strong> Inactive</span>`;
    }

    if (filtered.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i data-lucide="users" style="width:48px;height:48px;color:var(--text-muted,#888)"></i>
          <p style="margin-top:12px;color:var(--text-muted)">No patients found</p>
          <button class="btn btn-primary" onclick="PatientProfiles.showAddPatientForm()">
            <i data-lucide="user-plus" style="width:16px;height:16px"></i> Add Patient
          </button>
        </div>`;
      if (typeof lucide !== 'undefined') lucide.createIcons();
      return;
    }

    container.innerHTML = filtered.map(patient => {
      const initials = getInitials(patient.display_name || `${patient.first_name} ${patient.last_name}`);
      const statusBadge = getStatusBadge(patient.status);
      const langBadge = patient.preferred_language === 'es' ? '<span class="lang-badge">ES</span>' : '';
      const lastVisit = patient.last_visit ? formatDate(patient.last_visit) : 'No visits';
      const isSelected = selectedPatientId === patient.patient_id;
      
      return `
        <div class="patient-card ${isSelected ? 'selected' : ''}" 
             data-patient-id="${patient.patient_id}"
             onclick="PatientProfiles.selectPatient('${patient.patient_id}')">
          <div class="patient-avatar" style="background:${getAvatarColor(patient.display_name || patient.first_name)}">
            ${patient.photo_url ? `<img src="${patient.photo_url}" alt="">` : initials}
          </div>
          <div class="patient-info">
            <div class="patient-name">${patient.display_name || `${patient.first_name} ${patient.last_name}`} ${langBadge}</div>
            <div class="patient-meta">
              ${patient.phone ? `<span><i data-lucide="phone" style="width:12px;height:12px"></i> ${patient.phone}</span>` : ''}
              ${patient.email ? `<span><i data-lucide="mail" style="width:12px;height:12px"></i> ${patient.email}</span>` : ''}
            </div>
            <div class="patient-meta">
              <span><i data-lucide="calendar" style="width:12px;height:12px"></i> ${lastVisit}</span>
              ${patient.insurance_provider ? `<span><i data-lucide="shield" style="width:12px;height:12px"></i> ${patient.insurance_provider}</span>` : ''}
            </div>
          </div>
          <div class="patient-status">${statusBadge}</div>
        </div>`;
    }).join('');

    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  async function selectPatient(patientId) {
    selectedPatientId = patientId;
    renderPatientList();

    const detailPanel = document.getElementById('patient-detail-panel');
    if (!detailPanel) return;

    detailPanel.innerHTML = '<div class="loading-spinner">Loading patient...</div>';

    try {
      let patient;
      if (typeof getPatient === 'function') {
        patient = await getPatient(patientId);
      } else {
        const db = firebase.firestore();
        const doc = await db.collection('patients').doc(patientId).get();
        patient = doc.exists ? { patient_id: doc.id, ...doc.data() } : null;
      }

      if (!patient) {
        detailPanel.innerHTML = '<p class="text-muted">Patient not found</p>';
        return;
      }

      const name = patient.display_name || `${patient.first_name} ${patient.last_name}`;
      const initials = getInitials(name);

      detailPanel.innerHTML = `
        <div class="patient-detail-header">
          <div class="patient-detail-avatar" style="background:${getAvatarColor(name)}">
            ${patient.photo_url ? `<img src="${patient.photo_url}" alt="">` : initials}
          </div>
          <div class="patient-detail-info">
            <h2>${name}</h2>
            <div class="patient-detail-badges">
              ${getStatusBadge(patient.status)}
              ${patient.preferred_language === 'es' ? '<span class="badge badge-info">Spanish</span>' : ''}
              ${patient.source ? `<span class="badge">${formatSource(patient.source)}</span>` : ''}
            </div>
          </div>
          <div class="patient-detail-actions">
            <button class="btn btn-sm" onclick="PatientProfiles.editPatient('${patientId}')">
              <i data-lucide="edit" style="width:14px;height:14px"></i> Edit
            </button>
            <select class="status-select" onchange="PatientProfiles.updateStatus('${patientId}', this.value)">
              <option value="active" ${patient.status === 'active' ? 'selected' : ''}>Active</option>
              <option value="potential" ${patient.status === 'potential' ? 'selected' : ''}>Potential</option>
              <option value="inactive" ${patient.status === 'inactive' ? 'selected' : ''}>Inactive</option>
              <option value="archived" ${patient.status === 'archived' ? 'selected' : ''}>Archived</option>
            </select>
          </div>
        </div>

        <div class="patient-detail-tabs">
          <button class="tab-btn active" data-tab="overview" onclick="PatientProfiles.switchTab('overview')">Overview</button>
          <button class="tab-btn" data-tab="conversations" onclick="PatientProfiles.switchTab('conversations')">Conversations</button>
          <button class="tab-btn" data-tab="appointments" onclick="PatientProfiles.switchTab('appointments')">Appointments</button>
          <button class="tab-btn" data-tab="notes" onclick="PatientProfiles.switchTab('notes')">Notes</button>
        </div>

        <div class="patient-tab-content" id="patient-tab-overview">
          <div class="detail-grid">
            <div class="detail-section">
              <h4><i data-lucide="user" style="width:16px;height:16px"></i> Contact Information</h4>
              <div class="detail-row"><label>Phone</label><span>${patient.phone || '—'}</span></div>
              <div class="detail-row"><label>Email</label><span>${patient.email || '—'}</span></div>
              <div class="detail-row"><label>Address</label><span>${patient.address || '—'}</span></div>
              <div class="detail-row"><label>Date of Birth</label><span>${patient.date_of_birth || '—'}</span></div>
            </div>
            <div class="detail-section">
              <h4><i data-lucide="shield" style="width:16px;height:16px"></i> Insurance & Financial</h4>
              <div class="detail-row"><label>Insurance</label><span>${patient.insurance_provider || 'None on file'}</span></div>
              <div class="detail-row"><label>Insurance ID</label><span>${patient.insurance_id || '—'}</span></div>
              <div class="detail-row"><label>Balance</label><span>${patient.outstanding_balance ? '$' + patient.outstanding_balance.toFixed(2) : '$0.00'}</span></div>
              <div class="detail-row"><label>Lifetime Value</label><span>${patient.total_lifetime_value ? '$' + patient.total_lifetime_value.toFixed(2) : '$0.00'}</span></div>
            </div>
            <div class="detail-section">
              <h4><i data-lucide="activity" style="width:16px;height:16px"></i> Clinical</h4>
              <div class="detail-row"><label>Primary Concern</label><span>${patient.primary_concern || '—'}</span></div>
              <div class="detail-row"><label>Last Visit</label><span>${patient.last_visit ? formatDate(patient.last_visit) : 'No visits'}</span></div>
              <div class="detail-row"><label>Next Appointment</label><span>${patient.next_appointment ? formatDate(patient.next_appointment) : 'None scheduled'}</span></div>
              <div class="detail-row"><label>PALOMA Chats</label><span>${patient.conversation_count || 0}</span></div>
            </div>
          </div>
          ${patient.paloma_notes ? `
            <div class="detail-section">
              <h4><i data-lucide="brain" style="width:16px;height:16px"></i> PALOMA AI Notes</h4>
              <p class="ai-notes">${patient.paloma_notes}</p>
            </div>` : ''}
        </div>

        <div class="patient-tab-content" id="patient-tab-conversations" style="display:none">
          <div id="patient-conversations-list"><p class="text-muted">Loading conversations...</p></div>
        </div>

        <div class="patient-tab-content" id="patient-tab-appointments" style="display:none">
          <div id="patient-appointments-list"><p class="text-muted">Loading appointments...</p></div>
        </div>

        <div class="patient-tab-content" id="patient-tab-notes" style="display:none">
          <div id="patient-notes-section">
            <textarea id="patient-notes-input" placeholder="Add clinical notes..." rows="4" style="width:100%;padding:12px;border-radius:8px;border:1px solid var(--border-color,#333);background:var(--card-bg,#1e1e2e);color:var(--text-primary,#e0e0e0);font-family:inherit;resize:vertical">${patient.paloma_notes || ''}</textarea>
            <button class="btn btn-primary" style="margin-top:8px" onclick="PatientProfiles.saveNotes('${patientId}')">
              <i data-lucide="save" style="width:14px;height:14px"></i> Save Notes
            </button>
          </div>
        </div>`;

      if (typeof lucide !== 'undefined') lucide.createIcons();
      
      // Load conversations tab data in background
      loadPatientConversations(patientId);
      loadPatientAppointments(patientId);
    } catch (err) {
      detailPanel.innerHTML = '<p class="text-muted">Error loading patient</p>';
      console.error('Error loading patient detail:', err);
    }
  }

  async function loadPatientConversations(patientId) {
    try {
      const db = firebase.firestore();
      const snapshot = await db.collection('conversations')
        .where('patient_id', '==', patientId)
        .orderBy('created_at', 'desc')
        .limit(20)
        .get();
      const convs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const container = document.getElementById('patient-conversations-list');
      if (!container) return;

      if (convs.length === 0) {
        container.innerHTML = '<p class="text-muted">No conversations linked to this patient</p>';
        return;
      }

      container.innerHTML = convs.map(c => {
        const date = c.created_at?.toDate?.() || new Date();
        return `
          <div class="mini-conv-card" onclick="ChatHistory.selectConversation('${c.id}'); if(typeof switchView==='function') switchView('paloma-ai');">
            <div class="mini-conv-date">${formatDate(date)}</div>
            <div class="mini-conv-info">${c.message_count || 0} messages · ${c.language === 'es' ? 'Spanish' : 'English'}</div>
            ${c.summary ? `<div class="mini-conv-summary">${c.summary}</div>` : ''}
            ${c.booked_appointment ? '<span class="badge badge-success">Booked Appt</span>' : ''}
          </div>`;
      }).join('');
    } catch (err) {
      console.warn('Could not load patient conversations:', err);
    }
  }

  async function loadPatientAppointments(patientId) {
    try {
      // Try to find appointments by patient name or ID
      const patient = patients.find(p => p.patient_id === patientId);
      if (!patient) return;
      
      const db = firebase.firestore();
      const name = patient.display_name || `${patient.first_name} ${patient.last_name}`;
      const snapshot = await db.collection('appointments')
        .where('patient_name', '==', name)
        .orderBy('created_at', 'desc')
        .limit(20)
        .get();
      const appts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      const container = document.getElementById('patient-appointments-list');
      if (!container) return;

      if (appts.length === 0) {
        container.innerHTML = '<p class="text-muted">No appointments found</p>';
        return;
      }

      container.innerHTML = `
        <table class="data-table">
          <thead><tr><th>Date</th><th>Reason</th><th>Status</th></tr></thead>
          <tbody>
            ${appts.map(a => `
              <tr>
                <td>${a.preferred_date || 'TBD'}</td>
                <td>${a.reason || '—'}</td>
                <td>${getStatusBadge(a.status)}</td>
              </tr>`).join('')}
          </tbody>
        </table>`;
    } catch (err) {
      console.warn('Could not load patient appointments:', err);
    }
  }

  function switchTab(tabName) {
    document.querySelectorAll('.patient-tab-content').forEach(el => el.style.display = 'none');
    document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));
    
    const tab = document.getElementById(`patient-tab-${tabName}`);
    if (tab) tab.style.display = 'block';
    
    const btn = document.querySelector(`.tab-btn[data-tab="${tabName}"]`);
    if (btn) btn.classList.add('active');
  }

  function showAddPatientForm() {
    const detailPanel = document.getElementById('patient-detail-panel');
    if (!detailPanel) return;
    selectedPatientId = null;
    renderPatientList();

    detailPanel.innerHTML = `
      <div class="add-patient-form">
        <h3><i data-lucide="user-plus" style="width:20px;height:20px"></i> Add New Patient</h3>
        <div class="form-grid">
          <div class="form-group">
            <label>First Name *</label>
            <input type="text" id="new-patient-first" required placeholder="First name">
          </div>
          <div class="form-group">
            <label>Last Name *</label>
            <input type="text" id="new-patient-last" required placeholder="Last name">
          </div>
          <div class="form-group">
            <label>Phone *</label>
            <input type="tel" id="new-patient-phone" required placeholder="(336) 555-0000">
          </div>
          <div class="form-group">
            <label>Email</label>
            <input type="email" id="new-patient-email" placeholder="email@example.com">
          </div>
          <div class="form-group">
            <label>Date of Birth</label>
            <input type="date" id="new-patient-dob">
          </div>
          <div class="form-group">
            <label>Insurance Provider</label>
            <input type="text" id="new-patient-insurance" placeholder="e.g. Delta Dental PPO">
          </div>
          <div class="form-group">
            <label>Primary Concern</label>
            <input type="text" id="new-patient-concern" placeholder="e.g. Missing tooth, cleaning">
          </div>
          <div class="form-group">
            <label>Language</label>
            <select id="new-patient-lang">
              <option value="en">English</option>
              <option value="es">Español</option>
            </select>
          </div>
          <div class="form-group">
            <label>Status</label>
            <select id="new-patient-status">
              <option value="active">Active</option>
              <option value="potential" selected>Potential</option>
            </select>
          </div>
          <div class="form-group">
            <label>Source</label>
            <select id="new-patient-source">
              <option value="manual">Manual Entry</option>
              <option value="paloma_chat">PALOMA Chat</option>
              <option value="referral">Referral</option>
              <option value="pms_import">PMS Import</option>
            </select>
          </div>
        </div>
        <div style="margin-top:20px;display:flex;gap:12px">
          <button class="btn btn-primary" onclick="PatientProfiles.saveNewPatient()">
            <i data-lucide="save" style="width:14px;height:14px"></i> Save Patient
          </button>
          <button class="btn" onclick="PatientProfiles.cancelAdd()">
            Cancel
          </button>
        </div>
      </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  async function saveNewPatient() {
    const first = document.getElementById('new-patient-first')?.value?.trim();
    const last = document.getElementById('new-patient-last')?.value?.trim();
    const phone = document.getElementById('new-patient-phone')?.value?.trim();
    
    if (!first || !last || !phone) {
      showToast('First name, last name, and phone are required', 'error');
      return;
    }

    const data = {
      first_name: first,
      last_name: last,
      display_name: `${first} ${last}`,
      phone: phone,
      email: document.getElementById('new-patient-email')?.value?.trim() || '',
      date_of_birth: document.getElementById('new-patient-dob')?.value || null,
      insurance_provider: document.getElementById('new-patient-insurance')?.value?.trim() || '',
      primary_concern: document.getElementById('new-patient-concern')?.value?.trim() || '',
      preferred_language: document.getElementById('new-patient-lang')?.value || 'en',
      status: document.getElementById('new-patient-status')?.value || 'potential',
      source: document.getElementById('new-patient-source')?.value || 'manual',
      outstanding_balance: 0,
      total_lifetime_value: 0,
      conversation_count: 0
    };

    try {
      let patientId;
      if (typeof savePatient === 'function') {
        patientId = await savePatient(data);
      } else {
        const db = firebase.firestore();
        const ref = await db.collection('patients').add({
          ...data,
          created_at: firebase.firestore.FieldValue.serverTimestamp(),
          updated_at: firebase.firestore.FieldValue.serverTimestamp()
        });
        patientId = ref.id;
      }
      showToast(`Patient ${data.display_name} added`, 'success');
      await loadPatients();
      selectPatient(patientId);
    } catch (err) {
      console.error('Error saving patient:', err);
      showToast('Error saving patient', 'error');
    }
  }

  async function updateStatus(patientId, newStatus) {
    try {
      const db = firebase.firestore();
      await db.collection('patients').doc(patientId).update({ 
        status: newStatus,
        updated_at: firebase.firestore.FieldValue.serverTimestamp()
      });
      // Update local cache
      const p = patients.find(p => p.patient_id === patientId);
      if (p) p.status = newStatus;
      renderPatientList();
      showToast(`Status updated to ${newStatus}`, 'success');
    } catch (err) {
      console.error('Error updating status:', err);
      showToast('Error updating status', 'error');
    }
  }

  async function saveNotes(patientId) {
    const notes = document.getElementById('patient-notes-input')?.value || '';
    try {
      const db = firebase.firestore();
      await db.collection('patients').doc(patientId).update({
        paloma_notes: notes,
        updated_at: firebase.firestore.FieldValue.serverTimestamp()
      });
      showToast('Notes saved', 'success');
    } catch (err) {
      console.error('Error saving notes:', err);
      showToast('Error saving notes', 'error');
    }
  }

  function editPatient(patientId) {
    // For now, show add form pre-populated
    const patient = patients.find(p => p.patient_id === patientId);
    if (!patient) return;
    showAddPatientForm();
    // Pre-fill with existing data
    setTimeout(() => {
      const setVal = (id, val) => { const el = document.getElementById(id); if (el) el.value = val || ''; };
      setVal('new-patient-first', patient.first_name);
      setVal('new-patient-last', patient.last_name);
      setVal('new-patient-phone', patient.phone);
      setVal('new-patient-email', patient.email);
      setVal('new-patient-dob', patient.date_of_birth);
      setVal('new-patient-insurance', patient.insurance_provider);
      setVal('new-patient-concern', patient.primary_concern);
      setVal('new-patient-lang', patient.preferred_language);
      setVal('new-patient-status', patient.status);
      setVal('new-patient-source', patient.source);
    }, 100);
  }

  function cancelAdd() {
    const detailPanel = document.getElementById('patient-detail-panel');
    if (detailPanel) {
      detailPanel.innerHTML = `
        <div class="empty-state">
          <i data-lucide="user" style="width:48px;height:48px;color:var(--text-muted,#888)"></i>
          <p style="margin-top:12px;color:var(--text-muted)">Select a patient to view details</p>
        </div>`;
      if (typeof lucide !== 'undefined') lucide.createIcons();
    }
  }

  // Utility functions
  function getInitials(name) {
    if (!name) return '?';
    return name.split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase();
  }

  function getAvatarColor(name) {
    if (!name) return '#555';
    const colors = ['#2dd4bf', '#818cf8', '#f472b6', '#fb923c', '#a78bfa', '#34d399', '#f87171', '#60a5fa'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    return colors[Math.abs(hash) % colors.length];
  }

  function getStatusBadge(status) {
    const map = {
      'active': '<span class="badge badge-success">Active</span>',
      'potential': '<span class="badge badge-warning">Potential</span>',
      'inactive': '<span class="badge badge-muted">Inactive</span>',
      'archived': '<span class="badge badge-muted">Archived</span>',
      'confirmed': '<span class="badge badge-success">Confirmed</span>',
      'pending': '<span class="badge badge-warning">Pending</span>',
      'cancelled': '<span class="badge badge-danger">Cancelled</span>'
    };
    return map[status] || `<span class="badge">${status || 'Unknown'}</span>`;
  }

  function formatSource(source) {
    const map = {
      'paloma_chat': 'PALOMA Chat',
      'manual': 'Manual',
      'referral': 'Referral',
      'pms_import': 'PMS Import'
    };
    return map[source] || source;
  }

  function formatDate(date) {
    if (!date) return '—';
    if (typeof date === 'string') return date;
    if (date.toDate) date = date.toDate();
    return new Date(date).toLocaleDateString();
  }

  function showToast(message, type = 'info') {
    if (typeof window.showToast === 'function') {
      window.showToast(message, type);
    } else {
      console.log(`[${type}] ${message}`);
    }
  }

  // Public API
  return {
    init,
    loadPatients,
    selectPatient,
    showAddPatientForm,
    saveNewPatient,
    updateStatus,
    saveNotes,
    editPatient,
    cancelAdd,
    switchTab
  };
})();
