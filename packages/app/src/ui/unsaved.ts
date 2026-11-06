import { useEffect } from 'react';

/**
 * Work on screen that is not saved yet, such as an order being typed. A profile switch asks before throwing it away.
 * Kept as a small registry so the header does not need to know which screen is open.
 */
const pending = new Map<string, string>();

/** What is unsaved, in words ("an order you have not placed"), or null when nothing is. */
export function unsavedWork(): string | null {
  return pending.size === 0 ? null : [...pending.values()].join(' and ');
}

/** Registers `what` while `dirty` is true; cleared when the screen closes. */
export function useUnsaved(key: string, dirty: boolean, what: string): void {
  useEffect(() => {
    if (dirty) pending.set(key, what);
    else pending.delete(key);
    return () => {
      pending.delete(key);
    };
  }, [key, dirty, what]);
}
