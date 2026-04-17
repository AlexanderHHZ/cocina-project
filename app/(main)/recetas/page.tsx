import { createSupabaseServer } from '@/lib/supabase-server';
import RecipeCard from '@/components/recetas/RecipeCard';
import LiveSearchBar from '@/components/search/LiveSearchBar';
import { ChefHat } from 'lucide-react';
import type { Recipe } from '@/types';

export const dynamic = 'force-dynamic';

export default async function RecetasPage({
  searchParams,
}: {
  searchParams: Promise<{ search?: string; q?: string }>;
}) {
  // Aceptar tanto ?search= (enviado desde LiveSearchBar/Navbar) como ?q= por compatibilidad
  const params = await searchParams;
  const query = (params.search ?? params.q ?? '').trim();

  const supabase = await createSupabaseServer();

  let formattedRecipes: Recipe[] = [];

  if (query) {
    // Normalizar (sin acentos, minúsculas)
    const qLower = query.toLowerCase();
    const qNorm = qLower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Traemos todas las recetas y filtramos en JS.
    // Razón: Supabase `cs` solo hace match exacto del elemento del array,
    // no sirve para buscar "huevo" dentro de "3 huevos grandes".
    const { data } = await supabase
      .from('recipes')
      .select(`*, likes_count:likes(count), comments_count:comments(count)`)
      .order('created_at', { ascending: false });

    const filtered = (data ?? []).filter((r: any) => {
      // Match por título (con y sin acentos)
      const titleLower = (r.title ?? '').toLowerCase();
      const titleNorm = titleLower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (titleLower.includes(qLower) || titleNorm.includes(qNorm)) return true;

      // Match por ingredientes (substring dentro de cada ingrediente)
      if (Array.isArray(r.ingredients)) {
        return r.ingredients.some((ing: string) => {
          const ingLower = (ing ?? '').toLowerCase();
          const ingNorm = ingLower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
          return ingLower.includes(qLower) || ingNorm.includes(qNorm);
        });
      }

      return false;
    });

    formattedRecipes = filtered.map((r: any) => ({
      ...r,
      likes_count: r.likes_count?.[0]?.count ?? 0,
      comments_count: r.comments_count?.[0]?.count ?? 0,
    }));
  } else {
    const { data } = await supabase
      .from('recipes')
      .select(`*, likes_count:likes(count), comments_count:comments(count)`)
      .order('created_at', { ascending: false });

    formattedRecipes = (data ?? []).map((r: any) => ({
      ...r,
      likes_count: r.likes_count?.[0]?.count ?? 0,
      comments_count: r.comments_count?.[0]?.count ?? 0,
    }));
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Header */}
      <div className="mb-10">
        <h1 className="font-display text-3xl md:text-4xl font-bold">
          {query ? `Resultados para "${query}"` : 'Todas las recetas'}
        </h1>
        <p className="text-walnut/50 mt-2">
          {query
            ? `${formattedRecipes.length} receta${formattedRecipes.length !== 1 ? 's' : ''} encontrada${formattedRecipes.length !== 1 ? 's' : ''}`
            : 'Explora nuestra colección completa'}
        </p>
      </div>

      {/* Buscador */}
      <div className="mb-8 max-w-lg">
        <LiveSearchBar
          placeholder="Buscar por título o ingrediente..."
          variant="page"
        />
      </div>

      {/* Grid */}
      {formattedRecipes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {formattedRecipes.map((recipe) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <ChefHat className="w-16 h-16 text-walnut/10 mx-auto mb-4" />
          <h3 className="font-display text-xl font-bold text-walnut/30 mb-2">
            {query ? 'Sin resultados' : 'Aún no hay recetas'}
          </h3>
          <p className="text-walnut/40 text-sm">
            {query
              ? 'Intenta con otros términos de búsqueda.'
              : 'Las recetas aparecerán aquí cuando las publiques.'}
          </p>
        </div>
      )}
    </div>
  );
}
