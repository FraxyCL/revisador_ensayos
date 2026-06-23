// ═══════════════════════════════════════════════════════════
//  results.js  —  Gestión y visualización de resultados
// ═══════════════════════════════════════════════════════════

let scanResults = [];
let chartInstances = {};

// ─── Storage ─────────────────────────────────────────────
function addScanResult(entry) {
  scanResults.push(entry);
  try {
    localStorage.setItem('omr_results', JSON.stringify(scanResults));
  } catch(e) {}
}

function getScanResults() {
  if (scanResults.length === 0) {
    try {
      const saved = localStorage.getItem('omr_results');
      if (saved) scanResults = JSON.parse(saved);
    } catch(e) {}
  }
  return scanResults;
}

function clearAllResults() {
  if (!confirm('¿Eliminar todos los resultados ingresados?')) return;
  scanResults = [];
  localStorage.removeItem('omr_results');
  document.getElementById('scan-count').textContent = '0 alumnos';
  renderResults();
  showToast('Resultados eliminados', 'info');
}

// ─── Render principal ────────────────────────────────────
function renderResults() {
  const results = getScanResults();
  document.getElementById('results-empty').style.display  = results.length ? 'none' : 'flex';
  document.getElementById('results-content').style.display = results.length ? 'block' : 'none';

  if (!results.length) return;

  const summary = computeGlobalSummary(results);
  document.getElementById('results-summary-text').textContent =
    `${results.length} alumnos ingresados · Promedio: ${summary.avgPct}%`;

  renderStatsCards(summary, results);
  renderChartsSkills(summary);
  renderChartsUnits(summary);
  renderDistributionChart(results);
  renderStudentsTable(results);
  renderPerQuestionStats(results);   // estadística por pregunta
  renderTextClassStats(results);     // ← nuevo: estadística por Naturaleza/Género (exclusivo Lenguaje)
}

// ─── Resumen global ──────────────────────────────────────
function computeGlobalSummary(results) {
  const n = results.length;
  const avgCorrect  = results.reduce((s, r) => s + r.correct, 0) / n;
  const avgTotal    = results[0]?.validTotal || 1;
  const avgPct      = Math.round(avgCorrect / avgTotal * 100);

  // Habilidades
  const skillCount = SKILLS.length;
  const bySkill = Array(skillCount).fill(null).map(() => ({ correct: 0, total: 0 }));
  results.forEach(r => {
    r.bySkill.forEach((s, i) => {
      bySkill[i].correct += s.correct;
      bySkill[i].total   += s.total;
    });
  });

  // Unidades
  const unitCount = UNITS.length;
  const byUnit = Array(unitCount).fill(null).map(() => ({ correct: 0, total: 0 }));
  results.forEach(r => {
    r.byUnit.forEach((u, i) => {
      byUnit[i].correct += u.correct;
      byUnit[i].total   += u.total;
    });
  });

  return { n, avgCorrect: avgCorrect.toFixed(1), avgTotal, avgPct, bySkill, byUnit };
}

// ─── Tarjetas resumen ────────────────────────────────────
function renderStatsCards(summary, results) {
  const scores = results.map(r => Math.round(r.correct / r.validTotal * 100));
  const maxPct = Math.max(...scores);
  const minPct = Math.min(...scores);
  const above60 = scores.filter(s => s >= 60).length;

  document.getElementById('stats-grid').innerHTML = `
    <div class="stat-card">
      <div class="stat-icon">👥</div>
      <div class="stat-value">${summary.n}</div>
      <div class="stat-label">Alumnos</div>
    </div>
    <div class="stat-card accent">
      <div class="stat-icon">📊</div>
      <div class="stat-value">${summary.avgPct}%</div>
      <div class="stat-label">Promedio curso</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">🏆</div>
      <div class="stat-value">${maxPct}%</div>
      <div class="stat-label">Mejor puntaje</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">📉</div>
      <div class="stat-value">${minPct}%</div>
      <div class="stat-label">Menor puntaje</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">✅</div>
      <div class="stat-value">${above60}</div>
      <div class="stat-label">Sobre 60%</div>
    </div>
    <div class="stat-card">
      <div class="stat-icon">🎯</div>
      <div class="stat-value">${summary.avgCorrect}</div>
      <div class="stat-label">Correctas prom.</div>
    </div>
  `;
}

// ─── Gráfico Habilidades ─────────────────────────────────
function renderChartsSkills(summary) {
  const labels = SKILLS.map(s => s.split(' ')[0]); // abreviar
  const data   = summary.bySkill.map(s =>
    s.total > 0 ? Math.round(s.correct / s.total * 100) : 0
  );

  destroyChart('chart-skills');
  const ctx = document.getElementById('chart-skills').getContext('2d');
  chartInstances['chart-skills'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: SKILLS.map(s => wrapLabel(s, 15)),
      datasets: [{
        label: '% Logro',
        data,
        backgroundColor: data.map(v => v >= 60 ? '#22d3a3' : v >= 40 ? '#f59e0b' : '#ef4444'),
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true, max: 100,
          ticks: { callback: v => v + '%', color: '#94a3b8' },
          grid: { color: '#1e293b' }
        },
        x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
      }
    }
  });
}

// ─── Gráfico Unidades ────────────────────────────────────
function renderChartsUnits(summary) {
  const data = summary.byUnit.map(u =>
    u.total > 0 ? Math.round(u.correct / u.total * 100) : 0
  );

  destroyChart('chart-units');
  const ctx = document.getElementById('chart-units').getContext('2d');
  chartInstances['chart-units'] = new Chart(ctx, {
    type: 'radar',
    data: {
      labels: UNITS.map(u => wrapLabel(u, 14)),
      datasets: [{
        label: '% Logro',
        data,
        backgroundColor: 'rgba(34, 211, 163, 0.15)',
        borderColor: '#22d3a3',
        pointBackgroundColor: '#22d3a3',
        pointRadius: 5,
        borderWidth: 2
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        r: {
          beginAtZero: true, max: 100,
          ticks: { display: false },
          grid: { color: '#1e293b' },
          pointLabels: { color: '#94a3b8', font: { size: 11 } }
        }
      }
    }
  });
}

// ─── Distribución de puntajes ────────────────────────────
function renderDistributionChart(results) {
  const scores = results.map(r => Math.round(r.correct / r.validTotal * 100));

  // Bins de 10%
  const bins = Array(10).fill(0);
  scores.forEach(s => {
    const bin = Math.min(9, Math.floor(s / 10));
    bins[bin]++;
  });
  const labels = ['0-9', '10-19', '20-29', '30-39', '40-49', '50-59', '60-69', '70-79', '80-89', '90-100'];

  destroyChart('chart-distribution');
  const ctx = document.getElementById('chart-distribution').getContext('2d');
  chartInstances['chart-distribution'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: 'Alumnos',
        data: bins,
        backgroundColor: labels.map((_, i) => i < 4 ? '#ef4444' : i < 6 ? '#f59e0b' : '#22d3a3'),
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      plugins: { legend: { display: false } },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { stepSize: 1, color: '#94a3b8' },
          grid: { color: '#1e293b' }
        },
        x: { ticks: { color: '#94a3b8' }, grid: { display: false } }
      }
    }
  });
}

// ─── Eliminar alumno individual ──────────────────────────
function deleteResult(realIdx) {
  const r = scanResults[realIdx];
  if (!r) return;
  if (!confirm(`¿Eliminar la hoja de "${r.id}"?\nEsta acción no se puede deshacer.`)) return;

  scanResults.splice(realIdx, 1);           // elimina solo ese elemento
  try {
    localStorage.setItem('omr_results', JSON.stringify(scanResults));
  } catch(e) {}

  // Actualizar contador en sidebar
  const count = scanResults.length;
  document.getElementById('scan-count').textContent = `${count} alumno${count !== 1 ? 's' : ''}`;

  showToast(`Hoja de "${r.id}" eliminada`, 'info');
  renderResults();   // re-renderiza todo: tabla + gráficos + estadísticas
}

// ─── Tabla alumnos ────────────────────────────────────────
function renderStudentsTable(results) {
  const tbody = document.getElementById('students-body');
  tbody.innerHTML = '';

  // Ordenar por puntaje pero conservar índice real en scanResults para eliminar correctamente
  const indexed = results.map((r, realIdx) => ({ r, realIdx }));
  indexed.sort((a, b) => b.r.correct - a.r.correct);

  indexed.forEach(({ r, realIdx }) => {
    const pct = Math.round(r.correct / r.validTotal * 100);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${escHtmlR(r.id)}</td>
      <td class="txt-green">${r.correct}</td>
      <td class="txt-red">${r.incorrect}</td>
      <td class="txt-gray">${r.omit}</td>
      <td><strong>${r.correct}/${r.validTotal}</strong></td>
      <td>
        <div class="pct-bar">
          <div class="pct-fill ${pct>=60?'good':pct>=40?'mid':'low'}" style="width:${pct}%"></div>
          <span>${pct}%</span>
        </div>
      </td>
      <td>
        <button class="btn-icon" onclick="showStudentDetail(${realIdx})" title="Ver detalle">
          <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        </button>
      </td>
      <td>
        <button class="btn-icon btn-delete" onclick="deleteResult(${realIdx})" title="Eliminar esta hoja">
          <svg viewBox="0 0 24 24"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4h6v2"/></svg>
        </button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function escHtmlR(str) {
  return String(str).replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ─── Modal detalle alumno ────────────────────────────────
function showStudentDetail(idx) {
  const r = getScanResults()[idx];
  if (!r) return;

  const pct = Math.round(r.correct / r.validTotal * 100);
  const config = getConfig();

  const skillRows = r.bySkill.map((s, i) => {
    const p = s.total > 0 ? Math.round(s.correct / s.total * 100) : 0;
    return `<div class="detail-skill">
      <span>${SKILLS[i]}</span>
      <div class="det-bar"><div class="det-fill" style="width:${p}%"></div></div>
      <span class="det-pct">${p}%</span>
    </div>`;
  }).join('');

  const unitRows = r.byUnit.map((u, i) => {
    const p = u.total > 0 ? Math.round(u.correct / u.total * 100) : 0;
    return `<div class="detail-skill">
      <span>${UNITS[i]}</span>
      <div class="det-bar"><div class="det-fill" style="width:${p}%"></div></div>
      <span class="det-pct">${p}%</span>
    </div>`;
  }).join('');

  // Tabla respuestas individuales
  const detailRows = r.detail.map(d => `
    <tr class="${d.status}${d.pilot?' pilot':''}">
      <td>${d.q}${d.pilot ? ' 🔬' : ''}</td>
      <td>${d.expected}</td>
      <td>${d.detected === 'OMIT' ? '—' : d.detected === 'INVALID' ? '✗✗' : d.detected}</td>
      <td>${statusIcon(d.status)}</td>
    </tr>`).join('');

  document.getElementById('modal-content').innerHTML = `
    <div class="modal-student-header">
      <h2>${r.id}</h2>
      <div class="modal-score">
        <span class="score-xl">${pct}%</span>
        <span class="score-sub">${r.correct}/${r.validTotal} correctas</span>
      </div>
    </div>
    <div class="modal-tristat">
      <div class="tristat green">✓<br><strong>${r.correct}</strong><br>Correctas</div>
      <div class="tristat red">✗<br><strong>${r.incorrect}</strong><br>Incorrectas</div>
      <div class="tristat gray">—<br><strong>${r.omit}</strong><br>Omitidas</div>
    </div>
    <div class="modal-section">
      <h4>Por Habilidad</h4>
      ${skillRows}
    </div>
    <div class="modal-section">
      <h4>Por Unidad</h4>
      ${unitRows}
    </div>
    <div class="modal-section">
      <h4>Detalle de respuestas</h4>
      <div class="detail-table-wrap">
        <table class="detail-table">
          <thead><tr><th>#</th><th>Esperada</th><th>Marcada</th><th>Estado</th></tr></thead>
          <tbody>${detailRows}</tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById('modal-overlay').style.display = 'flex';
}

function statusIcon(s) {
  if (s === 'correct')   return '<span class="si green">✓</span>';
  if (s === 'incorrect') return '<span class="si red">✗</span>';
  if (s === 'omit')      return '<span class="si gray">—</span>';
  if (s === 'invalid')   return '<span class="si orange">!!</span>';
  return '';
}

// ─── Export CSV ──────────────────────────────────────────
function exportCSV() {
  const results = getScanResults();
  if (!results.length) { showToast('Sin resultados para exportar', 'error'); return; }

  const headers = ['Alumno', 'Correctas', 'Incorrectas', 'Omitidas', 'Total válido', '% Logro',
    ...SKILLS.map(s => `Skill:${s}`),
    ...UNITS.map(u => `Unidad:${u}`)
  ];

  const rows = results.map(r => {
    const pct = Math.round(r.correct / r.validTotal * 100);
    return [
      r.id, r.correct, r.incorrect, r.omit, r.validTotal, pct,
      ...r.bySkill.map(s => s.total > 0 ? Math.round(s.correct/s.total*100) : 0),
      ...r.byUnit.map(u => u.total > 0 ? Math.round(u.correct/u.total*100) : 0)
    ];
  });

  const csv = [headers, ...rows].map(r => r.join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `resultados_omr_${new Date().toISOString().slice(0,10)}.csv`;
  link.click();
  showToast('CSV exportado ✓', 'success');
}

// ─── Utilidades ──────────────────────────────────────────
function destroyChart(id) {
  if (chartInstances[id]) {
    chartInstances[id].destroy();
    delete chartInstances[id];
  }
}

function wrapLabel(str, maxLen) {
  if (str.length <= maxLen) return str;
  const words = str.split(' ');
  const lines = [];
  let line = '';
  words.forEach(w => {
    if ((line + ' ' + w).trim().length <= maxLen) {
      line = (line + ' ' + w).trim();
    } else {
      if (line) lines.push(line);
      line = w;
    }
  });
  if (line) lines.push(line);
  return lines;
}

// Carga resultados guardados al iniciar
document.addEventListener('DOMContentLoaded', () => {
  getScanResults();
  const count = scanResults.length;
  if (count > 0) {
    document.getElementById('scan-count').textContent = `${count} alumno${count !== 1 ? 's' : ''}`;
  }
});

// ═══════════════════════════════════════════════════════════
//  ESTADÍSTICA POR PREGUNTA  (nuevo — no toca nada anterior)
// ═══════════════════════════════════════════════════════════

// ─── Cálculo: % de acierto de cada pregunta a través de todos los alumnos ──
function computePerQuestionStats(results) {
  if (!results.length) return [];

  const numQ = results[0].detail.length;
  const stats = [];

  for (let i = 0; i < numQ; i++) {
    let correct = 0, incorrect = 0, omit = 0, invalid = 0, total = 0;
    let isPilot = false;

    results.forEach(r => {
      const d = r.detail[i];
      if (!d) return;
      isPilot = d.pilot;
      if (d.pilot) return; // las preguntas de pilotaje no entran en este ranking

      total++;
      if (d.status === 'correct')   correct++;
      else if (d.status === 'incorrect') incorrect++;
      else if (d.status === 'omit')      omit++;
      else if (d.status === 'invalid')   invalid++;
    });

    const pct = total > 0 ? Math.round(correct / total * 100) : null;

    stats.push({
      qNum: i + 1,
      pilot: isPilot,
      total, correct, incorrect, omit, invalid,
      pct
    });
  }

  return stats;
}

// ─── Render principal de la sección ──────────────────────
function renderPerQuestionStats(results) {
  const container = document.getElementById('per-question-section');
  if (!container) return; // si el HTML no tiene el bloque, no rompe nada

  const stats = computePerQuestionStats(results).filter(s => !s.pilot && s.total > 0);
  if (!stats.length) { container.style.display = 'none'; return; }
  container.style.display = 'block';

  const sorted = [...stats].sort((a, b) => b.pct - a.pct);
  const best   = sorted.slice(0, 5);
  const worst  = sorted.slice(-5).reverse();

  renderPerQuestionTopCards(best, worst);
  renderPerQuestionChart(stats);
  renderPerQuestionTable(stats);
}

// ─── Tarjetas: top 5 más acertadas / menos acertadas ─────
function renderPerQuestionTopCards(best, worst) {
  const bestEl  = document.getElementById('pq-best-list');
  const worstEl = document.getElementById('pq-worst-list');
  if (!bestEl || !worstEl) return;

  bestEl.innerHTML = best.map(s => `
    <div class="pq-rank-item good">
      <span class="pq-rank-q">P${s.qNum}</span>
      <div class="pq-rank-bar"><div class="pq-rank-fill good" style="width:${s.pct}%"></div></div>
      <span class="pq-rank-pct">${s.pct}%</span>
    </div>
  `).join('');

  worstEl.innerHTML = worst.map(s => `
    <div class="pq-rank-item bad">
      <span class="pq-rank-q">P${s.qNum}</span>
      <div class="pq-rank-bar"><div class="pq-rank-fill bad" style="width:${s.pct}%"></div></div>
      <span class="pq-rank-pct">${s.pct}%</span>
    </div>
  `).join('');
}

// ─── Gráfico de barras: % acierto por cada pregunta ──────
function renderPerQuestionChart(stats) {
  const canvas = document.getElementById('chart-per-question');
  if (!canvas) return;

  const labels = stats.map(s => `P${s.qNum}`);
  const data   = stats.map(s => s.pct);

  destroyChart('chart-per-question');
  const ctx = canvas.getContext('2d');
  chartInstances['chart-per-question'] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: '% Acierto',
        data,
        backgroundColor: data.map(v => v >= 60 ? '#22d3a3' : v >= 40 ? '#f59e0b' : '#ef4444'),
        borderRadius: 4,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: (items) => `Pregunta ${items[0].label.replace('P','')}`,
            label: (item) => `${item.formattedValue}% de acierto`
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true, max: 100,
          ticks: { callback: v => v + '%', color: '#94a3b8' },
          grid: { color: '#1e293b' }
        },
        x: {
          ticks: { color: '#94a3b8', maxRotation: 90, minRotation: 90, autoSkip: true },
          grid: { display: false }
        }
      }
    }
  });
}

// ─── Tabla completa por pregunta ──────────────────────────
function renderPerQuestionTable(stats) {
  const tbody = document.getElementById('pq-table-body');
  if (!tbody) return;

  tbody.innerHTML = stats.map(s => `
    <tr>
      <td><strong>P${s.qNum}</strong></td>
      <td class="txt-green">${s.correct}</td>
      <td class="txt-red">${s.incorrect}</td>
      <td class="txt-gray">${s.omit}</td>
      <td>
        <div class="pct-bar">
          <div class="pct-fill ${s.pct>=60?'good':s.pct>=40?'mid':'low'}" style="width:${s.pct}%"></div>
          <span>${s.pct}%</span>
        </div>
      </td>
    </tr>
  `).join('');
}

// ═══════════════════════════════════════════════════════════
//  ESTADÍSTICA POR NATURALEZA Y GÉNERO  (exclusivo Lenguaje)
//  Nuevo bloque — no modifica nada de lo anterior.
//  Si NATURES/GENRES no existen (otras asignaturas), las
//  funciones detectan su ausencia y no hacen nada.
// ═══════════════════════════════════════════════════════════

function computeTextClassStats(results) {
  // Si esta asignatura no tiene NATURES/GENRES definidos, no aplica.
  if (typeof NATURES === 'undefined' || typeof GENRES === 'undefined') return null;

  const byNature = NATURES.map((name, idx) => ({ idx, name, correct: 0, total: 0 }));
  const byGenre  = GENRES.map((name, idx)  => ({ idx, name, correct: 0, total: 0 }));

  results.forEach(r => {
    r.detail.forEach(d => {
      if (d.pilot) return; // las preguntas de pilotaje no entran en esta estadística

      const natIdx = d.nature || 0;
      const genIdx = d.genre  || 0;

      if (byNature[natIdx]) {
        byNature[natIdx].total++;
        if (d.status === 'correct') byNature[natIdx].correct++;
      }
      if (byGenre[genIdx]) {
        byGenre[genIdx].total++;
        if (d.status === 'correct') byGenre[genIdx].correct++;
      }
    });
  });

  return { byNature, byGenre };
}

// ─── Render principal ─────────────────────────────────────
function renderTextClassStats(results) {
  const container = document.getElementById('text-class-section');
  if (!container) return; // si el HTML no tiene el bloque (otras asignaturas), no hace nada

  const stats = computeTextClassStats(results);
  if (!stats) { container.style.display = 'none'; return; }

  // Excluir "Sin asignar" (índice 0) y categorías sin preguntas asociadas
  const natFiltered = stats.byNature.filter((s, i) => i !== 0 && s.total > 0);
  const genFiltered = stats.byGenre.filter((s, i) => i !== 0 && s.total > 0);

  if (natFiltered.length === 0 && genFiltered.length === 0) {
    container.style.display = 'none';
    return;
  }
  container.style.display = 'block';

  renderTextClassChart('chart-nature', natFiltered);
  renderTextClassChart('chart-genre', genFiltered);
  renderTextClassTable(natFiltered, genFiltered);
}

// ─── Gráfico de barras horizontales (Naturaleza o Género) ─
function renderTextClassChart(canvasId, dataList) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  destroyChart(canvasId);

  if (dataList.length === 0) {
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    return;
  }

  const labels = dataList.map(s => wrapLabel(s.name, 16));
  const data   = dataList.map(s => s.total > 0 ? Math.round(s.correct / s.total * 100) : 0);

  const ctx = canvas.getContext('2d');
  chartInstances[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [{
        label: '% Logro',
        data,
        backgroundColor: data.map(v => v >= 60 ? '#22d3a3' : v >= 40 ? '#f59e0b' : '#ef4444'),
        borderRadius: 6,
        borderSkipped: false
      }]
    },
    options: {
      indexAxis: 'y',   // barras horizontales — más legible con nombres de categoría largos
      responsive: true,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (item) => `${item.formattedValue}% de logro`
          }
        }
      },
      scales: {
        x: {
          beginAtZero: true, max: 100,
          ticks: { callback: v => v + '%', color: '#94a3b8' },
          grid: { color: '#1e293b' }
        },
        y: { ticks: { color: '#94a3b8' }, grid: { display: false } }
      }
    }
  });
}

// ─── Tabla combinada Naturaleza + Género ──────────────────
function renderTextClassTable(natList, genList) {
  const tbody = document.getElementById('tc-table-body');
  if (!tbody) return;

  const rows = [];

  natList.forEach(s => {
    const pct = s.total > 0 ? Math.round(s.correct / s.total * 100) : 0;
    rows.push(`
      <tr>
        <td><span class="tc-tag nature">Naturaleza</span></td>
        <td>${escHtmlR(s.name)}</td>
        <td>${s.total}</td>
        <td class="txt-green">${s.correct}</td>
        <td>
          <div class="pct-bar">
            <div class="pct-fill ${pct>=60?'good':pct>=40?'mid':'low'}" style="width:${pct}%"></div>
            <span>${pct}%</span>
          </div>
        </td>
      </tr>
    `);
  });

  genList.forEach(s => {
    const pct = s.total > 0 ? Math.round(s.correct / s.total * 100) : 0;
    rows.push(`
      <tr>
        <td><span class="tc-tag genre">Género</span></td>
        <td>${escHtmlR(s.name)}</td>
        <td>${s.total}</td>
        <td class="txt-green">${s.correct}</td>
        <td>
          <div class="pct-bar">
            <div class="pct-fill ${pct>=60?'good':pct>=40?'mid':'low'}" style="width:${pct}%"></div>
            <span>${pct}%</span>
          </div>
        </td>
      </tr>
    `);
  });

  tbody.innerHTML = rows.join('');
}
