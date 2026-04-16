'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import {
  Plus, Trash2, Edit3, Save, X, Image as ImageIcon, Youtube, ChefHat, Mail, Check,
  Newspaper, Search, Clock, Users, BarChart3, Eye, Play,
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

type Tab = 'overview' | 'recipes' | 'messages' | 'posts';

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
  // --- Estado principal ---
  const [activeTab, setActiveTab] = useState<Tab>('overview');
  const [recipes, setRecipes] = useState<Recipe[]>(initialRecipes);
  const [messages, setMessages] = useState<ContactMessage[]>(initialMessages);
  const [posts, setPosts] = useState<Post[]>(initialPosts);

  // --- Receta ---
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<RecipeForm>(emptyForm);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [recipeSearch, setRecipeSearch] = useState('');

  // --- Posts ---
  const [showPostForm, setShowPostForm] = useState(false);
  const [postContent, setPostContent] = useState('');
  const [postImages, setPostImages] = useState<File[]>([]);
  const [postVideoUrl, setPostVideoUrl] = useState('');
  const [savingPost, setSavingPost] = useState(false);
  const [postMessage, setPostMessage] = useState('');
  const [editingPostId, setEditingPostId] = useState<string | null>(null);

  // --- Mensajes ---
  const [messageFilter, setMessageFilter] = useState<'all' | 'unread' | 'read'>('all');

  const supabase = createSupabaseBrowser();
  const router = useRouter();

  // --- Derivados ---
  const unreadCount = useMemo(() => messages.filter(m => !m.is_read).length, [messages]);

  // Búsqueda con scoring: título (start +10, contains +5) + ingredientes (+2)
  // Normaliza acentos para que "acción" ≡ "accion"
  const filteredRecipes = useMemo(() => {
    const q = recipeSearch.trim();
    if (!q) return recipes;

    const qLower = q.toLowerCase();
    const qNorm = qLower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    return recipes
      .map((r) => {
        const titleLower = r.title.toLowerCase();
        const titleNorm = titleLower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

        let score = 0;

        if (titleLower.startsWith(qLower) || titleNorm.startsWith(qNorm)) {
          score += 10;
        } else if (titleLower.includes(qLower) || titleNorm.includes(qNorm)) {
          score += 5;
        }

        if (Array.isArray(r.ingredients)) {
          const hasIngredient = r.ingredients.some((ing: string) => {
            const ingLower = ing.toLowerCase();
            const ingNorm = ingLower.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
            return ingLower.includes(qLower) || ingNorm.includes(qNorm);
          });
          if (hasIngredient) score += 2;
        }

        return { recipe: r, score };
      })
      .filter((x) => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map((x) => x.recipe);
  }, [recipes, recipeSearch]);

  const filteredMessages = useMemo(() => {
    if (messageFilter === 'unread') return messages.filter(m => !m.is_read);
    if (messageFilter === 'read') return messages.filter(m => m.is_read);
    return messages;
  }, [messages, messageFilter]);

  // ============================================
  // Helpers
  // ============================================
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
    const { error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (error) throw new Error(`Error al subir imagen: ${error.message}`);
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
    return urlData.publicUrl;
  };

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
          (result) => result ? resolve(result) : reject(new Error('Error al convertir a WebP')),
          'image/webp',
          0.85
        );
      };
      img.onerror = () => reject(new Error('Error al cargar imagen'));
      img.crossOrigin = 'anonymous';
      img.src = URL.createObjectURL(blob);
    });
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) { setImageFile(null); return; }
    if (file.type !== 'image/webp') {
      setMessage('Error: Solo se permiten imágenes en formato WebP (.webp)');
      e.target.value = '';
      setImageFile(null);
      return;
    }
    setMessage('');
    setImageFile(file);
  };

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) { setThumbnailFile(null); return; }
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

      let image_url: string | null = null;
      if (imageFile) image_url = await uploadFile(imageFile, 'recipe-images');

      let thumbnail_url: string | null = null;
      if (thumbnailFile) thumbnail_url = await uploadFile(thumbnailFile, 'recipe-images');

      // Extraer miniatura de YouTube automáticamente
      if (youtubeId) {
        const needsImage = !image_url && !imageFile;
        const needsThumbnail = !thumbnail_url && !thumbnailFile;

        if (needsImage || needsThumbnail) {
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
        video_url,
      };

      if (editingId) {
        const { error } = await supabase.from('recipes').update(recipeData).eq('id', editingId).select();
        if (error) throw new Error(`Error al actualizar: ${error.message}`);
        setMessage('Receta actualizada');
      } else {
        const { error } = await supabase.from('recipes').insert(recipeData).select();
        if (error) throw new Error(`Error al crear: ${error.message}`);
        setMessage('Receta creada');
      }

      resetForm();
      await loadRecipes();
      router.refresh();
    } catch (err: any) {
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
    setActiveTab('recipes');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: string) => {
    if (!confirm('¿Eliminar esta receta?')) return;
    const { error } = await supabase.from('recipes').delete().eq('id', id);
    if (error) { setMessage(`Error al eliminar: ${error.message}`); return; }
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

  // ============================================
  // Sidebar item
  // ============================================
  const NavItem = ({
    tab, icon: Icon, label, badge,
  }: { tab: Tab; icon: any; label: string; badge?: number }) => {
    const active = activeTab === tab;
    return (
      <button
        onClick={() => setActiveTab(tab)}
        className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
          active
            ? 'bg-terra text-white shadow-sm'
            : 'text-charcoal/70 hover:bg-charcoal/5 hover:text-charcoal'
        }`}
      >
        <Icon className="w-4 h-4 flex-shrink-0" />
        <span className="flex-1 text-left">{label}</span>
        {badge !== undefined && badge > 0 && (
          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
            active ? 'bg-white/20 text-white' : 'bg-terra text-white'
          }`}>
            {badge}
          </span>
        )}
      </button>
    );
  };

  // ============================================
  // Render
  // ============================================
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="font-display text-3xl font-bold flex items-center gap-3">
          <ChefHat className="w-7 h-7 text-terra" /> Panel Admin
        </h1>
        <p className="text-charcoal/50 text-sm mt-1">Gestiona recetas, mensajes y publicaciones</p>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* ============================================
            SIDEBAR
            ============================================ */}
        <aside className="lg:w-60 flex-shrink-0">
          {/* Mobile: tabs horizontales */}
          <div className="lg:hidden flex gap-2 overflow-x-auto pb-2 -mx-4 px-4">
            <NavItem tab="overview" icon={BarChart3} label="Resumen" />
            <NavItem tab="recipes" icon={ChefHat} label="Recetas" badge={recipes.length} />
            <NavItem tab="messages" icon={Mail} label="Mensajes" badge={unreadCount} />
            <NavItem tab="posts" icon={Newspaper} label="Posts" badge={posts.length} />
          </div>

          {/* Desktop: sidebar vertical sticky */}
          <nav className="hidden lg:block sticky top-24 space-y-1 bg-white rounded-2xl border border-charcoal/5 p-3">
            <NavItem tab="overview" icon={BarChart3} label="Resumen" />
            <NavItem tab="recipes" icon={ChefHat} label="Recetas" badge={recipes.length} />
            <NavItem tab="messages" icon={Mail} label="Mensajes" badge={unreadCount} />
            <NavItem tab="posts" icon={Newspaper} label="Publicaciones" badge={posts.length} />
          </nav>
        </aside>

        {/* ============================================
            CONTENIDO PRINCIPAL
            ============================================ */}
        <main className="flex-1 min-w-0">

          {/* ─────────────── OVERVIEW ─────────────── */}
          {activeTab === 'overview' && (
            <div className="space-y-6 animate-fade-in">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <StatCard icon={ChefHat} label="Recetas" value={recipes.length} color="terra" onClick={() => setActiveTab('recipes')} />
                <StatCard icon={Mail} label="Mensajes nuevos" value={unreadCount} color="wine" onClick={() => setActiveTab('messages')} />
                <StatCard icon={Newspaper} label="Publicaciones" value={posts.length} color="sage" onClick={() => setActiveTab('posts')} />
              </div>

              <div className="bg-white rounded-2xl border border-charcoal/5 p-6">
                <h2 className="font-display text-lg font-bold mb-4">Acciones rápidas</h2>
                <div className="flex flex-wrap gap-3">
                  <button onClick={() => { setActiveTab('recipes'); setShowForm(true); }} className="btn-primary">
                    <Plus className="w-4 h-4" /> Nueva receta
                  </button>
                  <button onClick={() => { setActiveTab('posts'); setShowPostForm(true); }} className="btn-secondary">
                    <Plus className="w-4 h-4" /> Nueva publicación
                  </button>
                  {unreadCount > 0 && (
                    <button onClick={() => setActiveTab('messages')} className="btn-secondary">
                      <Mail className="w-4 h-4" /> Ver {unreadCount} mensaje{unreadCount !== 1 ? 's' : ''} nuevo{unreadCount !== 1 ? 's' : ''}
                    </button>
                  )}
                </div>
              </div>

              {recipes.length > 0 && (
                <div className="bg-white rounded-2xl border border-charcoal/5 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="font-display text-lg font-bold">Últimas recetas</h2>
                    <button onClick={() => setActiveTab('recipes')} className="text-sm text-terra hover:underline font-medium">
                      Ver todas →
                    </button>
                  </div>
                  <div className="space-y-2">
                    {recipes.slice(0, 4).map(r => (
                      <RecipeRow key={r.id} recipe={r} onEdit={handleEdit} onDelete={handleDelete} compact />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ─────────────── RECETAS ─────────────── */}
          {activeTab === 'recipes' && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-display text-2xl font-bold flex items-center gap-3">
                    <ChefHat className="w-6 h-6 text-terra" /> Recetas
                  </h2>
                  <p className="text-charcoal/50 text-sm mt-1">{recipes.length} receta{recipes.length !== 1 ? 's' : ''} en total</p>
                </div>
                {!showForm && (
                  <button onClick={() => setShowForm(true)} className="btn-primary">
                    <Plus className="w-4 h-4" /> Nueva receta
                  </button>
                )}
              </div>

              {message && (
                <div className={`mb-4 p-3 rounded-lg text-sm animate-fade-in ${
                  message.includes('Error') ? 'bg-wine/10 text-wine' : 'bg-sage/10 text-sage'
                }`}>{message}</div>
              )}

              {!showForm && <SquooshCard />}

              {showForm && (
                <div className="bg-white rounded-2xl border border-charcoal/5 p-6 mb-6 animate-slide-up">
                  <div className="flex items-center justify-between mb-6">
                    <h3 className="font-display text-xl font-bold">
                      {editingId ? 'Editar receta' : 'Nueva receta'}
                    </h3>
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
                          <input type="number" required min={1}
                            value={form.prep_time}
                            onChange={(e) => setForm({ ...form, prep_time: Number(e.target.value) })}
                            className="input-field" />
                        </div>
                        <div>
                          <label className="block text-sm font-medium mb-2">Porciones</label>
                          <input type="number" required min={1}
                            value={form.servings}
                            onChange={(e) => setForm({ ...form, servings: Number(e.target.value) })}
                            className="input-field" />
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
                      <textarea required rows={2}
                        value={form.description}
                        onChange={(e) => setForm({ ...form, description: e.target.value })}
                        className="input-field resize-none"
                        placeholder="Breve descripción de la receta..." />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Ingredientes (uno por línea)</label>
                      <textarea required rows={5}
                        value={form.ingredients}
                        onChange={(e) => setForm({ ...form, ingredients: e.target.value })}
                        className="input-field resize-none font-mono text-sm"
                        placeholder={"200g de harina\n3 huevos\n1 taza de leche"} />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">Pasos (uno por línea)</label>
                      <textarea required rows={5}
                        value={form.steps}
                        onChange={(e) => setForm({ ...form, steps: e.target.value })}
                        className="input-field resize-none font-mono text-sm"
                        placeholder={"Mezclar ingredientes secos\nAñadir huevos y batir\nHornear 30 min a 180°C"} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          <ImageIcon className="w-4 h-4 inline mr-1" /> Imagen principal
                          <span className="text-charcoal/40 font-normal ml-1">(solo .webp)</span>
                        </label>
                        <input type="file" accept="image/webp,.webp"
                          onChange={handleImageChange}
                          className="input-field text-sm file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:bg-terra/10 file:text-terra" />
                        <p className="text-xs text-charcoal/30 mt-1">Se ve al entrar a la receta. Recomendado: 1280 × 720px</p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          <ImageIcon className="w-4 h-4 inline mr-1" /> Miniatura
                          <span className="text-charcoal/40 font-normal ml-1">(solo .webp)</span>
                        </label>
                        <input type="file" accept="image/webp,.webp"
                          onChange={handleThumbnailChange}
                          className="input-field text-sm file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:bg-terra/10 file:text-terra" />
                        <p className="text-xs text-charcoal/30 mt-1">Se ve en la tarjeta de recetas. Recomendado: 640 × 360px</p>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        <Youtube className="w-4 h-4 inline mr-1" /> Video de YouTube
                        <span className="text-charcoal/40 font-normal ml-1">(opcional)</span>
                      </label>
                      <input type="url"
                        value={form.video_url}
                        onChange={(e) => setForm({ ...form, video_url: e.target.value })}
                        className="input-field"
                        placeholder="https://www.youtube.com/watch?v=..." />
                      {form.video_url.trim() && extractYoutubeId(form.video_url) && (
                        <p className="text-xs text-sage mt-1.5 flex items-center gap-1.5">
                          <Check className="w-3.5 h-3.5" />
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

              {/* Buscador */}
              {!showForm && recipes.length > 0 && (
                <div className="relative mb-4">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-charcoal/40" />
                  <input
                    type="text"
                    value={recipeSearch}
                    onChange={(e) => setRecipeSearch(e.target.value)}
                    placeholder="Buscar por título o ingrediente..."
                    className="input-field !pl-10"
                  />
                  {recipeSearch && (
                    <button
                    onClick={() => setRecipeSearch('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md hover:bg-charcoal/5 transition-colors text-charcoal/40 hover:text-charcoal"
                    title="Limpiar búsqueda"
                  >
                    <X className="w-4 h-4" />
                    </button>
                )}
                </div>
              )}

              {/* Lista con miniaturas */}
              <div className="space-y-3">
                {recipes.length === 0 && (
                  <div className="bg-white rounded-2xl border border-dashed border-charcoal/10 p-12 text-center">
                    <ChefHat className="w-12 h-12 text-charcoal/15 mx-auto mb-3" />
                    <p className="text-charcoal/40">No hay recetas. Crea la primera.</p>
                  </div>
                )}
                {filteredRecipes.length === 0 && recipes.length > 0 && recipeSearch.trim() && (
                  <p className="text-charcoal/40 text-center py-8 text-sm">
                    No se encontraron recetas para "{recipeSearch}"
                  </p>
                )}
                {filteredRecipes.map((recipe) => (
                  <RecipeRow key={recipe.id} recipe={recipe} onEdit={handleEdit} onDelete={handleDelete} />
                ))}
              </div>
            </div>
          )}

          {/* ─────────────── MENSAJES ─────────────── */}
          {activeTab === 'messages' && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-display text-2xl font-bold flex items-center gap-3">
                    <Mail className="w-6 h-6 text-terra" /> Mensajes de contacto
                    {unreadCount > 0 && (
                      <span className="bg-terra text-white text-xs font-bold px-2.5 py-1 rounded-full">
                        {unreadCount} nuevo{unreadCount !== 1 ? 's' : ''}
                      </span>
                    )}
                  </h2>
                  <p className="text-charcoal/50 text-sm mt-1">
                    {messages.length} mensaje{messages.length !== 1 ? 's' : ''} en total
                  </p>
                </div>
              </div>

              {messages.length > 0 && (
                <div className="flex gap-2 mb-4 bg-white rounded-xl border border-charcoal/5 p-1 w-fit">
                  {(['all', 'unread', 'read'] as const).map(f => (
                    <button
                      key={f}
                      onClick={() => setMessageFilter(f)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                        messageFilter === f
                          ? 'bg-terra text-white'
                          : 'text-charcoal/60 hover:bg-charcoal/5'
                      }`}
                    >
                      {f === 'all' ? 'Todos' : f === 'unread' ? `No leídos (${unreadCount})` : 'Leídos'}
                    </button>
                  ))}
                </div>
              )}

              <div className="space-y-3">
                {messages.length === 0 && (
                  <div className="bg-white rounded-2xl border border-dashed border-charcoal/10 p-12 text-center">
                    <Mail className="w-12 h-12 text-charcoal/15 mx-auto mb-3" />
                    <p className="text-charcoal/40">No hay mensajes.</p>
                  </div>
                )}
                {filteredMessages.length === 0 && messages.length > 0 && (
                  <p className="text-charcoal/40 text-center py-8 text-sm">
                    No hay mensajes en este filtro.
                  </p>
                )}
                {filteredMessages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`bg-white rounded-xl border p-5 transition-all ${
                      msg.is_read ? 'border-charcoal/5' : 'border-terra/30 bg-terra/[0.02] shadow-sm'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          {!msg.is_read && (
                            <span className="w-2 h-2 rounded-full bg-terra flex-shrink-0" />
                          )}
                          <span className="font-semibold text-sm">{msg.name}</span>
                          <a href={`mailto:${msg.email}`} className="text-xs text-terra hover:underline">
                            {msg.email}
                          </a>
                        </div>
                        <p className="text-sm text-charcoal/80 whitespace-pre-wrap">{msg.message}</p>
                        <p className="text-xs text-charcoal/30 mt-3">
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
          )}

          {/* ─────────────── PUBLICACIONES ─────────────── */}
          {activeTab === 'posts' && (
            <div className="animate-fade-in">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="font-display text-2xl font-bold flex items-center gap-3">
                    <Newspaper className="w-6 h-6 text-terra" /> Publicaciones
                  </h2>
                  <p className="text-charcoal/50 text-sm mt-1">
                    {posts.length} publicación{posts.length !== 1 ? 'es' : ''} en el blog
                  </p>
                </div>
                {!showPostForm && (
                  <button onClick={() => setShowPostForm(true)} className="btn-primary">
                    <Plus className="w-4 h-4" /> Nueva publicación
                  </button>
                )}
              </div>

              {postMessage && (
                <div className={`mb-4 p-3 rounded-lg text-sm animate-fade-in ${
                  postMessage.includes('Error') ? 'bg-wine/10 text-wine' : 'bg-sage/10 text-sage'
                }`}>{postMessage}</div>
              )}

              {!showPostForm && <SquooshCard />}

              {showPostForm && (
                <div className="bg-white rounded-2xl border border-charcoal/5 p-6 mb-6 animate-slide-up">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display text-lg font-bold">{editingPostId ? 'Editar publicación' : 'Nueva publicación'}</h3>
                    <button
                      onClick={() => {
                        setShowPostForm(false); setPostContent(''); setPostImages([]);
                        setPostVideoUrl(''); setEditingPostId(null);
                      }}
                      className="p-2 hover:bg-charcoal/5 rounded-lg"
                    >
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
                          if (valid.length !== files.length) setPostMessage('Error: Solo se permiten imágenes WebP');
                          else setPostMessage('');
                          setPostImages(valid.slice(0, 10));
                        }}
                        className="input-field text-sm file:mr-4 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-sm file:bg-terra/10 file:text-terra"
                      />
                      {postImages.length > 0 && (
                        <p className="text-xs text-charcoal/40 mt-1">
                          {postImages.length} imagen{postImages.length !== 1 ? 'es' : ''} seleccionada{postImages.length !== 1 ? 's' : ''}
                        </p>
                      )}
                    </div>

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
                          const imageUrls: string[] = [];
                          for (const file of postImages) {
                            const ext = file.name.split('.').pop();
                            const path = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
                            const { error } = await supabase.storage.from('post-images').upload(path, file, { upsert: true });
                            if (error) throw new Error(`Error al subir imagen: ${error.message}`);
                            const { data: urlData } = supabase.storage.from('post-images').getPublicUrl(path);
                            imageUrls.push(urlData.publicUrl);
                          }

                          const videoUrl = postVideoUrl.trim() || null;

                          if (editingPostId) {
                            const updateData: any = {
                              content: postContent.trim(),
                              video_url: videoUrl,
                              updated_at: new Date().toISOString(),
                            };
                            if (imageUrls.length > 0) updateData.images = imageUrls;
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

              <div className="space-y-3">
                {posts.length === 0 && (
                  <div className="bg-white rounded-2xl border border-dashed border-charcoal/10 p-12 text-center">
                    <Newspaper className="w-12 h-12 text-charcoal/15 mx-auto mb-3" />
                    <p className="text-charcoal/40">No hay publicaciones.</p>
                  </div>
                )}
                {posts.map((post) => (
                  <div key={post.id} className="bg-white rounded-xl border border-charcoal/5 p-4 flex items-start gap-4">
                    <div className="relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden bg-charcoal/5">
                      {post.images && post.images.length > 0 ? (
                        <Image
                          src={post.images[0]}
                          alt="Post"
                          fill
                          className="object-cover"
                          sizes="80px"
                          unoptimized
                        />
                      ) : post.video_url ? (
                        <div className="w-full h-full flex items-center justify-center bg-charcoal/10">
                          <Play className="w-6 h-6 text-charcoal/40" />
                        </div>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center">
                          <Newspaper className="w-6 h-6 text-charcoal/20" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <p className="text-sm line-clamp-2">{post.content}</p>
                      <p className="text-xs text-charcoal/40 mt-1.5">
                        {post.images.length} imagen{post.images.length !== 1 ? 'es' : ''}
                        {post.video_url && ' · con video'}
                        {' · '}
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
                          window.scrollTo({ top: 0, behavior: 'smooth' });
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
          )}
        </main>
      </div>
    </div>
  );
}

// ============================================
// SUBCOMPONENTES
// ============================================

function SquooshCard() {
  return (
    <a
      href="https://squoosh.app/"
      target="_blank"
      rel="noopener noreferrer"
      className="flex items-center gap-3 mb-4 px-4 py-3 rounded-xl border border-dashed border-terra/30 bg-terra/[0.03] hover:bg-terra/[0.06] transition-colors group"
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
  );
}

function StatCard({
  icon: Icon, label, value, color, onClick,
}: { icon: any; label: string; value: number; color: 'terra' | 'wine' | 'sage'; onClick: () => void }) {
  const colors = {
    terra: 'bg-terra/10 text-terra',
    wine: 'bg-wine/10 text-wine',
    sage: 'bg-sage/10 text-sage',
  };
  return (
    <button
      onClick={onClick}
      className="bg-white rounded-2xl border border-charcoal/5 p-5 text-left hover:border-charcoal/15 hover:shadow-sm transition-all group"
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-charcoal/50 uppercase tracking-wide">{label}</p>
          <p className="font-display text-3xl font-bold mt-2">{value}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <p className="text-xs text-charcoal/40 mt-3 group-hover:text-terra transition-colors">Ver detalles →</p>
    </button>
  );
}

function RecipeRow({
  recipe, onEdit, onDelete, compact = false,
}: { recipe: Recipe; onEdit: (r: Recipe) => void; onDelete: (id: string) => void; compact?: boolean }) {
  const thumb = recipe.thumbnail_url || recipe.image_url;
  const hasVideo = !!recipe.video_url;

  const difficultyColors: Record<string, string> = {
    'fácil': 'bg-sage/10 text-sage',
    'media': 'bg-honey/10 text-honey',
    'difícil': 'bg-wine/10 text-wine',
  };

  return (
    <div className="bg-white rounded-xl border border-charcoal/5 p-3 flex items-center gap-4 hover:border-charcoal/15 transition-colors">
      <div className={`relative ${compact ? 'w-14 h-14' : 'w-20 h-20'} flex-shrink-0 rounded-lg overflow-hidden bg-charcoal/5`}>
        {thumb ? (
          <Image
            src={thumb}
            alt={recipe.title}
            fill
            className="object-cover"
            sizes={compact ? '56px' : '80px'}
            unoptimized
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <ImageIcon className="w-5 h-5 text-charcoal/20" />
          </div>
        )}
        {hasVideo && (
          <div className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-black/70 flex items-center justify-center">
            <Play className="w-2.5 h-2.5 text-white fill-white" />
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <h3 className={`font-medium truncate ${compact ? 'text-sm' : ''}`}>{recipe.title}</h3>
        <div className="flex items-center gap-2 mt-1 flex-wrap">
          <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${difficultyColors[recipe.difficulty] || 'bg-charcoal/5'}`}>
            {recipe.difficulty}
          </span>
          <span className="text-xs text-charcoal/40 flex items-center gap-1">
            <Clock className="w-3 h-3" /> {recipe.prep_time} min
          </span>
          <span className="text-xs text-charcoal/40 flex items-center gap-1">
            <Users className="w-3 h-3" /> {recipe.servings ?? 4}
          </span>
          {!compact && (
            <span className="text-xs text-charcoal/30">
              · {new Date(recipe.created_at).toLocaleDateString('es-ES')}
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 flex-shrink-0">
        <a
          href={`/recetas/${recipe.slug || recipe.id}`}
          target="_blank"
          rel="noopener noreferrer"
          className="p-2 rounded-lg hover:bg-charcoal/5 transition-colors text-charcoal/50 hover:text-charcoal"
          title="Ver receta pública"
        >
          <Eye className="w-4 h-4" />
        </a>
        <button onClick={() => onEdit(recipe)}
          className="p-2 rounded-lg hover:bg-charcoal/5 transition-colors text-charcoal/50 hover:text-terra"
          title="Editar">
          <Edit3 className="w-4 h-4" />
        </button>
        <button onClick={() => onDelete(recipe.id)}
          className="p-2 rounded-lg hover:bg-wine/5 transition-colors text-charcoal/50 hover:text-wine"
          title="Eliminar">
          <Trash2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}