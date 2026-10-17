import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { BarUnadj, CorporateAction } from '@trading/core';
import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LIFECYCLE,
  IdentityIndex,
  buildIdentities,
  canonicalize,
  delistingFields,
  lifecycleOf,
  parseBhavcopyLegacy,
  universeAsOf,
} from '../index';
import type { Lifecycle } from '../index';

// Real NSE bars around two mergers (fixtures/providers/mergers_legacy_subset.csv): HDFC into HDFC Bank
// (HDFC's last session 2023-07-12) and Mindtree into L&T Infotech (Mindtree's last session 2022-11-22).
const dir = join(process.cwd(), 'fixtures', 'providers');
const rows = parseBhavcopyLegacy(readFileSync(join(dir, 'mergers_legacy_subset.csv'), 'utf8')).rows;
const identities = buildIdentities(rows);
const canon = canonicalize(rows, new IdentityIndex(identities), 's').bars;
const idOf = (symbol: string): string =>
  identities.find((i) => i.listings.some((l) => l.symbol === symbol))?.instrumentId ?? '';
const bars = (symbol: string): BarUnadj[] => canon.get(idOf(symbol)) ?? [];

const merger = (symbol: string, exDate: string): CorporateAction => ({
  id: `${symbol}-merger`,
  instrumentId: idOf(symbol),
  type: 'merger',
  exDate,
  ratio: null,
  dividendPaisePerShare: null,
  source: 'NSE',
  effectiveAt: 0,
});

describe('instrument identity on real mergers and a rename', () => {
  it('treats LTI and LTIM as one stock (same ISIN, symbol changed) but HDFC and HDFC Bank as two', () => {
    expect(idOf('LTI')).toBe(idOf('LTIM'));
    expect(idOf('HDFC')).not.toBe(idOf('HDFCBANK'));
    expect(idOf('MINDTREE')).not.toBe(idOf('LTI'));
    expect(identities).toHaveLength(4);
  });
});

describe('where an instrument ends', () => {
  // The recording is short, so the cease threshold is cut from 10 sessions to 3 for these cases.
  const ctx = (lastSession: string, actions: CorporateAction[] = []) => ({
    lastSession,
    actions,
    ...DEFAULT_LIFECYCLE,
    ceaseAfterSessions: 3,
  });
  const defaults = (lastSession: string) => ({ lastSession, actions: [], ...DEFAULT_LIFECYCLE });

  it('finds HDFC last traded on 2023-07-12 and links it to the merger when the action is known', () => {
    const known = lifecycleOf(
      idOf('HDFC'),
      bars('HDFC'),
      ctx('2023-07-18', [merger('HDFC', '2023-07-13')]),
    );
    expect(known).toMatchObject({ status: 'ceased_merger', lastSeen: '2023-07-12' });
    expect(known.reason).toContain('2023-07-13');
  });

  it('records an unexplained exit as unknown rather than guessing a reason', () => {
    const l = lifecycleOf(idOf('MINDTREE'), bars('MINDTREE'), ctx('2022-12-02'));
    expect(l).toMatchObject({ status: 'ceased_unknown', lastSeen: '2022-11-22' });
    expect(l.reason).toMatch(/confirm from another source/);
  });

  it('keeps a stock that still trades near the end of the data active', () => {
    const l = lifecycleOf(idOf('HDFCBANK'), bars('HDFCBANK'), ctx('2023-07-18'));
    expect(l).toMatchObject({ status: 'active', lastSeen: '2023-07-18', reason: '' });
    expect(delistingFields(l)).toEqual({ delistedOn: null, delistReason: null });
  });

  it('a stock is active until more than the allowed number of sessions pass without a bar', () => {
    const quiet = bars('MINDTREE'); // last bar 2022-11-22
    expect(lifecycleOf('m', quiet, defaults('2022-12-06')).status).toBe('active'); // 10 sessions later, still allowed
    expect(lifecycleOf('m', quiet, defaults('2022-12-07')).status).toBe('ceased_unknown'); // 11 sessions later
  });

  it('fills the delisting fields the instrument record needs (FR-U1)', () => {
    const l = lifecycleOf(
      idOf('HDFC'),
      bars('HDFC'),
      ctx('2023-07-18', [merger('HDFC', '2023-07-13')]),
    );
    expect(delistingFields(l)).toEqual({ delistedOn: '2023-07-12', delistReason: l.reason });
  });

  it('lists a long gap inside a series as a suspension', () => {
    const november = bars('HDFCBANK').filter((b) => b.date <= '2022-11-30');
    const withGap = november.filter((b) => b.date < '2022-11-10' || b.date > '2022-11-17');
    expect(lifecycleOf('x', withGap, ctx('2022-11-18')).gaps).toEqual([
      { from: '2022-11-09', to: '2022-11-18', sessions: 6 },
    ]);
    expect(lifecycleOf('x', november, ctx('2022-11-18')).gaps).toEqual([]);
    // the recording itself has two windows eight months apart, which is reported as one long gap
    expect(
      lifecycleOf('x', bars('HDFCBANK'), ctx('2023-07-18')).gaps.map((g) => g.sessions),
    ).toEqual([154]);
  });

  it('throws for an instrument with no bars', () => {
    expect(() => lifecycleOf('x', [], ctx('2022-11-18'))).toThrow(/no bars/);
  });
});

describe('the universe as it stood on a past date (survivorship control)', () => {
  const lives: Lifecycle[] = [
    lifecycleOf(idOf('HDFC'), bars('HDFC'), {
      lastSession: '2023-07-18',
      actions: [merger('HDFC', '2023-07-13')],
      ...DEFAULT_LIFECYCLE,
    }),
    lifecycleOf(idOf('HDFCBANK'), bars('HDFCBANK'), {
      lastSession: '2023-07-18',
      actions: [],
      ...DEFAULT_LIFECYCLE,
    }),
  ];
  const at = (date: string, recent = 5) => universeAsOf(lives, date, recent);

  it('includes HDFC on 2023-07-10 although it is delisted three sessions later', () => {
    expect(at('2023-07-10').alive).toContain(idOf('HDFC'));
    expect(at('2023-07-10').alive).toContain(idOf('HDFCBANK'));
  });

  it('keeps it on its last trading day and the next, and drops it once it has been silent longer than allowed', () => {
    expect(at('2023-07-12').alive).toContain(idOf('HDFC'));
    expect(at('2023-07-13').alive).toContain(idOf('HDFC')); // gone for one session only
    // three sessions of silence (07-13, 07-14, 07-17) is more than the two this call allows
    expect(at('2023-07-18', 2).ceasedBefore).toContain(idOf('HDFC'));
    expect(at('2023-07-18', 2).alive).toEqual([idOf('HDFCBANK')]);
    expect(at('2023-07-18').alive).toContain(idOf('HDFC')); // with the default five it is still recent
  });

  it('lists a stock that had not yet appeared as not yet listed', () => {
    const ltim = lifecycleOf(idOf('LTIM'), bars('LTIM'), {
      lastSession: '2023-07-18',
      actions: [],
      ...DEFAULT_LIFECYCLE,
    });
    expect(universeAsOf([ltim], '2022-11-01').notYetListed).toEqual([idOf('LTIM')]);
    expect(universeAsOf([ltim], '2022-11-10').alive).toEqual([idOf('LTIM')]);
  });
});
