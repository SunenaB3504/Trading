import { LESSONS, markLesson, EMPTY_PROGRESS } from '@trading/content';
import { describe, expect, it } from 'vitest';
import { applyImport, exportProfile, readBackup } from '../backup/backupService';
import { loadProgress, saveProgress } from '../learn/progressStore';
import { ProfileStore } from '../profiles/profiles';
import { MemorySecureStore } from '../secure/secureStore';
import { DEFAULT_PROFILE_SETTINGS } from '../settings/settings';
import { MemoryKv } from '../store/kv';
import { demoMarket } from '../trading/market';
import { PaperSession } from '../trading/paperSession';
import { addAfter, addBefore, exitPlanIds, hasBefore, isEntry, loadJournal } from './journalStore';

const NOW = 1_760_000_000_000;
const KEY = 'a1'.repeat(32);
const before = { why: 'Results were good', target: '1500', exitPlan: 'Sell below 1300', confidence: 4 };

describe('trade journal (SSD v4.1 §6.1)', () => {
  it('saves the note made before an order and finds the exit plans', async () => {
    const kv = new MemoryKv();
    await addBefore(kv, 'demo', 'h-0001', before, NOW);
    await addBefore(kv, 'demo', 'h-0002', { ...before, exitPlan: '  ' }, NOW);
    await addBefore(kv, 'real', 'h-0001', before, NOW);
    const all = await loadJournal(kv);
    expect(all).toHaveLength(3);
    expect(exitPlanIds(all, 'demo')).toEqual(new Set(['h-0001']));
    expect(exitPlanIds(all, 'real')).toEqual(new Set(['h-0001']));
  });

  it('writes nothing when every field is empty, and keeps one entry per order', async () => {
    const kv = new MemoryKv();
    const empty = { why: ' ', target: '', exitPlan: '', confidence: null };
    expect(hasBefore(empty)).toBe(false);
    await addBefore(kv, 'demo', 'h-0001', empty, NOW);
    expect(await loadJournal(kv)).toEqual([]);
    await addBefore(kv, 'demo', 'h-0001', before, NOW);
    await addBefore(kv, 'demo', 'h-0001', { ...before, why: 'Changed my mind' }, NOW + 1);
    expect((await loadJournal(kv)).map((e) => e.why)).toEqual(['Changed my mind']);
  });

  it('adds the note after the trade to an entry, or makes one', async () => {
    const kv = new MemoryKv();
    await addBefore(kv, 'demo', 'h-0001', before, NOW);
    await addAfter(kv, 'demo', 'h-0001', { what: 'Stopped out', learned: 'Size was too big', emotion: 'anxious' }, NOW + 5);
    await addAfter(kv, 'demo', 'h-0009', { what: 'Sold early', learned: '', emotion: null }, NOW + 6);
    const all = await loadJournal(kv);
    expect(all.find((e) => e.orderId === 'h-0001')).toMatchObject({ why: 'Results were good', after: { what: 'Stopped out', emotion: 'anxious', at: NOW + 5 } });
    expect(all.find((e) => e.orderId === 'h-0009')).toMatchObject({ why: '', after: { what: 'Sold early' } });
  });

  it('cuts very long text and ignores damaged saved entries', async () => {
    const kv = new MemoryKv();
    await addBefore(kv, 'demo', 'h-0001', { ...before, why: 'x'.repeat(5000) }, NOW);
    expect((await loadJournal(kv))[0]?.why).toHaveLength(1000);
    expect(isEntry({ orderId: 'a' })).toBe(false);
    expect(isEntry(null)).toBe(false);
    await kv.set('journal/entries', JSON.stringify({ savedAt: 1, value: [{ nope: true }, null, 5] }));
    expect(await loadJournal(kv)).toEqual([]);
  });
});

describe('learn progress storage', () => {
  it('saves and loads progress, and falls back to empty for damaged data', async () => {
    const kv = new MemoryKv();
    expect(await loadProgress(kv)).toEqual(EMPTY_PROGRESS);
    const p = markLesson(EMPTY_PROGRESS, LESSONS[0]?.id ?? '', true, NOW);
    await saveProgress(kv, p, NOW);
    expect(await loadProgress(kv)).toEqual(p);
    await kv.set('learn/progress', JSON.stringify({ savedAt: 1, value: 'broken' }));
    expect(await loadProgress(kv)).toEqual(EMPTY_PROGRESS);
  });
});

describe('mistake checker on a real practice book', () => {
  const order = { instrumentId: 'AAA', side: 'buy', type: 'market', quantity: '10', limit: '', stop: '', date: '2026-03-02' } as const;
  it('flags a buy with no exit plan, and not when the journal names one', async () => {
    const s = await PaperSession.open(new MemoryKv(), () => NOW);
    await s.place(order);
    const limits = DEFAULT_PROFILE_SETTINGS.mistakes;
    expect((await s.mistakes(new Set(), limits)).map((f) => f.rule)).toEqual(['no_exit_plan']);
    expect(await s.mistakes(new Set(['h-0001']), limits)).toEqual([]);
  });

  it('does not count a cancelled order', async () => {
    const s = await PaperSession.open(new MemoryKv(), () => NOW);
    expect((await s.place({ ...order, type: 'stop', trigger: '99999', when: 'at_or_above', validity: 'gtt' })).ok).toBe(true);
    expect((await s.cancel('h-0001')).ok).toBe(true);
    expect(await s.mistakes(new Set(), DEFAULT_PROFILE_SETTINGS.mistakes)).toEqual([]);
  });

  it('flags a position over a strict limit using the real fills', async () => {
    const s = await PaperSession.open(new MemoryKv(), () => NOW);
    await s.place(order);
    const rules = (await s.mistakes(new Set(['h-0001']), { ...DEFAULT_PROFILE_SETTINGS.mistakes, maxPositionPct: 0 })).map((f) => f.rule);
    expect(rules).toEqual(['position_too_large']);
  });
});

describe('journal and progress in a profile backup', () => {
  it('travel with the profile and come back on another device', async () => {
    const kv = new MemoryKv();
    const profiles = new ProfileStore(kv, new MemorySecureStore(), () => NOW, () => KEY);
    const profile = await profiles.create('Sunil');
    const mine = profiles.scope(profile.id);
    await addBefore(mine, 'demo', 'h-0001', before, NOW);
    const progress = markLesson(EMPTY_PROGRESS, 'order-types', true, NOW);
    await saveProgress(mine, progress, NOW);
    const snapshotId = demoMarket().snapshot.id;
    const out = await exportProfile({ device: kv, profileKv: mine, profile, snapshotId, now: NOW, randomHex: () => KEY });
    const phoneKv = new MemoryKv();
    const phone = new ProfileStore(phoneKv, new MemorySecureStore(), () => NOW, () => 'b2'.repeat(32));
    await phone.create('Neil');
    const read = await readBackup(phoneKv, out.text, '', snapshotId);
    if (!read.ok) throw new Error(read.message);
    expect(read.backup.journal).toHaveLength(1);
    const target = await applyImport(read.backup, phone, NOW);
    expect(await loadJournal(phone.scope(target.id))).toEqual(await loadJournal(mine));
    expect(await loadProgress(phone.scope(target.id))).toEqual(progress);
  });

  it('refuses a damaged journal entry in the file', async () => {
    const kv = new MemoryKv();
    const profiles = new ProfileStore(kv, new MemorySecureStore(), () => NOW, () => KEY);
    const profile = await profiles.create('Sunil');
    const snapshotId = demoMarket().snapshot.id;
    const out = await exportProfile({ device: kv, profileKv: profiles.scope(profile.id), profile, snapshotId, now: NOW, randomHex: () => KEY });
    const bundle = JSON.parse(out.text) as { items: unknown[] };
    bundle.items.push({ t: 'journal', entry: { orderId: 1 } });
    expect((await readBackup(kv, JSON.stringify(bundle), KEY, snapshotId)).ok).toBe(false);
  });
});
