'use client';

/**
 * @file page.tsx (search)
 * @description Search page with debounced query, simultaneous user+post results,
 * skeleton loaders, and follow buttons on user cards.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Search } from 'lucide-react';
import { useSearch } from '../../../hooks/useSearch';
import SearchResults from '../../../components/search/SearchResults';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const { posts, users, isLoading, hasQuery } = useSearch(query);

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  return (
    <div className="space-y-6 pt-2">
      {/* Search input */}
      <div className="relative group">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none group-focus-within:text-accent transition-colors" />
        <input
          ref={inputRef}
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search people, posts, topics..."
          className="w-full h-12 pl-11 pr-4 bg-card border border-input rounded-2xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all duration-300 shadow-sm"
        />
      </div>

      <SearchResults 
        query={query}
        users={users}
        posts={posts}
        isLoading={isLoading}
      />

      {/* Empty state when no query */}
      {!hasQuery && (
        <div className="flex flex-col items-center justify-center py-20 text-center space-y-4 animate-in fade-in duration-700">
          <div className="w-20 h-20 rounded-3xl bg-muted flex items-center justify-center text-4xl shadow-inner">🔍</div>
          <div className="space-y-1">
            <h3 className="font-semibold text-foreground text-lg">Discover on SoB</h3>
            <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
              Find the most brilliant minds and their insights across any field.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

