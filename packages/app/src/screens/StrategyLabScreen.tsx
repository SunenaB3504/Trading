import { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { BacktestError, DEFAULT_STRATEGY, ROBO_BENCHMARK, ROBO_CAPITAL_PAISE, addDays, backtest, strategyProblems } from '@trading/core';
import type { BacktestResult, StrategyParams } from '@trading/core';
import { Sparkline } from '../charts/Sparkline';
import { formatPaise } from '../format/rupees';
import { saveSandbox, setupFor } from '../robo/roboAccounts';
import type { KeyValueStore } from '../store/kv';
import { bpsText } from '../timeMachine/goals';
import type { Market } from '../trading/market';
import { Button } from '../ui/Button';
import { CoachHint } from '../ui/CoachHint';
import { Note, Row, Section, colors } from '../ui/Section';
import { Choice, Field } from './TradeScreen';

interface Inputs {
  lookback: string;
  volume: string;
  stop: string;
  trail: string;
  hold: string;
  cooloff: string;
  size: string;
  slots: string;
  entry: StrategyParams['entry'];
  from: string;
  to: string;
}

const ENTRY = { market: 'At the next open', limit_prev_close: 'Only at or below the last close' } as const;
const hundredths = (text: string): number => Math.round(Number(text) * 100);

export function inputsOf(p: StrategyParams, from: string, to: string): Inputs {
  return {
    lookback: String(p.lookbackSessions),
    volume: String(p.volumeMultipleX100 / 100),
    stop: String(p.stopBps / 100),
    trail: String(p.trailBps / 100),
    hold: String(p.maxHoldSessions),
    cooloff: String(p.cooloffSessions),
    size: String(p.positionBps / 100),
    slots: String(p.maxPositions),
    entry: p.entry,
    from,
    to,
  };
}

/** The typed settings as strategy settings (not yet checked). */
export function paramsOf(i: Inputs): StrategyParams {
  return {
    lookbackSessions: Number(i.lookback),
    volumeMultipleX100: hundredths(i.volume),
    stopBps: hundredths(i.stop),
    trailBps: hundredths(i.trail),
    maxHoldSessions: Number(i.hold),
    cooloffSessions: Number(i.cooloff),
    positionBps: hundredths(i.size),
    maxPositions: Number(i.slots),
    entry: i.entry,
  };
}

const pct = (x: number | null): string => (x === null ? 'not enough trades' : `${(x * 100).toFixed(1)}%`);

function Result({ r, seconds }: { r: BacktestResult; seconds: number }) {
  const t = r.trades;
  return (
    <Section title={`Result, ${r.from} to ${r.to}`}>
      <View testID="lab-result">
        <Row label="Start and end value" value={`${formatPaise(r.startPaise)} to ${formatPaise(r.endPaise)}`} />
        <Row label="Total return" value={bpsText(r.totalReturnBps)} />
        <Row label="Growth per year" value={r.cagrBps === null ? 'period too short' : bpsText(r.cagrBps)} />
        <Row label="Worst fall" value={bpsText(-r.maxDrawdownBps)} />
        <Row label="Sharpe ratio" value={r.sharpe === null ? 'not enough days' : r.sharpe.toFixed(2)} />
        <Row label="Trades closed" value={String(t.count)} />
        <Row label="Share that made money" value={pct(t.winRate)} />
        <Row label="Average win and loss" value={`${pct(t.avgWin)} and ${pct(t.avgLoss)}`} />
        <Row label="Charges paid" value={formatPaise(r.chargesPaise)} />
        <Row label="Still open at the end" value={String(r.openPositions)} />
        <Row label={`${ROBO_BENCHMARK} bought on day one and kept`} value={r.benchmark === null ? 'not available' : bpsText(r.benchmark.totalReturnBps)} />
        <Row label="Rules minus the Nifty ETF" value={r.benchmark === null ? 'not available' : bpsText(r.totalReturnBps - r.benchmark.totalReturnBps)} />
      </View>
      <Sparkline values={r.curve.map((c) => c[1])} testID="lab-curve" />
      <Text style={styles.note}>{`Took ${seconds.toFixed(1)} seconds. Same fills, charges and risk limits as practice trading.`}</Text>
    </Section>
  );
}

type Out = { r: BacktestResult; seconds: number } | string | null;

/** Checks the settings, then runs the test after the "running" text has had a chance to show. */
function startRun(real: Market, inputs: Inputs, show: (o: Out) => void, done: () => void): boolean {
  const params = paramsOf(inputs);
  const problems = strategyProblems(params);
  const setup = problems.length > 0 ? null : setupFor(real, 'sunil', params);
  if (setup === null) {
    show(problems.length > 0 ? problems.join(' ') : 'The Nifty 50 ETF is missing from these prices.');
    return false;
  }
  show(null);
  setTimeout(() => {
    try {
      const t0 = performance.now();
      const r = backtest({ ...setup, params }, inputs.from, inputs.to, real.instruments.find((i) => real.symbols[i] === ROBO_BENCHMARK));
      show({ r, seconds: (performance.now() - t0) / 1000 });
    } catch (e) {
      show(e instanceof BacktestError ? e.message : 'The test could not be run.');
    }
    done();
  }, 20);
  return true;
}

function RuleFields({ inputs, setInputs }: { inputs: Inputs; setInputs: (i: Inputs) => void }) {
  const set = (k: keyof Inputs) => (v: string) => setInputs({ ...inputs, [k]: v });
  return (
    <>
      <Section title="The rules">
        <Field label="Breakout: close above the highest high of this many days" value={inputs.lookback} onChange={set('lookback')} testID="lab-lookback" keyboard="numeric" />
        <Field label="Volume at least this many times the average" value={inputs.volume} onChange={set('volume')} testID="lab-volume" keyboard="decimal-pad" />
        <Field label="Stop-loss: sell when the close is this % below the buy price" value={inputs.stop} onChange={set('stop')} testID="lab-stop" keyboard="decimal-pad" />
        <Field label="Trailing stop: sell when the close is this % below the highest close" value={inputs.trail} onChange={set('trail')} testID="lab-trail" keyboard="decimal-pad" />
        <Field label="Longest hold (sessions)" value={inputs.hold} onChange={set('hold')} testID="lab-hold" keyboard="numeric" />
        <Field label="Cool-off after a sale (sessions)" value={inputs.cooloff} onChange={set('cooloff')} testID="lab-cooloff" keyboard="numeric" />
        <Field label="Size of each position (% of the account)" value={inputs.size} onChange={set('size')} testID="lab-size" keyboard="decimal-pad" />
        <Field label="Slots (most positions at once)" value={inputs.slots} onChange={set('slots')} testID="lab-slots" keyboard="numeric" />
        <Choice label="How it buys" value={inputs.entry} options={['market', 'limit_prev_close'] as const} labels={ENTRY} onChange={(entry) => setInputs({ ...inputs, entry })} testID="lab-entry" />
      </Section>
      <Section title="Period">
        <Field label="From (YYYY-MM-DD, not before 2020-04-01)" value={inputs.from} onChange={set('from')} testID="lab-from" />
        <Field label="To (YYYY-MM-DD)" value={inputs.to} onChange={set('to')} testID="lab-to" />
      </Section>
    </>
  );
}

/** Practise, Strategy Lab (SSD v4.1 §6.4): the breakout rules with your settings, run over past prices. */
export function StrategyLabScreen({ kv, now, real }: { kv: KeyValueStore; now: () => number; real: Market | null }) {
  const to = real?.lastDate ?? '2026-01-01';
  const from = real === null ? '2021-01-01' : [addDays(to, -5 * 365), real.firstTradeDate].reduce((a, b) => (a > b ? a : b));
  const [inputs, setInputs] = useState<Inputs>(inputsOf(DEFAULT_STRATEGY, from, to));
  const [out, setOut] = useState<Out>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState('');
  if (real === null)
    return (
      <View style={styles.page} testID="lab-screen">
        <Note>The Strategy Lab needs real prices. Choose real NSE prices in Practise, or fetch them in Settings, Data.</Note>
      </View>
    );
  const run = () => {
    if (!busy && startRun(real, inputs, setOut, () => setBusy(false))) setBusy(true);
  };
  const save = async () => {
    const problems = strategyProblems(paramsOf(inputs));
    if (problems.length === 0) await saveSandbox(kv, paramsOf(inputs), now());
    setSaved(problems.length > 0 ? problems.join(' ') : 'Saved. The Sandbox Robo account starts again with these settings.');
  };
  return (
    <ScrollView contentContainerStyle={styles.page} testID="lab-screen">
      <CoachHint screen="lab" />
      <Note>{`Each account here is a copy of ${formatPaise(ROBO_CAPITAL_PAISE)}. The rules look at the close of each day and place orders that fill at the next open.`}</Note>
      <RuleFields inputs={inputs} setInputs={setInputs} />
      <Button label={busy ? 'Running on past prices…' : 'Run on past prices'} onPress={run} testID="lab-run" />
      <Button label="Use these settings for the Sandbox account" quiet onPress={() => void save()} testID="lab-save" />
      {saved === '' ? null : <Text style={styles.note} testID="lab-saved">{saved}</Text>}
      {typeof out === 'string' ? <Text style={styles.warn} testID="lab-error">{out}</Text> : null}
      {out !== null && typeof out !== 'string' ? <Result r={out.r} seconds={out.seconds} /> : null}
      <Note>A test on past prices shows what the rules would have done, not what they will do. Changing the settings until the past looks good is called overfitting: the result will probably look worse on prices the rules have not seen.</Note>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, maxWidth: 720, width: '100%', alignSelf: 'center' },
  note: { color: colors.muted, marginTop: 8 },
  warn: { color: colors.warn, marginTop: 8 },
});
