import { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { adjustSeries } from '@trading/core';
import { CandleChart } from '../charts/CandleChart';
import { DEFAULT_CHART, chartModel } from '../charts/chartModel';
import type { ChartBar, ChartOptions } from '../charts/chartModel';
import { formatPaise } from '../format/rupees';
import type { Market } from '../trading/market';
import { CoachHint } from '../ui/CoachHint';
import { Note, Row, Section, colors } from '../ui/Section';
import { Choice, StockPicker } from './TradeScreen';

const SHOW = { '60': '3 months', '120': '6 months', '250': '1 year' } as const;

/** Adjusted bars of one instrument, ending on the market's latest date. */
export function barsFor(m: Market, id: string): ChartBar[] {
  const raw = m.snapshot.bars[id] ?? [];
  if (raw.length === 0) return [];
  return adjustSeries(raw, m.config.actions, { includeDividends: false }).map((b) => ({ date: b.date, open: b.open, high: b.high, low: b.low, close: b.close, volume: b.volume }));
}

const paise = (v: number | null): string => (v === null ? 'not enough days yet' : formatPaise(Math.round(v)));

/** Practise, Charts (MIP v4.1 Stage 7): candles, moving averages, volume and RSI for any instrument. */
export function ChartScreen({ market }: { market: Market }) {
  const [id, setId] = useState(market.instruments[0] ?? '');
  const [show, setShow] = useState<keyof typeof SHOW>('120');
  const opts: ChartOptions = { ...DEFAULT_CHART, show: Number(show) };
  const model = useMemo(() => chartModel(barsFor(market, id), { ...DEFAULT_CHART, show: Number(show) }), [market, id, show]);
  const l = model?.last;
  return (
    <ScrollView contentContainerStyle={styles.page} testID="chart-screen">
      <CoachHint screen="charts" />
      <Section title="Choose a share">
        <StockPicker market={market} value={id} onChange={setId} />
        <Choice label="How much history" value={show} options={['60', '120', '250'] as const} labels={SHOW} onChange={setShow} testID="chart-range" />
      </Section>
      {model === null || l === undefined ? (
        <Note>There are no prices for this instrument.</Note>
      ) : (
        <Section title={`${market.symbols[id] ?? id}, to ${l.date}`}>
          <CandleChart model={model} shortDays={opts.shortDays} longDays={opts.longDays} rsiDays={opts.rsiDays} />
          <View testID="chart-readout">
            <Row label="Close" value={paise(l.close)} />
            <Row label={`${String(opts.shortDays)}-day average`} value={paise(l.short)} />
            <Row label={`${String(opts.longDays)}-day average`} value={paise(l.long)} />
            <Row label={`RSI (${String(opts.rsiDays)} days)`} value={l.rsi === null ? 'not enough days yet' : l.rsi.toFixed(0)} />
            <Row label="Volume" value={l.volume.toLocaleString('en-IN')} />
          </View>
          <Text style={styles.note}>Green candles closed above their open, red below. Prices are adjusted for splits and bonuses so a split does not look like a crash.</Text>
        </Section>
      )}
      <Note>A chart shows what has happened. It does not say what comes next.</Note>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, maxWidth: 720, width: '100%', alignSelf: 'center' },
  note: { color: colors.muted, marginTop: 8 },
});
