import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const DIR = join(process.cwd(), 'packages', 'astro-engine', 'upstream');
const prov = JSON.parse(readFileSync(join(DIR, 'PROVENANCE.json'), 'utf8')) as {
  files: Record<string, string>;
};

describe('frozen upstream engine copy (WP-4.1)', () => {
  it.each(Object.entries(prov.files))('%s still matches its recorded SHA-256', (name, hash) => {
    // Line endings are normalised so a Windows checkout does not read as a change.
    const text = readFileSync(join(DIR, name), 'utf8').replace(/\r\n/g, '\n');
    expect(createHash('sha256').update(text).digest('hex')).toBe(hash);
  });
});
