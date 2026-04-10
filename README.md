# 🍳 Mi Cocina — Blog Gastronómico

Web moderna para un canal de cocina. Publicar recetas, subir fotos/videos, sistema de usuarios con likes, comentarios y favoritos.

## Stack

- **Next.js 14** (App Router + Turbopack)
- **Supabase** (Auth + PostgreSQL + Storage + Realtime)
- **Tailwind CSS**
- **TypeScript**

---

## Arquitectura

```
┌─────────────────────────────────────────────────┐
│                   BROWSER                       │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Navbar   │  │ LikeBtn  │  │ CommentSection│  │
│  │ (client) │  │ (client) │  │  (client+RT) │  │
│  └────┬─────┘  └────┬─────┘  └──────┬───────┘  │
│       │              │               │          │
│       └──────────────┴───────────────┘          │
│                      │                          │
│            supabase-browser.ts                  │
│            (ÚNICO cliente browser)              │
└──────────────────────┬──────────────────────────┘
                       │ cookies
┌──────────────────────┴──────────────────────────┐
│                  MIDDLEWARE                      │
│         middleware.ts (refresca sesión)          │
└──────────────────────┬──────────────────────────┘
                       │
┌──────────────────────┴──────────────────────────┐
│                   SERVER                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│  │ Home     │  │ Recetas  │  │ RecipeDetail │  │
│  │ (RSC)    │  │ (RSC)    │  │    (RSC)     │  │
│  └────┬─────┘  └────┬─────┘  └──────┬───────┘  │
│       └──────────────┴───────────────┘          │
│                      │                          │
│            supabase-server.ts                   │
│            (ÚNICO cliente server)               │
└──────────────────────┬──────────────────────────┘
                       │
              ┌────────┴────────┐
              │    SUPABASE     │
              │  PostgreSQL     │
              │  Auth / Storage │
              │  Realtime       │
              └─────────────────┘
```

### Regla de clientes Supabase

| Entorno    | Archivo               | Uso                              |
|------------|-----------------------|----------------------------------|
| Browser    | `supabase-browser.ts` | Componentes `'use client'`       |
| Server     | `supabase-server.ts`  | Server Components, Route Handlers|
| Middleware | `middleware.ts`       | Refresco de sesión (inline)      |

**NUNCA** se usa `createClient()` directamente en componentes.

---

## Estructura de carpetas

```
cocina-project/
├── app/
│   ├── globals.css
│   ├── layout.tsx              # Root layout
│   ├── auth/
│   │   ├── login/page.tsx      # Login
│   │   ├── register/page.tsx   # Registro
│   │   └── callback/route.ts   # Confirmación email
│   ├── (main)/                 # Grupo con Navbar+Footer
│   │   ├── layout.tsx
│   │   ├── page.tsx            # Inicio
│   │   ├── recetas/
│   │   │   ├── page.tsx        # Listado + búsqueda
│   │   │   └── [id]/page.tsx   # Detalle receta
│   │   ├── favoritos/page.tsx
│   │   ├── perfil/page.tsx
│   │   ├── admin/page.tsx      # Panel admin
│   │   ├── sobre-mi/page.tsx
│   │   ├── contacto/page.tsx
│   │   ├── login/page.tsx      # Redirect → /auth/login
│   │   └── register/page.tsx   # Redirect → /auth/register
│   └── api/
│       └── search/route.ts     # API búsqueda
├── components/
│   ├── layout/
│   │   ├── Navbar.tsx
│   │   └── Footer.tsx
│   └── recetas/
│       ├── RecipeCard.tsx
│       ├── LikeButton.tsx
│       ├── FavoriteButton.tsx
│       └── CommentSection.tsx
├── lib/
│   ├── supabase-browser.ts
│   └── supabase-server.ts
├── types/
│   └── index.ts
├── middleware.ts
├── supabase-schema.sql         # ← Ejecutar en Supabase
├── .env.local
└── package.json
```

---

## Guía de instalación paso a paso

### 1. Crear proyecto en Supabase

1. Ve a [supabase.com/dashboard](https://supabase.com/dashboard)
2. Click **"New Project"**
3. Dale un nombre (ej: `mi-cocina`)
4. Elige contraseña para la DB y región
5. Espera a que se cree (~2 min)

### 2. Obtener las variables de entorno

1. En tu proyecto de Supabase, ve a **Settings → API**
2. Copia:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
3. Pégalas en el archivo `.env.local`

### 3. Ejecutar el esquema SQL

1. En Supabase, ve a **SQL Editor**
2. Click **"New query"**
3. Copia TODO el contenido de `supabase-schema.sql`
4. Click **"Run"**
5. Debe ejecutarse sin errores

### 4. (Opcional) Desactivar confirmación de email para desarrollo

Para que los usuarios se registren sin confirmar email:

1. En Supabase, ve a **Authentication → Providers → Email**
2. Desactiva **"Confirm email"**
3. Click **Save**

### 5. Instalar y ejecutar

```bash
# Instalar dependencias
npm install

# Limpiar cache (por si acaso)
rm -rf .next

# Ejecutar en modo desarrollo con Turbopack
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000)

### 6. Crear tu usuario admin

1. Regístrate desde la web (http://localhost:3000/register)
2. Ve a Supabase → **SQL Editor** y ejecuta:

```sql
UPDATE public.profiles SET is_admin = true WHERE email = 'tu@email.com';
```

3. Ahora puedes acceder a [http://localhost:3000/admin](http://localhost:3000/admin)

---

## Solución de problemas

### La sesión no persiste / se cierra sola
- Verifica que `middleware.ts` esté en la **raíz** del proyecto (junto a `package.json`)
- Limpia cache: `rm -rf .next && npm run dev`

### Error "relation does not exist"
- Asegúrate de haber ejecutado TODO el SQL en Supabase SQL Editor

### Las imágenes no cargan
- Verifica que los buckets `recipe-images` y `recipe-videos` existan en **Storage**
- Asegúrate de que sean **públicos**

### Error 401 / No autenticado
- Las variables en `.env.local` deben empezar con `NEXT_PUBLIC_`
- Reinicia el servidor después de cambiar `.env.local`

---

## Funcionalidades implementadas

- [x] Autenticación completa (registro, login, logout, sesión persistente)
- [x] Middleware de sesión con @supabase/ssr
- [x] Navbar responsive con estado auth dinámico
- [x] Menú hamburguesa móvil
- [x] Buscador por título e ingredientes
- [x] Sistema de recetas CRUD (admin)
- [x] Likes con optimistic updates
- [x] Favoritos
- [x] Comentarios con Realtime
- [x] Subida de imágenes y videos (Storage)
- [x] Panel de administración
- [x] Diseño mobile-first con Tailwind
- [x] RLS (Row Level Security) en todas las tablas
- [x] Turbopack para desarrollo rápido
