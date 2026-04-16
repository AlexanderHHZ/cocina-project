import { createSupabaseServer } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import RecipeCard from '@/components/recetas/RecipeCard';
import { Bookmark } from 'lucide-react';

export default async function FavoritosPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: favorites } = await supabase
    .from('favorites')
    .select(`
      recipe:recipes(
        *,
        likes_count:likes(count),
        comments_count:comments(count)
      )
    `)
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  const recipes = (favorites ?? [])
    .map((f: any) => f.recipe)
    .filter(Boolean)
    .map((r: any) => ({
      ...r,
      likes_count: r.likes_count?.[0]?.count ?? 0,
      comments_count: r.comments_count?.[0]?.count ?? 0,
    }));

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="font-display text-3xl font-bold mb-2">Mis favoritos</h1>
      <p className="text-walnut/50 mb-10">Recetas que has guardado para después.</p>

      {recipes.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {recipes.map((recipe: any) => (
            <RecipeCard key={recipe.id} recipe={recipe} />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <Bookmark className="w-16 h-16 text-walnut/10 mx-auto mb-4" />
          <h3 className="font-display text-xl font-bold text-walnut/30 mb-2">
            Sin favoritos aún
          </h3>
          <p className="text-walnut/40 text-sm">
            Guarda recetas con el botón de favorito para verlas aquí.
          </p>
        </div>
      )}
    </div>
  );
}
