import { describe, expect, it } from 'vitest';
import { MemoryKv } from '../store/kv';
import { activeReasons, addReason, loadReasons, mergeReason, renameReason, resolveReason, retireReason, STARTER_REASONS } from './reasons';

describe('master reason list (owner, 2026-11-06)', () => {
  it('starts with the neutral starter list in two groups', async () => {
    const list = await loadReasons(new MemoryKv());
    expect(list).toEqual(STARTER_REASONS);
    expect(activeReasons(list, 'entry').map((r) => r.label)).toContain('Simulator signal');
    expect(activeReasons(list, 'exit').map((r) => r.label)).toContain('Exit date reached');
  });

  it('adds a reason once: the same name again gives the same reason', async () => {
    const kv = new MemoryKv();
    const a = await addReason(kv, 'entry', '  Ingress   (simulator) ', 1);
    if ('error' in a) throw new Error(a.error);
    expect(a.list.at(-1)).toEqual({ id: a.id, group: 'entry', label: 'Ingress (simulator)' });
    const b = await addReason(kv, 'entry', 'ingress (simulator)', 2);
    expect('id' in b && b.id).toBe(a.id);
    expect(await addReason(kv, 'entry', '   ', 3)).toEqual({ error: 'Give the reason a name.' });
  });

  it('renames under the same id, retires without losing history, and merges into another', async () => {
    const kv = new MemoryKv();
    await renameReason(kv, 'e-dip', 'Dip in a strong stock', 1);
    expect(resolveReason(await loadReasons(kv), 'e-dip')?.label).toBe('Dip in a strong stock');
    await retireReason(kv, 'e-tip', true, 2);
    const list = await loadReasons(kv);
    expect(activeReasons(list, 'entry').some((r) => r.id === 'e-tip')).toBe(false);
    expect(resolveReason(list, 'e-tip')?.label).toBe('Tip from someone');
    await mergeReason(kv, 'e-breakout', 'e-news', 3);
    expect(resolveReason(await loadReasons(kv), 'e-breakout')?.id).toBe('e-news');
    // a merge across groups is refused
    await mergeReason(kv, 'x-fear', 'e-news', 4);
    expect(resolveReason(await loadReasons(kv), 'x-fear')?.id).toBe('x-fear');
  });
});
