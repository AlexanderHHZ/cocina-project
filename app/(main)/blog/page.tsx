import { createSupabaseServer } from '@/lib/supabase-server';
import PostCard from '@/components/blog/PostCard';
import { Newspaper } from 'lucide-react';
import type { Post, PostComment } from '@/types';

export const dynamic = 'force-dynamic';

export default async function BlogPage() {
  const supabase = await createSupabaseServer();

  // Obtener posts con conteos
  const { data: posts } = await supabase
    .from('posts')
    .select(`
      *,
      likes_count:post_likes(count),
      comments_count:post_comments(count),
      author:profiles!posts_author_id_fkey(id, full_name, avatar_url, email)
    `)
    .order('created_at', { ascending: false });

  // Obtener usuario actual
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id ?? null;

  // Para cada post, obtener si el usuario dio like y los comentarios
  const formattedPosts = await Promise.all(
    (posts ?? []).map(async (p: any) => {
      const post: Post = {
        ...p,
        likes_count: p.likes_count?.[0]?.count ?? 0,
        comments_count: p.comments_count?.[0]?.count ?? 0,
      };

      let isLiked = false;
      if (userId) {
        const { data } = await supabase
          .from('post_likes')
          .select('id')
          .eq('post_id', post.id)
          .eq('user_id', userId)
          .maybeSingle();
        isLiked = !!data;
      }

      const { data: comments } = await supabase
        .from('post_comments')
        .select('*, user:profiles!post_comments_user_id_fkey(*)')
        .eq('post_id', post.id)
        .order('created_at', { ascending: true });

      return { post, isLiked, comments: (comments ?? []) as PostComment[] };
    })
  );

  return (
    <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <h1 className="font-display text-3xl md:text-4xl font-bold mb-2">Blog</h1>
      <p className="text-charcoal/50 mb-10">Publicaciones, novedades y detrás de cámaras.</p>

      {formattedPosts.length > 0 ? (
        <div className="space-y-6">
          {formattedPosts.map(({ post, isLiked, comments }) => (
            <PostCard
              key={post.id}
              post={post}
              userId={userId}
              isLiked={isLiked}
              likesCount={post.likes_count ?? 0}
              comments={comments}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-20">
          <Newspaper className="w-16 h-16 text-charcoal/10 mx-auto mb-4" />
          <h3 className="font-display text-xl font-bold text-charcoal/30 mb-2">
            Aún no hay publicaciones
          </h3>
          <p className="text-charcoal/40 text-sm">
            Las publicaciones aparecerán aquí cuando las crees desde el panel admin.
          </p>
        </div>
      )}
    </div>
  );
}
