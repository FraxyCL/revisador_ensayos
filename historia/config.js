// ═══════════════════════════════════════════════════════════
//  config.js  —  Gestión de configuración del ensayo
// ═══════════════════════════════════════════════════════════

const SKILLS = ['Sin asignar', 'Pensamiento temporal y espacial', 'Análisis de fuente de información', 'Pensamiento critico'];
const UNITS  = ['Sin asignar', 'Historia: Mundo, América y Chile', 'Formación ciudadana', 'Sistema Económico'];
const ANSWERS = ['A', 'B', 'C', 'D', 'E'];

// Estado global de configuración
let appConfig = {
  numQuestions: 65,
  questions: []   // [{answer, pilot, skill, unit}]
};

// ─── Inicialización ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadConfig();       // intenta cargar desde localStorage
  renderConfigTable();
});

function setNumQuestions(n) {
  n = Math.max(1, Math.min(200, parseInt(n) || 65));
  appConfig.numQuestions = n;

  // Sync input field
  const inp = document.getElementById('num-q-input');
  if (inp) inp.value = n;

  // Highlight preset button if matches
  document.querySelectorAll('.preset-btn').forEach(b => {
    b.classList.toggle('active', parseInt(b.textContent) === n);
  });

  // Adjust questions array
  while (appConfig.questions.length < n) {
    appConfig.questions.push({ answer: 'A', pilot: false, skill: 0, unit: 0 });
  }
  appConfig.questions = appConfig.questions.slice(0, n);
  renderConfigTable();
}

function applyPreset(n) {
  const inp = document.getElementById('num-q-input');
  if (inp) inp.value = n;
  setNumQuestions(n);
}

// ─── Renderizar tabla de configuración ───────────────────
function renderConfigTable() {
  const tbody = document.getElementById('config-body');
  tbody.innerHTML = '';
  const n = appConfig.numQuestions;

  for (let i = 0; i < n; i++) {
    const q = appConfig.questions[i] || { answer: 'A', pilot: false, skill: 0, unit: 0 };
    appConfig.questions[i] = q;

    const tr = document.createElement('tr');
    if (q.pilot) tr.classList.add('pilot-row');

    tr.innerHTML = `
      <td class="q-num">${i + 1}</td>
      <td>
        <div class="answer-toggle">
          ${ANSWERS.map(a => `
            <button class="ans-btn ${q.answer === a ? 'selected' : ''}"
                    data-q="${i}" data-a="${a}"
                    onclick="setAnswer(${i},'${a}')">
              ${a}
            </button>`).join('')}
        </div>
      </td>
      <td class="center-cell">
        <label class="pilot-toggle">
          <input type="checkbox" ${q.pilot ? 'checked' : ''}
                 onchange="setPilot(${i}, this.checked)" />
          <span class="pilot-slider"></span>
        </label>
      </td>
      <td>
        <select class="mini-select" onchange="setSkill(${i}, this.value)">
          ${SKILLS.map((s, si) => `<option value="${si}" ${q.skill === si ? 'selected' : ''}>${s}</option>`).join('')}
        </select>
      </td>
      <td>
        <select class="mini-select" onchange="setUnit(${i}, this.value)">
          ${UNITS.map((u, ui) => `<option value="${ui}" ${q.unit === ui ? 'selected' : ''}>${u}</option>`).join('')}
        </select>
      </td>
    `;
    tbody.appendChild(tr);
  }
}

// ─── Setters ─────────────────────────────────────────────
function setAnswer(i, a) {
  appConfig.questions[i].answer = a;
  // Actualizar botones visualmente sin re-render completo
  const btns = document.querySelectorAll(`[data-q="${i}"]`);
  btns.forEach(b => b.classList.toggle('selected', b.dataset.a === a));
}

function setPilot(i, val) {
  appConfig.questions[i].pilot = val;
  const tr = document.querySelectorAll('#config-body tr')[i];
  if (tr) tr.classList.toggle('pilot-row', val);
}

function setSkill(i, val) {
  appConfig.questions[i].skill = parseInt(val);
}

function setUnit(i, val) {
  appConfig.questions[i].unit = parseInt(val);
}

// ─── Guardar / Cargar ────────────────────────────────────
function saveConfig() {
  try {
    localStorage.setItem('omr_config', JSON.stringify(appConfig));
    const pilots = appConfig.questions.filter(q => q.pilot).length;
    document.getElementById('config-status').innerHTML =
      `<span class="status-ok">✓ Guardado: ${appConfig.numQuestions} preguntas, ${pilots} de pilotaje</span>`;
    showToast('Configuración guardada ✓', 'success');
  } catch(e) {
    showToast('Error al guardar', 'error');
  }
}

function loadConfig() {
  try {
    const saved = localStorage.getItem('omr_config');
    if (saved) {
      const parsed = JSON.parse(saved);
      appConfig = parsed;
      const inp = document.getElementById('num-q-input');
      if (inp) inp.value = appConfig.numQuestions;
      document.querySelectorAll('.preset-btn').forEach(b => {
        b.classList.toggle('active', parseInt(b.textContent) === appConfig.numQuestions);
      });
      renderConfigTable();
      showToast('Configuración cargada ✓', 'success');
    }
  } catch(e) {
    console.warn('No se pudo cargar configuración guardada');
  }
}

function fillSampleConfig() {
  const n = appConfig.numQuestions;
  const ns = SKILLS.length;
  const nu = UNITS.length;
  const na = ANSWERS.length;
  for (let i = 0; i < n; i++) {
    appConfig.questions[i] = {
      answer: ANSWERS[i % na],
      pilot:  i % 17 === 8,
      skill:  i % ns,
      unit:   i % nu
    };
  }
  renderConfigTable();
  showToast('Demo cargada — ajusta las respuestas reales', 'info');
}

// ─── Utilidades exportadas ───────────────────────────────
function getConfig() {
  return appConfig;
}

function isConfigReady() {
  return appConfig.questions.length === appConfig.numQuestions;
}

// Resumen de configuración para resultados
function getConfigSummary() {
  const q = appConfig.questions;
  const bySkill = SKILLS.map((s, si) => ({
    name: s,
    total: q.filter((x, i) => x.skill === si && !x.pilot).length
  }));
  const byUnit = UNITS.map((u, ui) => ({
    name: u,
    total: q.filter((x, i) => x.unit === ui && !x.pilot).length
  }));
  const pilots = q.filter(x => x.pilot).length;
  return { bySkill, byUnit, pilots, total: appConfig.numQuestions - pilots };
}
