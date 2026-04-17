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
    <article className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

      {/* ── Breadcrumb ── */}
      <Link href="/recetas" className="inline-flex items-center gap-2 text-sm text-walnut/50 hover:text-paprika transition-colors mb-8 font-ui">
        <ArrowLeft className="w-4 h-4" /> Volver a recetas
      </Link>

      {/* ── Hero: Imagen principal ── */}
      {recipe.image_url && (
        <div className="relative aspect-video rounded-3xl overflow-hidden bg-walnut/5 mb-8 shadow-lg">
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

      {/* ── Header de la receta ── */}
      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-3 mb-4 text-walnut/50">
          <span className={`px-3 py-1 rounded-full text-xs font-semibold font-ui ${difficultyColor[recipe.difficulty] ?? 'bg-walnut/10 text-walnut'}`}>
            {recipe.difficulty}
          </span>
          <span className="flex items-center gap-1.5 text-xs font-ui">
            <Clock className="w-3.5 h-3.5" /> {recipe.prep_time} min
          </span>
          {recipe.servings && (
            <span className="flex items-center gap-1.5 text-xs font-ui">
              <Users className="w-3.5 h-3.5" /> {recipe.servings} porcion{recipe.servings !== 1 ? 'es' : ''}
            </span>
          )}
          <span className="flex items-center gap-1.5 text-xs font-ui">
            <Calendar className="w-3.5 h-3.5" /> {formatDate(recipe.created_at)}
          </span>
        </div>

        <h1 className="font-display text-3xl md:text-5xl font-bold leading-tight mb-4">
          {recipe.title}
        </h1>
        <p className="text-lg text-walnut/60 leading-relaxed max-w-3xl">
          {recipe.description}
        </p>

        {/* Autor + Acciones */}
        <div className="flex flex-wrap items-center justify-between gap-4 mt-6 pt-6 border-t border-walnut/10">
          {recipe.author && (
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-full bg-paprika/10 flex items-center justify-center ring-2 ring-paprika/20">
                <span className="text-sm font-bold text-paprika">
                  {recipe.author.full_name?.charAt(0) ?? recipe.author.email?.charAt(0) ?? 'C'}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold">{recipe.author.full_name ?? 'Chef'}</p>
                <p className="text-xs text-walnut/40 font-ui">Autor de la receta</p>
              </div>
            </div>
          )}
          <div className="flex flex-wrap gap-3">
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
        </div>
      </header>

      {/* ── Video de YouTube (sin título "Video") ── */}
      {recipe.video_url && (
        <div className="mb-12">
          <div className="relative aspect-video rounded-2xl overflow-hidden bg-walnut/5 shadow-md ring-1 ring-walnut/10">
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

      {/* ── Contenido: Ingredientes + Pasos ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10 mb-12">
        {/* Ingredientes */}
        <div className="md:col-span-1">
          <div className="bg-parchment/50 rounded-2xl border border-walnut/8 p-6 sticky top-24">
            <h2 className="font-display text-lg font-bold mb-4 flex items-center gap-2">
              <ChefHat className="w-5 h-5 text-paprika" /> Ingredientes
            </h2>
            {recipe.servings && (
              <p className="text-xs text-walnut/40 mb-4 flex items-center gap-1.5 font-ui">
                <Users className="w-3.5 h-3.5" /> Para {recipe.servings} porcion{recipe.servings !== 1 ? 'es' : ''}
              </p>
            )}
            <ul className="space-y-3">
              {recipe.ingredients.map((ing: string, i: number) => (
                <li key={i} className="flex items-start gap-3 text-sm leading-relaxed">
                  <span className="w-1.5 h-1.5 rounded-full bg-paprika mt-2 flex-shrink-0" />
                  {ing}
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Pasos */}
        <div className="md:col-span-2">
          <h2 className="font-display text-xl font-bold mb-8">Preparación</h2>
          <div className="relative">
            {/* Línea de timeline vertical */}
            <div className="absolute left-[18px] top-5 bottom-5 w-px bg-walnut/10 hidden md:block" />

            <div className="space-y-4">
              {recipe.steps.map((step: string, i: number) => (
                <div key={i} className="flex gap-5 group relative">
                  {/* Número del paso */}
                  <div className="relative z-10 w-9 h-9 rounded-full bg-paprika text-white flex items-center justify-center text-sm font-bold font-ui flex-shrink-0 mt-4 shadow-sm group-hover:scale-110 transition-transform">
                    {i + 1}
                  </div>
                  {/* Card del paso */}
                  <div className="flex-1 bg-white rounded-xl border border-walnut/8 p-5 group-hover:border-paprika/20 group-hover:shadow-sm transition-all duration-200">
                    <p className="text-[15px] text-walnut/85 leading-[1.75]">{step}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Comentarios ── */}
      <div className="border-t border-walnut/10 pt-10">
        <CommentSection recipeId={recipe.id} initialComments={comments ?? []} />
      </div>
    </article>
  );
}
