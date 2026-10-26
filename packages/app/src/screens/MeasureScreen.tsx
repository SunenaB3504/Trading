import { useCallback, useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { lessonById } from '@trading/content';
import type { Flag, MistakeRule } from '@trading/core';
import { EMOTIONS, addAfter, exitPlanIds, loadJournal } from '../journal/journalStore';
import type { Emotion, JournalEntry } from '../journal/journalStore';
import { loadProfileSettings } from '../settings/settings';
import type { KeyValueStore } from '../store/kv';
import type { Market } from '../trading/market';
import { PaperSession } from '../trading/paperSession';
import { Button } from '../ui/Button';
import { CoachHint } from '../ui/CoachHint';
import { Note, Row, Section, colors } from '../ui/Section';
import { TabStrip } from '../ui/TabStrip';
import { Choice, Field } from './TradeScreen';

const TABS = [
  ['mistakes', 'Mistakes'],
  ['journal', 'Journal'],
] as const;

const RULES: Record<MistakeRule, { title: string; lesson: string }> = {
  no_exit_plan: { title: 'No exit plan', lesson: 'habits-that-help' },
  position_too_large: { title: 'Position too large', lesson: 'types-of-risk' },
  averaging_down: { title: 'Averaging down', lesson: 'behavioural-traps' },
  revenge_trading: { title: 'Revenge trading', lesson: 'behavioural-traps' },
  overtrading: { title: 'Overtrading', lesson: 'costs-of-trading' },
  holding_losers: { title: 'Holding losers, cutting winners', lesson: 'behavioural-traps' },
};

function FlagCard({ flag }: { flag: Flag }) {
  const rule = RULES[flag.rule];
  return (
    <View style={styles.card} testID={`flag-${flag.rule}`}>
      <Text style={styles.cardTitle}>{`${rule.title}${flag.orderId !== null ? `, order ${flag.orderId}` : ''}`}</Text>
      <Text style={styles.cardText}>{flag.detail}</Text>
      <Note>{`${flag.date}. Lesson: ${lessonById(rule.lesson)?.title ?? ''} (Learn)`}</Note>
    </View>
  );
}

function Mistakes({ kv, now, market }: { kv: KeyValueStore; now: () => number; market: Market }) {
  const [flags, setFlags] = useState<Flag[] | null>(null);
  useEffect(() => {
    let live = true;
    void (async () => {
      const [session, settings, journal] = await Promise.all([PaperSession.open(kv, now, market), loadProfileSettings(kv), loadJournal(kv)]);
      const found = await session.mistakes(exitPlanIds(journal, market.id), settings.mistakes);
      if (live) setFlags(found);
    })();
    return () => {
      live = false;
    };
  }, [kv, now, market]);
  if (flags === null) return <Note>Checking your book...</Note>;
  return (
    <View testID="mistakes-view">
      <Section title={`Flags in the ${market.kind === 'demo' ? 'demo' : 'real prices'} book`}>
        {flags.length === 0 ? <Note>No flags. That means no habit crossed a threshold, not that every trade was wise.</Note> : null}
        {flags.map((f, i) => (
          <FlagCard key={`${f.rule}-${f.orderId ?? ''}-${String(i)}`} flag={f} />
        ))}
        <Note>These are habits to look at, not verdicts. Thresholds are your profile settings. Leverage and sector checks come with futures and sector data.</Note>
      </Section>
    </View>
  );
}

function ReviewForm({ onSave }: { onSave: (a: { what: string; learned: string; emotion: Emotion | null }) => void }) {
  const [what, setWhat] = useState('');
  const [learned, setLearned] = useState('');
  const [emotion, setEmotion] = useState<Emotion | ''>('');
  return (
    <View>
      <Field label="What happened?" value={what} onChange={setWhat} testID="review-what" />
      <Field label="What did I learn?" value={learned} onChange={setLearned} testID="review-learned" />
      <Choice label="How did I feel? (optional)" value={emotion} options={EMOTIONS} onChange={setEmotion} testID="review-emotion" />
      <Button label="Save my review" onPress={() => onSave({ what, learned, emotion: emotion === '' ? null : emotion })} testID="review-save" />
    </View>
  );
}

function Entry(props: { entry: JournalEntry; onSave: (a: { what: string; learned: string; emotion: Emotion | null }) => void }) {
  const { entry } = props;
  const [open, setOpen] = useState(false);
  return (
    <View style={styles.card} testID={`journal-${entry.orderId}`}>
      <Text style={styles.cardTitle}>{`Order ${entry.orderId}`}</Text>
      <Row label="Why" value={entry.why || 'not written'} />
      <Row label="Target" value={entry.target || 'not written'} />
      <Row label="Exit if wrong" value={entry.exitPlan || 'not written'} />
      <Row label="Confidence" value={entry.confidence === null ? 'not given' : `${String(entry.confidence)} of 5`} />
      {entry.after !== undefined ? (
        <>
          <Row label="What happened" value={entry.after.what || 'not written'} />
          <Row label="What I learned" value={entry.after.learned || 'not written'} />
          {entry.after.emotion !== null ? <Row label="I felt" value={entry.after.emotion} /> : null}
        </>
      ) : open ? (
        <ReviewForm onSave={props.onSave} />
      ) : (
        <Button label="Add what happened" quiet onPress={() => setOpen(true)} testID={`review-open-${entry.orderId}`} />
      )}
    </View>
  );
}

function Journal({ kv, now, market }: { kv: KeyValueStore; now: () => number; market: Market }) {
  const [entries, setEntries] = useState<JournalEntry[] | null>(null);
  const reload = useCallback(() => loadJournal(kv).then((all) => setEntries(all.filter((e) => e.market === market.id).sort((a, b) => b.at - a.at))), [kv, market.id]);
  useEffect(() => {
    void reload();
  }, [reload]);
  if (entries === null) return <Note>Loading the journal...</Note>;
  return (
    <View testID="journal-view">
      <Section title="Trade journal">
        {entries.length === 0 ? <Note>No entries yet. Fill in the journal fields on the Trade screen before you place an order.</Note> : null}
        {entries.map((e) => (
          <Entry
            key={e.orderId}
            entry={e}
            onSave={(a) => {
              void addAfter(kv, market.id, e.orderId, a, now()).then(reload);
            }}
          />
        ))}
      </Section>
    </View>
  );
}

export function MeasureScreen({ kv, now, market }: { kv: KeyValueStore; now: () => number; market: Market }) {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>('mistakes');
  return (
    <ScrollView contentContainerStyle={styles.page} testID="measure-screen">
      <TabStrip tabs={TABS} active={tab} onSelect={setTab} small />
      <CoachHint screen="measure" />
      {tab === 'mistakes' ? <Mistakes kv={kv} now={now} market={market} /> : <Journal kv={kv} now={now} market={market} />}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, maxWidth: 720, width: '100%', alignSelf: 'center' },
  card: { borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 10, marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
  cardText: { fontSize: 14, color: colors.text },
});
