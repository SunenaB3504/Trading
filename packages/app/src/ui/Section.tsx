import type { ReactNode } from 'react';
import { StyleSheet, View } from 'react-native';

import { colors } from './colors';
import { AppText as Text } from './typography';

export { colors };

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.title}>{title}</Text>
      {children}
    </View>
  );
}

export function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

export function Note({ children }: { children: string }) {
  return <Text style={styles.note}>{children}</Text>;
}

const styles = StyleSheet.create({
  section: { marginBottom: 20 },
  title: { fontSize: 16, fontWeight: '600', color: colors.text, marginBottom: 6 },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  label: { color: colors.muted, fontSize: 14, flexShrink: 1, paddingRight: 12 },
  value: { color: colors.text, fontSize: 14, fontVariant: ['tabular-nums'] },
  note: { color: colors.muted, fontSize: 12, marginTop: 4 },
});
