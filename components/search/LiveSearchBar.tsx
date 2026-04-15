'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, X } from 'lucide-react';
import SearchDropdown, { getCached, setCache } from '@/components/search/SearchDropdown';
import type { SearchResult } from '@/components/search/SearchDropdown';

interface Props {
  /** Placeholder del input */
  placeholder?: string;
  /** Clases extra para el wrapper */
  className?: string;
  /** Si es la variante "page" (más grande, sin bordes redondeados de form) */
  variant?: 'navbar' | 'page';
}

export default function LiveSearchBar({
  placeholder = 'Buscar por título o ingrediente...',
  className = '',
  variant = 'page',
}: Props) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<SearchResult[]>([]);
  const [suggestionsType, setSuggestionsType] = useState<string>('popular');
  const [showDropdown, setShowDropdown] = useState(false);
  const [searching, setSearching] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);

  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const blurTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const router = useRouter();
  const searchParams = useSearchParams();

  // Sync con URL
  useEffect(() => {
    setQuery(searchParams.get('search') ?? '');
  }, [searchParams]);

  // Click fuera → cerrar dropdown
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Node;
      if (
        dropdownRef.current && !dropdownRef.current.contains(target) &&
        inputRef.current && !inputRef.current.contains(target)
      ) {
        setShowDropdown(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Cleanup
  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (abortRef.current) abortRef.current.abort();
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, []);

  // Fetch con cache + abort
  const fetchSuggestions = useCallback(async (q: string) => {
    const cacheKey = q.toLowerCase().trim();
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
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: controller.signal });
      const data = await res.json();
      const recipes = data.recipes ?? [];
      const type = data.type ?? 'empty';
      setCache(cacheKey, recipes, type);
      if (!controller.signal.aborted) {
        setSuggestions(recipes);
        setSuggestionsType(type);
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setSuggestions([]);
        setSuggestionsType('empty');
      }
    } finally {
      if (!controller.signal.aborted) setSearching(false);
    }
  }, []);

  // Input change + debounce
  const handleChange = (value: string) => {
    setQuery(value);
    setActiveIndex(-1);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchSuggestions(value.trim());
      setShowDropdown(true);
    }, 300);
  };

  // Focus
  const handleFocus = () => {
    if (blurTimeoutRef.current) { clearTimeout(blurTimeoutRef.current); blurTimeoutRef.current = null; }
    fetchSuggestions(query.trim());
    setShowDropdown(true);
  };

  // Blur con delay
  const handleBlur = () => {
    blurTimeoutRef.current = setTimeout(() => { setShowDropdown(false); }, 200);
  };

  // Navegación
  const navigateToRecipe = useCallback((slug: string) => {
    if (blurTimeoutRef.current) { clearTimeout(blurTimeoutRef.current); blurTimeoutRef.current = null; }
    setShowDropdown(false);
    setActiveIndex(-1);
    inputRef.current?.blur();
    router.push(`/recetas/${slug}`);
  }, [router]);

  const navigateToSearch = useCallback((q: string) => {
    if (blurTimeoutRef.current) { clearTimeout(blurTimeoutRef.current); blurTimeoutRef.current = null; }
    setShowDropdown(false);
    setActiveIndex(-1);
    inputRef.current?.blur();
    router.push(`/recetas?search=${encodeURIComponent(q)}`);
  }, [router]);

  const handleHoverIndex = useCallback((index: number) => { setActiveIndex(index); }, []);

  // Teclado
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowDropdown(false);
      inputRef.current?.blur();
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
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          navigateToRecipe(suggestions[activeIndex].slug);
        } else if (query.trim()) {
          navigateToSearch(query.trim());
        }
        break;
    }
  };

  // Submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) navigateToSearch(query.trim());
  };

  // Clear
  const clearSearch = () => {
    setQuery('');
    setSuggestions([]);
    setShowDropdown(false);
    setActiveIndex(-1);
    inputRef.current?.focus();
  };

  return (
    <div className={`relative ${className}`}>
      <form onSubmit={handleSubmit} className="flex">
        <div className="relative flex-1">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-charcoal/40" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onFocus={handleFocus}
            onBlur={handleBlur}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={`w-full border border-charcoal/15 bg-white text-sm placeholder:text-charcoal/40
                       focus:outline-none focus:ring-2 focus:ring-terra/30 focus:border-terra
                       transition-all pl-11 ${query ? 'pr-10' : 'pr-4'}
                       ${variant === 'page'
                         ? 'h-12 rounded-l-xl border-r-0'
                         : 'h-10 rounded-l-[18px] border-r-0'
                       }`}
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={clearSearch}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded-full
                         text-charcoal/40 hover:text-charcoal hover:bg-charcoal/5 transition-all"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <button
          type="submit"
          className={`bg-charcoal/[0.06] border border-charcoal/15 border-l-0
                     hover:bg-charcoal/[0.1] transition-colors flex items-center justify-center
                     ${variant === 'page'
                       ? 'h-12 px-5 rounded-r-xl'
                       : 'h-10 px-4 rounded-r-[18px]'
                     }`}
          aria-label="Buscar"
        >
          <Search className="w-4 h-4 text-charcoal/60" />
        </button>
      </form>

      {/* Dropdown */}
      <SearchDropdown
        ref={dropdownRef}
        show={showDropdown}
        suggestions={suggestions}
        suggestionsType={suggestionsType}
        searchQuery={query}
        searching={searching}
        activeIndex={activeIndex}
        onSelectRecipe={navigateToRecipe}
        onSelectSearch={navigateToSearch}
        onHoverIndex={handleHoverIndex}
      />
    </div>
  );
}
