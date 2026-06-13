'use client';

/**
 * @file MediaUploader.tsx
 * @description Simplified media upload component with previews.
 */

import React, { useRef } from 'react';
import { X } from 'lucide-react';

interface MediaUploaderProps {
  files: File[];
  previews: string[];
  accept?: string;
  onUpload: (files: File[]) => void;
  onRemove: (index: number) => void;
}

export default function MediaUploader({ 
  files, 
  previews, 
  accept = "image/*", 
  onUpload, 
  onRemove,
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
        {previews.map((src, i) => (
          <div key={i} className="relative w-20 h-20 rounded-lg overflow-hidden border border-border group shadow-sm">
            <img src={src} alt={`Preview ${i + 1}`} className="w-full h-full object-cover" />
            <button
              type="button"
              onClick={() => onRemove(i)}
              className="absolute top-1 right-1 bg-black/50 hover:bg-destructive text-white rounded-full p-1 transition-all opacity-0 group-hover:opacity-100"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        ))}
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
