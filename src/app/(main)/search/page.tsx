'use client';

/**
 * @file page.tsx (search)
 * @description Unified search and discover experience.
 */

import React, { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';
import { useSearch } from '../../../hooks/useSearch';
import { useDebouncedValue } from '../../../hooks/useDebouncedValue';
import SearchResults from '../../../components/search/SearchResults';
import DiscoverFields from '../../../components/search/DiscoverFields';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [selectedField, setSelectedField] = useState<{ id: string; name: string } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const debouncedQuery = useDebouncedValue(query, 300);
  const isSearching = debouncedQuery.trim().length > 0;
  
  const { posts, users, isLoading, hasQuery } = useSearch(debouncedQuery);

  // Auto-focus on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  // Exit field detail view when user starts typing
  useEffect(() => {
    if (isSearching && selectedField) {
      setSelectedField(null);
    }
  }, [isSearching, selectedField]);

  return (
    <div className="min-h-screen pb-20">
      {/* Search bar - sticky at top */}
      <div className="sticky top-0 bg-background/80 backdrop-blur-md z-10 p-4 border-b border-border/60">
        <div className="relative group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none group-focus-within:text-accent transition-colors" />
          <input
            ref={inputRef}
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search SoB"
            className="w-full h-11 pl-11 pr-10 bg-muted/50 border border-input rounded-2xl text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent transition-all duration-300 shadow-sm"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-full hover:bg-muted text-muted-foreground transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Content area */}
      <div className="transition-all duration-300">
        {isSearching ? (
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-400">
            <SearchResults 
              query={debouncedQuery}
              users={users}
              posts={posts}
              isLoading={isLoading}
            />
          </div>
        ) : (
          <div className="animate-in fade-in slide-in-from-top-2 duration-400">
            <DiscoverFields 
              selectedField={selectedField}
              setSelectedField={setSelectedField}
            />
          </div>
        )}
      </div>
    </div>
  );
}
