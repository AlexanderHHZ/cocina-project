import { createSupabaseServer } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// GET /auth/callback?code=xxx
// Supabase redirige aquí después de confirmar email
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');

  if (code) {
    const supabase = await createSupabaseServer();
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Redirigir al inicio después de confirmar
  return NextResponse.redirect(`${origin}/`);
}
