'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Heart } from 'lucide-react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';

interface Props {
  postId: string;
  userId: string | null;
  initialLiked: boolean;
  initialCount: number;
}

export default function PostLikeButton({ postId, userId, initialLiked, initialCount }: Props) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseBrowser();

  const handleToggle = async () => {
    if (loading) return;
    if (!userId) { router.push('/login'); return; }

    const prevLiked = liked;
    const prevCount = count;
    setLiked(!prevLiked);
    setCount(prevLiked ? prevCount - 1 : prevCount + 1);
    setLoading(true);

    try {
      if (prevLiked) {
        const { error } = await supabase.from('post_likes').delete().eq('post_id', postId).eq('user_id', userId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('post_likes').insert({ post_id: postId, user_id: userId });
        if (error) throw error;
      }
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
      className={`flex items-center gap-2 text-sm transition-all duration-200
        ${liked ? 'text-wine' : 'text-charcoal/40 hover:text-wine'}
        active:scale-95 disabled:opacity-70`}
      aria-label={liked ? 'Quitar like' : 'Dar like'}
    >
      <Heart className={`w-5 h-5 transition-all duration-200 ${liked ? 'fill-wine scale-110' : 'scale-100'}`} />
      <span className="font-medium">{count}</span>
    </button>
  );
}
