'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { Lock, Eye, EyeOff, CheckCircle, ArrowLeft, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function ResetPasswordPage() {
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [checking, setChecking] = useState(true);
  const [sessionValid, setSessionValid] = useState(false);

  const router = useRouter();
  const supabase = createSupabaseBrowser();

  // Verificar que hay una sesión de recuperación válida
  useEffect(() => {
    const checkSession = async () => {
      // Supabase maneja automáticamente el token del hash de la URL
      // y establece una sesión temporal para el usuario
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        setSessionValid(true);
      } else {
        // Esperar un poco más porque Supabase puede tardar en procesar el hash
        setTimeout(async () => {
          const { data: { session: retrySession } } = await supabase.auth.getSession();
          setSessionValid(!!retrySession);
          setChecking(false);
        }, 2000);
        return;
      }
      setChecking(false);
    };

    checkSession();

    // También escuchar eventos de auth para cuando se procese el recovery token
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === 'PASSWORD_RECOVERY') {
          setSessionValid(true);
          setChecking(false);
        }
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (newPassword.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('Las contraseñas no coinciden');
      return;
    }

    setLoading(true);

    try {
      const { error: updateError } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (updateError) throw updateError;
      setSuccess(true);

      // Redirigir al inicio después de 3 segundos
      setTimeout(() => {
        router.push('/');
        router.refresh();
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Error al cambiar la contraseña');
    } finally {
      setLoading(false);
    }
  };

  // Estado de carga mientras se verifica la sesión
  if (checking) {
    return (
      <div className="flex justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg border border-charcoal/5 p-8 text-center">
            <Loader2 className="w-8 h-8 text-terra animate-spin mx-auto mb-4" />
            <p className="text-sm text-charcoal/60">Verificando enlace de recuperación...</p>
          </div>
        </div>
      </div>
    );
  }

  // Si no hay sesión válida
  if (!sessionValid) {
    return (
      <div className="flex justify-center px-4 py-12">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-lg border border-charcoal/5 p-8 text-center">
            <div className="w-16 h-16 bg-wine/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-7 h-7 text-wine" />
            </div>
            <h2 className="font-display text-xl font-bold mb-2">Enlace inválido o expirado</h2>
            <p className="text-sm text-charcoal/60 mb-6">
              El enlace de recuperación ya no es válido. Solicita uno nuevo desde la página de login.
            </p>
            <Link href="/login" className="btn-primary">
              <ArrowLeft className="w-4 h-4" /> Ir al login
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg border border-charcoal/5 p-8">

          {success ? (
            /* Éxito */
            <div className="text-center py-4 animate-fade-in">
              <div className="w-16 h-16 bg-sage/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="w-7 h-7 text-sage" />
              </div>
              <h2 className="font-display text-xl font-bold mb-2">¡Contraseña actualizada!</h2>
              <p className="text-sm text-charcoal/60 mb-4">
                Tu contraseña ha sido cambiada exitosamente. Serás redirigido al inicio...
              </p>
              <Link href="/" className="btn-primary">
                Ir al inicio
              </Link>
            </div>
          ) : (
            /* Formulario */
            <div className="animate-fade-in">
              <div className="text-center mb-6">
                <div className="w-14 h-14 bg-terra/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Lock className="w-6 h-6 text-terra" />
                </div>
                <h1 className="font-display text-2xl font-bold mb-1">Nueva contraseña</h1>
                <p className="text-sm text-charcoal/50">
                  Ingresa tu nueva contraseña para tu cuenta.
                </p>
              </div>

              {error && (
                <div className="bg-wine/10 text-wine text-sm rounded-lg p-3 mb-5 animate-fade-in">
                  {error}
                </div>
              )}

              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium mb-2">
                    Nueva contraseña
                  </label>
                  <div className="relative">
                    <input
                      id="newPassword"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="input-field !pr-12"
                      placeholder="Mínimo 6 caracteres"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-charcoal/40 hover:text-charcoal transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium mb-2">
                    Confirmar contraseña
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirm ? 'text' : 'password'}
                      required
                      minLength={6}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="input-field !pr-12"
                      placeholder="Repite la nueva contraseña"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirm(!showConfirm)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-charcoal/40 hover:text-charcoal transition-colors"
                    >
                      {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword.length > 0 && (
                    <p className={`text-xs mt-1.5 flex items-center gap-1 ${
                      newPassword === confirmPassword ? 'text-sage' : 'text-wine'
                    }`}>
                      {newPassword === confirmPassword ? (
                        <><CheckCircle className="w-3 h-3" /> Las contraseñas coinciden</>
                      ) : (
                        'Las contraseñas no coinciden'
                      )}
                    </p>
                  )}
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full">
                  <Lock className="w-4 h-4" />
                  {loading ? 'Guardando...' : 'Establecer nueva contraseña'}
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
