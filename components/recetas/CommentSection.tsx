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

export default function CommentSection({ recipeId, initialComments }: Props) {
  const [comments, setComments] = useState<Comment[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<Comment | null>(null);
  const [replyMention, setReplyMention] = useState<string | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Set<string>>(new Set());
  const replyInputRef = useRef<HTMLInputElement>(null);

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

          // Auto-expandir respuestas del comentario padre
          if (newC.parent_id) {
            setExpandedReplies((prev) => new Set(prev).add(newC.parent_id!));
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [recipeId]);

  // Enviar comentario o respuesta
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    setSending(true);

    // Si respondemos a una respuesta (no al comentario raíz), agregar @mención
    const content = (replyingTo && replyMention && replyMention !== getDisplayName(replyingTo))
      ? `@${replyMention} ${newComment.trim()}`
      : newComment.trim();

    const { error } = await supabase
      .from('comments')
      .insert({
        recipe_id: recipeId,
        user_id: user.id,
        content,
        parent_id: replyingTo?.id ?? null,
      });

    if (!error) {
      setNewComment('');
      setReplyingTo(null);
      setReplyMention(null);
    }
    setSending(false);
  };

  // Responder a un comentario o a una respuesta (siempre en el mismo hilo)
  const handleReply = (comment: Comment, mentionName?: string) => {
    // Si es una respuesta, el parent_id apunta al comentario raíz
    // Si es un comentario raíz, el parent_id es su propio id
    const rootComment = comment.parent_id
      ? comments.find((c) => c.id === comment.parent_id) ?? comment
      : comment;

    setReplyingTo(rootComment);
    setReplyMention(mentionName ?? getDisplayName(comment));

    // Auto-expandir las respuestas del hilo
    setExpandedReplies((prev) => new Set(prev).add(rootComment.id));

    setTimeout(() => replyInputRef.current?.focus(), 100);
  };

  const toggleReplies = (commentId: string) => {
    setExpandedReplies((prev) => {
      const next = new Set(prev);
      if (next.has(commentId)) {
        next.delete(commentId);
      } else {
        next.add(commentId);
      }
      return next;
    });
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

  // Separar comentarios raíz y respuestas
  const rootComments = comments.filter((c) => !c.parent_id);
  const getReplies = (parentId: string) =>
    comments.filter((c) => c.parent_id === parentId);

  const totalCount = comments.length;

  return (
    <div>
      <h3 className="font-display text-xl font-bold flex items-center gap-2 mb-6">
        <MessageCircle className="w-5 h-5 text-terra" />
        Comentarios ({totalCount})
      </h3>

      {/* Lista de comentarios */}
      <div className="space-y-5 mb-6">
        {rootComments.length === 0 && (
          <p className="text-charcoal/40 text-sm py-4">
            Sé el primero en comentar esta receta.
          </p>
        )}

        {rootComments.map((comment) => {
          const displayName = getDisplayName(comment);
          const initial = displayName.charAt(0).toUpperCase();
          const replies = getReplies(comment.id);
          const isExpanded = expandedReplies.has(comment.id);

          return (
            <div key={comment.id} className="animate-fade-in">
              {/* Comentario principal */}
              <div className="flex gap-3">
                <div className="w-9 h-9 rounded-full bg-sage/15 flex-shrink-0 flex items-center justify-center">
                  <span className="text-xs font-bold text-sage">{initial}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium">{displayName}</span>
                    <span className="text-xs text-charcoal/40">{formatDate(comment.created_at)}</span>
                  </div>
                  <p className="text-sm text-charcoal/70 mt-1">{comment.content}</p>

                  {/* Botones */}
                  <div className="flex items-center gap-4 mt-2">
                    {user && (
                      <button
                        onClick={() => handleReply(comment)}
                        className="flex items-center gap-1.5 text-xs text-charcoal/40 hover:text-terra transition-colors"
                      >
                        <Reply className="w-3.5 h-3.5" /> Responder
                      </button>
                    )}

                    {replies.length > 0 && (
                      <button
                        onClick={() => toggleReplies(comment.id)}
                        className="flex items-center gap-1.5 text-xs font-medium text-terra hover:text-terra/80 transition-colors"
                      >
                        {isExpanded ? (
                          <><ChevronUp className="w-3.5 h-3.5" /> Ocultar {replies.length} respuesta{replies.length !== 1 ? 's' : ''}</>
                        ) : (
                          <><ChevronDown className="w-3.5 h-3.5" /> Ver {replies.length} respuesta{replies.length !== 1 ? 's' : ''}</>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Respuestas (colapsables) */}
              {isExpanded && replies.length > 0 && (
                <div className="ml-12 mt-3 space-y-3 border-l-2 border-charcoal/5 pl-4">
                  {replies.map((reply) => {
                    const replyName = getDisplayName(reply);
                    const replyInitial = replyName.charAt(0).toUpperCase();

                    // Detectar @mención al inicio del contenido
                    const mentionMatch = reply.content.match(/^@(\S+)\s/);
                    const mention = mentionMatch ? mentionMatch[1] : null;
                    const replyContent = mention
                      ? reply.content.slice(mentionMatch![0].length)
                      : reply.content;

                    return (
                      <div key={reply.id} className="flex gap-3 animate-fade-in">
                        <div className="w-7 h-7 rounded-full bg-terra/10 flex-shrink-0 flex items-center justify-center">
                          <span className="text-[10px] font-bold text-terra">{replyInitial}</span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-baseline gap-2">
                            <span className="text-sm font-medium">{replyName}</span>
                            <span className="text-xs text-charcoal/40">{formatDate(reply.created_at)}</span>
                          </div>
                          <p className="text-sm text-charcoal/70 mt-1">
                            {mention && (
                              <span className="text-terra font-medium">@{mention} </span>
                            )}
                            {replyContent}
                          </p>
                          {/* Botón responder en respuestas */}
                          {user && (
                            <button
                              onClick={() => handleReply(reply, replyName)}
                              className="flex items-center gap-1.5 text-xs text-charcoal/40 hover:text-terra transition-colors mt-1.5"
                            >
                              <Reply className="w-3 h-3" /> Responder
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Formulario */}
      {user ? (
        <div>
          {/* Indicador de respuesta */}
          {replyingTo && (
            <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-terra/5 rounded-lg text-sm animate-fade-in">
              <Reply className="w-3.5 h-3.5 text-terra flex-shrink-0" />
              <span className="text-charcoal/60">
                Respondiendo a <span className="font-medium text-charcoal">{replyMention ?? getDisplayName(replyingTo)}</span>
              </span>
              <button
                onClick={() => { setReplyingTo(null); setReplyMention(null); }}
                className="ml-auto p-0.5 rounded hover:bg-charcoal/5 text-charcoal/40 hover:text-charcoal transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-3">
            <input
              ref={replyInputRef}
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={replyingTo ? `Responder a ${replyMention ?? getDisplayName(replyingTo)}...` : 'Escribe un comentario...'}
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
