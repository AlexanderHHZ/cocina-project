'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import {
  Plus, Trash2, Edit3, Save, X, Image as ImageIcon, Youtube, ChefHat, Mail, Check, Newspaper,
} from 'lucide-react';
import type { Recipe, Post } from '@/types';

type ContactMessage = {
  id: string;
  name: string;
  email: string;
  message: string;
  is_read: boolean;
  created_at: string;
};

type RecipeForm = {
  title: string;
  description: string;
  ingredients: string;
  steps: string;
  prep_time: number;
  servings: number;
  difficulty: 'fácil' | 'media' | 'difícil';
  video_url: string;
};

const emptyForm: RecipeForm = {
  title: '', description: '', ingredients: '', steps: '',
  prep_time: 30, servings: 4, difficulty: 'fácil', video_url: '',
};

interface Props {
  initialRecipes: Recipe[];
  initialMessages: ContactMessage[];
  initialPosts: Post[];
  userId: string;
}

export default function AdminPanel({ initialRecipes, initialMessages, initialPosts, userId }: Props) {
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);
  const [messages, setMessages] = useState<ContactMessage[]>(initialMessages);
  const [posts, setPosts] = useState<Post[]>(initialPosts);
  const [showForm, setShowForm] = useState(false);
  const [showPostForm, setShowPostForm] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postImages, setPostImages] = useState<File[]>([]);
  const [postVideoUrl, setPostVideoUrl] = useState('');
  const [savingPost, setSavingPost] = useState(false);
  const [postMessage, setPostMessage] = useState('');
  const [editingPostId, setEditingPostId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RecipeForm>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const supabase = createSupabaseBrowser();
  const router = useRouter();

  const loadRecipes = async () => {
    const { data } = await supabase
      .from('recipes')
      .select('*')
      .order('created_at', { ascending: false });
    setRecipes(data ?? []);
  };

  const slugify = (text: string) =>
    text.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

  // Extraer ID de YouTube de distintos formatos de URL
  const extractYoutubeId = (url: string): string | null => {
    if (!url.trim()) return null;
    const patterns = [
      /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
      /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
      /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    ];
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match) return match[1];
    }
    return null;
  };

  const uploadFile = async (file: File, bucket: string) => {
    const ext = file.name.split('.').pop()?.toLowerCase();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: true });

    if (error) throw new Error(`Error al subir imagen: ${error.message}`);

    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
    return urlData.publicUrl;
  };

  // Convertir imagen (Blob) a WebP usando Canvas
  const convertToWebP = (blob: Blob, maxWidth?: number): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const img = document.createElement('img');
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let w = img.width;
        let h = img.height;

        if (maxWidth && w > maxWidth) {
          h = Math.round((h * maxWidth) / w);
          w = maxWidth;
        }

        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) { reject(new Error('No canvas context')); return; }
        ctx.drawImage(img, 0, 0, w, h);

        canvas.toBlob(
          (result) => {
            if (result) resolve(result);
            else reject(new Error('Error al convertir a WebP'));
          },
          'image/webp',
          0.85
        );
      };
      img.onerror = () => reject(new Error('Error al cargar imagen'));
      img.crossOrigin = 'anonymous';
      img.src = URL.createObjectURL(blob);
    });
  };

  // Validar que el archivo sea WebP
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setImageFile(null);
      return;
    }

    if (file.type !== 'image/webp') {
      setMessage('Error: Solo se permiten imágenes en formato WebP (.webp)');
      e.target.value = '';
      setImageFile(null);
      return;
    }

    setMessage('');
    setImageFile(file);
  };

  // Validar que la miniatura sea WebP
  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) {
      setThumbnailFile(null);
      return;
    }

    if (file.type !== 'image/webp') {
      setMessage('Error: Solo se permiten imágenes en formato WebP (.webp)');
      e.target.value = '';
      setThumbnailFile(null);
      return;
    }

    setMessage('');
    setThumbnailFile(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      // Procesar URL de YouTube primero (necesitamos el ID para las miniaturas)
      let video_url: string | null = null;
      let youtubeId: string | null = null;
      if (form.video_url.trim()) {
        youtubeId = extractYoutubeId(form.video_url);
        if (!youtubeId) {
          setMessage('Error: URL de YouTube no válida. Usa un enlace como https://www.youtube.com/watch?v=XXXXX');
          setSaving(false);
          return;
        }
        video_url = `https://www.youtube.com/embed/${youtubeId}`;
      }

      // Subir imagen principal WebP si hay
      let image_url: string | null = null;
      if (imageFile) {
        image_url = await uploadFile(imageFile, 'recipe-images');
      }

      // Subir miniatura WebP si hay
      let thumbnail_url: string | null = null;
      if (thumbnailFile) {
        thumbnail_url = await uploadFile(thumbnailFile, 'recipe-images');
      }

      // Si hay YouTube y faltan imágenes, extraer miniatura automáticamente
      if (youtubeId) {
        const needsImage = !image_url && !imageFile;
        const needsThumbnail = !thumbnail_url && !thumbnailFile;

        if (needsImage || needsThumbnail) {
          // Intentar maxresdefault primero, luego hqdefault
          const urls = [
            `https://img.youtube.com/vi/${youtubeId}/maxresdefault.jpg`,
            `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
          ];

          let blob: Blob | null = null;
          for (const url of urls) {
            try {
              const res = await fetch(url);
              if (res.ok) {
                blob = await res.blob();
                if (blob.size > 5000) break;
                blob = null;
              }
            } catch { continue; }
          }

          if (blob) {
            // Convertir a WebP usando Canvas
            const webpBlob = await convertToWebP(blob);

            if (needsImage) {
              const path = `yt-img-${youtubeId}-${Date.now()}.webp`;
              const { error } = await supabase.storage.from('recipe-images').upload(path, webpBlob, { upsert: true, contentType: 'image/webp' });
              if (!error) {
                const { data: urlData } = supabase.storage.from('recipe-images').getPublicUrl(path);
                image_url = urlData.publicUrl;
              }
            }

            if (needsThumbnail) {
              // Crear versión más pequeña para miniatura
              const thumbBlob = await convertToWebP(blob, 640);
              const path = `yt-thumb-${youtubeId}-${Date.now()}.webp`;
              const { error } = await supabase.storage.from('recipe-images').upload(path, thumbBlob, { upsert: true, contentType: 'image/webp' });
              if (!error) {
                const { data: urlData } = supabase.storage.from('recipe-images').getPublicUrl(path);
                thumbnail_url = urlData.publicUrl;
              }
            }
          }
        }
      }

      const recipeData = {
        title: form.title,
        slug: slugify(form.title),
        description: form.description,
        ingredients: form.ingredients.split('\n').filter(Boolean),
        steps: form.steps.split('\n').filter(Boolean),
        prep_time: form.prep_time,
        servings: form.servings,
        difficulty: form.difficulty,
        author_id: userId,
        ...(image_url && { image_url }),
        ...(thumbnail_url && { thumbnail_url }),
        video_url: video_url,
      };

      console.log('[Admin] Guardando receta...', recipeData);

      if (editingId) {
        const { data, error, status } = await supabase
          .from('recipes')
          .update(recipeData)
          .eq('id', editingId)
          .select();
        console.log('[Admin] Update result:', { data, error, status });
        if (error) throw new Error(`Error al actualizar: ${error.message} (código: ${error.code})`);
        setMessage('Receta actualizada');
      } else {
        const { data, error, status } = await supabase
          .from('recipes')
          .insert(recipeData)
          .select();
        console.log('[Admin] Insert result:', { data, error, status });
        if (error) throw new Error(`Error al crear: ${error.message} (código: ${error.code})`);
        setMessage('Receta creada');
      }

      resetForm();
      await loadRecipes();
      router.refresh();
    } catch (err: any) {
      console.error('[Admin] ERROR:', err);
      setMessage(err.message || 'Error desconocido al guardar');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (recipe: Recipe) => {
    setEditingId(recipe.id);
    setForm({
      title: recipe.title,
      description: recipe.description,
      ingredients: recipe.ingredients.join('\n'),
      steps: recipe.steps.join('\n'),
      prep_time: recipe.prep_time,
      servings: recipe.servings ?? 4,
      difficulty: recipe.difficulty,
      video_url: recipe.video_url ?? '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta receta?')) return;
    const { error } = await supabase.from('recipes').delete().eq('id', id);
    if (error) {
      setMessage(`Error al eliminar: ${error.message}`);
      return;
    }
    await loadRecipes();
    router.refresh();
  };

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
    setImageFile(null);
    setThumbnailFile(null);
    setShowForm(false);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
      <div className="flex items-center justify-between mb-8">
        <h1 className="font-display text-3xl font-bold flex items-center gap-3">
          <ChefHat className="w-7 h-7 text-terra" /> Panel Admin
        </h1>
        {!showForm && (
          <button onClick={() => setShowForm(true)} className="btn-primary">
            <Plus className="w-4 h-4" /> Nueva receta
          </button>
        )}
      </div>

      {message && (
        <div className={`mb-6 p-3 rounded-lg text-sm animate-fade-in ${
          message.includes('Error') ? 'bg-wine/10 text-wine' : 'bg-sage/10 text-sage'
        }`}>{message}</div>
      )}

      {/* Squoosh - herramienta de compresión de imágenes */}
      <a
        href="https://squoosh.app/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 mb-6 px-4 py-3 rounded-xl border border-dashed border-terra/30
                   bg-terra/[0.03] hover:bg-terra/[0.06] transition-colors group"
      >
        <div className="w-8 h-8 rounded-lg bg-terra/10 flex items-center justify-center flex-shrink-0">
          <ImageIcon className="w-4 h-4 text-terra" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-charcoal group-hover:text-terra transition-colors">
            Optimizar imágenes con Squoosh
          </p>
          <p className="text-xs text-charcoal/40">
            Convierte y comprime tus imágenes a WebP antes de subirlas
          </p>
        </div>
        <span className="text-xs text-terra font-medium flex-shrink-0">Abrir →</span>
      </a>

      {showForm && (
        <div className="bg-white rounded-2xl border border-charcoal/5 p-6 mb-8 animate-slide-up">
          <div className="flex items-center justify-between mb-6">
            <h2 className="font-display text-xl font-bold">
              {editingId ? 'Editar receta' : 'Nueva receta'}
            </h2>
            <button onClick={resetForm} className="p-2 hover:bg-charcoal/5 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-medium mb-2">Título</label>
                <input
                  type="text" required
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  className="input-field" placeholder="Ej: Tacos al pastor"
                />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Tiempo (min)</label>
                  <input
                    type="number" required min={1}
                    value={form.prep_time}
                    onChange={(e) => setForm({ ...form, prep_time: Number(e.target.value) })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Porciones</label>
                  <input
                    type="number" required min={1}
                    value={form.servings}
                    onChange={(e) => setForm({ ...form, servings: Number(e.target.value) })}
                    className="input-field"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Dificultad</label>
                  <select
                    value={form.difficulty}
                    onChange={(e) => setForm({ ...form, difficulty: e.target.value as any })}
                    className="input-field"
                  >
                    <option value="fácil">Fácil</option>
                    <option value="media">Media</option>
                    <option value="difícil">Difícil</option>
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Descripción</label>
              <textarea
                required rows={2}
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="input-field resize-none"
                placeholder="Breve descripción de la receta..."
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Ingredientes (uno por línea)</label>
              <textarea
                required rows={5}
                value={form.ingredients}
                onChange={(e) => setForm({ ...form, ingredients: e.target.value })}
                className="input-field resize-none font-mono text-sm"
                placeholder={"200g de harina\n3 huevos\n1 taza de leche"}
              />
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Pasos (uno por línea)</label>
              <textarea
                required rows={5}
                value={form.steps}
                onChange={(e) => setForm({ ...form, steps: e.target.value })}
                className="input-field resize-none font-mono text-sm"
                placeholder={"Mezclar ingredientes secos\nAñadir huevos y batir\nHornear 30 min a 180°C"}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {/* Imagen principal */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  <ImageIcon className="w-4 h-4 inline mr-1" /> Imagen principal
                  <span className="text-charcoal/40 font-normal ml-1">(solo .webp)</span>
                </label>
                <input
                  type="file"
                  accept="image/webp,.webp"
                  onChange={handleImageChange}
                  className="input-field text-sm file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:bg-terra/10 file:text-terra"
                />
                <p className="text-xs text-charcoal/30 mt-1">Se ve al entrar a la receta. Recomendado: 1280 × 720px</p>
              </div>

              {/* Miniatura */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  <ImageIcon className="w-4 h-4 inline mr-1" /> Miniatura
                  <span className="text-charcoal/40 font-normal ml-1">(solo .webp)</span>
                </label>
                <input
                  type="file"
                  accept="image/webp,.webp"
                  onChange={handleThumbnailChange}
                  className="input-field text-sm file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:bg-terra/10 file:text-terra"
                />
                <p className="text-xs text-charcoal/30 mt-1">Se ve en la tarjeta de recetas. Recomendado: 640 × 360px</p>
              </div>
            </div>

            {/* Video - URL de YouTube */}
            <div>
              <label className="block text-sm font-medium mb-2">
                <Youtube className="w-4 h-4 inline mr-1" /> Video de YouTube
                <span className="text-charcoal/40 font-normal ml-1">(opcional)</span>
              </label>
              <input
                type="url"
                value={form.video_url}
                onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                className="input-field"
                placeholder="https://www.youtube.com/watch?v=..."
              />
              {form.video_url.trim() && extractYoutubeId(form.video_url) && (
                <p className="text-xs text-sage mt-1.5 flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 6L9 17l-5-5"/></svg>
                  Si no subes imágenes, se extraerán automáticamente de YouTube en WebP
                </p>
              )}
            </div>

            <button type="submit" disabled={saving} className="btn-primary">
              <Save className="w-4 h-4" />
              {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Publicar receta'}
            </button>
          </form>
        </div>
      )}

      {/* Lista de recetas */}
      <div className="space-y-3">
        {recipes.length === 0 && (
          <p className="text-charcoal/40 text-center py-10">No hay recetas. Crea la primera.</p>
        )}
        {recipes.map((recipe) => (
          <div key={recipe.id} className="bg-white rounded-xl border border-charcoal/5 p-4 flex items-center justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h3 className="font-medium truncate">{recipe.title}</h3>
              <p className="text-xs text-charcoal/40 mt-0.5">
                {recipe.difficulty} · {recipe.prep_time} min · {recipe.servings ?? 4} porcion{(recipe.servings ?? 4) !== 1 ? 'es' : ''} ·{' '}
                {new Date(recipe.created_at).toLocaleDateString('es-ES')}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => handleEdit(recipe)}
                className="p-2 rounded-lg hover:bg-charcoal/5 transition-colors text-charcoal/50 hover:text-terra">
                <Edit3 className="w-4 h-4" />
              </button>
              <button onClick={() => handleDelete(recipe.id)}
                className="p-2 rounded-lg hover:bg-wine/5 transition-colors text-charcoal/50 hover:text-wine">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* ======== MENSAJES DE CONTACTO ======== */}
      <div className="mt-16">
        <h2 className="font-display text-2xl font-bold flex items-center gap-3 mb-6">
          <Mail className="w-6 h-6 text-terra" />
          Mensajes de contacto
          {messages.filter(m => !m.is_read).length > 0 && (
            <span className="bg-terra text-white text-xs font-bold px-2.5 py-1 rounded-full">
              {messages.filter(m => !m.is_read).length} nuevo{messages.filter(m => !m.is_read).length !== 1 ? 's' : ''}
            </span>
          )}
        </h2>

        <div className="space-y-3">
          {messages.length === 0 && (
            <p className="text-charcoal/40 text-center py-10">No hay mensajes.</p>
          )}
          {messages.map((msg) => (
            <div
              key={msg.id}
              className={`bg-white rounded-xl border p-5 transition-all ${
                msg.is_read ? 'border-charcoal/5 opacity-60' : 'border-terra/20 bg-terra/[0.02]'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">{msg.name}</span>
                    <span className="text-xs text-charcoal/40">{msg.email}</span>
                    {!msg.is_read && (
                      <span className="w-2 h-2 rounded-full bg-terra flex-shrink-0" />
                    )}
                  </div>
                  <p className="text-sm text-charcoal/70">{msg.message}</p>
                  <p className="text-xs text-charcoal/30 mt-2">
                    {new Date(msg.created_at).toLocaleDateString('es-ES', {
                      day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
                    })}
                  </p>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  {!msg.is_read && (
                    <button
                      onClick={async () => {
                        await supabase.from('contact_messages').update({ is_read: true }).eq('id', msg.id);
                        setMessages(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
                      }}
                      className="p-2 rounded-lg hover:bg-sage/10 transition-colors text-charcoal/40 hover:text-sage"
                      title="Marcar como leído"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={async () => {
                      if (!confirm('¿Eliminar este mensaje?')) return;
                      await supabase.from('contact_messages').delete().eq('id', msg.id);
                      setMessages(prev => prev.filter(m => m.id !== msg.id));
                    }}
                    className="p-2 rounded-lg hover:bg-wine/5 transition-colors text-charcoal/40 hover:text-wine"
                    title="Eliminar"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ======== BLOG / PUBLICACIONES ======== */}
      <div className="mt-16">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl font-bold flex items-center gap-3">
            <Newspaper className="w-6 h-6 text-terra" /> Publicaciones
          </h2>
          {!showPostForm && (
            <button onClick={() => setShowPostForm(true)} className="btn-primary text-sm">
              <Plus className="w-4 h-4" /> Nueva publicación
            </button>
          )}
        </div>

        {postMessage && (
          <div className={`mb-4 p-3 rounded-lg text-sm animate-fade-in ${
            postMessage.includes('Error') ? 'bg-wine/10 text-wine' : 'bg-sage/10 text-sage'
          }`}>{postMessage}</div>
        )}

        {/* Formulario crear/editar post */}
        {showPostForm && (
          <div className="bg-white rounded-2xl border border-charcoal/5 p-6 mb-6 animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-display text-lg font-bold">{editingPostId ? 'Editar publicación' : 'Nueva publicación'}</h3>
              <button onClick={() => { setShowPostForm(false); setPostContent(''); setPostImages([]); setPostVideoUrl(''); setEditingPostId(null); }}
                className="p-2 hover:bg-charcoal/5 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <textarea
                value={postContent}
                onChange={(e) => setPostContent(e.target.value)}
                placeholder="¿Qué quieres compartir?"
                rows={4}
                className="input-field resize-none"
                maxLength={2000}
              />

              <div>
                <label className="block text-sm font-medium mb-2">
                  <ImageIcon className="w-4 h-4 inline mr-1" /> Imágenes
                  <span className="text-charcoal/40 font-normal ml-1">(solo .webp, máximo 10)</span>
                </label>
                <input
                  type="file"
                  accept="image/webp,.webp"
                  multiple
                  onChange={(e) => {
                    const files = Array.from(e.target.files ?? []);
                    const valid = files.filter(f => f.type === 'image/webp');
                    if (valid.length !== files.length) {
                      setPostMessage('Error: Solo se permiten imágenes WebP');
                    } else {
                      setPostMessage('');
                    }
                    setPostImages(valid.slice(0, 10));
                  }}
                  className="input-field text-sm file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:bg-terra/10 file:text-terra"
                />
                {postImages.length > 0 && (
                  <p className="text-xs text-charcoal/40 mt-1">{postImages.length} imagen{postImages.length !== 1 ? 'es' : ''} seleccionada{postImages.length !== 1 ? 's' : ''}</p>
                )}
              </div>

              {/* Video de YouTube */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  <Youtube className="w-4 h-4 inline mr-1" /> Video de YouTube
                  <span className="text-charcoal/40 font-normal ml-1">(opcional)</span>
                </label>
                <input
                  type="url"
                  value={postVideoUrl}
                  onChange={(e) => setPostVideoUrl(e.target.value)}
                  className="input-field"
                  placeholder="https://www.youtube.com/watch?v=..."
                />
              </div>

              <button
                onClick={async () => {
                  if (!postContent.trim()) { setPostMessage('Error: Escribe algo'); return; }
                  setSavingPost(true);
                  setPostMessage('');

                  try {
                    // Subir imágenes nuevas (si hay)
                    const imageUrls: string[] = [];
                    for (const file of postImages) {
                      const ext = file.name.split('.').pop();
                      const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
                      const { error } = await supabase.storage.from('post-images').upload(path, file, { upsert: true });
                      if (error) throw new Error(`Error al subir imagen: ${error.message}`);
                      const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(path);
                      imageUrls.push(urlData.publicUrl);
                    }

                    // Video de YouTube (guardar URL original)
                    const videoUrl = postVideoUrl.trim() || null;

                    if (editingPostId) {
                      // Editar: solo actualizar contenido, video, y agregar nuevas imágenes
                      const updateData: any = {
                        content: postContent.trim(),
                        video_url: videoUrl,
                        updated_at: new Date().toISOString(),
                      };
                      // Solo actualizar imágenes si se subieron nuevas
                      if (imageUrls.length > 0) {
                        updateData.images = imageUrls;
                      }
                      const { error } = await supabase.from('posts').update(updateData).eq('id', editingPostId);
                      if (error) throw new Error(error.message);
                      setPostMessage('Publicación actualizada');
                    } else {
                      const { error } = await supabase.from('posts').insert({
                        content: postContent.trim(),
                        images: imageUrls,
                        video_url: videoUrl,
                        author_id: userId,
                      });
                      if (error) throw new Error(error.message);
                      setPostMessage('Publicación creada');
                    }

                    setPostContent('');
                    setPostImages([]);
                    setPostVideoUrl('');
                    setEditingPostId(null);
                    setShowPostForm(false);

                    // Recargar posts
                    const { data } = await supabase.from('posts').select('*').order('created_at', { ascending: false });
                    setPosts(data ?? []);
                    router.refresh();
                  } catch (err: any) {
                    setPostMessage(`Error: ${err.message}`);
                  } finally {
                    setSavingPost(false);
                  }
                }}
                disabled={savingPost}
                className="btn-primary"
              >
                <Save className="w-4 h-4" />
                {savingPost ? 'Guardando...' : editingPostId ? 'Actualizar' : 'Publicar'}
              </button>
            </div>
          </div>
        )}

        {/* Lista de posts */}
        <div className="space-y-3">
          {posts.length === 0 && (
            <p className="text-charcoal/40 text-center py-10">No hay publicaciones.</p>
          )}
          {posts.map((post) => (
            <div key={post.id} className="bg-white rounded-xl border border-charcoal/5 p-4 flex items-start justify-between gap-4">
              <div className="flex-1 min-w-0">
                <p className="text-sm line-clamp-2">{post.content}</p>
                <p className="text-xs text-charcoal/40 mt-1">
                  {post.images.length} imagen{post.images.length !== 1 ? 'es' : ''} ·{' '}
                  {new Date(post.created_at).toLocaleDateString('es-ES')}
                </p>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  onClick={() => {
                    setEditingPostId(post.id);
                    setPostContent(post.content);
                    setPostVideoUrl(post.video_url ?? '');
                    setPostImages([]);
                    setShowPostForm(true);
                  }}
                  className="p-2 rounded-lg hover:bg-charcoal/5 transition-colors text-charcoal/50 hover:text-terra"
                >
                  <Edit3 className="w-4 h-4" />
                </button>
                <button
                  onClick={async () => {
                    if (!confirm('¿Eliminar esta publicación?')) return;
                    await supabase.from('posts').delete().eq('id', post.id);
                    setPosts(prev => prev.filter(p => p.id !== post.id));
                    router.refresh();
                  }}
                  className="p-2 rounded-lg hover:bg-wine/5 transition-colors text-charcoal/50 hover:text-wine"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
