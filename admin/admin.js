/* ═══════════════════════════════════════════════════════════
   Admin Dashboard — JavaScript
   Chart.js KPIs, financial data, PALOMA analytics,
   schedule, and practice data editor.
   ═══════════════════════════════════════════════════════════ */

// ─── Demo Mode — No Firebase Auth Required ───
// Firebase auth is ready to enable when Dr. Brenes provides real credentials.
// For now, click "Sign In" to enter the dashboard directly.

// ─── State ───
let financialData = null;
let siteConfig = null;
let integrationMap = null;

// ─── DOM ───
const authGate = document.getElementById('auth-gate');
const dashboard = document.getElementById('dashboard');
const loginForm = document.getElementById('login-form');

// ─── Simple Demo Auth ───
loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    authGate.style.display = 'none';
    dashboard.style.display = 'flex';
    initDashboard();
});

document.getElementById('logout-btn').addEventListener('click', () => {
    dashboard.style.display = 'none';
    authGate.style.display = 'flex';
});

// ─── Init ───
async function initDashboard() {
    document.getElementById('current-date').textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });
    document.getElementById('schedule-date').textContent = new Date().toLocaleDateString('en-US', {
        weekday: 'long', month: 'long', day: 'numeric', year: 'numeric'
    });

    await loadData();
    initNavigation();
    renderOverview();
    renderProduction();
    renderPalomaAnalytics();
    renderSchedule();
    initDataEditor();
    initSettings();
}

// ─── Load Data ───
async function loadData() {
    try {
        const [finRes, configRes, intRes] = await Promise.all([
            fetch('/data/financial-summary.json').then(r => r.ok ? r.json() : null),
            fetch('/data/site-config.json').then(r => r.ok ? r.json() : null),
            fetch('/data/integration-map.json').then(r => r.ok ? r.json() : null),
        ]);
        financialData = finRes;
        siteConfig = configRes;
        integrationMap = intRes;
    } catch (e) {
        console.warn('Admin: Using fallback data');
        financialData = generateFallbackFinancials();
    }

    if (!financialData) financialData = generateFallbackFinancials();
}

function generateFallbackFinancials() {
    const months = ['Jul 2025','Aug 2025','Sep 2025','Oct 2025','Nov 2025','Dec 2025',
                    'Jan 2026','Feb 2026','Mar 2026','Apr 2026','May 2026','Jun 2026'];
    return {
        monthly: months.map((m, i) => ({
            month: m,
            production: 85000 + Math.floor(Math.random() * 35000),
            collections: 78000 + Math.floor(Math.random() * 30000),
            collectionRate: 91 + Math.floor(Math.random() * 6),
            newPatients: 12 + Math.floor(Math.random() * 10),
            caseAcceptanceRate: 65 + Math.floor(Math.random() * 20),
            recallRate: 75 + Math.floor(Math.random() * 15),
            avgProductionPerPatient: 280 + Math.floor(Math.random() * 120),
        }))
    };
}

// ─── Navigation ───
function initNavigation() {
    document.querySelectorAll('.sidebar-item').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.sidebar-item').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const view = btn.dataset.view;
            document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
            document.getElementById(`view-${view}`).classList.add('active');
            document.getElementById('page-title').textContent = btn.textContent.trim();
        });
    });

    // Mobile sidebar toggle
    const sidebar = document.getElementById('sidebar');
    document.getElementById('sidebar-toggle').addEventListener('click', () => {
        sidebar.classList.toggle('open');
    });
}

// ─── Overview ───
function renderOverview() {
    const data = financialData.monthly;
    const latest = data[data.length - 1];
    const prev = data[data.length - 2];

    // KPI Cards
    const kpis = [
        { icon: '💰', label: 'Monthly Production', value: `$${(latest.production / 1000).toFixed(0)}K`,
          trend: calcTrend(latest.production, prev.production) },
        { icon: '📈', label: 'Collections', value: `$${(latest.collections / 1000).toFixed(0)}K`,
          trend: calcTrend(latest.collections, prev.collections) },
        { icon: '📊', label: 'Collection Rate', value: `${latest.collectionRate}%`,
          trend: calcTrend(latest.collectionRate, prev.collectionRate) },
        { icon: '👥', label: 'New Patients', value: latest.newPatients,
          trend: calcTrend(latest.newPatients, prev.newPatients) },
        { icon: '✅', label: 'Case Acceptance', value: `${latest.caseAcceptanceRate}%`,
          trend: calcTrend(latest.caseAcceptanceRate, prev.caseAcceptanceRate) },
        { icon: '🔄', label: 'Recall Rate', value: `${latest.recallRate}%`,
          trend: calcTrend(latest.recallRate, prev.recallRate) },
    ];

    document.getElementById('kpi-row').innerHTML = kpis.map(k => `
        <div class="kpi-card">
            <div class="kpi-card__icon">${k.icon}</div>
            <div class="kpi-card__label">${k.label}</div>
            <div class="kpi-card__value">${k.value}</div>
            <div class="kpi-card__trend ${k.trend >= 0 ? 'up' : 'down'}">${k.trend >= 0 ? '↑' : '↓'} ${Math.abs(k.trend)}% vs last month</div>
        </div>
    `).join('');

    // Charts
    const labels = data.slice(-6).map(d => d.month.split(' ')[0]);
    const tealRGB = '13, 79, 79';
    const goldRGB = '196, 163, 90';

    // Production Chart
    new Chart(document.getElementById('chart-production'), {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'Production',
                data: data.slice(-6).map(d => d.production),
                backgroundColor: `rgba(${tealRGB}, 0.7)`,
                borderRadius: 6,
            }, {
                label: 'Collections',
                data: data.slice(-6).map(d => d.collections),
                backgroundColor: `rgba(${goldRGB}, 0.7)`,
                borderRadius: 6,
            }]
        },
        options: chartOptions('$')
    });

    // Collection Rate Chart
    new Chart(document.getElementById('chart-collections'), {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Collection Rate %',
                data: data.slice(-6).map(d => d.collectionRate),
                borderColor: `rgb(${tealRGB})`,
                backgroundColor: `rgba(${tealRGB}, 0.1)`,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointBackgroundColor: `rgb(${tealRGB})`,
            }]
        },
        options: chartOptions('%', 80, 100)
    });

    // New Patients Chart
    new Chart(document.getElementById('chart-patients'), {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'New Patients',
                data: data.slice(-6).map(d => d.newPatients),
                backgroundColor: `rgba(74, 127, 181, 0.7)`,
                borderRadius: 6,
            }]
        },
        options: chartOptions('')
    });

    // Case Acceptance Chart
    new Chart(document.getElementById('chart-acceptance'), {
        type: 'line',
        data: {
            labels,
            datasets: [{
                label: 'Acceptance Rate %',
                data: data.slice(-6).map(d => d.caseAcceptanceRate),
                borderColor: `rgb(${goldRGB})`,
                backgroundColor: `rgba(${goldRGB}, 0.1)`,
                fill: true,
                tension: 0.4,
                pointRadius: 5,
                pointBackgroundColor: `rgb(${goldRGB})`,
            }]
        },
        options: chartOptions('%', 50, 100)
    });

    // Quick Stats
    const totalProduction = data.reduce((sum, d) => sum + d.production, 0);
    const totalPatients = data.reduce((sum, d) => sum + d.newPatients, 0);
    const avgAcceptance = Math.round(data.reduce((sum, d) => sum + d.caseAcceptanceRate, 0) / data.length);

    document.getElementById('stats-grid').innerHTML = `
        <div class="stat-card"><div class="stat-card__icon">🏆</div><div><div class="stat-card__label">Annual Production</div><div class="stat-card__value">$${(totalProduction / 1000).toFixed(0)}K</div></div></div>
        <div class="stat-card"><div class="stat-card__icon">👥</div><div><div class="stat-card__label">Total New Patients (12mo)</div><div class="stat-card__value">${totalPatients}</div></div></div>
        <div class="stat-card"><div class="stat-card__icon">📊</div><div><div class="stat-card__label">Avg Case Acceptance</div><div class="stat-card__value">${avgAcceptance}%</div></div></div>
        <div class="stat-card"><div class="stat-card__icon">🦷</div><div><div class="stat-card__label">Avg Production/Patient</div><div class="stat-card__value">$${latest.avgProductionPerPatient}</div></div></div>
    `;
}

function chartOptions(prefix = '', sugMin, sugMax) {
    return {
        responsive: true,
        maintainAspectRatio: true,
        plugins: { legend: { position: 'bottom', labels: { usePointStyle: true, padding: 16, font: { size: 12 } } } },
        scales: {
            y: {
                beginAtZero: prefix !== '%',
                suggestedMin: sugMin,
                suggestedMax: sugMax,
                ticks: {
                    callback: (v) => prefix === '$' ? `$${(v/1000).toFixed(0)}K` : prefix === '%' ? `${v}%` : v,
                    font: { size: 11 }
                },
                grid: { color: 'rgba(0,0,0,0.04)' }
            },
            x: { ticks: { font: { size: 11 } }, grid: { display: false } }
        }
    };
}

function calcTrend(current, previous) {
    if (!previous) return 0;
    return Math.round(((current - previous) / previous) * 100);
}

// ─── Production Table ───
function renderProduction() {
    const tbody = document.getElementById('production-tbody');
    const data = financialData.monthly;

    tbody.innerHTML = data.map(d => `
        <tr>
            <td><strong>${d.month}</strong></td>
            <td>$${d.production.toLocaleString()}</td>
            <td>$${d.collections.toLocaleString()}</td>
            <td><span class="badge ${d.collectionRate >= 95 ? 'badge-green' : d.collectionRate >= 90 ? 'badge-amber' : 'badge-red'}">${d.collectionRate}%</span></td>
            <td>${d.newPatients}</td>
            <td>${d.caseAcceptanceRate}%</td>
            <td>$${d.avgProductionPerPatient}</td>
        </tr>
    `).join('');
}

// ─── PALOMA Analytics ───
function renderPalomaAnalytics() {
    // Demo KPIs
    const palomaKPIs = [
        { icon: '💬', label: 'Total Conversations', value: '347' },
        { icon: '🌐', label: 'Spanish Sessions', value: '38%' },
        { icon: '📅', label: 'Booking Referrals', value: '62' },
        { icon: '⭐', label: 'Satisfaction', value: '4.8/5' },
    ];

    document.getElementById('paloma-kpis').innerHTML = palomaKPIs.map(k => `
        <div class="kpi-card">
            <div class="kpi-card__icon">${k.icon}</div>
            <div class="kpi-card__label">${k.label}</div>
            <div class="kpi-card__value">${k.value}</div>
        </div>
    `).join('');

    // Language chart
    new Chart(document.getElementById('chart-paloma-lang'), {
        type: 'doughnut',
        data: {
            labels: ['English', 'Spanish'],
            datasets: [{
                data: [62, 38],
                backgroundColor: ['rgba(13,79,79,0.8)', 'rgba(196,163,90,0.8)'],
                borderWidth: 0,
                borderRadius: 4,
            }]
        },
        options: { responsive: true, plugins: { legend: { position: 'bottom' } } }
    });

    // Topics chart
    new Chart(document.getElementById('chart-paloma-topics'), {
        type: 'bar',
        data: {
            labels: ['Services', 'Insurance', 'Booking', 'Post-Op', 'Emergency', 'Technology'],
            datasets: [{
                label: 'Questions',
                data: [89, 72, 62, 45, 31, 48],
                backgroundColor: 'rgba(13,79,79,0.7)',
                borderRadius: 6,
            }]
        },
        options: { responsive: true, indexAxis: 'y', plugins: { legend: { display: false } },
            scales: { x: { grid: { display: false } }, y: { grid: { display: false } } } }
    });
}

// ─── Schedule ───
function renderSchedule() {
    const slots = [
        { time: '8:00 AM', patient: 'Johnson, Maria', procedure: 'Cleaning & Exam', status: 'badge-green', statusText: 'Confirmed' },
        { time: '9:00 AM', patient: 'Williams, James', procedure: 'Crown Prep #14', status: 'badge-green', statusText: 'Confirmed' },
        { time: '10:30 AM', patient: 'Harrison, Chris', procedure: 'AI Scan Review', status: 'badge-amber', statusText: 'Pending' },
        { time: '11:30 AM', patient: 'Rodriguez, Ana', procedure: 'Implant Consult (ES)', status: 'badge-green', statusText: 'Confirmed' },
        { time: '1:00 PM', patient: 'Thompson, David', procedure: 'Root Canal #19', status: 'badge-green', statusText: 'Confirmed' },
        { time: '2:30 PM', patient: 'Chen, Lisa', procedure: 'Veneer Delivery', status: 'badge-amber', statusText: 'Pending' },
        { time: '3:30 PM', patient: '— Open Slot —', procedure: '', status: '', statusText: '' },
    ];

    document.getElementById('schedule-grid').innerHTML = slots.map(s => `
        <div class="schedule-slot">
            <div class="schedule-slot__time">${s.time}</div>
            <div>
                <div class="schedule-slot__patient">${s.patient}</div>
                <div class="schedule-slot__procedure">${s.procedure}</div>
            </div>
            ${s.statusText ? `<div class="schedule-slot__status"><span class="badge ${s.status}">${s.statusText}</span></div>` : ''}
        </div>
    `).join('');
}

// ─── Data Editor ───
function initDataEditor() {
    const textarea = document.getElementById('data-editor-textarea');
    const status = document.getElementById('editor-status');
    let currentFile = 'site-config';

    async function loadFile(filename) {
        try {
            const res = await fetch(`/data/${filename}.json`);
            if (res.ok) {
                const data = await res.json();
                textarea.value = JSON.stringify(data, null, 2);
            } else {
                textarea.value = `// File not found: /data/${filename}.json\n// Create this file to populate data.`;
            }
        } catch (e) {
            textarea.value = `// Error loading /data/${filename}.json\n// ${e.message}`;
        }
        status.textContent = '';
        currentFile = filename;
    }

    // Tab clicks
    document.querySelectorAll('.editor-tab').forEach(tab => {
        tab.addEventListener('click', () => {
            document.querySelectorAll('.editor-tab').forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            loadFile(tab.dataset.file);
        });
    });

    // Save
    document.getElementById('editor-save').addEventListener('click', () => {
        try {
            JSON.parse(textarea.value);
            status.textContent = '✓ Valid JSON — In production, this would save to the server.';
            status.style.color = 'var(--admin-green)';
        } catch (e) {
            status.textContent = `✗ Invalid JSON: ${e.message}`;
            status.style.color = 'var(--admin-red)';
        }
    });

    // Reset
    document.getElementById('editor-reset').addEventListener('click', () => loadFile(currentFile));

    // Load initial file
    loadFile('site-config');
}

// ─── Settings ───
function initSettings() {
    const integrationEl = document.getElementById('integration-status');
    if (integrationMap?.systems) {
        integrationEl.innerHTML = integrationMap.systems.map(sys => `
            <div class="setting-row">
                <label>${sys.name}</label>
                <span class="badge ${sys.status === 'connected' ? 'badge-green' : sys.status === 'planned' ? 'badge-amber' : 'badge-red'}">
                    ${sys.status || 'Not Connected'}
                </span>
            </div>
        `).join('');
    } else {
        const systems = ['Medit Link', 'Dentrix', 'Pearl AI', 'SprintRay', 'Exocad', 'Google Calendar'];
        integrationEl.innerHTML = systems.map(name => `
            <div class="setting-row">
                <label>${name}</label>
                <span class="badge badge-amber">Planned</span>
            </div>
        `).join('');
    }
}
