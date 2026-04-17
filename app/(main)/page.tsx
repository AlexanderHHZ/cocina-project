import { createSupabaseServer } from '@/lib/supabase-server';
import RecipeCard from '@/components/recetas/RecipeCard';
import Link from 'next/link';
import { ChefHat, ArrowRight, Flame, Clock, Heart } from 'lucide-react';
import ScrollIndicator from '@/components/ui/ScrollIndicator';
import type { Recipe } from '@/types';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const supabase = await createSupabaseServer();

  const { data: recipes } = await supabase
    .from('recipes')
    .select(`
      *,
      likes_count:likes(count),
      comments_count:comments(count)
    `)
    .order('created_at', { ascending: false })
    .limit(6);

  const formattedRecipes: Recipe[] = (recipes ?? []).map((r: any) => ({
    ...r,
    likes_count: r.likes_count?.[0]?.count ?? 0,
    comments_count: r.comments_count?.[0]?.count ?? 0,
  }));

  const { data: { user } } = await supabase.auth.getUser();

  // Conteo real de recetas (independiente del limit de 6)
  const { count: totalRecipes } = await supabase
    .from('recipes')
    .select('*', { count: 'exact', head: true });

  const recipeCountDisplay = totalRecipes && totalRecipes > 0 ? `${totalRecipes}+` : '0';

  return (
    <>
      <ScrollIndicator />
      {/* ======== HERO + STATS = pantalla completa ======== */}
      <div className="flex flex-col" style={{ minHeight: 'calc(100dvh - 96px)' }}>
        {/* Banner */}
        <div className="relative flex-shrink-0">
          <a
            href="https://youtube.com/@ingrediente791"
            target="_blank"
            rel="noopener noreferrer"
            className="block"
          >
            <img
              src="/images/banner.webp"
              alt="Ingrediente 791 — Cocina para todos, rico, nutritivo y rápido"
              className="w-full h-auto object-cover"
            />
          </a>
          {/* Degradado suave para fundir con el fondo */}
          <div className="absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-linen to-transparent" />
        </div>

        {/* Hero - se estira para llenar */}
        <section className="relative overflow-hidden flex-1 flex items-center">
          {/* Fondo */}
          <div className="absolute inset-0 bg-gradient-to-br from-linen via-paprika/[0.03] to-parchment/50" />
          <div className="absolute inset-0 opacity-[0.03]" style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'40\' height=\'40\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cpath d=\'M0 0h40v40H0z\' fill=\'none\'/%3E%3Cpath d=\'M20 0v40M0 20h40\' stroke=\'%235C3D2E\' stroke-width=\'0.5\'/%3E%3C/svg%3E")', backgroundSize: '40px 40px' }} />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 w-full">
            <div className="max-w-2xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-paprika/10 text-paprika text-sm font-medium font-ui mb-5 animate-fade-in">
                <Flame className="w-4 h-4" /> Recetas nuevas cada semana
              </div>
              <h1 className="font-display text-3xl md:text-4xl lg:text-5xl font-bold leading-[1.1] mb-4 animate-slide-up">
                Cocina con{' '}
                <span className="text-paprika italic">alma</span>,{' '}
                <br className="hidden sm:block" />
                comparte con{' '}
                <span className="text-herb italic">amor</span>
              </h1>
              <p className="text-base text-walnut/55 leading-relaxed mb-6 max-w-lg mx-auto animate-slide-up" style={{ animationDelay: '0.1s' }}>
                Descubre recetas caseras, paso a paso, con ingredientes reales y mucho sabor.
                Desde platos rápidos hasta festines de fin de semana.
              </p>
              <div className="flex flex-wrap justify-center gap-4 animate-slide-up" style={{ animationDelay: '0.2s' }}>
                <Link href="/recetas" className="btn-primary">
                  Explorar recetas <ArrowRight className="w-4 h-4" />
                </Link>
                <Link href="/sobre-mi" className="inline-flex items-center justify-center gap-2
                           border-2 border-walnut/30 text-walnut px-6 py-2.5 rounded-lg
                           font-medium font-ui transition-all duration-200
                           hover:border-paprika hover:text-paprika hover:bg-paprika/5
                           active:scale-[0.98]">
                  Conocer más
                </Link>
              </div>
            </div>
          </div>

          {/* Decoración */}
          <div className="absolute -right-32 top-1/3 w-96 h-96 bg-paprika/5 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-20 bottom-0 w-72 h-72 bg-herb/5 rounded-full blur-3xl pointer-events-none" />
        </section>

        {/* Stats - pegados al fondo del viewport */}
        <section className="border-y border-walnut/8 bg-white flex-shrink-0">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-3 divide-x divide-walnut/8">
              <div className="flex items-center justify-center gap-3 py-5">
                <ChefHat className="w-6 h-6 text-paprika flex-shrink-0" />
                <div>
                  <p className="font-display text-2xl md:text-3xl font-bold text-walnut leading-none">{recipeCountDisplay}</p>
                  <p className="text-xs text-walnut/45 font-ui mt-0.5">Recetas</p>
                </div>
              </div>
              <div className="flex items-center justify-center gap-3 py-5">
                <Clock className="w-6 h-6 text-herb flex-shrink-0" />
                <div>
                  <p className="font-display text-2xl md:text-3xl font-bold text-walnut leading-none">15 <span className="text-base text-walnut/35">min</span></p>
                  <p className="text-xs text-walnut/45 font-ui mt-0.5">Promedio</p>
                </div>
              </div>
              <div className="flex items-center justify-center gap-3 py-5">
                <Heart className="w-6 h-6 text-honey flex-shrink-0" />
                <div>
                  <p className="font-display text-2xl md:text-3xl font-bold text-walnut leading-none">100<span className="text-base text-walnut/35">%</span></p>
                  <p className="text-xs text-walnut/45 font-ui mt-0.5">Casero</p>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* ======== RECETAS RECIENTES ======== */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="flex items-end justify-between mb-10">
          <div>
            <p className="text-xs font-ui font-semibold text-paprika uppercase tracking-widest mb-2">
              Lo último
            </p>
            <h2 className="font-display text-3xl md:text-4xl font-bold">
              Recetas recientes
            </h2>
          </div>
          <Link href="/recetas" className="text-sm font-medium font-ui text-paprika hover:text-paprika/80 transition-colors hidden sm:flex items-center gap-1">
            Ver todas <ArrowRight className="w-4 h-4" />
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
            <ChefHat className="w-16 h-16 text-walnut/10 mx-auto mb-4" />
            <h3 className="font-display text-xl font-bold text-walnut/30 mb-2">
              Aún no hay recetas
            </h3>
            <p className="text-walnut/40 text-sm">
              Las recetas aparecerán aquí cuando las publiques desde el panel admin.
            </p>
          </div>
        )}

        {/* Link móvil */}
        <div className="mt-8 text-center sm:hidden">
          <Link href="/recetas" className="btn-primary">
            Ver todas las recetas <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

    </>
  );
}