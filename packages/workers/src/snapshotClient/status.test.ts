import { describe, expect, it } from 'vitest';
import type { Manifest } from './envelope';
import { snapshotStatus } from './status';

const m = (asOf: string): Manifest => ({
  version: 1,
  snapshotId: 's',
  asOf,
  createdAt: 1,
  payloadHash: 'a'.repeat(64),
  keyId: 'k1',
});

describe('what the Data tab says about the snapshot', () => {
  it('says it is off, and makes no claim about data, when no host is configured', () => {
    const s = snapshotStatus(false, null, '2026-06-10', null);
    expect(s.state).toBe('off');
    expect(s.headline).toContain('not switched on');
  });

  it('says nothing was downloaded yet and why the last try failed', () => {
    const s = snapshotStatus(true, null, '2026-06-10', {
      status: 'kept-previous',
      reason: 'the snapshot host answered 503',
      manifest: null,
    });
    expect(s.state).toBe('none');
    expect(s.headline).toContain('GRAY-NODATA');
    expect(s.lastProblem).toContain('503');
  });

  it('is fresh within three sessions and stale after', () => {
    expect(snapshotStatus(true, m('2026-06-08'), '2026-06-11', null)).toMatchObject({
      state: 'fresh',
      sessionsBehind: 3,
    });
    const stale = snapshotStatus(true, m('2026-06-08'), '2026-06-12', null);
    expect(stale.state).toBe('stale');
    expect(stale.headline).toContain('out of date');
  });

  it('treats a date outside the calendar as stale with no session count', () => {
    expect(snapshotStatus(true, m('1990-01-01'), '2026-06-08', null)).toMatchObject({
      state: 'stale',
      sessionsBehind: null,
    });
  });
});
