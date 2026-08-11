'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';
import type {
  DrawingPath,
  EditorResult,
  EditorSource,
  EditorTool,
  FilterState,
  ImageEditorState,
  TextOverlay,
  ViewState,
} from '../../lib/editor/types';
import {
  createInitialEditorState,
  cloneState,
  addOverlay,
  removeOverlay,
  resetAdjustments,
  resetCrop,
  resetFilter,
  resetTransform,
  rotateBy,
  flipAxis,
  setCropAspect,
  setFilter,
  updateAdjustment,
  updateCrop,
  updateFilterIntensity,
  updateOverlay,
  newId,
} from '../../lib/editor/state';
import { fitView } from '../../lib/editor/geometry';
import { createPreviewBitmap, loadImage } from '../../lib/editor/load';
import { applyColorPipeline, isAdjustmentNeutral, isFilterNeutral } from '../../lib/editor/filters';
import { exportEditedImage } from '../../lib/editor/export';
import { History } from '../../lib/editor/history';
import { EditorCanvas, type DrawSettings } from './EditorCanvas';
import {
  AdjustPanel,
  CropPanel,
  DrawBar,
  FilterPanel,
  TextPanel,
  TransformPanel,
} from './EditorPanels';

interface SoBImageEditorProps {
  source: EditorSource | null;
  onClose: () => void;
  onDone: (result: EditorResult) => void;
}

const TOOLS: Array<{ id: EditorTool; label: string }> = [
  { id: 'crop', label: 'Crop' },
  { id: 'transform', label: 'Rotate' },
  { id: 'text', label: 'Text' },
  { id: 'draw', label: 'Draw' },
  { id: 'adjust', label: 'Adjust' },
  { id: 'filter', label: 'Filter' },
];

function sourcePixelSize(src: CanvasImageSource): { w: number; h: number } {
  if ('naturalWidth' in src) {
    const img = src as HTMLImageElement;
    return { w: img.naturalWidth, h: img.naturalHeight };
  }
  const c = src as HTMLCanvasElement;
  return { w: c.width, h: c.height };
}

/** Applies adjustments + filter to a fresh canvas in chunks (yields between rows). */
async function computeColorCanvas(
  base: CanvasImageSource,
  adjustments: ImageEditorState['adjustments'],
  filter: FilterState,
  isStale: () => boolean
): Promise<HTMLCanvasElement | null> {
  const { w, h } = sourcePixelSize(base);
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, w);
  canvas.height = Math.max(1, h);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.drawImage(base, 0, 0);
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;
  const CHUNK = Math.max(1, Math.round(h / 40));
  for (let y = 0; y < h; y += CHUNK) {
    if (isStale()) return null;
    const subH = Math.min(CHUNK, h - y);
    applyColorPipeline(
      data.subarray(y * w * 4, (y + subH) * w * 4) as Uint8ClampedArray,
      w,
      subH,
      adjustments,
      filter.id,
      filter.intensity
    );
    if (y + subH < h) await new Promise((r) => setTimeout(r, 0));
  }
  if (isStale()) return null;
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

/** Debounced, cancellable color-processed preview bitmap. */
function useColorPreview(
  base: CanvasImageSource | null,
  adjustments: ImageEditorState['adjustments'],
  filter: FilterState
): CanvasImageSource | null {
  const [processed, setProcessed] = useState<CanvasImageSource | null>(null);
  const genRef = useRef(0);
  const neutral = isAdjustmentNeutral(adjustments) && isFilterNeutral(filter.id, filter.intensity);

  useEffect(() => {
    genRef.current += 1;
    const gen = genRef.current;
    const timer = setTimeout(() => {
      if (neutral || !base) {
        if (gen === genRef.current) setProcessed(null);
        return;
      }
      computeColorCanvas(base, adjustments, filter, () => genRef.current !== gen).then((c) => {
        if (gen === genRef.current) setProcessed(c);
      });
    }, neutral || !base ? 0 : 90);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base, neutral, adjustments.brightness, adjustments.contrast, adjustments.saturation, adjustments.sharpness, filter.id, filter.intensity]);

  return processed;
}

export function SoBImageEditor({ source, onClose, onDone }: SoBImageEditorProps) {
  const [state, setState] = useState<ImageEditorState>(() =>
    source ? createInitialEditorState(source) : createInitialEditorState({ uri: '', width: 1, height: 1, mimeType: 'image/jpeg', name: 'image', hasAlpha: false })
  );
  const stateRef = useRef(state);

  // Keep the ref in sync AFTER commit so gesture handlers read the latest state.
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const [view, setView] = useState<ViewState>(() => fitView());
  const [tool, setTool] = useState<EditorTool>('crop');
  const [selectedOverlayId, setSelectedOverlayId] = useState<string | null>(null);
  const [drawSettings, setDrawSettings] = useState<DrawSettings>({ color: '#FFFFFF', width: 0.02, eraser: false });
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState(0);

  const [baseBitmap, setBaseBitmap] = useState<CanvasImageSource | null>(null);
  const fullResRef = useRef<HTMLImageElement | null>(null);

  // Load preview + full-res source once.
  useEffect(() => {
    if (!source) return;
    let cancelled = false;
    createPreviewBitmap(source.uri).then((b) => {
      if (!cancelled) setBaseBitmap(b);
    });
    loadImage(source.uri).then((img) => {
      if (!cancelled) fullResRef.current = img;
    });
    return () => {
      cancelled = true;
    };
  }, [source]);

  // NOTE: The object URL lifecycle is owned by the parent (create/page.tsx),
  // which calls releaseSource in handleEditDone and handleEditClose.
  // The editor must NOT also release it — doing so would double-revoke the URL
  // and break the preview of the image the user just edited.

  const colorBitmap = useColorPreview(baseBitmap, state.adjustments, state.filter);
  const bitmap = colorBitmap ?? baseBitmap;

  /* ---------- history ---------- */
  // The History instance is stable and mutated in place; a version counter
  // re-renders the undo/redo buttons after each push/undo/redo.
  const [history] = useState<History<ImageEditorState>>(() => new History<ImageEditorState>(cloneState(state), 60));
  const [, setHistoryVersion] = useState(0);
  const pendingRef = useRef<ImageEditorState | null>(null);

  const beginGesture = useCallback(() => {
    if (!pendingRef.current) pendingRef.current = cloneState(stateRef.current);
  }, []);

  const commitGesture = useCallback(() => {
    if (pendingRef.current) {
      history.push(pendingRef.current);
      pendingRef.current = null;
      setHistoryVersion((v) => v + 1);
    }
  }, [history]);

  const apply = useCallback((next: ImageEditorState) => {
    setState(next);
  }, []);

  const commitOp = useCallback(
    (mutator: (s: ImageEditorState) => ImageEditorState) => {
      beginGesture();
      apply(mutator(stateRef.current));
      commitGesture();
    },
    [beginGesture, apply, commitGesture]
  );

  const undo = useCallback(() => {
    const prev = history.undo();
    if (prev) {
      setState(prev);
      setHistoryVersion((v) => v + 1);
    }
  }, [history]);

  const redo = useCallback(() => {
    const next = history.redo();
    if (next) {
      setState(next);
      setHistoryVersion((v) => v + 1);
    }
  }, [history]);

  /* ---------- tool handlers ---------- */

  const handleCropChange = useCallback((crop: ImageEditorState['crop']) => {
    apply(updateCrop(stateRef.current, crop));
  }, [apply]);

  const handleRotate = useCallback(
    (delta: 90 | -90) => {
      commitOp((s) => rotateBy(s, delta));
      setSelectedOverlayId(null);
      setView(fitView());
    },
    [commitOp]
  );

  const handleFlip = useCallback(
    (axis: 'x' | 'y') => commitOp((s) => flipAxis(s, axis)),
    [commitOp]
  );

  const handleAspect = useCallback((key: ImageEditorState['cropAspect']) => commitOp((s) => setCropAspect(s, key)), [commitOp]);

  const handleUpdateAdjustment = useCallback(
    (key: keyof ImageEditorState['adjustments'], value: number) => {
      beginGesture();
      apply(updateAdjustment(stateRef.current, key, value));
    },
    [beginGesture, apply]
  );
  const commitAdjustments = useCallback(() => commitGesture(), [commitGesture]);

  const handleSelectFilter = useCallback(
    (id: string) => {
      if (stateRef.current.filter.id === id) return;
      commitOp((s) => setFilter(s, id));
    },
    [commitOp]
  );
  const handleFilterIntensity = useCallback(
    (v: number) => {
      beginGesture();
      apply(updateFilterIntensity(stateRef.current, v));
    },
    [beginGesture, apply]
  );

  const handleOverlayAdd = useCallback(() => {
    const o: TextOverlay = {
      id: newId('text'),
      text: 'Text',
      x: 0.5,
      y: 0.5,
      scale: 1,
      rotation: 0,
      fontSize: 0.08,
      color: '#FFFFFF',
      align: 'center',
      background: null,
      bold: false,
    };
    commitOp((s) => addOverlay(s, o));
    setSelectedOverlayId(o.id);
  }, [commitOp]);

  const handleOverlayAddAt = useCallback(
    (point: { x: number; y: number }) => {
      const o: TextOverlay = {
        id: newId('text'),
        text: 'Text',
        x: point.x,
        y: point.y,
        scale: 1,
        rotation: 0,
        fontSize: 0.08,
        color: '#FFFFFF',
        align: 'center',
        background: null,
        bold: false,
      };
      commitOp((s) => addOverlay(s, o));
      setSelectedOverlayId(o.id);
    },
    [commitOp]
  );

  const handleOverlayPatch = useCallback(
    (id: string, patch: Partial<TextOverlay>) => {
      beginGesture();
      apply(updateOverlay(stateRef.current, id, patch));
    },
    [beginGesture, apply]
  );
  const commitOverlay = useCallback(() => commitGesture(), [commitGesture]);

  const handleOverlayDelete = useCallback(() => {
    if (!selectedOverlayId) return;
    commitOp((s) => removeOverlay(s, selectedOverlayId));
    setSelectedOverlayId(null);
  }, [commitOp, selectedOverlayId]);

  const handleDrawingCommit = useCallback(
    (path: DrawingPath) => {
      apply({
        ...stateRef.current,
        drawings: [...stateRef.current.drawings, path],
      });
      commitGesture();
    },
    [apply, commitGesture]
  );

  /* ---------- export ---------- */

  const handleDone = useCallback(async () => {
    if (!source || exporting) return;
    const img = fullResRef.current ?? (await loadImage(source.uri));
    setExporting(true);
    setProgress(0);
    try {
      const out = await exportEditedImage(stateRef.current, img, { onProgress: setProgress });
      const result: EditorResult = {
        file: out.file,
        width: out.width,
        height: out.height,
        mimeType: out.mimeType,
        editorState: stateRef.current,
      };
      onDone(result);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not export the image.');
    } finally {
      setExporting(false);
    }
  }, [source, exporting, onDone]);

  const canUndo = history.canUndo();
  const canRedo = history.canRedo();

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      {/* Header */}
      <header className="z-10 flex h-14 shrink-0 items-center justify-between px-3 text-white">
        <button
          onClick={onClose}
          className="rounded-xl px-3 py-2 text-sm font-medium text-white/80 hover:bg-white/10"
        >
          Cancel
        </button>
        <div className="flex items-center gap-1">
          <button
            onClick={undo}
            disabled={!canUndo}
            aria-label="Undo"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-lg text-white/80 hover:bg-white/10 disabled:opacity-30"
          >
            ↶
          </button>
          <button
            onClick={redo}
            disabled={!canRedo}
            aria-label="Redo"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-lg text-white/80 hover:bg-white/10 disabled:opacity-30"
          >
            ↷
          </button>
        </div>
        <button
          onClick={handleDone}
          disabled={exporting || !source}
          className="rounded-xl bg-accent px-5 py-2 text-sm font-semibold text-white hover:bg-accent/90 disabled:opacity-50"
        >
          {exporting ? `${Math.round(progress * 100)}%` : 'Done'}
        </button>
      </header>

      {/* Canvas */}
      <div className="relative min-h-0 flex-1">
        <EditorCanvas
          source={state.source}
          bitmap={bitmap}
          state={state}
          view={view}
          onViewChange={setView}
          tool={tool}
          selectedOverlayId={selectedOverlayId}
          onSelectOverlay={setSelectedOverlayId}
          drawSettings={drawSettings}
          beginGesture={beginGesture}
          commitGesture={commitGesture}
          onCropChange={handleCropChange}
          onOverlayAddAt={handleOverlayAddAt}
          onOverlayPatch={handleOverlayPatch}
          onDrawingCommit={handleDrawingCommit}
        />

        {exporting && (
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center gap-4 bg-black/70 text-white">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
            <p className="text-sm text-white/80">Rendering… {Math.round(progress * 100)}%</p>
          </div>
        )}
      </div>

      {/* Tool options */}
      <div className="z-10 shrink-0 border-t border-white/10 bg-card text-foreground">
        {tool === 'adjust' && (
          <AdjustPanel
            adjustments={state.adjustments}
            onUpdate={handleUpdateAdjustment}
            onCommit={commitAdjustments}
            onReset={() => commitOp(resetAdjustments)}
          />
        )}
        {tool === 'filter' && (
          <FilterPanel
            filter={state.filter}
            onSelect={handleSelectFilter}
            onIntensity={handleFilterIntensity}
            onCommit={commitAdjustments}
            onReset={() => commitOp(resetFilter)}
          />
        )}
        {tool === 'crop' && <CropPanel cropAspect={state.cropAspect} onAspect={handleAspect} onReset={() => commitOp(resetCrop)} />}
        {tool === 'transform' && (
          <TransformPanel transform={state.transform} onRotate={handleRotate} onFlip={handleFlip} onReset={() => { commitOp(resetTransform); setView(fitView()); }} />
        )}
        {tool === 'text' && (
          <TextPanel
            overlay={state.overlays.find((o) => o.id === selectedOverlayId) ?? null}
            onAdd={handleOverlayAdd}
            onPatch={(patch) => selectedOverlayId && handleOverlayPatch(selectedOverlayId, patch)}
            onCommit={commitOverlay}
            onDelete={handleOverlayDelete}
          />
        )}
        {tool === 'draw' && (
          <DrawBar settings={drawSettings} onChange={(p) => setDrawSettings((s) => ({ ...s, ...p }))} />
        )}
      </div>

      {/* Tool tab bar */}
      <nav
        className={cn('z-10 flex shrink-0 items-center justify-around border-t border-white/10 bg-card px-2 pb-[max(env(safe-area-inset-bottom,0px),8px)] pt-2')}
        style={{ paddingBottom: 'max(env(safe-area-inset-bottom, 0px), 8px)' }}
      >
        {TOOLS.map((t) => (
          <button
            key={t.id}
            onClick={() => {
              setTool(t.id);
              if (t.id !== 'text') setSelectedOverlayId(null);
            }}
            className={cn(
              'flex flex-col items-center gap-0.5 rounded-xl px-3 py-1.5 text-[11px] font-medium transition-colors',
              tool === t.id ? 'text-accent' : 'text-muted-foreground hover:text-foreground'
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>
    </div>
  );
}
