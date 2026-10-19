import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Note, colors } from '../ui/Section';
import type { Engine } from './engine';

/** The two optional fields of the birth form: gender, and the birth star the person already knows. */
const GENDERS: Array<[string, string]> = [
  ['female', 'Female'],
  ['male', 'Male'],
  ['other', 'Other'],
  ['', 'Prefer not to say'],
];

export function GenderPicker(props: { value: string; onPick: (v: string) => void }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>Gender (optional)</Text>
      <View style={styles.row} accessibilityRole="radiogroup">
        {GENDERS.map(([value, label]) => {
          const on = props.value === value;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              key={label}
              onPress={() => props.onPick(value)}
              style={[styles.chip, on ? styles.chipOn : null]}
              testID={`gender-${value === '' ? 'none' : value}`}
            >
              <Text style={on ? styles.chipTextOn : styles.chipText}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
      <Note>Stored encrypted with the rest. No calculation uses it yet.</Note>
    </View>
  );
}

/** Type a star name or its regional spelling (Anizham, Thiruvonam…) and pick it; the value kept is the English name. */
export function StarPicker(props: { engine: Engine; value: string; onPick: (v: string) => void }) {
  const [query, setQuery] = useState(props.value);
  // `picked` is the suggestion the person chose; suggestions stay hidden while the box still shows it.
  const [picked, setPicked] = useState(props.value);
  const matches =
    query !== picked && query.trim().length >= 2 ? props.engine.findStars(query, 6) : [];
  return (
    <View style={styles.field}>
      <Text style={styles.label}>Your birth star, if you know it (Nakshatram, optional)</Text>
      <TextInput
        accessibilityLabel="Your birth star, if you know it (Nakshatram, optional)"
        onChangeText={(v) => {
          setQuery(v);
          props.onPick(v);
        }}
        style={styles.input}
        testID="star-input"
        value={query}
      />
      {matches.map((m, i) => (
        <Pressable
          accessibilityRole="button"
          key={m.index}
          onPress={() => {
            setQuery(m.name);
            setPicked(m.name);
            props.onPick(m.name);
          }}
          style={styles.choice}
          testID={`star-${i}`}
        >
          <Text style={styles.choiceText}>{m.name}</Text>
        </Pressable>
      ))}
      <Note>
        If you give it, we check it against the star worked out from your birth details; a
        difference usually means the birth time or place is off.
      </Note>
    </View>
  );
}

const styles = StyleSheet.create({
  field: { marginBottom: 12 },
  label: { color: colors.muted, fontSize: 13, marginBottom: 4 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    minHeight: 44,
    paddingHorizontal: 14,
    justifyContent: 'center',
  },
  chipOn: { borderColor: colors.accent, backgroundColor: '#e8f0fe' },
  chipText: { color: colors.text, fontSize: 14 },
  chipTextOn: { color: colors.accent, fontSize: 14, fontWeight: '600' },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    padding: 12,
    minHeight: 44,
    color: colors.text,
    fontSize: 15,
  },
  choice: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginTop: 6,
  },
  choiceText: { color: colors.text, fontSize: 14 },
});
