// ============================================
// Cliente Supabase para BROWSER (Client Components)
// ============================================
// REGLA: Este es el ÚNICO cliente para componentes del navegador.
// NUNCA llamar createClient() directamente en componentes.

import { createBrowserClient } from '@supabase/ssr';

export function createSupabaseBrowser() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
