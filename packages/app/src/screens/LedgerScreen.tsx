import { buildFixtureScenario, runReplay } from '@trading/core';
import { useEffect, useMemo, useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { putStamped } from '../store/kv';
import type { KeyValueStore } from '../store/kv';
import { Note, Row, Section, colors } from '../ui/Section';
import { toLedgerView } from '../viewModels/ledgerView';
import type { PositionRow } from '../viewModels/ledgerView';
import { CoachHint } from '../ui/CoachHint';

export const LEDGER_KEY = 'ledger-view/demo';

/** The ledger is computed on the device from a frozen snapshot, so it opens with no network (NFR-6). */
function useDemoLedger() {
  return useMemo(() => {
    const s = buildFixtureScenario();
    return toLedgerView(runReplay(s.snapshot, s.orders, s.config));
  }, []);
}

/** “1 lot”, “3 lots”; the popup title adds “open”. */
const lotsText = (n: number, open: boolean): string =>
  `${String(n)} ${open ? 'open ' : ''}${n === 1 ? 'lot' : 'lots'}`;

function LotsPopup({ p, onClose }: { p: PositionRow; onClose: () => void }) {
  // On the web the modal only hears Esc while focus is inside it, which it is not after a tap on the link.
  useEffect(() => {
    if (typeof document === 'undefined') return undefined;
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible>
      <Pressable accessibilityLabel="Close lots" onPress={onClose} style={styles.backdrop}>
        <Pressable style={styles.sheet} testID="lots-popup">
          <ScrollView>
            <Text
              style={styles.symbol}
            >{`${p.instrumentId}: ${lotsText(p.lots.count, true)}`}</Text>
            <Note>{p.lots.nextSale}</Note>
            {p.lots.groups.map((g) => (
              <View key={g.month}>
                <Text style={styles.month}>{g.month}</Text>
                {g.lots.map((l, i) => (
                  <Text key={`${l.openedOn}-${String(i)}`} style={styles.detail}>
                    {`${l.openedOn}: ${l.shares} shares at ${l.price}, basis ${l.basis}`}
                  </Text>
                ))}
              </View>
            ))}
            {p.lots.sold.length > 0 ? (
              <View>
                <Text style={styles.month}>Sold pieces</Text>
                {p.lots.sold.map((r, i) => (
                  <Text key={`${r.closedOn}-${String(i)}`} style={styles.detail}>
                    {`${r.closedOn}: ${r.shares} shares, proceeds ${r.proceeds}, net ${r.net}`}
                  </Text>
                ))}
              </View>
            ) : null}
          </ScrollView>
          <Pressable
            accessibilityRole="button"
            onPress={onClose}
            style={styles.close}
            testID="lots-close"
          >
            <Text style={styles.closeText}>Close</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

function PositionLine({ p }: { p: PositionRow }) {
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.position}>
      <Text style={styles.symbol}>{p.instrumentId}</Text>
      <Text style={styles.detail}>
        {p.quantity} shares, average {p.average}, basis {p.basis}, mark {p.mark}
      </Text>
      <Text style={styles.detail}>
        value {p.value}, unrealised {p.unrealised}
      </Text>
      <Pressable
        accessibilityRole="button"
        onPress={() => setOpen(true)}
        style={styles.link}
        testID={`lots-${p.instrumentId}`}
      >
        <Text style={styles.linkText}>{lotsText(p.lots.count, false)}</Text>
      </Pressable>
      {open ? <LotsPopup p={p} onClose={() => setOpen(false)} /> : null}
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
      <CoachHint screen="ledger" />
      <Section title="Own trades (Ledger A), demo scenario">
        {view.totals.map((r) => (
          <Row key={r.label} label={r.label} value={r.value} />
        ))}
        <Note>Virtual money. Not investment advice.</Note>
        <Note>
          This is a fixed demo scenario. The orders you place yourself are on the Trade tab.
        </Note>
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
  detail: { color: colors.muted, fontSize: 13, marginTop: 2 },
  month: { color: colors.text, fontWeight: '600', marginTop: 10 },
  link: { minHeight: 44, justifyContent: 'center' },
  linkText: { color: colors.accent, fontSize: 14, textDecorationLine: 'underline' },
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'center', padding: 16 },
  sheet: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 16,
    maxHeight: '80%',
    maxWidth: 560,
    width: '100%',
    alignSelf: 'center',
  },
  close: {
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
  },
  closeText: { color: colors.text, fontWeight: '600' },
});
