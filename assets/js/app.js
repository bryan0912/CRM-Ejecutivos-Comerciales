/* ═══════════════════════════════════════
   DOMONOW CRM — app.js
   ─────────────────────────────────────
   Lógica principal de la aplicación.
   Orquesta db.js (datos) y ui.js (render).

   Flujo:
   1. init() carga todo desde Supabase
   2. Las acciones del usuario llaman
      funciones de db.js y luego recargan
      el estado y re-renderizan con ui.js
═══════════════════════════════════════ */

// ══════════════════════════════
// INIT — punto de entrada
// ══════════════════════════════

async function init() {
  showLoading('Conectando con Supabase...');

  try {
    // 1. Cargar datos en paralelo
    const [executives, activities, goals] = await Promise.all([
      dbGetExecutives(),
      dbGetActivities(),
      dbGetGoals()
    ]);

    // 2. Actualizar estado global
    state.executives = executives;
    state.activities = activities;
    state.goals      = goals || DEFAULT_GOALS;

    // 3. Pintar fecha de hoy
    const opts = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    document.getElementById('todayLabel').textContent =
      new Date().toLocaleDateString('es-CO', opts);

    // 4. Poblar selects con ejecutivos
    populateExecSelects();

    // 5. Render inicial
    renderDashboard();

  } catch (err) {
    console.error('[app] init error:', err);
    notify('Error al conectar con la base de datos. Revisa config.js', 'error');
  } finally {
    hideLoading();
  }
}

// ══════════════════════════════
// EXECUTIVES
// ══════════════════════════════

function openAddExecModal() {
  document.getElementById('newExecName').value = '';
  document.getElementById('newExecRole').value = '';
  openModal('modalAddExec');
}

async function addExecutive() {
  const name = document.getElementById('newExecName').value.trim();
  const role = document.getElementById('newExecRole').value.trim() || 'Ejecutivo Comercial';

  if (!name) { notify('El nombre es obligatorio.', 'error'); return; }

  showLoading('Guardando ejecutivo...');
  const result = await dbInsertExecutive(name, role);
  hideLoading();

  if (!result) { notify('Error al guardar el ejecutivo.', 'error'); return; }

  state.executives.push(result);
  closeModal('modalAddExec');
  populateExecSelects();
  renderEjecutivos();
  notify(`${name} agregado correctamente.`);
}

async function deleteExecutive(id) {
  const exec = state.executives.find(e => e.id === id);
  if (!confirm(`¿Eliminar a ${exec?.name}? También se borrará toda su actividad.`)) return;

  showLoading('Eliminando...');
  const ok = await dbDeleteExecutive(id);
  hideLoading();

  if (!ok) { notify('Error al eliminar.', 'error'); return; }

  // Actualizar estado local
  state.executives = state.executives.filter(e => e.id !== id);
  state.activities = state.activities.filter(a => a.executive_id !== id);
  populateExecSelects();
  renderEjecutivos();
  notify('Ejecutivo eliminado.');
}

// ══════════════════════════════
// ACTIVITIES
// ══════════════════════════════

async function saveActivity() {
  const execId = document.getElementById('actExec').value;
  const date   = document.getElementById('actDate').value;

  if (!execId) { notify('Selecciona un ejecutivo.', 'error'); return; }
  if (!date)   { notify('Selecciona una fecha.', 'error');    return; }

  const entry = {
    executiveId: execId,
    date,
    llamadas: parseInt(document.getElementById('actLlamadas').value) || 0,
    demosAg:  parseInt(document.getElementById('actDemosAg').value)  || 0,
    demosRe:  parseInt(document.getElementById('actDemosRe').value)  || 0,
    cierres:  parseInt(document.getElementById('actCierres').value)  || 0,
    notas:    document.getElementById('actNotas').value.trim()
  };

  showLoading('Guardando actividad...');
  const result = await dbInsertActivity(entry);
  hideLoading();

  if (!result) { notify('Error al guardar la actividad.', 'error'); return; }

  // Insertar al inicio del array local (más reciente primero)
  state.activities.unshift(result);
  clearActivityForm();
  renderActivityLog();
  notify('Actividad guardada correctamente.');
}

function openEditActivity(id) {
  const a = state.activities.find(x => x.id === id);
  if (!a) return;

  document.getElementById('editActivityId').value = id;
  document.getElementById('editLlamadas').value   = a.llamadas;
  document.getElementById('editDemosAg').value    = a.demos_ag;
  document.getElementById('editDemosRe').value    = a.demos_re;
  document.getElementById('editCierres').value    = a.cierres;
  document.getElementById('editNotas').value      = a.notas || '';
  openModal('modalEditActivity');
}

async function updateActivity() {
  const id = document.getElementById('editActivityId').value;

  const fields = {
    llamadas: parseInt(document.getElementById('editLlamadas').value) || 0,
    demosAg:  parseInt(document.getElementById('editDemosAg').value)  || 0,
    demosRe:  parseInt(document.getElementById('editDemosRe').value)  || 0,
    cierres:  parseInt(document.getElementById('editCierres').value)  || 0,
    notas:    document.getElementById('editNotas').value.trim()
  };

  showLoading('Actualizando...');
  const result = await dbUpdateActivity(id, fields);
  hideLoading();

  if (!result) { notify('Error al actualizar.', 'error'); return; }

  // Actualizar en estado local
  const idx = state.activities.findIndex(a => a.id === id);
  if (idx !== -1) state.activities[idx] = result;

  closeModal('modalEditActivity');
  renderActivityLog();
  notify('Actividad actualizada.');
}

async function deleteActivity(id) {
  if (!confirm('¿Eliminar esta entrada?')) return;

  showLoading('Eliminando...');
  const ok = await dbDeleteActivity(id);
  hideLoading();

  if (!ok) { notify('Error al eliminar.', 'error'); return; }

  state.activities = state.activities.filter(a => a.id !== id);
  renderActivityLog();
  notify('Entrada eliminada.');
}

// ══════════════════════════════
// GOALS / CONFIG
// ══════════════════════════════

async function saveConfig() {
  const goals = {
    llamadas_d: parseInt(document.getElementById('cfgLlamadasD').value) || 0,
    demos_ag_d: parseInt(document.getElementById('cfgDemosAgD').value)  || 0,
    demos_re_d: parseInt(document.getElementById('cfgDemosReD').value)  || 0,
    cierres_d:  parseInt(document.getElementById('cfgCierresD').value)  || 0,
    llamadas_m: parseInt(document.getElementById('cfgLlamadasM').value) || 0,
    demos_ag_m: parseInt(document.getElementById('cfgDemosAgM').value)  || 0,
    demos_re_m: parseInt(document.getElementById('cfgDemosReM').value)  || 0,
    cierres_m:  parseInt(document.getElementById('cfgCierresM').value)  || 0
  };

  showLoading('Guardando metas...');
  const ok = await dbUpsertGoals(goals);
  hideLoading();

  if (!ok) { notify('Error al guardar la configuración.', 'error'); return; }

  state.goals = goals;
  notify('Configuración guardada.');
}

// ══════════════════════════════
// IMPORT JSON
// ══════════════════════════════

function importJSON(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async ev => {
    try {
      const data = JSON.parse(ev.target.result);
      if (!data.executives || !data.activities) {
        notify('Formato de archivo no válido.', 'error');
        return;
      }

      notify('Archivo leído. La importación directa a Supabase requiere el panel de administración.', 'error');
      // TODO: Implementar importación masiva a Supabase
      // usando db.js con inserts en batch cuando sea necesario

    } catch { notify('Error al leer el archivo.', 'error'); }
  };
  reader.readAsText(file);
  e.target.value = '';
}

// ══════════════════════════════
// RESET
// ══════════════════════════════

function confirmReset() { openModal('modalReset'); }

async function resetAll() {
  // Con Supabase el reset limpia solo el estado local
  // Para borrar datos de la base, usa el panel de Supabase
  state.executives = [];
  state.activities = [];
  state.goals      = { ...DEFAULT_GOALS };
  closeModal('modalReset');
  populateExecSelects();
  renderDashboard();
  notify('Vista limpiada. Los datos en Supabase no se modificaron.');
}

// ══════════════════════════════
// ARRANCAR
// ══════════════════════════════
init();
