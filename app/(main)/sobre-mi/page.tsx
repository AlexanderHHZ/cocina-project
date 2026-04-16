import { createSupabaseServer } from '@/lib/supabase-server';
import Image from 'next/image';
import { Youtube, Instagram, Facebook } from 'lucide-react';
import ChefPhotoUpload from '@/components/sobre-mi/ChefPhotoUpload';

const SOCIAL = [
  { name: 'YouTube',   href: 'https://youtube.com/@ingrediente791',   icon: Youtube,   color: 'hover:text-red-500 hover:border-red-200' },
  { name: 'Instagram', href: 'https://instagram.com/ingrediente791',  icon: Instagram, color: 'hover:text-pink-500 hover:border-pink-200' },
  { name: 'Facebook',  href: 'https://facebook.com/ingrediente791',   icon: Facebook,  color: 'hover:text-blue-500 hover:border-blue-200' },
];

const STATS = [
  { value: '150+',  label: 'Recetas publicadas' },
  { value: '3 años', label: 'En la cocina' },
  { value: '100%',  label: 'Ingredientes reales' },
  { value: '∞',     label: 'Pasión por cocinar' },
];

const VALORES = [
  { emoji: '🌽', title: 'Ingredientes de verdad',  desc: 'Sin conservadores, sin atajos. Cada receta empieza en el mercado, no en el supermercado de conveniencia.' },
  { emoji: '📐', title: 'Técnica accesible',        desc: 'Métodos profesionales explicados en pasos que cualquiera puede seguir desde su cocina de casa.' },
  { emoji: '🤝', title: 'Cocina que une',           desc: 'La mejor mesa es la que se comparte. Cada receta está pensada para reunir a la familia y los amigos.' },
];

export default async function SobreMiPage() {
  const supabase = await createSupabaseServer();

  const { data: adminProfile } = await supabase
    .from('profiles')
    .select('id, full_name, chef_photo_url')
    .eq('is_admin', true)
    .limit(1)
    .single();

  const { data: { user } } = await supabase.auth.getUser();
  let isAdmin = false;
  if (user) {
    const { data: viewerProfile } = await supabase
      .from('profiles').select('is_admin').eq('id', user.id).single();
    isAdmin = viewerProfile?.is_admin ?? false;
  }

  const chefName  = adminProfile?.full_name ?? 'Chef Ingrediente 791';
  const chefPhoto = (adminProfile as any)?.chef_photo_url ?? null;
  const adminId   = adminProfile?.id ?? '';

  return (
    <div className="overflow-hidden">

      {/* ── HERO ────────────────────────────────────────────── */}
      <section className="relative bg-gradient-to-br from-linen via-parchment/60 to-linen">
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-paprika/5 blur-3xl" />
          <div className="absolute bottom-0 -left-20 w-72 h-72 rounded-full bg-herb/5 blur-3xl" />
        </div>

        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-20 md:py-28">
          <div className="flex flex-col md:flex-row items-center md:items-start gap-12 md:gap-16">

            {/* Foto del chef */}
            <div className="flex-shrink-0 flex flex-col items-center">
              {isAdmin && adminId ? (
                <ChefPhotoUpload currentPhotoUrl={chefPhoto} adminId={adminId} />
              ) : (
                <div className="relative w-48 h-48 md:w-56 md:h-56 rounded-2xl overflow-hidden bg-parchment border-4 border-white shadow-xl">
                  {chefPhoto ? (
                    <Image src={chefPhoto} alt={`Foto de ${chefName}`} fill className="object-cover" sizes="224px" priority />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <span className="text-6xl font-bold text-paprika font-display">{chefName.charAt(0)}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Redes sociales */}
              <div className="flex items-center gap-3 mt-5">
                {SOCIAL.map(({ name, href, icon: Icon, color }) => (
                  <a key={name} href={href} target="_blank" rel="noopener noreferrer" aria-label={name}
                    className={`w-9 h-9 rounded-full border border-walnut/15 flex items-center justify-center text-walnut/40 transition-all duration-200 ${color}`}>
                    <Icon className="w-4 h-4" />
                  </a>
                ))}
              </div>
            </div>

            {/* Texto del hero */}
            <div className="flex-1 text-center md:text-left">
              <p className="text-xs font-ui font-semibold text-paprika uppercase tracking-widest mb-3">
                Ingrediente 791
              </p>
              <h1 className="font-display text-4xl md:text-5xl font-bold leading-tight mb-5 text-walnut">
                Hola, soy <span className="text-paprika italic">{chefName}</span>
              </h1>
              <p className="text-lg text-walnut/65 leading-relaxed mb-6 max-w-xl">
                Chef casero, apasionado por la gastronomía mexicana y latinoamericana.
                Comparto recetas que nacen de la tradición y se cocinan con el corazón,
                para que cualquiera pueda replicarlas en casa.
              </p>
              <p className="text-walnut/60 leading-relaxed max-w-xl">
                Todo empezó en la cocina de mi abuela, donde los guisos lentos y el olor a
                pan recién horneado marcaron mi infancia. Hoy llevo esos recuerdos a cada
                video del canal y a cada receta de este blog.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── STATS ───────────────────────────────────────────── */}
      <section className="border-y border-walnut/10 bg-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-center">
            {STATS.map(({ value, label }) => (
              <div key={label}>
                <p className="font-display text-3xl md:text-4xl font-bold text-paprika mb-1">{value}</p>
                <p className="text-sm text-walnut/50 font-ui">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── MI HISTORIA ─────────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <p className="text-xs font-ui font-semibold text-paprika uppercase tracking-widest mb-3">Mi historia</p>
            <h2 className="font-display text-3xl font-bold text-walnut mb-6 leading-snug">
              De la cocina de mi abuela<br />
              <span className="text-paprika italic">al canal de YouTube</span>
            </h2>
            <div className="space-y-4 text-walnut/65 leading-relaxed">
              <p>
                Aprendí a cocinar viendo, no leyendo recetas. Los domingos en casa de mi abuela
                eran una clase magistral de sazón, paciencia y amor. Cada mole, cada caldo, cada
                tamal era una tradición que se transmitía con las manos.
              </p>
              <p>
                Con el tiempo empecé a documentar esas recetas para no perderlas, y descubrí que
                la mejor manera de preservarlas era compartiéndolas. Así nació
                <strong className="text-walnut font-medium"> Ingrediente 791</strong> — un canal
                y blog donde la cocina casera es la protagonista.
              </p>
              <p>
                Mi filosofía es sencilla: buenas materias primas, técnica clara y mucho cariño.
                No necesitas una cocina de restaurante para comer bien.
              </p>
            </div>
          </div>

          {/* Cita editorial */}
          <div className="relative">
            <div className="bg-parchment rounded-3xl p-8 md:p-10 relative overflow-hidden">
              <div className="absolute top-4 left-6 font-display text-8xl text-paprika/10 leading-none select-none">"</div>
              <blockquote className="relative z-10">
                <p className="font-display text-xl md:text-2xl font-bold text-walnut leading-snug mb-5 italic">
                  La buena comida no necesita lujo, solo necesita amor y los ingredientes correctos.
                </p>
                <footer className="flex items-center gap-3">
                  <div className="w-8 h-0.5 bg-paprika rounded-full" />
                  <cite className="not-italic text-sm font-ui font-medium text-paprika">{chefName}</cite>
                </footer>
              </blockquote>
              <div className="absolute bottom-4 right-4 w-16 h-16 rounded-full border-2 border-paprika/10" />
              <div className="absolute bottom-8 right-8 w-8 h-8 rounded-full bg-honey/20" />
            </div>
          </div>
        </div>
      </section>

      {/* ── VALORES ─────────────────────────────────────────── */}
      <section className="bg-walnut text-white">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
          <div className="text-center mb-12">
            <p className="text-xs font-ui font-semibold text-honey uppercase tracking-widest mb-3">Mi filosofía</p>
            <h2 className="font-display text-3xl font-bold">Lo que guía cada receta</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {VALORES.map(({ emoji, title, desc }) => (
              <div key={title} className="bg-white/5 rounded-2xl p-7 border border-white/10 hover:bg-white/10 transition-colors duration-200">
                <div className="text-3xl mb-4">{emoji}</div>
                <h3 className="font-display font-bold text-lg mb-2">{title}</h3>
                <p className="text-sm text-white/60 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CANAL DE YOUTUBE ────────────────────────────────── */}
      <section className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-20">
        <div className="flex flex-col sm:flex-row items-center gap-8 bg-parchment rounded-3xl p-8 md:p-12">
          <div className="w-16 h-16 rounded-2xl bg-red-500/10 flex items-center justify-center flex-shrink-0">
            <Youtube className="w-8 h-8 text-red-500" />
          </div>
          <div className="flex-1 text-center sm:text-left">
            <h3 className="font-display text-2xl font-bold text-walnut mb-2">Sígueme en YouTube</h3>
            <p className="text-walnut/60 text-sm leading-relaxed">
              Cada semana una receta nueva en video. Paso a paso, sin cortes raros y
              con todos los trucos que no caben en la pantalla.
            </p>
          </div>
          <a href="https://youtube.com/@ingrediente791" target="_blank" rel="noopener noreferrer"
            className="btn-primary whitespace-nowrap flex-shrink-0">
            Ver canal →
          </a>
        </div>
      </section>

    </div>
  );
}
