// ═══════════════════════════════════════════════════════════
//  entry.js  —  Motor de ingreso rápido por teclado
// ═══════════════════════════════════════════════════════════

// ─── Estado ──────────────────────────────────────────────
let entryActive   = false;   // hay sesión activa
let entryAnswers  = [];      // respuestas ingresadas: 'A'|'B'|'C'|'D'|'OMIT'
let entryName     = '';
let entryNumQ     = 65;
let entryComplete = false;   // esperando confirmación

// ─── Iniciar sesión ───────────────────────────────────────
function startEntry() {
  if (!isConfigReady()) {
    showToast('Primero guarda la configuración', 'error');
    showTab('config');
    return;
  }

  const nameInput = document.getElementById('entry-name');
  const name = nameInput.value.trim();
  if (!name) {
    nameInput.focus();
    nameInput.classList.add('shake');
    setTimeout(() => nameInput.classList.remove('shake'), 400);
    showToast('Escribe el nombre del alumno', 'error');
    return;
  }

  entryName     = name;
  entryAnswers  = [];
  entryNumQ     = getConfig().numQuestions;
  entryActive   = true;
  entryComplete = false;

  // UI: mostrar sesión, ocultar instrucciones
  document.getElementById('entry-instructions').style.display = 'none';
  document.getElementById('entry-session').style.display      = 'block';
  document.getElementById('entry-confirm-box').style.display  = 'none';
  document.getElementById('session-name-label').textContent   = name;
  document.getElementById('egp-name').textContent             = name;
  document.getElementById('egp-badge').textContent            = 'Ingresando...';
  document.getElementById('egp-badge').className              = 'egp-badge active';
  document.getElementById('sp-total').textContent             = entryNumQ;

  renderAnswerGrid();
  updateSessionUI();

  // Foco al panel para capturar teclado
  document.getElementById('entry-grid-panel').focus();
}

// ─── Escucha de teclado ───────────────────────────────────
document.addEventListener('keydown', (e) => {
  // Solo activo si hay sesión y no estamos en un input
  if (document.activeElement.tagName === 'INPUT' && !entryActive) return;
  if (!entryActive) return;

  // Ignorar si el foco está en el campo de nombre (no hay sesión iniciada)
  if (document.activeElement === document.getElementById('entry-name')) return;

  const key = e.key.toUpperCase();

  if (entryComplete) {
    // Solo Enter para confirmar o Escape para cancelar
    if (e.key === 'Enter') { e.preventDefault(); confirmEntry(); return; }
    if (e.key === 'Escape') { cancelEntry(); return; }
    return;
  }

  if (e.key === 'Backspace' || e.key === 'Delete') {
    e.preventDefault();
    undoLast();
    return;
  }

  if (e.key === 'Escape') {
    cancelEntry();
    return;
  }

  // Respuestas
  if (['A', 'B', 'C', 'D'].includes(key)) {
    e.preventDefault();
    registerAnswer(key);
    flashKey(key);
    return;
  }

  if (e.key === ' ' || e.key === 'Spacebar') {
    e.preventDefault();
    registerAnswer('OMIT');
    flashKey('SPC');
    return;
  }
});

// ─── Registrar respuesta ──────────────────────────────────
function registerAnswer(ans) {
  if (!entryActive || entryComplete) return;
  if (entryAnswers.length >= entryNumQ) return;

  entryAnswers.push(ans);
  updateAnswerCell(entryAnswers.length - 1, ans);
  updateSessionUI();

  // Verificar si se completó
  if (entryAnswers.length === entryNumQ) {
    finishEntry();
  }
}

// ─── Deshacer última ──────────────────────────────────────
function undoLast() {
  if (!entryActive || entryAnswers.length === 0) return;
  if (entryComplete) {
    // Volver a edición desde pantalla de confirmación
    entryComplete = false;
    document.getElementById('entry-confirm-box').style.display = 'none';
    document.getElementById('egp-badge').textContent  = 'Ingresando...';
    document.getElementById('egp-badge').className    = 'egp-badge active';
  }
  entryAnswers.pop();
  updateAnswerCell(entryAnswers.length, null); // limpiar la celda
  updateSessionUI();
  flashKey('⌫');
}

// ─── Finalizar ingreso ────────────────────────────────────
function finishEntry() {
  entryComplete = true;

  const config = getConfig();
  const result = evaluateAnswers(entryAnswers, config);
  const pct    = Math.round(result.correct / result.validTotal * 100);

  document.getElementById('egp-badge').textContent = `${pct}% · ¡Completo!`;
  document.getElementById('egp-badge').className   = `egp-badge done ${pct>=60?'good':pct>=40?'mid':'low'}`;

  // Mostrar resultado en el panel de confirmación
  const scoreEl = document.getElementById('ecb-score');
  scoreEl.innerHTML = `
    <div class="ecb-pct ${pct>=60?'good':pct>=40?'mid':'low'}">${pct}%</div>
    <div class="ecb-nums">${result.correct} <small>/ ${result.validTotal} correctas</small></div>
  `;

  const breakEl = document.getElementById('ecb-breakdown');
  breakEl.innerHTML = `
    <span class="ecb-stat green">✓ ${result.correct}</span>
    <span class="ecb-stat red">✗ ${result.incorrect}</span>
    <span class="ecb-stat gray">— ${result.omit}</span>
  `;

  document.getElementById('entry-confirm-box').style.display = 'flex';
  document.getElementById('entry-confirm-box').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

// ─── Confirmar y guardar ──────────────────────────────────
function confirmEntry() {
  if (!entryComplete) return;

  const config = getConfig();
  const result = evaluateAnswers(entryAnswers, config);
  const entry  = {
    id:        entryName,
    answers:   [...entryAnswers],
    timestamp: Date.now(),
    ...result
  };
  addScanResult(entry);

  // Actualizar contador sidebar
  const count = getScanResults().length;
  document.getElementById('scan-count').textContent = `${count} alumno${count !== 1 ? 's' : ''}`;

  // Agregar a lista de ingresados
  addToDoneList(entry);
  showToast(`"${entryName}" guardado ✓`, 'success');

  // Resetear para siguiente alumno
  resetEntryForNext();
}

function addToDoneList(entry) {
  const listEl = document.getElementById('entry-done-list');
  const items  = document.getElementById('edl-items');
  const count  = document.getElementById('edl-count');
  listEl.style.display = 'block';

  const pct = Math.round(entry.correct / entry.validTotal * 100);
  const div = document.createElement('div');
  div.className = 'edl-item';
  div.innerHTML = `
    <span class="edl-name">${escEntry(entry.id)}</span>
    <span class="edl-pct ${pct>=60?'green':pct>=40?'orange':'red'}">${pct}%</span>
  `;
  items.insertBefore(div, items.firstChild); // más reciente arriba

  const total = getScanResults().length;
  count.textContent = `${total} guardado${total !== 1 ? 's' : ''}`;
}

function resetEntryForNext() {
  entryAnswers  = [];
  entryActive   = false;
  entryComplete = false;

  document.getElementById('entry-name').value              = '';
  document.getElementById('entry-session').style.display   = 'none';
  document.getElementById('entry-instructions').style.display = 'block';
  document.getElementById('entry-confirm-box').style.display  = 'none';
  document.getElementById('egp-name').textContent          = 'Esperando alumno…';
  document.getElementById('egp-badge').textContent         = '—';
  document.getElementById('egp-badge').className           = 'egp-badge';

  renderAnswerGrid(); // limpiar grilla
  setTimeout(() => document.getElementById('entry-name').focus(), 80);
}

function cancelEntry() {
  entryAnswers  = [];
  entryActive   = false;
  entryComplete = false;

  document.getElementById('entry-session').style.display      = 'none';
  document.getElementById('entry-instructions').style.display = 'block';
  document.getElementById('entry-confirm-box').style.display  = 'none';
  document.getElementById('egp-name').textContent  = 'Esperando alumno…';
  document.getElementById('egp-badge').textContent = '—';
  document.getElementById('egp-badge').className   = 'egp-badge';

  renderAnswerGrid();
  document.getElementById('entry-name').focus();
}

// ─── Grilla visual ────────────────────────────────────────
function renderAnswerGrid() {
  const grid  = document.getElementById('answer-grid');
  const numQ  = entryNumQ || getConfig().numQuestions || 65;
  const COLS  = 5;
  const perCol = Math.ceil(numQ / COLS);

  grid.innerHTML = '';
  grid.style.setProperty('--cols', COLS);

  // Crear columnas
  for (let col = 0; col < COLS; col++) {
    const colDiv = document.createElement('div');
    colDiv.className = 'ag-col';

    // Encabezado de columna
    const startQ = col * perCol + 1;
    const endQ   = Math.min(startQ + perCol - 1, numQ);
    if (startQ > numQ) break;

    const header = document.createElement('div');
    header.className = 'ag-col-header';
    header.textContent = `${startQ}–${endQ}`;
    colDiv.appendChild(header);

    // Filas de la columna
    for (let row = 0; row < perCol; row++) {
      const qIdx = col * perCol + row;
      if (qIdx >= numQ) break;

      const qNum = qIdx + 1;
      const cfg  = getConfig().questions[qIdx];

      const rowDiv = document.createElement('div');
      rowDiv.className = `ag-row${cfg?.pilot ? ' ag-pilot' : ''}`;
      rowDiv.id = `ag-row-${qIdx}`;

      rowDiv.innerHTML = `
        <span class="ag-num">${qNum}${cfg?.pilot ? '<sup>p</sup>' : ''}</span>
        <div class="ag-bubbles">
          <div class="ag-bubble bbl-a" id="bbl-${qIdx}-A">A</div>
          <div class="ag-bubble bbl-b" id="bbl-${qIdx}-B">B</div>
          <div class="ag-bubble bbl-c" id="bbl-${qIdx}-C">C</div>
          <div class="ag-bubble bbl-d" id="bbl-${qIdx}-D">D</div>
        </div>
        <div class="ag-status" id="ags-${qIdx}"></div>
      `;

      colDiv.appendChild(rowDiv);
    }

    grid.appendChild(colDiv);
  }

  // Dibujar respuestas ya existentes (si hay)
  entryAnswers.forEach((ans, i) => updateAnswerCell(i, ans));

  // Marcar fila activa
  highlightActiveRow();
}

function updateAnswerCell(idx, ans) {
  // Limpiar burbujas de esa fila
  ['A','B','C','D'].forEach(a => {
    const bbl = document.getElementById(`bbl-${idx}-${a}`);
    if (bbl) bbl.className = `ag-bubble bbl-${a.toLowerCase()}`;
  });

  const statusEl = document.getElementById(`ags-${idx}`);
  const rowEl    = document.getElementById(`ag-row-${idx}`);

  if (!ans) {
    // Celda vacía (undone)
    if (statusEl) statusEl.textContent = '';
    if (rowEl) rowEl.classList.remove('ag-row-done', 'ag-row-omit', 'ag-row-correct', 'ag-row-incorrect');
    highlightActiveRow();
    return;
  }

  // Marcar burbuja elegida
  if (ans !== 'OMIT') {
    const bbl = document.getElementById(`bbl-${idx}-${ans}`);
    if (bbl) bbl.classList.add('bbl-marked');
  }

  // Comparar con respuesta correcta
  const cfg = getConfig().questions[idx];
  let correct = false;
  if (cfg) correct = (ans === cfg.answer);

  if (rowEl) {
    rowEl.classList.remove('ag-row-done', 'ag-row-omit', 'ag-row-correct', 'ag-row-incorrect');
    if (ans === 'OMIT') {
      rowEl.classList.add('ag-row-omit');
    } else if (cfg?.pilot) {
      rowEl.classList.add('ag-row-done');
    } else {
      rowEl.classList.add(correct ? 'ag-row-correct' : 'ag-row-incorrect');
    }
  }

  if (statusEl) {
    if (ans === 'OMIT')      statusEl.textContent = '—';
    else if (cfg?.pilot)     statusEl.textContent = '🔬';
    else if (correct)        statusEl.textContent = '✓';
    else                     statusEl.textContent = '✗';
  }

  highlightActiveRow();
}

function highlightActiveRow() {
  // Quitar highlight anterior
  document.querySelectorAll('.ag-row-active').forEach(el => el.classList.remove('ag-row-active'));

  if (!entryActive || entryComplete) return;
  const nextIdx = entryAnswers.length;
  const rowEl   = document.getElementById(`ag-row-${nextIdx}`);
  if (rowEl) {
    rowEl.classList.add('ag-row-active');
    rowEl.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

// ─── UI de sesión en tiempo real ──────────────────────────
function updateSessionUI() {
  const n    = entryAnswers.length;
  const numQ = entryNumQ;
  const pct  = Math.round(n / numQ * 100);

  document.getElementById('sp-current').textContent   = Math.min(n + 1, numQ);
  document.getElementById('sp-bar-fill').style.width  = pct + '%';

  // Estadísticas en vivo
  const config = getConfig();
  let correct = 0, incorrect = 0, omit = 0;
  entryAnswers.forEach((ans, i) => {
    const q = config.questions[i];
    if (!q || q.pilot) return;
    if (ans === 'OMIT')           omit++;
    else if (ans === q.answer)    correct++;
    else                          incorrect++;
  });

  document.getElementById('ls-correct').querySelector('strong').textContent   = correct;
  document.getElementById('ls-incorrect').querySelector('strong').textContent = incorrect;
  document.getElementById('ls-omit').querySelector('strong').textContent      = omit;

  highlightActiveRow();
}

// ─── Flash visual de tecla ────────────────────────────────
function flashKey(key) {
  const el = document.getElementById(`kv-${key}`);
  if (!el) return;
  el.classList.add('kv-flash');
  setTimeout(() => el.classList.remove('kv-flash'), 180);
}

// ─── Evaluación de respuestas ─────────────────────────────
function evaluateAnswers(answers, config) {
  const { questions } = config;
  let correct = 0, incorrect = 0, omit = 0;
  const bySkill = Array(SKILLS.length).fill(null).map(() => ({ correct: 0, total: 0 }));
  const byUnit  = Array(UNITS.length).fill(null).map(() => ({ correct: 0, total: 0 }));
  const detail  = [];

  for (let i = 0; i < config.numQuestions; i++) {
    const q   = questions[i];
    const det = answers[i] || 'OMIT';

    let status;
    if (det === 'OMIT')         { status = 'omit';      if (!q.pilot) omit++; }
    else if (det === q.answer)  { status = 'correct';   if (!q.pilot) correct++; }
    else                        { status = 'incorrect'; if (!q.pilot) incorrect++; }

    if (!q.pilot) {
      bySkill[q.skill].total++;
      byUnit[q.unit].total++;
      if (status === 'correct') {
        bySkill[q.skill].correct++;
        byUnit[q.unit].correct++;
      }
    }
    detail.push({ q: i + 1, expected: q.answer, detected: det, status, pilot: q.pilot });
  }

  const validTotal = config.numQuestions - questions.filter(q => q.pilot).length;
  return { correct, incorrect, omit, validTotal, bySkill, byUnit, detail };
}

// ─── Utilidades ──────────────────────────────────────────
function escEntry(str) {
  return String(str).replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// Inicializar grilla al cargar la pestaña
document.addEventListener('DOMContentLoaded', () => {
  // Cargar resultados guardados
  getScanResults();
  const count = getScanResults().length;
  if (count) {
    document.getElementById('scan-count').textContent = `${count} alumno${count !== 1 ? 's' : ''}`;
  }
});
