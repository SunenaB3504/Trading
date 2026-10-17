import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { seededUniverse } from '../universe/seed';
import type { UniverseEntry, UniverseSource } from '../universe/types';
import { toUniverseRows } from '../universe/universeView';
import type { Filter, UniverseRow } from '../universe/universeView';
import { Note, Section, colors } from '../ui/Section';

const FILTERS: ReadonlyArray<readonly [Filter, string]> = [
  ['all', 'All'],
  ['eligible', 'Eligible'],
  ['not_eligible', 'Not eligible'],
];

function FilterBar(props: { value: Filter; onChange: (f: Filter) => void }) {
  return (
    <View style={styles.filters} accessibilityRole="tablist">
      {FILTERS.map(([id, label]) => (
        <Pressable
          key={id}
          accessibilityRole="tab"
          accessibilityState={{ selected: props.value === id }}
          onPress={() => props.onChange(id)}
          style={[styles.chip, props.value === id ? styles.chipOn : null]}
        >
          <Text style={props.value === id ? styles.chipTextOn : styles.chipText}>{label}</Text>
        </Pressable>
      ))}
    </View>
  );
}

function RuleLines({ row }: { row: UniverseRow }) {
  return (
    <View style={styles.rules}>
      {row.rules.map((r) => (
        <Text key={r.rule} style={r.pass ? styles.pass : styles.fail}>
          {`${r.pass ? 'Pass' : 'Fail'} ${r.rule}: ${r.text}${r.assumed ? ' (assumed, not measured)' : ''}`}
        </Text>
      ))}
    </View>
  );
}

function Card({ row, open, onToggle }: { row: UniverseRow; open: boolean; onToggle: () => void }) {
  return (
    <View style={styles.card} testID={`row-${row.symbol}`}>
      <Pressable
        accessibilityRole="button"
        onPress={onToggle}
        accessibilityState={{ expanded: open }}
      >
        <View style={styles.head}>
          <Text style={styles.symbol}>{`${row.symbol}, ${row.name}`}</Text>
          <Text style={row.eligible ? styles.ok : styles.no}>
            {row.eligible ? 'Eligible' : 'Not eligible'}
          </Text>
        </View>
      </Pressable>
      {row.firstFailure !== null ? (
        <Text style={styles.fail}>{`First failure ${row.firstFailure}`}</Text>
      ) : null}
      <Text style={styles.detail}>{row.flags.join(' · ')}</Text>
      <Text style={styles.detail}>{`Bucket: ${row.bucket} (${row.bucketWhy})`}</Text>
      {row.gaps.length > 0 ? (
        <Text style={styles.note}>{`Not used: ${row.gaps.join('; ')}`}</Text>
      ) : null}
      <Pressable
        accessibilityRole="button"
        accessibilityState={{ expanded: open }}
        onPress={onToggle}
        style={styles.toggleHit}
      >
        <Text style={styles.toggle}>{open ? 'Hide the rules' : 'Show the rules'}</Text>
      </Pressable>
      {open ? <RuleLines row={row} /> : null}
    </View>
  );
}

export function UniverseScreen({ source = seededUniverse }: { source?: UniverseSource }) {
  const [entries, setEntries] = useState<UniverseEntry[] | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set());
  useEffect(() => {
    void source.load().then(setEntries);
  }, [source]);
  const rows = useMemo(
    () => (entries === null ? [] : toUniverseRows(entries, filter)),
    [entries, filter],
  );
  const toggle = (symbol: string): void =>
    setOpen((o) => {
      const next = new Set(o);
      if (!next.delete(symbol)) next.add(symbol);
      return next;
    });
  if (entries === null) return <Note>Loading...</Note>;
  return (
    <ScrollView contentContainerStyle={styles.page} testID="universe-screen">
      <Note>{`${source.description} As of ${source.asOf}.`}</Note>
      <FilterBar value={filter} onChange={setFilter} />
      <Section title={`${rows.length} instruments`}>
        {rows.map((r) => (
          <Card
            key={r.symbol}
            row={r}
            open={open.has(r.symbol)}
            onToggle={() => toggle(r.symbol)}
          />
        ))}
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, maxWidth: 720, width: '100%', alignSelf: 'center' },
  filters: { flexDirection: 'row', gap: 8, marginVertical: 10 },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    paddingHorizontal: 14,
    minHeight: 44,
    justifyContent: 'center',
  },
  chipOn: { borderColor: colors.accent, backgroundColor: '#e8f0fe' },
  chipText: { color: colors.text },
  chipTextOn: { color: colors.accent, fontWeight: '600' },
  card: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    padding: 10,
    marginBottom: 10,
  },
  head: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
    minHeight: 44,
  },
  symbol: { fontWeight: '600', color: colors.text, flexShrink: 1 },
  ok: { color: '#0a7d33', fontWeight: '600' },
  no: { color: '#b00020', fontWeight: '600' },
  detail: { color: colors.muted, fontSize: 13, marginTop: 2 },
  note: { color: colors.warn, fontSize: 12, marginTop: 2 },
  toggleHit: { minHeight: 44, justifyContent: 'center' },
  toggle: { color: colors.accent, fontSize: 13 },
  rules: { marginTop: 4 },
  pass: { color: '#0a7d33', fontSize: 13 },
  fail: { color: '#b00020', fontSize: 13 },
});
