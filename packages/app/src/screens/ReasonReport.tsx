import { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { formatPercent } from '../format/rupees';
import { loadJournal } from '../journal/journalStore';
import { loadReasons } from '../journal/reasons';
import { offerFile } from '../platform/device';
import type { KeyValueStore } from '../store/kv';
import { byReason, tradeRows, tradesCsv } from '../trading/analytics';
import type { TradeRow } from '../trading/analytics';
import type { Market } from '../trading/market';
import { PaperSession } from '../trading/paperSession';
import { Button } from '../ui/Button';
import { colors } from '../ui/colors';
import { Note, Section } from '../ui/Section';
import { AppText as Text } from '../ui/typography';

function Lines({ title, rows, side }: { title: string; rows: readonly TradeRow[]; side: 'entry' | 'exit' }) {
  const lines = byReason(rows, side);
  return (
    <Section title={title}>
      <View testID={`by-reason-${side}`}>
        {lines.map((l) => (
          <View key={l.label} style={styles.line}>
            <Text style={styles.label}>{`${l.label}${l.trades < 5 ? ' (few trades)' : ''}`}</Text>
            <Text style={styles.text}>
              {`${String(l.trades)} trade${l.trades === 1 ? '' : 's'} · won ${formatPercent(l.winRate)} · average ${formatPercent(l.avgProfitRatio)} · held ${l.avgDays.toFixed(1)} days`}
            </Text>
          </View>
        ))}
      </View>
    </Section>
  );
}

/**
 * Measure, Report: the closed trades counted by the reasons picked in the journal (owner, 2026-11-06), and every trade
 * exported as a spreadsheet for the laptop.
 */
export function ReasonReport({ kv, now, market, profileName }: { kv: KeyValueStore; now: () => number; market: Market; profileName: string }) {
  const [rows, setRows] = useState<TradeRow[] | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  useEffect(() => {
    void (async () => {
      const session = await PaperSession.open(kv, now, market);
      setRows(tradeRows(session.roundTrips(), await loadJournal(kv), market.id, await loadReasons(kv)));
    })();
  }, [kv, now, market]);
  if (rows === null) return <Note>Loading trades...</Note>;
  const exportCsv = () =>
    void offerFile(`market-learning-trades-${profileName.replace(/[^\w-]+/g, '_') || 'profile'}.csv`, tradesCsv(rows, profileName)).then((ok) =>
      setSaved(ok ? 'Saved. Open it in a spreadsheet, for example Excel or Google Sheets.' : 'Saving a file is not available here.'),
    );
  return (
    <View testID="reason-report">
      {rows.length === 0 ? (
        <Note>No round trip has closed yet: reasons are counted once a bought stock has been sold.</Note>
      ) : (
        <>
          <Lines title="By reason for buying" rows={rows} side="entry" />
          <Lines title="By reason for selling" rows={rows} side="exit" />
        </>
      )}
      <Button label="Export trades (spreadsheet)" onPress={exportCsv} quiet testID="export-trades" />
      {saved !== null ? <Note>{saved}</Note> : null}
      <Note>One row per bought-and-sold trade: dates, prices, charges, profit, days held, reasons, confidence and the simulator ticket.</Note>
    </View>
  );
}

const styles = StyleSheet.create({
  line: { paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: colors.line },
  label: { fontWeight: '600', color: colors.text },
  text: { color: colors.muted, fontSize: 13 },
});
