import { useMemo, useState } from 'react';
import { Pressable, SafeAreaView, StyleSheet, Text, View } from 'react-native';
import { DataServiceClient } from './dataClient/client';
import type { FetchLike } from './dataClient/client';
import { GrantAllEntitlements } from './entitlement/grantAll';
import { EntitlementProvider } from './entitlement/react';
import { useOnline } from './hooks/useOnline';
import { DataScreen } from './screens/DataScreen';
import { LedgerScreen } from './screens/LedgerScreen';
import { TradeScreen } from './screens/TradeScreen';
import { IndexedDbKv } from './store/indexedDbKv';
import type { KeyValueStore } from './store/kv';
import { colors } from './ui/Section';

type Tab = 'ledger' | 'trade' | 'data';

/** `fetch` must be called as a plain function; calling it as a method of another object throws "Illegal invocation". */
const browserFetch: FetchLike = (url, init) => fetch(url, init);

const DEFAULT_SERVICE = 'http://127.0.0.1:8787';

function serviceUrl(): string {
  if (typeof window === 'undefined' || typeof window.location?.search !== 'string')
    return DEFAULT_SERVICE;
  return new URLSearchParams(window.location.search).get('service') ?? DEFAULT_SERVICE;
}

function TabButton(props: { id: Tab; active: Tab; onSelect: (t: Tab) => void; children: string }) {
  const selected = props.id === props.active;
  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      onPress={() => props.onSelect(props.id)}
      style={[styles.tab, selected ? styles.tabActive : null]}
    >
      <Text style={selected ? styles.tabTextActive : styles.tabText}>{props.children}</Text>
    </Pressable>
  );
}

export default function App() {
  const [tab, setTab] = useState<Tab>('ledger');
  const online = useOnline();
  const kv: KeyValueStore = useMemo(() => new IndexedDbKv(), []);
  const client = useMemo(() => new DataServiceClient(browserFetch, serviceUrl()), []);
  const now = useMemo(() => () => Date.now(), []);
  const entitlements = useMemo(() => new GrantAllEntitlements(), []);
  return (
    <EntitlementProvider service={entitlements}>
      <SafeAreaView style={styles.root}>
        <View style={styles.header}>
          <Text style={styles.brand}>Mock trading</Text>
          <Text style={online ? styles.online : styles.offline}>
            {online ? 'Online' : 'Offline'}
          </Text>
        </View>
        <View style={styles.tabs} accessibilityRole="tablist">
          <TabButton id="ledger" active={tab} onSelect={setTab}>
            Ledger
          </TabButton>
          <TabButton id="trade" active={tab} onSelect={setTab}>
            Trade
          </TabButton>
          <TabButton id="data" active={tab} onSelect={setTab}>
            Data
          </TabButton>
        </View>
        {tab === 'ledger' ? <LedgerScreen kv={kv} now={now} /> : null}
        {tab === 'trade' ? <TradeScreen kv={kv} now={now} /> : null}
        {tab === 'data' ? <DataScreen client={client} kv={kv} now={now} /> : null}
      </SafeAreaView>
    </EntitlementProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.background },
  header: { flexDirection: 'row', justifyContent: 'space-between', padding: 16 },
  brand: { fontSize: 18, fontWeight: '700', color: colors.text },
  online: { color: '#0a7d33', fontWeight: '600' },
  offline: { color: colors.warn, fontWeight: '600' },
  tabs: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: colors.line },
  tab: { paddingHorizontal: 20, minHeight: 44, justifyContent: 'center' },
  tabActive: { borderBottomWidth: 2, borderBottomColor: colors.accent },
  tabText: { color: colors.muted },
  tabTextActive: { color: colors.accent, fontWeight: '600' },
});
