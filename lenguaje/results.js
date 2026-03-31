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
