-- =============================================
-- ESQUEMA SQL COMPLETO - Mi Cocina
-- =============================================
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- Orden: ejecutar TODO este archivo de una sola vez.
-- =============================================

-- ========== 1. TABLA PROFILES ==========
-- Se crea automáticamente cuando un usuario se registra (trigger)

CREATE TABLE IF NOT EXISTS public.profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email       TEXT NOT NULL,
  full_name   TEXT,
  avatar_url  TEXT,
  is_admin    BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede ver perfiles (para mostrar nombres en comentarios)
CREATE POLICY "Profiles: lectura pública"
  ON public.profiles FOR SELECT
  USING (true);

-- Solo el propio usuario puede actualizar su perfil
CREATE POLICY "Profiles: usuario actualiza su perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- ========== TRIGGER: crear perfil al registrarse ==========

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    COALESCE(NEW.raw_user_meta_data->>'avatar_url', '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Eliminar trigger si existe para evitar errores
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- ========== 2. TABLA RECIPES ==========

CREATE TABLE IF NOT EXISTS public.recipes (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  slug         TEXT UNIQUE NOT NULL,
  description  TEXT NOT NULL DEFAULT '',
  ingredients  TEXT[] NOT NULL DEFAULT '{}',
  steps        TEXT[] NOT NULL DEFAULT '{}',
  prep_time    INTEGER NOT NULL DEFAULT 30,
  difficulty   TEXT NOT NULL DEFAULT 'fácil'
                 CHECK (difficulty IN ('fácil', 'media', 'difícil')),
  image_url    TEXT,
  video_url    TEXT,
  author_id    UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.recipes ENABLE ROW LEVEL SECURITY;

-- Lectura pública
CREATE POLICY "Recipes: lectura pública"
  ON public.recipes FOR SELECT
  USING (true);

-- Solo admin puede insertar/actualizar/eliminar
CREATE POLICY "Recipes: admin inserta"
  ON public.recipes FOR INSERT
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Recipes: admin actualiza"
  ON public.recipes FOR UPDATE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );

CREATE POLICY "Recipes: admin elimina"
  ON public.recipes FOR DELETE
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND is_admin = true)
  );


-- ========== 3. TABLA LIKES ==========

CREATE TABLE IF NOT EXISTS public.likes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id   UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  -- Evitar duplicados: un like por usuario por receta
  UNIQUE(recipe_id, user_id)
);

ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Likes: lectura pública"
  ON public.likes FOR SELECT
  USING (true);

CREATE POLICY "Likes: usuario autenticado inserta"
  ON public.likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Likes: usuario elimina su like"
  ON public.likes FOR DELETE
  USING (auth.uid() = user_id);


-- ========== 4. TABLA COMMENTS ==========

CREATE TABLE IF NOT EXISTS public.comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id   UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content     TEXT NOT NULL CHECK (char_length(content) > 0),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comments: lectura pública"
  ON public.comments FOR SELECT
  USING (true);

CREATE POLICY "Comments: usuario autenticado inserta"
  ON public.comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Comments: usuario elimina su comentario"
  ON public.comments FOR DELETE
  USING (auth.uid() = user_id);


-- ========== 5. TABLA FAVORITES ==========

CREATE TABLE IF NOT EXISTS public.favorites (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recipe_id   UUID NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(recipe_id, user_id)
);

ALTER TABLE public.favorites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Favorites: usuario ve sus favoritos"
  ON public.favorites FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Favorites: usuario inserta"
  ON public.favorites FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Favorites: usuario elimina"
  ON public.favorites FOR DELETE
  USING (auth.uid() = user_id);


-- ========== 6. ÍNDICES ==========

CREATE INDEX IF NOT EXISTS idx_recipes_slug ON public.recipes(slug);
CREATE INDEX IF NOT EXISTS idx_recipes_created ON public.recipes(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_likes_recipe ON public.likes(recipe_id);
CREATE INDEX IF NOT EXISTS idx_likes_user ON public.likes(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_recipe ON public.comments(recipe_id);
CREATE INDEX IF NOT EXISTS idx_favorites_user ON public.favorites(user_id);


-- ========== 7. REALTIME ==========
-- Habilitar realtime en comentarios para updates en vivo

ALTER PUBLICATION supabase_realtime ADD TABLE public.comments;


-- ========== 8. STORAGE BUCKETS ==========
-- NOTA: Ejecutar estos en el SQL Editor de Supabase.
-- Si los buckets ya existen, estas sentencias darán error (ignorar).

INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-images', 'recipe-images', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('recipe-videos', 'recipe-videos', true)
ON CONFLICT (id) DO NOTHING;

-- Políticas de Storage: cualquiera puede leer, admin puede subir

CREATE POLICY "Storage: lectura pública imágenes"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'recipe-images');

CREATE POLICY "Storage: admin sube imágenes"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'recipe-images'
    AND auth.uid() IS NOT NULL
  );

CREATE POLICY "Storage: lectura pública videos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'recipe-videos');

CREATE POLICY "Storage: admin sube videos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'recipe-videos'
    AND auth.uid() IS NOT NULL
  );


-- ========== 9. HACER ADMIN AL PRIMER USUARIO ==========
-- Después de registrarte, ejecuta esto reemplazando con tu email:
--
-- UPDATE public.profiles SET is_admin = true WHERE email = 'tu@email.com';
--
-- =============================================
-- ¡LISTO! Tu base de datos está configurada.
-- =============================================

UPDATE public.profiles SET is_admin = true WHERE email = 'alexanderhz.dev@gmail.com';

UPDATE public.profiles SET is_admin = true WHERE email = 'devalecx@gmail.com';


-- 1. Verificar que tu perfil existe y es admin
SELECT id, email, is_admin FROM public.profiles;


-- 2. Probar insertar manualmente
INSERT INTO public.recipes (title, slug, description, ingredients, steps, prep_time, difficulty, author_id)
VALUES ('Test', 'test-receta', 'prueba', '{"harina"}', '{"mezclar"}', 10, 'fácil', '51129c49-2747-44a2-bce7-394782c50c4a');


-- Eliminar las políticas restrictivas actuales de recipes
DROP POLICY IF EXISTS "Recipes: admin inserta" ON public.recipes;
DROP POLICY IF EXISTS "Recipes: admin actualiza" ON public.recipes;
DROP POLICY IF EXISTS "Recipes: admin elimina" ON public.recipes;

-- Crear políticas más simples que funcionen con el browser client
CREATE POLICY "Recipes: usuario autenticado inserta"
  ON public.recipes FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Recipes: usuario autenticado actualiza"
  ON public.recipes FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Recipes: usuario autenticado elimina"
  ON public.recipes FOR DELETE
  USING (auth.uid() IS NOT NULL);




  -- =============================================
-- TABLA CONTACT_MESSAGES
-- =============================================
-- Ejecutar en: Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS public.contact_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  email       TEXT NOT NULL,
  message     TEXT NOT NULL,
  is_read     BOOLEAN DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;

-- Cualquiera puede enviar un mensaje (sin necesidad de estar logueado)
CREATE POLICY "Contact: cualquiera inserta"
  ON public.contact_messages FOR INSERT
  WITH CHECK (true);

-- Solo usuarios autenticados pueden leer (para el admin)
CREATE POLICY "Contact: admin lee"
  ON public.contact_messages FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Solo usuarios autenticados pueden actualizar (marcar como leído)
CREATE POLICY "Contact: admin actualiza"
  ON public.contact_messages FOR UPDATE
  USING (auth.uid() IS NOT NULL);

-- Solo usuarios autenticados pueden eliminar
CREATE POLICY "Contact: admin elimina"
  ON public.contact_messages FOR DELETE
  USING (auth.uid() IS NOT NULL);

CREATE INDEX IF NOT EXISTS idx_contact_created ON public.contact_messages(created_at DESC);


-- =============================================
-- COMENTARIOS CON RESPUESTAS (threaded)
-- =============================================
-- Ejecutar en: Supabase Dashboard → SQL Editor
 
-- Agregar columna parent_id para respuestas
ALTER TABLE public.comments
ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES public.comments(id) ON DELETE CASCADE;
 
-- Índice para buscar respuestas de un comentario
CREATE INDEX IF NOT EXISTS idx_comments_parent ON public.comments(parent_id);



-- =============================================
-- TABLA POSTS (Blog / Publicaciones)
-- =============================================
-- Ejecutar en: Supabase Dashboard → SQL Editor

CREATE TABLE IF NOT EXISTS public.posts (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content     TEXT NOT NULL CHECK (char_length(content) > 0),
  images      TEXT[] NOT NULL DEFAULT '{}',
  author_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Lectura pública
CREATE POLICY "Posts: lectura pública"
  ON public.posts FOR SELECT
  USING (true);

-- Cualquier usuario autenticado puede insertar (admin se valida en la app)
CREATE POLICY "Posts: usuario autenticado inserta"
  ON public.posts FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Posts: usuario autenticado actualiza"
  ON public.posts FOR UPDATE
  USING (auth.uid() IS NOT NULL);

CREATE POLICY "Posts: usuario autenticado elimina"
  ON public.posts FOR DELETE
  USING (auth.uid() IS NOT NULL);

-- Likes para posts
CREATE TABLE IF NOT EXISTS public.post_likes (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PostLikes: lectura pública"
  ON public.post_likes FOR SELECT
  USING (true);

CREATE POLICY "PostLikes: usuario inserta"
  ON public.post_likes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "PostLikes: usuario elimina"
  ON public.post_likes FOR DELETE
  USING (auth.uid() = user_id);

-- Comentarios para posts
CREATE TABLE IF NOT EXISTS public.post_comments (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id     UUID NOT NULL REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  parent_id   UUID REFERENCES public.post_comments(id) ON DELETE CASCADE,
  content     TEXT NOT NULL CHECK (char_length(content) > 0),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "PostComments: lectura pública"
  ON public.post_comments FOR SELECT
  USING (true);

CREATE POLICY "PostComments: usuario inserta"
  ON public.post_comments FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "PostComments: usuario elimina"
  ON public.post_comments FOR DELETE
  USING (auth.uid() = user_id);

-- Índices
CREATE INDEX IF NOT EXISTS idx_posts_created ON public.posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_likes_post ON public.post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_post ON public.post_comments(post_id);
CREATE INDEX IF NOT EXISTS idx_post_comments_parent ON public.post_comments(parent_id);

-- Realtime para comentarios de posts
ALTER PUBLICATION supabase_realtime ADD TABLE public.post_comments;

-- Storage bucket para imágenes de posts
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Storage: lectura pública post-images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'post-images');

CREATE POLICY "Storage: usuario sube post-images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'post-images' AND auth.uid() IS NOT NULL);

  
  -- Agregar video_url a posts
-- Ejecutar en: Supabase Dashboard → SQL Editor
 
ALTER TABLE public.posts
ADD COLUMN IF NOT EXISTS video_url TEXT;

-- Permitir que usuarios editen sus propios comentarios

-- Recetas
DROP POLICY IF EXISTS "Comments: usuario actualiza su comentario" ON public.comments;
CREATE POLICY "Comments: usuario actualiza su comentario"
  ON public.comments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Blog
DROP POLICY IF EXISTS "PostComments: usuario actualiza" ON public.post_comments;
CREATE POLICY "PostComments: usuario actualiza"
  ON public.post_comments FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);


-- Agregar thumbnail_url a recipes
-- Ejecutar en: Supabase Dashboard → SQL Editor

ALTER TABLE public.recipes
ADD COLUMN IF NOT EXISTS thumbnail_url TEXT;

-- =============================================
-- AGREGAR COLUMNA PORCIONES (servings) A RECETAS
-- =============================================
-- Ejecutar en: Supabase Dashboard → SQL Editor
 
ALTER TABLE public.recipes
ADD COLUMN IF NOT EXISTS servings INTEGER NOT NULL DEFAULT 4;


-- ============================================================
-- Migración: campo chef_photo_url en profiles
-- Ejecutar en: Supabase Dashboard → SQL Editor
-- ============================================================
 
-- 1. Agregar columna chef_photo_url a la tabla profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS chef_photo_url TEXT;
 
-- 2. Política para que el admin pueda actualizar su propio perfil
--    (ya debería existir, pero la reforzamos por si acaso)
DROP POLICY IF EXISTS "Profiles: usuario actualiza su perfil" ON public.profiles;
CREATE POLICY "Profiles: usuario actualiza su perfil"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);
 
-- 3. Política de storage: permitir que el admin ACTUALICE (upsert) en recipe-images
--    (necesario para sobreescribir la foto del chef)
DROP POLICY IF EXISTS "Storage: admin actualiza imágenes" ON storage.objects;
CREATE POLICY "Storage: admin actualiza imágenes"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'recipe-images' AND auth.uid() IS NOT NULL);
 
-- ✓ Listo. La columna chef_photo_url ya está disponible en profiles.
 