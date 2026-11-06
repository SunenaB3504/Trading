import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { colors } from './colors';

/** A row of labelled options; the chosen one is highlighted. */
export function Choice<T extends string>(props: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  testID: string;
  labels?: Readonly<Record<string, string>>;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      <View style={styles.choices} testID={props.testID}>
        {props.options.map((o) => (
          <Pressable
            key={o}
            accessibilityRole="button"
            accessibilityState={{ selected: o === props.value }}
            onPress={() => props.onChange(o)}
            style={[styles.choice, o === props.value ? styles.choiceOn : null]}
          >
            <Text style={o === props.value ? styles.choiceTextOn : styles.choiceText}>
              {props.labels?.[o] ?? o}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/** A labelled text box. */
export function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  testID: string;
  keyboard?: 'default' | 'numeric' | 'decimal-pad';
  placeholder?: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        testID={props.testID}
        value={props.value}
        onChangeText={props.onChange}
        keyboardType={props.keyboard ?? 'default'}
        {...(props.placeholder === undefined ? {} : { placeholder: props.placeholder, placeholderTextColor: colors.muted })}
        style={styles.input}
        accessibilityLabel={props.label}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 10 },
  label: { color: colors.muted, fontSize: 13, marginBottom: 4 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 6, padding: 10, minHeight: 44, color: colors.text },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 6,
    paddingHorizontal: 14,
    minHeight: 44,
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceOn: { borderColor: colors.accent, backgroundColor: colors.selected },
  choiceText: { color: colors.text },
  choiceTextOn: { color: colors.accent, fontWeight: '600' },
});
