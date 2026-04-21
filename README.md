# DomoNow CRM

Tablero de control comercial para gestión de ejecutivos de ventas.
Stack: HTML · CSS · JavaScript · Supabase · Vercel

---

## Estructura del proyecto

```
domonow-crm/
├── index.html              ← Estructura HTML
├── vercel.json             ← Configuración de Vercel
├── .gitignore              ← Excluye config.js del repo
├── README.md
└── assets/
    ├── css/
    │   └── styles.css      ← Todo el CSS (tema claro DomoNow)
    └── js/
        ├── config.js       ← ⚠️ Credenciales Supabase (NO subir)
        ├── config.example.js ← Plantilla de config sin keys
        ├── db.js           ← Operaciones con Supabase
        ├── ui.js           ← Render del DOM
        └── app.js          ← Lógica principal
```

---

## 1. Configurar Supabase

### Crear las tablas

Entra a **supabase.com → tu proyecto → SQL Editor** y ejecuta:

```sql
-- Ejecutivos
create table executives (
  id         uuid default gen_random_uuid() primary key,
  name       text not null,
  role       text default 'Ejecutivo Comercial',
  created_at timestamp with time zone default now()
);

-- Actividad diaria
create table activities (
  id           uuid default gen_random_uuid() primary key,
  executive_id uuid references executives(id) on delete cascade,
  date         date not null,
  llamadas     int  default 0,
  demos_ag     int  default 0,
  demos_re     int  default 0,
  cierres      int  default 0,
  notas        text default '',
  created_at   timestamp with time zone default now()
);

-- Metas globales (siempre una sola fila con id=1)
create table goals (
  id          int  primary key default 1,
  llamadas_d  int  default 30,
  demos_ag_d  int  default 5,
  demos_re_d  int  default 3,
  cierres_d   int  default 1,
  llamadas_m  int  default 600,
  demos_ag_m  int  default 100,
  demos_re_m  int  default 60,
  cierres_m   int  default 20
);

-- Insertar fila inicial de metas
insert into goals (id) values (1);
```

### Habilitar acceso público (Row Level Security)

```sql
-- Ejecutivos
alter table executives enable row level security;
create policy "public_access" on executives for all using (true) with check (true);

-- Actividades
alter table activities enable row level security;
create policy "public_access" on activities for all using (true) with check (true);

-- Metas
alter table goals enable row level security;
create policy "public_access" on goals for all using (true) with check (true);
```

> ⚠️ Estas políticas permiten acceso total sin autenticación.
> Son adecuadas para uso interno de equipo.
> Si necesitas login por usuario, consulta Supabase Auth.

---

## 2. Configurar credenciales locales

Copia el archivo de ejemplo:

```bash
cp assets/js/config.example.js assets/js/config.js
```

Edita `assets/js/config.js` con tus datos reales:

```js
const SUPABASE_URL = 'https://TU_PROJECT_ID.supabase.co';
const SUPABASE_KEY = 'TU_ANON_PUBLIC_KEY';
```

Encuéntralos en: **Supabase → Project Settings → API**

> `config.js` está en `.gitignore`. Nunca se sube a GitHub.

---

## 3. Probar en local

Abre `index.html` directamente en el navegador.

> Nota: algunos navegadores bloquean módulos JS con `file://`.
> Si hay problemas, usa la extensión **Live Server** de VS Code.

---

## 4. Desplegar en Vercel

### Opción A — Desde GitHub (recomendada)

1. Sube el proyecto a GitHub
2. Ve a **vercel.com → New Project**
3. Importa tu repositorio
4. Vercel detecta automáticamente que es un sitio estático
5. Haz clic en **Deploy**

### Sobre config.js en Vercel

Como `config.js` no está en GitHub (está en `.gitignore`),
tienes dos opciones:

**Opción simple:** Agrega `config.js` manualmente al repo solo
con las variables (la anon key de Supabase es pública por diseño).

**Opción avanzada:** Crea un paso de build en Vercel que genere
`config.js` desde variables de entorno.

Para la opción avanzada, en Vercel agrega:
```
Settings → Environment Variables:
SUPABASE_URL = https://xxxxx.supabase.co
SUPABASE_KEY = tu-anon-key
```

Y crea un `build.sh`:
```bash
#!/bin/bash
echo "const SUPABASE_URL = '${SUPABASE_URL}';" > assets/js/config.js
echo "const SUPABASE_KEY = '${SUPABASE_KEY}';" >> assets/js/config.js
echo "const sb = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);" >> assets/js/config.js
echo "const state = { executives: [], activities: [], goals: {} };" >> assets/js/config.js
echo "const DEFAULT_GOALS = { llamadas_d:30,demos_ag_d:5,demos_re_d:3,cierres_d:1,llamadas_m:600,demos_ag_m:100,demos_re_m:60,cierres_m:20 };" >> assets/js/config.js
```

En `vercel.json` agrega:
```json
{
  "buildCommand": "bash build.sh"
}
```

---

## 5. Estructura de archivos JS

| Archivo | Responsabilidad |
|---|---|
| `config.js` | Credenciales + estado global (`state`) |
| `db.js` | Solo habla con Supabase. Sin DOM. |
| `ui.js` | Solo pinta en pantalla. Sin Supabase. |
| `app.js` | Orquesta db.js + ui.js. Maneja eventos. |

**Regla de oro:** Si necesitas cambiar algo visual → `ui.js`.
Si cambia la base de datos → `db.js`. Si cambia la lógica → `app.js`.

---

## Métricas que gestiona el CRM

- **Llamadas / Contactos** — actividad de prospección
- **Demos Agendadas** — reuniones coordinadas
- **Demos Realizadas** — reuniones ejecutadas
- **Cierres / Ventas** — conversiones confirmadas
- **Tasa de conversión** — cierres / llamadas × 100

---

## Colores del sistema

| Color | Uso |
|---|---|
| `#820AD1` Domo (violeta) | Primario, acentos, links |
| `#F7B500` Horizonte (dorado) | KPIs, degradados, énfasis |
| `#F5F4F8` | Fondo general |
| `#FFFFFF` | Cards y sidebar |
