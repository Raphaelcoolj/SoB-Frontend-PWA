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

interface CropBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

type DragMode = 'move' | 'nw' | 'ne' | 'sw' | 'se' | 'n' | 's' | 'w' | 'e';

const HANDLE_HIT = 16;
const MIN_SIZE = 30;

function clamp(v: number, min: number, max: number) {
  return Math.min(Math.max(v, min), max);
}

function getCursor(mode: DragMode | null) {
  if (!mode) return 'default';
  const map: Record<string, string> = {
    move: 'move', nw: 'nw-resize', ne: 'ne-resize',
    sw: 'sw-resize', se: 'se-resize',
    n: 'n-resize', s: 's-resize', w: 'w-resize', e: 'e-resize',
  };
  return map[mode] || 'default';
}

export default function ImageCropperModal({ file, isOpen, onClose, onCropComplete }: ImageCropperModalProps) {
  const imgRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [natural, setNatural] = useState({ w: 0, h: 0 });
  const [display, setDisplay] = useState({ w: 0, h: 0 });
  const [box, setBox] = useState<CropBox | null>(null);
  const [dragMode, setDragMode] = useState<DragMode | null>(null);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [boxOnStart, setBoxOnStart] = useState<CropBox | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const url = URL.createObjectURL(file);
    setImageUrl(url);
    return () => { URL.revokeObjectURL(url); setImageUrl(null); };
  }, [file]);

  const pos = useCallback((clientX: number, clientY: number) => {
    const r = containerRef.current?.getBoundingClientRect();
    return r ? { x: clientX - r.left, y: clientY - r.top } : null;
  }, []);

  const hitTest = useCallback((p: { x: number; y: number }, b: CropBox): DragMode | null => {
    const h = HANDLE_HIT;
    const l = p.x >= b.x - h && p.x <= b.x + h;
    const r = p.x >= b.x + b.w - h && p.x <= b.x + b.w + h;
    const t = p.y >= b.y - h && p.y <= b.y + h;
    const bt = p.y >= b.y + b.h - h && p.y <= b.y + b.h + h;
    const insideX = p.x >= b.x && p.x <= b.x + b.w;
    const insideY = p.y >= b.y && p.y <= b.y + b.h;
    if (t && l) return 'nw';
    if (t && r) return 'ne';
    if (bt && l) return 'sw';
    if (bt && r) return 'se';
    if (t && insideX) return 'n';
    if (bt && insideX) return 's';
    if (l && insideY) return 'w';
    if (r && insideY) return 'e';
    if (insideX && insideY) return 'move';
    return null;
  }, []);

  const initBox = useCallback(() => {
    if (display.w === 0 || display.h === 0) return;
    const m = 0.08;
    setBox({
      x: display.w * m,
      y: display.h * m,
      w: display.w * (1 - 2 * m),
      h: display.h * (1 - 2 * m),
    });
  }, [display]);

  useEffect(() => {
    if (display.w > 0) initBox();
  }, [display, initBox]);

  const onImgLoad = () => {
    if (imgRef.current && containerRef.current) {
      const r = containerRef.current.getBoundingClientRect();
      setDisplay({ w: r.width, h: r.height });
      setNatural({ w: imgRef.current.naturalWidth, h: imgRef.current.naturalHeight });
    }
  };

  const onDown = (e: React.PointerEvent) => {
    const p = pos(e.clientX, e.clientY);
    if (!p || !box) return;
    const mode = hitTest(p, box);
    if (!mode) return;
    setDragMode(mode);
    setDragStart(p);
    setBoxOnStart({ ...box });
    containerRef.current?.setPointerCapture(e.pointerId);
    e.preventDefault();
  };

  const onMove = (e: React.PointerEvent) => {
    if (!dragMode || !boxOnStart) {
      if (box && containerRef.current) {
        const p = pos(e.clientX, e.clientY);
        if (p) {
          const mode = hitTest(p, box);
          containerRef.current.style.cursor = getCursor(mode);
        }
      }
      return;
    }
    const p = pos(e.clientX, e.clientY);
    if (!p) return;
    const r = containerRef.current?.getBoundingClientRect();
    if (!r) return;
    const maxW = r.width;
    const maxH = r.height;
    const dx = p.x - dragStart.x;
    const dy = p.y - dragStart.y;
    let { x, y, w, h } = boxOnStart;

    switch (dragMode) {
      case 'move':
        x = clamp(x + dx, 0, maxW - w);
        y = clamp(y + dy, 0, maxH - h);
        break;
      case 'nw': {
        const nx = clamp(x + dx, 0, x + w - MIN_SIZE);
        const ny = clamp(y + dy, 0, y + h - MIN_SIZE);
        w = x + w - nx;
        h = y + h - ny;
        x = nx; y = ny;
        break;
      }
      case 'ne': {
        const ny = clamp(y + dy, 0, y + h - MIN_SIZE);
        w = clamp(w + dx, MIN_SIZE, maxW - x);
        h = y + h - ny;
        y = ny;
        break;
      }
      case 'sw': {
        const nx = clamp(x + dx, 0, x + w - MIN_SIZE);
        w = x + w - nx;
        h = clamp(h + dy, MIN_SIZE, maxH - y);
        x = nx;
        break;
      }
      case 'se':
        w = clamp(w + dx, MIN_SIZE, maxW - x);
        h = clamp(h + dy, MIN_SIZE, maxH - y);
        break;
      case 'n': {
        const ny = clamp(y + dy, 0, y + h - MIN_SIZE);
        h = y + h - ny;
        y = ny;
        break;
      }
      case 's':
        h = clamp(h + dy, MIN_SIZE, maxH - y);
        break;
      case 'w': {
        const nx = clamp(x + dx, 0, x + w - MIN_SIZE);
        w = x + w - nx;
        x = nx;
        break;
      }
      case 'e':
        w = clamp(w + dx, MIN_SIZE, maxW - x);
        break;
    }
    setBox({ x, y, w, h });
  };

  const onUp = (e: React.PointerEvent) => {
    containerRef.current?.releasePointerCapture(e.pointerId);
    setDragMode(null);
  };

  const apply = async () => {
    if (!box || !imgRef.current) return;
    setIsProcessing(true);
    const sx = (box.x / display.w) * natural.w;
    const sy = (box.y / display.h) * natural.h;
    const sw = (box.w / display.w) * natural.w;
    const sh = (box.h / display.h) * natural.h;
    const c = document.createElement('canvas');
    c.width = sw;
    c.height = sh;
    const ctx = c.getContext('2d');
    if (!ctx) { setIsProcessing(false); return; }
    ctx.drawImage(imgRef.current, sx, sy, sw, sh, 0, 0, sw, sh);
    c.toBlob((blob) => {
      if (!blob) { setIsProcessing(false); return; }
      onCropComplete(new File([blob], file.name, { type: file.type }));
      setIsProcessing(false);
    }, file.type);
  };

  if (!isOpen) return null;

  const cursor = dragMode ? getCursor(dragMode) : undefined;

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
            onPointerDown={onDown}
            onPointerMove={onMove}
            onPointerUp={onUp}
            onPointerCancel={onUp}
            style={{ cursor }}
          >
            {imageUrl && (
              <img
                ref={imgRef}
                src={imageUrl}
                alt="Crop preview"
                className="w-full h-full object-contain"
                onLoad={onImgLoad}
                draggable={false}
              />
            )}
            {box && (
              <>
                <div className="absolute inset-0 pointer-events-none" style={{
                  background: 'rgba(0,0,0,0.5)',
                  clipPath: `polygon(
                    0% 0%, 100% 0%, 100% 100%, 0% 100%,
                    0% 0%,
                    ${box.x}px ${box.y}px,
                    ${box.x}px ${box.y + box.h}px,
                    ${box.x + box.w}px ${box.y + box.h}px,
                    ${box.x + box.w}px ${box.y}px,
                    ${box.x}px ${box.y}px
                  )`,
                }} />
                <div className="absolute border-2 border-white pointer-events-none" style={{ left: box.x, top: box.y, width: box.w, height: box.h }} />
                <Handle cx={box.x} cy={box.y} />
                <Handle cx={box.x + box.w} cy={box.y} />
                <Handle cx={box.x} cy={box.y + box.h} />
                <Handle cx={box.x + box.w} cy={box.y + box.h} />
                <EdgeHandle cx={box.x + box.w / 2} cy={box.y} />
                <EdgeHandle cx={box.x + box.w / 2} cy={box.y + box.h} />
                <EdgeHandle cx={box.x} cy={box.y + box.h / 2} />
                <EdgeHandle cx={box.x + box.w} cy={box.y + box.h / 2} />
              </>
            )}
          </div>

          {imageUrl && (
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span className="truncate mr-2">{file.name} ({Math.round(natural.w)}x{Math.round(natural.h)})</span>
              {box && (
                <span className="shrink-0">
                  {Math.round((box.w / display.w) * natural.w)}x{Math.round((box.h / display.h) * natural.h)}px
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
            disabled={!box || box.w < MIN_SIZE || box.h < MIN_SIZE || isProcessing}
            onClick={apply}
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

function Handle({ cx, cy }: { cx: number; cy: number }) {
  const s = 12;
  return (
    <div
      className="absolute bg-white border-2 border-accent rounded-sm pointer-events-none"
      style={{ left: cx - s / 2, top: cy - s / 2, width: s, height: s }}
    />
  );
}

function EdgeHandle({ cx, cy }: { cx: number; cy: number }) {
  const s = 10;
  return (
    <div
      className="absolute bg-white border border-accent/60 rounded-sm pointer-events-none"
      style={{ left: cx - s / 2, top: cy - s / 2, width: s, height: s }}
    />
  );
}
