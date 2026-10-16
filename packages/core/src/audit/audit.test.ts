import { describe, expect, it } from 'vitest';
import { FixedClock, SimulatedClock } from '../clock';
import type { AuditEvent } from '../domain/ledger';
import { GENESIS_HASH, appendEvent, verifyChain } from './index';

function buildChain(n: number): AuditEvent[] {
  const events: AuditEvent[] = [];
  let prev: AuditEvent | null = null;
  for (let i = 0; i < n; i += 1) {
    prev = appendEvent(prev, { type: 'freeze', payloadRef: `p${String(i)}`, createdAt: 1_000 + i });
    events.push(prev);
  }
  return events;
}

describe('audit hash chain', () => {
  it('starts from the genesis hash and links each event', () => {
    const chain = buildChain(3);
    expect(chain[0]?.prevHash).toBe(GENESIS_HASH);
    expect(chain[1]?.prevHash).toBe(chain[0]?.hash);
    expect(chain.map((e) => e.seq)).toEqual([0, 1, 2]);
  });

  it('verifies an intact chain and reports its head', () => {
    const chain = buildChain(5);
    expect(verifyChain(chain)).toEqual({ ok: true, head: chain[4]?.hash });
    expect(verifyChain([])).toEqual({ ok: true, head: GENESIS_HASH });
  });

  it('is deterministic: the same inputs give the same hashes', () => {
    expect(buildChain(4).map((e) => e.hash)).toEqual(buildChain(4).map((e) => e.hash));
  });

  it('detects an edit to any field of any event', () => {
    const edits: Array<(e: AuditEvent) => AuditEvent> = [
      (e) => ({ ...e, type: 'other' }),
      (e) => ({ ...e, payloadRef: 'tampered' }),
      (e) => ({ ...e, createdAt: e.createdAt + 1 }),
      (e) => ({ ...e, hash: 'f'.repeat(64) }),
    ];
    for (let target = 0; target < 4; target += 1) {
      for (const edit of edits) {
        const chain = buildChain(4);
        chain[target] = edit(chain[target] as AuditEvent);
        const result = verifyChain(chain);
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.index).toBeLessThanOrEqual(target + 1);
      }
    }
  });

  it('detects deletion from the middle, reordering and a broken link', () => {
    const chain = buildChain(5);
    expect(verifyChain([chain[0], chain[2], chain[3]] as AuditEvent[]).ok).toBe(false);
    expect(verifyChain([chain[1], chain[0]] as AuditEvent[]).ok).toBe(false);
    const relinked = chain.map((e, i) => (i === 3 ? { ...e, prevHash: GENESIS_HASH } : e));
    expect(verifyChain(relinked).ok).toBe(false);
  });

  it('cannot see a lost tail, so the head must be compared with the anchor', () => {
    const chain = buildChain(5);
    const truncated = verifyChain(chain.slice(0, 3));
    expect(truncated.ok).toBe(true);
    expect(truncated.ok && truncated.head).not.toBe(chain[4]?.hash);
  });

  it('refuses events that go back in time', () => {
    const first = appendEvent(null, { type: 't', payloadRef: 'p', createdAt: 100 });
    expect(() => appendEvent(first, { type: 't', payloadRef: 'p', createdAt: 99 })).toThrow(
      RangeError,
    );
  });
});

describe('clocks', () => {
  it('fixed clock never changes', () => {
    const c = new FixedClock(5);
    expect(c.now()).toBe(5);
    expect(c.now()).toBe(5);
  });

  it('simulated clock moves forward only', () => {
    const c = new SimulatedClock(10);
    c.advance(5);
    expect(c.now()).toBe(15);
    c.setTo(20);
    expect(c.now()).toBe(20);
    expect(() => c.setTo(19)).toThrow(RangeError);
    expect(() => c.advance(-1)).toThrow(RangeError);
    expect(() => c.advance(0.5)).toThrow(RangeError);
  });

  it('rejects invalid instants', () => {
    expect(() => new FixedClock(-1)).toThrow();
    expect(() => new SimulatedClock(1.5)).toThrow();
  });
});
