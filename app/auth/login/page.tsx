'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import TurnstileWidget from '@/components/auth/TurnstileWidget';
import { LogIn, Mail, ArrowLeft, Eye, EyeOff } from 'lucide-react';

const TURNSTILE_SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? '';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Captcha del login
  const [loginCaptchaToken, setLoginCaptchaToken] = useState<string | null>(null);
  const [loginCaptchaResetKey, setLoginCaptchaResetKey] = useState(0);

  // Estado para recuperación de contraseña
  const [showForgot, setShowForgot] = useState(false);
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState('');
  const [forgotSent, setForgotSent] = useState(false);

  // Captcha del forgot password
  const [forgotCaptchaToken, setForgotCaptchaToken] = useState<string | null>(null);
  const [forgotCaptchaResetKey, setForgotCaptchaResetKey] = useState(0);

  const router = useRouter();
  const supabase = createSupabaseBrowser();

  // ── Callbacks del captcha ──
  const handleLoginCaptcha = useCallback((token: string) => {
    setLoginCaptchaToken(token);
  }, []);
  const handleLoginCaptchaError = useCallback(() => {
    setLoginCaptchaToken(null);
  }, []);
  const handleForgotCaptcha = useCallback((token: string) => {
    setForgotCaptchaToken(token);
  }, []);
  const handleForgotCaptchaError = useCallback(() => {
    setForgotCaptchaToken(null);
  }, []);

  // ── Login ──
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (TURNSTILE_SITE_KEY && !loginCaptchaToken) {
      setError('Por favor completa la verificación de seguridad.');
      return;
    }

    setLoading(true);

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
      options: loginCaptchaToken ? { captchaToken: loginCaptchaToken } : undefined,
    });

    if (authError) {
      setError(authError.message);
      setLoading(false);
      // Resetear captcha tras error (los tokens son de un solo uso)
      setLoginCaptchaToken(null);
      setLoginCaptchaResetKey((k) => k + 1);
    } else {
      router.push('/');
      router.refresh();
    }
  };

  const handleGoogleLogin = async () => {
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
  };

  // ── Forgot password ──
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setForgotMessage('');

    if (TURNSTILE_SITE_KEY && !forgotCaptchaToken) {
      setForgotMessage('Error: Por favor completa la verificación de seguridad.');
      return;
    }

    setForgotLoading(true);

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
        redirectTo: `${window.location.origin}/auth/reset-password`,
        captchaToken: forgotCaptchaToken ?? undefined,
      });

      if (error) throw error;
      setForgotSent(true);
    } catch (err: any) {
      setForgotMessage(`Error: ${err.message}`);
      setForgotCaptchaToken(null);
      setForgotCaptchaResetKey((k) => k + 1);
    } finally {
      setForgotLoading(false);
    }
  };

  return (
    <div className="flex justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-lg border border-charcoal/5 p-8">

          {/* ===== Pantalla de recuperación de contraseña ===== */}
          {showForgot ? (
            <div className="animate-fade-in">
              {forgotSent ? (
                /* Confirmación de envío */
                <div className="text-center py-4">
                  <div className="w-16 h-16 bg-sage/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Mail className="w-7 h-7 text-sage" />
                  </div>
                  <h2 className="font-display text-xl font-bold mb-2">¡Revisa tu email!</h2>
                  <p className="text-sm text-charcoal/60 mb-2">
                    Enviamos un enlace de recuperación a:
                  </p>
                  <p className="text-sm font-medium text-charcoal mb-6">{forgotEmail}</p>
                  <p className="text-xs text-charcoal/40 mb-6">
                    Si no lo ves en tu bandeja principal, revisa la carpeta de spam.
                  </p>
                  <button
                    onClick={() => {
                      setShowForgot(false);
                      setForgotSent(false);
                      setForgotEmail('');
                      setForgotMessage('');
                    }}
                    className="btn-primary"
                  >
                    <ArrowLeft className="w-4 h-4" /> Volver al login
                  </button>
                </div>
              ) : (
                /* Formulario de recuperación */
                <>
                  <button
                    onClick={() => {
                      setShowForgot(false);
                      setForgotEmail('');
                      setForgotMessage('');
                    }}
                    className="flex items-center gap-1.5 text-sm text-charcoal/50 hover:text-terra transition-colors mb-4"
                  >
                    <ArrowLeft className="w-4 h-4" /> Volver
                  </button>

                  <h1 className="font-display text-2xl font-bold text-center mb-2">Recuperar contraseña</h1>
                  <p className="text-sm text-charcoal/50 text-center mb-6">
                    Ingresa tu email y te enviaremos un enlace para restablecer tu contraseña.
                  </p>

                  {forgotMessage && (
                    <div className={`text-sm rounded-lg p-3 mb-5 animate-fade-in ${
                      forgotMessage.includes('Error') ? 'bg-wine/10 text-wine' : 'bg-sage/10 text-sage'
                    }`}>
                      {forgotMessage}
                    </div>
                  )}

                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div>
                      <label htmlFor="forgotEmail" className="block text-sm font-medium mb-2">Email</label>
                      <input
                        id="forgotEmail"
                        type="email"
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        required
                        className="input-field"
                        placeholder="tu@correo.com"
                      />
                    </div>

                    {/* Captcha en recuperación */}
                    {TURNSTILE_SITE_KEY && (
                      <div className="pt-2">
                        <TurnstileWidget
                          key={`forgot-${forgotCaptchaResetKey}`}
                          siteKey={TURNSTILE_SITE_KEY}
                          onVerify={handleForgotCaptcha}
                          onError={handleForgotCaptchaError}
                        />
                      </div>
                    )}

                    <button type="submit" disabled={forgotLoading} className="btn-primary w-full">
                      <Mail className="w-4 h-4" />
                      {forgotLoading ? 'Enviando...' : 'Enviar enlace de recuperación'}
                    </button>
                  </form>
                </>
              )}
            </div>
          ) : (
            /* ===== Pantalla de login normal ===== */
            <>
              <h1 className="font-display text-2xl font-bold text-center mb-6">Iniciar sesión</h1>

              {error && (
                <div className="bg-wine/10 text-wine text-sm rounded-lg p-3 mb-5 animate-fade-in">
                  {error}
                </div>
              )}

              {/* Google */}
              <button
                onClick={handleGoogleLogin}
                className="w-full flex items-center justify-center gap-3 px-4 py-2.5 rounded-lg border border-charcoal/15
                           bg-white hover:bg-charcoal/[0.03] active:scale-[0.99] transition-all text-sm font-medium"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/>
                  <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                  <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                  <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
                </svg>
                Continuar con Google
              </button>

              {/* Separador */}
              <div className="flex items-center gap-4 my-6">
                <div className="flex-1 h-px bg-charcoal/10" />
                <span className="text-xs text-charcoal/40">o</span>
                <div className="flex-1 h-px bg-charcoal/10" />
              </div>

              {/* Email/Password */}
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
                    placeholder="tu@correo.com"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium mb-2">Contraseña</label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="input-field !pr-12"
                      placeholder="••••••••"
                      minLength={6}
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

                {/* Enlace de ¿Olvidaste tu contraseña? */}
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => {
                      setShowForgot(true);
                      setForgotEmail(email);
                      setError('');
                    }}
                    className="text-sm text-terra hover:underline font-medium"
                  >
                    ¿Olvidaste tu contraseña?
                  </button>
                </div>

                {/* Captcha en login */}
                {TURNSTILE_SITE_KEY && (
                  <div className="pt-2">
                    <TurnstileWidget
                      key={`login-${loginCaptchaResetKey}`}
                      siteKey={TURNSTILE_SITE_KEY}
                      onVerify={handleLoginCaptcha}
                      onError={handleLoginCaptchaError}
                    />
                  </div>
                )}

                <button type="submit" disabled={loading} className="btn-primary w-full">
                  <LogIn className="w-4 h-4" />
                  {loading ? 'Entrando...' : 'Iniciar sesión'}
                </button>
              </form>

              <p className="text-sm text-center text-charcoal/50 mt-6">
                ¿No tienes cuenta?{' '}
                <Link href="/register" className="text-terra hover:underline font-medium">
                  Regístrate
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
