import { EMPTY_REGISTRY, canRun, freeze, preRegister, sha256Hex } from '@trading/core';
import type { HypothesisSpec } from '@trading/core';
import { describe, expect, it } from 'vitest';
import { DEFAULT_CALENDARS, OpenTimestampsAnchorer, otsFile } from './openTimestamps';
import type { HttpPoster } from './openTimestamps';

const DIGEST = sha256Hex('hello');
const reply = Uint8Array.from([
  0xf0, 0x10, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 0x08, 0xff,
]);

function poster(answers: Array<number | Error>): HttpPoster & {
  calls: Array<{ url: string; body: Uint8Array; headers?: Record<string, string> }>;
} {
  const calls: Array<{ url: string; body: Uint8Array; headers?: Record<string, string> }> = [];
  return {
    calls,
    post: (url, body, headers) => {
      calls.push({ url, body, ...(headers === undefined ? {} : { headers }) });
      const a = answers[calls.length - 1] ?? 500;
      if (a instanceof Error) return Promise.reject(a);
      return Promise.resolve({
        status: a,
        body: a === 200 ? reply : new Uint8Array(),
        headers: {},
      });
    },
  };
}

describe('the OpenTimestamps adapter', () => {
  it('sends only the 32 digest bytes to a calendar and returns the proof as an .ots file in hex', async () => {
    const p = poster([200]);
    const a = new OpenTimestampsAnchorer({ poster: p, now: () => 1234 });
    const r = await a.submit(DIGEST);
    expect(p.calls).toHaveLength(1);
    expect(p.calls[0]?.url).toBe(`${DEFAULT_CALENDARS[0] as string}/digest`);
    expect(p.calls[0]?.body).toHaveLength(32);
    expect(p.calls[0]?.headers?.Accept).toBe('application/vnd.opentimestamps.v1');
    expect(r).toMatchObject({ digest: DIGEST, submittedAt: 1234 });
    expect(r.provider).toContain('alice');
    const bytes = Uint8Array.from((r.proof.match(/../g) ?? []).map((h) => parseInt(h, 16)));
    expect(bytes).toEqual(otsFile(DIGEST, reply));
    expect(r.proof.startsWith('004f70656e54696d657374616d7073')).toBe(true); // "\0OpenTimestamps"
    expect(bytes[31]).toBe(0x01); // version
    expect(bytes[32]).toBe(0x08); // SHA-256 operation
  });

  it('falls back to the next calendar when one fails, and says why when all fail', async () => {
    const some = new OpenTimestampsAnchorer({
      poster: poster([new Error('timeout'), 503, 200]),
      now: () => 1,
    });
    expect((await some.submit(DIGEST)).provider).toContain('eternitywall');
    const none = new OpenTimestampsAnchorer({
      poster: poster([500, new Error('refused'), 404]),
      now: () => 1,
    });
    await expect(none.submit(DIGEST)).rejects.toThrow(/no OpenTimestamps calendar.*refused/);
  });

  it('refuses a digest that is not 64 lowercase hex digits and needs at least one calendar', async () => {
    const a = new OpenTimestampsAnchorer({ poster: poster([200]), now: () => 1 });
    await expect(a.submit('abc')).rejects.toThrow(TypeError);
    await expect(a.submit(DIGEST.toUpperCase())).rejects.toThrow(TypeError);
    expect(
      () => new OpenTimestampsAnchorer({ poster: poster([]), now: () => 1, calendars: [] }),
    ).toThrow(RangeError);
  });

  it('is accepted by the experiment registry as its outside time service', async () => {
    const spec: HypothesisSpec = {
      id: 'PH-12',
      title: 't',
      family: 'f',
      statedNull: 'none',
      claimed: { effectSizePct: 1, direction: 'up', horizonSessions: 5 },
      params: { a: 1 },
      ruleHash: sha256Hex('rule'),
      excludedInstruments: [],
    };
    const anchorer = new OpenTimestampsAnchorer({ poster: poster([200]), now: () => 2000 });
    const reg = await freeze(preRegister(EMPTY_REGISTRY, spec, 1000), 'PH-12', 1500, anchorer);
    expect(reg.registrations[0]?.frozen?.receipt.provider).toContain('opentimestamps');
    expect(canRun(reg, spec, 3000)).toEqual({ ok: true });
  });
});
