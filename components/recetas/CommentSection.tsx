'use client';

import { useState, useEffect, useRef } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { Send, MessageCircle, Reply, ChevronDown, ChevronUp, X } from 'lucide-react';
import type { Comment } from '@/types';
import type { User } from '@supabase/supabase-js';

interface Props {
  recipeId: string;
  initialComments: Comment[];
}

// ============================================
// Componente individual de comentario (recursivo)
// ============================================
function CommentItem({
  comment,
  allComments,
  depth,
  user,
  onReply,
  formatDate,
  getDisplayName,
}: {
  comment: Comment;
  allComments: Comment[];
  depth: number;
  user: User | null;
  onReply: (comment: Comment) => void;
  formatDate: (d: string) => string;
  getDisplayName: (c: Comment) => string;
}) {
  const [expanded, setExpanded] = useState(true);

  const replies = allComments.filter((c) => c.parent_id === comment.id);
  const displayName = getDisplayName(comment);
  const initial = displayName.charAt(0).toUpperCase();

  // Limitar profundidad visual a 3 niveles para no romper en móvil
  const maxDepth = 3;
  const indent = depth < maxDepth;

  // Colores de avatar según profundidad
  const avatarStyles = [
    'bg-sage/15 text-sage',
    'bg-terra/10 text-terra',
    'bg-gold/10 text-gold',
    'bg-wine/10 text-wine',
  ];
  const avatarStyle = avatarStyles[Math.min(depth, avatarStyles.length - 1)];
  const avatarSize = depth === 0 ? 'w-9 h-9' : 'w-7 h-7';
  const textSize = depth === 0 ? 'text-xs' : 'text-[10px]';

  return (
    <div className="animate-fade-in">
      <div className="flex gap-3">
        <div className={`${avatarSize} rounded-full ${avatarStyle} flex-shrink-0 flex items-center justify-center`}>
          <span className={`${textSize} font-bold`}>{initial}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-baseline gap-2">
            <span className="text-sm font-medium">{displayName}</span>
            <span className="text-xs text-charcoal/40">{formatDate(comment.created_at)}</span>
          </div>
          <p className="text-sm text-charcoal/70 mt-1">{comment.content}</p>

          {/* Acciones */}
          <div className="flex items-center gap-4 mt-2">
            {user && (
              <button
                onClick={() => onReply(comment)}
                className="flex items-center gap-1.5 text-xs text-charcoal/40 hover:text-terra transition-colors"
              >
                <Reply className="w-3.5 h-3.5" /> Responder
              </button>
            )}

            {replies.length > 0 && (
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1.5 text-xs font-medium text-terra hover:text-terra/80 transition-colors"
              >
                {expanded ? (
                  <><ChevronUp className="w-3.5 h-3.5" /> Ocultar {replies.length} respuesta{replies.length !== 1 ? 's' : ''}</>
                ) : (
                  <><ChevronDown className="w-3.5 h-3.5" /> Ver {replies.length} respuesta{replies.length !== 1 ? 's' : ''}</>
                )}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Respuestas anidadas (recursivo) */}
      {expanded && replies.length > 0 && (
        <div className={`${indent ? 'ml-6 sm:ml-10' : 'ml-3 sm:ml-6'} mt-3 space-y-3 border-l-2 border-charcoal/5 pl-4`}>
          {replies.map((reply) => (
            <CommentItem
              key={reply.id}
              comment={reply}
              allComments={allComments}
              depth={depth + 1}
              user={user}
              onReply={onReply}
              formatDate={formatDate}
              getDisplayName={getDisplayName}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// Componente principal
// ============================================
export default function CommentSection({ recipeId, initialComments }: Props) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const supabase = createSupabaseBrowser();

  // Auth
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    const retry = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) setUser(session.user);
    }, 1000);

    return () => {
      subscription.unsubscribe();
      clearTimeout(retry);
    };
  }, []);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`comments:${recipeId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'comments',
          filter: `recipe_id=eq.${recipeId}`,
        },
        async (payload) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', payload.new.user_id)
            .single();

          const newC: Comment = {
            ...payload.new as Comment,
            user: profile ?? undefined,
          };

          setComments((prev) => {
            if (prev.some((c) => c.id === newC.id)) return prev;
            return [...prev, newC];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [recipeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    setSending(true);
    const { error } = await supabase
      .from('comments')
      .insert({
        recipe_id: recipeId,
        user_id: user.id,
        content: newComment.trim(),
        parent_id: replyingTo?.id ?? null,
      });

    if (!error) {
      setNewComment('');
      setReplyingTo(null);
    }
    setSending(false);
  };

  const handleReply = (comment: Comment) => {
    setReplyingTo(comment);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  const getDisplayName = (comment: Comment) => {
    return comment.user?.full_name?.trim()
      || comment.user?.email?.split('@')[0]
      || 'Usuario';
  };

  // Solo comentarios raíz (sin parent)
  const rootComments = comments.filter((c) => !c.parent_id);

  return (
    <div>
      <h3 className="font-display text-xl font-bold flex items-center gap-2 mb-6">
        <MessageCircle className="w-5 h-5 text-terra" />
        Comentarios ({comments.length})
      </h3>

      {/* Árbol de comentarios */}
      <div className="space-y-5 mb-6">
        {rootComments.length === 0 && (
          <p className="text-charcoal/40 text-sm py-4">
            Sé el primero en comentar esta receta.
          </p>
        )}

        {rootComments.map((comment) => (
          <CommentItem
            key={comment.id}
            comment={comment}
            allComments={comments}
            depth={0}
            user={user}
            onReply={handleReply}
            formatDate={formatDate}
            getDisplayName={getDisplayName}
          />
        ))}
      </div>

      {/* Formulario */}
      {user ? (
        <div>
          {replyingTo && (
            <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-terra/5 rounded-lg text-sm animate-fade-in">
              <Reply className="w-3.5 h-3.5 text-terra flex-shrink-0" />
              <span className="text-charcoal/60">
                Respondiendo a <span className="font-medium text-charcoal">{getDisplayName(replyingTo)}</span>
              </span>
              <button
                onClick={() => setReplyingTo(null)}
                className="ml-auto p-0.5 rounded hover:bg-charcoal/5 text-charcoal/40 hover:text-charcoal transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={replyingTo ? `Responder a ${getDisplayName(replyingTo)}...` : 'Escribe un comentario...'}
              className="input-field flex-1"
              maxLength={500}
            />
            <button
              type="submit"
              disabled={sending || !newComment.trim()}
              className="btn-primary !px-4"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      ) : (
        <p className="text-sm text-charcoal/50">
          <a href="/login" className="text-terra hover:underline">Inicia sesión</a> para comentar.
        </p>
      )}
    </div>
  );
}
