// ============================================
// Cliente Supabase para SERVER (Server Components, Route Handlers)
// ============================================
// REGLA: Usa cookies() de Next.js para manejar la sesión.
// Se crea una instancia nueva en cada request (stateless).

import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function createSupabaseServer() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            // setAll puede fallar en Server Components (read-only).
            // Esto es esperado — el middleware se encarga de refrescar.
          }
        },
      },
    }
  );
}
