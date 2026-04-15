import { createSupabaseServer } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
 
// GET /auth/callback?code=xxx
// Supabase redirige aquí después de confirmar email o recovery
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const type = searchParams.get('type');
 
  if (code) {
    const supabase = await createSupabaseServer();
    await supabase.auth.exchangeCodeForSession(code);
 
    // Si es recuperación de contraseña, redirigir a la página de reset
    if (type === 'recovery') {
      return NextResponse.redirect(`${origin}/auth/reset-password`);
    }
  }
 
  // Redirigir al inicio después de confirmar email
  return NextResponse.redirect(`${origin}/`);
}