import { describe, expect, it } from 'vitest';
import type { Lot } from '../domain/ledger';
import type { BarUnadj, CorporateAction } from '../domain/market';
import { adjustSeries, applyActionToLots } from './index';

/**
 * Arithmetic regression only. The prices and dates come from an unverified research response
 * (docs/data-sources/corporate_actions_reference_cases.csv); several dates are suspect, so these
 * cases prove the adjustment MATHS reproduces the stated factors, not that the events happened
 * on those dates. Prices are in paise.
 */
interface Case {
  name: string;
  actions: Array<Pick<CorporateAction, 'type' | 'ratio' | 'dividendPaisePerShare'>>;
  cumDate: string;
  exDate: string;
  cumClose: number;
  exClose: number;
  /** Theoretical ex-price in paise, as stated in the research response. */
  expectedCumAdjusted: number;
}

const r = (numerator: number, denominator = 1) => ({ numerator, denominator });
const none = { dividendPaisePerShare: null };

const cases: Case[] = [
  {
    name: 'TATASTEEL 1:10',
    actions: [{ type: 'split', ratio: r(10), ...none }],
    cumDate: '2022-07-27',
    exDate: '2022-07-28',
    cumClose: 95_940,
    exClose: 10_035,
    expectedCumAdjusted: 9_594,
  },
  {
    name: 'IRCTC 1:5',
    actions: [{ type: 'split', ratio: r(5), ...none }],
    cumDate: '2021-10-27',
    exDate: '2021-10-28',
    cumClose: 413_015,
    exClose: 91_350,
    expectedCumAdjusted: 82_603,
  },
  {
    name: 'NESTLEIND 1:10',
    actions: [{ type: 'split', ratio: r(10), ...none }],
    cumDate: '2024-01-04',
    exDate: '2024-01-05',
    cumClose: 2_710_990,
    exClose: 271_645,
    expectedCumAdjusted: 271_099,
  },
  {
    name: 'RELIANCE bonus 1:1',
    actions: [{ type: 'bonus', ratio: r(2), ...none }],
    cumDate: '2024-10-25',
    exDate: '2024-10-28',
    cumClose: 265_545,
    exClose: 132_790,
    expectedCumAdjusted: 132_773,
  },
  {
    name: 'BSE bonus 2:1',
    actions: [{ type: 'bonus', ratio: r(3), ...none }],
    cumDate: '2022-03-17',
    exDate: '2022-03-21',
    cumClose: 283_540,
    exClose: 93_520,
    expectedCumAdjusted: 94_513,
  },
  {
    name: 'GAIL bonus 1:2',
    actions: [{ type: 'bonus', ratio: r(3, 2), ...none }],
    cumDate: '2022-09-05',
    exDate: '2022-09-06',
    cumClose: 13_460,
    exClose: 9_125,
    expectedCumAdjusted: 8_973,
  },
  {
    name: 'NYKAA bonus 5:1',
    actions: [{ type: 'bonus', ratio: r(6), ...none }],
    cumDate: '2022-11-09',
    exDate: '2022-11-10',
    cumClose: 114_800,
    exClose: 19_590,
    expectedCumAdjusted: 19_133,
  },
  {
    name: 'BAJAJFINSV split 1:5 + bonus 1:1 on the same day',
    actions: [
      { type: 'split', ratio: r(5), ...none },
      { type: 'bonus', ratio: r(2), ...none },
    ],
    cumDate: '2022-09-12',
    exDate: '2022-09-13',
    cumClose: 1_713_810,
    exClose: 178_475,
    expectedCumAdjusted: 171_381,
  },
];

const dividendCases = [
  { name: 'VEDL dividend 31.50', dividend: 3_150, cumClose: 41_235, expected: 38_085 },
  { name: 'HINDZINC dividend 26.00', dividend: 2_600, cumClose: 31_855, expected: 29_255 },
];

function bars(cumDate: string, exDate: string, cumClose: number, exClose: number): BarUnadj[] {
  const make = (date: string, close: number): BarUnadj => ({
    instrumentId: 'i1',
    date,
    open: close,
    high: close,
    low: close,
    close,
    volume: 1_000,
    provider: 'test',
    snapshotId: 's',
    disputed: false,
    circuitFlag: 'none',
  });
  return [make(cumDate, cumClose), make(exDate, exClose)];
}

function actionsFor(c: Case): CorporateAction[] {
  return c.actions.map((a, i) => ({
    id: `a${String(i)}`,
    instrumentId: 'i1',
    type: a.type,
    exDate: c.exDate,
    ratio: a.ratio,
    dividendPaisePerShare: a.dividendPaisePerShare,
    source: 'unverified',
    effectiveAt: 0,
  }));
}

describe('stated adjustment factors (arithmetic regression)', () => {
  for (const c of cases) {
    it(`${c.name}: cum-date close adjusts to the stated theoretical ex-price`, () => {
      const adj = adjustSeries(bars(c.cumDate, c.exDate, c.cumClose, c.exClose), actionsFor(c), {
        includeDividends: false,
      });
      expect(Math.abs((adj[0]?.close ?? 0) - c.expectedCumAdjusted)).toBeLessThanOrEqual(0.51);
      expect(adj[1]?.close).toBe(c.exClose);
    });

    it(`${c.name}: a 100-share lot keeps its exact cost basis`, () => {
      const lot: Lot = {
        id: 'l',
        instrumentId: 'i1',
        openFillId: 'f',
        openedOn: '2020-01-01',
        quantityOriginal: 100,
        quantityRemaining: 100,
        unitCostPaise: c.cumClose,
        entryCostsPaise: 0,
        basisAdjustmentPaise: 0,
      };
      let applied: ReadonlySet<string> = new Set();
      let lots = [lot];
      for (const a of actionsFor(c)) {
        const res = applyActionToLots(lots, a, applied);
        lots = res.lots;
        applied = res.applied;
      }
      const out = lots[0] as Lot;
      expect(out.unitCostPaise * out.quantityRemaining + out.basisAdjustmentPaise).toBe(
        100 * c.cumClose,
      );
    });
  }

  for (const d of dividendCases) {
    it(`${d.name}: dividend-adjusted cum close equals cum close minus dividend`, () => {
      const action: CorporateAction = {
        id: 'd',
        instrumentId: 'i1',
        type: 'dividend',
        exDate: '2022-05-06',
        ratio: null,
        dividendPaisePerShare: d.dividend,
        source: 'unverified',
        effectiveAt: 0,
      };
      const adj = adjustSeries(
        bars('2022-05-05', '2022-05-06', d.cumClose, d.cumClose - d.dividend),
        [action],
        {
          includeDividends: true,
        },
      );
      expect(Math.abs((adj[0]?.close ?? 0) - d.expected)).toBeLessThan(1e-6);
    });
  }
});
