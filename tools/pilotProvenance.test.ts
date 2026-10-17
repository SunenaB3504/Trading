import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// The frozen pilot copy is read-only: every copied file must still hash to its recorded value, and
// the copy must still match the source it was taken from where that source remains.
interface Entry {
  path: string;
  bytes: number;
  sha256: string;
  copied: boolean;
  cache?: { rows: number; first: string; last: string };
}
const root = process.cwd();
const manifest = JSON.parse(
  readFileSync(join(root, 'research', 'pilot', 'PROVENANCE.json'), 'utf8'),
) as {
  files: Entry[];
};
const sha = (path: string): string => createHash('sha256').update(readFileSync(path)).digest('hex');

describe('frozen pilot (WP-0.2)', () => {
  const copied = manifest.files.filter((f) => f.copied);

  it('lists every file with a hash and records the cache ranges', () => {
    expect(manifest.files).toHaveLength(80);
    for (const f of manifest.files) expect(f.sha256).toMatch(/^[0-9a-f]{64}$/);
    const caches = manifest.files.filter((f) => f.cache !== undefined);
    expect(caches).toHaveLength(24);
    for (const c of caches) expect((c.cache?.last ?? '') >= '2026-10-13').toBe(true);
  });

  it('keeps every copied file byte-identical to its recorded hash', () => {
    expect(copied).toHaveLength(50);
    for (const f of copied) {
      expect(sha(join(root, 'research', 'pilot', 'files', f.path)), f.path).toBe(f.sha256);
    }
  });

  it('matches the source folder wherever the source still exists', () => {
    for (const f of copied) {
      const src = join(root, 'Study-docs', 'research', f.path);
      if (existsSync(src)) expect(sha(src), f.path).toBe(f.sha256);
    }
  });
});
