'use client';

import { cn } from '../../lib/utils';
import type {
  AdjustmentsState,
  CropAspectKey,
  FilterState,
  SoBFilter,
  TextOverlay,
  TransformState,
} from '../../lib/editor/types';
import { aspectLabel } from '../../lib/editor/geometry';
import { ORIGINAL_FILTER_ID, SOB_FILTERS } from '../../lib/editor/filters';
import { EditorSlider } from './EditorSlider';

const CROP_ASPECTS: CropAspectKey[] = ['free', 'original', '1:1', '4:5', '16:9', '9:16'];

const TEXT_COLORS = ['#FFFFFF', '#000000', '#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#A855F7', '#EC4899'];
const DRAW_COLORS = ['#FFFFFF', '#000000', '#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#A855F7', '#EC4899'];
const TEXT_BG = ['#FFFFFF', '#000000'];

const ADJUST_SLIDERS: Array<{
  key: keyof AdjustmentsState;
  label: string;
  min: number;
  max: number;
  format: (v: number) => string;
}> = [
  { key: 'brightness', label: 'Brightness', min: -1, max: 1, format: (v) => `${Math.round(v * 100)}` },
  { key: 'contrast', label: 'Contrast', min: -1, max: 1, format: (v) => `${Math.round(v * 100)}` },
  { key: 'saturation', label: 'Saturation', min: -1, max: 1, format: (v) => `${Math.round(v * 100)}` },
  { key: 'sharpness', label: 'Sharpness', min: 0, max: 1, format: (v) => `${Math.round(v * 100)}` },
];

function PanelHeader({ title, onReset }: { title: string; onReset?: () => void }) {  return (
    <div className="flex items-center justify-between px-4 pt-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</span>
      {onReset && (
        <button
          onClick={onReset}
          className="text-xs font-medium text-accent hover:text-accent/80"
        >
          Reset
        </button>
      )}
    </div>
  );
}

/* ---------------- Adjust ---------------- */

export function AdjustPanel({
  adjustments,
  onUpdate,
  onCommit,
  onReset,
}: {
  adjustments: AdjustmentsState;
  onUpdate: (key: keyof AdjustmentsState, v: number) => void;
  onCommit: () => void;
  onReset: () => void;
}) {
  return (
    <div>
      <PanelHeader title="Adjust" onReset={onReset} />
      <div className="flex gap-4 overflow-x-auto px-2 pb-2">
        {ADJUST_SLIDERS.map((s) => (
          <div key={s.key} className="w-[180px] shrink-0">
            <EditorSlider
              label={s.label}
              value={adjustments[s.key]}
              min={s.min}
              max={s.max}
              step={0.01}
              format={s.format}
              onValueChange={(v) => onUpdate(s.key, v)}
              onCommit={onCommit}
            />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Filter ---------------- */

export function FilterPanel({
  filter,
  onSelect,
  onIntensity,
  onCommit,
  onReset,
}: {
  filter: FilterState;
  onSelect: (id: string) => void;
  onIntensity: (v: number) => void;
  onCommit: () => void;
  onReset: () => void;
}) {
  return (
    <div>
      <PanelHeader title="Filter" onReset={onReset} />
      <div className="flex gap-2 overflow-x-auto px-4 py-2">
        {SOB_FILTERS.map((f: SoBFilter) => (
          <button
            key={f.id}
            onClick={() => onSelect(f.id)}
            className={cn(
              'shrink-0 rounded-full border px-4 py-1.5 text-xs font-medium transition-colors',
              filter.id === f.id
                ? 'border-accent bg-accent text-white'
                : 'border-border bg-background text-muted-foreground hover:text-foreground'
            )}
          >
            {f.name}
          </button>
        ))}
      </div>
      {filter.id !== ORIGINAL_FILTER_ID && (
        <EditorSlider
          label="Intensity"
          value={filter.intensity}
          min={0}
          max={1}
          step={0.01}
          format={(v) => `${Math.round(v * 100)}%`}
          onValueChange={onIntensity}
          onCommit={onCommit}
        />
      )}
    </div>
  );
}

/* ---------------- Transform ---------------- */

export function TransformPanel({
  transform,
  onRotate,
  onFlip,
  onReset,
}: {
  transform: TransformState;
  onRotate: (delta: 90 | -90) => void;
  onFlip: (axis: 'x' | 'y') => void;
  onReset: () => void;
}) {
  const btn =
    'flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-background text-muted-foreground transition-colors hover:text-foreground active:scale-95';
  return (
    <div className="flex items-center gap-3 overflow-x-auto px-4 py-2">
      <button className={btn} onClick={() => onRotate(-90)} aria-label="Rotate left">
        <span className="text-base">↺</span>
      </button>
      <button className={btn} onClick={() => onRotate(90)} aria-label="Rotate right">
        <span className="text-base">↻</span>
      </button>
      <button className={btn} onClick={() => onFlip('x')} aria-label="Flip horizontal">
        <span className="text-base">⇋</span>
      </button>
      <button className={btn} onClick={() => onFlip('y')} aria-label="Flip vertical">
        <span className="text-base">⇅</span>
      </button>
      <button onClick={onReset} className="ml-auto text-xs font-medium text-accent hover:text-accent/80">
        Reset
      </button>
      <span className="sr-only">{`Rotation ${transform.rotation}°`}</span>
    </div>
  );
}

/* ---------------- Crop ---------------- */

export function CropPanel({
  cropAspect,
  onAspect,
  onReset,
}: {
  cropAspect: CropAspectKey;
  onAspect: (key: CropAspectKey) => void;
  onReset: () => void;
}) {
  return (
    <div>
      <PanelHeader title="Crop" onReset={onReset} />
      <div className="flex gap-2 overflow-x-auto px-4 py-2">
        {CROP_ASPECTS.map((key) => (
          <button
            key={key}
            onClick={() => onAspect(key)}
            className={cn(
              'shrink-0 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors',
              cropAspect === key
                ? 'border-accent bg-accent text-white'
                : 'border-border bg-background text-muted-foreground hover:text-foreground'
            )}
          >
            {aspectLabel(key)}
          </button>
        ))}
      </div>
    </div>
  );
}

/* ---------------- Text ---------------- */

export function TextPanel({
  overlay,
  onAdd,
  onPatch,
  onCommit,
  onDelete,
}: {
  overlay: TextOverlay | null;
  onAdd: () => void;
  onPatch: (patch: Partial<TextOverlay>) => void;
  onCommit: () => void;
  onDelete: () => void;
}) {
  if (!overlay) {
    return (
      <div className="flex items-center gap-3 px-4 py-2">
        <button
          onClick={onAdd}
          className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90"
        >
          Add text
        </button>
        <span className="text-xs text-muted-foreground">Tap the image to place text</span>
      </div>
    );
  }
  const swatch = 'h-6 w-6 rounded-full border border-white/20 transition-transform hover:scale-110';
  return (
    <div className="flex flex-col gap-2 px-4 py-2">
      <textarea
        aria-label="Text"
        value={overlay.text}
        rows={1}
        onChange={(e) => onPatch({ text: e.target.value })}
        onBlur={onCommit}
        placeholder="Type something…"
        className="w-full resize-none rounded-xl border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-accent"
        style={{ minHeight: 38 }}
      />
      <div className="flex items-center gap-2 overflow-x-auto">
        {TEXT_COLORS.map((c) => (
          <button
            key={c}
            aria-label={`Text color ${c}`}
            onClick={() => onPatch({ color: c })}
            className={cn(swatch, overlay.color === c && 'ring-2 ring-accent ring-offset-2 ring-offset-background')}
            style={{ background: c }}
          />
        ))}
        <span className="mx-1 h-5 w-px shrink-0 bg-border" />
        {TEXT_BG.map((c) => (
          <button
            key={c}
            aria-label={`Background ${c}`}
            onClick={() => onPatch({ background: overlay.background === c ? null : c })}
            className={cn(
              'shrink-0 rounded-md border border-border px-2 py-1 text-[10px] font-semibold',
              overlay.background === c ? 'text-foreground' : 'text-muted-foreground'
            )}
            style={overlay.background === c ? { background: c } : undefined}
          >
            BG
          </button>
        ))}
        <span className="mx-1 h-5 w-px shrink-0 bg-border" />
        <button
          onClick={() => onPatch({ bold: !overlay.bold })}
          className={cn(
            'shrink-0 rounded-md border border-border px-2 py-1 text-xs font-bold',
            overlay.bold ? 'bg-accent text-white' : 'text-muted-foreground'
          )}
        >
          B
        </button>
        {(['left', 'center', 'right'] as const).map((a) => (
          <button
            key={a}
            onClick={() => onPatch({ align: a })}
            className={cn(
              'shrink-0 rounded-md border border-border px-2 py-1 text-[10px]',
              overlay.align === a ? 'bg-accent text-white' : 'text-muted-foreground'
            )}
          >
            {a === 'left' ? '⧉' : a === 'center' ? '☰' : '⧉'}
          </button>
        ))}
        <span className="mx-1 h-5 w-px shrink-0 bg-border" />
        <button
          onClick={onDelete}
          className="shrink-0 rounded-md border border-destructive/40 px-2 py-1 text-xs font-medium text-destructive hover:bg-destructive/10"
        >
          Delete
        </button>
      </div>
      <EditorSlider
        label="Size"
        value={overlay.fontSize}
        min={0.04}
        max={0.3}
        step={0.005}
        format={(v) => `${Math.round(v * 100)}%`}
        onValueChange={(v) => onPatch({ fontSize: v })}
        onCommit={onCommit}
      />
    </div>
  );
}

/* ---------------- Draw ---------------- */

export interface DrawSettingsUI {
  color: string;
  width: number;
  eraser: boolean;
}

export function DrawBar({
  settings,
  onChange,
}: {
  settings: DrawSettingsUI;
  onChange: (patch: Partial<DrawSettingsUI>) => void;
}) {
  const swatch = 'h-7 w-7 rounded-full border border-white/20 transition-transform hover:scale-110';
  return (
    <div className="flex items-center gap-2 overflow-x-auto px-4 py-2">
      <button
        aria-label="Eraser"
        onClick={() => onChange({ eraser: !settings.eraser })}
        className={cn(
          'shrink-0 rounded-xl border px-3 py-1.5 text-xs font-medium',
          settings.eraser ? 'border-accent bg-accent text-white' : 'border-border text-muted-foreground'
        )}
      >
        Eraser
      </button>
      {DRAW_COLORS.map((c) => (
        <button
          key={c}
          aria-label={`Draw color ${c}`}
          onClick={() => onChange({ color: c, eraser: false })}
          className={cn(
            swatch,
            settings.color === c && !settings.eraser && 'ring-2 ring-accent ring-offset-2 ring-offset-background'
          )}
          style={{ background: c }}
        />
      ))}
      <div className="w-36 shrink-0">
        <EditorSlider
          label="Size"
          value={settings.width}
          min={0.005}
          max={0.06}
          step={0.001}
          format={(v) => `${Math.round(v * 100)}`}
          onValueChange={(v) => onChange({ width: v })}
          onCommit={() => undefined}
        />
      </div>
    </div>
  );
}
