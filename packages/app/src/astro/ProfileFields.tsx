import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Note, colors } from '../ui/Section';
import { AppInput as TextInput, AppText as Text } from '../ui/typography';
import type { Engine } from './engine';
import { ENGLISH, PACKS, allSpellings } from './i18n';
import type { Lang } from './i18n';
import { usePack, useT } from './i18n/react';

/** The small form pieces the Profile tab is built from, all speaking the chosen language. */

export function Button(props: {
  label: string;
  onPress: () => void;
  testID: string;
  quiet?: boolean;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={props.onPress}
      style={props.quiet === true ? styles.quiet : styles.button}
      testID={props.testID}
    >
      <Text style={props.quiet === true ? styles.quietText : styles.buttonText}>{props.label}</Text>
    </Pressable>
  );
}

export function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  testID: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        accessibilityLabel={props.label}
        onChangeText={props.onChange}
        style={styles.input}
        testID={props.testID}
        value={props.value}
      />
    </View>
  );
}

/** One button per available language, each named in its own script. */
export function LanguageSwitch(props: { value: Lang; onPick: (l: Lang) => void }) {
  const t = useT();
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{t('lang.label')}</Text>
      <View style={styles.row} accessibilityRole="radiogroup">
        {PACKS.map((p) => {
          const on = props.value === p.lang;
          return (
            <Pressable
              accessibilityLabel={p.native}
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              key={p.lang}
              onPress={() => props.onPick(p.lang)}
              style={[styles.chip, on ? styles.chipOn : null]}
              testID={`lang-${p.lang}`}
            >
              <Text style={on ? styles.chipTextOn : styles.chipText}>{p.native}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

export function PlacePicker(props: {
  engine: Engine;
  value: string;
  onPick: (place: string) => void;
}) {
  const t = useT();
  const [query, setQuery] = useState(props.value);
  const matches =
    query.length >= 2 && query !== props.value ? props.engine.findPlaces(query, 6) : [];
  return (
    <View>
      <Field
        label={t('place.label')}
        value={query}
        testID="place-input"
        onChange={(v) => {
          setQuery(v);
          props.onPick('');
        }}
      />
      {matches.map((p, i) => (
        <Pressable
          accessibilityRole="button"
          key={`${p.name}-${p.admin1}-${p.lat}`}
          onPress={() => {
            setQuery(`${p.name}, ${p.country}`);
            props.onPick(`${p.name}, ${p.country}`);
          }}
          style={styles.choice}
          testID={`place-${i}`}
        >
          <Text style={styles.choiceText}>{`${p.name}, ${p.country}, ${p.zone}`}</Text>
        </Pressable>
      ))}
      <Note>{t('place.credit')}</Note>
    </View>
  );
}

const GENDERS: Array<[string, 'gender.female' | 'gender.male' | 'gender.other' | 'gender.none']> = [
  ['female', 'gender.female'],
  ['male', 'gender.male'],
  ['other', 'gender.other'],
  ['', 'gender.none'],
];

export function GenderPicker(props: { value: string; onPick: (v: string) => void }) {
  const t = useT();
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{t('gender.label')}</Text>
      <View style={styles.row} accessibilityRole="radiogroup">
        {GENDERS.map(([value, key]) => {
          const on = props.value === value;
          return (
            <Pressable
              accessibilityRole="radio"
              accessibilityState={{ checked: on }}
              key={key}
              onPress={() => props.onPick(value)}
              style={[styles.chip, on ? styles.chipOn : null]}
              testID={`gender-${value === '' ? 'none' : value}`}
            >
              <Text style={on ? styles.chipTextOn : styles.chipText}>{t(key)}</Text>
            </Pressable>
          );
        })}
      </View>
      <Note>{t('gender.note')}</Note>
    </View>
  );
}

/**
 * Type a star name (Latin or the script of any language) and pick it. What is kept is the English name, so the
 * choice reads correctly in every language; text that was typed but not picked is kept as typed.
 */
export function StarPicker(props: { engine: Engine; value: string; onPick: (v: string) => void }) {
  const t = useT();
  const pack = usePack();
  const shown = (v: string): string => {
    const i = props.engine.starIndex(v, allSpellings());
    return i === null ? v : (pack.names.stars[i] ?? v);
  };
  const [query, setQuery] = useState(shown(props.value));
  // `picked` is the suggestion the person chose; suggestions stay hidden while the box still shows it.
  const [picked, setPicked] = useState(props.value === '' ? '' : shown(props.value));
  // A star already chosen is shown in the language now selected.
  useEffect(() => {
    if (picked !== '') {
      const next = shown(props.value);
      setQuery(next);
      setPicked(next);
    }
  }, [pack.lang]);
  const matches =
    query !== picked && query.trim().length >= 2
      ? props.engine.findStars(query, 6, allSpellings())
      : [];
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{t('star.label')}</Text>
      <TextInput
        accessibilityLabel={t('star.label')}
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
            const name = pack.names.stars[m.index] ?? m.name;
            setQuery(name);
            setPicked(name);
            props.onPick(ENGLISH.names.stars[m.index] ?? m.name);
          }}
          style={styles.choice}
          testID={`star-${i}`}
        >
          <Text style={styles.choiceText}>{pack.names.stars[m.index] ?? m.name}</Text>
        </Pressable>
      ))}
      <Note>{t('star.note')}</Note>
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
  button: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  buttonText: { color: '#ffffff', fontWeight: '600' },
  quiet: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
  },
  quietText: { color: colors.text, fontWeight: '600' },
});
