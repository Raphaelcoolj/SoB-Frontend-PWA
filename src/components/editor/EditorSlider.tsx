'use client';

import { cn } from '../../lib/utils';

interface EditorSliderProps {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  format?: (v: number) => string;
  onValueChange: (v: number) => void;
  onCommit?: () => void;
  className?: string;
}

/**
 * SoB-styled range slider used by the adjust / filter / draw panels. `onCommit`
 * fires when the user releases the thumb, which the shell uses to snapshot the
 * pre-change state into the undo history.
 */
export function EditorSlider({
  label,
  value,
  min,
  max,
  step = 0.01,
  format,
  onValueChange,
  onCommit,
  className,
}: EditorSliderProps) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className={cn('flex items-center gap-3 px-4 py-3', className)}>
      <span className="w-16 shrink-0 text-xs font-medium text-muted-foreground">{label}</span>
      <input
        type="range"
        aria-label={label}
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onValueChange(Number(e.target.value))}
        onPointerUp={onCommit}
        onKeyUp={onCommit}
        className="editor-range h-6 flex-1 cursor-pointer appearance-none rounded-full outline-none"
        style={{
          background: `linear-gradient(to right, var(--color-accent, #F97316) ${pct}%, var(--color-border, #3F3F46) ${pct}%)`,
        }}
      />
      <span className="w-10 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
        {format ? format(value) : value.toFixed(2)}
      </span>
    </div>
  );
}
