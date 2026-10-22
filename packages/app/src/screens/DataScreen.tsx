import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text } from 'react-native';
import { readThrough } from '../dataClient/readThrough';
import type { Cached } from '../dataClient/readThrough';
import type { DataServiceClient, Health } from '../dataClient/client';
import type { KeyValueStore } from '../store/kv';
import { SNAPSHOT_CONFIG } from '../snapshotClient';
import { Note, Row, Section, colors } from '../ui/Section';
import { SnapshotSection } from './SnapshotSection';

type State =
  | { kind: 'loading' }
  | { kind: 'ready'; health: Cached<Health> }
  | { kind: 'unavailable'; reason: string };

function ageText(savedAt: number, now: number): string {
  const minutes = Math.max(0, Math.round((now - savedAt) / 60_000));
  return minutes < 1 ? 'just now' : `${minutes} min ago`;
}

export function DataScreen({
  client,
  kv,
  now,
}: {
  client: DataServiceClient;
  kv: KeyValueStore;
  now: () => number;
}) {
  const [state, setState] = useState<State>({ kind: 'loading' });
  const load = useCallback(async () => {
    setState({ kind: 'loading' });
    const r = await readThrough(kv, 'data-service/health', () => client.health(), now());
    setState(r.ok ? { kind: 'ready', health: r.data } : { kind: 'unavailable', reason: r.error });
  }, [client, kv, now]);
  useEffect(() => {
    void load();
  }, [load]);
  return (
    <ScrollView contentContainerStyle={styles.page} testID="data-screen">
      <Section title="Market data service">
        {state.kind === 'loading' ? <Note>Checking the data service...</Note> : null}
        {state.kind === 'unavailable' ? (
          <Note>{`The data service cannot be reached and nothing is saved yet (${state.reason}). Ledger views still work.`}</Note>
        ) : null}
        {state.kind === 'ready' ? <Ready health={state.health} now={now()} /> : null}
        <Pressable onPress={() => void load()} accessibilityRole="button" style={styles.button}>
          <Text style={styles.buttonText}>Check again</Text>
        </Pressable>
      </Section>
      <SnapshotSection config={SNAPSHOT_CONFIG} kv={kv} now={now} />
    </ScrollView>
  );
}

function Ready({ health, now }: { health: Cached<Health>; now: number }) {
  const h = health.value;
  return (
    <>
      <Row label="Status" value={health.stale ? 'Offline, showing last saved' : 'Connected'} />
      <Row label="Last checked" value={ageText(health.savedAt, now)} />
      <Row label="Instruments" value={String(h.instruments)} />
      <Row label="Snapshots" value={String(h.snapshots)} />
      {h.providers.map((p) => (
        <Row key={p.provider} label={`Provider ${p.provider}`} value={p.ok ? 'ok' : 'failing'} />
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, maxWidth: 720, width: '100%', alignSelf: 'center' },
  button: { marginTop: 12, minHeight: 44, justifyContent: 'center' },
  buttonText: { color: colors.accent, fontWeight: '600' },
});
