'use client';

import { forwardRef } from 'react';
import Image from 'next/image';
import { Search, Clock, Heart, ChefHat, TrendingUp } from 'lucide-react';

// ── Tipos ──
export type SearchResult = {
  id: string;
  title: string;
  slug: string;
  thumbnail_url: string | null;
  image_url: string | null;
  difficulty: string;
  prep_time: number;
  likes_count: number;
};

// ── Colores dificultad ──
const DIFFICULTY_COLOR: Record<string, string> = {
  'fácil': 'text-sage', 'media': 'text-gold', 'difícil': 'text-wine',
};

// ── Cache en memoria (compartido entre todas las instancias) ──
const searchCache = new Map<string, { recipes: SearchResult[]; type: string; ts: number }>();
const CACHE_TTL = 60_000;

export function getCached(key: string) {
  const entry = searchCache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.ts > CACHE_TTL) { searchCache.delete(key); return null; }
  return entry;
}

export function setCache(key: string, recipes: SearchResult[], type: string) {
  if (searchCache.size > 50) {
    const oldest = searchCache.keys().next().value;
    if (oldest) searchCache.delete(oldest);
  }
  searchCache.set(key, { recipes, type, ts: Date.now() });
}

// ══════════════════════════════════════════════
// SearchDropdown
// ══════════════════════════════════════════════
const SearchDropdown = forwardRef<HTMLDivElement, {
  show: boolean;
  suggestions: SearchResult[];
  suggestionsType: string;
  searchQuery: string;
  searching: boolean;
  activeIndex: number;
  mobile?: boolean;
  onSelectRecipe: (slug: string) => void;
  onSelectSearch: (query: string) => void;
  onHoverIndex: (index: number) => void;
}>(function SearchDropdown(
  { show, suggestions, suggestionsType, searchQuery, searching, activeIndex, mobile, onSelectRecipe, onSelectSearch, onHoverIndex },
  ref
) {
  if (!show) return null;

  return (
    <div
      ref={ref}
      className={`absolute left-0 right-0 bg-white rounded-2xl shadow-2xl border border-charcoal/10 overflow-hidden z-50 animate-scale-in origin-top
        ${mobile ? 'top-12 mx-0' : 'top-14'}`}
      onMouseDown={(e) => e.preventDefault()}
    >
      {/* Header */}
      {suggestionsType === 'popular' && suggestions.length > 0 && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-charcoal/5 bg-charcoal/[0.02]">
          <TrendingUp className="w-3.5 h-3.5 text-terra" />
          <span className="text-xs font-medium text-charcoal/50">Recetas populares</span>
        </div>
      )}
      {suggestionsType === 'results' && suggestions.length > 0 && searchQuery.trim() && (
        <div className="flex items-center gap-2 px-4 py-2.5 border-b border-charcoal/5 bg-charcoal/[0.02]">
          <Search className="w-3.5 h-3.5 text-terra" />
          <span className="text-xs font-medium text-charcoal/50">
            Resultados para &quot;{searchQuery.trim()}&quot;
          </span>
        </div>
      )}

      {/* Loading */}
      {searching && (
        <div className="px-4 py-6 text-center">
          <div className="w-5 h-5 border-2 border-terra/30 border-t-terra rounded-full animate-spin mx-auto mb-2" />
          <p className="text-xs text-charcoal/40">Buscando...</p>
        </div>
      )}

      {/* Results */}
      {!searching && suggestions.length > 0 && (
        <div className="max-h-[320px] overflow-y-auto">
          {suggestions.map((recipe, index) => (
            <button
              key={recipe.id}
              onClick={() => onSelectRecipe(recipe.slug)}
              onMouseEnter={() => onHoverIndex(index)}
              className={`w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                ${activeIndex === index ? 'bg-terra/5' : 'hover:bg-charcoal/[0.03]'}`}
            >
              <div className="w-12 h-12 rounded-xl overflow-hidden bg-charcoal/5 flex-shrink-0">
                {(recipe.thumbnail_url || recipe.image_url) ? (
                  <Image
                    src={recipe.thumbnail_url || recipe.image_url!}
                    alt={recipe.title}
                    width={48}
                    height={48}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <ChefHat className="w-5 h-5 text-charcoal/15" />
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{recipe.title}</p>
                <div className="flex items-center gap-3 mt-0.5">
                  <span className="flex items-center gap-1 text-xs text-charcoal/40">
                    <Clock className="w-3 h-3" /> {recipe.prep_time} min
                  </span>
                  <span className={`text-xs font-medium ${DIFFICULTY_COLOR[recipe.difficulty] ?? 'text-charcoal/40'}`}>
                    {recipe.difficulty}
                  </span>
                  {recipe.likes_count > 0 && (
                    <span className="flex items-center gap-1 text-xs text-charcoal/40">
                      <Heart className="w-3 h-3" /> {recipe.likes_count}
                    </span>
                  )}
                </div>
              </div>
              {activeIndex === index && (
                <span className="text-terra text-xs font-medium flex-shrink-0">→</span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Empty */}
      {!searching && suggestionsType === 'empty' && searchQuery.trim() && (
        <div className="px-4 py-6 text-center">
          <ChefHat className="w-8 h-8 text-charcoal/10 mx-auto mb-2" />
          <p className="text-sm text-charcoal/40">No se encontraron resultados</p>
          <p className="text-xs text-charcoal/30 mt-1">Intenta con otros términos</p>
        </div>
      )}

      {/* Footer */}
      {searchQuery.trim() && suggestions.length > 0 && !searching && (
        <button
          onClick={() => onSelectSearch(searchQuery.trim())}
          className="w-full flex items-center justify-center gap-2 px-4 py-2.5 border-t border-charcoal/5
                     text-xs font-medium text-terra hover:bg-terra/5 transition-colors"
        >
          <Search className="w-3 h-3" />
          Ver todos los resultados de &quot;{searchQuery.trim()}&quot;
        </button>
      )}
    </div>
  );
});

export default SearchDropdown;
