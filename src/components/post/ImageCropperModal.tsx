'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { X, Crop, RefreshCw } from 'lucide-react';
import { Button } from '../ui/Button';

interface ImageCropperModalProps {
  file: File;
  isOpen: boolean;
  onClose: () => void;
  onCropComplete: (croppedFile: File) => void;
}

interface Point { x: number; y: number; }

export default function ImageCropperModal({ file, isOpen, onClose, onCropComplete }: ImageCropperModalProps) {
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [display, setDisplay] = useState({ w: 0, h: 0 });
  const [crop, setCrop] = useState<{ x: number; y: number; w: number; h: number } | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawStart, setDrawStart] = useState<Point>({ x: 0, y: 0 });
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => { URL.revokeObjectURL(url); setImageUrl(null); };
  }, [file]);

  const getPos = useCallback((clientX: number, clientY: number): Point | null => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return null;
    return { x: clientX - rect.left, y: clientY - rect.top };
  }, []);

  const updateDisplay = useCallback(() => {
    if (imageRef.current && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      setDisplay({ w: rect.width, h: rect.height });
      setNatural({ w: imageRef.current.naturalWidth, h: imageRef.current.naturalHeight });
    }
  }, []);

  const handleImageLoad = () => {
    updateDisplay();
    setCrop(null);
  };

  const startCrop = useCallback((pos: Point) => {
    setIsDrawing(true);
    setDrawStart(pos);
    setCrop(null);
  }, []);

  const moveCrop = useCallback((pos: Point) => {
    if (!isDrawing) return;
    const x = Math.min(drawStart.x, pos.x);
    const y = Math.min(drawStart.y, pos.y);
    const w = Math.abs(pos.x - drawStart.x);
    const h = Math.abs(pos.y - drawStart.y);
    setCrop({ x, y, w, h });
  }, [isDrawing, drawStart]);

  const endCrop = useCallback(() => {
    setIsDrawing(false);
    if (crop && (crop.w < 10 || crop.h < 10)) {
      setCrop(null);
    }
  }, [crop]);

  const handleMouseDown = (e: React.MouseEvent) => { const p = getPos(e.clientX, e.clientY); if (p) startCrop(p); };
  const handleMouseMove = (e: React.MouseEvent) => { const p = getPos(e.clientX, e.clientY); if (p) moveCrop(p); };
  const handleMouseUp = () => endCrop();

  const handleTouchStart = (e: React.TouchEvent) => {
    if (e.touches.length === 1) { const p = getPos(e.touches[0].clientX, e.touches[0].clientY); if (p) startCrop(p); }
  };
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches.length === 1) { const p = getPos(e.touches[0].clientX, e.touches[0].clientY); if (p) moveCrop(p); }
  };
  const handleTouchEnd = () => endCrop();

  const applyCrop = async () => {
    if (!crop || !imageRef.current) return;
    setIsProcessing(true);

    const scaleX = natural.w / display.w;
    const scaleY = natural.h / display.h;
    const sx = crop.x * scaleX;
    const sy = crop.y * scaleY;
    const sw = crop.w * scaleX;
    const sh = crop.h * scaleY;

    const canvas = document.createElement('canvas');
    canvas.width = sw;
    canvas.height = sh;
    const ctx = canvas.getContext('2d');
    if (!ctx) { setIsProcessing(false); return; }

    ctx.drawImage(imageRef.current, sx, sy, sw, sh, 0, 0, sw, sh);
    canvas.toBlob((blob) => {
      if (!blob) { setIsProcessing(false); return; }
      const croppedFile = new File([blob], file.name, { type: file.type });
      setIsProcessing(false);
      onCropComplete(croppedFile);
    }, file.type);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-background/80 backdrop-blur-md">
      <div className="relative bg-card border border-border w-full sm:max-w-2xl sm:rounded-3xl rounded-t-3xl shadow-2xl p-4 sm:p-6 flex flex-col max-h-[95vh] sm:max-h-[90vh]">
        <div className="flex items-center justify-between pb-3 border-b border-border mb-3">
          <h3 className="font-bold text-base sm:text-lg flex items-center gap-2">
            <Crop className="w-4 h-4 sm:w-5 sm:h-5 text-accent" />
            Crop Image
          </h3>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-muted transition-colors active:scale-95" disabled={isProcessing}>
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 flex flex-col gap-3 min-h-0">
          <div
            ref={containerRef}
            className="relative w-full flex-1 min-h-[250px] sm:min-h-[300px] rounded-xl sm:rounded-2xl overflow-hidden bg-black border border-border touch-none select-none"
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
          >
            {imageUrl && (
              <img
                ref={imageRef}
                src={imageUrl}
                alt="Crop preview"
                className="w-full h-full object-contain"
                onLoad={handleImageLoad}
                draggable={false}
              />
            )}
            {crop && (
              <div
                className="absolute border-2 border-accent bg-accent/10 pointer-events-none"
                style={{ left: crop.x, top: crop.y, width: crop.w, height: crop.h }}
              />
            )}
          </div>

          {imageUrl && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="truncate mr-2">{file.name} ({Math.round(natural.w)}x{Math.round(natural.h)})</span>
              {crop && crop.w >= 10 && crop.h >= 10 && (
                <span className="shrink-0">
                  {Math.round(crop.w * natural.w / display.w)}x{Math.round(crop.h * natural.h / display.h)}px
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-3 pt-3 border-t border-border mt-3">
          <Button variant="outline" className="flex-1 py-3 text-sm" onClick={onClose} disabled={isProcessing}>
            Cancel
          </Button>
          <Button
            className="flex-1 py-3 text-sm"
            disabled={!crop || crop.w < 10 || crop.h < 10 || isProcessing}
            onClick={applyCrop}
          >
            {isProcessing ? (
              <span className="flex items-center gap-2 justify-center">
                <RefreshCw className="w-4 h-4 animate-spin" /> Cropping...
              </span>
            ) : 'Apply Crop'}
          </Button>
        </div>
      </div>
    </div>
  );
}
