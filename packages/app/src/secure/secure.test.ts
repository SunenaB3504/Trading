import { describe, expect, it } from 'vitest';
import { MemoryKv } from '../store/kv';
import { MemorySecureStore } from './secureStore';
import { SECURE_PREFIX, WebSecureStore, newSealingKey } from './webSecure';

describe('secure store (Stage 1.8)', () => {
  it('memory store keeps, replaces and deletes values and refuses unsafe keys', async () => {
    const s = new MemorySecureStore();
    await s.set('pin.a', 'x');
    await s.set('pin.a', 'y');
    expect(await s.get('pin.a')).toBe('y');
    await s.delete('pin.a');
    expect(await s.get('pin.a')).toBeNull();
    await expect(s.set('pin/a', 'x')).rejects.toThrow(RangeError);
  });

  it('web store writes only ciphertext to the ordinary store and reads it back', async () => {
    const kv = new MemoryKv();
    const key = await newSealingKey();
    const s = new WebSecureStore(kv, () => Promise.resolve(key));
    await s.set('ai.claude', 'sk-test-value');
    const raw = (await kv.get(SECURE_PREFIX + 'ai.claude')) ?? '';
    expect(raw).not.toContain('sk-test-value');
    expect(await s.get('ai.claude')).toBe('sk-test-value');
    await s.delete('ai.claude');
    expect(await kv.keys()).toEqual([]);
  });

  it('a value sealed under another key reads as missing, not as garbage', async () => {
    const kv = new MemoryKv();
    const first = await newSealingKey();
    await new WebSecureStore(kv, () => Promise.resolve(first)).set('pin.a', '1234');
    const second = await newSealingKey();
    expect(await new WebSecureStore(kv, () => Promise.resolve(second)).get('pin.a')).toBeNull();
  });
});
