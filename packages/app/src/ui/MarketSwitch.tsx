import { Pressable, StyleSheet, Text, View } from 'react-native';
import type { Markets } from '../trading/useMarkets';
import { colors } from './Section';

/** Demo or real prices for this profile's practice; each has its own book. */
export function MarketSwitch({ markets }: { markets: Markets }) {
  const options = [
    ['demo', 'Demo prices', true],
    ['real', 'Real NSE prices', markets.real !== null],
  ] as const;
  return (
    <View style={styles.switch} testID="market-switch">
      <View style={styles.switchRow}>
        {options.map(([kind, label, usable]) => {
          const on = markets.market.kind === kind;
          return (
            <Pressable
              key={kind}
              accessibilityRole="radio"
              accessibilityState={{ selected: on, disabled: !usable }}
              disabled={!usable}
              onPress={() => markets.choose(kind)}
              style={[styles.switchOption, on ? styles.switchOn : null, usable ? null : styles.switchOff]}
              testID={`market-${kind}`}
            >
              <Text style={on ? styles.switchTextOn : styles.switchText}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={styles.switchNote}>{markets.realNote}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  switch: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 4, flexShrink: 0 },
  switchRow: { flexDirection: 'row', gap: 8 },
  switchOption: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 6,
    paddingHorizontal: 14,
    minHeight: 44,
    justifyContent: 'center',
  },
  switchOn: { borderColor: colors.accent, backgroundColor: '#e8f0fe' },
  switchOff: { opacity: 0.5 },
  switchText: { color: colors.text },
  switchTextOn: { color: colors.accent, fontWeight: '600' },
  switchNote: { color: colors.muted, fontSize: 12, marginTop: 4 },
});
