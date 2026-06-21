'use client';

/**
 * @file MediaUploader.tsx
 * @description Simplified media upload component with previews.
 */

import React, { useRef } from 'react';
import { X, Scissors } from 'lucide-react';

interface MediaUploaderProps {
  files: File[];
  previews: string[];
  accept?: string;
  onUpload: (files: File[]) => void;
  onRemove: (index: number) => void;
  onTrim?: (index: number) => void; // NEW: Trim callback
}

export default function MediaUploader({ 
  files, 
  previews, 
  accept = "image/*", 
  onUpload, 
  onRemove,
  onTrim, // NEW
}: MediaUploaderProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = Array.from(e.target.files || []);
    if (selectedFiles.length > 0) {
      onUpload(selectedFiles);
    }
    e.target.value = '';
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-3">
        {previews.map((src, i) => {
          const isVideo = files[i]?.type.startsWith('video/');
          return (
            <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border group shadow-sm bg-black">
              {isVideo ? (
                // NEW: Render video tag instead of image for video previews
                <video src={src} className="w-full h-full object-cover" muted playsInline />
              ) : (
                <img src={src} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
              )}
              
              {/* Overlay controls */}
              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1.5">
                {isVideo && onTrim && (
                  // NEW: Trim button
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
                  title="Remove"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      
      <input
        ref={fileInputRef}
        type="file"
        accept={accept}
        multiple
        onChange={handleFileSelect}
        className="hidden"
      />
      
      {/* Hidden button triggered by icons in parent component */}
      <button type="button" onClick={() => fileInputRef.current?.click()} className="hidden" />
    </div>
  );
}
