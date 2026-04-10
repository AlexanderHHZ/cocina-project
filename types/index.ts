// ============================================
// Tipos globales de la aplicación
// ============================================

export interface Recipe {
  id: string;
  title: string;
  slug: string;
  description: string;
  ingredients: string[];
  steps: string[];
  prep_time: number;       // minutos
  difficulty: 'fácil' | 'media' | 'difícil';
  image_url: string | null;
  video_url: string | null;
  author_id: string;
  created_at: string;
  updated_at: string;
  // Campos calculados (joins)
  likes_count?: number;
  comments_count?: number;
  author?: UserProfile;
  is_liked?: boolean;
  is_favorited?: boolean;
}

export interface UserProfile {
  id: string;
  email: string;
  full_name: string | null;
  avatar_url: string | null;
  is_admin: boolean;
  created_at: string;
}

export interface Comment {
  id: string;
  recipe_id: string;
  user_id: string;
  parent_id: string | null;
  content: string;
  created_at: string;
  // Join
  user?: UserProfile;
}

export interface Like {
  id: string;
  recipe_id: string;
  user_id: string;
  created_at: string;
}

export interface Favorite {
  id: string;
  recipe_id: string;
  user_id: string;
  created_at: string;
  // Join
  recipe?: Recipe;
}
