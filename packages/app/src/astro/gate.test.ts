import { buildFixtureScenario, runReplay } from '@trading/core';
import { describe, expect, it, vi } from 'vitest';
import { exportBundle } from '../backup/backupService';
import { GrantAllEntitlements } from '../entitlement/grantAll';
import type { IEntitlementService } from '../entitlement/types';
import { MemoryKv } from '../store/kv';
import type { OrderForm } from '../trading/orderRequest';
import { PaperSession, demoMarket } from '../trading/paperSession';
import { toLedgerView } from '../viewModels/ledgerView';
import { toWinLossView } from '../viewModels/winLossView';
import { seedEntries } from '../universe/seed';
import { toUniverseRows } from '../universe/universeView';
import { BirthVault, MemoryKeyProvider } from './birthVault';
import { BIRTH_KEY, loadAstroLayer, saveBirthProfile } from './gate';
import { findAstroKeys, findAstroWords, withoutAstro } from './leaks';
import { LOCKED_TEXT, LOCKED_TITLE, lockedNotice } from './locked';

// FR-P10: with the astro feature off nothing astro-derived is loaded, stored, shown or exported.
const FEATURE = 'astro_layer';
const denyAll: IEntitlementService = {
  hasFeatureAccess: () => Promise.resolve(false),
  getEntitlements: () => Promise.resolve([]),
};
const PROFILE = { name: 'A Person', date: '1990-01-01', time: '06:30', place: 'Chennai' };
const form = (over: Partial<OrderForm> = {}): OrderForm => ({
  instrumentId: 'AAA',
  side: 'buy',
  type: 'market',
  quantity: '10',
  limit: '',
  stop: '',
  date: '2026-03-02',
  ...over,
});

/** Saved values are JSON, except the device key, which is a plain hex string. */
const parsedOrText = (text: string | null): unknown => {
  try {
    return JSON.parse(text ?? 'null');
  } catch {
    return text;
  }
};

describe('(a) nothing astro runs on the device when the gate is off', () => {
  it('never calls the loader of the astro layer, and returns nothing', async () => {
    const load = vi.fn(() => Promise.resolve('engine'));
    expect(await loadAstroLayer(denyAll, FEATURE, load)).toBeNull();
    expect(load).not.toHaveBeenCalled();
  });

  it('calls the loader once when the feature is granted', async () => {
    const load = vi.fn(() => Promise.resolve('engine'));
    expect(await loadAstroLayer(new GrantAllEntitlements(), FEATURE, load)).toBe('engine');
    expect(load).toHaveBeenCalledTimes(1);
  });
});

describe('(b) no birth data is stored when the gate is off', () => {
  it('writes nothing at all for a locked user, and does not even make an encryption key', async () => {
    const kv = new MemoryKv();
    const keys = new MemoryKeyProvider();
    const made = vi.spyOn(keys, 'getKey');
    expect(await saveBirthProfile(new BirthVault(kv, keys), denyAll, FEATURE, PROFILE)).toEqual({
      saved: false,
      reason: 'locked',
    });
    expect(await kv.keys()).toEqual([]);
    expect(made).not.toHaveBeenCalled();
  });

  it('stores the details on the device, encrypted, when the feature is granted', async () => {
    const kv = new MemoryKv();
    const vault = new BirthVault(kv, new MemoryKeyProvider());
    expect(await saveBirthProfile(vault, new GrantAllEntitlements(), FEATURE, PROFILE)).toEqual({
      saved: true,
    });
    const stored = (await kv.get(BIRTH_KEY)) ?? '';
    for (const word of ['A Person', '1990-01-01', '06:30', 'Chennai'])
      expect(stored).not.toContain(word);
    expect(await vault.load()).toEqual({ state: 'ok', profile: PROFILE });
  });
});

describe('(c, d) screens, view models, exports and caches carry no astro field or word', () => {
  const s = buildFixtureScenario();
  const result = runReplay(s.snapshot, s.orders, s.config);

  it('has none in the ledger, universe and demo-market view models', () => {
    for (const v of [
      toLedgerView(result),
      toUniverseRows(seedEntries()),
      demoMarket().instruments,
    ]) {
      expect(findAstroKeys(v)).toEqual([]);
      expect(findAstroWords(v)).toEqual([]);
    }
  });

  it('has none in the book, comparison and report of a session with trades', async () => {
    const kv = new MemoryKv();
    const session = await PaperSession.open(kv, () => 1);
    await session.place(form());
    await session.place(form({ side: 'sell', quantity: '10', date: '2026-04-01' }));
    const views = [
      await session.view(),
      session.comparison(),
      toWinLossView(session.report(), 'net'),
      toWinLossView(session.report(), 'gross'),
    ];
    for (const v of views) {
      expect(findAstroKeys(v)).toEqual([]);
      expect(findAstroWords(v)).toEqual([]);
    }
  });

  it('has none in the exported bundle or in anything saved on the device', async () => {
    const kv = new MemoryKv();
    const session = await PaperSession.open(kv, () => 1);
    await session.place(form());
    const out = await exportBundle(kv, demoMarket().snapshot.id, 1, () => 'ab'.repeat(32));
    expect(findAstroKeys(JSON.parse(out.text))).toEqual([]);
    expect(findAstroWords(JSON.parse(out.text))).toEqual([]);
    for (const key of await kv.keys()) {
      expect(findAstroWords(key), key).toEqual([]);
      expect(findAstroWords(await kv.get(key)), key).toEqual([]);
      expect(findAstroKeys(parsedOrText(await kv.get(key))), key).toEqual([]);
    }
    expect(await kv.get(BIRTH_KEY)).toBeNull();
  });

  it('leaves the data of a locked user unchanged by the selector, because none was there to strip', () => {
    const v = toLedgerView(result);
    expect(withoutAstro(v)).toEqual(v);
  });
});

describe('(f) the locked placeholder shows no count, score, amount or name', () => {
  it('is a general description with no digits, percent sign, rupee sign or astro word', () => {
    const n = lockedNotice();
    for (const text of [n.title, n.text, LOCKED_TITLE, LOCKED_TEXT]) {
      expect(text).not.toMatch(/\d|%|₹/);
      expect(findAstroWords(text)).toEqual([]);
    }
  });
});

describe('the leak detector catches a deliberate leak (acceptance: a leaking change fails the suite)', () => {
  const leaky = {
    watchlist: [{ symbol: 'AAA', transit_metadata: { vedha: 'papa' }, astro_scores: [0.7] }],
    banner: 'Chandrashtama day 1 of 2',
  };

  it('finds astro-looking keys at any depth, with their paths', () => {
    expect(findAstroKeys(leaky)).toEqual([
      'watchlist[0].transit_metadata',
      'watchlist[0].transit_metadata.vedha',
      'watchlist[0].astro_scores',
    ]);
  });

  it('finds astro words in text, and strips the keys for a locked user', () => {
    expect(findAstroWords(leaky)).toEqual(['Chandrashtama day 1 of 2']);
    expect(findAstroKeys(withoutAstro(leaky))).toEqual([]);
    expect(withoutAstro(leaky).watchlist[0]).toEqual({ symbol: 'AAA' });
  });

  it('does not flag ordinary trading fields', () => {
    const ok = {
      tradingDate: '2026-01-01',
      quantity: 3,
      instrumentId: 'X',
      startAt: 1,
      sector: 's',
    };
    expect(findAstroKeys(ok)).toEqual([]);
  });
});
