/** 32 random bytes as hex from the platform's secure generator (WebCrypto on web). Native builds add theirs later. */
export function secureRandomHex(): string {
  const c = (globalThis as { crypto?: { getRandomValues?: (a: Uint8Array) => Uint8Array } }).crypto;
  if (c?.getRandomValues === undefined) throw new Error('no secure random source on this device');
  const bytes = c.getRandomValues(new Uint8Array(32));
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export type Persistence = 'granted' | 'refused' | 'unsupported';

/** Asks the browser to keep this site's storage from being cleared under pressure (FR-X4). */
export async function requestPersistence(): Promise<Persistence> {
  const s = (globalThis as { navigator?: { storage?: { persist?: () => Promise<boolean> } } })
    .navigator?.storage;
  if (s?.persist === undefined) return 'unsupported';
  try {
    return (await s.persist()) ? 'granted' : 'refused';
  } catch {
    return 'unsupported';
  }
}

/** Offers the text as a file on web; returns false where there is no browser to do it. */
export function downloadText(filename: string, text: string): boolean {
  const g = globalThis as {
    document?: { createElement: (t: string) => Record<string, unknown> & { click: () => void } };
    URL?: { createObjectURL: (b: unknown) => string; revokeObjectURL: (u: string) => void };
    Blob?: new (parts: string[], o: { type: string }) => unknown;
  };
  if (g.document === undefined || g.URL === undefined || g.Blob === undefined) return false;
  const url = g.URL.createObjectURL(new g.Blob([text], { type: 'application/json' }));
  const a = g.document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  g.URL.revokeObjectURL(url);
  return true;
}
