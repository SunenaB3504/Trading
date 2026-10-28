import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import type { LayoutChangeEvent } from 'react-native';
import { colors } from '../ui/colors';

const HEIGHT = 64;
const MAX_POINTS = 90;

/** Picks at most `MAX_POINTS` values spread over the series, always keeping the first and the last. */
export function thin(values: readonly number[]): number[] {
  if (values.length <= MAX_POINTS) return [...values];
  const step = (values.length - 1) / (MAX_POINTS - 1);
  return Array.from({ length: MAX_POINTS }, (_, i) => values[Math.round(i * step)] as number);
}

/** A small line of dots for an account's value over time, drawn from plain views. */
export function Sparkline({ values, testID }: { values: readonly number[]; testID?: string }) {
  const [width, setWidth] = useState(300);
  const pts = thin(values);
  const lo = Math.min(...pts);
  const hi = Math.max(...pts);
  const span = hi - lo || 1;
  const slot = width / Math.max(1, pts.length);
  return (
    <View style={styles.box} onLayout={(e: LayoutChangeEvent) => setWidth(Math.max(100, e.nativeEvent.layout.width))} testID={testID}>
      {pts.map((v, i) => (
        <View key={i} style={{ position: 'absolute', left: i * slot, top: ((hi - v) / span) * (HEIGHT - 4), width: Math.max(2, slot), height: 3, backgroundColor: colors.accent }} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { height: HEIGHT, borderWidth: 1, borderColor: colors.line, marginTop: 6, overflow: 'hidden' },
});
