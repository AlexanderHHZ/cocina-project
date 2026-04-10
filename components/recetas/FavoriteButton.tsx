'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bookmark } from 'lucide-react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';

interface Props {
  recipeId: string;
  userId: string | null;
  initialFavorited: boolean;
}

export default function FavoriteButton({ recipeId, userId, initialFavorited }: Props) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseBrowser();

  const handleToggle = async () => {
    if (loading) return;

    if (!userId) {
      router.push('/login');
      return;
    }

    const prevFav = favorited;
    setFavorited(!prevFav);
    setLoading(true);

    try {
      if (prevFav) {
        const { error } = await supabase
          .from('favorites')
          .delete()
          .eq('recipe_id', recipeId)
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('favorites')
          .insert({ recipe_id: recipeId, user_id: userId });
        if (error) throw error;
      }
      router.refresh();
    } catch {
      setFavorited(prevFav);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200
        ${favorited
          ? 'bg-gold/10 text-gold'
          : 'bg-charcoal/5 text-charcoal/60 hover:bg-gold/5 hover:text-gold'
        }
        active:scale-95 disabled:opacity-70`}
      aria-label={favorited ? 'Quitar de favoritos' : 'Guardar en favoritos'}
    >
      <Bookmark className={`w-5 h-5 transition-all duration-200 ${favorited ? 'fill-gold scale-110' : 'scale-100'}`} />
      <span className="text-sm font-medium">{favorited ? 'Guardado' : 'Guardar'}</span>
    </button>
  );
}
