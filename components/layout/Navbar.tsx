'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import {
  Search, Menu, X, User, Heart, LogOut, LogIn, Shield,
} from 'lucide-react';
import type { User as SupaUser } from '@supabase/supabase-js';

export default function Navbar() {
  const [user, setUser] = useState<SupaUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const desktopSearchRef = useRef<HTMLInputElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const searchParams = useSearchParams();

  const supabase = createSupabaseBrowser();

  // Escuchar cambios de auth
  useEffect(() => {
    let isMounted = true;

    // Función para cargar perfil admin
    const loadAdminStatus = async (userId: string) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('is_admin')
        .eq('id', userId)
        .single();
      if (isMounted) setIsAdmin(profile?.is_admin ?? false);
    };

    // Listener de cambios de auth
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (!isMounted) return;
        setUser(session?.user ?? null);
        setAuthLoading(false);
        if (session?.user) {
          loadAdminStatus(session.user.id);
        } else {
          setIsAdmin(false);
        }
      }
    );

    // Fallback: si después de 1s no hay usuario detectado, reintentar con getSession
    const retryTimeout = setTimeout(async () => {
      if (!isMounted) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && isMounted) {
        setUser(session.user);
        setAuthLoading(false);
        loadAdminStatus(session.user.id);
      } else if (isMounted) {
        setAuthLoading(false);
      }
    }, 1000);

    // Seguridad absoluta: quitar loading después de 3s
    const safetyTimeout = setTimeout(() => {
      if (isMounted) setAuthLoading(false);
    }, 3000);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      clearTimeout(retryTimeout);
      clearTimeout(safetyTimeout);
    };
  }, []);

  // Sincronizar search query con URL
  useEffect(() => {
    setSearchQuery(searchParams.get('search') ?? '');
  }, [searchParams]);

  // Cerrar menú usuario al hacer click fuera
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/recetas?search=${encodeURIComponent(searchQuery.trim())}`);
      setSearchOpen(false);
    }
  };

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut();
    } catch {
      // Si falla signOut, forzar limpieza local
    }
    setUser(null);
    setIsAdmin(false);
    setUserMenuOpen(false);
    router.push('/');
    router.refresh();
  };

  const navLinks = [
    { href: '/', label: 'Inicio' },
    { href: '/recetas', label: 'Recetas' },
    { href: '/blog', label: 'Blog' },
    { href: '/sobre-mi', label: 'Sobre mí' },
    { href: '/contacto', label: 'Contacto' },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-cream/80 backdrop-blur-xl border-b border-charcoal/5">
      <nav className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-24 gap-6">

          {/* Logo */}
          <Link href="/" className="flex-shrink-0">
            <img
              src="/images/logo.webp"
              alt="Ingrediente 791"
              className="h-20 w-auto"
            />
          </Link>

          {/* Links escritorio */}
          <div className="hidden lg:flex items-center gap-8 flex-shrink-0">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-base font-medium text-charcoal/70 hover:text-terra transition-colors relative
                           after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-terra
                           after:transition-all hover:after:w-full"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* Buscador estilo YouTube - desktop */}
          <div className="hidden md:block flex-1 max-w-lg mx-6">
            <form onSubmit={handleSearch} className="flex">
              <div className={`relative flex-1 transition-all duration-200 ${
                searchFocused ? 'ring-2 ring-terra/30 rounded-l-[18px]' : ''
              }`}>
                {/* Lupa izquierda - aparece con focus */}
                <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-all duration-200 ${
                  searchFocused ? 'opacity-100 w-5' : 'opacity-0 w-0'
                }`}>
                  <Search className="w-5 h-5 text-charcoal/40" />
                </div>
                <input
                  ref={desktopSearchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onFocus={() => setSearchFocused(true)}
                  onBlur={() => setSearchFocused(false)}
                  placeholder="Buscar recetas por nombre o ingrediente"
                  className={`w-full h-10 border border-charcoal/15 bg-white rounded-l-[18px]
                             text-sm placeholder:text-charcoal/40
                             focus:outline-none transition-all duration-200
                             ${searchFocused ? 'pl-11 pr-9' : 'pl-4 pr-9'}
                             border-r-0`}
                />
                {/* Botón X para limpiar */}
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); desktopSearchRef.current?.focus(); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full
                               text-charcoal/40 hover:text-charcoal hover:bg-charcoal/5 transition-all animate-fade-in"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              {/* Botón buscar */}
              <button
                type="submit"
                className="h-10 px-5 bg-charcoal/[0.06] border border-charcoal/15 border-l-0 rounded-r-[18px]
                           hover:bg-charcoal/[0.1] transition-colors flex items-center justify-center"
                aria-label="Buscar"
              >
                <Search className="w-5 h-5 text-charcoal/60" />
              </button>
            </form>
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-4 flex-shrink-0">
            {/* Buscador móvil (ícono) */}
            <button
              onClick={() => { setSearchOpen(!searchOpen); setTimeout(() => searchRef.current?.focus(), 100); }}
              className="md:hidden p-2.5 rounded-lg hover:bg-charcoal/5 transition-colors"
              aria-label="Buscar"
            >
              <Search className="w-6 h-6 text-charcoal/60" />
            </button>

            {/* Auth */}
            {authLoading ? (
              <div className="w-10 h-10 rounded-full bg-charcoal/5 animate-pulse" />
            ) : user ? (
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-charcoal/5 transition-colors"
                >
                  <div className="w-10 h-10 rounded-full bg-terra/15 flex items-center justify-center">
                    <span className="text-base font-bold text-terra">
                      {user.email?.charAt(0).toUpperCase()}
                    </span>
                  </div>
                </button>

                {/* Dropdown */}
                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-charcoal/5 py-2 animate-scale-in origin-top-right">
                    <div className="px-4 py-2 border-b border-charcoal/5">
                      <p className="text-xs text-charcoal/50">Conectado como</p>
                      <p className="text-sm font-medium truncate">{user.email}</p>
                    </div>
                    <Link href="/perfil" onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-charcoal/5 transition-colors">
                      <User className="w-4 h-4 text-charcoal/50" /> Perfil
                    </Link>
                    <Link href="/favoritos" onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-charcoal/5 transition-colors">
                      <Heart className="w-4 h-4 text-charcoal/50" /> Favoritos
                    </Link>
                    {isAdmin && (
                      <Link href="/admin" onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-charcoal/5 transition-colors text-terra">
                        <Shield className="w-4 h-4" /> Panel Admin
                      </Link>
                    )}
                    <button onClick={handleLogout}
                      className="flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-charcoal/5 transition-colors w-full text-left text-wine">
                      <LogOut className="w-4 h-4" /> Cerrar sesión
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                {/* Desktop: botón texto */}
                <Link href="/login" className="hidden sm:block text-base font-medium text-white bg-terra px-6 py-2.5 rounded-full
                                               hover:bg-terra/90 hover:shadow-lg hover:shadow-terra/20
                                               active:scale-[0.98] transition-all">
                  Iniciar sesión
                </Link>
                {/* Móvil: avatar genérico */}
                <Link href="/login" className="sm:hidden">
                  <div className="w-9 h-9 rounded-full bg-charcoal/10 flex items-center justify-center
                                  hover:bg-charcoal/15 transition-colors">
                    <User className="w-5 h-5 text-charcoal/50" />
                  </div>
                </Link>
              </>
            )}

            {/* Hamburguesa móvil */}
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden p-2.5 rounded-lg hover:bg-charcoal/5 transition-colors"
              aria-label="Menú"
            >
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Barra de búsqueda móvil expandible */}
        {searchOpen && (
          <div className="md:hidden pb-3 animate-slide-up">
            <form onSubmit={handleSearch} className="flex">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/40" />
                <input
                  ref={searchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar recetas..."
                  className="w-full h-10 pl-10 pr-9 border border-charcoal/15 bg-white rounded-l-[18px]
                             text-sm placeholder:text-charcoal/40 focus:outline-none focus:ring-2
                             focus:ring-terra/30 border-r-0 transition-all"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => { setSearchQuery(''); searchRef.current?.focus(); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full
                               text-charcoal/40 hover:text-charcoal transition-all"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button
                type="submit"
                className="h-10 px-4 bg-charcoal/[0.06] border border-charcoal/15 border-l-0 rounded-r-[18px]
                           hover:bg-charcoal/[0.1] transition-colors flex items-center justify-center"
                aria-label="Buscar"
              >
                <Search className="w-4 h-4 text-charcoal/60" />
              </button>
            </form>
          </div>
        )}

        {/* Menú móvil */}
        {menuOpen && (
          <div className="lg:hidden pb-4 border-t border-charcoal/5 pt-3 animate-slide-up">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMenuOpen(false)}
                  className="px-4 py-3 rounded-lg text-sm font-medium hover:bg-charcoal/5 transition-colors"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
