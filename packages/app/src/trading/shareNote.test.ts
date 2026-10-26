import { describe, expect, it } from 'vitest';
import { MemoryKv } from '../store/kv';
import { PaperSession } from './paperSession';

const form = { instrumentId: 'AAA', side: 'buy', type: 'market', quantity: '10', limit: '', stop: '', date: '2026-03-02' } as const;

describe('contract note on a filled share order', () => {
  it('lists the trade, every charge and what was paid, and the charges add up', async () => {
    const s = await PaperSession.open(new MemoryKv(), () => 1);
    await s.place(form);
    const o = (await s.view()).orders[0];
    const note = new Map(o?.note ?? []);
    expect(note.get('Trade')).toMatch(/^buy 10 AAA at ₹.* on 2026-03-/);
    const money = (k: string): number => Number((note.get(k) ?? '').replace(/[₹,]/g, '').replace('.', ''));
    const parts = ['Brokerage', 'STT', 'Exchange charges', 'SEBI fee', 'Stamp duty', 'Depository charge', 'GST'].map(money);
    expect(parts.reduce((a, b) => a + b, 0)).toBe(money('Total charges'));
    expect(money('You paid')).toBe(money('Turnover') + money('Total charges'));
  });

  it('has no note for an order that has not filled', async () => {
    const s = await PaperSession.open(new MemoryKv(), () => 1);
    await s.place({ ...form, type: 'limit', limit: '1' });
    expect((await s.view()).orders[0]?.note).toBeNull();
  });
});
