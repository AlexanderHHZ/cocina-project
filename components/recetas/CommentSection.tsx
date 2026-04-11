'use client';

import { useState, useEffect, useRef } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { MessageCircle, Reply, ChevronDown, ChevronUp, X, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import type { Comment } from '@/types';
import type { User } from '@supabase/supabase-js';

interface Props {
  recipeId: string;
  initialComments: Comment[];
}

// ============================================
// Menú de 3 puntos
// ============================================
function CommentMenu({
  onEdit,
  onDelete,
}: {
  onEdit: () => void;
  onDelete: () => void;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen(!open)}
        className="p-1 rounded-md text-charcoal/30 hover:text-charcoal/60 hover:bg-charcoal/5 transition-colors"
      >
        <MoreVertical className="w-4 h-4" />
      </button>
      {open && (
        <div className="absolute right-0 top-7 w-32 bg-white rounded-lg shadow-lg border border-charcoal/10 py-1 z-10 animate-scale-in origin-top-right">
          <button
            onClick={() => { onEdit(); setOpen(false); }}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-charcoal/70 hover:bg-charcoal/5 transition-colors"
          >
            <Pencil className="w-3 h-3" /> Editar
          </button>
          <button
            onClick={() => { onDelete(); setOpen(false); }}
            className="flex items-center gap-2 w-full px-3 py-2 text-xs text-wine hover:bg-wine/5 transition-colors"
          >
            <Trash2 className="w-3 h-3" /> Eliminar
          </button>
        </div>
      )}
    </div>
  );
}

// ============================================
// Comentario individual (recursivo)
// ============================================
function CommentItem({
  comment,
  allComments,
  depth,
  user,
  onReply,
  onDelete,
  onEdit,
  formatDate,
  getDisplayName,
}: {
  comment: Comment;
  allComments: Comment[];
  depth: number;
  user: User | null;
  onReply: (comment: Comment) => void;
  onDelete: (id: string) => void;
  onEdit: (comment: Comment) => void;
  formatDate: (d: string) => string;
  getDisplayName: (c: Comment) => string;
}) {
  const [expanded, setExpanded] = useState(false);

  const replies = allComments.filter((c) => c.parent_id === comment.id);
  const displayName = getDisplayName(comment);
  const initial = displayName.charAt(0).toUpperCase();
  const isOwner = user?.id === comment.user_id;

  const avatarStyles = [
    'bg-sage/15 text-sage',
    'bg-terra/10 text-terra',
    'bg-gold/10 text-gold',
    'bg-wine/10 text-wine',
  ];
  const avatarStyle = avatarStyles[Math.min(depth, avatarStyles.length - 1)];
  const avatarSize = depth === 0 ? 'w-9 h-9' : 'w-7 h-7';
  const textSize = depth === 0 ? 'text-xs' : 'text-[10px]';
  const indent = depth < 3;

  return (
    <div className="animate-fade-in">
      <div className="flex gap-3 group/comment">
        <div className={`${avatarSize} rounded-full ${avatarStyle} flex-shrink-0 flex items-center justify-center`}>
          <span className={`${textSize} font-bold`}>{initial}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium">{displayName}</span>
              <span className="text-xs text-charcoal/40">{formatDate(comment.created_at)}</span>
            </div>
            {/* Menú 3 puntos - solo para el autor del comentario */}
            {isOwner && (
              <div className="opacity-0 group-hover/comment:opacity-100 transition-opacity">
                <CommentMenu
                  onEdit={() => onEdit(comment)}
                  onDelete={() => onDelete(comment.id)}
                />
              </div>
            )}
          </div>
          <p className="text-sm text-charcoal/70 mt-1">{comment.content}</p>

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
              onDelete={onDelete}
              onEdit={onEdit}
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
  const [editingComment, setEditingComment] = useState<Comment | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const supabase = createSupabaseBrowser();

  // Auth
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => { setUser(session?.user ?? null); }
    );
    const retry = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) setUser(session.user);
    }, 1000);
    return () => { subscription.unsubscribe(); clearTimeout(retry); };
  }, []);

  // Realtime
  useEffect(() => {
    const channel = supabase
      .channel(`comments:${recipeId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'comments', filter: `recipe_id=eq.${recipeId}` },
        async (payload) => {
          const { data: profile } = await supabase
            .from('profiles').select('*').eq('id', payload.new.user_id).single();
          const newC: Comment = { ...payload.new as Comment, user: profile ?? undefined };
          setComments((prev) => {
            if (prev.some((c) => c.id === newC.id)) return prev;
            return [...prev, newC];
          });
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [recipeId]);

  // Enviar o actualizar comentario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    setSending(true);

    if (editingComment) {
      // Editar comentario existente
      const { error } = await supabase
        .from('comments')
        .update({ content: newComment.trim() })
        .eq('id', editingComment.id);

      if (!error) {
        setComments((prev) =>
          prev.map((c) => c.id === editingComment.id ? { ...c, content: newComment.trim() } : c)
        );
      }
      setEditingComment(null);
    } else {
      // Nuevo comentario
      const { error } = await supabase
        .from('comments')
        .insert({
          recipe_id: recipeId,
          user_id: user.id,
          content: newComment.trim(),
          parent_id: replyingTo?.id ?? null,
        });
      if (error) console.error('[Comment] Error:', error);
    }

    setNewComment('');
    setReplyingTo(null);
    setSending(false);
  };

  const handleReply = (comment: Comment) => {
    setEditingComment(null);
    setReplyingTo(comment);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleEdit = (comment: Comment) => {
    setReplyingTo(null);
    setEditingComment(comment);
    setNewComment(comment.content);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este comentario?')) return;
    const { error } = await supabase.from('comments').delete().eq('id', id);
    if (!error) {
      // Eliminar el comentario y todas sus respuestas
      setComments((prev) => prev.filter((c) => c.id !== id && c.parent_id !== id));
    }
  };

  const handleCancel = () => {
    setNewComment('');
    setReplyingTo(null);
    setEditingComment(null);
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

  const rootComments = comments.filter((c) => !c.parent_id);

  // Determinar texto del placeholder y botón
  const getPlaceholder = () => {
    if (editingComment) return 'Editar comentario...';
    if (replyingTo) return `Responder a ${getDisplayName(replyingTo)}...`;
    return 'Escribe un comentario...';
  };

  const getSubmitLabel = () => {
    if (sending) return 'Enviando...';
    if (editingComment) return 'Guardar';
    return 'Comentar';
  };

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
            onDelete={handleDelete}
            onEdit={handleEdit}
            formatDate={formatDate}
            getDisplayName={getDisplayName}
          />
        ))}
      </div>

      {/* Formulario */}
      {user ? (
        <div>
          {/* Indicador de respuesta o edición */}
          {(replyingTo || editingComment) && (
            <div className="flex items-center gap-2 mb-2 px-3 py-2 bg-terra/5 rounded-lg text-sm animate-fade-in">
              {editingComment ? (
                <Pencil className="w-3.5 h-3.5 text-terra flex-shrink-0" />
              ) : (
                <Reply className="w-3.5 h-3.5 text-terra flex-shrink-0" />
              )}
              <span className="text-charcoal/60">
                {editingComment
                  ? 'Editando comentario'
                  : <>Respondiendo a <span className="font-medium text-charcoal">{getDisplayName(replyingTo!)}</span></>
                }
              </span>
              <button
                onClick={handleCancel}
                className="ml-auto p-0.5 rounded hover:bg-charcoal/5 text-charcoal/40 hover:text-charcoal transition-colors"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={getPlaceholder()}
              className="input-field w-full mb-3"
              maxLength={500}
            />
            <div className="flex justify-end gap-2">
              {newComment.trim() && (
                <button
                  type="button"
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm font-medium text-charcoal/60 hover:text-charcoal hover:bg-charcoal/5 rounded-lg transition-colors"
                >
                  Cancelar
                </button>
              )}
              <button
                type="submit"
                disabled={sending || !newComment.trim()}
                className="btn-primary !py-2 text-sm"
              >
                {getSubmitLabel()}
              </button>
            </div>
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
