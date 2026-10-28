import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { Profile } from '../profiles/profiles';
import type { KeyValueStore } from '../store/kv';
import type { Market } from '../trading/market';
import { PaperSession } from '../trading/paperSession';
import type { SessionView } from '../trading/paperSession';
import { Button } from '../ui/Button';
import { Note, Row, Section, colors } from '../ui/Section';
import { AppText as Text } from '../ui/typography';
import { AskPanel } from '../tutor/AskPanel';
import { guideContext } from '../tutor/guide';
import type { TutorEnv } from '../tutor/run';
import { CoachHint } from '../ui/CoachHint';

export const DISCLAIMER =
  'Practice and learning only. No real money, no broker, no real orders. Nothing in this app is investment advice.';

/** The note every person sees until it is accepted on the device (SSD v4.1 §11). */
export function Disclaimer(props: { onAccept: () => void }) {
  return (
    <View style={styles.disclaimer} testID="disclaimer">
      <Text style={styles.disclaimerText}>{DISCLAIMER}</Text>
      <Button label="I understand" onPress={props.onAccept} testID="accept-disclaimer" />
    </View>
  );
}

function usePractice(kv: KeyValueStore, now: () => number, market: Market): SessionView | null {
  const [view, setView] = useState<SessionView | null>(null);
  useEffect(() => {
    let live = true;
    void PaperSession.open(kv, now, market)
      .then((s) => s.view())
      .then((v) => {
        if (live) setView(v);
      });
    return () => {
      live = false;
    };
  }, [kv, now, market]);
  return view;
}

export function HomeScreen(props: {
  profile: Profile;
  kv: KeyValueStore;
  now: () => number;
  market: Market;
  env: TutorEnv;
  onGo: (section: 'practise' | 'learn' | 'settings') => void;
}) {
  const view = usePractice(props.kv, props.now, props.market);
  return (
    <ScrollView contentContainerStyle={styles.page} testID="home-screen">
      <CoachHint screen="home" />
      <Text style={styles.hello}>{`Hello, ${props.profile.name}`}</Text>
      <Section title={`Your practice account (${props.market.label.toLowerCase()})`}>
        <Row label="Cash" value={view?.cash ?? '...'} />
        <Row label="Open positions" value={view === null ? '...' : String(view.positions.length)} />
        <Row label="Orders placed" value={view === null ? '...' : String(view.orders.length)} />
        <Note>
          {props.market.kind === 'real'
            ? `Real NSE prices to ${props.market.lastDate}. Switch between demo and real prices at the top of Practise.`
            : 'Built-in demo prices. Real NSE prices can be chosen at the top of Practise on the laptop.'}
        </Note>
        <Button label="Go to Practise" onPress={() => props.onGo('practise')} quiet />
      </Section>
      <Section title="Learning guide">
        <AskPanel env={props.env} label="What should I learn next?" testID="home-guide" build={() => guideContext(props.kv)} />
        <Button label="Profiles and backup" onPress={() => props.onGo('settings')} quiet />
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, maxWidth: 720, width: '100%', alignSelf: 'center' },
  hello: { fontSize: 20, fontWeight: '700', color: colors.text, marginBottom: 16 },
  line: { color: colors.text, fontSize: 14, marginVertical: 3 },
  disclaimer: {
    margin: 16,
    marginBottom: 0,
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#fff7e6',
    borderWidth: 1,
    borderColor: '#f0d9a8',
  },
  disclaimerText: { color: colors.text, fontSize: 14 },
});
