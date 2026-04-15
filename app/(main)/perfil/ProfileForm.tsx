'use client';

import { useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { Save, Lock, Eye, EyeOff, CheckCircle } from 'lucide-react';
import type { UserProfile } from '@/types';

interface Props {
  profile: UserProfile;
}

export default function ProfileForm({ profile }: Props) {
  const [fullName, setFullName] = useState(profile.full_name ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Estado para cambio de contraseña
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');

  const supabase = createSupabaseBrowser();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!fullName.trim()) {
      setMessage('Error: El nombre no puede estar vacío');
      return;
    }

    setSaving(true);
    setMessage('');

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ full_name: fullName.trim() })
        .eq('id', profile.id);

      if (error) throw error;
      setMessage('¡Perfil actualizado!');
    } catch (err: any) {
      setMessage(`Error: ${err.message || 'No se pudo guardar. Recarga la página e intenta de nuevo.'}`);
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMessage('');

    if (newPassword.length < 6) {
      setPasswordMessage('Error: La contraseña debe tener al menos 6 caracteres');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordMessage('Error: Las contraseñas no coinciden');
      return;
    }

    setSavingPassword(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });

      if (error) throw error;

      setPasswordMessage('¡Contraseña actualizada correctamente!');
      setNewPassword('');
      setConfirmPassword('');
      setShowNewPassword(false);
      setShowConfirmPassword(false);

      // Cerrar el formulario después de un momento
      setTimeout(() => {
        setShowPasswordForm(false);
        setPasswordMessage('');
      }, 3000);
    } catch (err: any) {
      setPasswordMessage(`Error: ${err.message || 'No se pudo cambiar la contraseña'}`);
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Formulario de perfil */}
      <form onSubmit={handleSave} className="space-y-5">
        <div>
          <label className="block text-sm font-medium mb-2">Email</label>
          <input
            type="email"
            value={profile.email}
            disabled
            className="input-field !bg-charcoal/5 !cursor-not-allowed"
          />
        </div>

        <div>
          <label htmlFor="name" className="block text-sm font-medium mb-2">Nombre completo</label>
          <input
            id="name"
            type="text"
            required
            minLength={2}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="input-field"
            placeholder="Tu nombre"
          />
        </div>

        <button type="submit" disabled={saving} className="btn-primary">
          <Save className="w-4 h-4" /> {saving ? 'Guardando...' : 'Guardar cambios'}
        </button>

        {message && (
          <p className={`text-sm animate-fade-in ${message.includes('Error') ? 'text-wine' : 'text-sage'}`}>
            {message}
          </p>
        )}
      </form>

      {/* Separador */}
      <div className="border-t border-charcoal/10" />

      {/* Sección de contraseña */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-display text-lg font-bold flex items-center gap-2">
            <Lock className="w-5 h-5 text-terra" /> Contraseña
          </h3>
          {!showPasswordForm && (
            <button
              onClick={() => setShowPasswordForm(true)}
              className="btn-secondary text-sm !px-4 !py-2"
            >
              Cambiar contraseña
            </button>
          )}
        </div>

        {showPasswordForm && (
          <form onSubmit={handlePasswordChange} className="space-y-4 animate-fade-in">
            {/* Nueva contraseña */}
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium mb-2">
                Nueva contraseña
              </label>
              <div className="relative">
                <input
                  id="newPassword"
                  type={showNewPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input-field !pr-12"
                  placeholder="Mínimo 6 caracteres"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-charcoal/40 hover:text-charcoal transition-colors"
                >
                  {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirmar contraseña */}
            <div>
              <label htmlFor="confirmNewPassword" className="block text-sm font-medium mb-2">
                Confirmar nueva contraseña
              </label>
              <div className="relative">
                <input
                  id="confirmNewPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  required
                  minLength={6}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="input-field !pr-12"
                  placeholder="Repite la nueva contraseña"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-md text-charcoal/40 hover:text-charcoal transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {/* Indicador de coincidencia */}
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

            {/* Botones */}
            <div className="flex items-center gap-3">
              <button type="submit" disabled={savingPassword} className="btn-primary text-sm">
                <Lock className="w-4 h-4" />
                {savingPassword ? 'Cambiando...' : 'Cambiar contraseña'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowPasswordForm(false);
                  setNewPassword('');
                  setConfirmPassword('');
                  setPasswordMessage('');
                  setShowNewPassword(false);
                  setShowConfirmPassword(false);
                }}
                className="px-4 py-2 text-sm font-medium text-charcoal/60 hover:text-charcoal hover:bg-charcoal/5 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>

            {passwordMessage && (
              <p className={`text-sm animate-fade-in ${passwordMessage.includes('Error') ? 'text-wine' : 'text-sage'}`}>
                {passwordMessage}
              </p>
            )}
          </form>
        )}

        {!showPasswordForm && (
          <p className="text-sm text-charcoal/40">
            Puedes cambiar tu contraseña en cualquier momento.
          </p>
        )}
      </div>
    </div>
  );
}
