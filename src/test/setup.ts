import '@testing-library/jest-dom/vitest';
import { vi } from 'vitest';

// jsdom does not implement createObjectURL/revokeObjectURL; media compositors
// and upload previews rely on them.
if (typeof URL.createObjectURL !== 'function') {
  URL.createObjectURL = vi.fn(() => `blob:mock-${Math.random().toString(36).slice(2)}`);
}
if (typeof URL.revokeObjectURL !== 'function') {
  URL.revokeObjectURL = vi.fn();
}
