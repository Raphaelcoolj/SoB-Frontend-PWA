/**
 * @file types.ts
 * @description Strongly typed editor model for the SoB Image Editor. All
 * geometry is stored in resolution-independent (normalized) coordinates so
 * the same state can be previewed at any zoom level and exported at the
 * source resolution without reinterpretation.
 *
 * These types are intentionally pure (no DOM / RN dependencies) so the model
 * can be shared conceptually between the SoB PWA (Next.js) and the native
 * React Native app.
 */

/** Editing tools available from the SoB Image Editor toolbar. */
export type EditorTool = 'crop' | 'transform' | 'text' | 'draw' | 'adjust' | 'filter';

/** Crop aspect-ratio presets. `free` allows any aspect; `original` locks to the source. */
export type CropAspectKey = 'free' | 'original' | '1:1' | '4:5' | '16:9' | '9:16';

/** An axis-aligned rectangle expressed in normalized [0..1] coordinates. */
export interface NormalizedRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

/** Basic color adjustments. All values are neutral at 0 (sharpness neutral at 0). */
export interface AdjustmentsState {
  /** -1 (darker) .. 1 (brighter), 0 = neutral */
  brightness: number;
  /** -1 .. 1, 0 = neutral */
  contrast: number;
  /** -1 (grayscale) .. 1 (oversaturated), 0 = neutral */
  saturation: number;
  /** 0 (none) .. 1 (heavy), 0 = neutral */
  sharpness: number;
}

/** Active SoB filter. `id: 'original'` means no filter. */
export interface FilterState {
  id: string;
  /** 0..1 blend amount of the filter over the adjusted image. */
  intensity: number;
}

/** Rotation / flip applied to the source before cropping. */
export interface TransformState {
  rotation: 0 | 90 | 180 | 270;
  flipX: boolean;
  flipY: boolean;
}

/** Viewport navigation (zoom + pan) used only for previewing. Not part of the
 *  committed editor state; the exported image always renders the full crop. */
export interface ViewState {
  scale: number;
  tx: number;
  ty: number;
}

/**
 * A text overlay. `x`/`y` are normalized to the crop rect (0..1 from its
 * top-left corner) and anchor the CENTER of the text block. `fontSize` is a
 * fraction of the crop width (0.08 ≈ 8% of the crop width) so text scales
 * with the output at export time.
 */
export interface TextOverlay {
  id: string;
  text: string;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  fontSize: number;
  color: string;
  align: 'left' | 'center' | 'right';
  background: string | null;
  bold: boolean;
}

/** A single point of a drawing stroke, normalized to the crop rect. */
export interface DrawingPoint {
  x: number;
  y: number;
}

/** A freehand stroke. `width` is a fraction of the crop width (0.01 ≈ 1%). */
export interface DrawingPath {
  id: string;
  color: string;
  width: number;
  eraser: boolean;
  points: DrawingPoint[];
}

/** Minimal description of the source image loaded into the editor. */
export interface EditorSource {
  /** Object URL (web) / file URI (native) — never base64. */
  uri: string;
  /** Pixel dimensions AFTER EXIF orientation is applied. */
  width: number;
  height: number;
  mimeType: string;
  /** Original display name (without path). */
  name: string;
  /** Whether the source is known to carry transparency (PNG/WebP). */
  hasAlpha: boolean;
}

/** The complete, serializable editor state. */
export interface ImageEditorState {
  source: EditorSource;
  crop: NormalizedRect;
  cropAspect: CropAspectKey;
  transform: TransformState;
  adjustments: AdjustmentsState;
  filter: FilterState;
  overlays: TextOverlay[];
  drawings: DrawingPath[];
}

/** Filter metadata for the SoB filter picker. */
export interface SoBFilter {
  id: string;
  name: string;
  /** Short, screen-reader friendly description. */
  description: string;
}

/** Preset metadata for the crop aspect picker. */
export interface CropAspectPreset {
  key: CropAspectKey;
  label: string;
  /** Aspect ratio (width/height) or null for free/original-derived. */
  ratio: number | null;
}

/** Result handed back to the caller when the user presses Done. */
export interface EditorResult {
  file: File;
  width: number;
  height: number;
  mimeType: string;
  editorState: ImageEditorState;
}
