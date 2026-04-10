'use client';

import { useState } from 'react';
import Link from 'next/link';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { ChefHat, UserPlus } from 'lucide-react';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const supabase = createSupabaseBrowser();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    const { error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName },
        emailRedirectTo: 'http://localhost:3000/auth/callback',
      },
    });

    setLoading(false);
    if (authError) {
      setError(authError.message);
    } else {
      setSuccess(true);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-gradient-to-br from-cream via-sage/5 to-cream">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2">
            <ChefHat className="w-8 h-8 text-terra" />
            <span className="font-display text-2xl font-bold">Mi Cocina</span>
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-charcoal/5 p-8">
          {success ? (
            <div className="text-center py-4 animate-fade-in">
              <div className="w-16 h-16 bg-sage/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <UserPlus className="w-7 h-7 text-sage" />
              </div>
              <h2 className="font-display text-xl font-bold mb-2">¡Cuenta creada!</h2>
              <p className="text-sm text-charcoal/60 mb-4">
                Revisa tu email para confirmar tu cuenta. Si tienes habilitada la opción
                "Confirm email" en Supabase, recibirás un enlace. Si no, ya puedes
                iniciar sesión.
              </p>
              <Link href="/login" className="btn-primary">
                Ir a iniciar sesión
              </Link>
            </div>
          ) : (
            <>
              <h1 className="font-display text-2xl font-bold text-center mb-6">Crear cuenta</h1>

              {error && (
                <div className="bg-wine/10 text-wine text-sm rounded-lg p-3 mb-5 animate-fade-in">
                  {error}
                </div>
              )}

              <form onSubmit={handleRegister} className="space-y-4">
                <div>
                  <label htmlFor="name" className="block text-sm font-medium mb-2">Nombre</label>
                  <input
                    id="name"
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="input-field"
                    placeholder="Tu nombre"
                  />
                </div>
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
                    placeholder="Mínimo 6 caracteres"
                    minLength={6}
                  />
                </div>
                <button type="submit" disabled={loading} className="btn-primary w-full">
                  <UserPlus className="w-4 h-4" />
                  {loading ? 'Registrando...' : 'Crear cuenta'}
                </button>
              </form>

              <p className="text-sm text-center text-charcoal/50 mt-6">
                ¿Ya tienes cuenta?{' '}
                <Link href="/login" className="text-terra hover:underline font-medium">
                  Inicia sesión
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
