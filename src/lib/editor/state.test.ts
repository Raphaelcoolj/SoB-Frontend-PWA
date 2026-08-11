import { describe, it, expect } from 'vitest';
import type { EditorSource, ImageEditorState } from './types';
import {
  cloneState,
  createInitialEditorState,
  flipAxis,
  resetAdjustments,
  resetAll,
  resetCrop,
  resetFilter,
  resetTransform,
  rotateBy,
  setCropAspect,
  updateAdjustment,
  updateOverlay,
} from './state';

const source: EditorSource = {
  uri: 'blob:test',
  width: 4000,
  height: 3000,
  mimeType: 'image/jpeg',
  name: 'photo.jpg',
  hasAlpha: false,
};

function makeState(): ImageEditorState {
  const s = createInitialEditorState(source);
  return s;
}

describe('createInitialEditorState', () => {
  it('defaults to a full, untouched crop with neutral adjustments', () => {
    const s = makeState();
    expect(s.crop).toEqual({ x: 0, y: 0, width: 1, height: 1 });
    expect(s.cropAspect).toBe('free');
    expect(s.transform).toEqual({ rotation: 0, flipX: false, flipY: false });
    expect(s.adjustments).toEqual({ brightness: 0, contrast: 0, saturation: 0, sharpness: 0 });
    expect(s.filter.id).toBe('original');
    expect(s.overlays).toEqual([]);
    expect(s.drawings).toEqual([]);
  });
});

describe('cloneState', () => {
  it('deep-clones nested arrays and objects', () => {
    const s = makeState();
    s.overlays.push({ id: 't1', text: 'hi', x: 0.5, y: 0.5, scale: 1, rotation: 0, fontSize: 0.06, color: '#fff', align: 'center', background: null, bold: false });
    s.drawings.push({ id: 'd1', color: '#000', width: 0.01, eraser: false, points: [{ x: 0, y: 0 }] });
    const c = cloneState(s);
    c.overlays[0].text = 'changed';
    c.drawings[0].points[0].x = 0.9;
    c.adjustments.brightness = 1;
    expect(s.overlays[0].text).toBe('hi');
    expect(s.drawings[0].points[0].x).toBe(0);
    expect(s.adjustments.brightness).toBe(0);
  });
});

describe('reset helpers', () => {
  it('resetCrop restores the full crop', () => {
    const s = makeState();
    s.crop = { x: 0.2, y: 0.2, width: 0.4, height: 0.4 };
    s.cropAspect = '1:1';
    const r = resetCrop(s);
    expect(r.crop).toEqual({ x: 0, y: 0, width: 1, height: 1 });
    expect(r.cropAspect).toBe('free');
  });

  it('resetAdjustments zeroes values', () => {
    const s = makeState();
    const u = updateAdjustment(s, 'brightness', 0.5);
    const r = resetAdjustments(u);
    expect(r.adjustments.brightness).toBe(0);
    expect(r.adjustments.contrast).toBe(0);
  });

  it('resetTransform restores rotation/flip and re-fits crop', () => {
    const s = makeState();
    s.transform = { rotation: 90, flipX: true, flipY: false };
    s.crop = { x: 0.1, y: 0.1, width: 0.5, height: 0.5 };
    const r = resetTransform(s);
    expect(r.transform).toEqual({ rotation: 0, flipX: false, flipY: false });
    expect(r.crop).toEqual({ x: 0, y: 0, width: 1, height: 1 });
  });

  it('resetFilter returns to original', () => {
    const s = makeState();
    s.filter = { id: 'vivid', intensity: 0.8 };
    expect(resetFilter(s).filter.id).toBe('original');
  });

  it('resetAll discards every edit but keeps the source', () => {
    const s = makeState();
    s.transform.rotation = 90;
    s.adjustments.saturation = 0.5;
    s.overlays.push({ id: 't', text: 'x', x: 0, y: 0, scale: 1, rotation: 0, fontSize: 0.05, color: '#fff', align: 'center', background: null, bold: false });
    const r = resetAll(s);
    expect(r.source).toEqual(source);
    expect(r.transform.rotation).toBe(0);
    expect(r.adjustments.saturation).toBe(0);
    expect(r.overlays).toEqual([]);
  });
});

describe('transform ops', () => {
  it('rotateBy steps 90 degrees and re-fits crop', () => {
    const s = makeState();
    s.crop = { x: 0.2, y: 0.2, width: 0.3, height: 0.3 };
    const r = rotateBy(s, 90);
    expect(r.transform.rotation).toBe(90);
    expect(r.crop).toEqual({ x: 0, y: 0, width: 1, height: 1 });
    expect(rotateBy(r, 90).transform.rotation).toBe(180);
    expect(rotateBy(r, -90).transform.rotation).toBe(0);
  });

  it('flipAxis toggles the right axis', () => {
    const s = makeState();
    const fx = flipAxis(s, 'x');
    expect(fx.transform.flipX).toBe(true);
    expect(fx.transform.flipY).toBe(false);
    const fy = flipAxis(fx, 'y');
    expect(fy.transform.flipX).toBe(true);
    expect(fy.transform.flipY).toBe(true);
  });
});

describe('crop aspect + overlays', () => {
  it('setCropAspect adjusts the crop to 1:1 around its center', () => {
    const s = makeState();
    const r = setCropAspect(s, '1:1');
    // The crop lives in normalized rotated-image space, so a 1:1 OUTPUT is
    // crop.width*rotW = crop.height*rotH (rotW=4000, rotH=3000).
    const outputRatio = (r.crop.width * 4000) / (r.crop.height * 3000);
    expect(outputRatio).toBeCloseTo(1);
    expect(r.crop.width / r.crop.height).toBeCloseTo(0.75);
    expect(r.cropAspect).toBe('1:1');
  });

  it('updateOverlay patches without mutating the source state', () => {
    const s = makeState();
    s.overlays.push({ id: 't1', text: 'a', x: 0, y: 0, scale: 1, rotation: 0, fontSize: 0.05, color: '#fff', align: 'center', background: null, bold: false });
    const r = updateOverlay(s, 't1', { text: 'b' });
    expect(r.overlays[0].text).toBe('b');
    expect(s.overlays[0].text).toBe('a');
  });
});

describe('serialization', () => {
  it('states round-trip through JSON', () => {
    const s = makeState();
    s.crop = { x: 0.1, y: 0.05, width: 0.8, height: 0.9 };
    const json = JSON.stringify(s);
    const parsed = JSON.parse(json) as ImageEditorState;
    expect(parsed.crop).toEqual(s.crop);
    expect(parsed.source.uri).toBe('blob:test');
  });
});
