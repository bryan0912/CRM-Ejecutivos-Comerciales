/* ═══════════════════════════════════════
   DOMONOW CRM — config.js
   ─────────────────────────────────────
   ⚠️  IMPORTANTE:
   1. Reemplaza los valores SUPABASE_URL y SUPABASE_KEY
      con los de tu proyecto en supabase.com
   2. Este archivo está en .gitignore
      NO lo subas a GitHub con las keys reales
   3. Usa config.example.js como referencia
      para el repositorio
═══════════════════════════════════════ */

// ── Credenciales Supabase ──
// Encuéntralas en: Project Settings → API
const SUPABASE_URL = 'https://bklqmgyceftlsaftfdch.supabase.co';
const SUPABASE_KEY = 'sb_publishable_M5ckPfdiGN7HsCPCVHDBQw_mB4cO1z0';

// ── Cliente Supabase ──
// Disponible globalmente como `sb` en todos los archivos JS
const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

// ── Estado global de la app ──
// Todos los módulos leen y escriben aquí
const state = {
  executives: [],
  activities: [],
  goals: {
    llamadas_d: 30,
    demos_ag_d: 5,
    demos_re_d: 3,
    cierres_d:  1,
    llamadas_m: 600,
    demos_ag_m: 100,
    demos_re_m: 60,
    cierres_m:  20
  },
  loading: false
};

// ── Metas por defecto ──
// Se usan si no hay registro en la tabla goals de Supabase
const DEFAULT_GOALS = {
  llamadas_d: 30,
  demos_ag_d: 5,
  demos_re_d: 3,
  cierres_d:  1,
  llamadas_m: 600,
  demos_ag_m: 100,
  demos_re_m: 60,
  cierres_m:  20
};
