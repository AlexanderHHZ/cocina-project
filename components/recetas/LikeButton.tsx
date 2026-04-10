'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';

interface Props {
  recipeId: string;
  userId: string | null;
  initialLiked: boolean;
  initialCount: number;
}

export default function LikeButton({ recipeId, userId, initialLiked, initialCount }: Props) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseBrowser();

  const handleToggle = async () => {
    if (loading) return;

    if (!userId) {
      router.push('/login');
      return;
    }

    const prevLiked = liked;
    const prevCount = count;

    // Optimistic update
    setLiked(!prevLiked);
    setCount(prevLiked ? prevCount - 1 : prevCount + 1);
    setLoading(true);

    try {
      if (prevLiked) {
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('recipe_id', recipeId)
          .eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('likes')
          .insert({ recipe_id: recipeId, user_id: userId });
        if (error) throw error;
      }
      // Invalidar cache del servidor
      router.refresh();
    } catch {
      setLiked(prevLiked);
      setCount(prevCount);
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggle}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all duration-200
        ${liked
          ? 'bg-wine/10 text-wine'
          : 'bg-charcoal/5 text-charcoal/60 hover:bg-wine/5 hover:text-wine'
        }
        active:scale-95 disabled:opacity-70`}
      aria-label={liked ? 'Quitar like' : 'Dar like'}
    >
      <Heart className={`w-5 h-5 transition-all duration-200 ${liked ? 'fill-wine scale-110' : 'scale-100'}`} />
      <span className="text-sm font-medium">{count}</span>
    </button>
  );
}
