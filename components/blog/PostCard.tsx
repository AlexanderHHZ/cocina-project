import ImageCarousel from '@/components/ui/ImageCarousel';
import PostLikeButton from '@/components/blog/PostLikeButton';
import PostCommentSection from '@/components/blog/PostCommentSection';
import type { Post, PostComment } from '@/types';

interface Props {
  post: Post;
  userId: string | null;
  isLiked: boolean;
  likesCount: number;
  comments: PostComment[];
}

export default function PostCard({ post, userId, isLiked, likesCount, comments }: Props) {
  const stateKey = `${post.id}-${isLiked}-${likesCount}`;

  const authorName = post.author?.full_name?.trim()
    || post.author?.email?.split('@')[0]
    || 'Chef';
  const authorInitial = authorName.charAt(0).toUpperCase();

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });

  const timeAgo = (d: string) => {
    const diff = Date.now() - new Date(d).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 60) return `hace ${mins} min`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `hace ${hours}h`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `hace ${days}d`;
    return formatDate(d);
  };

  return (
    <article className="bg-white rounded-2xl border border-charcoal/5 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-4 pb-3">
        <div className="w-10 h-10 rounded-full bg-terra/15 flex items-center justify-center">
          <span className="text-sm font-bold text-terra">{authorInitial}</span>
        </div>
        <div>
          <p className="text-sm font-medium">{authorName}</p>
          <p className="text-xs text-charcoal/40">{timeAgo(post.created_at)}</p>
        </div>
      </div>

      {/* Contenido */}
      <div className="px-4 pb-3">
        <p className="text-sm text-charcoal/80 leading-relaxed whitespace-pre-line">{post.content}</p>
      </div>

      {/* Carrusel de imágenes */}
      {post.images.length > 0 && (
        <div className="px-4 pb-3">
          <ImageCarousel images={post.images} alt="Publicación" />
        </div>
      )}

      {/* Acciones */}
      <div className="px-4 py-3 border-t border-charcoal/5 flex items-center gap-6">
        <PostLikeButton
          key={`postlike-${stateKey}`}
          postId={post.id}
          userId={userId}
          initialLiked={isLiked}
          initialCount={likesCount}
        />
        <PostCommentSection
          postId={post.id}
          initialComments={comments}
        />
      </div>
    </article>
  );
}
