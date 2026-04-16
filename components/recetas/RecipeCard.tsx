import Link from 'next/link';
import Image from 'next/image';
import { Clock, ChefHat, Heart, MessageCircle } from 'lucide-react';
import type { Recipe } from '@/types';

interface Props {
  recipe: Recipe;
}

const difficultyStyle: Record<string, string> = {
  'fácil':   'text-herb',
  'media':   'text-honey',
  'difícil': 'text-wine',
};

export default function RecipeCard({ recipe }: Props) {
  return (
    <Link href={`/recetas/${recipe.slug}`} className="card group block">
      {/* Imagen */}
      <div className="relative aspect-video overflow-hidden bg-walnut/5">
        {(recipe.thumbnail_url || recipe.image_url) ? (
          <Image
            src={recipe.thumbnail_url || recipe.image_url!}
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
            <ChefHat className="w-12 h-12 text-walnut/15" />
          </div>
        )}
      </div>

      {/* Contenido */}
      <div className="p-5">
        <h3 className="font-display text-lg font-bold leading-snug mb-2 group-hover:text-paprika transition-colors">
          {recipe.title}
        </h3>
        <p className="text-sm text-walnut/60 line-clamp-2 mb-4">
          {recipe.description}
        </p>

        {/* Meta */}
        <div className="flex items-center justify-between text-xs text-walnut/50 font-ui">
          <div className="flex items-center gap-3">
            <span className={`font-semibold ${difficultyStyle[recipe.difficulty as keyof typeof difficultyStyle] ?? 'text-walnut/50'}`}>
              {recipe.difficulty}
            </span>
            <span className="text-walnut/20">·</span>
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
          <span className="text-paprika font-medium">Ver →</span>
        </div>
      </div>
    </Link>
  );
}
