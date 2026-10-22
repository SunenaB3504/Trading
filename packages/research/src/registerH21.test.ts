import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { verifyRegistry } from '@trading/core';
import type { TimeAnchorer } from '@trading/core';
import { loadRegistry } from '@trading/data-service';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { registerH21 } from './registerH21';

let dir: string;
beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'reg-'));
});
afterEach(() => rmSync(dir, { recursive: true, force: true }));

const good: TimeAnchorer = {
  submit: (digest) => Promise.resolve({ provider: 'test', digest, submittedAt: 5, proof: 'ab' }),
};
const deps = (over: Partial<Parameters<typeof registerH21>[0]> = {}) => ({
  registryFile: join(dir, 'experiments.json'),
  anchorer: good,
  now: () => 1000,
  pilotSymbols: ['ZED', 'ABC'],
  ...over,
});

describe('registering H-21', () => {
  it('registers and freezes it with the owner claim, the approved table and the pilot stocks out', async () => {
    const reg = await registerH21(deps());
    const entry = reg.registrations[0];
    expect(entry?.spec.claimed).toEqual({ effectSizePct: 2, direction: 'up', horizonSessions: 20 });
    expect(entry?.spec.excludedInstruments).toEqual(['ABC', 'ZED']);
    expect(entry?.frozen?.receipt.provider).toBe('test');
    const saved = loadRegistry(join(dir, 'experiments.json'));
    expect(saved).toEqual(reg);
    expect(verifyRegistry(reg).ok).toBe(true);
  });

  it('refuses to register it twice', async () => {
    await registerH21(deps());
    await expect(registerH21(deps())).rejects.toThrow('already registered');
  });

  it('saves nothing when the time service fails, so H-21 is never half-registered', async () => {
    const failing: TimeAnchorer = { submit: () => Promise.reject(new Error('no network')) };
    await expect(registerH21(deps({ anchorer: failing }))).rejects.toThrow('not frozen');
    expect(loadRegistry(join(dir, 'experiments.json'))).toBeNull();
  });
});
