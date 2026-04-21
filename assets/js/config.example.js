/* ═══════════════════════════════════════
   DOMONOW CRM — config.example.js
   ─────────────────────────────────────
   Este archivo SÍ va a GitHub.
   Es la plantilla pública de config.js.

   Para usar:
   1. Copia este archivo como config.js
      cp config.example.js config.js
   2. Reemplaza los valores con los reales
      de tu proyecto en supabase.com
═══════════════════════════════════════ */

const SUPABASE_URL = 'https://bklqmgyceftlsaftfdch.supabase.co';
const SUPABASE_KEY = 'sb_publishable_M5ckPfdiGN7HsCPCVHDBQw_mB4cO1z0';

const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

const state = {
  executives: [],
  activities: [],
  goals: {}
};

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
