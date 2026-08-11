/**
 * @file history.ts
 * @description Operation history (undo/redo) for the SoB Image Editor.
 *
 * The editor never stores full-resolution bitmaps in history — it stores
 * deep-cloned editor state snapshots (crop rects, transforms, adjustments,
 * filter id, and arrays of text/drawing overlays). These are tiny compared to
 * image pixels, so even a long edit session stays light on memory.
 */

export interface HistorySnapshot<T> {
  past: T[];
  present: T;
  future: T[];
}

export class History<T> {
  private past: T[];
  private present: T;
  private future: T[];
  private maxDepth: number;

  constructor(initial: T, maxDepth = 100) {
    this.present = initial;
    this.past = [];
    this.future = [];
    this.maxDepth = maxDepth;
  }

  get presentState(): T {
    return this.present;
  }

  canUndo(): boolean {
    return this.past.length > 0;
  }

  canRedo(): boolean {
    return this.future.length > 0;
  }

  /** Records a new state, truncating any redo branch. */
  push(next: T): void {
    this.past.push(this.present);
    if (this.past.length > this.maxDepth) {
      this.past.shift();
    }
    this.future = [];
    this.present = next;
  }

  /** Reverts to the previous state. Returns it, or null if nothing to undo. */
  undo(): T | null {
    if (this.past.length === 0) return null;
    this.future.push(this.present);
    this.present = this.past.pop() as T;
    return this.present;
  }

  /** Restores the next state. Returns it, or null if nothing to redo. */
  redo(): T | null {
    if (this.future.length === 0) return null;
    this.past.push(this.present);
    this.present = this.future.pop() as T;
    return this.present;
  }

  clear(): void {
    this.past = [];
    this.future = [];
  }

  toSnapshot(): HistorySnapshot<T> {
    return { past: [...this.past], present: this.present, future: [...this.future] };
  }

  static fromSnapshot<T>(snap: HistorySnapshot<T>, maxDepth = 100): History<T> {
    const h = new History<T>(snap.present, maxDepth);
    h.past = [...snap.past];
    h.future = [...snap.future];
    return h;
  }
}
