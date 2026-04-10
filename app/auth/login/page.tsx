'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { ChefHat, LogIn } from 'lucide-react';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createSupabaseBrowser();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
    } else {
      router.push('/');
      router.refresh();
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-cream via-terra/5 to-cream">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <ChefHat className="w-8 h-8 text-terra" />
            <span className="font-display text-2xl font-bold">Mi Cocina</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-charcoal/5 p-8">
          <h1 className="font-display text-2xl font-bold text-center mb-6">Iniciar sesión</h1>

          {error && (
            <div className="bg-wine/10 text-wine text-sm rounded-lg p-3 mb-5 animate-fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-2">Email</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-field"
                placeholder="tu@email.com"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-2">Contraseña</label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="input-field"
                placeholder="••••••••"
                minLength={6}
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full">
              <LogIn className="w-4 h-4" />
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          <p className="text-sm text-center text-charcoal/50 mt-6">
            ¿No tienes cuenta?{' '}
            <Link href="/register" className="text-terra hover:underline font-medium">
              Regístrate
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
