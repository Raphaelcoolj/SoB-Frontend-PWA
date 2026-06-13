'use client';

/**
 * @file CreatePostModal.tsx
 * @description A modal version of the Create page.
 * Allows quick content creation from any page without navigating away.
 */

import React from 'react';
import { X } from 'lucide-react';
import CreatePage from '../../app/(main)/create/page';

interface CreatePostModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function CreatePostModal({ isOpen, onClose }: CreatePostModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-background/80 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />
      
      {/* Modal Content */}
      <div className="relative bg-card border border-border w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="sticky top-0 bg-card/80 backdrop-blur-md z-10 px-6 py-4 border-b border-border flex items-center justify-between">
          <h2 className="text-xl font-semibold tracking-tight text-foreground italic">Share Brilliance</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-muted transition-colors"
          >
            <X className="w-5 h-5 text-muted-foreground" />
          </button>
        </div>
        
        <div className="p-6">
          <CreatePage />
        </div>
      </div>
    </div>
  );
}

