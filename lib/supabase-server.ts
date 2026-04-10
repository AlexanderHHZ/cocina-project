// ============================================
// Cliente Supabase para SERVER (Server Components, Route Handlers)
// ============================================
// REGLA: Usa cookies() de Next.js para manejar la sesión.
// Se crea una instancia nueva en cada request (stateless).

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Tipo para cookies (evita errores de TypeScript en producción)
type CookieToSet = {
  name: string;
  value: string;
  options?: any;
};

export function createSupabaseServer() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },

        setAll(cookiesToSet: CookieToSet[]) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // En Server Components puede fallar (read-only cookies)
            // Es normal, el middleware se encarga del refresh
          }
        },
      },
    }
  );
}