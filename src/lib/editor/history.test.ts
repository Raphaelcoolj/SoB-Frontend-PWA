import { describe, it, expect } from 'vitest';
import { History } from './history';

interface S {
  v: number;
}

const s = (v: number): S => ({ v });

describe('History', () => {
  it('starts with the initial state and no undo/redo', () => {
    const h = new History<S>(s(1));
    expect(h.presentState).toEqual(s(1));
    expect(h.canUndo()).toBe(false);
    expect(h.canRedo()).toBe(false);
    expect(h.undo()).toBeNull();
    expect(h.redo()).toBeNull();
  });

  it('tracks undo across pushes', () => {
    const h = new History<S>(s(1));
    h.push(s(2));
    h.push(s(3));
    expect(h.presentState).toEqual(s(3));
    expect(h.undo()).toEqual(s(2));
    expect(h.undo()).toEqual(s(1));
    expect(h.canUndo()).toBe(false);
  });

  it('tracks redo after undoing', () => {
    const h = new History<S>(s(1));
    h.push(s(2));
    h.push(s(3));
    h.undo();
    h.undo();
    expect(h.redo()).toEqual(s(2));
    expect(h.redo()).toEqual(s(3));
    expect(h.canRedo()).toBe(false);
  });

  it('clears the redo branch on a new push', () => {
    const h = new History<S>(s(1));
    h.push(s(2));
    h.push(s(3));
    h.undo();
    h.push(s(4));
    expect(h.canRedo()).toBe(false);
    expect(h.undo()).toEqual(s(2));
    expect(h.redo()).toEqual(s(4));
  });

  it('respects the max depth', () => {
    const h = new History<S>(s(0), 3);
    for (let i = 1; i <= 10; i++) h.push(s(i));
    expect(h.undo()).toEqual(s(9));
    expect(h.undo()).toEqual(s(8));
    expect(h.undo()).toEqual(s(7));
    expect(h.undo()).toBeNull();
  });

  it('serializes and restores from a snapshot', () => {
    const h = new History<S>(s(1));
    h.push(s(2));
    const snap = h.toSnapshot();
    const h2 = History.fromSnapshot(snap);
    expect(h2.presentState).toEqual(s(2));
    expect(h2.undo()).toEqual(s(1));
  });
});
