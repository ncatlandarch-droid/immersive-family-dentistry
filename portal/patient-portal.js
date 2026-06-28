/* ═══════════════════════════════════════════════════════════
   Patient Portal — Demo Mode (No Firebase Auth Required)
   Loads patient data directly and initializes all views.
   ═══════════════════════════════════════════════════════════ */

import { MouthViewer } from './mouth-viewer.js';

// ─── State ───
let patientData = null;
let dentalChart = null;
let treatmentPlan = null;
let timeline = null;
let mouthViewer = null;
let currentLang = 'en';

// ─── DOM Elements (set on load) ───
let portalEl = null;
let patientWelcome = null;

// ─── Auto-initialize on load (no auth needed) ───
document.addEventListener('DOMContentLoaded', async () => {
    portalEl = document.getElementById('portal');
    patientWelcome = document.querySelector('.portal-subtitle');
    await loadPatientData();
    initPortal();
});

// ─── Load Patient Data ───
async function loadPatientData() {
    try {
        const basePath = '/data/patients/chris-harrison';

        const [recordsRes, chartRes, planRes, timelineRes] = await Promise.all([
            fetch(`${basePath}/records.json`).then(r => r.ok ? r.json() : null),
            fetch(`${basePath}/dental-chart.json`).then(r => r.ok ? r.json() : null),
            fetch(`${basePath}/treatment-plan.json`).then(r => r.ok ? r.json() : null),
            fetch(`${basePath}/timeline.json`).then(r => r.ok ? r.json() : null),
        ]);

        patientData = recordsRes;
        dentalChart = chartRes;
        treatmentPlan = planRes;
        timeline = timelineRes;

        // Update welcome
        if (patientData?.patient && patientWelcome) {
            patientWelcome.textContent = `Welcome, ${patientData.patient.firstName}! 🕊️`;
        }

    } catch (error) {
        console.warn('PALOMA: Using fallback demo data', error);
        loadFallbackData();
    }

    if (!patientData) loadFallbackData();
}

function loadFallbackData() {
    patientData = {
        patient: { firstName: 'Chris', lastName: 'Harrison', id: 'chris-harrison' },
        lastVisit: '2026-05-14',
        nextVisit: '2026-09-10',
        overallHealth: { gumHealth: 'good', cavityRisk: 'low', areasToMonitor: 1, urgentFindings: 0 }
    };

    dentalChart = {
        teeth: Array.from({ length: 32 }, (_, i) => {
            const num = i + 1;
            let status = 'healthy', color = 'green', findings = ['No findings'], notes = '';
            if (num === 14) { status = 'restored'; color = 'green'; findings = ['Crown placed 2026-03-12', 'AI: No recurrent decay']; notes = 'Zirconia crown, excellent margins'; }
            if (num === 19) { status = 'restored'; color = 'green'; findings = ['Composite filling', 'AI: Stable']; notes = 'Composite restoration (2021)'; }
            if (num === 30) { status = 'monitor'; color = 'yellow'; findings = ['AI: Hairline ML cusp fracture detected', 'Confidence: 82%']; notes = 'Crown recommended — patient deciding'; }
            if (num === 16) { status = 'extracted'; color = 'gray'; findings = ['Extracted — wisdom tooth']; notes = 'Extracted prior to becoming patient'; }
            return { toothNumber: num, name: getToothName(num), status, color, findings, lastAssessed: '2026-05-14', notes };
        })
    };

    treatmentPlan = {
        pending: [
            { procedure: 'Periodontal Maintenance', tooth: 'Full mouth', priority: 'routine', estimatedCost: 250, insuranceEstimate: 200, patientEstimate: 50, scheduledDate: '2026-09-10', notes: 'Routine 6-month cleaning' },
            { procedure: 'Crown — Tooth #30', tooth: '#30', priority: 'moderate', estimatedCost: 1400, insuranceEstimate: 700, patientEstimate: 700, scheduledDate: 'TBD', notes: 'Recommended due to hairline fracture. Patient considering options.' },
            { procedure: 'Night Guard Consult', tooth: 'N/A', priority: 'low', estimatedCost: 550, insuranceEstimate: 0, patientEstimate: 550, scheduledDate: 'TBD', notes: 'Moderate bruxism noted. Custom night guard recommended.' },
        ]
    };

    timeline = {
        visits: [
            { date: '2026-01-15', type: 'Initial Exam', title: 'Comprehensive Exam & X-rays', description: 'Full mouth X-rays, comprehensive exam, treatment planning. AI scan identified fracture line on #30.', status: 'completed' },
            { date: '2026-02-19', type: 'Restorative', title: 'Crown Prep — Tooth #14', description: 'Prepared tooth #14 for zirconia crown. Digital impression taken with Medit i-700.', status: 'completed' },
            { date: '2026-03-12', type: 'Restorative', title: 'Crown Delivery — Tooth #14', description: 'Permanent zirconia crown cemented on #14. Perfect fit confirmed with digital scan overlay.', status: 'completed' },
            { date: '2026-05-14', type: 'Preventive', title: 'Cleaning & AI Scan', description: 'Prophylaxis, full AI-powered analysis. Crown #14 excellent. #30 fracture stable — continue monitoring.', status: 'completed' },
            { date: '2026-09-10', type: 'Preventive', title: 'Periodontal Maintenance', description: 'Scheduled routine cleaning and check-up.', status: 'upcoming' },
        ]
    };

    if (patientWelcome) patientWelcome.textContent = 'Demo Patient: Chris Harrison';
}

// ─── Initialize Portal ───
function initPortal() {
    try { init3DMouthMap(); } catch(e) { console.error('3D MouthMap init error:', e); }
    try { initNavigation(); } catch(e) { console.error('Nav init error:', e); }
    try { initOdontogram(); } catch(e) { console.error('Odontogram init error:', e); }
    try { initHealthSummary(); } catch(e) { console.error('Health init error:', e); }
    try { initTimeline(); } catch(e) { console.error('Timeline init error:', e); }
    try { initCostCenter(); } catch(e) { console.error('Cost init error:', e); }
    try { initTreatmentPlan(); } catch(e) { console.error('Plan init error:', e); }
    try { initMessages(); } catch(e) { console.error('Messages init error:', e); }
    try { initTimelineBar(); } catch(e) { console.error('TimelineBar init error:', e); }
    try { initPortalChat(); } catch(e) { console.error('Chat init error:', e); }
}

// ─── 3D MouthMap Viewer ───
function init3DMouthMap() {
    const container = document.querySelector('.mouth-viewer-container');
    if (!container) return;

    // Set background dark for 3D viewer
    container.style.background = '#0B0F19';

    mouthViewer = new MouthViewer(container, {
        backgroundColor: 0x0B0F19,
        modelColor: 0xf5e6d3,
        highlightColor: 0x2dd4bf,
    });

    // Load dental chart teeth
    mouthViewer.loadDemoModel(dentalChart);

    // Wire tooth clicks to info panel
    mouthViewer.onToothClick = (userData) => {
        if (userData.toothNumber) {
            selectTooth(userData.toothNumber);
        }
    };

    // Anatomy layer toggles
    document.querySelectorAll('.anatomy-toggle').forEach(btn => {
        btn.addEventListener('click', () => {
            const layer = btn.dataset.layer;
            btn.classList.toggle('active');
            const isActive = btn.classList.contains('active');

            if (mouthViewer && mouthViewer.toggleLayer) {
                mouthViewer.toggleLayer(layer, isActive);
            } else {
                // Basic toggle: show/hide tooth model for 'teeth'
                if (layer === 'teeth' && mouthViewer.model) {
                    mouthViewer.model.visible = isActive;
                }
                if (layer === 'nerves' && mouthViewer.renderNerves) {
                    if (isActive) mouthViewer.renderNerves();
                    else if (mouthViewer.nerveGroup) mouthViewer.nerveGroup.visible = false;
                }
                if (layer === 'muscles' && mouthViewer.renderMuscles) {
                    if (isActive) mouthViewer.renderMuscles();
                    else if (mouthViewer.muscleGroup) mouthViewer.muscleGroup.visible = false;
                }
                if (layer === 'gums' && mouthViewer.renderGumline) {
                    if (isActive) mouthViewer.renderGumline();
                    else if (mouthViewer.gumGroup) mouthViewer.gumGroup.visible = false;
                }
            }
        });
    });

    // View controls
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.view-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const view = btn.dataset.view;

            if (!mouthViewer) return;
            const cam = mouthViewer.camera;
            const ctrl = mouthViewer.controls;

            switch (view) {
                case 'front':
                    cam.position.set(0, 0, 120);
                    ctrl.target.set(0, 0, 0);
                    break;
                case 'top':
                    cam.position.set(0, 120, 10);
                    ctrl.target.set(0, 0, 0);
                    break;
                case 'upper':
                    cam.position.set(0, 40, 80);
                    ctrl.target.set(0, 8, 0);
                    break;
                case 'lower':
                    cam.position.set(0, -40, 80);
                    ctrl.target.set(0, -8, 0);
                    break;
                case 'reset':
                    mouthViewer.resetView();
                    break;
            }
            ctrl.update();
        });
    });

    console.log('🦷 3D MouthMap initialized — Sketchfab replaced');
}

// ─── Interactive Odontogram (2D Dental Chart) ───
function initOdontogram() {
    const upperRow = document.getElementById('upper-arch');
    const lowerRow = document.getElementById('lower-arch');
    if (!upperRow || !lowerRow) return;

    const teeth = dentalChart?.teeth || [];

    function getStatus(num) {
        const t = teeth.find(t => t.toothNumber === num);
        return t ? t.status : 'healthy';
    }

    // Upper arch: 1-16
    for (let i = 1; i <= 16; i++) {
        const status = getStatus(i);
        const btn = document.createElement('button');
        btn.className = `tooth-btn status-${status}`;
        btn.textContent = i;
        btn.dataset.tooth = i;
        btn.addEventListener('click', () => selectTooth(i));
        upperRow.appendChild(btn);
    }

    // Lower arch: 32-17 (reversed)
    for (let i = 32; i >= 17; i--) {
        const status = getStatus(i);
        const btn = document.createElement('button');
        btn.className = `tooth-btn status-${status}`;
        btn.textContent = i;
        btn.dataset.tooth = i;
        btn.addEventListener('click', () => selectTooth(i));
        lowerRow.appendChild(btn);
    }

    // Close button
    document.getElementById('tooth-info-close')?.addEventListener('click', () => {
        document.getElementById('tooth-info').style.display = 'none';
        document.querySelectorAll('.tooth-btn.active').forEach(b => b.classList.remove('active'));
    });
}

function selectTooth(num) {
    const teeth = dentalChart?.teeth || [];
    const t = teeth.find(t => t.toothNumber === num);

    // Highlight active
    document.querySelectorAll('.tooth-btn.active').forEach(b => b.classList.remove('active'));
    document.querySelector(`.tooth-btn[data-tooth="${num}"]`)?.classList.add('active');

    const panel = document.getElementById('tooth-info');
    document.getElementById('tooth-name').textContent = `Tooth #${num} — ${t?.name || getToothName(num)}`;

    const badge = document.getElementById('tooth-status');
    const status = t?.status || 'healthy';
    badge.textContent = capitalize(status);
    badge.className = 'tooth-badge';
    if (status === 'healthy') { badge.style.background = '#D1FAE5'; badge.style.color = '#065F46'; }
    else if (status === 'restored') { badge.style.background = '#DBEAFE'; badge.style.color = '#1E40AF'; }
    else if (status === 'monitor') { badge.style.background = '#FEF3C7'; badge.style.color = '#92400E'; }
    else if (status === 'extracted') { badge.style.background = '#F1F5F9'; badge.style.color = '#475569'; }
    else { badge.style.background = '#FEE2E2'; badge.style.color = '#991B1B'; }

    const findings = t?.findings || ['No findings — this tooth looks healthy ✓'];
    const notes = t?.notes || '';
    document.getElementById('tooth-findings').innerHTML = `
        <ul style="list-style:none;padding:0;margin:8px 0 0;">
            ${findings.map(f => `<li style="padding:4px 0;font-size:13px;color:#475569;">• ${f}</li>`).join('')}
        </ul>
        ${notes ? `<p style="margin-top:10px;padding-top:10px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748B;font-style:italic;">📝 ${notes}</p>` : ''}
    `;

    panel.style.display = 'block';
}

// ─── Navigation ───
function initNavigation() {
    const nav = document.getElementById('portal-nav');
    nav.addEventListener('click', (e) => {
        const btn = e.target.closest('.nav-item');
        if (!btn) return;

        const view = btn.dataset.view;
        nav.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');

        document.querySelectorAll('.portal-view').forEach(v => v.classList.remove('active'));
        document.getElementById(`view-${view}`).classList.add('active');
    });
}

// ─── 3D Viewer ───
function init3DViewer() {
    const container = document.getElementById('mouth-viewer');
    const loading = document.getElementById('viewer-loading');

    try {
        // Check if Three.js loaded
        if (typeof THREE === 'undefined') {
            throw new Error('Three.js not loaded');
        }
        if (typeof THREE.OrbitControls === 'undefined') {
            throw new Error('OrbitControls not loaded');
        }

        mouthViewer = new MouthViewer(container);
        mouthViewer.loadDemoModel(dentalChart);

        loading.style.display = 'none';

        mouthViewer.onToothClick = (toothData) => {
            showToothInfo(toothData);
        };

        document.getElementById('reset-view-btn').addEventListener('click', () => {
            mouthViewer.resetView();
        });

        document.getElementById('tooth-info-close').addEventListener('click', () => {
            document.getElementById('tooth-info').style.display = 'none';
        });
    } catch (err) {
        console.error('MouthMap 3D Viewer error:', err);
        loading.innerHTML = `
            <div style="text-align:center;padding:40px;">
                <p style="font-size:40px;margin-bottom:12px;">🦷</p>
                <p style="font-size:16px;font-weight:600;color:#1E293B;">Interactive 3D MouthMap</p>
                <p style="font-size:13px;color:#64748B;margin-top:8px;">3D viewer loading issue — click <strong>Health Summary</strong> to see your dental chart.</p>
                <p style="font-size:11px;color:#94A3B8;margin-top:12px;">Error: ${err.message}</p>
            </div>
        `;
    }
}

function showToothInfo(toothData) {
    const panel = document.getElementById('tooth-info');
    const chart = toothData.chartData;

    document.getElementById('tooth-name').textContent = chart
        ? `Tooth #${chart.toothNumber} — ${chart.name}`
        : `Tooth #${toothData.toothNumber}`;

    const badge = document.getElementById('tooth-status');
    if (chart) {
        badge.textContent = chart.status.charAt(0).toUpperCase() + chart.status.slice(1);
        badge.className = `tooth-badge ${chart.color}`;
    } else {
        badge.textContent = 'No data';
        badge.className = 'tooth-badge gray';
    }

    const findings = document.getElementById('tooth-findings');
    if (chart?.findings) {
        findings.innerHTML = chart.findings.map(f => `<p>• ${f}</p>`).join('');
        if (chart.notes) findings.innerHTML += `<p style="margin-top:8px;font-style:italic">${chart.notes}</p>`;
    } else {
        findings.innerHTML = '<p>No findings recorded for this tooth.</p>';
    }

    panel.style.display = 'block';
}

// ─── Health Summary ───
function initHealthSummary() {
    const container = document.getElementById('health-cards');
    const health = patientData?.overallHealth || {};

    const cards = [
        { icon: '🦷', label: 'Gum Health', value: capitalize(health.gumHealth || 'Good'), cls: health.gumHealth === 'good' ? 'good' : 'monitor' },
        { icon: '🔍', label: 'Cavity Risk', value: capitalize(health.cavityRisk || 'Low'), cls: health.cavityRisk === 'low' ? 'good' : 'monitor' },
        { icon: '⚠️', label: 'Areas to Monitor', value: health.areasToMonitor || 0, cls: (health.areasToMonitor || 0) > 2 ? 'attention' : (health.areasToMonitor || 0) > 0 ? 'monitor' : 'good' },
        { icon: '🚨', label: 'Urgent Findings', value: health.urgentFindings || 0, cls: (health.urgentFindings || 0) > 0 ? 'attention' : 'good' },
        { icon: '📅', label: 'Last Visit', value: formatDate(patientData?.lastVisit), cls: '' },
        { icon: '📆', label: 'Next Visit', value: formatDate(patientData?.nextVisit), cls: '' },
    ];

    container.innerHTML = cards.map(c => `
        <div class="health-card">
            <div class="health-card__icon">${c.icon}</div>
            <div class="health-card__label">${c.label}</div>
            <div class="health-card__value ${c.cls}">${c.value}</div>
        </div>
    `).join('');

    // Dental chart grid
    const chartContainer = document.getElementById('health-chart');
    if (dentalChart?.teeth) {
        const upperTeeth = dentalChart.teeth.filter(t => t.toothNumber <= 16).sort((a,b) => a.toothNumber - b.toothNumber);
        const lowerTeeth = dentalChart.teeth.filter(t => t.toothNumber > 16).sort((a,b) => b.toothNumber - a.toothNumber);

        chartContainer.innerHTML = `
            <h3 style="font-family:'Outfit',sans-serif;font-size:16px;margin-bottom:12px;">Dental Chart <span style="font-size:12px;color:var(--portal-muted);font-weight:400;">— click any tooth</span></h3>
            <p style="font-size:11px;color:var(--portal-muted);margin-bottom:12px;">Upper Arch (1-16)</p>
            <div class="dental-grid">
                ${upperTeeth.map(t => `
                    <div class="dental-grid__tooth ${t.color} ${t.status === 'extracted' ? 'extracted' : ''}"
                         title="#${t.toothNumber} — ${t.name}: ${t.status}"
                         data-tooth="${t.toothNumber}"
                         style="cursor:pointer;">
                        ${t.toothNumber}
                    </div>
                `).join('')}
            </div>
            <p style="font-size:11px;color:var(--portal-muted);margin:12px 0;">Lower Arch (32-17)</p>
            <div class="dental-grid">
                ${lowerTeeth.map(t => `
                    <div class="dental-grid__tooth ${t.color} ${t.status === 'extracted' ? 'extracted' : ''}"
                         title="#${t.toothNumber} — ${t.name}: ${t.status}"
                         data-tooth="${t.toothNumber}"
                         style="cursor:pointer;">
                        ${t.toothNumber}
                    </div>
                `).join('')}
            </div>
            <div style="display:flex;gap:16px;margin-top:16px;font-size:11px;color:var(--portal-muted);">
                <span>🟢 Healthy</span>
                <span>🟡 Monitor</span>
                <span>🔴 Needs Treatment</span>
                <span>⬜ Extracted</span>
            </div>
            <div id="health-tooth-detail" style="display:none;margin-top:16px;padding:16px 20px;background:var(--portal-surface-alt);border-radius:12px;border:1px solid var(--portal-border);animation:slideUp 0.25s ease;">
                <button id="health-tooth-close" style="float:right;background:none;border:none;font-size:16px;color:var(--portal-muted);cursor:pointer;">✕</button>
                <h4 id="health-tooth-name" style="font-family:'Outfit',sans-serif;font-size:15px;font-weight:700;margin-bottom:6px;"></h4>
                <span id="health-tooth-badge" style="display:inline-block;padding:3px 10px;border-radius:20px;font-size:11px;font-weight:600;margin-bottom:8px;"></span>
                <div id="health-tooth-findings" style="font-size:13px;color:#475569;line-height:1.7;"></div>
            </div>
        `;

        // Click handlers for dental chart
        chartContainer.addEventListener('click', (e) => {
            const el = e.target.closest('[data-tooth]');
            if (!el) return;
            const num = parseInt(el.dataset.tooth);
            const t = dentalChart.teeth.find(t => t.toothNumber === num);
            if (!t) return;

            // Highlight
            chartContainer.querySelectorAll('.dental-grid__tooth').forEach(el => el.style.outline = '');
            el.style.outline = '3px solid #0D4F4F';

            document.getElementById('health-tooth-name').textContent = `Tooth #${num} — ${t.name}`;

            const badge = document.getElementById('health-tooth-badge');
            badge.textContent = capitalize(t.status);
            if (t.status === 'healthy') { badge.style.background = '#D1FAE5'; badge.style.color = '#065F46'; }
            else if (t.status === 'restored') { badge.style.background = '#DBEAFE'; badge.style.color = '#1E40AF'; }
            else if (t.status === 'monitor') { badge.style.background = '#FEF3C7'; badge.style.color = '#92400E'; }
            else if (t.status === 'extracted') { badge.style.background = '#F1F5F9'; badge.style.color = '#475569'; }

            const findings = t.findings || ['No findings'];
            document.getElementById('health-tooth-findings').innerHTML = `
                <ul style="list-style:none;padding:0;margin:4px 0 0;">
                    ${findings.map(f => `<li style="padding:3px 0;">• ${f}</li>`).join('')}
                </ul>
                ${t.notes ? `<p style="margin-top:8px;padding-top:8px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748B;font-style:italic;">📝 ${t.notes}</p>` : ''}
            `;

            document.getElementById('health-tooth-detail').style.display = 'block';
        });

        document.getElementById('health-tooth-close')?.addEventListener('click', () => {
            document.getElementById('health-tooth-detail').style.display = 'none';
            chartContainer.querySelectorAll('.dental-grid__tooth').forEach(el => el.style.outline = '');
        });
    }
}

// ─── Timeline (Visual Vertical) ───
function initTimeline() {
    const container = document.getElementById('timeline-container');
    const visits = timeline?.visits || [];

    const typeIcons = { 'New Patient': '👋', 'Diagnostic': '🔬', 'Restorative': '🔧', 'Preventive': '✨' };

    container.innerHTML = visits.map((v, i) => `
        <div class="vt-card ${v.status === 'upcoming' ? 'vt-upcoming' : ''}">
            <div class="vt-card__line">
                <div class="vt-card__dot ${v.status === 'upcoming' ? 'upcoming' : 'past'}"></div>
                ${i < visits.length - 1 ? '<div class="vt-card__connector"></div>' : ''}
            </div>
            <div class="vt-card__content">
                <div class="vt-card__header">
                    <span class="vt-card__icon">${typeIcons[v.type] || '📅'}</span>
                    <div>
                        <div class="vt-card__date">${formatDate(v.date)}</div>
                        <div class="vt-card__type">${v.type}</div>
                    </div>
                    <span class="vt-card__status ${v.status}">${v.status === 'upcoming' ? '🔔 Upcoming' : '✓ Completed'}</span>
                </div>
                <div class="vt-card__title">${v.title}</div>
                <div class="vt-card__desc">${v.description}</div>
                <div class="vt-card__provider">👤 ${v.provider || 'Dr. Brenes'}</div>
                ${v.highlights?.length ? `
                    <div class="vt-card__chips">
                        ${v.highlights.map(h => `<span class="vt-chip">${h}</span>`).join('')}
                    </div>
                ` : ''}
            </div>
        </div>
    `).join('');
}

// ─── Messages (Demo) ───
function initMessages() {
    const container = document.getElementById('messages-container');
    if (!container) return;

    const threads = [
        {
            subject: 'Crown #30 — Treatment Options',
            date: '2026-05-14',
            unread: true,
            messages: [
                { from: 'Dr. Brenes', time: 'May 14, 2:30 PM', text: 'Hi Chris! After today\'s scan, I wanted to follow up on tooth #30. The AI detected a hairline fracture on the ML cusp (82% confidence). I recommend a zirconia crown to prevent further damage. Happy to discuss options at your next visit or feel free to reply here!' },
                { from: 'Chris Harrison', time: 'May 14, 4:15 PM', text: 'Thanks Dr. Brenes! I saw that on my MouthMap — really helpful to visualize it. What\'s the timeline if I decide to go ahead? And what would insurance cover?' },
                { from: 'Dr. Brenes', time: 'May 15, 9:00 AM', text: 'Great question! It\'s a two-visit process — digital prep + scan (visit 1), then crown delivery ~2 weeks later. Your Delta Dental PPO covers 50%, so your out-of-pocket would be approximately $700. No rush on the decision — the fracture is stable for now. Let me know! 🙂' },
            ]
        },
        {
            subject: 'Appointment Confirmation — Sept 10',
            date: '2026-06-01',
            unread: false,
            messages: [
                { from: 'Lake Jeanette Family Dentistry', time: 'Jun 1, 10:00 AM', text: 'Hi Chris! This is a confirmation for your upcoming appointment:\\n\\n📅 September 10, 2026 at 9:00 AM\\n🦷 Periodontal Maintenance & AI Scan\\n👤 Emily (Hygienist) + Dr. Brenes\\n\\nReply to confirm or reschedule. See you then! 🕊️' },
                { from: 'Chris Harrison', time: 'Jun 1, 11:22 AM', text: 'Confirmed! See you then.' },
            ]
        },
        {
            subject: 'Night Guard Recommendation',
            date: '2026-05-16',
            unread: false,
            messages: [
                { from: 'Dr. Brenes', time: 'May 16, 3:00 PM', text: 'Hi Chris, one more thing from your last visit — I noticed moderate wear facets on your canines and premolars, which suggests bruxism (teeth grinding). I recommend a custom night guard to protect your crown on #14 and prevent further issues with #30. It\'s a single visit for the digital scan, then we fabricate it in about 2 weeks. Let me know if you\'d like to add this to your treatment plan!' },
            ]
        },
        {
            subject: 'Insurance EOB — May Visit',
            date: '2026-05-28',
            unread: true,
            messages: [
                { from: 'Billing Team', time: 'May 28, 8:00 AM', text: 'Hi Chris, your Explanation of Benefits for your May 14 visit has been processed by Delta Dental PPO. Here\'s a summary:\\n\\n• Preventive Cleaning (D1110): $0 patient cost — covered 100%\\n• Periodic Exam (D0120): $0 patient cost — covered 100%\\n• Full Mouth Scan (D0330): $45 patient cost — covered 80%\\n\\nTotal due: $45.00\\nAccount balance: $45.00\\n\\nYou can pay online through the My Costs tab or call us. Thanks!' },
                { from: 'Chris Harrison', time: 'May 28, 12:15 PM', text: 'Thanks! I\'ll pay through the portal. Can I set up autopay for future visits?' },
                { from: 'Billing Team', time: 'May 29, 9:30 AM', text: 'Absolutely! We\'re rolling out autopay with our new PALOMA system this fall. For now, you can pay per visit in My Costs. We\'ll notify you as soon as autopay is live! 🕊️' },
            ]
        },
        {
            subject: 'Welcome to My MouthMap! 🕊️',
            date: '2025-10-15',
            unread: false,
            messages: [
                { from: 'Lake Jeanette Family Dentistry', time: 'Oct 15, 10:00 AM', text: 'Welcome to My MouthMap, Chris! 👋\\n\\nYour patient portal is now active. Here\'s what you can do:\\n\\n🦷 My Scan — View your 3D digital twin\\n❤️ Health Summary — Track dental health at a glance\\n📅 Visit History — See your full visit history\\n💰 My Costs — View costs, insurance, and balances\\n📋 My Treatment Options — Review recommended treatments\\n💬 Messages from Our Team — Secure messaging with our team\\n\\nAnd of course, PALOMA — your AI dental guide — is always here to answer questions about your health.\\n\\nWe\'re so glad you\'re part of the Lake Jeanette family!' },
            ]
        }
    ];

    container.innerHTML = threads.map((t, i) => `
        <div class="msg-thread ${t.unread ? 'msg-unread' : ''}" data-thread="${i}">
            <div class="msg-thread__header" style="cursor:pointer;" onclick="this.parentElement.classList.toggle('msg-expanded')">
                <div class="msg-thread__left">
                    ${t.unread ? '<span class="msg-dot"></span>' : ''}
                    <div>
                        <div class="msg-thread__subject">${t.subject}</div>
                        <div class="msg-thread__preview">${t.messages[t.messages.length - 1].text.substring(0, 80)}...</div>
                    </div>
                </div>
                <div class="msg-thread__date">${formatDate(t.date)}</div>
            </div>
            <div class="msg-thread__body">
                ${t.messages.map(m => `
                    <div class="msg-bubble ${m.from === 'Chris Harrison' ? 'msg-sent' : 'msg-received'}">
                        <div class="msg-bubble__from">${m.from} <span class="msg-bubble__time">• ${m.time}</span></div>
                        <div class="msg-bubble__text">${m.text.replace(/\\n/g, '<br>')}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `).join('');

    // Unread badge
    const unreadCount = threads.filter(t => t.unread).length;
    const badge = document.getElementById('inbox-unread-badge');
    if (badge && unreadCount > 0) {
        badge.textContent = `${unreadCount} unread`;
        badge.style.display = 'inline-block';
    }

    // Search filter
    const searchInput = document.getElementById('inbox-search');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            const q = searchInput.value.toLowerCase();
            container.querySelectorAll('.msg-thread').forEach(el => {
                const text = el.textContent.toLowerCase();
                el.style.display = text.includes(q) ? '' : 'none';
            });
        });
    }
}

// ─── Cost Center ───
function initCostCenter() {
    const container = document.getElementById('cost-summary');
    const pending = treatmentPlan?.pending || [];

    let totalCost = 0, totalInsurance = 0, totalPatient = 0;
    pending.forEach(p => {
        totalCost += p.estimatedCost;
        totalInsurance += p.insuranceEstimate;
        totalPatient += p.patientEstimate;
    });

    container.innerHTML = `
        <div class="health-cards" style="margin-bottom:20px;">
            <div class="health-card">
                <div class="health-card__icon">💵</div>
                <div class="health-card__label">Total Estimated</div>
                <div class="health-card__value">$${totalCost.toLocaleString()}</div>
            </div>
            <div class="health-card">
                <div class="health-card__icon">🏥</div>
                <div class="health-card__label">Insurance Savings</div>
                <div class="health-card__value good">Insurance saves you: $${totalInsurance.toLocaleString()}</div>
            </div>
            <div class="health-card">
                <div class="health-card__icon">👤</div>
                <div class="health-card__label">Your Estimate</div>
                <div class="health-card__value">$${totalPatient.toLocaleString()}</div>
            </div>
        </div>
        ${pending.map(p => `
            <div class="cost-card">
                <div>
                    <div class="cost-card__procedure">${p.procedure}</div>
                    <div class="cost-card__detail">${p.tooth} • ${p.scheduledDate ? formatDate(p.scheduledDate) : 'To be scheduled'}</div>
                </div>
                <div class="cost-card__amounts">
                    <div class="cost-card__total">$${p.estimatedCost.toLocaleString()}</div>
                    <div class="cost-card__insurance">Insurance saves you: $${p.insuranceEstimate.toLocaleString()}</div>
                    <div class="cost-card__patient">You pay: $${p.patientEstimate.toLocaleString()}</div>
                </div>
            </div>
        `).join('')}
        <div style="padding:16px;background:var(--portal-surface-alt);border-radius:12px;font-size:13px;color:var(--portal-muted);margin-top:8px;">
            💡 <strong>Financing available:</strong> CareCredit and in-house payment plans. Ask PALOMA for details!
        </div>
    `;
}

// ─── Treatment Plan ───
function initTreatmentPlan() {
    const container = document.getElementById('plan-container');
    const pending = treatmentPlan?.pending || [];

    container.innerHTML = pending.map(p => `
        <div class="plan-card ${p.priority}">
            <div class="plan-card__header">
                <div class="plan-card__title">${p.procedure}</div>
                <span class="plan-card__priority tooth-badge ${p.priority === 'routine' ? 'green' : p.priority === 'moderate' ? 'yellow' : 'red'}">
                    ${capitalize(p.priority)}
                </span>
            </div>
            <div class="plan-card__body">
                <p><strong>Tooth:</strong> ${p.tooth}</p>
                <p><strong>Estimated Cost:</strong> $${p.estimatedCost} (You pay ~$${p.patientEstimate} after insurance)</p>
                <p><strong>Scheduled:</strong> ${p.scheduledDate ? formatDate(p.scheduledDate) : 'To be scheduled'}</p>
                ${p.notes ? `<p style="margin-top:8px">${p.notes}</p>` : ''}
            </div>
        </div>
    `).join('');
}

// ─── Bottom Timeline Bar (Interactive + Scrollable) ───
function initTimelineBar() {
    const container = document.getElementById('portal-timeline-bar');
    const visits = timeline?.visits || [];
    if (!visits.length) return;

    container.innerHTML = `
        <button class="tl-arrow tl-arrow--left" id="tl-scroll-left">‹</button>
        <div class="timeline-bar-scroll" id="tl-scroll-area">
            <div class="timeline-bar-track">
                ${visits.map((v, i) => `
                    <div class="timeline-bar-dot ${v.status === 'upcoming' ? 'upcoming' : 'past'}" 
                         data-visit-idx="${i}" 
                         title="${v.title}"
                         style="cursor:pointer;">
                        <span class="timeline-bar-dot__label">${v.date ? new Date(v.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }) : '?'}</span>
                        <span class="timeline-bar-dot__type">${v.type || ''}</span>
                    </div>
                `).join('')}
            </div>
        </div>
        <button class="tl-arrow tl-arrow--right" id="tl-scroll-right">›</button>
        <div class="tl-detail-popup" id="tl-detail" style="display:none;">
            <button class="tl-detail-close" id="tl-detail-close">✕</button>
            <div class="tl-detail-date" id="tl-detail-date"></div>
            <div class="tl-detail-title" id="tl-detail-title"></div>
            <div class="tl-detail-desc" id="tl-detail-desc"></div>
            <div class="tl-detail-highlights" id="tl-detail-highlights"></div>
        </div>
    `;

    // Scroll arrows
    const scrollArea = document.getElementById('tl-scroll-area');
    document.getElementById('tl-scroll-left').addEventListener('click', () => {
        scrollArea.scrollBy({ left: -150, behavior: 'smooth' });
    });
    document.getElementById('tl-scroll-right').addEventListener('click', () => {
        scrollArea.scrollBy({ left: 150, behavior: 'smooth' });
    });

    // Click dots
    container.addEventListener('click', (e) => {
        const dot = e.target.closest('[data-visit-idx]');
        if (!dot) return;
        const idx = parseInt(dot.dataset.visitIdx);
        const v = visits[idx];
        if (!v) return;

        // Highlight active
        container.querySelectorAll('.timeline-bar-dot').forEach(d => d.classList.remove('active'));
        dot.classList.add('active');

        document.getElementById('tl-detail-date').textContent = `${formatDate(v.date)} • ${v.type}`;
        document.getElementById('tl-detail-title').textContent = v.title;
        document.getElementById('tl-detail-desc').textContent = v.description;
        
        const highlights = v.highlights || [];
        document.getElementById('tl-detail-highlights').innerHTML = highlights.length 
            ? `<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:6px;">${highlights.map(h => `<span style="padding:3px 10px;background:#F0FDF4;border-radius:20px;font-size:11px;color:#065F46;font-weight:500;">${h}</span>`).join('')}</div>`
            : '';

        document.getElementById('tl-detail').style.display = 'block';
    });

    document.getElementById('tl-detail-close').addEventListener('click', () => {
        document.getElementById('tl-detail').style.display = 'none';
        container.querySelectorAll('.timeline-bar-dot').forEach(d => d.classList.remove('active'));
    });
}

// ─── PALOMA Personal Chat ───
function initPortalChat() {
    const messagesEl = document.getElementById('portal-chat-messages');
    const inputEl = document.getElementById('portal-chat-input');
    const sendBtn = document.getElementById('portal-chat-send');
    const suggestionsEl = document.getElementById('portal-chat-suggestions');

    const name = patientData?.patient?.firstName || 'there';
    const lastVisit = patientData?.lastVisit ? formatDate(patientData.lastVisit) : 'recently';
    const greeting = `Hi ${name}! 🕊️ I'm PALOMA, and I know your dental history here at Lake Jeanette.\n\nNo question is too small — I'm here 24/7 and I know your records. Your last visit was ${lastVisit}. Looking at your records, your overall dental health is looking **${patientData?.overallHealth?.gumHealth || 'good'}**${dentalChart?.teeth?.some(t => t.color === 'yellow') ? ', with 1 area we\'re monitoring.' : '.'}\n\nWhat would you like to know about your dental health?`;

    addChatMessage(messagesEl, greeting, 'bot');

    const send = async () => {
        const text = inputEl.value.trim();
        if (!text) return;

        addChatMessage(messagesEl, text, 'user');
        inputEl.value = '';
        suggestionsEl.style.display = 'none';

        const typing = document.createElement('div');
        typing.className = 'portal-msg portal-msg--bot';
        typing.style.opacity = '0.6';
        typing.textContent = 'PALOMA is thinking...';
        messagesEl.appendChild(typing);
        messagesEl.scrollTop = messagesEl.scrollHeight;

        try {
            const patientContext = buildPatientContext();
            const response = await fetch('/.netlify/functions/paloma-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: `[PATIENT CONTEXT - This patient is logged into their portal. Their data:\n${patientContext}]\n\nPatient's question: ${text}`,
                    history: [],
                    lang: currentLang,
                }),
            });

            typing.remove();

            if (response.ok) {
                const data = await response.json();
                addChatMessage(messagesEl, data.reply, 'bot');
            } else {
                throw new Error('API error');
            }
        } catch (e) {
            typing.remove();
            addChatMessage(messagesEl, 'I\'m having trouble connecting right now. Please try again, or call us at (336) 545-4281! 🕊️', 'bot');
        }
    };

    sendBtn.addEventListener('click', send);
    inputEl.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') { e.preventDefault(); send(); }
    });

    suggestionsEl.addEventListener('click', (e) => {
        if (e.target.classList.contains('paloma-chip')) {
            inputEl.value = e.target.textContent;
            send();
        }
    });
}

function buildPatientContext() {
    const parts = [];
    if (patientData?.patient) {
        parts.push(`Name: ${patientData.patient.firstName} ${patientData.patient.lastName}`);
        parts.push(`Last Visit: ${patientData.lastVisit}`);
        parts.push(`Next Visit: ${patientData.nextVisit}`);
        parts.push(`Gum Health: ${patientData.overallHealth?.gumHealth}`);
        parts.push(`Cavity Risk: ${patientData.overallHealth?.cavityRisk}`);
    }
    if (dentalChart?.teeth) {
        const notable = dentalChart.teeth.filter(t => t.status !== 'healthy');
        notable.forEach(t => {
            parts.push(`Tooth #${t.toothNumber} (${t.name}): ${t.status} — ${t.findings?.join(', ')}`);
        });
    }
    if (treatmentPlan?.pending) {
        parts.push('Pending treatments:');
        treatmentPlan.pending.forEach(p => {
            parts.push(`- ${p.procedure} (${p.tooth}): $${p.estimatedCost}, patient pays ~$${p.patientEstimate}`);
        });
    }
    return parts.join('\n');
}

function addChatMessage(container, text, type) {
    const div = document.createElement('div');
    div.className = `portal-msg portal-msg--${type}`;
    div.innerHTML = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\n/g, '<br>');
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
}

// ─── Utility Functions ───
function formatDate(dateStr) {
    if (!dateStr || dateStr.includes('XX')) return dateStr || 'TBD';
    try {
        return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch {
        return dateStr;
    }
}

function capitalize(str) {
    if (!str) return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
}

function getToothName(num) {
    const names = {
        1: 'Upper Right Third Molar', 2: 'Upper Right Second Molar', 3: 'Upper Right First Molar',
        4: 'Upper Right Second Premolar', 5: 'Upper Right First Premolar', 6: 'Upper Right Canine',
        7: 'Upper Right Lateral Incisor', 8: 'Upper Right Central Incisor',
        9: 'Upper Left Central Incisor', 10: 'Upper Left Lateral Incisor', 11: 'Upper Left Canine',
        12: 'Upper Left First Premolar', 13: 'Upper Left Second Premolar', 14: 'Upper Left First Molar',
        15: 'Upper Left Second Molar', 16: 'Upper Left Third Molar',
        17: 'Lower Left Third Molar', 18: 'Lower Left Second Molar', 19: 'Lower Left First Molar',
        20: 'Lower Left Second Premolar', 21: 'Lower Left First Premolar', 22: 'Lower Left Canine',
        23: 'Lower Left Lateral Incisor', 24: 'Lower Left Central Incisor',
        25: 'Lower Right Central Incisor', 26: 'Lower Right Lateral Incisor', 27: 'Lower Right Canine',
        28: 'Lower Right First Premolar', 29: 'Lower Right Second Premolar', 30: 'Lower Right First Molar',
        31: 'Lower Right Second Molar', 32: 'Lower Right Third Molar',
    };
    return names[num] || `Tooth #${num}`;
}

// ─── Language Toggle ───
document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        currentLang = btn.dataset.lang;
        document.querySelectorAll('.lang-btn').forEach(b => b.classList.toggle('active', b.dataset.lang === currentLang));
    });
});
