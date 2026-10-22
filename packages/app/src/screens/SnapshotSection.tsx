import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { istDateOfInstant } from '@trading/core';
import {
  auditedFetch,
  pinnedEd25519,
  pullSnapshot,
  readVerified,
  snapshotStatus,
} from '../snapshotClient';
import type { Manifest, PullResult, SnapshotConfig } from '../snapshotClient';
import type { KeyValueStore } from '../store/kv';
import { Note, Row, Section, colors } from '../ui/Section';

/** The daily snapshot on the Data tab (WP-3.9): what is stored, how old it is, the last problem, and what was sent. */
export function SnapshotSection({
  config,
  kv,
  now,
}: {
  config: SnapshotConfig;
  kv: KeyValueStore;
  now: () => number;
}) {
  const [stored, setStored] = useState<Manifest | null>(null);
  const [last, setLast] = useState<PullResult | null>(null);
  const [sent, setSent] = useState<string[]>([]);
  const verifier = useMemo(() => pinnedEd25519(config.keys), [config]);
  const configured = config.origin !== null;
  const load = useCallback(async () => {
    setStored((await readVerified(kv, verifier))?.manifest ?? null);
  }, [kv, verifier]);
  useEffect(() => {
    void load();
  }, [load]);
  const pull = useCallback(async () => {
    if (config.origin === null) return;
    const net = auditedFetch(config.origin, (url, init) => fetch(url, init));
    setLast(
      await pullSnapshot({
        net,
        origin: config.origin,
        verifier,
        kv,
        today: istDateOfInstant(now()),
      }),
    );
    setSent(net.sent.map((s) => `${s.method} ${s.url}`));
    await load();
  }, [config.origin, verifier, kv, now, load]);
  const status = snapshotStatus(configured, stored, istDateOfInstant(now()), last);
  return (
    <Section title="Daily snapshot">
      <Note>{status.headline}</Note>
      {status.asOf !== null ? <Row label="Up to" value={status.asOf} /> : null}
      {status.sessionsBehind !== null ? (
        <Row label="Sessions behind" value={String(status.sessionsBehind)} />
      ) : null}
      {status.lastProblem !== null ? (
        <Note>{`The last try kept the previous snapshot: ${status.lastProblem}.`}</Note>
      ) : null}
      {configured ? (
        <Pressable onPress={() => void pull()} accessibilityRole="button" style={styles.button}>
          <Text style={styles.buttonText}>Download latest</Text>
        </Pressable>
      ) : null}
      {sent.map((line) => (
        <Row key={line} label="Sent" value={line} />
      ))}
    </Section>
  );
}

const styles = StyleSheet.create({
  button: { marginTop: 12, minHeight: 44, justifyContent: 'center' },
  buttonText: { color: colors.accent, fontWeight: '600' },
});
