// ═══════════════════════════════════════════════════════════
//  config.js  —  Gestión de configuración del ensayo
// ═══════════════════════════════════════════════════════════

const SKILLS = ['Sin asignar',
  'Localizar',
  'Interpretar',
  'Evaluar'];
const UNITS  = ['Sin asignar',
  'Extraer información explícita del texto','Identificar información explícita formulada a través de sinónimos y paráfrasis',
  'Establecer relaciones (causa/consecuencia, problema/solución, etc.) entre distintas partes','Elaborar inferencias sobre el significado local y global a partir de marcas textuales','Determinar el significado de una parte, párrafo o de la globalidad del texto','Sintetizar las ideas centrales de una sección o del texto completo','Identificar la jerarquía de las ideas de una parte del texto','Reconocer la función de un elemento textual (citas, figuras retóricas, ejemplos)',
  'Determinar la intención comunicativa del emisor o narrador.','Juzgar la calidad, pertinencia, suficiencia o consistencia de la información','Juzgar la forma (registro, estructura, propósito) en relación con la información','Calificar la posición, actitud o tono del emisor respecto del texto','	Valorar la pertinencia de recursos lingüísticos y no lingüísticos (imágenes, tipografía)','Valorar la información textual en relación con nuevos contextos',
];
const ANSWERS = ['A', 'B', 'C', 'D','E'];

// ─── Clasificación de textos (exclusivo Lenguaje) ────────
// Edita estas listas para agregar/quitar/renombrar categorías disponibles
const NATURES = ['Sin asignar', 'Literario', 'No literario'];
const GENRES  = ['Sin asignar', 'Narrativo', 'Expositivo', 'Argumentativo', 'Lírico', 'Dramático', 'Periodístico'];

// Estado global de configuración
let appConfig = {
  numQuestions: 65,
  questions: []   // [{answer, pilot, skill, unit, nature, genre}]
};

// ─── Inicialización ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadConfig();       // intenta cargar desde localStorage
  renderConfigTable();
  populateRangeSelects();
});

function populateRangeSelects() {
  const natSel = document.getElementById('range-nature-type');
  const genSel = document.getElementById('range-genre-type');
  if (natSel) natSel.innerHTML = NATURES.map((t, ti) => `<option value="${ti}">${t}</option>`).join('');
  if (genSel) genSel.innerHTML = GENRES.map((t, ti) => `<option value="${ti}">${t}</option>`).join('');
}

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
    appConfig.questions.push({ answer: 'A', pilot: false, skill: 0, unit: 0, nature: 0, genre: 0 });
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
    const q = appConfig.questions[i] || { answer: 'A', pilot: false, skill: 0, unit: 0, nature: 0, genre: 0 };
    if (q.nature === undefined) q.nature = 0;  // compatibilidad con configs guardadas antes de este cambio
    if (q.genre  === undefined) q.genre  = 0;
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
      <td>
        <select class="mini-select" id="nat-select-${i}" onchange="setNature(${i}, this.value)">
          ${NATURES.map((t, ti) => `<option value="${ti}" ${q.nature === ti ? 'selected' : ''}>${t}</option>`).join('')}
        </select>
      </td>
      <td>
        <select class="mini-select" id="gen-select-${i}" onchange="setGenre(${i}, this.value)">
          ${GENRES.map((t, ti) => `<option value="${ti}" ${q.genre === ti ? 'selected' : ''}>${t}</option>`).join('')}
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

function setNature(i, val) {
  appConfig.questions[i].nature = parseInt(val);
}

function setGenre(i, val) {
  appConfig.questions[i].genre = parseInt(val);
}

// ─── Asignación rápida por rango (Naturaleza y Género) ────
// Permite asignar una categoría a un intervalo de preguntas de una vez
// (ej: preguntas 1 a 9 → Naturaleza "Literario" / Género "Narrativo")
// sin tener que hacerlo fila por fila.
function applyRange(field) {
  // field: 'nature' o 'genre'
  const prefix = field === 'nature' ? 'range-nature' : 'range-genre';
  const fromInp = document.getElementById(`${prefix}-from`);
  const toInp   = document.getElementById(`${prefix}-to`);
  const typeSel = document.getElementById(`${prefix}-type`);
  const list    = field === 'nature' ? NATURES : GENRES;
  const label   = field === 'nature' ? 'Naturaleza' : 'Género';

  let from = parseInt(fromInp.value);
  let to   = parseInt(toInp.value);
  const typeIdx = parseInt(typeSel.value);

  if (isNaN(from) || isNaN(to)) {
    showToast('Indica un rango de preguntas válido', 'error');
    return;
  }
  if (from > to) { const tmp = from; from = to; to = tmp; }   // por si los invierten

  from = Math.max(1, from);
  to   = Math.min(appConfig.numQuestions, to);

  let count = 0;
  for (let i = from - 1; i <= to - 1; i++) {
    if (!appConfig.questions[i]) continue;
    appConfig.questions[i][field] = typeIdx;
    count++;
  }

  renderConfigTable();
  showToast(`${label} "${list[typeIdx]}" asignada a ${count} preguntas (${from}–${to})`, 'success');
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
  // Demo rápida: usa el largo real de cada arreglo, sin asumir cantidades fijas
  const n  = appConfig.numQuestions;
  const na = ANSWERS.length;
  const ns = SKILLS.length;
  const nu = UNITS.length;
  const nn = NATURES.length;
  const ng = GENRES.length;

  for (let i = 0; i < n; i++) {
    appConfig.questions[i] = {
      answer: ANSWERS[i % na],
      pilot:  i % 17 === 8,           // una por columna como pilotaje
      skill:  i % ns,
      unit:   i % nu,
      nature: 1 + (Math.floor(i / 9) % (nn - 1)),   // agrupa de 9 en 9, evitando "Sin asignar"
      genre:  1 + (Math.floor(i / 9) % (ng - 1))
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
  const byNature = NATURES.map((t, ti) => ({
    name: t,
    total: q.filter((x, i) => x.nature === ti && !x.pilot).length
  }));
  const byGenre = GENRES.map((t, ti) => ({
    name: t,
    total: q.filter((x, i) => x.genre === ti && !x.pilot).length
  }));
  const pilots = q.filter(x => x.pilot).length;
  return { bySkill, byUnit, byNature, byGenre, pilots, total: appConfig.numQuestions - pilots };
}
