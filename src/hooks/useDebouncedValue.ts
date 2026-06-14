import { useState, useEffect } from 'react';

/**
 * @file useDebouncedValue.ts
 * @description Hook to debounce a rapidly-changing value.
 * Used for search inputs to prevent excessive API calls.
 */

export function useDebouncedValue<T>(value: T, delayMs: number): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebounced(value);
    }, delayMs);

    return () => clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
