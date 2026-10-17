import { describe, expect, it } from 'vitest';
import type { Lot } from '../domain/ledger';
import type { BarUnadj, CorporateAction } from '../domain/market';
import { adjustSeries, applyActionToLots } from './index';

/**
 * Real-data regression. The closes below are the actual NSE equity-series closing prices (paise)
 * from the exchange's daily bhavcopy, fetched 2026-10-17 (docs/data-sources/
 * corporate_actions_reference_cases.csv). The ex-dates are the sessions on which the price fell by
 * about the split or bonus factor. Each case checks that our adjustment reproduces the exact
 * arithmetic factor and that, after adjustment, the first ex-day move is an ordinary one.
 */
interface Case {
  name: string;
  actions: Array<Pick<CorporateAction, 'type' | 'ratio' | 'dividendPaisePerShare'>>;
  cumDate: string;
  exDate: string;
  cumClose: number;
  exClose: number;
  /** Shares after over shares before, as a fraction: 10/1 for a 1-into-10 split. */
  factor: [number, number];
}

const r = (numerator: number, denominator = 1) => ({ numerator, denominator });
const none = { dividendPaisePerShare: null };

const cases: Case[] = [
  {
    name: 'TATASTEEL 1:10 split',
    actions: [{ type: 'split', ratio: r(10), ...none }],
    cumDate: '2022-07-27',
    exDate: '2022-07-28',
    cumClose: 95_940,
    exClose: 10_035,
    factor: [10, 1],
  },
  {
    name: 'IRCTC 1:5 split',
    actions: [{ type: 'split', ratio: r(5), ...none }],
    cumDate: '2021-10-27',
    exDate: '2021-10-28',
    cumClose: 413_015,
    exClose: 91_350,
    factor: [5, 1],
  },
  {
    name: 'NESTLEIND 1:10 split',
    actions: [{ type: 'split', ratio: r(10), ...none }],
    cumDate: '2024-01-04',
    exDate: '2024-01-05',
    cumClose: 2_711_640,
    exClose: 266_640,
    factor: [10, 1],
  },
  {
    name: 'RELIANCE 1:1 bonus',
    actions: [{ type: 'bonus', ratio: r(2), ...none }],
    cumDate: '2024-10-25',
    exDate: '2024-10-28',
    cumClose: 265_570,
    exClose: 133_435,
    factor: [2, 1],
  },
  {
    name: 'BSE 2:1 bonus',
    actions: [{ type: 'bonus', ratio: r(3), ...none }],
    cumDate: '2022-03-17',
    exDate: '2022-03-21',
    cumClose: 282_660,
    exClose: 93_805,
    factor: [3, 1],
  },
  {
    name: 'GAIL 1:2 bonus',
    actions: [{ type: 'bonus', ratio: r(3, 2), ...none }],
    cumDate: '2022-09-05',
    exDate: '2022-09-06',
    cumClose: 13_675,
    exClose: 9_305,
    factor: [3, 2],
  },
  {
    name: 'NYKAA 5:1 bonus',
    actions: [{ type: 'bonus', ratio: r(6), ...none }],
    cumDate: '2022-11-09',
    exDate: '2022-11-10',
    cumClose: 106_030,
    exClose: 18_825,
    factor: [6, 1],
  },
  {
    name: 'BAJAJFINSV 1:5 split and 1:1 bonus on the same day',
    actions: [
      { type: 'split', ratio: r(5), ...none },
      { type: 'bonus', ratio: r(2), ...none },
    ],
    cumDate: '2022-09-12',
    exDate: '2022-09-13',
    cumClose: 1_713_805,
    exClose: 178_475,
    factor: [10, 1],
  },
];

const dividendCases = [
  {
    name: 'VEDL dividend Rs 31.50',
    exDate: '2022-05-06',
    dividend: 3_150,
    cumClose: 40_520,
    exClose: 36_040,
  },
  {
    name: 'HINDZINC dividend Rs 26.00',
    exDate: '2023-03-29',
    dividend: 2_600,
    cumClose: 32_880,
    exClose: 29_900,
  },
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
    provider: 'nse-bhavcopy',
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
    source: 'NSE bhavcopy',
    effectiveAt: 0,
  }));
}

describe('split and bonus adjustment against real NSE closes', () => {
  for (const c of cases) {
    it(`${c.name}: exact factor, and an ordinary move on the ex-day`, () => {
      const adj = adjustSeries(bars(c.cumDate, c.exDate, c.cumClose, c.exClose), actionsFor(c), {
        includeDividends: false,
      });
      const expected = (c.cumClose * c.factor[1]) / c.factor[0];
      expect(Math.abs((adj[0]?.close ?? 0) - expected)).toBeLessThan(1e-6);
      expect(adj[1]?.close).toBe(c.exClose);
      // After adjusting for the split, the ex-day return is a normal daily move, not a 5x or 10x jump.
      expect(Math.abs(c.exClose / expected - 1)).toBeLessThan(0.12);
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
      expect(out.quantityRemaining).toBe((100 * c.factor[0]) / c.factor[1]);
      expect(out.unitCostPaise * out.quantityRemaining + out.basisAdjustmentPaise).toBe(
        100 * c.cumClose,
      );
    });
  }
});

describe('dividend adjustment against real NSE closes', () => {
  for (const d of dividendCases) {
    it(`${d.name}: cum close less the dividend, and an ordinary ex-day move`, () => {
      const action: CorporateAction = {
        id: 'd',
        instrumentId: 'i1',
        type: 'dividend',
        exDate: d.exDate,
        ratio: null,
        dividendPaisePerShare: d.dividend,
        source: 'NSE bhavcopy',
        effectiveAt: 0,
      };
      const adj = adjustSeries(bars('2020-01-01', d.exDate, d.cumClose, d.exClose), [action], {
        includeDividends: true,
      });
      expect(Math.abs((adj[0]?.close ?? 0) - (d.cumClose - d.dividend))).toBeLessThan(1e-6);
      expect(Math.abs(d.exClose / (d.cumClose - d.dividend) - 1)).toBeLessThan(0.05);
    });
  }
});
