import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { FNO_SCENARIOS } from '@trading/content';
import type { FnoScenario } from '@trading/content';
import { addDays } from '@trading/core';
import type { FnoData } from '@trading/core';
import { createFno, deleteFno, fnoDataOf, listFno, saveFno, snapRange } from '../fno/fnoSessions';
import type { FnoSession } from '../fno/fnoSessions';
import type { KeyValueStore } from '../store/kv';
import type { Market } from '../trading/market';
import { Button } from '../ui/Button';
import { Note, Section, colors } from '../ui/Section';
import { Field } from './TradeScreen';
import { FnoDesk } from './FnoDesk';

function ScenarioCards({ data, onStart }: { data: FnoData; onStart: (s: FnoScenario) => void }) {
  const last = data.dates[data.dates.length - 1] ?? '';
  return (
    <Section title="Scenarios">
      {FNO_SCENARIOS.map((s) => {
        const ok = snapRange(data, s.start, s.end) !== null && s.end <= last;
        return (
          <View key={s.id} style={styles.card}>
            <Text style={styles.cardTitle}>{s.title}</Text>
            <Text style={styles.note}>{s.brief}</Text>
            <Text style={styles.note}>{`Goal: ${s.goalText}`}</Text>
            {ok ? <Button label="Start this scenario" onPress={() => onStart(s)} testID={`fno-scn-${s.id}`} /> : <Note>These prices do not cover this period. Fetch more in Settings, Data.</Note>}
          </View>
        );
      })}
    </Section>
  );
}

function FreeSession({ data, onStart }: { data: FnoData; onStart: (from: string, to: string) => string | null }) {
  const last = data.dates[data.dates.length - 1] ?? '2026-01-01';
  const [from, setFrom] = useState(addDays(last, -120));
  const [to, setTo] = useState(last);
  const [problem, setProblem] = useState('');
  return (
    <Section title="Free session">
      <Note>Trade Nifty and Bank Nifty futures and options over a period you choose, with ₹10,00,000 of practice money.</Note>
      <Field label="From (YYYY-MM-DD)" value={from} onChange={setFrom} testID="fno-from" />
      <Field label="To (YYYY-MM-DD)" value={to} onChange={setTo} testID="fno-to" />
      <Button label="Start a free session" onPress={() => setProblem(onStart(from, to) ?? '')} testID="fno-new" />
      {problem === '' ? null : <Text style={styles.warn} testID="fno-new-problem">{problem}</Text>}
    </Section>
  );
}

function SessionList({ sessions, onOpen, onDelete }: { sessions: FnoSession[]; onOpen: (id: string) => void; onDelete: (id: string) => void }) {
  if (sessions.length === 0) return null;
  return (
    <Section title="Your sessions">
      <View testID="fno-sessions">
        {sessions.map((s) => (
          <View key={s.id} style={styles.card}>
            <Text style={styles.cardTitle}>{s.title}</Text>
            <Text style={styles.note}>{`${s.start} to ${s.end}, now at ${s.current}, ${String(s.orders.length)} order(s)`}</Text>
            <View style={styles.bar}>
              <Button label="Open" onPress={() => onOpen(s.id)} testID={`fno-open-${s.id}`} />
              <Button label="Delete" quiet danger onPress={() => onDelete(s.id)} testID={`fno-delete-${s.id}`} />
            </View>
          </View>
        ))}
      </View>
    </Section>
  );
}

/** Practise, F&O (SSD v4.1 §5.3): futures and options sessions on modelled prices, saved with the profile. */
export function FnoScreen({ kv, now, real }: { kv: KeyValueStore; now: () => number; real: Market | null }) {
  const data = useMemo(() => fnoDataOf(real), [real]);
  const [sessions, setSessions] = useState<FnoSession[]>([]);
  const [openId, setOpenId] = useState<string | null>(null);
  const reload = useCallback(() => void listFno(kv).then(setSessions), [kv]);
  useEffect(reload, [reload]);
  if (data === null)
    return (
      <View style={styles.page} testID="fno-screen">
        <Note>F&O practice needs real prices for the Nifty 50 ETF (NIFTYBEES) and the Bank Nifty ETF (BANKBEES). Choose real NSE prices in Practise, or fetch them in Settings, Data.</Note>
      </View>
    );
  const start = async (title: string, scenarioId: string | null, underlyings: FnoSession['underlyings'], range: { start: string; end: string }) => {
    const made = await createFno(kv, { title, scenarioId, underlyings, ...range }, now());
    reload();
    setOpenId(made.id);
  };
  const open = sessions.find((s) => s.id === openId) ?? null;
  const change = (s: FnoSession) => {
    setSessions((all) => all.map((x) => (x.id === s.id ? s : x)));
    void saveFno(kv, s.current >= s.end && s.finishedAt === null ? { ...s, finishedAt: now() } : s, now());
  };
  if (open !== null) {
    return (
      <ScrollView contentContainerStyle={styles.page} testID="fno-screen">
        <FnoDesk session={open} data={data} onChange={change} onClose={() => setOpenId(null)} />
      </ScrollView>
    );
  }
  const startFree = (from: string, to: string): string | null => {
    const range = snapRange(data, from, to);
    if (range === null) return 'There are fewer than two sessions with prices in that period.';
    void start(`Free session ${range.start} to ${range.end}`, null, ['NIFTY', 'BANKNIFTY'], range);
    return null;
  };
  const startScenario = (s: FnoScenario) => {
    const range = snapRange(data, s.start, s.end);
    if (range !== null) void start(s.title, s.id, [...s.underlyings], range);
  };
  return (
    <ScrollView contentContainerStyle={styles.page} testID="fno-screen">
      <Note>Futures and options carry a high risk of loss. Prices here are modelled, not taken from the exchange.</Note>
      <SessionList sessions={sessions} onOpen={setOpenId} onDelete={(id) => void deleteFno(kv, id, now()).then(reload)} />
      <FreeSession data={data} onStart={startFree} />
      <ScenarioCards data={data} onStart={startScenario} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, maxWidth: 720, width: '100%', alignSelf: 'center' },
  card: { borderWidth: 1, borderColor: colors.line, borderRadius: 6, padding: 12, marginBottom: 12 },
  cardTitle: { fontWeight: '600', color: colors.text },
  note: { color: colors.muted, marginTop: 6 },
  warn: { color: colors.warn, marginTop: 8 },
  bar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
});
