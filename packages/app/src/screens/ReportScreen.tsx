import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { CostView, WinLossReport } from '@trading/core';
import type { KeyValueStore } from '../store/kv';
import type { Market } from '../trading/market';
import { PaperSession } from '../trading/paperSession';
import { Note, Row, Section, colors } from '../ui/Section';
import { toWinLossView, tradeCount } from '../viewModels/winLossView';
import type { BreakdownTable } from '../viewModels/winLossView';
import { CoachHint } from '../ui/CoachHint';
import { ReasonReport } from './ReasonReport';

function Table({ t }: { t: BreakdownTable }) {
  if (t.rows.length === 0) return null;
  return (
    <Section title={t.title}>
      {t.rows.map((r) => (
        <View key={r.key} style={styles.group}>
          <Text style={styles.groupKey}>{`${r.key}${r.thin ? ' (few trades)' : ''}`}</Text>
          <Text style={styles.groupText}>
            {`${tradeCount(r.count)}, win rate ${r.winRate}, expectancy ${r.expectancy}, profit ${r.pnl}`}
          </Text>
        </View>
      ))}
    </Section>
  );
}

function ViewToggle(props: { view: CostView; onChange: (v: CostView) => void }) {
  return (
    <View style={styles.toggle} accessibilityRole="tablist">
      {(['net', 'gross'] as const).map((v) => (
        <Pressable
          key={v}
          accessibilityRole="tab"
          accessibilityState={{ selected: props.view === v }}
          onPress={() => props.onChange(v)}
          style={[styles.toggleItem, props.view === v ? styles.toggleOn : null]}
        >
          <Text style={props.view === v ? styles.toggleTextOn : styles.toggleText}>
            {v === 'net' ? 'Net of costs' : 'Gross of costs'}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

export function ReportScreen({
  kv,
  now,
  market,
  profileName = '',
}: {
  kv: KeyValueStore;
  now: () => number;
  market: Market;
  profileName?: string;
}) {
  const [report, setReport] = useState<WinLossReport | null>(null);
  const [view, setView] = useState<CostView>('net');
  useEffect(() => {
    void PaperSession.open(kv, now, market).then((s) => setReport(s.report()));
  }, [kv, now, market]);
  const text = useMemo(
    () => (report === null ? null : toWinLossView(report, view)),
    [report, view],
  );
  if (text === null) return <Note>Loading...</Note>;
  return (
    <ScrollView contentContainerStyle={styles.page} testID="report-screen">
      <CoachHint screen="report" />
      <ViewToggle view={view} onChange={setView} />
      <Section title="Win and loss">
        {text.headline.map((r) => (
          <Row key={r.label} label={r.label} value={r.value} />
        ))}
      </Section>
      {text.warnings.map((w) => (
        <Note key={w}>{w}</Note>
      ))}
      {text.breakdowns.map((t) => (
        <Table key={t.title} t={t} />
      ))}
      <ReasonReport kv={kv} now={now} market={market} profileName={profileName} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, maxWidth: 720, width: '100%', alignSelf: 'center' },
  toggle: { flexDirection: 'row', marginBottom: 12 },
  toggleItem: {
    paddingHorizontal: 16,
    minHeight: 44,
    justifyContent: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  toggleOn: { borderBottomColor: colors.accent },
  toggleText: { color: colors.muted },
  toggleTextOn: { color: colors.accent, fontWeight: '600' },
  group: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.line },
  groupKey: { fontWeight: '600', color: colors.text },
  groupText: { color: colors.muted, fontSize: 13 },
});
