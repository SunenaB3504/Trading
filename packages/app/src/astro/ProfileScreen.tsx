import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { IEntitlementService } from '../entitlement/types';
import type { KeyValueStore } from '../store/kv';
import { Note, Row, Section, colors } from '../ui/Section';
import { AppText as Text, FontProvider } from '../ui/typography';
import type { Fonts } from '../ui/typography';
import { BirthVault, IndexedDbKeyProvider } from './birthVault';
import type { BirthProfile } from './birthVault';
import { loadEngine } from './engine';
import type { Engine } from './engine';
import { ASTRO_FEATURE } from './feature';
import { familiesFor, loadFonts } from './fonts';
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
  | { kind: 'form'; engine: Engine; notice: Msg | null; initial?: BirthProfile }
  | { kind: 'ready'; engine: Engine; profile: BirthProfile }
  | { kind: 'unreadable'; reason: string };

const CONVENTIONS_VERSION = 1;
const EMPTY_PROFILE: BirthProfile = {
  name: '',
  date: '',
  time: '',
  place: '',
  gender: '',
  star: '',
};

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

  const edit = (engine: Engine, profile: BirthProfile) =>
    setScreen({ kind: 'form', engine, notice: null, initial: profile });

  const cancelEdit = (engine: Engine, profile: BirthProfile) =>
    setScreen({ kind: 'ready', engine, profile });

  const remove = async () => {
    await vault.remove();
    const engine = await loadAstroLayer(entitlements, ASTRO_FEATURE, loadEngine);
    if (engine !== null) setScreen({ kind: 'form', engine, notice: null });
  };

  const setLang = (next: Lang) => {
    setLangState(next);
    void saveLang(kv, next);
  };

  return { screen, lang, pack, setLang, save, edit, cancelEdit, remove, today };
}

function BirthForm(props: {
  engine: Engine;
  notice: Msg | null;
  initial?: BirthProfile;
  onSave: (p: BirthProfile) => Promise<Msg | null>;
  onCancel?: () => void;
}) {
  const t = useT();
  const start = props.initial ?? EMPTY_PROFILE;
  const [name, setName] = useState(start.name);
  const [date, setDate] = useState(start.date);
  const [time, setTime] = useState(start.time);
  const [place, setPlace] = useState(start.place);
  const [gender, setGender] = useState(start.gender);
  const [star, setStar] = useState(start.star);
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
      {props.onCancel !== undefined ? (
        <Button label={t('edit.cancel')} onPress={props.onCancel} quiet testID="profile-cancel" />
      ) : null}
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
  onEdit: () => void;
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
        <Button label={t('edit.button')} onPress={props.onEdit} quiet testID="profile-edit" />
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
  const { screen, save, edit, cancelEdit, remove, pack, today } = props.p;
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
          {...(screen.initial !== undefined ? { initial: screen.initial } : {})}
          onSave={(prof) => save(screen.engine, prof)}
          {...(screen.initial !== undefined
            ? { onCancel: () => cancelEdit(screen.engine, screen.initial as BirthProfile) }
            : {})}
        />
      ) : null}
      {screen.kind === 'ready' ? (
        <ProfileCard
          engine={screen.engine}
          profile={screen.profile}
          today={today}
          pack={pack}
          now={props.now}
          onEdit={() => edit(screen.engine, screen.profile)}
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

/** Loads the fonts for the language in use; until they are ready the screen shows in the device's own font. */
function useFonts(lang: Lang): Fonts | null {
  const [loaded, setLoaded] = useState<Lang | null>(null);
  useEffect(() => {
    let live = true;
    loadFonts(lang)
      .then(() => {
        if (live) setLoaded(lang);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [lang]);
  return loaded === null ? null : familiesFor(loaded);
}

export default function ProfileScreen(props: {
  kv: KeyValueStore;
  entitlements: IEntitlementService;
  now: () => number;
}) {
  const p = useProfile(props.kv, props.entitlements, props.now);
  const fonts = useFonts(p.lang);
  return (
    <PackProvider pack={p.pack}>
      <FontProvider value={fonts}>
        <ScrollView contentContainerStyle={styles.page} testID="profile-screen">
          <LanguageSwitch value={p.lang} onPick={p.setLang} />
          {p.pack.draft ? <DraftNote /> : null}
          <Body p={p} now={props.now} />
        </ScrollView>
      </FontProvider>
    </PackProvider>
  );
}

function DraftNote() {
  const t = useT();
  return (
    <View style={styles.draft}>
      <Note>{t('draft.note')}</Note>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, maxWidth: 720, width: '100%', alignSelf: 'center' },
  draft: { marginBottom: 14 },
  message: { marginTop: 8, color: colors.text },
  warning: { color: colors.warn, marginBottom: 8, fontSize: 13 },
});
