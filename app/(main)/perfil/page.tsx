import { createSupabaseServer } from '@/lib/supabase-server';
import { redirect } from 'next/navigation';
import { User } from 'lucide-react';
import ProfileForm from '@/app/(main)/perfil/ProfileForm';

export default async function PerfilPage() {
  const supabase = await createSupabaseServer();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect('/login');

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single();

  if (!profile) redirect('/login');

  return (
    <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <h1 className="font-display text-3xl font-bold mb-8 flex items-center gap-3">
        <User className="w-7 h-7 text-terra" /> Mi perfil
      </h1>
      <ProfileForm profile={profile} />
    </div>
  );
}
