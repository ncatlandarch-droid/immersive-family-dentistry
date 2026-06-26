// ═══ KPI Dashboard Module ═══
// Manages scorecards, benchmarks, and specialty-based metrics

const KPIDashboard = (function() {
  let benchmarks = null;
  let currentSpecialty = 'general';
  let financialData = null;

  async function init() {
    await loadSpecialty();
    await loadBenchmarks();
    renderScorecard();
    bindEvents();
  }

  function bindEvents() {
    const specialtySelect = document.getElementById('practice-specialty');
    if (specialtySelect) {
      specialtySelect.addEventListener('change', async (e) => {
        currentSpecialty = e.target.value;
        await loadBenchmarks();
        renderScorecard();
        saveSpecialty(currentSpecialty);
      });
    }
  }

  async function loadSpecialty() {
    try {
      const db = firebase.firestore();
      const doc = await db.collection('practice-config').doc('settings').get();
      if (doc.exists && doc.data().specialty) {
        currentSpecialty = doc.data().specialty;
        const select = document.getElementById('practice-specialty');
        if (select) select.value = currentSpecialty;
      }
    } catch (err) {
      console.warn('Could not load specialty setting:', err);
    }
  }

  async function saveSpecialty(specialty) {
    try {
      const db = firebase.firestore();
      await db.collection('practice-config').doc('settings').set(
        { specialty, updated_at: firebase.firestore.FieldValue.serverTimestamp() },
        { merge: true }
      );
    } catch (err) {
      console.warn('Could not save specialty:', err);
    }
  }

  async function loadBenchmarks() {
    try {
      // Try Firestore first (custom overrides)
      if (typeof getBenchmarks === 'function') {
        const custom = await getBenchmarks(currentSpecialty);
        if (custom) { benchmarks = custom; return; }
      }
      // Fallback to JSON file
      const response = await fetch('/data/kpi-benchmarks.json');
      const allBenchmarks = await response.json();
      benchmarks = allBenchmarks[currentSpecialty] || allBenchmarks['general'];
    } catch (err) {
      console.warn('Could not load benchmarks:', err);
      benchmarks = null;
    }
  }

  function renderScorecard() {
    const container = document.getElementById('kpi-scorecard-grid');
    if (!container || !benchmarks || !benchmarks.metrics) return;

    const metrics = benchmarks.metrics;
    
    container.innerHTML = Object.entries(metrics).map(([key, metric]) => {
      // For now, use the target as a "simulated actual" with some variance
      // In production, this would come from real PMS data
      const actual = getActualValue(key, metric);
      const target = metric.target;
      const status = getKPIStatus(actual, target, key);
      const trend = getTrend();
      
      return `
        <div class="kpi-card kpi-${status.level}">
          <div class="kpi-header">
            <span class="kpi-label">${metric.label}</span>
            <span class="kpi-source" title="Source: ${metric.source}">
              <i data-lucide="info" style="width:12px;height:12px"></i>
            </span>
          </div>
          <div class="kpi-value">
            ${formatMetricValue(actual, metric.unit)}
          </div>
          <div class="kpi-benchmark">
            <div class="kpi-progress-bar">
              <div class="kpi-progress-fill kpi-fill-${status.level}" style="width:${Math.min(status.percent, 100)}%"></div>
            </div>
            <div class="kpi-target-info">
              <span class="kpi-status-dot ${status.level}"></span>
              <span>Target: ${formatMetricValue(target, metric.unit)}</span>
              <span class="kpi-trend ${trend.dir}">${trend.icon} ${trend.value}</span>
            </div>
          </div>
          <div class="kpi-description">${metric.description}</div>
        </div>`;
    }).join('');

    // Specialty label
    const label = document.getElementById('kpi-specialty-label');
    if (label) label.textContent = benchmarks.label || currentSpecialty;

    if (typeof lucide !== 'undefined') lucide.createIcons();
  }

  // Simulate actual values (in production, from PMS/Firestore data)
  function getActualValue(key, metric) {
    // Check if we have real financial data loaded
    if (financialData && financialData[key]) {
      return financialData[key];
    }
    // Simulate around target with ±15% variance
    const variance = 0.85 + Math.random() * 0.30; // 85% to 115%
    let val = metric.target * variance;
    // Round appropriately
    if (metric.unit === '$') val = Math.round(val);
    else if (metric.unit === '%') val = Math.round(val * 10) / 10;
    else val = Math.round(val);
    return val;
  }

  function getKPIStatus(actual, target, key) {
    // For overhead, lower is better
    const lowerIsBetter = ['overhead_rate', 'retreatment_rate'];
    let percent;
    
    if (lowerIsBetter.includes(key)) {
      percent = (target / actual) * 100;
    } else {
      percent = (actual / target) * 100;
    }

    let level;
    if (percent >= 95) level = 'green';
    else if (percent >= 80) level = 'orange';
    else level = 'red';

    return { level, percent: Math.round(percent) };
  }

  function getTrend() {
    // Simulated trends (replace with real month-over-month data)
    const r = Math.random();
    if (r > 0.6) return { dir: 'up', icon: '↑', value: `+${(Math.random() * 5 + 1).toFixed(1)}%` };
    if (r > 0.3) return { dir: 'flat', icon: '→', value: '0.0%' };
    return { dir: 'down', icon: '↓', value: `-${(Math.random() * 3 + 0.5).toFixed(1)}%` };
  }

  function formatMetricValue(value, unit) {
    if (unit === '$') {
      if (value >= 1000) return '$' + (value / 1000).toFixed(value >= 10000 ? 0 : 1) + 'K';
      return '$' + value.toLocaleString();
    }
    if (unit === '%') return value + '%';
    return value.toString();
  }

  function setFinancialData(data) {
    financialData = data;
    renderScorecard();
  }

  function getSpecialty() {
    return currentSpecialty;
  }

  return {
    init,
    loadBenchmarks,
    renderScorecard,
    setFinancialData,
    getSpecialty
  };
})();
