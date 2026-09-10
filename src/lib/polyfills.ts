/**
 * @file polyfills.ts
 * @description Lightweight polyfills for APIs missing in iOS 12 Safari and
 * Chrome 49. Only loaded when the native API is absent — modern browsers
 * skip these entirely.
 */

/* -------------------------------------------------------------------------- */
/*  ResizeObserver                                                             */
/*  Required by: ImageCropperModal (onboarding avatar step), EditorCanvas      */
/*  Missing on: iOS < 13, Chrome < 64                                          */
/* -------------------------------------------------------------------------- */
if (typeof ResizeObserver === 'undefined') {
  // Minimal shim: observes element resize via a 200ms interval.
  // Good enough for the image cropper to detect container size changes.
  class ResizeObserverShim {
    private _callback: ResizeObserverCallback;
    private _timer: ReturnType<typeof setInterval> | null = null;
    private _targets = new Map<Element, { width: number; height: number }>();

    constructor(callback: ResizeObserverCallback) {
      this._callback = callback;
    }

    observe(target: Element) {
      const rect = target.getBoundingClientRect();
      this._targets.set(target, { width: rect.width, height: rect.height });

      if (!this._timer) {
        this._timer = setInterval(() => {
          for (const [el, prev] of this._targets) {
            const r = el.getBoundingClientRect();
            if (r.width !== prev.width || r.height !== prev.height) {
              this._targets.set(el, { width: r.width, height: r.height });
              this._callback(
                [{ contentRect: { width: r.width, height: r.height, top: 0, left: 0, right: 0, bottom: 0 } } as ResizeObserverEntry],
                this as unknown as ResizeObserver,
              );
            }
          }
        }, 200);
      }
    }

    unobserve(target: Element) {
      this._targets.delete(target);
      if (this._targets.size === 0 && this._timer) {
        clearInterval(this._timer);
        this._timer = null;
      }
    }

    disconnect() {
      this._targets.clear();
      if (this._timer) {
        clearInterval(this._timer);
        this._timer = null;
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).ResizeObserver = ResizeObserverShim;
}

/* -------------------------------------------------------------------------- */
/*  IntersectionObserver                                                       */
/*  Required by: react-intersection-observer (feed lazy-loading)              */
/*  Missing on: Chrome < 51 (Android 6)                                       */
/* -------------------------------------------------------------------------- */
if (typeof IntersectionObserver === 'undefined') {
  class IntersectionObserverShim {
    private _callback: IntersectionObserverCallback;
    private _targets = new Set<Element>();

    constructor(callback: IntersectionObserverCallback) {
      this._callback = callback;
    }

    observe(target: Element) {
      this._targets.add(target);
      // Fire once immediately — treat as "visible" so content loads
      queueMicrotask(() => {
        if (!this._targets.has(target)) return;
        const rect = target.getBoundingClientRect();
        this._callback(
          [{
            target,
            isIntersecting: true,
            intersectionRatio: 1,
            boundingClientRect: rect,
            intersectionRect: rect,
            rootBounds: null,
            time: performance.now(),
          } as IntersectionObserverEntry],
          this as unknown as IntersectionObserver,
        );
      });
    }

    unobserve(target: Element) {
      this._targets.delete(target);
    }

    disconnect() {
      this._targets.clear();
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (window as any).IntersectionObserver = IntersectionObserverShim;
}

/* -------------------------------------------------------------------------- */
/*  navigator.clipboard.writeText                                              */
/*  Required by: share/copy buttons on PostCard, ArticleCard, Chat            */
/*  Missing on: iOS < 13.1, Chrome < 66                                       */
/* -------------------------------------------------------------------------- */
if (typeof navigator !== 'undefined' && navigator.clipboard && !navigator.clipboard.writeText) {
  const original = navigator.clipboard;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (original as any).writeText = async (text: string): Promise<void> => {
    // Fallback: temporary textarea + execCommand('copy')
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    ta.style.top = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try {
      document.execCommand('copy');
    } finally {
      document.body.removeChild(ta);
    }
  };
}
