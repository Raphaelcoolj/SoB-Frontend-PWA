'use client';

/**
 * @file DiscoverFields.tsx
 * @description Discover component - shows field cards, then posts for selected field.
 */

import React from 'react';
import useSWR from 'swr';
import { ChevronLeft, Compass, BookOpen } from 'lucide-react';
import { fetchWithAuth } from '../../lib/api';
import { useDiscoverFeed } from '../../hooks/useDiscoverFeed';
import PostFeed from '../post/PostFeed';
import { Skeleton } from '../ui/Skeleton';

const fetcher = (url: string) => fetchWithAuth(url).then(res => res.json());

interface DiscoverFieldsProps {
  selectedField: { id: string; name: string } | null;
  setSelectedField: (field: { id: string; name: string } | null) => void;
}

export default function DiscoverFields({ selectedField, setSelectedField }: DiscoverFieldsProps) {
  const { data: fieldsData, isLoading: fieldsLoading } = useSWR('/api/fields', fetcher);
  const fields = fieldsData?.data?.fields || [];

  if (selectedField) {
    return (
      <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
        <div className="flex items-center gap-3 py-2 px-4">
          <button
            onClick={() => setSelectedField(null)}
            className="p-2 rounded-xl bg-muted/50 hover:bg-muted text-foreground transition-all active:scale-95"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center">
              <BookOpen className="w-4 h-4 text-accent" />
            </div>
            <h2 className="text-lg font-bold tracking-tight">{selectedField.name}</h2>
          </div>
        </div>

        <FieldPostsFeed fieldId={selectedField.id} />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="px-4 pt-4 pb-2">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
          Explore by field
        </h2>
      </div>

      {fieldsLoading ? (
        <div className="grid grid-cols-2 gap-3 px-4">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <Skeleton key={i} className="h-24 w-full rounded-2xl" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-4">
          {fields.map((field: { _id: string; name: string }) => (
            <button
              key={field._id}
              onClick={() => setSelectedField({ id: field._id, name: field.name })}
              className="group relative h-24 p-4 rounded-2xl border border-border bg-card hover:border-accent/50 hover:shadow-md transition-all duration-300 text-left overflow-hidden"
            >
              <div className="relative z-10 flex flex-col justify-between h-full">
                <span className="font-bold text-sm text-foreground group-hover:text-accent transition-colors">
                  {field.name}
                </span>
                <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-widest">
                  Explore →
                </span>
              </div>
              <div className="absolute -right-2 -bottom-2 opacity-5 group-hover:opacity-10 transition-opacity">
                <BookOpen className="w-16 h-16 rotate-12" />
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function FieldPostsFeed({ fieldId }: { fieldId: string }) {
  const { posts, isLoadingInitial, isLoadingMore, hasMore, isEmpty, loadMore } = useDiscoverFeed(fieldId);

  return (
    <PostFeed 
      posts={posts}
      isLoadingInitial={isLoadingInitial}
      isLoadingMore={isLoadingMore}
      hasMore={hasMore}
      isEmpty={!!isEmpty}
      loadMore={loadMore}
      variant="flat"
    />
  );
}
