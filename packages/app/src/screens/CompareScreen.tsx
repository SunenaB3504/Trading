import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import type { KeyValueStore } from '../store/kv';
import { PaperSession } from '../trading/paperSession';
import { Note, Section, colors } from '../ui/Section';
import type { ComparisonLine, ComparisonView } from '../viewModels/comparisonView';

function Line({ line }: { line: ComparisonLine }) {
  return (
    <View style={styles.line}>
      <Text style={styles.label}>{line.label}</Text>
      <View style={styles.pair}>
        <View style={styles.cell}>
          <Text style={styles.head}>Ledger A (you)</Text>
          <Text style={styles.text}>{line.own === '' ? '–' : line.own}</Text>
        </View>
        <View style={styles.cell}>
          <Text style={styles.head}>Ledger B (market)</Text>
          <Text style={styles.text}>{line.market}</Text>
        </View>
      </View>
    </View>
  );
}

export function CompareScreen({ kv, now }: { kv: KeyValueStore; now: () => number }) {
  const [view, setView] = useState<ComparisonView | null>(null);
  useEffect(() => {
    void PaperSession.open(kv, now).then((s) => setView(s.comparison()));
  }, [kv, now]);
  if (view === null) return <Note>Loading...</Note>;
  return (
    <ScrollView contentContainerStyle={styles.page} testID="compare-screen">
      <Note>{`Data snapshot ${view.snapshotId}. Benchmark: ${view.benchmark}.`}</Note>
      <Section title="Portfolio">
        {view.portfolio.length === 0 ? (
          <Note>No trades yet. Place an order on the Trade tab.</Note>
        ) : null}
        {view.portfolio.map((l) => (
          <Line key={l.label} line={l} />
        ))}
      </Section>
      <Section title="Trades">
        {view.trades.map((t) => (
          <View key={t.id} style={styles.card}>
            <Text style={styles.title}>{t.title}</Text>
            {t.lines.map((l) => (
              <Line key={l.label} line={l} />
            ))}
          </View>
        ))}
      </Section>
      {view.notes.map((n) => (
        <Note key={n}>{n}</Note>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, maxWidth: 720, width: '100%', alignSelf: 'center' },
  card: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  title: { fontWeight: '600', color: colors.text, marginBottom: 6 },
  line: { marginBottom: 8 },
  label: { color: colors.muted, fontSize: 13, marginBottom: 2 },
  pair: { flexDirection: 'row', gap: 12 },
  cell: { flex: 1 },
  head: { fontSize: 11, color: colors.muted, textTransform: 'uppercase' },
  text: { color: colors.text, fontSize: 14 },
});
