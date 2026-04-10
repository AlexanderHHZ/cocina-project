'use client';

import { useState } from 'react';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import { Save } from 'lucide-react';
import type { UserProfile } from '@/types';

interface Props {
  profile: UserProfile;
}

export default function ProfileForm({ profile }: Props) {
  const [fullName, setFullName] = useState(profile.full_name ?? '');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const supabase = createSupabaseBrowser();

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    const { error } = await supabase
      .from('profiles')
      .update({ full_name: fullName })
      .eq('id', profile.id);

    setSaving(false);
    setMessage(error ? 'Error al guardar' : '¡Perfil actualizado!');
    setTimeout(() => setMessage(''), 3000);
  };

  return (
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
  );
}
