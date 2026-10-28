import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { STRATEGIES, UNDERLYINGS, analyse, payoffAtExpiry, payoffToday } from '@trading/core';
import type { Analysis, Leg, StrategyId, UnderlyingId } from '@trading/core';
import { RATE, labGreeks, labLegs } from '../fno/optionsLab';
import type { LabInputs } from '../fno/optionsLab';
import { Button } from '../ui/Button';
import { CoachHint } from '../ui/CoachHint';
import { Note, Row, Section, colors } from '../ui/Section';
import { Choice, Field } from './TradeScreen';

const DEFAULT_SPOT: Record<UnderlyingId, number> = { NIFTY: 22_600, BANKNIFTY: 51_000 };
const POINTS = 41;
const HEIGHT = 120;

const inr = (x: number): string => `${x < 0 ? '-' : ''}₹${Math.abs(Math.round(x)).toLocaleString('en-IN')}`;
const limit = (x: number | null, what: string): string => (x === null ? `Unlimited ${what}` : inr(x));

function Chart({ values, extra }: { values: readonly number[]; extra: readonly number[] }) {
  const peak = Math.max(1, ...values.map(Math.abs), ...extra.map(Math.abs));
  const mid = HEIGHT / 2;
  const bar = (v: number, left: string, color: string, key: string) => {
    const h = (Math.abs(v) / peak) * mid;
    return <View key={key} style={{ position: 'absolute', left: left as `${number}%`, width: '1.2%', height: Math.max(1, h), top: v >= 0 ? mid - h : mid, backgroundColor: color }} />;
  };
  return (
    <View style={styles.chart} testID="lab-payoff">
      <View style={[styles.axis, { top: mid }]} />
      {values.map((v, k) => bar(v, `${String((k / POINTS) * 100)}%`, colors.accent, `e${String(k)}`))}
      {extra.map((v, k) => bar(v, `${String((k / POINTS) * 100 + 1.2)}%`, '#c77d00', `t${String(k)}`))}
    </View>
  );
}

function Summary({ a, legs, lot }: { a: Analysis; legs: readonly Leg[]; lot: number }) {
  return (
    <View testID="optlab-summary">
      <Row label="Legs (premium a unit)" value={legs.map((l) => `${l.qty > 0 ? '+' : ''}${String(l.qty)} ${l.kind === 'UNDERLYING' ? 'index' : `${String(l.strike)} ${l.kind}`} @ ${l.premium.toFixed(2)}`).join(', ')} />
      <Row label={a.netDebit >= 0 ? 'Cost to open' : 'Premium received'} value={inr(Math.abs(a.netDebit))} />
      <Row label="Breakeven at expiry" value={a.breakevens.length === 0 ? 'none' : a.breakevens.map((b) => Math.round(b).toLocaleString('en-IN')).join(' and ')} />
      <Row label="Most you can make" value={limit(a.maxProfit, 'profit')} />
      <Row label="Most you can lose" value={limit(a.maxLoss, 'loss')} />
      <Row label="Units in one lot" value={String(lot)} />
    </View>
  );
}

const numberOr = (text: string, fallback: number): number => (Number.isFinite(Number(text)) && text.trim() !== '' ? Number(text) : fallback);

/** Practise, Options Lab (SSD v4.1 §5.6): payoff today and at expiry for a ready-made strategy, with Greeks. */
export function OptionsLabScreen({ spotOf }: { spotOf?: (u: UnderlyingId) => number | null }) {
  const [strategy, setStrategy] = useState<StrategyId>('long_call');
  const [index, setIndex] = useState<UnderlyingId>('NIFTY');
  const [spotText, setSpotText] = useState(String(Math.round(spotOf?.('NIFTY') ?? DEFAULT_SPOT.NIFTY)));
  const [vol, setVol] = useState(18);
  const [days, setDays] = useState(30);
  const [lotsText, setLotsText] = useState('1');
  const inputs: LabInputs = { strategy, index, spot: Math.max(1, numberOr(spotText, DEFAULT_SPOT[index])), volPct: vol, days, lots: Math.max(1, Math.floor(numberOr(lotsText, 1))) };
  const view = useMemo(() => {
    const legs = labLegs(inputs);
    const lot = UNDERLYINGS[inputs.index].lot;
    const xs = Array.from({ length: POINTS }, (_, k) => inputs.spot * (0.88 + (0.24 * k) / (POINTS - 1)));
    const t = { days: Math.max(days, 0), vol: vol / 100, rate: RATE };
    return { legs, lot, a: analyse(legs, lot, inputs.spot), expiry: xs.map((x) => payoffAtExpiry(legs, x, lot)), today: xs.map((x) => payoffToday(legs, x, lot, t)), g: labGreeks(legs, inputs) };
  }, [strategy, index, spotText, vol, days, lotsText]);
  const pickIndex = (u: UnderlyingId) => {
    setIndex(u);
    setSpotText(String(Math.round(spotOf?.(u) ?? DEFAULT_SPOT[u])));
  };
  const labels = Object.fromEntries(STRATEGIES.map((s) => [s.id, s.name]));
  return (
    <ScrollView contentContainerStyle={styles.page} testID="optlab-screen">
      <CoachHint screen="optionslab" />
      <Section title="Strategy">
        <Choice label="Strategy" value={strategy} options={STRATEGIES.map((s) => s.id)} labels={labels} onChange={setStrategy} testID="optlab-strategy" />
        <Text style={styles.note} testID="optlab-view">{STRATEGIES.find((s) => s.id === strategy)?.view ?? ''}</Text>
        <Choice label="Index" value={index} options={['NIFTY', 'BANKNIFTY'] as const} labels={{ NIFTY: 'Nifty 50', BANKNIFTY: 'Bank Nifty' }} onChange={pickIndex} testID="optlab-index" />
        <Field label="Index level now" value={spotText} onChange={setSpotText} testID="optlab-spot" keyboard="numeric" />
        <Field label="Lots" value={lotsText} onChange={setLotsText} testID="optlab-lots" keyboard="numeric" />
      </Section>
      <Section title="What changes the price">
        <Row label="Days left to expiry" value={String(days)} />
        <View style={styles.bar}>
          <Button label="Days -5" quiet onPress={() => setDays(Math.max(0, days - 5))} testID="optlab-days-down" />
          <Button label="Days +5" quiet onPress={() => setDays(Math.min(90, days + 5))} testID="optlab-days-up" />
        </View>
        <Row label="Volatility (yearly)" value={`${String(vol)}%`} />
        <View style={styles.bar}>
          <Button label="Volatility -2" quiet onPress={() => setVol(Math.max(5, vol - 2))} testID="optlab-vol-down" />
          <Button label="Volatility +2" quiet onPress={() => setVol(Math.min(80, vol + 2))} testID="optlab-vol-up" />
        </View>
      </Section>
      <Section title="Profit or loss at each index level">
        <Chart values={view.expiry} extra={view.today} />
        <Text style={styles.note}>{`Blue: at expiry. Orange: today, with ${String(days)} days left and ${String(vol)}% volatility. From ${Math.round(inputs.spot * 0.88).toLocaleString('en-IN')} to ${Math.round(inputs.spot * 1.12).toLocaleString('en-IN')}.`}</Text>
        <Summary a={view.a} legs={view.legs} lot={view.lot} />
      </Section>
      <Section title="Greeks of the whole position">
        <View testID="optlab-greeks">
          <Row label="Delta (index units)" value={view.g.delta.toFixed(1)} />
          <Row label="Theta a day" value={inr(view.g.theta)} />
          <Row label="Vega for 1 volatility point" value={inr(view.g.vega)} />
        </View>
        <Note>Change the days and volatility to watch time and volatility move the orange line while the blue line stays put.</Note>
      </Section>
      <Note>Prices are modelled with Black-Scholes at the volatility above. They show how the numbers move, not what the exchange will quote.</Note>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, maxWidth: 720, width: '100%', alignSelf: 'center' },
  note: { color: colors.muted, marginTop: 8 },
  bar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginVertical: 8 },
  chart: { height: HEIGHT, position: 'relative', borderWidth: 1, borderColor: colors.line, marginVertical: 8 },
  axis: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: colors.line },
});
