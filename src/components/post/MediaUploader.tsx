'use client';

/**
 * @file MediaUploader.tsx
 * @description Media preview grid for the create/edit composers. Renders image
 * and video previews, per-item trim/crop/remove controls, and a restore control
 * for existing media flagged for removal during an edit.
 *
 * Action buttons (Edit, Crop, Trim, Remove) are always visible so they are
 * discoverable on touch devices and in the installed PWA — no hover required.
 * A subtle dark backdrop keeps the icons legible over bright previews.
 */

import React from 'react';
import { X, Scissors, Crop, Check, Wand2 } from 'lucide-react';
import { MediaItem } from '../../lib/media';

interface MediaUploaderProps {
  items: MediaItem[];
  onRemove: (index: number) => void;
  onRestore?: (index: number) => void;
  onTrim?: (index: number) => void;
  onCrop?: (index: number) => void;
  onEdit?: (index: number) => void;
}

export default function MediaUploader({
  items,
  onRemove,
  onRestore,
  onTrim,
  onCrop,
  onEdit,
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
              removed ? 'border-destructive/50 opacity-50' : 'border-border'
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
              /*
               * Action overlay — always visible so the controls are discoverable
               * without hovering (touch devices and the installed PWA).
               */
              <div className="absolute inset-0 bg-black/25 flex items-center justify-center gap-1.5">
                {!isVideo && item.kind === 'new' && onEdit && (
                  <button
                    type="button"
                    onClick={() => onEdit(i)}
                    className="bg-black/60 hover:bg-accent active:bg-accent text-white rounded-full p-1 transition-all cursor-pointer"
                    title="Edit Image"
                  >
                    <Wand2 className="w-3.5 h-3.5" />
                  </button>
                )}
                {!isVideo && onCrop && item.kind === 'new' && (
                  <button
                    type="button"
                    onClick={() => onCrop(i)}
                    className="bg-black/60 hover:bg-accent active:bg-accent text-white rounded-full p-1 transition-all cursor-pointer"
                    title="Crop Image"
                  >
                    <Crop className="w-3.5 h-3.5" />
                  </button>
                )}
                {isVideo && onTrim && item.kind === 'new' && (
                  <button
                    type="button"
                    onClick={() => onTrim(i)}
                    className="bg-black/60 hover:bg-accent active:bg-accent text-white rounded-full p-1 transition-all cursor-pointer"
                    title="Trim Video"
                  >
                    <Scissors className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onRemove(i)}
                  className="bg-black/60 hover:bg-destructive active:bg-destructive text-white rounded-full p-1 transition-all cursor-pointer"
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
