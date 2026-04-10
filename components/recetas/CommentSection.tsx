'use client';

import { useState, useEffect } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { Send, MessageCircle } from 'lucide-react';
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

  const supabase = createSupabaseBrowser();

  // Escuchar estado de auth para mantener sincronizado
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user)).catch(() => {});

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  // Suscripción realtime para nuevos comentarios
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
          // Obtener perfil del autor
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
            // Evitar duplicados
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
      });

    if (!error) setNewComment('');
    setSending(false);
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('es-ES', {
      day: 'numeric', month: 'short', year: 'numeric',
    });
  };

  return (
    <div>
      <h3 className="font-display text-xl font-bold flex items-center gap-2 mb-6">
        <MessageCircle className="w-5 h-5 text-terra" />
        Comentarios ({comments.length})
      </h3>

      {/* Lista */}
      <div className="space-y-4 mb-6">
        {comments.length === 0 && (
          <p className="text-charcoal/40 text-sm py-4">
            Sé el primero en comentar esta receta.
          </p>
        )}
        {comments.map((comment) => {
          const displayName = comment.user?.full_name?.trim()
            || comment.user?.email?.split('@')[0]
            || 'Usuario';
          const initial = displayName.charAt(0).toUpperCase();

          return (
          <div key={comment.id} className="flex gap-3 animate-fade-in">
            <div className="w-9 h-9 rounded-full bg-sage/15 flex-shrink-0 flex items-center justify-center">
              <span className="text-xs font-bold text-sage">
                {initial}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-baseline gap-2">
                <span className="text-sm font-medium">
                  {displayName}
                </span>
                <span className="text-xs text-charcoal/40">
                  {formatDate(comment.created_at)}
                </span>
              </div>
              <p className="text-sm text-charcoal/70 mt-1">{comment.content}</p>
            </div>
          </div>
          );
        })}
      </div>

      {/* Formulario */}
      {user ? (
        <form onSubmit={handleSubmit} className="flex gap-3">
          <input
            type="text"
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            placeholder="Escribe un comentario..."
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
      ) : (
        <p className="text-sm text-charcoal/50">
          <a href="/login" className="text-terra hover:underline">Inicia sesión</a> para comentar.
        </p>
      )}
    </div>
  );
}
