import { createSupabaseServer } from '@/lib/supabase-server';
import RecipeCard from '@/components/recetas/RecipeCard';
import Link from 'next/link';
import { ChefHat, ArrowRight, Flame, Clock, Users } from 'lucide-react';
import type { Recipe } from '@/types';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const supabase = await createSupabaseServer();

  // Obtener recetas recientes con conteo de likes
  const { data: recipes } = await supabase
    .from('recipes')
    .select(`
      *,
      likes_count:likes(count),
      comments_count:comments(count)
    `)
    .order('created_at', { ascending: false })
    .limit(6);

  // Transformar conteos
  const formattedRecipes: Recipe[] = (recipes ?? []).map((r: any) => ({
    ...r,
    likes_count: r.likes_count?.[0]?.count ?? 0,
    comments_count: r.comments_count?.[0]?.count ?? 0,
  }));

  // Verificar si hay usuario logueado
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <>
      {/* ======== HERO ======== */}
      <section className="relative overflow-hidden bg-gradient-to-br from-cream via-terra/5 to-cream">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-32">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-terra/10 text-terra text-sm font-medium mb-6 animate-fade-in">
              <Flame className="w-4 h-4" /> Recetas nuevas cada semana
            </div>
            <h1 className="font-display text-4xl md:text-6xl font-bold leading-tight mb-6 animate-slide-up">
              Cocina con <span className="text-terra">alma</span>,{' '}
              comparte con <span className="text-sage">amor</span>
            </h1>
            <p className="text-lg text-charcoal/60 leading-relaxed mb-8 animate-slide-up" style={{ animationDelay: '0.1s' }}>
              Descubre recetas caseras, paso a paso, con ingredientes reales y mucho sabor.
              Desde platos rápidos hasta festines de fin de semana.
            </p>
            <div className="flex flex-wrap gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
              <Link href="/recetas" className="btn-primary">
                Explorar recetas <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/sobre-mi" className="btn-secondary">
                Conocer más
              </Link>
            </div>
          </div>
        </div>

        {/* Decoración */}
        <div className="absolute -right-20 top-1/2 -translate-y-1/2 w-96 h-96 bg-terra/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -left-10 bottom-0 w-64 h-64 bg-sage/5 rounded-full blur-3xl pointer-events-none" />
      </section>

      {/* ======== STATS ======== */}
      <section className="border-b border-charcoal/5">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <p className="font-display text-2xl md:text-3xl font-bold text-terra">
                {formattedRecipes.length}+
              </p>
              <p className="text-sm text-charcoal/50 mt-1">Recetas</p>
            </div>
            <div>
              <p className="font-display text-2xl md:text-3xl font-bold text-sage">15</p>
              <p className="text-sm text-charcoal/50 mt-1">Min promedio</p>
            </div>
            <div>
              <p className="font-display text-2xl md:text-3xl font-bold text-gold">100%</p>
              <p className="text-sm text-charcoal/50 mt-1">Casero</p>
            </div>
          </div>
        </div>
      </section>

      {/* ======== RECETAS RECIENTES ======== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="flex items-end justify-between mb-10">
          <div>
            <h2 className="font-display text-3xl font-bold">Recetas recientes</h2>
            <p className="text-charcoal/50 mt-2">Lo último que ha salido del horno</p>
          </div>
          <Link href="/recetas" className="text-sm font-medium text-terra hover:underline hidden sm:block">
            Ver todas →
          </Link>
        </div>

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
              Aún no hay recetas
            </h3>
            <p className="text-charcoal/40 text-sm">
              Las recetas aparecerán aquí cuando las publiques desde el panel admin.
            </p>
          </div>
        )}
      </section>

      {/* ======== CTA ======== */}
      {!user && (
        <section className="bg-charcoal text-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <h2 className="font-display text-3xl font-bold mb-4">
              ¿Listo para cocinar?
            </h2>
            <p className="text-white/60 mb-8 max-w-md mx-auto">
              Regístrate para guardar tus favoritas, dar likes y comentar.
            </p>
            <Link href="/register" className="btn-primary !bg-terra">
              Crear cuenta gratis
            </Link>
          </div>
        </section>
      )}
    </>
  );
}
