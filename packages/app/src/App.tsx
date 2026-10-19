import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { ScrollViewInstance } from 'react-native';
import { DataServiceClient } from './dataClient/client';
import type { FetchLike } from './dataClient/client';
import { ASTRO_FEATURE } from './astro/feature';
import { EntitlementProvider, useEntitlementService, useFeatureAccess } from './entitlement/react';
import { SwitchedEntitlements, resolveLayerSwitch } from './entitlement/switched';
import { useOnline } from './hooks/useOnline';
import { BackupScreen } from './screens/BackupScreen';
import { CompareScreen } from './screens/CompareScreen';
import { DataScreen } from './screens/DataScreen';
import { LedgerScreen } from './screens/LedgerScreen';
import { ReportScreen } from './screens/ReportScreen';
import { UniverseScreen } from './screens/UniverseScreen';
import { TradeScreen } from './screens/TradeScreen';
import { IndexedDbKv } from './store/indexedDbKv';
import type { KeyValueStore } from './store/kv';
import { MoreHint, useScrollHint } from './ui/ScrollHint';
import { colors } from './ui/Section';

type Tab = 'ledger' | 'universe' | 'trade' | 'compare' | 'report' | 'backup' | 'data' | 'profile';

/** Fetched only when the tab is opened and access is granted, so a locked device never downloads it. */
const ProfileScreen = lazy(() => import('./astro/ProfileScreen'));

/** `fetch` must be called as a plain function; calling it as a method of another object throws "Illegal invocation". */
const browserFetch: FetchLike = (url, init) => fetch(url, init);

const DEFAULT_SERVICE = 'http://127.0.0.1:8787';

function serviceUrl(): string {
  if (typeof window === 'undefined' || typeof window.location?.search !== 'string')
    return DEFAULT_SERVICE;
  return new URLSearchParams(window.location.search).get('service') ?? DEFAULT_SERVICE;
}

function searchOf(): string {
  return typeof window === 'undefined' || typeof window.location?.search !== 'string'
    ? ''
    : window.location.search;
}

/** The Profile tab exists only when the entitlement service grants it (FR-P10 b). */
function ProfileTab(props: { active: Tab; onSelect: (t: Tab) => void; onSpot: Spot }) {
  const allowed = useFeatureAccess(ASTRO_FEATURE) === true;
  return allowed ? (
    <TabButton id="profile" active={props.active} onSelect={props.onSelect} onSpot={props.onSpot}>
      Profile
    </TabButton>
  ) : null;
}

function ProfileSlot(props: { kv: KeyValueStore; now: () => number }) {
  const allowed = useFeatureAccess(ASTRO_FEATURE) === true;
  const entitlements = useEntitlementService();
  if (!allowed) return null;
  return (
    <Suspense fallback={null}>
      <ProfileScreen kv={props.kv} entitlements={entitlements} now={props.now} />
    </Suspense>
  );
}

type Spot = (id: Tab, x: number, width: number) => void;

function TabButton(props: {
  id: Tab;
  active: Tab;
  onSelect: (t: Tab) => void;
  onSpot?: Spot;
  children: string;
}) {
  const selected = props.id === props.active;
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={() => props.onSelect(props.id)}
      onLayout={(e) => props.onSpot?.(props.id, e.nativeEvent.layout.x, e.nativeEvent.layout.width)}
      style={[styles.tab, selected ? styles.tabActive : null]}
    >
      <Text style={selected ? styles.tabTextActive : styles.tabText}>{props.children}</Text>
    </Pressable>
  );
}

const TABS: Array<[Exclude<Tab, 'profile'>, string]> = [
  ['ledger', 'Ledger'],
  ['universe', 'Universe'],
  ['trade', 'Trade'],
  ['compare', 'Compare'],
  ['report', 'Report'],
  ['backup', 'Backup'],
  ['data', 'Data'],
];

function TabStrip(props: { active: Tab; onSelect: (t: Tab) => void }) {
  const ref = useRef<ScrollViewInstance>(null);
  const spots = useRef<Partial<Record<Tab, { x: number; width: number }>>>({});
  const hint = useScrollHint();
  const view = useRef(hint.box);
  view.current = hint.box;
  // Selecting a tab that is cut off by the edge slides it fully into view.
  useEffect(() => {
    const spot = spots.current[props.active];
    const b = view.current;
    if (spot === undefined || b.view === 0) return;
    if (spot.x < b.x || spot.x + spot.width > b.x + b.view) {
      ref.current?.scrollTo({ x: Math.max(0, spot.x - 16), animated: true });
    }
  }, [props.active]);
  const onSpot: Spot = (id, x, width) => {
    spots.current[id] = { x, width };
  };
  return (
    <View style={styles.tabsWrap}>
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.tabsScroll}
        contentContainerStyle={styles.tabs}
        accessibilityRole="tablist"
        onLayout={hint.onLayout}
        onContentSizeChange={hint.onContentSizeChange}
        onScroll={hint.onScroll}
        scrollEventThrottle={16}
      >
        {TABS.map(([id, label]) => (
          <TabButton
            key={id}
            id={id}
            active={props.active}
            onSelect={props.onSelect}
            onSpot={onSpot}
          >
            {label}
          </TabButton>
        ))}
        <ProfileTab active={props.active} onSelect={props.onSelect} onSpot={onSpot} />
      </ScrollView>
      <MoreHint show={hint.showMore} />
    </View>
  );
}

function Screens(props: {
  tab: Tab;
  kv: KeyValueStore;
  now: () => number;
  client: DataServiceClient;
}) {
  const { tab, kv, now, client } = props;
  return (
    <>
      {tab === 'ledger' ? <LedgerScreen kv={kv} now={now} /> : null}
      {tab === 'universe' ? <UniverseScreen /> : null}
      {tab === 'trade' ? <TradeScreen kv={kv} now={now} /> : null}
      {tab === 'compare' ? <CompareScreen kv={kv} now={now} /> : null}
      {tab === 'report' ? <ReportScreen kv={kv} now={now} /> : null}
      {tab === 'backup' ? <BackupScreen kv={kv} now={now} /> : null}
      {tab === 'data' ? <DataScreen client={client} kv={kv} now={now} /> : null}
      {tab === 'profile' ? <ProfileSlot kv={kv} now={now} /> : null}
    </>
  );
}

/** The entitlement service for this device: everything except the optional layer, which follows the owner's switch. */
function useLayerEntitlements(kv: KeyValueStore): SwitchedEntitlements {
  const [layerOn, setLayerOn] = useState(false);
  useEffect(() => {
    void resolveLayerSwitch(kv, searchOf()).then(setLayerOn);
  }, [kv]);
  return useMemo(() => new SwitchedEntitlements(layerOn), [layerOn]);
}

export default function App() {
  const [tab, setTab] = useState<Tab>('ledger');
  const online = useOnline();
  const kv: KeyValueStore = useMemo(() => new IndexedDbKv(), []);
  const client = useMemo(() => new DataServiceClient(browserFetch, serviceUrl()), []);
  const now = useMemo(() => () => Date.now(), []);
  const entitlements = useLayerEntitlements(kv);
  return (
    <EntitlementProvider service={entitlements}>
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.brand}>Mock trading</Text>
          <Text style={online ? styles.online : styles.offline}>
            {online ? 'Online' : 'Offline'}
          </Text>
        </View>
        <TabStrip active={tab} onSelect={setTab} />
        <Screens tab={tab} kv={kv} now={now} client={client} />
      </SafeAreaView>
    </EntitlementProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16, flexShrink: 0 },
  brand: { fontSize: 18, fontWeight: '700', color: colors.text },
  online: { color: '#0a7d33', fontWeight: '600' },
  offline: { color: colors.warn, fontWeight: '600' },
  // flexShrink 0: a long screen below must never squeeze the tab strip to nothing (found in UAT, G1)
  tabsWrap: { flexShrink: 0 },
  tabsScroll: { flexGrow: 0, flexShrink: 0, borderBottomWidth: 1, borderBottomColor: colors.line },
  tabs: { flexDirection: 'row' },
  tab: { paddingHorizontal: 20, minHeight: 44, justifyContent: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.accent },
  tabText: { color: colors.muted },
  tabTextActive: { color: colors.accent, fontWeight: '600' },
});
