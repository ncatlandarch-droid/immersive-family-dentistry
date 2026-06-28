/* ═══════════════════════════════════════════════════════════
   My MouthMap — Patient Portal JavaScript
   Ties together: Firebase Auth, 3D Viewer, Patient Data,
   PALOMA Personal Mode, and all portal views.
   ═══════════════════════════════════════════════════════════ */

import { MouthViewer } from './mouth-viewer.js';

// ─── Firebase Config ───
const firebaseConfig = {
    apiKey: atob("QUl6YVN5T2NOS1FiSU5KQXhtelNjTDFKbnhVMWcxZW9GZDEyQg=="),
    authDomain: "paloma-ae92c.firebaseapp.com",
    projectId: "paloma-ae92c",
    storageBucket: "paloma-ae92c.firebasestorage.app",
    messagingSenderId: "495284082804",
    appId: "1:495284882804:web:6a8cc9a3b8b49b789478c1",
    measurementId: "G-7SGKKY429"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();

// ─── State ───
let patientData = null;
let dentalChart = null;
let treatmentPlan = null;
let timeline = null;
let mouthViewer = null;
let currentLang = 'en';
let portalInitialized = false;

// ─── DOM Elements ───
const authGate = document.getElementById('auth-gate');
const portal = document.getElementById('portal');
const loginForm = document.getElementById('login-form');
const authError = document.getElementById('auth-error');
const patientWelcome = document.getElementById('patient-welcome');
const logoutBtn = document.getElementById('logout-btn');

// ─── Auth Flow ───
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    authError.textContent = '';

    // Show loading state on button
    const btn = loginForm.querySelector('.auth-btn');
    const originalText = btn.textContent;
    btn.textContent = 'Signing in...';
    btn.disabled = true;

    try {
        await auth.signInWithEmailAndPassword(email, password);
    } catch (error) {
        console.error('Auth error:', error.code);
        if (error.code === 'auth/user-not-found' || error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            authError.textContent = currentLang === 'es'
                ? 'Correo o contraseña incorrectos.'
                : 'Invalid email or password.';
        } else if (error.code === 'auth/too-many-requests') {
            authError.textContent = currentLang === 'es'
                ? 'Demasiados intentos. Intente más tarde.'
                : 'Too many attempts. Please try again later.';
        } else {
            authError.textContent = currentLang === 'es'
                ? 'Error al iniciar sesión. Intente de nuevo.'
                : 'Login failed. Please try again.';
        }
        btn.textContent = originalText;
        btn.disabled = false;
    }
});

logoutBtn.addEventListener('click', () => auth.signOut());

// Auth state listener
auth.onAuthStateChanged(async (user) => {
    if (user) {
        authGate.style.display = 'none';
        portal.style.display = 'flex';
        if (!portalInitialized) {
            await loadPatientData();
            initPortal();
            portalInitialized = true;
        }
    } else {
        authGate.style.display = 'flex';
        portal.style.display = 'none';
        portalInitialized = false;
    }
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
        if (patientData?.patient) {
            patientWelcome.textContent = `Welcome back, ${patientData.patient.firstName}! 🕊️`;
        }

    } catch (error) {
        console.warn('PALOMA: Using fallback demo data', error);
        loadFallbackData();
    }
}

function loadFallbackData() {
    patientData = {
        patient: { firstName: 'Chris', lastName: 'Harrison', id: 'chris-harrison' },
        lastVisit: '2026-05-12',
        nextVisit: '2026-09-15',
        overallHealth: { gumHealth: 'good', cavityRisk: 'low', areasToMonitor: 1, urgentFindings: 0 }
    };

    dentalChart = {
        teeth: Array.from({ length: 32 }, (_, i) => {
            const num = i + 1;
            let status = 'healthy', color = 'green', findings = ['No findings'], notes = '';
            if (num === 14) { status = 'restored'; color = 'green'; findings = ['Crown placed 2026-03-15', 'AI: No recurrent decay']; notes = 'Porcelain crown, excellent margins'; }
            if (num === 19) { status = 'restored'; color = 'green'; findings = ['Composite filling', 'AI: Stable']; notes = 'Composite restoration'; }
            if (num === 30) { status = 'monitor'; color = 'yellow'; findings = ['AI: Early enamel demineralization detected', 'Recommend fluoride treatment']; notes = 'Watch area'; }
            if (num === 16) { status = 'extracted'; color = 'gray'; findings = ['Extracted — wisdom tooth']; notes = 'Extracted prior to becoming patient'; }
            return { toothNumber: num, name: getToothName(num), status, color, findings, lastAssessed: '2026-05-12', notes };
        })
    };

    treatmentPlan = {
        pending: [
            { procedure: 'Periodontal Maintenance', tooth: 'Full mouth', priority: 'routine', estimatedCost: 250, insuranceEstimate: 200, patientEstimate: 50, scheduledDate: '2026-09-15', notes: 'Routine 6-month cleaning' },
            { procedure: 'Crown Evaluation — Tooth #30', tooth: '#30', priority: 'moderate', estimatedCost: 1200, insuranceEstimate: 600, patientEstimate: 600, scheduledDate: 'TBD', notes: 'Monitor enamel demineralization. May need crown if progression continues.' },
        ]
    };

    timeline = {
        visits: [
            { date: '2026-01-15', type: 'Initial Exam', title: 'Comprehensive Exam & X-rays', description: 'Full mouth X-rays, comprehensive exam, treatment planning. AI scan identified enamel wear on #30.', status: 'completed' },
            { date: '2026-02-20', type: 'Restorative', title: 'Crown Prep — Tooth #14', description: 'Prepared tooth #14 for porcelain crown. Digital impression taken with Medit i-700.', status: 'completed' },
            { date: '2026-03-15', type: 'Restorative', title: 'Crown Seat — Tooth #14', description: 'Permanent porcelain crown cemented on #14. Perfect fit confirmed with digital scan.', status: 'completed' },
            { date: '2026-05-12', type: 'Preventive', title: 'Cleaning & AI Scan', description: 'Prophylaxis, full AI-powered X-ray analysis. Crown #14 looking excellent. Continued monitoring of #30.', status: 'completed' },
            { date: '2026-09-15', type: 'Preventive', title: 'Periodontal Maintenance', description: 'Scheduled routine cleaning and check-up.', status: 'upcoming' },
        ]
    };

    patientWelcome.textContent = 'Welcome back, Chris! 🕊️';
}

// ─── Initialize Portal ───
function initPortal() {
    initNavigation();
    init3DViewer();
    initHealthSummary();
    initTimeline();
    initCostCenter();
    initTreatmentPlan();
    initTimelineBar();
    initPortalChat();
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

    mouthViewer = new MouthViewer(container);
    mouthViewer.loadDemoModel(dentalChart);

    // Hide loading
    loading.style.display = 'none';

    // Tooth click handler
    mouthViewer.onToothClick = (toothData) => {
        showToothInfo(toothData);
    };

    // Reset view button
    document.getElementById('reset-view-btn').addEventListener('click', () => {
        mouthViewer.resetView();
    });

    // Close tooth info
    document.getElementById('tooth-info-close').addEventListener('click', () => {
        document.getElementById('tooth-info').style.display = 'none';
    });
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
            <h3 style="font-family:'Outfit',sans-serif;font-size:16px;margin-bottom:12px;">Dental Chart</h3>
            <p style="font-size:11px;color:var(--portal-muted);margin-bottom:12px;">Upper Arch (1-16)</p>
            <div class="dental-grid">
                ${upperTeeth.map(t => `
                    <div class="dental-grid__tooth ${t.color} ${t.status === 'extracted' ? 'extracted' : ''}"
                         title="#${t.toothNumber} — ${t.name}: ${t.status}"
                         data-tooth="${t.toothNumber}">
                        ${t.toothNumber}
                    </div>
                `).join('')}
            </div>
            <p style="font-size:11px;color:var(--portal-muted);margin:12px 0;">Lower Arch (32-17)</p>
            <div class="dental-grid">
                ${lowerTeeth.map(t => `
                    <div class="dental-grid__tooth ${t.color} ${t.status === 'extracted' ? 'extracted' : ''}"
                         title="#${t.toothNumber} — ${t.name}: ${t.status}"
                         data-tooth="${t.toothNumber}">
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
        `;
    }
}

// ─── Timeline ───
function initTimeline() {
    const container = document.getElementById('timeline-container');
    const visits = timeline?.visits || [];

    container.innerHTML = visits.map(v => `
        <div class="timeline-item ${v.status === 'upcoming' ? 'upcoming' : ''}">
            <div class="timeline-item__date">${formatDate(v.date)} • ${v.type}</div>
            <div class="timeline-item__title">${v.title}</div>
            <div class="timeline-item__desc">${v.description}</div>
        </div>
    `).join('');
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
                <div class="health-card__value">${'$'}${totalPatient.toLocaleString()}</div>
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
                <p><strong>Scheduled:</strong> ${p.scheduledDate || 'To be scheduled'}</p>
                ${p.notes ? `<p style="margin-top:8px">${p.notes}</p>` : ''}
            </div>
        </div>
    `).join('');
}

// ─── Bottom Timeline Bar ───
function initTimelineBar() {
    const container = document.getElementById('portal-timeline-bar');
    const visits = timeline?.visits || [];

    container.innerHTML = `
        <div class="timeline-bar-track">
            ${visits.map(v => `
                <div class="timeline-bar-dot ${v.status === 'upcoming' ? 'upcoming' : 'past'}" title="${v.title} — ${v.date}">
                    <span class="timeline-bar-dot__label">${v.date ? new Date(v.date + 'T00:00:00').toLocaleDateString('en-US', { month: 'short' }) : '?'}</span>
                </div>
            `).join('')}
        </div>
    `;
}

// ─── PALOMA Personal Chat ───
function initPortalChat() {
    const messagesEl = document.getElementById('portal-chat-messages');
    const inputEl = document.getElementById('portal-chat-input');
    const sendBtn = document.getElementById('portal-chat-send');
    const suggestionsEl = document.getElementById('portal-chat-suggestions');

    // Personal greeting
    const name = patientData?.patient?.firstName || 'there';
    const lastVisit = patientData?.lastVisit ? formatDate(patientData.lastVisit) : 'recently';
    const greeting = `Hi ${name}! 🕊️ I'm PALOMA, and I know your dental history here at Lake Jeanette.\n\nYour last visit was ${lastVisit}. Looking at your records, your overall dental health is looking **${patientData?.overallHealth?.gumHealth || 'good'}**${dentalChart?.teeth?.some(t => t.color === 'yellow') ? ', with 1 area we\'re monitoring.' : '.'}\n\nWhat would you like to know about your dental health?`;

    addChatMessage(messagesEl, greeting, 'bot');

    // Send
    const send = async () => {
        const text = inputEl.value.trim();
        if (!text) return;

        addChatMessage(messagesEl, text, 'user');
        inputEl.value = '';
        suggestionsEl.style.display = 'none';

        // Show typing
        const typing = document.createElement('div');
        typing.className = 'portal-msg portal-msg--bot';
        typing.style.opacity = '0.6';
        typing.textContent = 'PALOMA is thinking...';
        messagesEl.appendChild(typing);
        messagesEl.scrollTop = messagesEl.scrollHeight;

        try {
            // Build patient context for PALOMA
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

    // Suggestion chips
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
