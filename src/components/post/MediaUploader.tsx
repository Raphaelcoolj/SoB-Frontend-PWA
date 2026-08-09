'use client';

/**
 * @file MediaUploader.tsx
 * @description Media preview grid for the create/edit composers. Renders image
 * and video previews, per-item trim/crop/remove controls, and a restore control
 * for existing media flagged for removal during an edit.
 */

import React from 'react';
import { X, Scissors, Crop, Check } from 'lucide-react';
import { MediaItem } from '../../lib/media';

interface MediaUploaderProps {
  items: MediaItem[];
  onRemove: (index: number) => void;
  onRestore?: (index: number) => void;
  onTrim?: (index: number) => void;
  onCrop?: (index: number) => void;
}

export default function MediaUploader({
  items,
  onRemove,
  onRestore,
  onTrim,
  onCrop,
}: MediaUploaderProps) {
  if (items.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-3">
      {items.map((item, i) => {
        const isVideo = item.isVideo;
        const removed = !!item.removed;
        return (
          <div
            key={item.id}
            className={`relative w-20 h-20 rounded-lg overflow-hidden border shadow-sm bg-black ${
              removed ? 'border-destructive/50 opacity-50' : 'border-border group'
            }`}
          >
            {isVideo ? (
              <video src={item.preview} className="w-full h-full object-cover" muted playsInline />
            ) : (
              <img src={item.preview} alt={`Media preview ${i + 1}`} className="w-full h-full object-cover" />
            )}

            {removed ? (
              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                {onRestore && (
                  <button
                    type="button"
                    onClick={() => onRestore(i)}
                    className="bg-black/70 hover:bg-accent text-white rounded-full p-1 transition-all cursor-pointer"
                    title="Keep media"
                  >
                    <Check className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : (
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                {!isVideo && onCrop && item.kind === 'new' && (
                  <button
                    type="button"
                    onClick={() => onCrop(i)}
                    className="bg-black/60 hover:bg-accent text-white rounded-full p-1 transition-all cursor-pointer"
                    title="Crop Image"
                  >
                    <Crop className="w-3.5 h-3.5" />
                  </button>
                )}
                {isVideo && onTrim && item.kind === 'new' && (
                  <button
                    type="button"
                    onClick={() => onTrim(i)}
                    className="bg-black/60 hover:bg-accent text-white rounded-full p-1 transition-all cursor-pointer"
                    title="Trim Video"
                  >
                    <Scissors className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  className="bg-black/60 hover:bg-destructive text-white rounded-full p-1 transition-all cursor-pointer"
                  title={item.kind === 'existing' ? 'Remove media' : 'Remove'}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
