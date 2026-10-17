import { buildFixtureScenario, runReplay } from '@trading/core';
import { useEffect, useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { putStamped } from '../store/kv';
import type { KeyValueStore } from '../store/kv';
import { Note, Row, Section, colors } from '../ui/Section';
import { toLedgerView } from '../viewModels/ledgerView';
import type { PositionRow } from '../viewModels/ledgerView';

export const LEDGER_KEY = 'ledger-view/demo';

/** The ledger is computed on the device from a frozen snapshot, so it opens with no network (NFR-6). */
function useDemoLedger() {
  return useMemo(() => {
    const s = buildFixtureScenario();
    return toLedgerView(runReplay(s.snapshot, s.orders, s.config));
  }, []);
}

function PositionLine({ p }: { p: PositionRow }) {
  return (
    <View style={styles.position}>
      <Text style={styles.symbol}>{p.instrumentId}</Text>
      <Text style={styles.detail}>
        {p.quantity} shares, basis {p.basis}, mark {p.mark}
      </Text>
      <Text style={styles.detail}>
        value {p.value}, unrealised {p.unrealised}
      </Text>
    </View>
  );
}

export function LedgerScreen({ kv, now }: { kv: KeyValueStore; now: () => number }) {
  const view = useDemoLedger();
  useEffect(() => {
    void putStamped(kv, LEDGER_KEY, view, now());
  }, [kv, now, view]);
  return (
    <ScrollView contentContainerStyle={styles.page} testID="ledger-screen">
      <Section title="Own trades (Ledger A), demo scenario">
        {view.totals.map((r) => (
          <Row key={r.label} label={r.label} value={r.value} />
        ))}
        <Note>Virtual money. Not investment advice.</Note>
      </Section>
      <Section title="Open positions">
        {view.positions.length === 0 ? <Note>No open positions.</Note> : null}
        {view.positions.map((p) => (
          <PositionLine key={p.instrumentId} p={p} />
        ))}
      </Section>
      <Section title="Orders">
        {view.outcomes.map((r) => (
          <Row key={r.label} label={r.label} value={r.value} />
        ))}
      </Section>
      <Section title="Closed trades">
        {view.trades.map((r) => (
          <Row key={r.label} label={r.label} value={r.value} />
        ))}
      </Section>
      <Note>{`Data snapshot ${view.snapshotId}. Report hash ${view.reportHash}.`}</Note>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, maxWidth: 720, width: '100%', alignSelf: 'center' },
  position: { paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: colors.line },
  symbol: { fontWeight: '600', color: colors.text },
  detail: { color: colors.muted, fontSize: 13 },
});
