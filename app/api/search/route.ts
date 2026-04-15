import { createSupabaseServer } from '@/lib/supabase-server';
import { NextResponse } from 'next/server';
 
// GET /api/search?q=pollo      → buscar recetas (rankeadas)
// GET /api/search?q=            → recetas populares (más likes)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const q = (searchParams.get('q') ?? '').trim();
 
  const supabase = await createSupabaseServer();
 
  // ── Sin query → devolver populares ──
  if (!q) {
    const { data: popular } = await supabase
      .from('recipes')
      .select(`
        id, title, slug, thumbnail_url, image_url, difficulty, prep_time,
        likes_count:likes(count)
      `)
      .order('created_at', { ascending: false })
      .limit(20);
 
    const sorted = (popular ?? [])
      .map((r: any) => ({ ...r, likes_count: r.likes_count?.[0]?.count ?? 0 }))
      .sort((a: any, b: any) => b.likes_count - a.likes_count)
      .slice(0, 5);
 
    return NextResponse.json({ recipes: sorted, type: 'popular' });
  }
 
  // ── Con query → buscar por título + ingredientes ──
  // Normalizar (sin acentos)
  const qLower = q.toLowerCase();
  const qNorm = qLower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
 
  // Traer recetas que coincidan por título con ilike
  // Para ingredientes: Supabase `cs` solo busca match exacto del elemento,
  // no funciona para buscar "ajo" dentro de "3 dientes de ajo".
  // Solución: traer un set más amplio y filtrar en JS.
  const { data: byTitle } = await supabase
    .from('recipes')
    .select(`
      id, title, slug, description, thumbnail_url, image_url, difficulty, prep_time,
      ingredients,
      likes_count:likes(count)
    `)
    .ilike('title', `%${q}%`)
    .limit(10);
 
  // También traer recetas para buscar en ingredientes (las que no salieron por título)
  const titleIds = new Set((byTitle ?? []).map((r: any) => r.id));
 
  const { data: allRecipes } = await supabase
    .from('recipes')
    .select(`
      id, title, slug, description, thumbnail_url, image_url, difficulty, prep_time,
      ingredients,
      likes_count:likes(count)
    `)
    .limit(100);
 
  // Filtrar por ingredientes en JS (busca parcial dentro de cada ingrediente)
  const byIngredients = (allRecipes ?? []).filter((r: any) => {
    if (titleIds.has(r.id)) return false; // ya está en resultados de título
    if (!Array.isArray(r.ingredients)) return false;
    return r.ingredients.some((ing: string) => {
      const ingLower = ing.toLowerCase();
      const ingNorm = ingLower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      return ingLower.includes(qLower) || ingNorm.includes(qNorm);
    });
  });
 
  // Combinar resultados
  const combined = [...(byTitle ?? []), ...byIngredients];
 
  // Rankear
  let results = rankResults(combined, qLower, qNorm);
 
  // Si no hay resultados, intentar fuzzy (palabras individuales)
  if (results.length === 0 && q.length >= 3) {
    const words = q.split(/\s+/).filter((w: string) => w.length >= 2);
 
    if (words.length > 0) {
      const fuzzy = (allRecipes ?? []).filter((r: any) => {
        const titleNorm = r.title.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const titleLower = r.title.toLowerCase();
        return words.some((w: string) => {
          const wNorm = w.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          return titleLower.includes(w.toLowerCase()) || titleNorm.includes(wNorm);
        });
      });
      results = rankResults(fuzzy, qLower, qNorm);
    }
  }
 
  // Limpiar: quitar ingredients de la respuesta
  const clean = results.slice(0, 5).map(({ ingredients, ...rest }: any) => rest);
 
  return NextResponse.json({
    recipes: clean,
    type: clean.length > 0 ? 'results' : 'empty',
  });
}
 
/**
 * Rankear resultados:
 * - Título empieza con query → +10
 * - Título contiene query    → +5
 * - Ingrediente contiene     → +2
 * - Likes bonus              → +1 por cada 5 likes
 */
function rankResults(data: any[], qLower: string, qNorm: string) {
  return data
    .map((r: any) => {
      const likes = r.likes_count?.[0]?.count ?? 0;
      const titleLower = r.title.toLowerCase();
      const titleNorm = titleLower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
 
      let score = 0;
 
      if (titleLower.startsWith(qLower) || titleNorm.startsWith(qNorm)) {
        score += 10;
      } else if (titleLower.includes(qLower) || titleNorm.includes(qNorm)) {
        score += 5;
      }
 
      if (Array.isArray(r.ingredients)) {
        const hasIngredient = r.ingredients.some((ing: string) =>
          ing.toLowerCase().includes(qLower)
        );
        if (hasIngredient) score += 2;
      }
 
      score += Math.floor(likes / 5);
 
      return { ...r, likes_count: likes, _score: score };
    })
    .sort((a: any, b: any) => b._score - a._score || b.likes_count - a.likes_count)
    .map(({ _score, ...rest }: any) => rest);
}