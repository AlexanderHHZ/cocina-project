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

// Renderiza texto con #hashtags resaltados en azul
function RenderContent({ text }: { text: string }) {
  // Separar por hashtags: busca #PalabrasConOSinEspacios
  const parts = text.split(/(#[^\s#]+)/g);

  return (
    <span>
      {parts.map((part, i) =>
        part.startsWith('#') ? (
          <span key={i} className="text-blue-500 font-medium">{part}</span>
        ) : (
          <span key={i}>{part}</span>
        )
      )}
    </span>
  );
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

      {/* Contenido con hashtags resaltados */}
      <div className="px-4 pb-3">
        <p className="text-sm text-charcoal/80 leading-relaxed whitespace-pre-line">
          <RenderContent text={post.content} />
        </p>
      </div>

      {/* Enlace a video de YouTube */}
      {post.video_url && (
        <div className="px-4 pb-3">
          <a
            href={post.video_url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-charcoal/[0.03] border border-charcoal/5
                       hover:bg-charcoal/[0.06] hover:border-charcoal/10 transition-all group"
          >
            <div className="w-9 h-9 rounded-lg bg-red-500/10 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-charcoal group-hover:text-red-600 transition-colors">Ver video en YouTube</p>
              <p className="text-xs text-charcoal/40 truncate">{post.video_url}</p>
            </div>
            <span className="text-xs text-charcoal/30 group-hover:text-red-500 transition-colors flex-shrink-0">↗</span>
          </a>
        </div>
      )}

      {/* Carrusel de imágenes */}
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
