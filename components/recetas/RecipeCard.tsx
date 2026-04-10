import Link from 'next/link';
import Image from 'next/image';
import { Clock, ChefHat, Heart, MessageCircle } from 'lucide-react';
import type { Recipe } from '@/types';

interface Props {
  recipe: Recipe;
}

export default function RecipeCard({ recipe }: Props) {
  const difficultyColor = {
    'fácil': 'bg-sage/15 text-sage',
    'media': 'bg-gold/15 text-gold',
    'difícil': 'bg-wine/15 text-wine',
  };

  return (
    <Link href={`/recetas/${recipe.slug}`} className="card group block">
      {/* Imagen */}
      <div className="relative aspect-[4/3] overflow-hidden bg-charcoal/5">
        {recipe.image_url ? (
          <Image
            src={recipe.image_url}
            alt={recipe.title}
            fill
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 600px"
            loading="lazy"
            placeholder="blur"
            blurDataURL="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAwIiBoZWlnaHQ9IjQ1MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwJSIgaGVpZ2h0PSIxMDAlIiBmaWxsPSIjZThlNWRmIi8+PC9zdmc+"
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ChefHat className="w-12 h-12 text-charcoal/15" />
          </div>
        )}
        {/* Badge dificultad */}
        <span className={`absolute top-3 right-3 px-3 py-1 rounded-full text-xs font-medium backdrop-blur-sm ${difficultyColor[recipe.difficulty]}`}>
          {recipe.difficulty}
        </span>
      </div>

      {/* Contenido */}
      <div className="p-5">
        <h3 className="font-display text-lg font-bold leading-snug mb-2 group-hover:text-terra transition-colors">
          {recipe.title}
        </h3>
        <p className="text-sm text-charcoal/60 line-clamp-2 mb-4">
          {recipe.description}
        </p>

        {/* Meta */}
        <div className="flex items-center justify-between text-xs text-charcoal/50">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" /> {recipe.prep_time} min
            </span>
            <span className="flex items-center gap-1">
              <Heart className="w-3.5 h-3.5" /> {recipe.likes_count ?? 0}
            </span>
            <span className="flex items-center gap-1">
              <MessageCircle className="w-3.5 h-3.5" /> {recipe.comments_count ?? 0}
            </span>
          </div>
          <span className="text-terra font-medium">Ver →</span>
        </div>
      </div>
    </Link>
  );
}
