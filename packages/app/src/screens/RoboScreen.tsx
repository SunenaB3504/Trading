import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Sparkline } from '../charts/Sparkline';
import { formatPaise } from '../format/rupees';
import { catchUp } from '../robo/roboAccounts';
import type { RoboView } from '../robo/roboAccounts';
import type { KeyValueStore } from '../store/kv';
import { bpsText } from '../timeMachine/goals';
import type { Market } from '../trading/market';
import { CoachHint } from '../ui/CoachHint';
import { Note, Row, Section, colors } from '../ui/Section';

function Account({ v }: { v: RoboView }) {
  return (
    <Section title={v.def.name}>
      <View testID={`robo-${v.def.id}`}>
        <Text style={styles.blurb}>{v.def.blurb}</Text>
        <Row label="Value" value={formatPaise(v.valuePaise)} />
        <Row label="Return since it started" value={bpsText(v.returnBps)} />
        {v.vsIndexBps === null ? null : <Row label="Compared with the Index Benchmark" value={bpsText(v.vsIndexBps)} />}
        <Row label="Started, last session taken" value={`${v.startDate}, ${v.lastDate}`} />
        <Row label="Sessions taken" value={String(v.sessions)} />
        <Row label="Holding now" value={v.holdings.length === 0 ? 'nothing' : v.holdings.map((h) => `${v.def.id === 'index' ? '' : `${String(h.quantity)} `}${h.symbol} since ${h.since}`).join('; ')} />
      </View>
      <Sparkline values={v.curve.map((c) => c[1])} testID={`robo-curve-${v.def.id}`} />
      {v.recent.length === 0 ? null : <Text style={styles.recent}>{`Latest orders: ${v.recent.join('. ')}`}</Text>}
    </Section>
  );
}

/** Practise, Robo accounts (SSD v4.1 §6.4): five accounts run by fixed rules, brought up to date when the screen opens. */
export function RoboScreen({ kv, now, real }: { kv: KeyValueStore; now: () => number; real: Market | null }) {
  const [views, setViews] = useState<RoboView[] | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (real === null) return;
    let live = true;
    // Let the "catching up" text paint before the sessions are worked through.
    const timer = setTimeout(() => {
      catchUp(kv, real, now())
        .then((v) => live && setViews(v))
        .catch(() => live && setError('The accounts could not be brought up to date.'));
    }, 20);
    return () => {
      live = false;
      clearTimeout(timer);
    };
  }, [kv, real, now]);
  if (real === null)
    return (
      <View style={styles.page} testID="robo-screen">
        <Note>The Robo accounts need real prices. Choose real NSE prices in Practise, or fetch them in Settings, Data.</Note>
      </View>
    );
  return (
    <ScrollView contentContainerStyle={styles.page} testID="robo-screen">
      <CoachHint screen="robo" />
      <Note>Five accounts of ₹10,00,000 each, run by fixed rules and not by the AI. Every time prices are added, the sessions you missed are taken one after the other, each using only the prices known on that day.</Note>
      {views === null && error === '' ? <Text style={styles.recent} testID="robo-loading">Catching the accounts up to the latest prices…</Text> : null}
      {error === '' ? null : <Text style={styles.warn} testID="robo-error">{error}</Text>}
      {views?.map((v) => <Account key={v.def.id} v={v} />)}
      <Note>These accounts are practice only. How they did on past prices does not say how they will do next.</Note>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, maxWidth: 720, width: '100%', alignSelf: 'center' },
  blurb: { color: colors.muted, marginBottom: 6 },
  recent: { color: colors.muted, marginTop: 8 },
  warn: { color: colors.warn, marginTop: 8 },
});
