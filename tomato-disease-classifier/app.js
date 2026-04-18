/* ================================================================
   TOMATO DISEASE CLASSIFIER — APP.JS
   Simulates AI diagnosis with a rich dataset of tomato diseases.
   In production, replace simulateDetection() with a real API call.
   ================================================================ */

'use strict';

// ── DISEASE DATABASE ──────────────────────────────────────────────
const DISEASES = [
  {
    id: 'bacterial_spot',
    name: 'Bacterial Spot',
    pathogen: 'Xanthomonas campestris pv. vesicatoria',
    severity: 3,
    isHealthy: false,
    treatment: [
      'Remove and destroy infected plant debris immediately.',
      'Apply copper-based bactericide (e.g., Kocide 3000) at 7-day intervals.',
      'Avoid overhead irrigation — switch to drip irrigation.',
      'Rotate crops for at least 2 seasons.',
      'Use certified disease-free seed for next planting.',
    ],
  },
  {
    id: 'early_blight',
    name: 'Early Blight',
    pathogen: 'Alternaria solani',
    severity: 2,
    isHealthy: false,
    treatment: [
      'Apply chlorothalonil or mancozeb fungicide preventively.',
      'Remove lower leaves showing symptoms.',
      'Improve air circulation by staking and pruning.',
      'Avoid wetting foliage when watering.',
      'Mulch around plants to prevent spore splash.',
    ],
  },
  {
    id: 'late_blight',
    name: 'Late Blight',
    pathogen: 'Phytophthora infestans',
    severity: 4,
    isHealthy: false,
    treatment: [
      'URGENT: Remove and bag all infected plant material immediately.',
      'Apply metalaxyl-M + mancozeb (Ridomil Gold MZ) at once.',
      'Monitor daily — disease spreads rapidly in cool, wet conditions.',
      'Alert neighboring farms to check their crops.',
      'Do NOT compost infected material.',
    ],
  },
  {
    id: 'leaf_mold',
    name: 'Leaf Mold',
    pathogen: 'Fulvia fulva (syn. Cladosporium fulvum)',
    severity: 2,
    isHealthy: false,
    treatment: [
      'Reduce greenhouse humidity below 85%.',
      'Apply chlorothalonil or mancozeb every 10 days.',
      'Prune infected leaves and destroy them.',
      'Improve ventilation and plant spacing.',
      'Plant resistant varieties in subsequent seasons.',
    ],
  },
  {
    id: 'septoria_leaf_spot',
    name: 'Septoria Leaf Spot',
    pathogen: 'Septoria lycopersici',
    severity: 2,
    isHealthy: false,
    treatment: [
      'Apply mancozeb or chlorothalonil at first sign of disease.',
      'Remove infected lower leaves weekly.',
      'Avoid working with plants when wet.',
      'Apply organic mulch to reduce soil splash.',
      'Practice 2–3 year crop rotation.',
    ],
  },
  {
    id: 'spider_mites',
    name: 'Spider Mite Damage',
    pathogen: 'Tetranychus urticae (Two-spotted Spider Mite)',
    severity: 2,
    isHealthy: false,
    treatment: [
      'Apply insecticidal soap or neem oil spray to both sides of leaves.',
      'Introduce predatory mites (Phytoseiulus persimilis) as biocontrol.',
      'Increase ambient humidity — spider mites thrive in dry conditions.',
      'Rinse plants with strong water spray to knock off mites.',
      'Avoid excessive nitrogen fertilization.',
    ],
  },
  {
    id: 'target_spot',
    name: 'Target Spot',
    pathogen: 'Corynespora cassiicola',
    severity: 2,
    isHealthy: false,
    treatment: [
      'Apply flutriafol or azoxystrobin-based fungicide.',
      'Remove and destroy infected leaves.',
      'Improve plant spacing for air circulation.',
      'Avoid heavy dew or prolonged leaf wetness.',
    ],
  },
  {
    id: 'yellow_leaf_curl',
    name: 'Yellow Leaf Curl Virus',
    pathogen: 'Tomato Yellow Leaf Curl Virus (TYLCV) via Bemisia tabaci',
    severity: 3,
    isHealthy: false,
    treatment: [
      'Remove and destroy all infected plants immediately (no cure).',
      'Control whitefly vectors with imidacloprid or thiamethoxam.',
      'Use reflective mulch to repel whiteflies.',
      'Plant resistant varieties (e.g., TY-1, TY-3 gene cultivars).',
      'Install insect-proof mesh on greenhouse vents.',
    ],
  },
  {
    id: 'mosaic_virus',
    name: 'Tomato Mosaic Virus',
    pathogen: 'Tomato Mosaic Virus (ToMV)',
    severity: 3,
    isHealthy: false,
    treatment: [
      'Remove all infected plants — there is no chemical cure.',
      'Disinfect tools with 10% bleach solution between plants.',
      'Avoid tobacco use near plants (TMV cross-infection risk).',
      'Wash hands thoroughly before handling seedlings.',
      'Use ToMV-resistant varieties in next season.',
    ],
  },
  {
    id: 'healthy',
    name: 'Healthy Leaf',
    pathogen: 'No pathogen detected',
    severity: 0,
    isHealthy: true,
    treatment: [
      'Maintain consistent watering schedule.',
      'Apply a balanced slow-release fertilizer monthly.',
      'Monitor weekly for early signs of disease.',
      'Ensure adequate spacing for airflow.',
    ],
  },
];

const SEVERITY_LABELS = ['', 'Low', 'Moderate', 'High', 'Critical'];

// ── STATE ──────────────────────────────────────────────────────────
let currentFile = null;
let history = JSON.parse(localStorage.getItem('agrAI_history') || '[]');

// ── DOM REFS ───────────────────────────────────────────────────────
const dropZone      = document.getElementById('drop-zone');
const fileInput     = document.getElementById('file-input');
const dzIdle        = document.getElementById('dz-idle');
const dzPreview     = document.getElementById('dz-preview');
const previewImg    = document.getElementById('preview-img');
const btnRemove     = document.getElementById('btn-remove');
const btnDetect     = document.getElementById('btn-detect');
const actionNote    = document.getElementById('action-note');
const analysingState= document.getElementById('analysing-state');
const pulseFill     = document.getElementById('pulse-fill');
const resultSection = document.getElementById('result-section');
const btnNewScan    = document.getElementById('btn-new-scan');
const btnSave       = document.getElementById('btn-save');
const historyGrid   = document.getElementById('history-grid');
const historyEmpty  = document.getElementById('history-empty');
const btnConsult    = document.getElementById('btn-consult');

// Result DOM
const resultTitle     = document.getElementById('result-title');
const resultIcon      = document.getElementById('result-icon');
const resultImg       = document.getElementById('result-img');
const resultBbox      = document.getElementById('result-bbox');
const resultBadge     = document.getElementById('result-badge');
const badgeIcon       = document.getElementById('badge-icon');
const badgeText       = document.getElementById('badge-text');
const confidenceBar   = document.getElementById('confidence-bar');
const confidenceVal   = document.getElementById('confidence-val');
const pathogenText    = document.getElementById('pathogen-text');
const severityDots    = document.getElementById('severity-dots');
const treatmentList   = document.getElementById('treatment-list');

// Analytics DOM
const analyticsTotal   = document.getElementById('analytics-total-val');
const analyticsHealthy = document.getElementById('analytics-healthy-val');
const analyticsDisease = document.getElementById('analytics-disease-val');
const analyticsRate    = document.getElementById('analytics-rate-val');
const breakdownBars    = document.getElementById('breakdown-bars');

// ── DRAG & DROP ────────────────────────────────────────────────────
dropZone.addEventListener('click', () => !dzPreview.classList.contains('hidden') || fileInput.click());
dropZone.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') fileInput.click(); });

fileInput.addEventListener('change', () => {
  if (fileInput.files.length) loadFile(fileInput.files[0]);
});

dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', ()=> dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', e => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  const file = e.dataTransfer.files[0];
  if (file && file.type.startsWith('image/')) loadFile(file);
});

btnRemove.addEventListener('click', e => { e.stopPropagation(); clearUpload(); });

function loadFile(file) {
  if (file.size > 10 * 1024 * 1024) { alert('File is too large. Please use an image under 10 MB.'); return; }
  currentFile = file;
  const url = URL.createObjectURL(file);
  previewImg.src = url;
  dzIdle.classList.add('hidden');
  dzPreview.classList.remove('hidden');
  btnDetect.disabled = false;
  actionNote.textContent = file.name;
  resultSection.classList.add('hidden');
}

function clearUpload() {
  currentFile = null;
  fileInput.value = '';
  previewImg.src = '';
  dzIdle.classList.remove('hidden');
  dzPreview.classList.add('hidden');
  btnDetect.disabled = true;
  actionNote.textContent = 'Upload an image to begin analysis';
  resultSection.classList.add('hidden');
  analysingState.classList.add('hidden');
}

// ── DETECT ─────────────────────────────────────────────────────────
btnDetect.addEventListener('click', startDetection);

function startDetection() {
  if (!currentFile) return;
  btnDetect.disabled = true;
  analysingState.classList.remove('hidden');
  pulseFill.style.animation = 'none';
  void pulseFill.offsetWidth; // reflow
  pulseFill.style.animation = '';

  setTimeout(() => {
    analysingState.classList.add('hidden');
    const disease = simulateDetection();
    const confidence = randomBetween(82, 99);
    showResult(disease, confidence);
  }, 2800);
}

function simulateDetection() {
  // Weighted random: healthy is more common than each disease
  const weights = DISEASES.map(d => d.isHealthy ? 3 : 1);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < DISEASES.length; i++) {
    r -= weights[i];
    if (r <= 0) return DISEASES[i];
  }
  return DISEASES[DISEASES.length - 1];
}

function randomBetween(min, max) {
  return Math.round(Math.random() * (max - min) + min);
}

// ── SHOW RESULT ────────────────────────────────────────────────────
function showResult(disease, confidence) {
  // Header
  resultTitle.textContent = disease.name;
  resultTitle.className = 'result-title' + (disease.isHealthy ? '' : ' is-disease');
  resultIcon.textContent = disease.isHealthy ? 'eco' : 'biotech';
  resultIcon.style.color = disease.isHealthy ? 'var(--primary)' : 'var(--tertiary)';

  // Image
  resultImg.src = previewImg.src;

  // Bounding box (only for diseases)
  if (!disease.isHealthy) {
    resultBbox.removeAttribute('hidden');
    resultBbox.style.top    = randomBetween(10, 30) + '%';
    resultBbox.style.left   = randomBetween(15, 35) + '%';
    resultBbox.style.width  = randomBetween(30, 50) + '%';
    resultBbox.style.height = randomBetween(25, 45) + '%';
  } else {
    resultBbox.setAttribute('hidden', '');
  }

  // Badge
  badgeText.textContent = disease.isHealthy ? 'Healthy' : disease.name;
  badgeIcon.textContent = disease.isHealthy ? 'eco' : 'warning';
  resultBadge.className = 'result-image-badge' + (disease.isHealthy ? '' : ' is-disease');

  // Confidence
  setTimeout(() => {
    confidenceBar.style.width = confidence + '%';
  }, 200);
  confidenceVal.textContent = confidence + '%';

  // Pathogen
  pathogenText.textContent = disease.pathogen;

  // Severity dots
  renderSeverityDots(disease.severity);

  // Treatment
  treatmentList.innerHTML = disease.treatment
    .map(t => `<li>${t}</li>`)
    .join('');

  // Show
  resultSection.classList.remove('hidden');
  resultSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Stash info for save
  btnSave._disease = disease;
  btnSave._confidence = confidence;
  btnSave._imgUrl = previewImg.src;
  btnSave.disabled = false;
  btnSave.textContent = '';
  btnSave.innerHTML = '<span class="material-icons-round">bookmark_add</span> Save to History';
}

function renderSeverityDots(severity) {
  severityDots.innerHTML = '';
  const colors = ['active-low', 'active-medium', 'active-high', 'active-critical'];
  for (let i = 0; i < 4; i++) {
    const dot = document.createElement('div');
    dot.className = 'severity-dot';
    if (i < severity) dot.classList.add(colors[i]);
    const label = SEVERITY_LABELS[i + 1] || 'Critical';
    dot.setAttribute('title', label);
    severityDots.appendChild(dot);
  }
}

// ── SAVE TO HISTORY ────────────────────────────────────────────────
btnSave.addEventListener('click', () => {
  const disease    = btnSave._disease;
  const confidence = btnSave._confidence;
  const imgUrl     = btnSave._imgUrl;
  if (!disease) return;

  const record = {
    id: Date.now(),
    disease: disease.name,
    isHealthy: disease.isHealthy,
    confidence,
    imgUrl,
    date: new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }),
  };

  history.unshift(record);
  // Keep only the last 50
  history = history.slice(0, 50);
  localStorage.setItem('agrAI_history', JSON.stringify(history.map(r => ({ ...r, imgUrl: '' }))));

  renderHistory();
  updateAnalytics();

  btnSave.innerHTML = '<span class="material-icons-round">check</span> Saved!';
  btnSave.disabled = true;
});

// ── NEW SCAN ───────────────────────────────────────────────────────
btnNewScan.addEventListener('click', () => {
  clearUpload();
  document.getElementById('upload-section').scrollIntoView({ behavior: 'smooth' });
});

// ── HISTORY RENDER ─────────────────────────────────────────────────
function renderHistory() {
  if (history.length === 0) {
    historyEmpty.style.display = 'flex';
    // Remove any existing cards
    Array.from(historyGrid.querySelectorAll('.history-card')).forEach(c => c.remove());
    return;
  }

  historyEmpty.style.display = 'none';
  Array.from(historyGrid.querySelectorAll('.history-card')).forEach(c => c.remove());

  history.forEach(record => {
    const card = document.createElement('div');
    card.className = 'history-card';
    card.setAttribute('role', 'article');
    card.setAttribute('aria-label', `${record.disease}, ${record.confidence}% confidence`);
    card.innerHTML = `
      <div class="hc-image" style="background: var(--surface-container); display:flex; align-items:center; justify-content:center; font-size:3rem;">
        ${record.isHealthy ? '🌿' : '🍅'}
      </div>
      <div class="hc-body">
        <p class="hc-disease ${record.isHealthy ? 'is-healthy' : 'is-disease'}">${record.disease}</p>
        <div class="hc-meta">
          <span>${record.date}</span>
          <span class="hc-confidence">${record.confidence}%</span>
        </div>
      </div>
    `;
    historyGrid.appendChild(card);
  });
}

// ── ANALYTICS ─────────────────────────────────────────────────────
function updateAnalytics() {
  const total   = history.length;
  const healthy = history.filter(r => r.isHealthy).length;
  const disease = total - healthy;
  const rate    = total > 0 ? Math.round((healthy / total) * 100) : null;

  analyticsTotal.textContent   = total;
  analyticsHealthy.textContent = healthy;
  analyticsDisease.textContent = disease;
  analyticsRate.textContent    = rate !== null ? rate + '%' : '—';

  // Breakdown
  const counts = {};
  history.forEach(r => { counts[r.disease] = (counts[r.disease] || 0) + 1; });
  const sorted = Object.entries(counts).sort((a, b) => b[1] - a[1]);

  if (sorted.length === 0) {
    breakdownBars.innerHTML = '<p class="breakdown-empty">No data yet.</p>';
    return;
  }

  const maxCount = sorted[0][1];
  breakdownBars.innerHTML = sorted.map(([name, count]) => {
    const pct = Math.round((count / maxCount) * 100);
    const isDisease = !DISEASES.find(d => d.name === name)?.isHealthy;
    return `
      <div class="breakdown-row">
        <span class="breakdown-name">${name}</span>
        <div class="breakdown-track">
          <div class="breakdown-fill ${isDisease ? 'is-disease' : ''}" style="width:${pct}%"></div>
        </div>
        <span class="breakdown-count">${count}</span>
      </div>
    `;
  }).join('');
}

// ── NAV ACTIVE STATE ────────────────────────────────────────────────
const navLinks = document.querySelectorAll('.nav-link');
const sections = ['upload-section', 'history-section', 'analytics-section', 'consult-section'];
const navIds   = ['nav-scan', 'nav-gallery', 'nav-analytics', 'nav-consult'];

function updateNav() {
  let active = 0;
  sections.forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top <= 100) active = i;
  });
  navIds.forEach((id, i) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('active', i === active);
  });
}

window.addEventListener('scroll', updateNav, { passive: true });

// ── CONSULT ─────────────────────────────────────────────────────────
if (btnConsult) {
  btnConsult.addEventListener('click', () => {
    alert('🌿 Expert consultation booking coming soon!\n\nYou would be connected with Dr. Amara Singh or another certified agronomist within 24 hours.');
  });
}

// ── HERO LEAF FALLBACK ───────────────────────────────────────────────
// If the image file doesn't exist, show a CSS leaf placeholder
const heroLeaf = document.getElementById('hero-leaf-img');
if (heroLeaf) {
  heroLeaf.addEventListener('error', () => {
    const visual = heroLeaf.parentElement;
    heroLeaf.remove();
    const emoji = document.createElement('div');
    emoji.textContent = '🍅';
    emoji.style.cssText = 'font-size:8rem; position:relative; z-index:2; animation: float 6s ease-in-out infinite; filter:drop-shadow(0 20px 40px rgba(0,69,13,0.2))';
    visual.appendChild(emoji);
  });
}

// ── INIT ─────────────────────────────────────────────────────────────
renderHistory();
updateAnalytics();
