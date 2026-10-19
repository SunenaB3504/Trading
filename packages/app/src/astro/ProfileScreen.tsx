import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text } from 'react-native';
import type { IEntitlementService } from '../entitlement/types';
import type { KeyValueStore } from '../store/kv';
import { Note, Row, Section, colors } from '../ui/Section';
import { BirthVault, IndexedDbKeyProvider } from './birthVault';
import type { BirthProfile } from './birthVault';
import { loadEngine } from './engine';
import type { Engine } from './engine';
import { ASTRO_FEATURE } from './feature';
import { loadAstroLayer } from './gate';
import { allSpellings, packFor, readLang, saveLang } from './i18n';
import type { Lang, Pack, TextKey } from './i18n';
import { PackProvider, useT } from './i18n/react';
import {
  Button,
  Field,
  GenderPicker,
  LanguageSwitch,
  PlacePicker,
  StarPicker,
} from './ProfileFields';
import { toProfileView } from './profileView';
import type { ProfileView } from './profileView';
import { ShieldsSection } from './ShieldsSection';

/** A sentence to show, kept as its key and values so a change of language rewrites it on the spot. */
interface Msg {
  key: TextKey;
  vars?: Record<string, string>;
}

type Screen =
  | { kind: 'loading' }
  | { kind: 'locked' }
  | { kind: 'form'; engine: Engine; notice: Msg | null }
  | { kind: 'ready'; engine: Engine; profile: BirthProfile }
  | { kind: 'unreadable'; reason: string };

const CONVENTIONS_VERSION = 1;

/** Something wrong with what was typed, carrying the sentence that explains it. */
class FormProblem extends Error {
  constructor(readonly msg: Msg) {
    super(msg.key);
  }
}

const problemOf = (e: unknown): Msg => (e instanceof FormProblem ? e.msg : { key: 'form.error' });

function computeView(
  engine: Engine,
  profile: BirthProfile,
  today: string,
  pack: Pack,
): ProfileView {
  const place = engine.findPlaces(profile.place, 1)[0];
  if (place === undefined) throw new FormProblem({ key: 'form.placeMissing' });
  const conventions = engine.freezeConventions(CONVENTIONS_VERSION);
  const star = profile.star.trim();
  const typed = star === '' ? null : { text: star, index: engine.starIndex(star, allSpellings()) };
  try {
    return toProfileView(
      engine.computeProfile({ date: profile.date, time: profile.time, place }, conventions, today),
      typed,
      pack,
    );
  } catch (e) {
    if (e instanceof engine.BirthInputError) {
      const vars = { date: profile.date, time: profile.time };
      throw new FormProblem({ key: e.code === 'format' ? 'form.badFormat' : 'form.notReal', vars });
    }
    throw e;
  }
}

function useProfile(kv: KeyValueStore, entitlements: IEntitlementService, now: () => number) {
  const vault = useMemo(() => new BirthVault(kv, new IndexedDbKeyProvider()), [kv]);
  const [screen, setScreen] = useState<Screen>({ kind: 'loading' });
  const [lang, setLangState] = useState<Lang>('en');
  const pack = packFor(lang);
  const today = new Date(now()).toISOString().slice(0, 10);

  const show = useCallback(
    async (engine: Engine, current: Pack) => {
      const found = await vault.load();
      if (found.state === 'none') return setScreen({ kind: 'form', engine, notice: null });
      if (found.state === 'unreadable')
        return setScreen({ kind: 'unreadable', reason: found.reason });
      try {
        computeView(engine, found.profile, today, current);
        setScreen({ kind: 'ready', engine, profile: found.profile });
      } catch (e) {
        setScreen({ kind: 'form', engine, notice: problemOf(e) });
      }
    },
    [vault, today],
  );

  useEffect(() => {
    void loadAstroLayer(entitlements, ASTRO_FEATURE, loadEngine).then(async (engine) => {
      if (engine === null) return setScreen({ kind: 'locked' });
      const remembered = await readLang(kv);
      setLangState(remembered);
      await show(engine, packFor(remembered));
    });
  }, [entitlements, kv, show]);

  const save = async (engine: Engine, profile: BirthProfile): Promise<Msg | null> => {
    try {
      computeView(engine, profile, today, pack);
      await vault.save(profile);
      setScreen({ kind: 'ready', engine, profile });
      return null;
    } catch (e) {
      return problemOf(e);
    }
  };

  const remove = async () => {
    await vault.remove();
    const engine = await loadAstroLayer(entitlements, ASTRO_FEATURE, loadEngine);
    if (engine !== null) setScreen({ kind: 'form', engine, notice: null });
  };

  const setLang = (next: Lang) => {
    setLangState(next);
    void saveLang(kv, next);
  };

  return { screen, lang, pack, setLang, save, remove, today };
}

function BirthForm(props: {
  engine: Engine;
  notice: Msg | null;
  onSave: (p: BirthProfile) => Promise<Msg | null>;
}) {
  const t = useT();
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [place, setPlace] = useState('');
  const [gender, setGender] = useState('');
  const [star, setStar] = useState('');
  const [message, setMessage] = useState<Msg | null>(props.notice);
  const submit = async () => {
    if (place === '') return setMessage({ key: 'form.needPlace' });
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
    <Section title={t('form.title')}>
      <Field label={t('form.name')} value={name} onChange={setName} testID="birth-name" />
      <Field label={t('form.date')} value={date} onChange={setDate} testID="birth-date" />
      <Field label={t('form.time')} value={time} onChange={setTime} testID="birth-time" />
      <PlacePicker engine={props.engine} value={place} onPick={setPlace} />
      <GenderPicker value={gender} onPick={setGender} />
      <StarPicker engine={props.engine} value={star} onPick={setStar} />
      <Button label={t('form.save')} onPress={() => void submit()} testID="profile-save" />
      {message !== null ? (
        <Text style={styles.message} testID="profile-message">
          {t(message.key, message.vars)}
        </Text>
      ) : null}
    </Section>
  );
}

function ProfileCard(props: {
  engine: Engine;
  profile: BirthProfile;
  today: string;
  pack: Pack;
  now: () => number;
  onDelete: () => Promise<void>;
}) {
  const t = useT();
  const [sure, setSure] = useState(false);
  const view = useMemo(() => {
    try {
      return computeView(props.engine, props.profile, props.today, props.pack);
    } catch {
      return null;
    }
  }, [props.engine, props.profile, props.today, props.pack]);
  if (view === null) return null;
  return (
    <>
      <Section title={t('facts.title')}>
        {view.warnings.map((w) => (
          <Text key={w} style={styles.warning}>
            {w}
          </Text>
        ))}
        {view.rows.map((r) => (
          <Row key={r.label} label={r.label} value={r.value} />
        ))}
        <Note>{t('facts.note')}</Note>
      </Section>
      <ShieldsSection
        engine={props.engine}
        moonSign={view.moonSign}
        moonNakshatra={view.moonNakshatra}
        now={props.now}
      />
      <Section title={t('delete.title')}>
        <Button
          label={sure ? t('delete.confirm') : t('delete.button')}
          onPress={() => (sure ? void props.onDelete() : setSure(true))}
          quiet
          testID="profile-delete"
        />
        <Note>{t('delete.note')}</Note>
      </Section>
    </>
  );
}

function Body(props: { p: ReturnType<typeof useProfile>; now: () => number }) {
  const t = useT();
  const { screen, save, remove, pack, today } = props.p;
  return (
    <>
      <Section title={t('protection.title')}>
        <Note>{t('protection.notice')}</Note>
      </Section>
      {screen.kind === 'loading' ? <Note>{t('screen.loading')}</Note> : null}
      {screen.kind === 'locked' ? <Note>{t('screen.locked')}</Note> : null}
      {screen.kind === 'form' ? (
        <BirthForm
          engine={screen.engine}
          notice={screen.notice}
          onSave={(prof) => save(screen.engine, prof)}
        />
      ) : null}
      {screen.kind === 'ready' ? (
        <ProfileCard
          engine={screen.engine}
          profile={screen.profile}
          today={today}
          pack={pack}
          now={props.now}
          onDelete={remove}
        />
      ) : null}
      {screen.kind === 'unreadable' ? (
        <Section title={t('bad.title')}>
          <Note>{t('bad.note')}</Note>
          <Button
            label={t('bad.button')}
            onPress={() => void remove()}
            quiet
            testID="profile-delete"
          />
        </Section>
      ) : null}
    </>
  );
}

export default function ProfileScreen(props: {
  kv: KeyValueStore;
  entitlements: IEntitlementService;
  now: () => number;
}) {
  const p = useProfile(props.kv, props.entitlements, props.now);
  return (
    <PackProvider pack={p.pack}>
      <ScrollView contentContainerStyle={styles.page} testID="profile-screen">
        <LanguageSwitch value={p.lang} onPick={p.setLang} />
        {p.pack.draft ? <DraftNote /> : null}
        <Body p={p} now={props.now} />
      </ScrollView>
    </PackProvider>
  );
}

function DraftNote() {
  const t = useT();
  return <Note>{t('draft.note')}</Note>;
}

const styles = StyleSheet.create({
  page: { padding: 16, maxWidth: 720, width: '100%', alignSelf: 'center' },
  message: { marginTop: 8, color: colors.text },
  warning: { color: colors.warn, marginBottom: 8, fontSize: 13 },
});
