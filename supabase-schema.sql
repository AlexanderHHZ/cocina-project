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
