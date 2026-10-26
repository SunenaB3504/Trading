import { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { Profile } from '../profiles/profiles';
import type { KeyValueStore } from '../store/kv';
import { PaperSession } from '../trading/paperSession';
import type { SessionView } from '../trading/paperSession';
import { Button } from '../ui/Button';
import { Note, Row, Section, colors } from '../ui/Section';
import { AppText as Text } from '../ui/typography';

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

function usePractice(kv: KeyValueStore, now: () => number): SessionView | null {
  const [view, setView] = useState<SessionView | null>(null);
  useEffect(() => {
    let live = true;
    void PaperSession.open(kv, now)
      .then((s) => s.view())
      .then((v) => {
        if (live) setView(v);
      });
    return () => {
      live = false;
    };
  }, [kv, now]);
  return view;
}

export function HomeScreen(props: {
  profile: Profile;
  kv: KeyValueStore;
  now: () => number;
  onGo: (section: 'practise' | 'learn' | 'settings') => void;
}) {
  const view = usePractice(props.kv, props.now);
  return (
    <ScrollView contentContainerStyle={styles.page} testID="home-screen">
      <Text style={styles.hello}>{`Hello, ${props.profile.name}`}</Text>
      <Section title="Your practice account">
        <Row label="Cash" value={view?.cash ?? '...'} />
        <Row label="Open positions" value={view === null ? '...' : String(view.positions.length)} />
        <Row label="Orders placed" value={view === null ? '...' : String(view.orders.length)} />
        <Note>Practice runs on built-in demo prices for now; real NSE prices come next.</Note>
        <Button label="Go to Practise" onPress={() => props.onGo('practise')} quiet />
      </Section>
      <Section title="What is here, and what is coming">
        <Row label="Practise: trade, ledger, report" value="Ready (demo prices)" />
        <Row label="Learn: lessons and quizzes" value="Coming" />
        <Row label="Measure: journal and mistakes" value="Coming" />
        <Row label="Tutor: guide and AI tutor" value="Coming" />
        <Button label="Profiles and backup" onPress={() => props.onGo('settings')} quiet />
      </Section>
    </ScrollView>
  );
}

/** A section that is planned but not built yet; it says plainly what will be there. */
export function ComingScreen(props: { title: string; lines: string[]; testID: string }) {
  return (
    <ScrollView contentContainerStyle={styles.page} testID={props.testID}>
      <Section title={props.title}>
        {props.lines.map((l) => (
          <Text key={l} style={styles.line}>{`• ${l}`}</Text>
        ))}
        <Note>Not built yet. This page shows what will be here.</Note>
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
