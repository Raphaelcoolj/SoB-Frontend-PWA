'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  DrawingPath,
  EditorTool,
  ImageEditorState,
  NormalizedRect,
  TextOverlay,
  ViewState,
} from '../../lib/editor/types';
import type { CropDragMode, Rect } from '../../lib/editor/geometry';
import {
  clampView,
  cropAspectValue,
  cropBox,
  normToScreen,
  resizeCrop,
  rotatedSize,
  screenToNorm,
  viewportAffine,
  zoomAt,
} from '../../lib/editor/geometry';
import { newId } from '../../lib/editor/state';

export interface DrawSettings {
  color: string;
  width: number;
  eraser: boolean;
}

interface EditorCanvasProps {
  source: ImageEditorState['source'];
  bitmap: CanvasImageSource | null;
  state: ImageEditorState;
  view: ViewState;
  onViewChange: (v: ViewState) => void;
  tool: EditorTool;
  selectedOverlayId: string | null;
  onSelectOverlay: (id: string | null) => void;
  drawSettings: DrawSettings;
  beginGesture: () => void;
  commitGesture: () => void;
  onCropChange: (crop: NormalizedRect) => void;
  onOverlayAddAt: (point: { x: number; y: number }) => void;
  onOverlayPatch: (id: string, patch: Partial<TextOverlay>) => void;
  onDrawingCommit: (path: DrawingPath) => void;
}

type Gesture =
  | { kind: 'pan'; startView: ViewState; startX: number; startY: number }
  | { kind: 'pinch'; startView: ViewState; startDist: number; startMid: { x: number; y: number } }
  | { kind: 'cropMove'; startCrop: NormalizedRect }
  | { kind: 'cropResize'; mode: CropDragMode; startCrop: NormalizedRect }
  | { kind: 'draw'; stroke: DrawingPath }
  | { kind: 'textMove'; id: string; start: TextOverlay }
  | { kind: 'textScale'; id: string; start: TextOverlay; startDist: number; center: { x: number; y: number } }
  | { kind: 'textRotate'; id: string; start: TextOverlay; startAngle: number; center: { x: number; y: number } }
  | { kind: 'textPinch'; id: string; start: TextOverlay; startDist: number; startAngle: number; center: { x: number; y: number } };

const HANDLE_R = 26;
const TAP_MOVE = 8;
const TEXT_SCALE_MIN = 0.2;
const TEXT_SCALE_MAX = 12;

function clamp(v: number, min: number, max: number): number {
  return Math.min(Math.max(v, min), max);
}

function normDeg(d: number): number {
  return ((d % 360) + 360) % 360;
}

function angleDeg(dx: number, dy: number): number {
  return (Math.atan2(dy, dx) * 180) / Math.PI;
}

const CORNER_HANDLES: Array<{ mode: CropDragMode; x: number; y: number }> = [
  { mode: 'nw', x: 0, y: 0 },
  { mode: 'ne', x: 1, y: 0 },
  { mode: 'sw', x: 0, y: 1 },
  { mode: 'se', x: 1, y: 1 },
];

const EDGE_HANDLES: Array<{ mode: CropDragMode; x: number; y: number }> = [
  { mode: 'n', x: 0.5, y: 0 },
  { mode: 's', x: 0.5, y: 1 },
  { mode: 'w', x: 0, y: 0.5 },
  { mode: 'e', x: 1, y: 0.5 },
];

function hitCropHandle(px: number, py: number, box: Rect): CropDragMode | null {
  let best: CropDragMode | null = null;
  let bestD = HANDLE_R;
  for (const h of [...CORNER_HANDLES, ...EDGE_HANDLES]) {
    const d = Math.hypot(px - (box.x + h.x * box.w), py - (box.y + h.y * box.h));
    if (d < bestD) {
      bestD = d;
      best = h.mode;
    }
  }
  return best;
}

/**
 * The interactive preview surface. Renders the image, crop mask, drawing
 * strokes and text overlays, and owns all pointer gestures (pan / pinch-zoom,
 * crop drag, drawing, text move/scale/rotate).
 */
export function EditorCanvas({
  source,
  bitmap,
  state,
  view,
  onViewChange,
  tool,
  selectedOverlayId,
  onSelectOverlay,
  drawSettings,
  beginGesture,
  commitGesture,
  onCropChange,
  onOverlayAddAt,
  onOverlayPatch,
  onDrawingCommit,
}: EditorCanvasProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });

  const pointersRef = useRef(new Map<number, { x: number; y: number }>());
  const gestureRef = useRef<Gesture | null>(null);
  const pendingStrokeRef = useRef<DrawingPath | null>(null);

  const rot = useMemo(
    () => rotatedSize(source.width, source.height, state.transform.rotation),
    [source.width, source.height, state.transform.rotation]
  );

  const box = useMemo(
    () => cropBox(state.crop, rot.w, rot.h, view, size.w, size.h),
    [state.crop, rot.w, rot.h, view, size.w, size.h]
  );

  const normAspect = useMemo(
    () => cropAspectValue(state.cropAspect, source.width, source.height, state.transform.rotation),
    [state.cropAspect, source.width, source.height, state.transform.rotation]
  );

  // Measure the container.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      const r = entries[0]?.contentRect;
      if (r) setSize({ w: r.width, h: r.height });
    });
    ro.observe(el);
    const r = el.getBoundingClientRect();
    setSize({ w: r.width, h: r.height });
    return () => ro.disconnect();
  }, []);

  const dpr = useMemo(() => (typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1), []);

  // Redraw the canvas whenever the visual inputs change.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx || !bitmap || size.w <= 0) return;
    canvas.width = Math.max(1, Math.round(size.w * dpr));
    canvas.height = Math.max(1, Math.round(size.h * dpr));

    const px = (css: number) => css * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = 'rgba(0,0,0,0.9)';
    ctx.fillRect(0, 0, size.w, size.h);

    const aff = viewportAffine(
      state.transform.rotation,
      state.transform.flipX,
      state.transform.flipY,
      state.crop,
      rot.w,
      rot.h,
      view,
      size.w,
      size.h
    );
    ctx.setTransform(px(aff.a), px(aff.b), px(aff.c), px(aff.d), px(aff.e), px(aff.f));
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, 0, 0, source.width, source.height, 0, 0, 1, 1);

    // Drawing strokes (in screen space, above the image).
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const strokes = [...state.drawings];
    if (pendingStrokeRef.current) strokes.push(pendingStrokeRef.current);
    for (const path of strokes) {
      if (path.points.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(box.x + path.points[0].x * box.w, box.y + path.points[0].y * box.h);
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(box.x + path.points[i].x * box.w, box.y + path.points[i].y * box.h);
      }
      ctx.strokeStyle = path.eraser ? '#0a0a0a' : path.color;
      ctx.lineWidth = Math.max(1.5, path.width * box.w);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = path.eraser ? 'destination-out' : 'source-over';
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';

    // Crop mask + rule-of-thirds grid.
    if (tool === 'crop') {
      ctx.fillStyle = 'rgba(0,0,0,0.55)';
      ctx.fillRect(0, 0, size.w, box.y);
      ctx.fillRect(0, box.y + box.h, size.w, size.h - box.y - box.h);
      ctx.fillRect(0, box.y, box.x, box.h);
      ctx.fillRect(box.x + box.w, box.y, size.w - box.x - box.w, box.h);

      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = 1;
      ctx.setLineDash([5, 5]);
      ctx.strokeRect(box.x, box.y, box.w, box.h);
      ctx.setLineDash([]);
      for (let i = 1; i < 3; i++) {
        const gx = box.x + (box.w * i) / 3;
        const gy = box.y + (box.h * i) / 3;
        ctx.beginPath();
        ctx.moveTo(gx, box.y);
        ctx.lineTo(gx, box.y + box.h);
        ctx.moveTo(box.x, gy);
        ctx.lineTo(box.x + box.w, gy);
        ctx.stroke();
      }
    }
  }, [bitmap, state, view, tool, rot.w, rot.h, box, size.w, size.h, dpr, source.width, source.height]);

  const getBox = useCallback(
    () => cropBox(state.crop, rot.w, rot.h, view, size.w, size.h),
    [state.crop, rot.w, rot.h, view, size.w, size.h]
  );

  const onPointerDown = (e: React.PointerEvent) => {
    const px = e.clientX;
    const py = e.clientY;
    pointersRef.current.set(e.pointerId, { x: px, y: py });
    e.currentTarget.setPointerCapture(e.pointerId);

    const boxNow = getBox();
    const g = gestureRef.current;

    if (tool === 'text') {
      const target = e.target as HTMLElement;
      const overlayEl = target.closest('[data-overlay]');
      const handle = target.closest('[data-handle]')?.getAttribute('data-handle');
      const overlayId = overlayEl?.getAttribute('data-overlay') ?? null;

      if (overlayId) {
        const overlay = state.overlays.find((o) => o.id === overlayId);
        if (!overlay) return;
        onSelectOverlay(overlayId);
        const center = normToScreen(overlay.x, overlay.y, boxNow);
        // A second finger on the same overlay switches to a scale/rotate pinch.
        if (g && g.kind === 'textMove' && g.id === overlayId) {
          const [idA, idB] = [...pointersRef.current.keys()];
          const a = pointersRef.current.get(idA)!;
          const b = pointersRef.current.get(idB)!;
          const startDist = Math.hypot(b.x - a.x, b.y - a.y) || 1;
          const startAngle = angleDeg(b.x - a.x, b.y - a.y);
          gestureRef.current = {
            kind: 'textPinch',
            id: overlayId,
            start: { ...overlay },
            startDist,
            startAngle,
            center,
          };
          return;
        }
        if (handle === 'rotate') {
          beginGesture();
          gestureRef.current = {
            kind: 'textRotate',
            id: overlayId,
            start: { ...overlay },
            startAngle: angleDeg(px - center.x, py - center.y),
            center,
          };
          return;
        }
        if (handle === 'scale') {
          beginGesture();
          gestureRef.current = {
            kind: 'textScale',
            id: overlayId,
            start: { ...overlay },
            startDist: Math.hypot(px - center.x, py - center.y) || 1,
            center,
          };
          return;
        }
        beginGesture();
        gestureRef.current = { kind: 'textMove', id: overlayId, start: { ...overlay } };
        return;
      }

      // Empty area: pan / pinch (a tap adds text).
      if (g && g.kind === 'pan') {
        const [idA, idB] = [...pointersRef.current.keys()];
        const a = pointersRef.current.get(idA)!;
        const b = pointersRef.current.get(idB)!;
        gestureRef.current = {
          kind: 'pinch',
          startView: { ...view },
          startDist: Math.hypot(b.x - a.x, b.y - a.y) || 1,
          startMid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
        };
        return;
      }
      gestureRef.current = { kind: 'pan', startView: { ...view }, startX: px, startY: py };
      return;
    }

    if (tool === 'draw') {
      if (pointersRef.current.size === 1) {
        const p = screenToNorm(px, py, boxNow);
        beginGesture();
        const stroke: DrawingPath = {
          id: newId('stroke'),
          color: drawSettings.color,
          width: drawSettings.width,
          eraser: drawSettings.eraser,
          points: [p],
        };
        pendingStrokeRef.current = stroke;
        gestureRef.current = { kind: 'draw', stroke };
      }
      return;
    }

    if (tool === 'crop') {
      const mode = hitCropHandle(px, py, boxNow);
      if (mode) {
        beginGesture();
        gestureRef.current = { kind: 'cropResize', mode, startCrop: { ...state.crop } };
        return;
      }
      const inside =
        px >= boxNow.x - 1 && px <= boxNow.x + boxNow.w + 1 && py >= boxNow.y - 1 && py <= boxNow.y + boxNow.h + 1;
      if (inside) {
        beginGesture();
        gestureRef.current = { kind: 'cropMove', startCrop: { ...state.crop } };
        return;
      }
    }

    // Pan / pinch for every other tool and empty-area taps.
    if (g && g.kind === 'pan') {
      const [idA, idB] = [...pointersRef.current.keys()];
      const a = pointersRef.current.get(idA)!;
      const b = pointersRef.current.get(idB)!;
      gestureRef.current = {
        kind: 'pinch',
        startView: { ...view },
        startDist: Math.hypot(b.x - a.x, b.y - a.y) || 1,
        startMid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 },
      };
      return;
    }
    gestureRef.current = { kind: 'pan', startView: { ...view }, startX: px, startY: py };
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const last = pointersRef.current.get(e.pointerId);
    if (!last) return;
    const dx = e.clientX - last.x;
    const dy = e.clientY - last.y;
    pointersRef.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    const g = gestureRef.current;
    if (!g) return;

    switch (g.kind) {
      case 'pan': {
        const v = clampView(
          {
            ...g.startView,
            tx: g.startView.tx + (e.clientX - g.startX),
            ty: g.startView.ty + (e.clientY - g.startY),
          },
          state.crop,
          rot.w,
          rot.h,
          size.w,
          size.h
        );
        onViewChange(v);
        break;
      }
      case 'pinch': {
        const [idA, idB] = [...pointersRef.current.keys()];
        const a = pointersRef.current.get(idA)!;
        const b = pointersRef.current.get(idB)!;
        const dist = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
        const zoomed = zoomAt(g.startView, g.startMid.x, g.startMid.y, dist / g.startDist);
        const panned = {
          scale: zoomed.scale,
          tx: zoomed.tx + (mid.x - g.startMid.x),
          ty: zoomed.ty + (mid.y - g.startMid.y),
        };
        onViewChange(clampView(panned, state.crop, rot.w, rot.h, size.w, size.h));
        break;
      }
      case 'cropMove': {
        const nb = getBox();
        onCropChange(resizeCrop(g.startCrop, 'move', dx / nb.w, dy / nb.h, null));
        break;
      }
      case 'cropResize': {
        const nb = getBox();
        onCropChange(resizeCrop(g.startCrop, g.mode, dx / nb.w, dy / nb.h, normAspect));
        break;
      }
      case 'draw': {
        const nb = getBox();
        const p = screenToNorm(e.clientX, e.clientY, nb);
        const lastP = g.stroke.points[g.stroke.points.length - 1];
        if (Math.hypot(p.x - lastP.x, p.y - lastP.y) < 0.003) break;
        g.stroke.points.push(p);
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (ctx && bitmap) {
          redrawDraw(ctx);
        }
        break;
      }
      case 'textMove': {
        const nb = getBox();
        onOverlayPatch(g.id, {
          x: clamp(g.start.x + dx / nb.w, 0, 1),
          y: clamp(g.start.y + dy / nb.h, 0, 1),
        });
        break;
      }
      case 'textScale': {
        const d = Math.hypot(e.clientX - g.center.x, e.clientY - g.center.y);
        onOverlayPatch(g.id, { scale: clamp(g.start.scale * (d / g.startDist), TEXT_SCALE_MIN, TEXT_SCALE_MAX) });
        break;
      }
      case 'textRotate': {
        const a = angleDeg(e.clientX - g.center.x, e.clientY - g.center.y);
        onOverlayPatch(g.id, { rotation: normDeg(g.start.rotation + (a - g.startAngle)) });
        break;
      }
      case 'textPinch': {
        const [idA, idB] = [...pointersRef.current.keys()];
        const a = pointersRef.current.get(idA)!;
        const b = pointersRef.current.get(idB)!;
        const dist = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const ang = angleDeg(b.x - a.x, b.y - a.y);
        onOverlayPatch(g.id, {
          scale: clamp(g.start.scale * (dist / g.startDist), TEXT_SCALE_MIN, TEXT_SCALE_MAX),
          rotation: normDeg(g.start.rotation + (ang - g.startAngle)),
        });
        break;
      }
    }
  };

  const redrawDraw = (ctx: CanvasRenderingContext2D) => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, size.w, size.h);
    // Redraw full frame cheaply by clearing to bg + image + all strokes.
    ctx.fillStyle = 'rgba(0,0,0,0.9)';
    ctx.fillRect(0, 0, size.w, size.h);
    const aff = viewportAffine(
      state.transform.rotation,
      state.transform.flipX,
      state.transform.flipY,
      state.crop,
      rot.w,
      rot.h,
      view,
      size.w,
      size.h
    );
    if (bitmap) {
      ctx.setTransform(dpr * aff.a, dpr * aff.b, dpr * aff.c, dpr * aff.d, dpr * aff.e, dpr * aff.f);
      ctx.drawImage(bitmap, 0, 0, source.width, source.height, 0, 0, 1, 1);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const strokes = [...state.drawings];
    if (pendingStrokeRef.current) strokes.push(pendingStrokeRef.current);
    const b = getBox();
    for (const path of strokes) {
      if (path.points.length < 2) continue;
      ctx.beginPath();
      ctx.moveTo(b.x + path.points[0].x * b.w, b.y + path.points[0].y * b.h);
      for (let i = 1; i < path.points.length; i++) {
        ctx.lineTo(b.x + path.points[i].x * b.w, b.y + path.points[i].y * b.h);
      }
      ctx.strokeStyle = path.eraser ? '#0a0a0a' : path.color;
      ctx.lineWidth = Math.max(1.5, path.width * b.w);
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.globalCompositeOperation = path.eraser ? 'destination-out' : 'source-over';
      ctx.stroke();
    }
    ctx.globalCompositeOperation = 'source-over';
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const g = gestureRef.current;
    pointersRef.current.delete(e.pointerId);

    if (g?.kind === 'draw') {
      pendingStrokeRef.current = null;
      if (g.stroke.points.length > 1) onDrawingCommit(g.stroke);
      else commitGesture();
      gestureRef.current = null;
      return;
    }

    if (pointersRef.current.size === 0) {
      if (g?.kind === 'cropMove' || g?.kind === 'cropResize' || g?.kind === 'textMove' || g?.kind === 'textScale' || g?.kind === 'textRotate' || g?.kind === 'textPinch') {
        commitGesture();
      }
      // Tap-to-add-text detection in text tool on empty canvas.
      if (g?.kind === 'pan' && tool === 'text') {
        const moved = Math.hypot(e.clientX - g.startX, e.clientY - g.startY);
        if (moved < TAP_MOVE) {
          onOverlayAddAt(screenToNorm(e.clientX, e.clientY, getBox()));
        }
      }
      gestureRef.current = null;
    } else if (g?.kind === 'pinch') {
      // One finger left: continue as pan.
      const remaining = [...pointersRef.current.values()][0];
      gestureRef.current = { kind: 'pan', startView: { ...view }, startX: remaining.x, startY: remaining.y };
    }
  };

  const onPointerCancel = (e: React.PointerEvent) => {
    const g = gestureRef.current;
    pointersRef.current.delete(e.pointerId);
    if (g?.kind === 'draw') {
      pendingStrokeRef.current = null;
      commitGesture();
    }
    if (g && g.kind !== 'pan' && g.kind !== 'pinch') commitGesture();
    gestureRef.current = null;
  };

  // Wheel zoom on desktop.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const factor = Math.exp(-e.deltaY * 0.0015);
      const r = el.getBoundingClientRect();
      const anchorX = e.clientX - r.left;
      const anchorY = e.clientY - r.top;
      onViewChange(clampView(zoomAt(view, anchorX, anchorY, factor), state.crop, rot.w, rot.h, size.w, size.h));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [view, state.crop, rot.w, rot.h, size.w, size.h, onViewChange]);

  const selectedOverlay = state.overlays.find((o) => o.id === selectedOverlayId) ?? null;

  return (
    <div
      ref={containerRef}
      className="relative h-full w-full touch-none select-none overflow-hidden bg-black"
      style={{ touchAction: 'none' }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerCancel}
    >
      <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

      {/* Text overlays */}
      <div
        className="absolute inset-0"
        style={{ pointerEvents: tool === 'text' ? 'auto' : 'none' }}
      >
        {state.overlays.map((o) => {
          if (!o.text) return null;
          const p = normToScreen(o.x, o.y, box);
          return (
            <div
              key={o.id}
              data-overlay={o.id}
              className="absolute cursor-move"
              style={{
                left: p.x,
                top: p.y,
                transform: `translate(-50%, -50%) rotate(${o.rotation}deg) scale(${o.scale})`,
                transformOrigin: 'center center',
                pointerEvents: tool === 'text' ? 'auto' : 'none',
              }}
            >
              <div
                className="whitespace-pre-line"
                style={{
                  color: o.color,
                  fontSize: `${o.fontSize * box.w}px`,
                  lineHeight: 1.25,
                  textAlign: o.align,
                  fontWeight: o.bold ? 700 : 500,
                  background: o.background ?? 'transparent',
                  fontFamily: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
                }}
              >
                {o.text}
              </div>
            </div>
          );
        })}

        {/* Selection box */}
        {selectedOverlay && tool === 'text' && (
          <OverlaySelectionBox
            overlay={selectedOverlay}
            box={box}
          />
        )}
      </div>

      {/* Crop handles */}
      {tool === 'crop' && size.w > 0 && (
        <div className="pointer-events-none absolute inset-0">
          {CORNER_HANDLES.map((h) => (
            <div
              key={h.mode}
              data-handle={h.mode}
              className="pointer-events-auto absolute h-5 w-5 border-2 border-white bg-accent"
              style={{ left: box.x + h.x * box.w - 10, top: box.y + h.y * box.h - 10 }}
            />
          ))}
          {EDGE_HANDLES.map((h) => (
            <div
              key={h.mode}
              data-handle={h.mode}
              className="pointer-events-auto absolute h-3.5 w-3.5 rounded-full border-2 border-white bg-accent"
              style={{ left: box.x + h.x * box.w - 7, top: box.y + h.y * box.h - 7 }}
            />
          ))}
        </div>
      )}

      {!bitmap && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-white/20 border-t-white" />
        </div>
      )}
    </div>
  );
}

interface OverlaySelectionBoxProps {
  overlay: TextOverlay;
  box: Rect;
}

function OverlaySelectionBox({ overlay, box }: OverlaySelectionBoxProps) {
  const [measured, setMeasured] = useState<{ w: number; h: number } | null>(null);
  const innerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      setMeasured({ w: el.offsetWidth, h: el.offsetHeight });
    });
    ro.observe(el);
    const id = window.setTimeout(() => {
      setMeasured({ w: el.offsetWidth, h: el.offsetHeight });
    }, 0);
    return () => {
      window.clearTimeout(id);
      ro.disconnect();
    };
  }, [overlay.text, overlay.fontSize, overlay.scale, overlay.bold, overlay.background, overlay.align]);

  const p = normToScreen(overlay.x, overlay.y, box);
  const w = measured?.w ?? 80;
  const h = measured?.h ?? 24;
  const handleR = 8;

  return (
    <div
      className="absolute"
      style={{
        left: p.x,
        top: p.y,
        transform: `translate(-50%, -50%) rotate(${overlay.rotation}deg) scale(${overlay.scale})`,
        transformOrigin: 'center center',
        width: w,
        height: h,
        pointerEvents: 'none',
      }}
    >
      {/* invisible measuring copy so the selection box tracks the text size */}
      <div
        ref={innerRef}
        className="invisible absolute inset-0 whitespace-pre-line"
        style={{
          fontSize: `${overlay.fontSize * box.w}px`,
          lineHeight: 1.25,
          textAlign: overlay.align,
          fontWeight: overlay.bold ? 700 : 500,
          background: overlay.background ?? 'transparent',
        }}
      >
        {overlay.text}
      </div>
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          border: '1.5px solid rgba(255,255,255,0.9)',
          boxShadow: '0 0 0 1px rgba(0,0,0,0.35)',
        }}
      />
      {/* Rotate handle */}
      <div
        data-handle="rotate"
        data-overlay={overlay.id}
        className="pointer-events-auto absolute left-1/2 h-4 w-4 -translate-x-1/2 cursor-grab rounded-full border-2 border-white bg-accent"
        style={{ top: -28 }}
      />
      {/* Corner scale handles */}
      {CORNER_HANDLES.map((c) => (
        <div
          key={c.mode}
          data-handle="scale"
          data-overlay={overlay.id}
          className="pointer-events-auto absolute cursor-nwse-resize rounded-full border-2 border-white bg-accent"
          style={{
            width: handleR * 2,
            height: handleR * 2,
            left: c.x === 0 ? -handleR : w - handleR,
            top: c.y === 0 ? -handleR : h - handleR,
          }}
        />
      ))}
    </div>
  );
}
