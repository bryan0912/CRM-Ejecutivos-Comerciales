/* ═══════════════════════════════════════
   DOMONOW CRM — ui.js
   ─────────────────────────────────────
   Todo lo que pinta en pantalla.
   Este archivo NO llama a Supabase.
   Solo recibe datos y los renderiza.
═══════════════════════════════════════ */

// ══════════════════════════════
// HELPERS VISUALES
// ══════════════════════════════

function initials(name) {
  if (!name) return '?';
  return name.split(' ').slice(0,2).map(w => w[0]).join('').toUpperCase();
}

function convRate(llamadas, cierres) {
  if (!llamadas) return 0;
  return Math.round((cierres / llamadas) * 100);
}

function progColor(pct) {
  if (pct >= 90) return 'green';
  if (pct >= 60) return 'yellow';
  return 'red';
}

function statusBadge(pct) {
  if (pct >= 90) return '<span class="badge badge-green"><i class="fas fa-circle-check"></i> En Meta</span>';
  if (pct >= 60) return '<span class="badge badge-yellow"><i class="fas fa-circle-exclamation"></i> En Riesgo</span>';
  return '<span class="badge badge-red"><i class="fas fa-circle-xmark"></i> Bajo Meta</span>';
}

function periodDays(period) {
  if (period === 'today') return 1;
  if (period === 'week')  return 7;
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
}

function getCurrentPeriod() {
  return document.getElementById('globalPeriod').value;
}

// ══════════════════════════════
// LOADING OVERLAY
// ══════════════════════════════

function showLoading(msg = 'Cargando...') {
  let el = document.getElementById('loadingOverlay');
  if (!el) {
    el = document.createElement('div');
    el.id = 'loadingOverlay';
    el.className = 'loading-overlay';
    el.innerHTML = `<div class="loading-spinner"></div><div class="loading-text" id="loadingText">${msg}</div>`;
    document.body.appendChild(el);
  }
  document.getElementById('loadingText').textContent = msg;
  el.style.display = 'flex';
}

function hideLoading() {
  const el = document.getElementById('loadingOverlay');
  if (el) el.style.display = 'none';
}

// ══════════════════════════════
// NOTIFICATIONS
// ══════════════════════════════

function notify(msg, type = 'ok') {
  const c = document.getElementById('notifContainer');
  const n = document.createElement('div');
  n.className = 'notif' + (type === 'error' ? ' error' : '');
  n.innerHTML = `<i class="fas ${type === 'ok' ? 'fa-circle-check' : 'fa-circle-xmark'}" style="color:${type === 'ok' ? 'var(--green)' : 'var(--red)'}"></i> ${msg}`;
  c.appendChild(n);
  setTimeout(() => n.remove(), 3500);
}

// ══════════════════════════════
// NAVIGATION
// ══════════════════════════════

const TAB_TITLES = {
  dashboard:  'Dashboard',
  ejecutivos: 'Ejecutivos Comerciales',
  actividad:  'Actividad Diaria',
  tendencias: 'Tendencias',
  config:     'Configuración'
};

function showTab(name, navEl) {
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  document.getElementById('tab-' + name).classList.add('active');

  if (navEl) {
    navEl.classList.add('active');
  } else {
    // Activar el nav-item correcto si se llama sin referencia
    document.querySelectorAll('.nav-item').forEach(n => {
      if (n.getAttribute('onclick') && n.getAttribute('onclick').includes(`'${name}'`)) {
        n.classList.add('active');
      }
    });
  }

  document.getElementById('topbarTitle').textContent = TAB_TITLES[name] || name;
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebarBackdrop')?.classList.remove('show');

  // Cada tab tiene su render en app.js
  if (name === 'dashboard')   renderDashboard();
  if (name === 'ejecutivos')  renderEjecutivos();
  if (name === 'actividad')   renderActivityTab();
  if (name === 'tendencias')  renderCharts();
  if (name === 'config')      renderConfig();
}

function toggleSidebar() {
  const sidebar  = document.getElementById('sidebar');
  const backdrop = document.getElementById('sidebarBackdrop');
  sidebar.classList.toggle('open');
  backdrop?.classList.toggle('show', sidebar.classList.contains('open'));
}

function onPeriodChange() {
  const active = document.querySelector('.tab-panel.active');
  if (!active) return;
  showTab(active.id.replace('tab-', ''), null);
}

// ══════════════════════════════
// MODALS
// ══════════════════════════════

function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

window.onclick = e => {
  if (e.target.classList.contains('modal-overlay')) e.target.classList.remove('open');
};

// ══════════════════════════════
// EXEC SELECTS (poblar <select>)
// ══════════════════════════════

function populateExecSelects() {
  const selects = {
    actExec:         false,   // false = sin opción "Todos"
    filterExec:      true,
    trendExecFilter: true
  };

  Object.entries(selects).forEach(([sid, hasAll]) => {
    const sel = document.getElementById(sid);
    if (!sel) return;
    const prev = sel.value;
    sel.innerHTML = hasAll
      ? '<option value="">Todos</option>'
      : '<option value="">Seleccionar...</option>';

    state.executives.forEach(e => {
      const opt = document.createElement('option');
      opt.value = e.id;
      opt.textContent = e.name;
      sel.appendChild(opt);
    });

    // Restaurar valor previo si aún existe
    if ([...sel.options].some(o => o.value === prev)) sel.value = prev;
  });
}

// ══════════════════════════════
// DASHBOARD
// ══════════════════════════════

function renderDashboard() {
  const period  = getCurrentPeriod();
  const stats   = getTeamStats(period);
  const goals   = state.goals;
  const days    = periodDays(period);
  const nExecs  = state.executives.length || 1;
  const mult    = nExecs * days;

  // KPI Cards
  const metaL = goals.llamadas_d * mult;
  const metaD = goals.demos_re_d * mult;
  const metaC = goals.cierres_d  * mult;
  const cRate = convRate(stats.llamadas, stats.cierres);

  document.getElementById('kpiGrid').innerHTML = [
    kpiCardHTML('fa-phone',       'purple', 'Llamadas',        stats.llamadas, `Meta equipo: ${metaL}`, stats.llamadas / (metaL || 1) * 100),
    kpiCardHTML('fa-calendar-check','gold', 'Demos Realizadas', stats.demosRe, `Meta equipo: ${metaD}`, stats.demosRe  / (metaD || 1) * 100),
    kpiCardHTML('fa-handshake',   'green',  'Cierres',          stats.cierres, `Meta equipo: ${metaC}`, stats.cierres  / (metaC || 1) * 100),
    kpiCardHTML('fa-percent',     'red',    'Conversión',       cRate + '%',   'Llamadas → Cierres',    cRate)
  ].join('');

  // Team goal progress
  const rows = [
    { label: 'Llamadas',  val: stats.llamadas, meta: goals.llamadas_d * mult },
    { label: 'Demos Ag.', val: stats.demosAg,  meta: goals.demos_ag_d * mult },
    { label: 'Demos Re.', val: stats.demosRe,  meta: goals.demos_re_d * mult },
    { label: 'Cierres',   val: stats.cierres,  meta: goals.cierres_d  * mult }
  ];

  document.getElementById('teamGoalProgress').innerHTML = rows.map(r => {
    const pct = Math.min(100, Math.round(r.val / (r.meta || 1) * 100));
    return `<div style="margin-bottom:14px">
      <div style="display:flex;justify-content:space-between;margin-bottom:5px;font-size:12.5px;">
        <span style="color:var(--text2)">${r.label}</span>
        <span style="font-family:var(--mono);color:var(--text1)">${r.val} <span style="color:var(--text3)">/ ${r.meta}</span></span>
      </div>
      <div class="prog-bar"><div class="prog-fill ${progColor(pct)}" style="width:${pct}%"></div></div>
    </div>`;
  }).join('');

  // Mini ranking
  const ranking = buildRanking(period);
  const mini    = document.getElementById('miniRanking');
  if (!ranking.length) {
    mini.innerHTML = emptyState('fa-users-slash', 'Sin ejecutivos registrados');
  } else {
    mini.innerHTML = ranking.slice(0, 5).map((r, i) => {
      const rc = i === 0 ? 'gold-rank' : i === 1 ? 'silver-rank' : i === 2 ? 'bronze-rank' : '';
      return `<div style="display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--border-soft);">
        <div style="display:flex;align-items:center;gap:8px;">
          <span class="rank-num ${rc}">${i+1}</span>
          <span style="font-size:13px;font-weight:600">${r.name}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;">
          <span style="font-family:var(--mono);font-size:12px;color:var(--text2)">${r.cierres} cierres</span>
          ${statusBadge(r.pct)}
        </div>
      </div>`;
    }).join('');
  }

  // Actividad reciente
  const recent = [...state.activities].slice(0, 8);
  const body   = document.getElementById('recentActivityBody');
  if (!recent.length) {
    body.innerHTML = `<tr><td colspan="7">${emptyState('fa-inbox', 'Sin actividad registrada aún')}</td></tr>`;
  } else {
    body.innerHTML = recent.map(a => activityRowHTML(a, false)).join('');
  }
}

function kpiCardHTML(icon, color, label, value, sub, pct) {
  const p = Math.min(100, Math.max(0, Math.round(pct || 0)));
  return `<div class="kpi-card">
    <div class="kpi-top">
      <div class="kpi-label">${label}</div>
      <div class="kpi-icon ${color}"><i class="fas ${icon}"></i></div>
    </div>
    <div class="kpi-value">${value}</div>
    <div class="kpi-sub">${sub}</div>
    <div class="kpi-bar"><div class="kpi-bar-fill" style="width:${p}%"></div></div>
  </div>`;
}

// ══════════════════════════════
// EJECUTIVOS
// ══════════════════════════════

function buildRanking(period) {
  return state.executives.map(e => {
    const stats = getExecStats(e.id, period);
    const days  = periodDays(period);
    const metaC = period === 'month'
      ? state.goals.cierres_m
      : state.goals.cierres_d * days;
    const pct = metaC ? Math.round(stats.cierres / metaC * 100) : 0;
    return { ...e, ...stats, pct };
  }).sort((a, b) => b.cierres - a.cierres || b.llamadas - a.llamadas);
}

function renderEjecutivos() {
  const period  = getCurrentPeriod();
  const ranking = buildRanking(period);

  // Ranking table
  const body = document.getElementById('rankingTableBody');
  if (!ranking.length) {
    body.innerHTML = `<tr><td colspan="10">${emptyState('fa-users-slash', 'No hay ejecutivos. Agrega el primero.')}</td></tr>`;
  } else {
    body.innerHTML = ranking.map((r, i) => {
      const rc = i === 0 ? 'gold-rank' : i === 1 ? 'silver-rank' : i === 2 ? 'bronze-rank' : '';
      const c  = convRate(r.llamadas, r.cierres);
      return `<tr class="${i === 0 ? 'row-highlight' : ''}">
        <td><span class="rank-num ${rc}">${i+1}</span></td>
        <td><div class="exec-name-cell">
          <div class="avatar">${initials(r.name)}</div>
          <div>
            <div style="font-weight:600">${r.name}</div>
            <div style="font-size:11px;color:var(--text2)">${r.role||''}</div>
          </div>
        </div></td>
        <td class="td-mono">${r.llamadas}</td>
        <td class="td-mono">${r.demosAg}</td>
        <td class="td-mono">${r.demosRe}</td>
        <td class="td-mono"><strong>${r.cierres}</strong></td>
        <td><span class="badge ${c>=10?'badge-green':c>=5?'badge-yellow':'badge-red'}">${c}%</span></td>
        <td>
          <div class="prog-wrap">
            <div class="prog-bar"><div class="prog-fill ${progColor(r.pct)}" style="width:${Math.min(100,r.pct)}%"></div></div>
            <span class="prog-pct">${r.pct}%</span>
          </div>
        </td>
        <td>${statusBadge(r.pct)}</td>
        <td><button class="btn btn-danger btn-sm" onclick="deleteExecutive('${r.id}')"><i class="fas fa-trash"></i></button></td>
      </tr>`;
    }).join('');
  }

  // Cards
  const grid  = document.getElementById('execCardsGrid');
  const goals = state.goals;
  grid.innerHTML = ranking.map(r => {
    const days  = periodDays(period);
    const metaL = period === 'month' ? goals.llamadas_m : goals.llamadas_d * days;
    const metaD = period === 'month' ? goals.demos_re_m : goals.demos_re_d * days;
    const metaC = period === 'month' ? goals.cierres_m  : goals.cierres_d  * days;
    const pL = Math.min(100, Math.round(r.llamadas / (metaL||1) * 100));
    const pD = Math.min(100, Math.round(r.demosRe  / (metaD||1) * 100));
    const pC = Math.min(100, Math.round(r.cierres  / (metaC||1) * 100));

    return `<div class="exec-card">
      <div class="exec-card-header">
        <div class="exec-card-info">
          <div class="avatar">${initials(r.name)}</div>
          <div>
            <div class="exec-card-name">${r.name}</div>
            <div class="exec-card-sub">${r.role||'Ejecutivo Comercial'}</div>
          </div>
        </div>
        ${statusBadge(r.pct)}
      </div>
      <div class="exec-stats-row">
        <div class="exec-stat-block">
          <div class="exec-stat-val">${r.llamadas}</div>
          <div class="exec-stat-lbl">Llamadas</div>
        </div>
        <div class="exec-stat-block">
          <div class="exec-stat-val">${r.demosRe}</div>
          <div class="exec-stat-lbl">Demos</div>
        </div>
        <div class="exec-stat-block" style="background:var(--green-dim)">
          <div class="exec-stat-val" style="color:var(--green)">${r.cierres}</div>
          <div class="exec-stat-lbl">Cierres</div>
        </div>
      </div>
      ${progRowHTML('Llamadas', r.llamadas, metaL, pL)}
      ${progRowHTML('Demos Re.', r.demosRe, metaD, pD)}
      ${progRowHTML('Cierres',   r.cierres, metaC, pC)}
    </div>`;
  }).join('');
}

function progRowHTML(label, val, meta, pct) {
  return `<div class="exec-progress-row">
    <span class="exec-progress-label">${label}</span>
    <div class="prog-wrap" style="flex:1;margin-left:10px;">
      <div class="prog-bar"><div class="prog-fill ${progColor(pct)}" style="width:${pct}%"></div></div>
      <span class="prog-pct">${val}/${meta}</span>
    </div>
  </div>`;
}

// ══════════════════════════════
// ACTIVITY LOG
// ══════════════════════════════

function renderActivityTab() {
  populateExecSelects();
  if (!document.getElementById('actDate').value) {
    document.getElementById('actDate').value = getToday();
  }
  renderActivityLog();
}

function renderActivityLog() {
  const execId = document.getElementById('filterExec').value;
  const from   = document.getElementById('filterFrom').value;
  const to     = document.getElementById('filterTo').value;

  let acts = [...state.activities];
  if (execId) acts = acts.filter(a => a.executive_id === execId);
  if (from)   acts = acts.filter(a => a.date >= from);
  if (to)     acts = acts.filter(a => a.date <= to);

  document.getElementById('activityCount').textContent = `${acts.length} registro(s)`;

  const body = document.getElementById('activityLogBody');
  if (!acts.length) {
    body.innerHTML = `<tr><td colspan="9">${emptyState('fa-inbox', 'Sin registros para los filtros seleccionados.')}</td></tr>`;
    return;
  }

  body.innerHTML = acts.map(a => activityRowHTML(a, true)).join('');
}

function activityRowHTML(a, withActions) {
  const name  = a.executives?.name || '—';
  const c     = convRate(a.llamadas, a.cierres);
  const notas = a.notas
    ? `<span title="${a.notas}" style="cursor:help;color:var(--primary)"><i class="fas fa-note-sticky"></i></span>`
    : '—';

  const actions = withActions ? `
    <td>
      <div style="display:flex;gap:6px;">
        <button class="btn btn-ghost btn-sm" onclick="openEditActivity('${a.id}')"><i class="fas fa-pen"></i></button>
        <button class="btn btn-danger btn-sm" onclick="deleteActivity('${a.id}')"><i class="fas fa-trash"></i></button>
      </div>
    </td>` : '';

  return `<tr>
    <td class="td-mono">${a.date}</td>
    <td><div class="exec-name-cell">
      <div class="avatar" style="width:26px;height:26px;font-size:10px">${initials(name)}</div>
      ${name}
    </div></td>
    <td class="td-mono">${a.llamadas}</td>
    <td class="td-mono">${a.demos_ag}</td>
    <td class="td-mono">${a.demos_re}</td>
    <td class="td-mono"><strong>${a.cierres}</strong></td>
    <td><span class="badge ${c>=10?'badge-green':c>=5?'badge-yellow':'badge-red'}">${c}%</span></td>
    <td>${notas}</td>
    ${actions}
  </tr>`;
}

function clearActivityForm() {
  ['actExec','actLlamadas','actDemosAg','actDemosRe','actCierres','actNotas'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('actDate').value = getToday();
}

function clearFilters() {
  document.getElementById('filterExec').value = '';
  document.getElementById('filterFrom').value = '';
  document.getElementById('filterTo').value   = '';
  renderActivityLog();
}

// ══════════════════════════════
// CONFIG
// ══════════════════════════════

function renderConfig() {
  const g = state.goals;
  document.getElementById('cfgLlamadasD').value = g.llamadas_d;
  document.getElementById('cfgDemosAgD').value  = g.demos_ag_d;
  document.getElementById('cfgDemosReD').value  = g.demos_re_d;
  document.getElementById('cfgCierresD').value  = g.cierres_d;
  document.getElementById('cfgLlamadasM').value = g.llamadas_m;
  document.getElementById('cfgDemosAgM').value  = g.demos_ag_m;
  document.getElementById('cfgDemosReM').value  = g.demos_re_m;
  document.getElementById('cfgCierresM').value  = g.cierres_m;
}

// ══════════════════════════════
// CHARTS
// ══════════════════════════════

const chartInstances = {};

function destroyChart(id) {
  if (chartInstances[id]) { chartInstances[id].destroy(); delete chartInstances[id]; }
}

function renderCharts() {
  populateExecSelects();
  const execIdFilter = document.getElementById('trendExecFilter')?.value || '';

  // Últimos 14 días
  const days   = [];
  for (let i = 13; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().split('T')[0]);
  }
  const labels = days.map(d => d.slice(5));

  const execsToShow = execIdFilter
    ? state.executives.filter(e => e.id === execIdFilter)
    : state.executives;

  const COLORS = ['#820AD1','#F7B500','#00a878','#e03e3e','#6366f1','#ec4899'];

  // Llamadas
  destroyChart('chartLlamadas');
  chartInstances.chartLlamadas = new Chart(
    document.getElementById('chartLlamadas').getContext('2d'), {
      type: 'line',
      data: {
        labels,
        datasets: execsToShow.map((e, i) => ({
          label: e.name,
          data: days.map(d =>
            state.activities
              .filter(a => a.executive_id === e.id && a.date === d)
              .reduce((s, a) => s + (a.llamadas || 0), 0)
          ),
          borderColor: COLORS[i % COLORS.length],
          backgroundColor: COLORS[i % COLORS.length] + '18',
          fill: true, tension: 0.4, pointRadius: 3
        }))
      },
      options: chartOptions()
    }
  );

  // Demos & Cierres
  destroyChart('chartDemos');
  const filterFn = a => execIdFilter ? a.executive_id === execIdFilter : true;
  chartInstances.chartDemos = new Chart(
    document.getElementById('chartDemos').getContext('2d'), {
      type: 'bar',
      data: {
        labels,
        datasets: [
          { label: 'Demos Ag.',  data: days.map(d => state.activities.filter(filterFn).filter(a => a.date===d).reduce((s,a) => s+(a.demos_ag||0),0)), backgroundColor: COLORS[1]+'88', borderRadius: 4 },
          { label: 'Demos Re.',  data: days.map(d => state.activities.filter(filterFn).filter(a => a.date===d).reduce((s,a) => s+(a.demos_re||0),0)), backgroundColor: COLORS[0]+'88', borderRadius: 4 },
          { label: 'Cierres',    data: days.map(d => state.activities.filter(filterFn).filter(a => a.date===d).reduce((s,a) => s+(a.cierres||0),0)), backgroundColor: COLORS[2]+'cc', borderRadius: 4 }
        ]
      },
      options: chartOptions()
    }
  );

  // Conversión por ejecutivo
  destroyChart('chartConversion');
  chartInstances.chartConversion = new Chart(
    document.getElementById('chartConversion').getContext('2d'), {
      type: 'bar',
      data: {
        labels: execsToShow.map(e => e.name),
        datasets: [{
          label: 'Conversión (%)',
          data: execsToShow.map(e => {
            const s = getExecStats(e.id, 'month');
            return s.llamadas ? Math.round(s.cierres / s.llamadas * 100) : 0;
          }),
          backgroundColor: execsToShow.map(e => {
            const s = getExecStats(e.id, 'month');
            const v = s.llamadas ? Math.round(s.cierres/s.llamadas*100) : 0;
            return v >= 10 ? COLORS[2]+'bb' : v >= 5 ? COLORS[1]+'bb' : COLORS[3]+'bb';
          }),
          borderRadius: 6
        }]
      },
      options: chartOptions(false)
    }
  );

  // Cierres por ejecutivo
  destroyChart('chartCierres');
  chartInstances.chartCierres = new Chart(
    document.getElementById('chartCierres').getContext('2d'), {
      type: 'bar',
      data: {
        labels: execsToShow.map(e => e.name),
        datasets: [{
          label: 'Cierres (mes)',
          data: execsToShow.map(e => getExecStats(e.id, 'month').cierres),
          backgroundColor: COLORS[0] + 'aa',
          borderRadius: 6
        }]
      },
      options: chartOptions(false)
    }
  );
}

function chartOptions(legend = true) {
  return {
    responsive: true,
    maintainAspectRatio: false,
    interaction: { mode: 'index', intersect: false },
    plugins: {
      legend: {
        display: legend,
        labels: {
          color: '#6B5E80',
          font: { family: 'Montserrat', size: 11 },
          boxWidth: 12, padding: 12
        }
      }
    },
    scales: {
      x: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#B0A0C8', font: { size: 11 } } },
      y: { grid: { color: 'rgba(0,0,0,0.05)' }, ticks: { color: '#B0A0C8', font: { size: 11 } } }
    }
  };
}

// ══════════════════════════════
// EXPORT / IMPORT
// ══════════════════════════════

function exportCSV() {
  const rows = [['Fecha','Ejecutivo','Cargo','Llamadas','Demos Agendadas','Demos Realizadas','Cierres','Conversión (%)','Notas']];
  state.activities.forEach(a => {
    rows.push([
      a.date,
      a.executives?.name || '',
      a.executives?.role || '',
      a.llamadas, a.demos_ag, a.demos_re, a.cierres,
      convRate(a.llamadas, a.cierres),
      (a.notas||'').replace(/,/g,' ')
    ]);
  });
  downloadFile('DomoNow_actividad.csv', 'text/csv', rows.map(r => r.join(',')).join('\n'));
  notify('CSV exportado.');
}

function exportJSON() {
  downloadFile('DomoNow_backup.json', 'application/json', JSON.stringify(state, null, 2));
  notify('Backup JSON exportado.');
}

function downloadFile(name, type, content) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([content], { type }));
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

// ══════════════════════════════
// EMPTY STATE
// ══════════════════════════════

function emptyState(icon, text) {
  return `<div class="empty-state"><i class="fas ${icon}"></i><p>${text}</p></div>`;
}
