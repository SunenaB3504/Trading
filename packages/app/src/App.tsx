import { useCallback, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { DataServiceClient } from './dataClient/client';
import type { FetchLike } from './dataClient/client';
import { useKeyboardHeight } from './hooks/useKeyboardHeight';
import { useOnline } from './hooks/useOnline';
import { openDeviceStores, removeRetiredStores, secureRandomHex } from './platform/device';
import { prepareDevice } from './profiles/migrate';
import { ProfileSwitcher } from './profiles/ProfileSwitcher';
import { ProfileStore } from './profiles/profiles';
import type { Profile } from './profiles/profiles';
import { BackupScreen } from './screens/BackupScreen';
import { CompareScreen } from './screens/CompareScreen';
import { DataScreen } from './screens/DataScreen';
import { Disclaimer, HomeScreen } from './screens/HomeScreen';
import { LedgerScreen } from './screens/LedgerScreen';
import { PinScreen } from './screens/PinScreen';
import { ProfilesScreen } from './screens/ProfilesScreen';
import { ReportScreen } from './screens/ReportScreen';
import { GuideScreen } from './screens/GuideScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { AskScreenBar } from './tutor/AskScreenBar';
import { ChartScreen } from './screens/ChartScreen';
import { RoboScreen } from './screens/RoboScreen';
import { StrategyLabScreen } from './screens/StrategyLabScreen';
import { BuilderScreen } from './screens/BuilderScreen';
import { FnoScreen } from './screens/FnoScreen';
import { TaxScreen } from './screens/TaxScreen';
import { BondScreen } from './screens/BondScreen';
import { OptionsLabScreen } from './screens/OptionsLabScreen';
import { TimeMachineScreen } from './screens/TimeMachineScreen';
import { TutorScreen } from './screens/TutorScreen';
import type { TutorEnv } from './tutor/run';
import { FundsScreen } from './screens/FundsScreen';
import { LearnScreen } from './screens/LearnScreen';
import { MeasureScreen } from './screens/MeasureScreen';
import { TradeScreen } from './screens/TradeScreen';
import { UniverseScreen } from './screens/UniverseScreen';
import { loadDeviceSettings, saveDeviceSettings } from './settings/settings';
import type { DeviceSettings } from './settings/settings';
import type { SecureStore } from './secure/secureStore';
import { fundsNote, useFunds } from './trading/useFunds';
import { useMarkets } from './trading/useMarkets';
import type { Markets } from './trading/useMarkets';
import type { FundsMarket, IndexUnderlyingId } from '@trading/core';
import { fnoDataOf } from './fno/fnoSessions';
import type { KeyValueStore } from './store/kv';
import { colors } from './ui/Section';
import { RootErrorBoundary } from './ui/RootErrorBoundary';
import { TabStrip } from './ui/TabStrip';

type SectionId = 'home' | 'learn' | 'practise' | 'measure' | 'tutor' | 'settings';
type PractiseId = 'trade' | 'funds' | 'machine' | 'builder' | 'charts' | 'lab' | 'robo' | 'fno' | 'optlab' | 'tax' | 'bonds' | 'ledger' | 'universe' | 'compare' | 'report';
type SettingsId = 'general' | 'profiles' | 'backup' | 'data' | 'guide';

const SECTIONS = [
  ['home', 'Home'],
  ['learn', 'Learn'],
  ['practise', 'Practise'],
  ['measure', 'Measure'],
  ['tutor', 'Tutor'],
  ['settings', 'Settings'],
] as const;
const PRACTISE = [
  ['trade', 'Trade'],
  ['funds', 'Funds'],
  ['machine', 'Time Machine'],
  ['builder', 'Builder'],
  ['charts', 'Charts'],
  ['lab', 'Strategy Lab'],
  ['robo', 'Robo'],
  ['fno', 'F&O'],
  ['optlab', 'Options Lab'],
  ['tax', 'Tax'],
  ['bonds', 'Bonds'],
  ['ledger', 'Ledger'],
  ['universe', 'Universe'],
  ['compare', 'Compare'],
  ['report', 'Report'],
] as const;
const SETTINGS = [
  ['general', 'General'],
  ['profiles', 'Profiles'],
  ['backup', 'Backup'],
  ['data', 'Data'],
  ['guide', 'Guide'],
] as const;

/** `fetch` must be called as a plain function; calling it as a method of another object throws "Illegal invocation". */
const browserFetch: FetchLike = (url, init) => fetch(url, init);

const DEFAULT_SERVICE = 'http://127.0.0.1:8787';

function serviceUrl(): string {
  if (typeof window === 'undefined' || typeof window.location?.search !== 'string')
    return DEFAULT_SERVICE;
  return new URLSearchParams(window.location.search).get('service') ?? DEFAULT_SERVICE;
}

interface Device {
  kv: KeyValueStore;
  secure: SecureStore;
  profiles: ProfileStore;
}

/** Opens the device's stores, upgrades a single-user device to profiles, and loads the open profile. */
function useDevice() {
  const device = useMemo((): Device => {
    const { kv, secure } = openDeviceStores();
    return { kv, secure, profiles: new ProfileStore(kv, secure, () => Date.now(), secureRandomHex) };
  }, []);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [settings, setSettings] = useState<DeviceSettings | null>(null);
  const [locked, setLocked] = useState(true);
  useEffect(() => {
    void (async () => {
      await removeRetiredStores();
      const open = await prepareDevice(device.kv, device.profiles);
      setSettings(await loadDeviceSettings(device.kv));
      setProfile(open);
      setLocked(open.hasPin);
    })();
  }, [device]);
  const reload = useCallback(async () => {
    const open = await device.profiles.current();
    if (open !== null) setProfile(open);
  }, [device]);
  const open = useCallback(
    async (id: string) => {
      await device.profiles.select(id);
      const p = await device.profiles.current();
      setProfile(p);
      setLocked(p?.hasPin ?? false);
    },
    [device],
  );
  return { device, profile, settings, setSettings, locked, setLocked, reload, open };
}

function Practise(props: { env: TutorEnv; kv: KeyValueStore; now: () => number; markets: Markets; funds: FundsMarket | null; first: PractiseId }) {
  const [tab, setTab] = useState<PractiseId>(props.first);
  const { kv, now, markets, funds, env } = props;
  const market = markets.market;
  const fnoData = useMemo(() => fnoDataOf(markets.real), [markets.real]);
  const spotOf = (u: IndexUnderlyingId): number | null => {
    const last = fnoData?.dates[fnoData.dates.length - 1];
    const level = last === undefined ? null : (fnoData?.spot(u, last, 'close') ?? null);
    return level === null ? null : level / 100;
  };
  const screens: Record<PractiseId, () => React.ReactElement> = {
    trade: () => <TradeScreen kv={kv} now={now} market={market} env={env} />,
    funds: () => <FundsScreen kv={kv} now={now} funds={funds} />,
    machine: () => <TimeMachineScreen kv={kv} now={now} real={markets.real} funds={funds} env={env} />,
    builder: () => <BuilderScreen real={markets.real} funds={funds} />,
    charts: () => <ChartScreen market={market} />,
    lab: () => <StrategyLabScreen kv={kv} now={now} real={markets.real} />,
    robo: () => <RoboScreen kv={kv} now={now} real={markets.real} />,
    fno: () => <FnoScreen kv={kv} now={now} real={markets.real} />,
    optlab: () => <OptionsLabScreen spotOf={spotOf} />,
    tax: () => <TaxScreen kv={kv} now={now} market={market} real={markets.real} />,
    bonds: () => <BondScreen />,
    ledger: () => <LedgerScreen kv={kv} now={now} />,
    universe: () => <UniverseScreen />,
    compare: () => <CompareScreen kv={kv} now={now} market={market} />,
    report: () => <ReportScreen kv={kv} now={now} market={market} />,
  };
  return (
    <>
      <TabStrip tabs={PRACTISE} active={tab} onSelect={setTab} small />
      <View style={styles.body} key={market.id}>{screens[tab]()}</View>
    </>
  );
}

function Settings(props: {
  d: ReturnType<typeof useDevice>;
  profile: Profile;
  settings: DeviceSettings;
  now: () => number;
  client: DataServiceClient;
  prices: string[];
  onImported: (p: Profile) => void;
  first?: SettingsId;
}) {
  const [tab, setTab] = useState<SettingsId>(props.first ?? 'general');
  const { d, profile, now } = props;
  const profileKv = useMemo(() => d.device.profiles.scope(profile.id), [d.device, profile.id]);
  return (
    <>
      <TabStrip tabs={SETTINGS} active={tab} onSelect={setTab} small />
      {tab === 'general' ? (
        <SettingsScreen profile={profile} profileKv={profileKv} deviceKv={d.device.kv} device={props.settings} onDevice={d.setSettings} />
      ) : null}
      {tab === 'profiles' ? (
        <ProfilesScreen profiles={d.device.profiles} open={profile} onSwitch={(id) => void d.open(id)} onChanged={() => void d.reload()} />
      ) : null}
      {tab === 'backup' ? (
        <BackupScreen device={d.device.kv} profiles={d.device.profiles} profile={profile} now={now} onImported={props.onImported} />
      ) : null}
      {tab === 'data' ? <DataScreen client={props.client} kv={d.device.kv} now={now} prices={props.prices} /> : null}
      {tab === 'guide' ? <GuideScreen /> : null}
    </>
  );
}

/** The title bar. The open profile's name opens the profile switcher (the ▾ says it is a list). */
function Header(props: { profile: Profile | null; online: boolean; onProfile: () => void }) {
  return (
    <View style={styles.header}>
      <Text style={styles.brand}>Market Learning</Text>
      {props.profile !== null ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`Profile ${props.profile.name}: switch or add a profile`}
          onPress={props.onProfile}
          testID="profile-switch"
          style={styles.badge}
        >
          <Text style={styles.profile} testID="profile-badge">
            {props.profile.name}
          </Text>
          <Text style={styles.profile}> ▾</Text>
        </Pressable>
      ) : null}
      <Text style={props.online ? styles.online : styles.offline}>{props.online ? 'Online' : 'Offline'}</Text>
    </View>
  );
}

function Main(props: {
  d: ReturnType<typeof useDevice>;
  profile: Profile;
  settings: DeviceSettings;
  profileKv: KeyValueStore;
  section: SectionId;
  setSection: (s: SectionId) => void;
  now: () => number;
  client: DataServiceClient;
  onImported: (p: Profile) => void;
  /** Opens Settings on this tab; a new `settingsKey` opens it again even when Settings is already showing. */
  settingsFirst: SettingsId;
  settingsKey: number;
}) {
  const { d, profile, settings, profileKv, section, now } = props;
  const markets = useMarkets(d.device.kv, props.client, now);
  const funds = useFunds(d.device.kv, props.client, now);
  const prices = [markets.realNote, fundsNote(funds)];
  const env = useMemo((): TutorEnv => ({ device: d.device.kv, profile: profileKv, secure: d.device.secure, settings, names: [profile.name], now }), [d.device, profileKv, settings, profile.name, now]);
  const [first, setFirst] = useState<PractiseId>('trade');
  const tryIt = (tab: string) => {
    setFirst(PRACTISE.find((t) => t[0] === tab)?.[0] ?? 'trade');
    props.setSection('practise');
  };
  const accept = () => {
    const next = { ...settings, disclaimerAcceptedAt: Date.now() };
    void saveDeviceSettings(d.device.kv, next).then(() => d.setSettings(next));
  };
  return (
    <>
      {settings.disclaimerAcceptedAt === null ? <Disclaimer onAccept={accept} /> : null}
      <TabStrip tabs={SECTIONS} active={section} onSelect={props.setSection} />
      <AskScreenBar env={env} screen={section} label={SECTIONS.find((s) => s[0] === section)?.[1] ?? section} />
      {section === 'home' ? (
        <HomeScreen profile={profile} kv={profileKv} now={now} market={markets.market} env={env} onGo={props.setSection} />
      ) : null}
      {section === 'learn' ? <LearnScreen kv={profileKv} now={now} env={env} onTry={tryIt} /> : null}
      {section === 'practise' ? <Practise env={env} kv={profileKv} now={now} markets={markets} funds={funds} first={first} /> : null}
      {section === 'measure' ? <MeasureScreen kv={profileKv} now={now} market={markets.market} env={env} /> : null}
      {section === 'tutor' ? <TutorScreen env={env} owner={profile.owner} deviceKv={d.device.kv} profileKv={profileKv} onDevice={d.setSettings} /> : null}
      {section === 'settings' ? (
        <Settings key={props.settingsKey} d={d} profile={profile} settings={settings} now={now} client={props.client} prices={prices} onImported={props.onImported} first={props.settingsFirst} />
      ) : null}
    </>
  );
}

/** The other profiles, for the PIN screen's "open another profile". */
function useOthers(d: ReturnType<typeof useDevice>): Profile[] {
  const [others, setOthers] = useState<Profile[]>([]);
  const { device, profile, locked } = d;
  useEffect(() => {
    void device.profiles.list().then((l) => setOthers(l.filter((p) => p.id !== profile?.id)));
  }, [device, profile, locked]);
  return others;
}

function AppBody() {
  const [section, setSection] = useState<SectionId>('home');
  const online = useOnline();
  const client = useMemo(() => new DataServiceClient(browserFetch, serviceUrl()), []);
  const now = useMemo(() => () => Date.now(), []);
  const d = useDevice();
  const others = useOthers(d);
  const { profile, settings } = d;
  const [switcher, setSwitcher] = useState(false);
  const [manage, setManage] = useState<{ first: SettingsId; key: number }>({ first: 'general', key: 0 });
  // Bumped after a backup import, so every screen reads the profile's data again; a rename or an added profile
  // keeps the same store, so the open screens (and the prices) are not reloaded for nothing.
  const [generation, setGeneration] = useState(0);
  const profileId = profile?.id ?? null;
  const profileKv = useMemo(
    () => (profileId === null ? null : d.device.profiles.scope(profileId)),
    [d.device, profileId, generation],
  );
  const onImported = () =>
    void d.reload().then(() => {
      setGeneration((g) => g + 1);
    });
  const openManage = () => {
    setManage((m) => ({ first: 'profiles', key: m.key + 1 }));
    setSection('settings');
  };
  let body = null;
  if (profile !== null && settings !== null && profileKv !== null) {
    body = d.locked ? (
      <PinScreen
        profile={profile}
        others={others}
        check={(pin) => d.device.profiles.checkPin(profile.id, pin)}
        onUnlock={() => d.setLocked(false)}
        onSwitch={(id) => void d.open(id)}
      />
    ) : (
      <View style={styles.body}>
        <Main d={d} profile={profile} settings={settings} profileKv={profileKv} section={section} setSection={setSection} now={now} client={client} onImported={onImported} settingsFirst={manage.first} settingsKey={manage.key} />
      </View>
    );
  }
  return (
    <SafeFrame>
      <Header profile={profile} online={online} onProfile={() => setSwitcher((o) => !o)} />
      <View style={styles.body}>
        {body}
        {switcher && profile !== null && !d.locked ? (
          <ProfileSwitcher
            profiles={d.device.profiles}
            open={profile}
            onSwitch={(id) => void d.open(id)}
            onManage={openManage}
            onClose={() => setSwitcher(false)}
          />
        ) : null}
      </View>
    </SafeFrame>
  );
}

/**
 * Keeps the app clear of the status bar, the phone's navigation bar and an open keyboard. Android draws edge to edge,
 * so nothing does this by default (EasyCTET runbook, safe navigation padding).
 */
function SafeFrame({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const keyboard = useKeyboardHeight();
  return (
    <View style={[styles.root, { paddingTop: insets.top, paddingBottom: Math.max(insets.bottom, keyboard) }]}>
      {children}
    </View>
  );
}

export default function App() {
  return (
    <RootErrorBoundary>
      <SafeAreaProvider>
        <AppBody />
      </SafeAreaProvider>
    </RootErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  body: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 16, flexShrink: 0 },
  brand: { fontSize: 18, fontWeight: '700', color: colors.text, flex: 1 },
  badge: { minHeight: 44, minWidth: 44, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  profile: { color: colors.accent, fontWeight: '600' },
  online: { color: '#0a7d33', fontWeight: '600' },
  offline: { color: colors.warn, fontWeight: '600' },
});
