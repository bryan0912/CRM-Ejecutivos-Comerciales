/* ═══════════════════════════════════════
   DOMONOW CRM — db.js
   ─────────────────────────────────────
   Todas las operaciones con Supabase.
   Este archivo NO toca el DOM.
   Solo lee y escribe datos.

   Tablas en Supabase:
   · executives  → id, name, role, created_at
   · activities  → id, executive_id, date,
                   llamadas, demos_ag, demos_re,
                   cierres, notas, created_at
   · goals       → id (siempre 1), llamadas_d,
                   demos_ag_d, demos_re_d, cierres_d,
                   llamadas_m, demos_ag_m, demos_re_m,
                   cierres_m
═══════════════════════════════════════ */

// ══════════════════════════════
// EXECUTIVES
// ══════════════════════════════

/**
 * Trae todos los ejecutivos ordenados por nombre
 */
async function dbGetExecutives() {
  const { data, error } = await sb
    .from('executives')
    .select('*')
    .order('name', { ascending: true });

  if (error) { console.error('[db] getExecutives:', error); return []; }
  return data || [];
}

/**
 * Crea un nuevo ejecutivo
 * @param {string} name
 * @param {string} role
 */
async function dbInsertExecutive(name, role) {
  const { data, error } = await sb
    .from('executives')
    .insert({ name, role })
    .select()
    .single();

  if (error) { console.error('[db] insertExecutive:', error); return null; }
  return data;
}

/**
 * Elimina un ejecutivo y su actividad (cascade en Supabase)
 * @param {string} id
 */
async function dbDeleteExecutive(id) {
  const { error } = await sb
    .from('executives')
    .delete()
    .eq('id', id);

  if (error) { console.error('[db] deleteExecutive:', error); return false; }
  return true;
}

// ══════════════════════════════
// ACTIVITIES
// ══════════════════════════════

/**
 * Trae actividades con join a executives para obtener nombre y cargo
 * Acepta filtros opcionales: execId, from, to
 * @param {Object} filters
 */
async function dbGetActivities(filters = {}) {
  let query = sb
    .from('activities')
    .select(`
      *,
      executives ( name, role )
    `)
    .order('date', { ascending: false })
    .order('created_at', { ascending: false });

  if (filters.execId) query = query.eq('executive_id', filters.execId);
  if (filters.from)   query = query.gte('date', filters.from);
  if (filters.to)     query = query.lte('date', filters.to);

  const { data, error } = await query;

  if (error) { console.error('[db] getActivities:', error); return []; }
  return data || [];
}

/**
 * Inserta una nueva entrada de actividad diaria
 * @param {Object} entry - { executiveId, date, llamadas, demosAg, demosRe, cierres, notas }
 */
async function dbInsertActivity(entry) {
  const { data, error } = await sb
    .from('activities')
    .insert({
      executive_id: entry.executiveId,
      date:         entry.date,
      llamadas:     entry.llamadas  || 0,
      demos_ag:     entry.demosAg   || 0,
      demos_re:     entry.demosRe   || 0,
      cierres:      entry.cierres   || 0,
      notas:        entry.notas     || ''
    })
    .select(`*, executives(name, role)`)
    .single();

  if (error) { console.error('[db] insertActivity:', error); return null; }
  return data;
}

/**
 * Actualiza una entrada de actividad existente
 * @param {string} id
 * @param {Object} fields
 */
async function dbUpdateActivity(id, fields) {
  const { data, error } = await sb
    .from('activities')
    .update({
      llamadas: fields.llamadas || 0,
      demos_ag: fields.demosAg  || 0,
      demos_re: fields.demosRe  || 0,
      cierres:  fields.cierres  || 0,
      notas:    fields.notas    || ''
    })
    .eq('id', id)
    .select(`*, executives(name, role)`)
    .single();

  if (error) { console.error('[db] updateActivity:', error); return null; }
  return data;
}

/**
 * Elimina una entrada de actividad
 * @param {string} id
 */
async function dbDeleteActivity(id) {
  const { error } = await sb
    .from('activities')
    .delete()
    .eq('id', id);

  if (error) { console.error('[db] deleteActivity:', error); return false; }
  return true;
}

// ══════════════════════════════
// GOALS
// ══════════════════════════════

/**
 * Trae las metas globales (siempre fila id=1)
 */
async function dbGetGoals() {
  const { data, error } = await sb
    .from('goals')
    .select('*')
    .eq('id', 1)
    .single();

  if (error) {
    // Si no existe la fila, devuelve los defaults
    console.warn('[db] goals row not found, using defaults');
    return null;
  }

  return data;
}

/**
 * Guarda (upsert) las metas globales
 * @param {Object} goals
 */
async function dbUpsertGoals(goals) {
  const { data, error } = await sb
    .from('goals')
    .upsert({
      id:          1,
      llamadas_d:  goals.llamadas_d,
      demos_ag_d:  goals.demos_ag_d,
      demos_re_d:  goals.demos_re_d,
      cierres_d:   goals.cierres_d,
      llamadas_m:  goals.llamadas_m,
      demos_ag_m:  goals.demos_ag_m,
      demos_re_m:  goals.demos_re_m,
      cierres_m:   goals.cierres_m
    })
    .select()
    .single();

  if (error) { console.error('[db] upsertGoals:', error); return false; }
  return true;
}

// ══════════════════════════════
// HELPERS DE FILTRO LOCAL
// (operan sobre state.activities ya cargadas)
// ══════════════════════════════

function getToday() {
  return new Date().toISOString().split('T')[0];
}

function getThisMonth() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}`;
}

function getThisWeekRange() {
  const now = new Date();
  const day  = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1);
  const mon  = new Date(now);
  mon.setDate(diff);
  const sun  = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  return {
    from: mon.toISOString().split('T')[0],
    to:   sun.toISOString().split('T')[0]
  };
}

/**
 * Filtra las actividades del estado local por período
 * @param {string} period - 'today' | 'week' | 'month'
 * @param {string|null} execId
 */
function filterActivitiesByPeriod(period, execId = null) {
  let acts = [...state.activities];

  if (execId) acts = acts.filter(a => a.executive_id === execId);

  const today = getToday();
  const month = getThisMonth();
  const week  = getThisWeekRange();

  if (period === 'today') return acts.filter(a => a.date === today);
  if (period === 'week')  return acts.filter(a => a.date >= week.from && a.date <= week.to);
  if (period === 'month') return acts.filter(a => a.date.startsWith(month));

  return acts;
}

/**
 * Suma las métricas de un array de actividades
 * @param {Array} acts
 */
function sumActivities(acts) {
  return acts.reduce((acc, a) => ({
    llamadas: acc.llamadas + (a.llamadas  || 0),
    demosAg:  acc.demosAg  + (a.demos_ag  || 0),
    demosRe:  acc.demosRe  + (a.demos_re  || 0),
    cierres:  acc.cierres  + (a.cierres   || 0)
  }), { llamadas: 0, demosAg: 0, demosRe: 0, cierres: 0 });
}

/**
 * Obtiene las estadísticas de un ejecutivo para un período
 */
function getExecStats(execId, period) {
  return sumActivities(filterActivitiesByPeriod(period, execId));
}

/**
 * Obtiene las estadísticas del equipo para un período
 */
function getTeamStats(period) {
  return sumActivities(filterActivitiesByPeriod(period));
}
