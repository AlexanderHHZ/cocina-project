import { createSupabaseServer } from '@/lib/supabase-server';
import RecipeCard from '@/components/recetas/RecipeCard';
import LiveSearchBar from '@/components/search/LiveSearchBar';
import { ChefHat } from 'lucide-react';
import type { Recipe } from '@/types';

export const dynamic = 'force-dynamic';

interface Props {
  searchParams: Promise<{ search?: string }>;
}

export default async function RecetasPage({ searchParams }: Props) {
  const params = await searchParams;
  const query = params.search ?? '';
  const supabase = await createSupabaseServer();

  let formattedRecipes: Recipe[];

  if (query) {
    // Buscar por título con ilike
    const { data: byTitle } = await supabase
      .from('recipes')
      .select(`
        *,
        likes_count:likes(count),
        comments_count:comments(count)
      `)
      .ilike('title', `%${query}%`)
      .order('created_at', { ascending: false });

    const titleIds = new Set((byTitle ?? []).map((r: any) => r.id));

    // Buscar por ingredientes: traer todas y filtrar en JS
    const { data: allRecipes } = await supabase
      .from('recipes')
      .select(`
        *,
        likes_count:likes(count),
        comments_count:comments(count)
      `)
      .order('created_at', { ascending: false });

    const qLower = query.toLowerCase();
    const qNorm = qLower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    const byIngredients = (allRecipes ?? []).filter((r: any) => {
      if (titleIds.has(r.id)) return false;
      if (!Array.isArray(r.ingredients)) return false;
      return r.ingredients.some((ing: string) => {
        const ingLower = ing.toLowerCase();
        const ingNorm = ingLower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return ingLower.includes(qLower) || ingNorm.includes(qNorm);
      });
    });

    const combined = [...(byTitle ?? []), ...byIngredients];

    formattedRecipes = combined.map((r: any) => ({
      ...r,
      likes_count: r.likes_count?.[0]?.count ?? 0,
      comments_count: r.comments_count?.[0]?.count ?? 0,
    }));
  } else {
    const { data: recipes } = await supabase
      .from('recipes')
      .select(`
        *,
        likes_count:likes(count),
        comments_count:comments(count)
      `)
      .order('created_at', { ascending: false });

    formattedRecipes = (recipes ?? []).map((r: any) => ({
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
        <p className="text-charcoal/50 mt-2">
          {query
            ? `${formattedRecipes.length} receta${formattedRecipes.length !== 1 ? 's' : ''} encontrada${formattedRecipes.length !== 1 ? 's' : ''}`
            : 'Explora nuestra colección completa'}
        </p>
      </div>

      {/* Buscador con live search */}
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
          <ChefHat className="w-16 h-16 text-charcoal/10 mx-auto mb-4" />
          <h3 className="font-display text-xl font-bold text-charcoal/30 mb-2">
            {query ? 'Sin resultados' : 'Aún no hay recetas'}
          </h3>
          <p className="text-charcoal/40 text-sm">
            {query
              ? 'Intenta con otros términos de búsqueda.'
              : 'Las recetas aparecerán aquí cuando las publiques.'}
          </p>
        </div>
      )}
    </div>
  );
}