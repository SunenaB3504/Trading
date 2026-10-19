import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { IEntitlementService } from '../entitlement/types';
import type { KeyValueStore } from '../store/kv';
import { Note, Row, Section, colors } from '../ui/Section';
import { BirthVault, IndexedDbKeyProvider, WEB_PROTECTION_NOTICE } from './birthVault';
import type { BirthProfile } from './birthVault';
import { loadEngine } from './engine';
import type { Engine } from './engine';
import { ASTRO_FEATURE } from './feature';
import { loadAstroLayer } from './gate';
import { GenderPicker, StarPicker } from './ProfileFields';
import { toProfileView } from './profileView';
import { ShieldsSection } from './ShieldsSection';
import type { ProfileView } from './profileView';

type Screen =
  | { kind: 'loading' }
  | { kind: 'locked' }
  | { kind: 'form'; engine: Engine; notice: string | null }
  | { kind: 'ready'; engine: Engine; profile: BirthProfile; view: ProfileView }
  | { kind: 'unreadable'; reason: string };

const CONVENTIONS_VERSION = 1;

function computeView(engine: Engine, profile: BirthProfile, today: string): ProfileView {
  const place = engine.findPlaces(profile.place, 1)[0];
  if (place === undefined) throw new Error('That place is not in the offline list. Search again.');
  const conventions = engine.freezeConventions(CONVENTIONS_VERSION);
  const typed =
    profile.star.trim() === ''
      ? null
      : { text: profile.star.trim(), index: engine.starIndex(profile.star) };
  return toProfileView(
    engine.computeProfile({ date: profile.date, time: profile.time, place }, conventions, today),
    typed,
  );
}

const messageOf = (e: unknown): string =>
  e instanceof Error ? e.message : 'Something went wrong.';

function useProfile(kv: KeyValueStore, entitlements: IEntitlementService, now: () => number) {
  const vault = useMemo(() => new BirthVault(kv, new IndexedDbKeyProvider()), [kv]);
  const [screen, setScreen] = useState<Screen>({ kind: 'loading' });
  const today = new Date(now()).toISOString().slice(0, 10);

  const show = useCallback(
    async (engine: Engine) => {
      const found = await vault.load();
      if (found.state === 'none') return setScreen({ kind: 'form', engine, notice: null });
      if (found.state === 'unreadable')
        return setScreen({ kind: 'unreadable', reason: found.reason });
      try {
        setScreen({
          kind: 'ready',
          engine,
          profile: found.profile,
          view: computeView(engine, found.profile, today),
        });
      } catch (e) {
        setScreen({ kind: 'form', engine, notice: messageOf(e) });
      }
    },
    [vault, today],
  );

  useEffect(() => {
    void loadAstroLayer(entitlements, ASTRO_FEATURE, loadEngine).then((engine) =>
      engine === null ? setScreen({ kind: 'locked' }) : show(engine),
    );
  }, [entitlements, show]);

  const save = async (engine: Engine, profile: BirthProfile): Promise<string | null> => {
    try {
      const view = computeView(engine, profile, today);
      await vault.save(profile);
      setScreen({ kind: 'ready', engine, profile, view });
      return null;
    } catch (e) {
      return messageOf(e);
    }
  };

  const remove = async () => {
    await vault.remove();
    const engine = await loadAstroLayer(entitlements, ASTRO_FEATURE, loadEngine);
    if (engine !== null) setScreen({ kind: 'form', engine, notice: null });
  };

  return { screen, save, remove };
}

function Button(props: { label: string; onPress: () => void; testID: string; quiet?: boolean }) {
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

function Field(props: {
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

function PlacePicker(props: { engine: Engine; value: string; onPick: (place: string) => void }) {
  const [query, setQuery] = useState(props.value);
  const matches =
    query.length >= 2 && query !== props.value ? props.engine.findPlaces(query, 6) : [];
  return (
    <View>
      <Field
        label="Birth place (search, for example Mumbai or Hyderabad, IN)"
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
      <Note>
        Place names are from GeoNames (geonames.org), licensed CC BY 4.0, and work offline.
      </Note>
    </View>
  );
}

function BirthForm(props: {
  engine: Engine;
  notice: string | null;
  onSave: (p: BirthProfile) => Promise<string | null>;
}) {
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [place, setPlace] = useState('');
  const [gender, setGender] = useState('');
  const [star, setStar] = useState('');
  const [message, setMessage] = useState<string | null>(props.notice);
  const submit = async () => {
    if (place === '') return setMessage('Search for your birth place and pick it from the list.');
    setMessage(
      await props.onSave({
        name: name.trim(),
        date: date.trim(),
        time: time.trim(),
        place,
        gender,
        star: star.trim(),
      }),
    );
  };
  return (
    <Section title="Your birth details">
      <Field label="Name" value={name} onChange={setName} testID="birth-name" />
      <Field label="Birth date (YYYY-MM-DD)" value={date} onChange={setDate} testID="birth-date" />
      <Field
        label="Birth time, local clock (HH:MM, 24-hour)"
        value={time}
        onChange={setTime}
        testID="birth-time"
      />
      <PlacePicker engine={props.engine} value={place} onPick={setPlace} />
      <GenderPicker value={gender} onPick={setGender} />
      <StarPicker engine={props.engine} value={star} onPick={setStar} />
      <Button label="Save details" onPress={() => void submit()} testID="profile-save" />
      {message !== null ? (
        <Text style={styles.message} testID="profile-message">
          {message}
        </Text>
      ) : null}
    </Section>
  );
}

function ProfileCard(props: {
  engine: Engine;
  view: ProfileView;
  now: () => number;
  onDelete: () => Promise<void>;
}) {
  const [sure, setSure] = useState(false);
  return (
    <>
      <Section title="Your chart facts">
        {props.view.warnings.map((w) => (
          <Text key={w} style={styles.warning}>
            {w}
          </Text>
        ))}
        {props.view.rows.map((r) => (
          <Row key={r.label} label={r.label} value={r.value} />
        ))}
        <Note>
          Calculated on this device from your saved birth details. Nothing was sent anywhere.
        </Note>
      </Section>
      <ShieldsSection
        engine={props.engine}
        moonSign={props.view.moonSign}
        moonNakshatra={props.view.moonNakshatra}
        now={props.now}
      />
      <Section title="Delete">
        <Button
          label={
            sure ? 'Press again to delete your birth details for good' : 'Delete my birth details'
          }
          onPress={() => (sure ? void props.onDelete() : setSure(true))}
          quiet
          testID="profile-delete"
        />
        <Note>Deleting also destroys the key, so the saved copy cannot be read again.</Note>
      </Section>
    </>
  );
}

export default function ProfileScreen(props: {
  kv: KeyValueStore;
  entitlements: IEntitlementService;
  now: () => number;
}) {
  const { screen, save, remove } = useProfile(props.kv, props.entitlements, props.now);
  return (
    <ScrollView contentContainerStyle={styles.page} testID="profile-screen">
      <Section title="Protection">
        <Note>{WEB_PROTECTION_NOTICE}</Note>
      </Section>
      {screen.kind === 'loading' ? <Note>Loading...</Note> : null}
      {screen.kind === 'locked' ? (
        <Note>This optional layer is not unlocked on this device.</Note>
      ) : null}
      {screen.kind === 'form' ? (
        <BirthForm
          engine={screen.engine}
          notice={screen.notice}
          onSave={(p) => save(screen.engine, p)}
        />
      ) : null}
      {screen.kind === 'ready' ? (
        <ProfileCard engine={screen.engine} view={screen.view} now={props.now} onDelete={remove} />
      ) : null}
      {screen.kind === 'unreadable' ? (
        <Section title="Saved details cannot be read">
          <Note>
            The saved details cannot be read on this device (the key is missing or the data was
            changed). Delete them and enter them again.
          </Note>
          <Button
            label="Delete the unreadable details"
            onPress={() => void remove()}
            quiet
            testID="profile-delete"
          />
        </Section>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, maxWidth: 720, width: '100%', alignSelf: 'center' },
  field: { marginBottom: 12 },
  label: { color: colors.muted, fontSize: 13, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    padding: 12,
    minHeight: 44,
    color: colors.text,
    fontSize: 15,
  },
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
  choice: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 12,
    marginBottom: 6,
  },
  choiceText: { color: colors.text, fontSize: 14 },
  message: { marginTop: 8, color: colors.text },
  warning: { color: colors.warn, marginBottom: 8, fontSize: 13 },
});
