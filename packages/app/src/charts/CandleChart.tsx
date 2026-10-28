import { useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { colors } from '../ui/colors';
import type { ChartModel } from './chartModel';

const UP = '#0b6b3a';
const DOWN = '#b3261e';
const SHORT = '#1a56db';
const LONG = '#8a5a00';
const RSI = '#6b3fa0';
const PRICE_H = 200;
const VOLUME_H = 48;
const RSI_H = 72;

function Panel(props: { height: number; label: string; children: React.ReactNode; testID?: string }) {
  return (
    <View style={styles.panelBox}>
      <Text style={styles.panelLabel}>{props.label}</Text>
      <View style={[styles.panel, { height: props.height }]} testID={props.testID}>
        {props.children}
      </View>
    </View>
  );
}

function Dots(props: { values: Array<number | null>; slot: number; height: number; color: string }) {
  return (
    <>
      {props.values.map((v, i) =>
        v === null || v < 0 || v > 1 ? null : (
          <View key={i} style={{ position: 'absolute', left: i * props.slot + props.slot / 2 - 1.5, top: v * props.height - 1.5, width: 3, height: 3, borderRadius: 1.5, backgroundColor: props.color }} />
        ),
      )}
    </>
  );
}

function Candles({ m, slot }: { m: ChartModel; slot: number }) {
  const body = Math.max(1, Math.floor(slot * 0.7));
  return (
    <>
      {m.candles.map((c, i) => {
        const color = c.up ? UP : DOWN;
        const x = i * slot + slot / 2;
        return (
          <View key={i}>
            <View style={{ position: 'absolute', left: x - 0.5, top: c.wickTop * PRICE_H, width: 1, height: Math.max(1, (c.wickBottom - c.wickTop) * PRICE_H), backgroundColor: color }} />
            <View style={{ position: 'absolute', left: x - body / 2, top: c.bodyTop * PRICE_H, width: body, height: Math.max(1, (c.bodyBottom - c.bodyTop) * PRICE_H), backgroundColor: color }} />
          </View>
        );
      })}
    </>
  );
}

/** Candles with two moving averages, volume and RSI, drawn from plain views so it needs no extra library. */
export function CandleChart({ model, shortDays, longDays, rsiDays }: { model: ChartModel; shortDays: number; longDays: number; rsiDays: number }) {
  const [width, setWidth] = useState(320);
  const slot = width / Math.max(1, model.candles.length);
  return (
    <View onLayout={(e: LayoutChangeEvent) => setWidth(Math.max(120, e.nativeEvent.layout.width))} testID="chart">
      <Panel height={PRICE_H} label={`Price (adjusted for splits), with the ${String(shortDays)}-day average in blue and the ${String(longDays)}-day average in amber`} testID="chart-candles">
        <Candles m={model} slot={slot} />
        <Dots values={model.shortLine} slot={slot} height={PRICE_H} color={SHORT} />
        <Dots values={model.longLine} slot={slot} height={PRICE_H} color={LONG} />
      </Panel>
      <Panel height={VOLUME_H} label="Volume" testID="chart-volume">
        {model.volume.map((v, i) => (
          <View key={i} style={{ position: 'absolute', left: i * slot + slot * 0.15, bottom: 0, width: Math.max(1, slot * 0.7), height: Math.max(1, v * VOLUME_H), backgroundColor: model.candles[i]?.up === true ? UP : DOWN, opacity: 0.55 }} />
        ))}
      </Panel>
      <Panel height={RSI_H} label={`RSI (${String(rsiDays)} days): above 70 is often called stretched, below 30 weak`} testID="chart-rsi">
        <View style={[styles.guide, { top: 0.3 * RSI_H }]} />
        <View style={[styles.guide, { top: 0.7 * RSI_H }]} />
        <Dots values={model.rsiLine} slot={slot} height={RSI_H} color={RSI} />
      </Panel>
    </View>
  );
}

const styles = StyleSheet.create({
  panelBox: { marginTop: 8 },
  panelLabel: { color: colors.muted, fontSize: 12, marginBottom: 2 },
  panel: { borderWidth: 1, borderColor: colors.line, backgroundColor: colors.background, overflow: 'hidden' },
  guide: { position: 'absolute', left: 0, right: 0, height: 1, backgroundColor: colors.line },
});
