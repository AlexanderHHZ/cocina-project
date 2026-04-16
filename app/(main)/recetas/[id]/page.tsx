import { createSupabaseServer } from '@/lib/supabase-server';
import { notFound } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { Clock, ChefHat, ArrowLeft, Calendar, Users } from 'lucide-react';
import LikeButton from '@/components/recetas/LikeButton';
import FavoriteButton from '@/components/recetas/FavoriteButton';
import CommentSection from '@/components/recetas/CommentSection';
import type { Recipe, Comment } from '@/types';

export const dynamic = 'force-dynamic';

interface Props {
  params: Promise<{ id: string }>;
}

export default async function RecipeDetailPage({ params }: Props) {
  const { id: slug } = await params;
  const supabase = await createSupabaseServer();

  const { data: recipe } = await supabase
    .from('recipes')
    .select(`
      *,
      likes_count:likes(count),
      author:profiles!recipes_author_id_fkey(id, full_name, avatar_url, email)
    `)
    .eq('slug', slug)
    .single();

  if (!recipe) notFound();

  const { data: comments } = await supabase
    .from('comments')
    .select('*, user:profiles!comments_user_id_fkey(*)')
    .eq('recipe_id', recipe.id)
    .order('created_at', { ascending: true });

  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? null;

  let isLiked = false;
  let isFavorited = false;

  if (userId) {
    const [likeRes, favRes] = await Promise.all([
      supabase.from('likes').select('id').eq('recipe_id', recipe.id).eq('user_id', userId).maybeSingle(),
      supabase.from('favorites').select('id').eq('recipe_id', recipe.id).eq('user_id', userId).maybeSingle(),
    ]);
    isLiked = !!likeRes.data;
    isFavorited = !!favRes.data;
  }

  const likesCount = recipe.likes_count?.[0]?.count ?? 0;
  const stateKey = `${recipe.id}-${isLiked}-${isFavorited}-${likesCount}`;

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'long', year: 'numeric' });

  const difficultyColor: Record<string, string> = {
    'fácil':   'bg-herb/10 text-herb',
    'media':   'bg-honey/10 text-honey',
    'difícil': 'bg-wine/10 text-wine',
  };

  return (
    <article className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      {/* Volver */}
      <Link href="/recetas" className="inline-flex items-center gap-2 text-sm text-walnut/50 hover:text-paprika transition-colors mb-6">
        <ArrowLeft className="w-4 h-4" /> Volver a recetas
      </Link>

      {/* Header */}
      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <span className={`px-3 py-1 rounded-full text-xs font-medium font-ui ${difficultyColor[recipe.difficulty] ?? 'bg-walnut/10 text-walnut'}`}>
            {recipe.difficulty}
          </span>
          <span className="flex items-center gap-1 text-xs text-walnut/50 font-ui">
            <Clock className="w-3.5 h-3.5" /> {recipe.prep_time} min
          </span>
          {recipe.servings && (
            <span className="flex items-center gap-1 text-xs text-walnut/50 font-ui">
              <Users className="w-3.5 h-3.5" /> {recipe.servings} porcion{recipe.servings !== 1 ? 'es' : ''}
            </span>
          )}
          <span className="flex items-center gap-1 text-xs text-walnut/50 font-ui">
            <Calendar className="w-3.5 h-3.5" /> {formatDate(recipe.created_at)}
          </span>
        </div>
        <h1 className="font-display text-3xl md:text-4xl font-bold leading-tight mb-3">
          {recipe.title}
        </h1>
        <p className="text-lg text-walnut/60 leading-relaxed">
          {recipe.description}
        </p>

        {/* Autor */}
        {recipe.author && (
          <div className="flex items-center gap-3 mt-5">
            <div className="w-10 h-10 rounded-full bg-paprika/10 flex items-center justify-center">
              <span className="text-sm font-bold text-paprika">
                {recipe.author.full_name?.charAt(0) ?? recipe.author.email?.charAt(0) ?? 'C'}
              </span>
            </div>
            <div>
              <p className="text-sm font-medium">{recipe.author.full_name ?? 'Chef'}</p>
              <p className="text-xs text-walnut/40 font-ui">Autor</p>
            </div>
          </div>
        )}
      </header>

      {/* Imagen */}
      {recipe.image_url && (
        <div className="relative aspect-video rounded-2xl overflow-hidden bg-walnut/5 mb-10">
          <Image
            src={recipe.image_url}
            alt={recipe.title}
            fill
            className="object-cover"
            priority
            sizes="(max-width: 896px) 100vw, 1200px"
            placeholder="blur"
            blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwMCIgaGVpZ2h0PSI2NzUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2U4ZTVkZiIvPjwvc3ZnPg=="
          />
        </div>
      )}

      {/* Acciones */}
      <div className="flex flex-wrap gap-3 mb-10">
        <LikeButton
          key={`like-${stateKey}`}
          recipeId={recipe.id}
          userId={userId}
          initialLiked={isLiked}
          initialCount={likesCount}
        />
        <FavoriteButton
          key={`fav-${stateKey}`}
          recipeId={recipe.id}
          userId={userId}
          initialFavorited={isFavorited}
        />
      </div>

      {/* Video de YouTube */}
      {recipe.video_url && (
        <div className="mb-10">
          <h2 className="font-display text-lg font-bold mb-4">Video</h2>
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-walnut/5">
            <iframe
              src={recipe.video_url}
              title={`Video: ${recipe.title}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="absolute inset-0 w-full h-full"
            />
          </div>
        </div>
      )}

      {/* Contenido */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">
        {/* Ingredientes */}
        <div className="md:col-span-1">
          <div className="bg-white rounded-2xl border border-walnut/10 p-6 sticky top-24">
            <h2 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-paprika" /> Ingredientes
            </h2>
            {recipe.servings && (
              <p className="text-xs text-walnut/40 mb-3 flex items-center gap-1.5 font-ui">
                <Users className="w-3.5 h-3.5" /> Para {recipe.servings} porcion{recipe.servings !== 1 ? 'es' : ''}
              </p>
            )}
            <ul className="space-y-2.5">
              {recipe.ingredients.map((ing: string, i: number) => (
                <li key={i} className="flex items-start gap-3 text-sm">
                  <span className="w-1.5 h-1.5 rounded-full bg-paprika mt-2 flex-shrink-0" />
                  {ing}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Pasos */}
        <div className="md:col-span-2">
          <h2 className="font-display text-lg font-bold mb-6">Preparación</h2>
          <div className="space-y-6">
            {recipe.steps.map((step: string, i: number) => (
              <div key={i} className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-paprika/10 text-paprika flex items-center justify-center text-sm font-bold font-ui flex-shrink-0 mt-0.5">
                  {i + 1}
                </div>
                <p className="text-walnut/80 leading-relaxed pt-1">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Comentarios */}
      <div className="border-t border-walnut/10 pt-10">
        <CommentSection recipeId={recipe.id} initialComments={comments ?? []} />
      </div>
    </article>
  );
}
