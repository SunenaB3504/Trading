import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BuilderError, buildPortfolio } from '@trading/core';
import type { BuilderComparison, FundsMarket, PricePoint, Rebalance } from '@trading/core';
import { formatPaise } from '../format/rupees';
import { BOND_ID, CASH_ID, bondSeries, calendarFor, cashSeries, fundSeries, shareSeries } from '../portfolio/series';
import { bpsText } from '../timeMachine/goals';
import type { Market } from '../trading/market';
import { Button } from '../ui/Button';
import { CoachHint } from '../ui/CoachHint';
import { Note, Row, Section, colors } from '../ui/Section';
import { Choice, Field } from './TradeScreen';

interface Holding {
  id: string;
  label: string;
}

const ETFS = ['NIFTYBEES', 'BANKBEES', 'GOLDBEES', 'LIQUIDBEES', 'RELIANCE', 'TCS'];
const FUNDS = ['120716', '118987'];
const PRESETS: Record<string, { label: string; weights: Record<string, string> }> = {
  nifty: { label: 'All in the Nifty 50 ETF', weights: { NIFTYBEES: '100' } },
  mixed: { label: 'Shares, gold and bonds', weights: { NIFTYBEES: '60', GOLDBEES: '10', [BOND_ID]: '30' } },
  cautious: { label: 'Mostly bonds and cash', weights: { NIFTYBEES: '20', [BOND_ID]: '50', [CASH_ID]: '30' } },
};
const REBALANCE: Record<Rebalance, string> = { none: 'Never', yearly: 'Every year', quarterly: 'Every quarter' };

function holdingsOf(m: Market, f: FundsMarket | null): Holding[] {
  const shares = ETFS.filter((s) => m.instruments.some((i) => m.symbols[i] === s)).map((s) => ({ id: s, label: s }));
  const funds = FUNDS.flatMap((c) => {
    const fund = f?.funds.find((x) => x.id === c);
    return fund === undefined ? [] : [{ id: `fund:${c}`, label: fund.name }];
  });
  return [...shares, ...funds, { id: BOND_ID, label: 'Bonds (a made-up steady yield)' }, { id: CASH_ID, label: 'Cash (a made-up savings rate)' }];
}

interface Inputs {
  weights: Record<string, string>;
  start: string;
  end: string;
  bond: string;
  cash: string;
  rebalance: Rebalance;
}

function run(m: Market, f: FundsMarket | null, i: Inputs): BuilderComparison | string {
  const used = Object.entries(i.weights).filter(([, w]) => w.trim() !== '' && Number(w) !== 0);
  const dates = calendarFor(m, i.start, i.end);
  const series: Record<string, readonly PricePoint[]> = {};
  for (const [id] of used) {
    series[id] = id === BOND_ID ? bondSeries(dates, Number(i.bond)) : id === CASH_ID ? cashSeries(dates, Number(i.cash)) : id.startsWith('fund:') ? (f === null ? [] : fundSeries(f, id.slice(5))) : shareSeries(m, id);
  }
  try {
    return buildPortfolio({ allocations: used.map(([id, w]) => ({ id, weightPct: Number(w) })), series, start: i.start, end: i.end, rebalance: i.rebalance });
  } catch (e) {
    return e instanceof BuilderError ? e.message : 'The mix could not be worked out.';
  }
}

/** Value of ₹1,00,000 at the last day of each calendar year of the run. */
function yearEnds(c: BuilderComparison['chosen']): Array<[string, string]> {
  const last = new Map<string, number>();
  for (const p of c.curve) last.set(p.date.slice(0, 4), p.value);
  return [...last].map(([y, v]) => [y, formatPaise(Math.round(v * 10_000_000))]);
}

function Result({ c }: { c: BuilderComparison }) {
  const r = c.chosen;
  return (
    <Section title={`Result, ${r.from} to ${r.to}`}>
      <View testID="builder-result">
        <Row label="Total return" value={bpsText(r.totalReturnBps)} />
        <Row label="Return per year" value={bpsText(r.yearlyReturnBps)} />
        <Row label="Worst fall" value={`${bpsText(r.worstFallBps)} (${r.peakDate} to ${r.troughDate})`} />
        <Row label="Time to get back" value={r.worstFallBps === 0 ? 'no fall' : r.recoveryDays === null ? 'not by the end' : `${String(r.recoveryDays)} days`} />
        <Row label="Without rebalancing" value={bpsText(c.withoutRebalancing.totalReturnBps)} />
        <Row label="Effect of rebalancing" value={bpsText(c.rebalancingEffectBps)} />
        {yearEnds(r).map(([y, v]) => (
          <Row key={y} label={`₹1,00,000 at the end of ${y}`} value={v} />
        ))}
      </View>
      <Note>Past prices only, with dividends and splits included and no charges, tax or rebalancing cost. The bond and cash lines are steady made-up rates. None of this says what a mix will do next.</Note>
    </Section>
  );
}

/** Practise, Portfolio Builder (SSD v4.1 §5.7): a mix of holdings run over a past period. */
export function BuilderScreen({ real, funds }: { real: Market | null; funds: FundsMarket | null }) {
  const [inputs, setInputs] = useState<Inputs>({ weights: PRESETS['mixed']?.weights ?? {}, start: '2015-01-01', end: real?.lastDate ?? '2026-01-01', bond: '7', cash: '3.5', rebalance: 'yearly' });
  const [result, setResult] = useState<BuilderComparison | string | null>(null);
  const holdings = useMemo(() => (real === null ? [] : holdingsOf(real, funds)), [real, funds]);
  if (real === null)
    return (
      <View style={styles.page} testID="builder-screen">
        <Note>The Portfolio Builder needs real prices. Choose real NSE prices in Practise, or fetch them in Settings, Data.</Note>
      </View>
    );
  const total = Object.values(inputs.weights).reduce((a, w) => a + (Number(w) || 0), 0);
  const setWeight = (id: string, w: string) => setInputs({ ...inputs, weights: { ...inputs.weights, [id]: w.replace(/[^0-9.]/g, '') } });
  return (
    <ScrollView contentContainerStyle={styles.page} testID="builder-screen">
      <CoachHint screen="builder" />
      <Section title="Example mixes">
        {Object.entries(PRESETS).map(([k, p]) => (
          <Button key={k} label={p.label} quiet onPress={() => setInputs({ ...inputs, weights: p.weights })} testID={`preset-${k}`} />
        ))}
      </Section>
      <Section title="Your mix (percent of the total)">
        {holdings.map((h) => (
          <Field key={h.id} label={h.label} value={inputs.weights[h.id] ?? ''} onChange={(w) => setWeight(h.id, w)} testID={`weight-${h.id}`} keyboard="decimal-pad" />
        ))}
        <Text style={total === 100 ? styles.ok : styles.warn} testID="builder-total">{`Total: ${String(total)}% (it must be 100)`}</Text>
      </Section>
      <Section title="Period and assumptions">
        <Field label="From (YYYY-MM-DD)" value={inputs.start} onChange={(start) => setInputs({ ...inputs, start })} testID="builder-start" />
        <Field label="To (YYYY-MM-DD)" value={inputs.end} onChange={(end) => setInputs({ ...inputs, end })} testID="builder-end" />
        <Field label="Bond yield per year (%)" value={inputs.bond} onChange={(bond) => setInputs({ ...inputs, bond })} testID="builder-bond" keyboard="decimal-pad" />
        <Field label="Cash rate per year (%)" value={inputs.cash} onChange={(cash) => setInputs({ ...inputs, cash })} testID="builder-cash" keyboard="decimal-pad" />
        <Choice label="Rebalance back to these weights" value={inputs.rebalance} options={['none', 'yearly', 'quarterly'] as const} labels={REBALANCE} onChange={(rebalance) => setInputs({ ...inputs, rebalance })} testID="builder-rebalance" />
      </Section>
      <Button label="Run this mix on past prices" onPress={() => setResult(run(real, funds, inputs))} testID="builder-run" />
      {typeof result === 'string' ? <Text style={styles.warn} testID="builder-error">{result}</Text> : null}
      {result !== null && typeof result !== 'string' ? <Result c={result} /> : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, maxWidth: 720, width: '100%', alignSelf: 'center' },
  ok: { color: colors.text, marginTop: 6 },
  warn: { color: colors.warn, marginTop: 6 },
});
