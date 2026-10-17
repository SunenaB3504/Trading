import { describe, expect, it } from 'vitest';
import {
  BUCKET_RULES_V1,
  annualisedVolatility,
  assignBucket,
  beta,
  bucketRulesHash,
  lowestFraction,
  simpleReturns,
} from './index';
import type { BucketInputs } from './index';

const base: BucketInputs = {
  instrumentId: 'A',
  asOf: '2024-01-02',
  amfiRank: 400,
  lowVolatility: false,
  beta: 1,
  gsmStage: null,
  asmStage: null,
  asmKnown: true,
  bandPct: 20,
  bandKnown: true,
  sector: null,
};
const run = (over: Partial<BucketInputs>) => assignBucket({ ...base, ...over });

describe('return statistics (hand-worked)', () => {
  it('computes simple returns and refuses a non-positive close', () => {
    const r = simpleReturns([100, 110, 99]);
    expect(r[0]).toBeCloseTo(0.1, 12);
    expect(r[1]).toBeCloseTo(-0.1, 12);
    expect(() => simpleReturns([100, 0])).toThrow(RangeError);
  });

  it('annualises a sample standard deviation', () => {
    // returns +1% and -1%: mean 0, sample variance 0.0002, sd 0.0141421..., x sqrt(252)
    const v = annualisedVolatility([0.01, -0.01]) as number;
    expect(v).toBeCloseTo(Math.sqrt(0.0002) * Math.sqrt(252), 12);
    expect(annualisedVolatility([0.01])).toBeNull();
  });

  it('gives a beta of exactly 2 for a stock that moves twice the market, and null without market moves', () => {
    const market = [0.01, -0.02, 0.015, 0.005, -0.01];
    expect(
      beta(
        market.map((m) => 2 * m),
        market,
      ),
    ).toBeCloseTo(2, 12);
    expect(
      beta(
        market.map((m) => -0.5 * m + 0.001),
        market,
      ),
    ).toBeCloseTo(-0.5, 12);
    expect(beta([0.01, 0.02], [0, 0])).toBeNull();
    expect(() => beta([1], [1, 2])).toThrow(RangeError);
  });
});

describe('lowest fraction of a group', () => {
  it('takes the lowest third, includes ties at the cut-off, and is empty for tiny groups', () => {
    const v = new Map([
      ['a', 5],
      ['b', 1],
      ['c', 3],
      ['d', 2],
      ['e', 9],
      ['f', 4],
    ]);
    expect([...lowestFraction(v, 1 / 3)].sort()).toEqual(['b', 'd']);
    const ties = new Map([
      ['a', 1],
      ['b', 2],
      ['c', 2],
      ['d', 8],
      ['e', 9],
      ['f', 10],
    ]);
    expect([...lowestFraction(ties, 1 / 3)].sort()).toEqual(['a', 'b', 'c']);
    expect(
      lowestFraction(
        new Map([
          ['a', 1],
          ['b', 2],
        ]),
        1 / 3,
      ).size,
    ).toBe(0);
  });
});

describe('bucket rules v1 (D35)', () => {
  it('puts a high-beta name in speculative whatever else is true', () => {
    const r = run({ beta: 1.5, amfiRank: 10, lowVolatility: true, sector: 'defence_aerospace' });
    expect(r.bucket).toBe('speculative');
    expect(r.reasons).toEqual(['beta']);
    expect(run({ beta: 1.49 }).bucket).toBeNull();
  });

  it('triggers on GSM stage 1 or more (not stage 0), any ASM stage, or a band of 5% or less', () => {
    expect(run({ gsmStage: 1 }).reasons).toEqual(['gsm']);
    expect(run({ gsmStage: 0 }).bucket).toBeNull();
    expect(run({ asmStage: 1 }).reasons).toEqual(['asm']);
    expect(run({ bandPct: 5 }).reasons).toEqual(['narrow_band']);
    expect(run({ bandPct: 10 }).bucket).toBeNull();
    expect(run({ gsmStage: 2, asmStage: 1, bandPct: 2, beta: 2 }).reasons).toEqual([
      'beta',
      'gsm',
      'asm',
      'narrow_band',
    ]);
  });

  it('applies sector buckets before size buckets, mundane before cyclicals', () => {
    expect(run({ sector: 'shipping_maritime' }).bucket).toBe('mundane');
    expect(run({ sector: 'fertilisers' }).bucket).toBe('cyclicals');
    expect(run({ sector: 'fertilisers', amfiRank: 400, lowVolatility: true }).bucket).toBe(
      'cyclicals',
    );
    expect(run({ sector: 'software' }).bucket).toBeNull();
  });

  it('puts a low-volatility small cap in underdogs and a low-volatility large cap in steady', () => {
    expect(run({ amfiRank: 251, lowVolatility: true }).bucket).toBe('underdogs');
    expect(run({ amfiRank: 250, lowVolatility: true }).bucket).toBeNull(); // mid cap
    expect(run({ amfiRank: 100, lowVolatility: true }).bucket).toBe('steady');
    expect(run({ amfiRank: 101, lowVolatility: true }).bucket).toBeNull();
    expect(run({ amfiRank: 400, lowVolatility: false }).bucket).toBeNull();
  });

  it('never reads an unknown as a pass and lists what was missing', () => {
    const r = run({
      amfiRank: null,
      lowVolatility: null,
      beta: null,
      bandPct: null,
      bandKnown: false,
      asmKnown: false,
    });
    expect(r.bucket).toBeNull();
    expect(r.partial).toEqual([
      'size_unknown',
      'volatility_unknown',
      'beta_unknown',
      'band_unknown',
      'asm_unknown',
      'sector_unknown',
    ]);
    expect(run({}).partial).toEqual(['sector_unknown']);
    // a security list that says "No Band" is knowledge, not a gap
    expect(run({ bandPct: null }).partial).toEqual(['sector_unknown']);
  });

  it('stamps the rules and a hash of the inputs, which changes with any input', () => {
    const a = run({});
    expect(a.ruleVersion).toBe('bucket-v1');
    expect(a.rulesHash).toBe(bucketRulesHash(BUCKET_RULES_V1));
    expect(run({}).inputsHash).toBe(a.inputsHash);
    expect(run({ beta: 1.0000004 }).inputsHash).toBe(a.inputsHash); // below the 6-decimal quantisation
    for (const over of [
      { amfiRank: 401 },
      { beta: 1.1 },
      { sector: 'x' },
      { asOf: '2024-01-03' },
      { bandPct: 10 },
    ])
      expect(run(over).inputsHash).not.toBe(a.inputsHash);
    expect(bucketRulesHash({ ...BUCKET_RULES_V1, steadyMaxRank: 50 })).not.toBe(a.rulesHash);
  });
});
