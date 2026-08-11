/**
 * @file state.ts
 * @description Factory + state operations for the SoB Image Editor. These
 * helpers keep the editor state immutable and produce new snapshots for the
 * undo/redo history.
 */

import type {
  CropAspectKey,
  EditorSource,
  ImageEditorState,
  NormalizedRect,
  TextOverlay,
} from './types';
import { applyAspect, cropAspectValue } from './geometry';
import { ORIGINAL_FILTER_ID } from './filters';

export const FULL_CROP: NormalizedRect = { x: 0, y: 0, width: 1, height: 1 };

export function createInitialEditorState(source: EditorSource): ImageEditorState {
  return {
    source,
    crop: { ...FULL_CROP },
    cropAspect: 'free',
    transform: { rotation: 0, flipX: false, flipY: false },
    adjustments: { brightness: 0, contrast: 0, saturation: 0, sharpness: 0 },
    filter: { id: ORIGINAL_FILTER_ID, intensity: 1 },
    overlays: [],
    drawings: [],
  };
}

/**
 * Deep-clones an editor state so history snapshots never alias the live
 * state. The source object is intentionally shared (it only holds a URI + dims
 * and never changes during a session).
 */
export function cloneState(s: ImageEditorState): ImageEditorState {
  return {
    source: { ...s.source },
    crop: { ...s.crop },
    cropAspect: s.cropAspect,
    transform: { ...s.transform },
    adjustments: { ...s.adjustments },
    filter: { ...s.filter },
    overlays: s.overlays.map((o) => ({ ...o })),
    drawings: s.drawings.map((d) => ({ ...d, points: d.points.map((p) => ({ ...p })) })),
  };
}

export function resetCrop(s: ImageEditorState): ImageEditorState {
  return {
    ...s,
    cropAspect: 'free',
    crop: { ...FULL_CROP },
  };
}

export function setCropAspect(s: ImageEditorState, key: CropAspectKey): ImageEditorState {
  const aspect = cropAspectValue(key, s.source.width, s.source.height, s.transform.rotation);
  return {
    ...s,
    cropAspect: key,
    crop: applyAspect(s.crop, aspect),
  };
}

export function updateCrop(s: ImageEditorState, crop: NormalizedRect): ImageEditorState {
  return { ...s, crop };
}

export function resetAdjustments(s: ImageEditorState): ImageEditorState {
  return {
    ...s,
    adjustments: { brightness: 0, contrast: 0, saturation: 0, sharpness: 0 },
  };
}

export function updateAdjustment(
  s: ImageEditorState,
  key: keyof ImageEditorState['adjustments'],
  value: number
): ImageEditorState {
  return { ...s, adjustments: { ...s.adjustments, [key]: value } };
}

export function resetTransform(s: ImageEditorState): ImageEditorState {
  return {
    ...s,
    transform: { rotation: 0, flipX: false, flipY: false },
    crop: { ...FULL_CROP },
    cropAspect: 'free',
  };
}

export function rotateBy(s: ImageEditorState, delta: 90 | -90): ImageEditorState {
  const next = (((s.transform.rotation + delta) % 360) + 360) % 360;
  // Re-fitting the crop to the full image keeps behavior predictable when the
  // image's aspect changes under a 90° rotation.
  return {
    ...s,
    transform: { ...s.transform, rotation: next as ImageEditorState['transform']['rotation'] },
    crop: { ...FULL_CROP },
    cropAspect: s.cropAspect === 'free' ? 'free' : s.cropAspect,
  };
}

export function flipAxis(s: ImageEditorState, axis: 'x' | 'y'): ImageEditorState {
  return {
    ...s,
    transform: {
      ...s.transform,
      flipX: axis === 'x' ? !s.transform.flipX : s.transform.flipX,
      flipY: axis === 'y' ? !s.transform.flipY : s.transform.flipY,
    },
  };
}

export function setFilter(s: ImageEditorState, id: string, intensity?: number): ImageEditorState {
  return { ...s, filter: { id, intensity: intensity ?? s.filter.intensity } };
}

export function updateFilterIntensity(s: ImageEditorState, intensity: number): ImageEditorState {
  return { ...s, filter: { ...s.filter, intensity } };
}

export function resetFilter(s: ImageEditorState): ImageEditorState {
  return { ...s, filter: { id: ORIGINAL_FILTER_ID, intensity: 1 } };
}

export function addOverlay(s: ImageEditorState, overlay: TextOverlay): ImageEditorState {
  return { ...s, overlays: [...s.overlays, overlay] };
}

export function updateOverlay(s: ImageEditorState, id: string, patch: Partial<TextOverlay>): ImageEditorState {
  return {
    ...s,
    overlays: s.overlays.map((o) => (o.id === id ? { ...o, ...patch } : o)),
  };
}

export function removeOverlay(s: ImageEditorState, id: string): ImageEditorState {
  return { ...s, overlays: s.overlays.filter((o) => o.id !== id) };
}

export function resetAll(s: ImageEditorState): ImageEditorState {
  return createInitialEditorState({ ...s.source });
}

export function newId(prefix = 'item'): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}
