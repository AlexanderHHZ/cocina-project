'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { createSupabaseBrowser } from '@/lib/supabase-browser';
import {
  Search, Menu, X, User, Heart, LogOut, LogIn, Shield,
} from 'lucide-react';
import type { User as SupaUser } from '@supabase/supabase-js';
import SearchDropdown, { getCached, setCache } from '@/components/search/SearchDropdown';
import type { SearchResult } from '@/components/search/SearchDropdown';

export default function Navbar() {
  const [user, setUser] = useState<SupaUser | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [authLoading, setAuthLoading] = useState(true);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  // Live search
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [suggestionsType, setSuggestionsType] = useState<string>('popular');
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const searchRef = useRef<HTMLInputElement>(null);
  const desktopSearchRef = useRef<HTMLInputElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createSupabaseBrowser();

  // ── Auth ──
  useEffect(() => {
    let isMounted = true;

    const loadAdminStatus = async (userId: string) => {
      const { data: profile } = await supabase
        .from('profiles').select('is_admin').eq('id', userId).single();
      if (isMounted) setIsAdmin(profile?.is_admin ?? false);
    };

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!isMounted) return;
        setUser(session?.user ?? null);
        setAuthLoading(false);
        if (session?.user) loadAdminStatus(session.user.id);
        else setIsAdmin(false);
      }
    );

    const retryTimeout = setTimeout(async () => {
      if (!isMounted) return;
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user && isMounted) {
        setUser(session.user);
        setAuthLoading(false);
        loadAdminStatus(session.user.id);
      } else if (isMounted) setAuthLoading(false);
    }, 1000);

    const safetyTimeout = setTimeout(() => { if (isMounted) setAuthLoading(false); }, 3000);

    return () => {
      isMounted = false;
      subscription.unsubscribe();
      clearTimeout(retryTimeout);
      clearTimeout(safetyTimeout);
    };
  }, []);

  useEffect(() => { setSearchQuery(searchParams.get('search') ?? ''); }, [searchParams]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target as Node))
        setUserMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      const inDropdown = dropdownRef.current?.contains(target);
      const inDesktopSearch = desktopSearchRef.current?.contains(target);
      const inMobileSearch = searchRef.current?.contains(target);
      const inForm = (target as HTMLElement).closest?.('form');
      if (!inDropdown && !inDesktopSearch && !inMobileSearch && !inForm)
        setShowDropdown(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  // ── Fetch ──
  const fetchSuggestions = useCallback(async (query: string) => {
    const cacheKey = query.toLowerCase().trim();
    const cached = getCached(cacheKey);
    if (cached) {
      setSuggestions(cached.recipes);
      setSuggestionsType(cached.type);
      setSearching(false);
      return;
    }
    if (abortRef.current) abortRef.current.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setSearching(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`, { signal: controller.signal });
      const data = await res.json();
      const recipes = data.recipes ?? [];
      const type = data.type ?? 'empty';
      setCache(cacheKey, recipes, type);
      if (!controller.signal.aborted) { setSuggestions(recipes); setSuggestionsType(type); }
    } catch (err: any) {
      if (err.name !== 'AbortError') { setSuggestions([]); setSuggestionsType('empty'); }
    } finally {
      if (!controller.signal.aborted) setSearching(false);
    }
  }, []);

  const handleInputChange = (value: string) => {
    setSearchQuery(value);
    setActiveIndex(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value.trim());
      setShowDropdown(true);
    }, 300);
  };

  const handleFocus = () => {
    if (blurTimeoutRef.current) { clearTimeout(blurTimeoutRef.current); blurTimeoutRef.current = null; }
    setSearchFocused(true);
    fetchSuggestions(searchQuery.trim());
    setShowDropdown(true);
  };

  const handleBlur = () => {
    setSearchFocused(false);
    blurTimeoutRef.current = setTimeout(() => { setShowDropdown(false); }, 200);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowDropdown(false);
      desktopSearchRef.current?.blur();
      searchRef.current?.blur();
      return;
    }
    if (!showDropdown || suggestions.length === 0) return;
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setActiveIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setActiveIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (activeIndex >= 0 && activeIndex < suggestions.length)
          navigateToRecipe(suggestions[activeIndex].slug);
        else if (searchQuery.trim())
          navigateToSearch(searchQuery.trim());
        break;
    }
  };

  const navigateToRecipe = useCallback((slug: string) => {
    if (blurTimeoutRef.current) { clearTimeout(blurTimeoutRef.current); blurTimeoutRef.current = null; }
    setShowDropdown(false); setSearchOpen(false); setActiveIndex(-1);
    desktopSearchRef.current?.blur(); searchRef.current?.blur();
    router.push(`/recetas/${slug}`);
  }, [router]);

  const navigateToSearch = useCallback((query: string) => {
    if (blurTimeoutRef.current) { clearTimeout(blurTimeoutRef.current); blurTimeoutRef.current = null; }
    setShowDropdown(false); setSearchOpen(false); setActiveIndex(-1);
    desktopSearchRef.current?.blur(); searchRef.current?.blur();
    router.push(`/recetas?search=${encodeURIComponent(query)}`);
  }, [router]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) navigateToSearch(searchQuery.trim());
  };

  const clearSearch = () => {
    setSearchQuery(''); setSuggestions([]); setShowDropdown(false); setActiveIndex(-1);
  };

  const handleLogout = async () => {
    try { await supabase.auth.signOut(); } catch {}
    setUser(null); setIsAdmin(false); setUserMenuOpen(false);
    router.push('/'); router.refresh();
  };

  const handleHoverIndex = useCallback((index: number) => { setActiveIndex(index); }, []);

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

          <Link href="/" className="flex-shrink-0">
            <img src="/images/logo.webp" alt="Ingrediente 791" className="h-20 w-auto" />
          </Link>

          <div className="hidden lg:flex items-center gap-8 flex-shrink-0">
            {navLinks.map((link) => (
              <Link key={link.href} href={link.href}
                className="text-base font-medium text-charcoal/70 hover:text-terra transition-colors relative
                           after:absolute after:-bottom-1 after:left-0 after:w-0 after:h-0.5 after:bg-terra
                           after:transition-all hover:after:w-full">
                {link.label}
              </Link>
            ))}
          </div>

          {/* ── Buscador desktop ── */}
          <div className="hidden md:block flex-1 max-w-lg mx-6 relative">
            <form onSubmit={handleSearch} className="flex">
              <div className={`relative flex-1 transition-all duration-200 ${
                searchFocused ? 'ring-2 ring-terra/30 rounded-l-[20px]' : ''
              }`}>
                <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 transition-all duration-200 ${
                  searchFocused ? 'opacity-100 w-5' : 'opacity-0 w-0'
                }`}>
                  <Search className="w-6 h-6 text-charcoal/40" />
                </div>
                <input
                  ref={desktopSearchRef}
                  type="text"
                  value={searchQuery}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onFocus={handleFocus}
                  onBlur={handleBlur}
                  onKeyDown={handleKeyDown}
                  placeholder="Buscar por título o ingrediente..."
                  className={`w-full h-12 border border-charcoal/15 bg-white rounded-l-[18px]
                             text-sm placeholder:text-charcoal/40
                             focus:outline-none transition-all duration-200
                             ${searchFocused ? 'pl-12 pr-10' : 'pl-5 pr-10'}
                             border-r-0`}
                  autoComplete="off"
                />
                {searchQuery && (
                  <button type="button" onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { clearSearch(); desktopSearchRef.current?.focus(); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full
                               text-charcoal/40 hover:text-charcoal hover:bg-charcoal/5 transition-all animate-fade-in">
                    <X className="w-5 h-5" />
                  </button>
                )}
              </div>
              <button type="submit"
                className="h-12 px-5 bg-charcoal/[0.06] border border-charcoal/15 border-l-0 rounded-r-[18px]
                           hover:bg-charcoal/[0.1] transition-colors flex items-center justify-center"
                aria-label="Buscar">
                <Search className="w-6 h-6 text-charcoal/60" />
              </button>
            </form>
            <SearchDropdown ref={dropdownRef} show={showDropdown} suggestions={suggestions}
              suggestionsType={suggestionsType} searchQuery={searchQuery} searching={searching}
              activeIndex={activeIndex} onSelectRecipe={navigateToRecipe} onSelectSearch={navigateToSearch}
              onHoverIndex={handleHoverIndex} />
          </div>

          {/* Acciones */}
          <div className="flex items-center gap-4 flex-shrink-0">
            <button onClick={() => {
              const opening = !searchOpen;
              setSearchOpen(opening);
              if (opening) setTimeout(() => { searchRef.current?.focus(); }, 100);
              else setShowDropdown(false);
            }} className="md:hidden p-2.5 rounded-lg hover:bg-charcoal/5 transition-colors" aria-label="Buscar">
              <Search className="w-6 h-6 text-charcoal/60" />
            </button>

            {authLoading ? (
              <div className="w-10 h-10 rounded-full bg-charcoal/5 animate-pulse" />
            ) : user ? (
              <div className="relative" ref={userMenuRef}>
                <button onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-charcoal/5 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-terra/15 flex items-center justify-center">
                    <span className="text-base font-bold text-terra">{user.email?.charAt(0).toUpperCase()}</span>
                  </div>
                </button>
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
              <Link href="/login"
                className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium
                           text-charcoal/70 hover:text-terra hover:bg-charcoal/5 transition-colors">
                <LogIn className="w-5 h-5" />
                <span className="hidden sm:inline">Entrar</span>
              </Link>
            )}

            <button onClick={() => setMenuOpen(!menuOpen)}
              className="lg:hidden p-2.5 rounded-lg hover:bg-charcoal/5 transition-colors" aria-label="Menú">
              {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Búsqueda móvil */}
        {searchOpen && (
          <div className="md:hidden pb-3 animate-slide-up relative">
            <form onSubmit={handleSearch} className="flex">
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/40" />
                <input ref={searchRef} type="text" value={searchQuery}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onFocus={handleFocus} onBlur={handleBlur} onKeyDown={handleKeyDown}
                  placeholder="Buscar recetas..." autoComplete="off"
                  className="w-full h-10 pl-10 pr-9 border border-charcoal/15 bg-white rounded-l-[18px]
                             text-sm placeholder:text-charcoal/40 focus:outline-none focus:ring-2
                             focus:ring-terra/30 border-r-0 transition-all" />
                {searchQuery && (
                  <button type="button" onMouseDown={(e) => e.preventDefault()}
                    onClick={() => { clearSearch(); searchRef.current?.focus(); }}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full
                               text-charcoal/40 hover:text-charcoal transition-all">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
              <button type="submit"
                className="h-10 px-4 bg-charcoal/[0.06] border border-charcoal/15 border-l-0 rounded-r-[18px]
                           hover:bg-charcoal/[0.1] transition-colors flex items-center justify-center"
                aria-label="Buscar">
                <Search className="w-4 h-4 text-charcoal/60" />
              </button>
            </form>
            <SearchDropdown show={showDropdown} suggestions={suggestions} suggestionsType={suggestionsType}
              searchQuery={searchQuery} searching={searching} activeIndex={activeIndex} mobile
              onSelectRecipe={navigateToRecipe} onSelectSearch={navigateToSearch} onHoverIndex={handleHoverIndex} />
          </div>
        )}

        {menuOpen && (
          <div className="lg:hidden pb-4 border-t border-charcoal/5 pt-3 animate-slide-up">
            <div className="flex flex-col gap-1">
              {navLinks.map((link) => (
                <Link key={link.href} href={link.href} onClick={() => setMenuOpen(false)}
                  className="px-4 py-3 rounded-lg text-sm font-medium hover:bg-charcoal/5 transition-colors">
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
