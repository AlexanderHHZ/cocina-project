import { createSupabaseServer } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';

// GET /api/search?q=pollo
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = searchParams.get('q') ?? '';

  if (!q.trim()) {
    return NextResponse.json({ recipes: [] });
  }

  const supabase = await createSupabaseServer();

  const { data, error } = await supabase
    .from('recipes')
    .select('id, title, slug, description, image_url, difficulty, prep_time')
    .or(`title.ilike.%${q}%,ingredients.cs.{${q}}`)
    .order('created_at', { ascending: false })
    .limit(10);

  if (error) {
    return NextResponse.json({ recipes: [], error: error.message }, { status: 500 });
  }

  return NextResponse.json({ recipes: data });
}
