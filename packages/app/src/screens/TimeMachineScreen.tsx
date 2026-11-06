import { useCallback, useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SCENARIOS, lessonById } from '@trading/content';
import type { Scenario } from '@trading/content';
import { scenarioDebrief } from '@trading/tutor';
import type { Fact } from '@trading/tutor';
import type { FundsMarket } from '@trading/core';
import { formatPaise } from '../format/rupees';
import type { KeyValueStore } from '../store/kv';
import { bpsText } from '../timeMachine/goals';
import { datesFor, debriefInfo, outcomeOf, sessionFunds, sessionMarket } from '../timeMachine/outcome';
import type { Outcome } from '../timeMachine/outcome';
import { CASH_CHOICES, createSession, deleteSession, listSessions, saveSession, scopeOf } from '../timeMachine/sessions';
import type { TmSession } from '../timeMachine/sessions';
import { stepOn } from '../timeMachine/stepping';
import type { Market } from '../trading/market';
import { AskPanel } from '../tutor/AskPanel';
import type { TutorEnv } from '../tutor/run';
import { Button } from '../ui/Button';
import { CoachHint } from '../ui/CoachHint';
import { Note, Row, Section, colors } from '../ui/Section';
import { TabStrip } from '../ui/TabStrip';
import { FundsScreen } from './FundsScreen';
import { TradeScreen, Choice, Field } from './TradeScreen';

const FIRST_DATE = '2020-04-01';
const DATE = /^\d{4}-\d{2}-\d{2}$/;

interface Ctx {
  kv: KeyValueStore;
  now: () => number;
  real: Market;
  funds: FundsMarket | null;
  env: TutorEnv;
}

const rupees = (p: number | null): string => (p === null ? 'none' : formatPaise(p));

function ScenarioCard({ s, onStart }: { s: Scenario; onStart: () => void }) {
  return (
    <View style={styles.card} testID={`scenario-${s.id}`}>
      <Text style={styles.cardTitle}>{s.title}</Text>
      <Note>{`${s.start} to ${s.end}. ${s.pot === 'funds' ? 'Mutual funds.' : 'Shares and ETFs.'}`}</Note>
      <Text style={styles.text}>{s.goalText}</Text>
      <Button label="Start this scenario" quiet onPress={onStart} testID={`start-${s.id}`} />
    </View>
  );
}

function FreeStart({ real, onStart }: { real: Market; onStart: (start: string, cash: number) => void }) {
  const [start, setStart] = useState(FIRST_DATE);
  const [cash, setCash] = useState(String(CASH_CHOICES[2]));
  const bad = !DATE.test(start) || start < FIRST_DATE || start >= real.lastDate;
  const labels = Object.fromEntries(CASH_CHOICES.map((c) => [String(c), formatPaise(c)]));
  return (
    <Section title="Your own session">
      <Field label={`Start date (YYYY-MM-DD), from ${FIRST_DATE}`} value={start} onChange={setStart} testID="tm-start" />
      <Choice label="Starting cash" value={cash} options={CASH_CHOICES.map(String)} labels={labels} onChange={setCash} testID="tm-cash" />
      {bad ? <Note>{`Pick a date from ${FIRST_DATE} to before ${real.lastDate}. Charges are known from 1 April 2020.`}</Note> : null}
      <Button label="Start session" onPress={() => !bad && onStart(start, Number(cash))} testID="tm-start-free" />
    </Section>
  );
}

function SavedRow({ s, onOpen, onDelete }: { s: TmSession; onOpen: () => void; onDelete: () => void }) {
  const [sure, setSure] = useState(false);
  return (
    <View style={styles.card} testID={`saved-${s.id}`}>
      <Text style={styles.cardTitle}>{s.title}</Text>
      <Note>{`${s.finishedAt === null ? `At ${s.current}` : 'Finished'}, from ${s.start}`}</Note>
      <Button label={s.finishedAt === null ? 'Resume' : 'See summary'} quiet onPress={onOpen} testID={`open-${s.id}`} />
      <Button label={sure ? 'Tap again to delete for good' : 'Delete'} quiet danger={sure} onPress={() => (sure ? onDelete() : setSure(true))} testID={`delete-${s.id}`} />
    </View>
  );
}

function Lists(props: { ctx: Ctx; sessions: TmSession[]; open: (id: string) => void; reload: () => void; start: (s: Parameters<typeof createSession>[1]) => void }) {
  const { ctx, sessions } = props;
  return (
    <>
      <CoachHint screen="timemachine" />
      <Note>Replay the past. You see prices only up to the date you are at; an order you give fills at the next session's open when you move on.</Note>
      {sessions.length > 0 ? (
        <Section title="Saved sessions">
          {sessions.map((s) => (
            <SavedRow key={s.id} s={s} onOpen={() => props.open(s.id)} onDelete={() => void deleteSession(ctx.kv, s.id, ctx.now()).then(props.reload)} />
          ))}
        </Section>
      ) : null}
      <Section title="Scenarios">
        {SCENARIOS.map((s) => (
          <ScenarioCard key={s.id} s={s} onStart={() => props.start({ title: s.title, scenarioId: s.id, pot: s.pot, allowed: [...s.instruments], start: s.start, end: s.end, capitalPaise: 100_000_000 })} />
        ))}
      </Section>
      <FreeStart real={ctx.real} onStart={(start, cash) => props.start({ title: `Free session from ${start}`, scenarioId: null, pot: 'both', allowed: null, start, end: ctx.real.lastDate, capitalPaise: cash })} />
    </>
  );
}

function SummaryRows({ o, s }: { o: Outcome; s: TmSession }) {
  return (
    <Section title="Where you stand">
      {o.sharesPaise !== null ? <Row label="Share account" value={`${rupees(o.sharesPaise)} (${bpsText(o.mainBps)})`} /> : null}
      {o.fundsPaise !== null ? <Row label="Fund account" value={rupees(o.fundsPaise)} /> : null}
      <Row label={`Benchmark: ${o.benchmarkLabel}`} value={`${rupees(o.benchmarkPaise)} (${bpsText(o.benchmarkBps)})`} />
      <Note>{`Valued at the close of ${s.current}. The benchmark is before charges and uses whole units. Funds and shares follow the practice rules, not a real broker.`}</Note>
      {o.goal !== null ? <Text style={styles.goal} testID="tm-goal">{`${o.goal.met ? 'Goal met' : 'Goal not met'}. ${o.goal.detail}`}</Text> : null}
    </Section>
  );
}

function Debrief({ ctx, s, o }: { ctx: Ctx; s: TmSession; o: Outcome }) {
  const sc = o.scenario;
  const [text, setText] = useState('');
  const [actions, setActions] = useState<string[]>([]);
  useEffect(() => {
    void debriefInfo(s, ctx.real, ctx.funds, ctx.kv, ctx.now).then((d) => {
      setText(d.followed);
      setActions(d.actions);
    });
  }, [s, ctx]);
  if (sc === null) return <Note>A free session has no goal or debrief. Open the Summary any time to see how you compare.</Note>;
  const facts: Fact[] = [
    { key: 'account', label: 'your account at the end', value: rupees(o.mainPaise) },
    { key: 'account_return', label: 'your return', value: bpsText(o.mainBps) },
    { key: 'benchmark', label: o.benchmarkLabel, value: rupees(o.benchmarkPaise) },
    { key: 'benchmark_return', label: 'benchmark return', value: bpsText(o.benchmarkBps) },
  ];
  const build = () => scenarioDebrief({ title: sc.title, goalText: sc.goalText, goalMet: o.goal?.met ?? false, facts, actions, followed: text, symbols: [], lessonIds: [...sc.lessons] });
  return (
    <Section title="Debrief">
      <Text style={styles.text} testID="tm-debrief">{o.goal?.met === true ? sc.debrief.met : sc.debrief.notMet}</Text>
      <Text style={styles.text} testID="tm-followed">{text}</Text>
      <Note>{`Read next: ${sc.lessons.map((l) => lessonById(l)?.title ?? l).join('; ')} (Learn).`}</Note>
      <AskPanel env={ctx.env} label="Debrief with the tutor" testID="tm-debrief-ai" build={build} />
    </Section>
  );
}

function Summary({ ctx, s }: { ctx: Ctx; s: TmSession }) {
  const [o, setO] = useState<Outcome | null>(null);
  useEffect(() => {
    void outcomeOf(s, ctx.real, ctx.funds, ctx.kv, ctx.now).then(setO);
  }, [s, ctx]);
  if (o === null) return <Note>Working out where you stand…</Note>;
  return (
    <View testID="tm-summary">
      <SummaryRows o={o} s={s} />
      {o.flagged.length > 0 ? <Note>{`The mistake checker flagged: ${[...new Set(o.flagged)].join(', ')}. See Measure for each.`}</Note> : null}
      {s.finishedAt !== null ? <Debrief ctx={ctx} s={s} o={o} /> : <Note>Finish the session to see the debrief. It includes what the prices did afterwards, so it stays hidden until you finish.</Note>}
    </View>
  );
}

/** A finished session opens on its summary; otherwise on the account it trades. */
const firstTab = (s: TmSession): 'trade' | 'funds' | 'summary' => (s.finishedAt !== null ? 'summary' : s.pot === 'funds' ? 'funds' : 'trade');

const TABS = [['trade', 'Trade'], ['funds', 'Funds'], ['summary', 'Summary']] as const;

function Play({ ctx, session, onChange, onBack }: { ctx: Ctx; session: TmSession; onChange: (s: TmSession) => void; onBack: () => void }) {
  const [tab, setTab] = useState<(typeof TABS)[number][0]>(firstTab(session));
  const [banner, setBanner] = useState('');
  const scenario = SCENARIOS.find((x) => x.id === session.scenarioId) ?? null;
  const dates = useMemo(() => datesFor(session, ctx.real, ctx.funds), [session.id, ctx.real, ctx.funds]);
  const kv = useMemo(() => scopeOf(ctx.kv, session.id), [ctx.kv, session.id]);
  const market = useMemo(() => sessionMarket(session, ctx.real), [session, ctx.real]);
  const funds = useMemo(() => (ctx.funds === null ? null : sessionFunds(session, ctx.funds)), [session, ctx.funds]);
  const over = session.finishedAt !== null;
  const step = (n: number) => {
    const st = stepOn(dates, session.current, n, scenario?.checkpoints ?? []);
    setBanner(st.checkpoint?.text ?? (st.finished ? 'This is the last day of the session. Finish it to see the summary.' : ''));
    const next = { ...session, current: st.date, seen: st.checkpoint === null ? session.seen : [...session.seen, st.checkpoint.date] };
    onChange(next);
  };
  const finish = () => {
    setTab('summary');
    onChange({ ...session, finishedAt: ctx.now() });
  };
  const tabs = TABS.filter(([id]) => (id === 'trade' ? session.pot !== 'funds' : id === 'funds' ? session.pot !== 'shares' : true));
  return (
    <View testID="tm-session">
      <Button label="Back to sessions" quiet onPress={onBack} testID="tm-back" />
      <Text style={styles.cardTitle}>{session.title}</Text>
      <Text style={styles.date} testID="tm-date">{`Date: ${session.current}`}</Text>
      {scenario !== null ? <Note>{scenario.brief}</Note> : null}
      {banner !== '' ? <Text style={styles.banner} testID="tm-banner">{banner}</Text> : null}
      {over ? null : <StepButtons step={step} finish={finish} />}
      <TabStrip tabs={tabs} active={tab} onSelect={setTab} small />
      <View key={`${session.id}-${session.current}`}>
        {tab === 'trade' && market !== null ? <TradeScreen kv={kv} now={ctx.now} market={market} env={ctx.env} embedded /> : null}
        {tab === 'funds' ? <FundsScreen kv={kv} now={ctx.now} funds={funds} /> : null}
        {tab === 'summary' ? <Summary ctx={ctx} s={session} /> : null}
      </View>
    </View>
  );
}

function StepButtons({ step, finish }: { step: (n: number) => void; finish: () => void }) {
  return (
    <View style={styles.steps}>
      <Button label="Next day" onPress={() => step(1)} testID="tm-next-day" />
      <Button label="Next week" onPress={() => step(5)} testID="tm-next-week" />
      <Button label="Finish session" quiet onPress={finish} testID="tm-finish" />
    </View>
  );
}

/** Practise, Time Machine (SSD v4.1 §5.4) and Scenarios (§5.5): sessions that replay the past one day at a time. */
export function TimeMachineScreen(props: { kv: KeyValueStore; now: () => number; real: Market | null; funds: FundsMarket | null; env: TutorEnv }) {
  const { kv, now, real, funds, env } = props;
  const [sessions, setSessions] = useState<TmSession[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const reload = useCallback(() => void listSessions(kv).then(setSessions), [kv]);
  useEffect(reload, [reload]);
  if (real === null)
    return (
      <View style={styles.page} testID="timemachine-screen">
        <Note>The Time Machine needs real prices. Open Practise and choose real NSE prices, or fetch them in Settings, Data.</Note>
      </View>
    );
  const ctx: Ctx = { kv, now, real, funds, env };
  const current = sessions?.find((x) => x.id === openId) ?? null;
  const change = (s: TmSession) => {
    setSessions((all) => (all ?? []).map((x) => (x.id === s.id ? s : x)));
    void saveSession(kv, s, now());
  };
  const start = (o: Parameters<typeof createSession>[1]) => void createSession(kv, o, now()).then((s) => { reload(); setOpenId(s.id); });
  return (
    <ScrollView contentContainerStyle={styles.page} testID="timemachine-screen">
      {current !== null ? <Play ctx={ctx} session={current} onChange={change} onBack={() => setOpenId(null)} /> : <Lists ctx={ctx} sessions={sessions ?? []} open={setOpenId} reload={reload} start={start} />}
    </ScrollView>
  );
}


const styles = StyleSheet.create({
  page: { padding: 16, maxWidth: 720, width: '100%', alignSelf: 'center' },
  card: { borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 10, marginBottom: 10 },
  cardTitle: { fontSize: 15, fontWeight: '700', color: colors.text, marginBottom: 4 },
  text: { fontSize: 14, color: colors.text, marginVertical: 4 },
  date: { fontSize: 18, fontWeight: '700', color: colors.text, marginVertical: 6 },
  banner: { backgroundColor: '#eef5ff', padding: 10, borderRadius: 8, color: colors.text, marginVertical: 6 },
  goal: { fontSize: 15, fontWeight: '700', color: colors.text, marginTop: 8 },
  steps: { marginVertical: 4 },
});
