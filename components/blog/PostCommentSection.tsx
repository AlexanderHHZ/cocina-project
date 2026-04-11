
'use client';

import { useState, useEffect, useRef } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { MessageCircle, Reply, ChevronDown, ChevronUp, X, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import type { PostComment } from '@/types';
import type { User } from '@supabase/supabase-js';

interface Props {
  postId: string;
  initialComments: PostComment[];
}

function CommentMenu({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
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
      <button onClick={() => setOpen(!open)}
        className="p-1 rounded-md text-charcoal/30 hover:text-charcoal/60 hover:bg-charcoal/5 transition-colors">
        <MoreVertical className="w-3.5 h-3.5" />
      </button>
      {open && (
        <div className="absolute right-0 top-6 w-28 bg-white rounded-lg shadow-lg border border-charcoal/10 py-1 z-10 animate-scale-in origin-top-right">
          <button onClick={() => { onEdit(); setOpen(false); }}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-charcoal/70 hover:bg-charcoal/5 transition-colors">
            <Pencil className="w-3 h-3" /> Editar
          </button>
          <button onClick={() => { onDelete(); setOpen(false); }}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-wine hover:bg-wine/5 transition-colors">
            <Trash2 className="w-3 h-3" /> Eliminar
          </button>
        </div>
      )}
    </div>
  );
}

function CommentItem({
  comment, allComments, depth, user, onReply, onDelete, onEdit, formatDate, getDisplayName,
}: {
  comment: PostComment; allComments: PostComment[]; depth: number;
  user: User | null; onReply: (c: PostComment) => void;
  onDelete: (id: string) => void; onEdit: (c: PostComment) => void;
  formatDate: (d: string) => string; getDisplayName: (c: PostComment) => string;
}) {
  const [expanded, setExpanded] = useState(false);
  const replies = allComments.filter((c) => c.parent_id === comment.id);
  const displayName = getDisplayName(comment);
  const initial = displayName.charAt(0).toUpperCase();
  const isOwner = user?.id === comment.user_id;

  const avatarStyles = ['bg-sage/15 text-sage', 'bg-terra/10 text-terra', 'bg-gold/10 text-gold'];
  const avatarStyle = avatarStyles[Math.min(depth, avatarStyles.length - 1)];
  const avatarSize = depth === 0 ? 'w-8 h-8' : 'w-6 h-6';

  return (
    <div>
      <div className="flex gap-2.5 group/comment">
        <div className={`${avatarSize} rounded-full ${avatarStyle} flex-shrink-0 flex items-center justify-center`}>
          <span className="text-[10px] font-bold">{initial}</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-medium">{displayName}</span>
              <span className="text-xs text-charcoal/40">{formatDate(comment.created_at)}</span>
            </div>
            {isOwner && (
              <div className="opacity-0 group-hover/comment:opacity-100 transition-opacity">
                <CommentMenu onEdit={() => onEdit(comment)} onDelete={() => onDelete(comment.id)} />
              </div>
            )}
          </div>
          <p className="text-sm text-charcoal/70 mt-0.5">{comment.content}</p>
          <div className="flex items-center gap-3 mt-1.5">
            {user && (
              <button onClick={() => onReply(comment)}
                className="flex items-center gap-1 text-xs text-charcoal/40 hover:text-terra transition-colors">
                <Reply className="w-3 h-3" /> Responder
              </button>
            )}
            {replies.length > 0 && (
              <button onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-1 text-xs font-medium text-terra hover:text-terra/80 transition-colors">
                {expanded
                  ? <><ChevronUp className="w-3 h-3" /> Ocultar {replies.length}</>
                  : <><ChevronDown className="w-3 h-3" /> Ver {replies.length} respuesta{replies.length !== 1 ? 's' : ''}</>}
              </button>
            )}
          </div>
        </div>
      </div>
      {expanded && replies.length > 0 && (
        <div className={`${depth < 3 ? 'ml-5 sm:ml-8' : 'ml-3'} mt-2 space-y-2 border-l-2 border-charcoal/5 pl-3`}>
          {replies.map((r) => (
            <CommentItem key={r.id} comment={r} allComments={allComments} depth={depth + 1}
              user={user} onReply={onReply} onDelete={onDelete} onEdit={onEdit}
              formatDate={formatDate} getDisplayName={getDisplayName} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function PostCommentSection({ postId, initialComments }: Props) {
  const [comments, setComments] = useState<PostComment[]>(initialComments);
  const [newComment, setNewComment] = useState('');
  const [user, setUser] = useState<User | null>(null);
  const [sending, setSending] = useState(false);
  const [replyingTo, setReplyingTo] = useState<PostComment | null>(null);
  const [editingComment, setEditingComment] = useState<PostComment | null>(null);
  const [showComments, setShowComments] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const supabase = createSupabaseBrowser();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_e, s) => setUser(s?.user ?? null));
    const retry = setTimeout(async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) setUser(session.user);
    }, 1000);
    return () => { subscription.unsubscribe(); clearTimeout(retry); };
  }, []);

  useEffect(() => {
    const channel = supabase
      .channel(`post_comments:${postId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'post_comments', filter: `post_id=eq.${postId}` },
        async (payload) => {
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', payload.new.user_id).single();
          const newC: PostComment = { ...payload.new as PostComment, user: profile ?? undefined };
          setComments((prev) => prev.some((c) => c.id === newC.id) ? prev : [...prev, newC]);
        })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [postId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;
    setSending(true);

    if (editingComment) {
      const { error } = await supabase.from('post_comments').update({ content: newComment.trim() }).eq('id', editingComment.id);
      if (!error) {
        setComments((prev) => prev.map((c) => c.id === editingComment.id ? { ...c, content: newComment.trim() } : c));
      }
      setEditingComment(null);
    } else {
      const { error } = await supabase.from('post_comments').insert({
        post_id: postId, user_id: user.id, content: newComment.trim(), parent_id: replyingTo?.id ?? null,
      });
      if (error) console.error('[PostComment] Error:', error);
    }

    setNewComment('');
    setReplyingTo(null);
    setSending(false);
  };

  const handleReply = (comment: PostComment) => {
    setEditingComment(null);
    setReplyingTo(comment);
    setShowComments(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleEdit = (comment: PostComment) => {
    setReplyingTo(null);
    setEditingComment(comment);
    setNewComment(comment.content);
    setShowComments(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar este comentario?')) return;
    const { error } = await supabase.from('post_comments').delete().eq('id', id);
    if (!error) {
      setComments((prev) => prev.filter((c) => c.id !== id && c.parent_id !== id));
    }
  };

  const handleCancel = () => {
    setNewComment('');
    setReplyingTo(null);
    setEditingComment(null);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
  const getDisplayName = (c: PostComment) => c.user?.full_name?.trim() || c.user?.email?.split('@')[0] || 'Usuario';
  const rootComments = comments.filter((c) => !c.parent_id);

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
      <button onClick={() => setShowComments(!showComments)}
        className="flex items-center gap-1.5 text-sm text-charcoal/40 hover:text-charcoal transition-colors">
        <MessageCircle className="w-4 h-4" />
        <span>{comments.length} comentario{comments.length !== 1 ? 's' : ''}</span>
      </button>

      {showComments && (
        <div className="mt-4 animate-fade-in">
          <div className="space-y-3 mb-4">
            {rootComments.length === 0 && (
              <p className="text-charcoal/40 text-xs">Sé el primero en comentar.</p>
            )}
            {rootComments.map((c) => (
              <CommentItem key={c.id} comment={c} allComments={comments} depth={0}
                user={user} onReply={handleReply} onDelete={handleDelete} onEdit={handleEdit}
                formatDate={formatDate} getDisplayName={getDisplayName} />
            ))}
          </div>

          {user ? (
            <div>
              {(replyingTo || editingComment) && (
                <div className="flex items-center gap-2 mb-2 px-3 py-1.5 bg-terra/5 rounded-lg text-xs animate-fade-in">
                  {editingComment
                    ? <Pencil className="w-3 h-3 text-terra" />
                    : <Reply className="w-3 h-3 text-terra" />}
                  <span className="text-charcoal/60">
                    {editingComment
                      ? 'Editando comentario'
                      : <>Respondiendo a <span className="font-medium text-charcoal">{getDisplayName(replyingTo!)}</span></>}
                  </span>
                  <button onClick={handleCancel} className="ml-auto p-0.5 rounded hover:bg-charcoal/5">
                    <X className="w-3 h-3 text-charcoal/40" />
                  </button>
                </div>
              )}
              <form onSubmit={handleSubmit}>
                <input ref={inputRef} type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)}
                  placeholder={getPlaceholder()} className="input-field w-full !py-2 !text-sm mb-2" maxLength={500} />
                <div className="flex justify-end gap-2">
                  {newComment.trim() && (
                    <button type="button" onClick={handleCancel}
                      className="px-3 py-1.5 text-xs font-medium text-charcoal/60 hover:text-charcoal hover:bg-charcoal/5 rounded-lg transition-colors">
                      Cancelar
                    </button>
                  )}
                  <button type="submit" disabled={sending || !newComment.trim()}
                    className="btn-primary !px-3 !py-1.5 text-xs">
                    {getSubmitLabel()}
                  </button>
                </div>
              </form>
            </div>
          ) : (
            <p className="text-xs text-charcoal/50">
              <a href="/login" className="text-terra hover:underline">Inicia sesión</a> para comentar.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
