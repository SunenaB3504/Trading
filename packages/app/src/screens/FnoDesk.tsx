import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { FNO_CAVEATS, UNDERLYINGS, contractId, contractName, daysTo, futureExpiries, optionExpiries, orderProblem, parseContract, quote, simulateFno, strikesAround } from '@trading/core';
import type { Contract, FnoData, FnoRun, UnderlyingId } from '@trading/core';
import { fnoScenarioById } from '@trading/content';
import type { FnoScenario } from '@trading/content';
import { Sparkline } from '../charts/Sparkline';
import { LEVERAGE_LIMIT, allMet, goalResults, leverageFlag } from '../fno/fnoGoals';
import { nextExpiryStep, stepFrom } from '../fno/fnoSessions';
import type { FnoSession } from '../fno/fnoSessions';
import { formatPaise } from '../format/rupees';
import { Button } from '../ui/Button';
import { CoachHint } from '../ui/CoachHint';
import { Note, Row, Section, colors } from '../ui/Section';
import { Choice, Field } from './TradeScreen';

const lotOf = (u: UnderlyingId): number => UNDERLYINGS[u].lot;
const pct1 = (x: number): string => `${(x * 100).toFixed(1)}%`;
const lastOf = (run: FnoRun, session: FnoSession) => run.curve[run.curve.length - 1] ?? { date: session.start, equityPaise: session.capitalPaise, marginPaise: 0, cashPaise: session.capitalPaise };

function Account({ run, session }: { run: FnoRun; session: FnoSession }) {
  const now = lastOf(run, session);
  const share = now.equityPaise > 0 ? now.marginPaise / now.equityPaise : 1;
  const flag = leverageFlag(run.curve);
  return (
    <Section title={`Account on ${session.current}`}>
      <View testID="fno-account">
        <Row label="Account value" value={formatPaise(now.equityPaise)} />
        <Row label="Change since the start" value={formatPaise(now.equityPaise - session.capitalPaise)} />
        <Row label="Cash" value={formatPaise(now.cashPaise)} />
        <Row label="Margin used (approximate)" value={`${formatPaise(now.marginPaise)}, ${pct1(share)} of the account`} />
        <Row label="Charges paid" value={formatPaise(run.state.costsPaise)} />
      </View>
      {flag !== null ? <Text style={styles.warn} testID="fno-leverage">{`Leverage risk: on ${flag.date} the margin used was ${pct1(flag.share)} of the account, over the ${pct1(LEVERAGE_LIMIT)} limit.`}</Text> : null}
      <Sparkline values={run.curve.map((c) => c.equityPaise)} testID="fno-curve" />
    </Section>
  );
}

function StepBar({ session, data, run, onMove }: { session: FnoSession; data: FnoData; run: FnoRun; onMove: (to: string) => void }) {
  const held = run.state.positions.map((p) => parseContract(p.id)?.expiry ?? '');
  const go = (to: string) => () => onMove(to);
  return (
    <Section title="Move the date on">
      <Note>Orders you give now fill at the next session's open. You cannot go back.</Note>
      <View style={styles.bar}>
        <Button label="Next session" onPress={go(stepFrom(data, session.current, session.end, 1))} testID="fno-next" />
        <Button label="+5 sessions" quiet onPress={go(stepFrom(data, session.current, session.end, 5))} testID="fno-week" />
        <Button label="To next expiry" quiet onPress={go(nextExpiryStep(data, session.current, session.end, held))} testID="fno-expiry" />
        <Button label="To the end" quiet onPress={go(session.end)} testID="fno-end" />
      </View>
    </Section>
  );
}

const rupees = (paise: number | undefined): string => (paise === undefined ? '–' : formatPaise(paise));

function Cell({ c, data, date, picked, onPick }: { c: Contract; data: FnoData; date: string; picked: string | null; onPick: (id: string) => void }) {
  const q = quote(c, data, date, 'close');
  const id = contractId(c);
  const detail = q?.vol == null || q.greeks === null ? '' : `IV ${(q.vol * 100).toFixed(0)}%  Δ ${q.greeks.delta.toFixed(2)}`;
  return (
    <Pressable accessibilityRole="button" onPress={() => onPick(id)} testID={`chain-${c.kind}-${String(c.strike)}`} style={[styles.cell, picked === id ? styles.cellOn : null]}>
      <Text style={styles.cellPrice}>{rupees(q?.paise)}</Text>
      <Text style={styles.cellDetail}>{detail}</Text>
    </Pressable>
  );
}

function OptionRows({ u, session, data, picked, onPick }: { u: UnderlyingId; session: FnoSession; data: FnoData; picked: string | null; onPick: (id: string) => void }) {
  const expiries = optionExpiries(u, session.current);
  const [chosen, setExpiry] = useState<number | null>(null);
  const firstFar = Math.max(0, expiries.findIndex((x) => daysTo(session.current, x) >= 5));
  const e = expiries[Math.min(chosen ?? firstFar, expiries.length - 1)] ?? '';
  const spot = (data.spot(u, session.current, 'close') ?? 0) / 100;
  const labels = Object.fromEntries(expiries.map((x) => [x, `${x} (${String(daysTo(session.current, x))} d)`]));
  if (UNDERLYINGS[u].futuresOnly) return null;
  return (
    <>
      <Choice label="Expiry" value={e} options={expiries} labels={labels} onChange={(x) => setExpiry(expiries.indexOf(x))} testID="chain-expiry" />
      <View style={styles.chainHead}><Text style={styles.cellHead}>Call (CE)</Text><Text style={styles.strike}>Strike</Text><Text style={styles.cellHead}>Put (PE)</Text></View>
      {strikesAround(u, spot, 5).map((k) => (
        <View key={k} style={styles.chainRow}>
          <Cell c={{ u, kind: 'CE', expiry: e, strike: k }} data={data} date={session.current} picked={picked} onPick={onPick} />
          <Text style={styles.strike}>{String(k)}</Text>
          <Cell c={{ u, kind: 'PE', expiry: e, strike: k }} data={data} date={session.current} picked={picked} onPick={onPick} />
        </View>
      ))}
    </>
  );
}

function Chain({ session, data, picked, onPick }: { session: FnoSession; data: FnoData; picked: string | null; onPick: (id: string) => void }) {
  const [u, setU] = useState<UnderlyingId>(session.underlyings[0] ?? 'NIFTY');
  const spot = (data.spot(u, session.current, 'close') ?? 0) / 100;
  return (
    <Section title={UNDERLYINGS[u].futuresOnly ? 'Futures (modelled prices)' : 'Option chain (modelled prices)'}>
      {session.underlyings.length > 1 ? <Choice label="Underlying" value={u} options={session.underlyings} labels={{ NIFTY: 'Nifty 50', BANKNIFTY: 'Bank Nifty', USDINR: 'USD/INR' }} onChange={setU} testID="chain-index" /> : null}
      <Text style={styles.spot} testID="chain-spot">{`${UNDERLYINGS[u].label} at the close: ${spot.toLocaleString('en-IN', { maximumFractionDigits: 2 })}. ${lotOf(u)} ${u === 'USDINR' ? 'dollars' : 'units'} a lot.`}</Text>
      <OptionRows u={u} session={session} data={data} picked={picked} onPick={onPick} />
      <View style={styles.bar}>
        {futureExpiries(session.current, u).map((x) => (
          <Button key={x} label={`Future ${x}`} quiet onPress={() => onPick(contractId({ u, kind: 'FUT', expiry: x, strike: null }))} testID={`chain-FUT-${x}`} />
        ))}
      </View>
    </Section>
  );
}

function Ticket({ session, data, picked, onOrder }: { session: FnoSession; data: FnoData; picked: string | null; onOrder: (contract: string, side: 'buy' | 'sell', lots: number) => string | null }) {
  const [lots, setLots] = useState('1');
  const [message, setMessage] = useState('');
  const c = picked === null ? null : parseContract(picked);
  const q = c === null ? null : quote(c, data, session.current, 'close');
  const n = Math.max(0, Math.floor(Number(lots)) || 0);
  const send = (side: 'buy' | 'sell') => () => {
    const problem = picked === null ? 'Pick a contract from the chain first.' : onOrder(picked, side, n);
    setMessage(problem ?? `${side === 'buy' ? 'Buy' : 'Sell'} order placed. It fills at the next session's open.`);
  };
  return (
    <Section title="Ticket">
      <View testID="fno-ticket">
        <Text style={styles.spot}>{c === null || q === null ? 'No contract picked.' : `${contractName(c)}: ${formatPaise(q.paise)} a unit, ${formatPaise(q.paise * lotOf(c.u) * Math.max(1, n))} for ${String(Math.max(1, n))} lot(s)`}</Text>
        <Field label="Lots" value={lots} onChange={setLots} testID="fno-lots" keyboard="numeric" />
        <View style={styles.bar}>
          <Button label="Buy" onPress={send('buy')} testID="fno-buy" />
          <Button label="Sell" onPress={send('sell')} testID="fno-sell" />
        </View>
        {message === '' ? null : <Text style={styles.note} testID="fno-message">{message}</Text>}
      </View>
      <Note>Buying an option costs the premium. Selling an option or trading a future needs margin, shown above as approximate.</Note>
    </Section>
  );
}

function Positions({ run, data, session }: { run: FnoRun; data: FnoData; session: FnoSession }) {
  return (
    <Section title="Open positions">
      <View testID="fno-positions">
        {run.state.positions.length === 0 ? <Note>Nothing open.</Note> : null}
        {run.state.positions.map((p) => {
          const c = parseContract(p.id);
          const mark = c === null ? null : quote(c, data, session.current, 'close')?.paise ?? null;
          const gain = c === null || mark === null ? null : p.lots * lotOf(c.u) * (mark - p.avgPaise);
          return <Row key={p.id} label={`${c === null ? p.id : contractName(c)}: ${String(p.lots)} lot(s) at ${formatPaise(p.avgPaise)}`} value={gain === null ? 'no price' : `${formatPaise(gain)} open`} />;
        })}
      </View>
    </Section>
  );
}

function Orders({ session, run, onCancel }: { session: FnoSession; run: FnoRun; onCancel: (id: string) => void }) {
  const recent = [...session.orders].reverse().slice(0, 8);
  return (
    <Section title="Orders">
      <View testID="fno-orders">
        {recent.length === 0 ? <Note>No orders yet.</Note> : null}
        {recent.map((o) => {
          const out = run.outcomes[o.id];
          const c = parseContract(o.contract);
          const status = out === undefined ? 'waiting for the next open' : out.status === 'filled' ? `filled at ${formatPaise(out.pricePaise)}, charges ${formatPaise(out.costsPaise)}` : `refused: ${out.reason}`;
          return (
            <View key={o.id}>
              <Row label={`${o.date}: ${o.side} ${String(o.lots)} ${c === null ? o.contract : contractName(c)}`} value={status} />
              {out === undefined ? <Button label="Cancel" quiet onPress={() => onCancel(o.id)} testID={`fno-cancel-${o.id}`} /> : null}
            </View>
          );
        })}
      </View>
      {run.state.events.slice(-4).map((e) => <Text key={e} style={styles.warn}>{e}</Text>)}
    </Section>
  );
}

function Summary({ run, session, scenario }: { run: FnoRun; session: FnoSession; scenario: FnoScenario | null }) {
  const now = lastOf(run, session);
  const results = scenario === null ? [] : goalResults(scenario, run, session.capitalPaise);
  const met = allMet(results);
  return (
    <Section title="Session summary">
      <View testID="fno-summary">
        <Row label="Finished with" value={formatPaise(now.equityPaise)} />
        <Row label="Result" value={pct1((now.equityPaise - session.capitalPaise) / session.capitalPaise)} />
        <Row label="Charges paid" value={formatPaise(run.state.costsPaise)} />
        <Row label="Trades" value={String(run.state.trades.length)} />
        {results.map((r) => <Row key={r.goal.kind} label={`${r.met ? 'Met' : 'Not met'}: ${r.text}`} value={r.met ? 'yes' : 'no'} />)}
      </View>
      {scenario === null ? null : <Text style={styles.note} testID="fno-debrief">{met ? scenario.debrief.met : scenario.debrief.notMet}</Text>}
    </Section>
  );
}

function newOrderId(session: FnoSession): string {
  return `o${String(session.orders.reduce((m, o) => Math.max(m, Number(o.id.slice(1)) || 0), 0) + 1)}`;
}

/** One futures and options session: the account, the chain, the ticket and the date controls. */
export function FnoDesk({ session, data, onChange, onClose }: { session: FnoSession; data: FnoData; onChange: (s: FnoSession) => void; onClose: () => void }) {
  const [picked, setPicked] = useState<string | null>(null);
  const run = useMemo(() => simulateFno(data, session.orders, session.start, session.current, session.capitalPaise), [data, session.orders, session.start, session.current, session.capitalPaise]);
  const scenario = session.scenarioId === null ? null : fnoScenarioById(session.scenarioId);
  const over = session.current >= session.end;
  const order = (contract: string, side: 'buy' | 'sell', lots: number): string | null => {
    const c = parseContract(contract);
    const problem = c === null ? 'That contract is not recognised.' : over ? 'The session has ended.' : orderProblem(data, session.current, c, lots);
    if (problem !== null) return problem;
    onChange({ ...session, orders: [...session.orders, { id: newOrderId(session), date: session.current, contract, side, lots }] });
    return null;
  };
  const move = (to: string) => onChange({ ...session, current: to });
  return (
    <>
      <Button label="Back to sessions" quiet onPress={onClose} testID="fno-back" />
      <Note>{session.title}</Note>
      {scenario === null ? null : <Text style={styles.note} testID="fno-goal">{`Goal: ${scenario.goalText}`}</Text>}
      {scenario === null ? null : scenario.checkpoints.filter((c) => c.date <= session.current).map((c) => <Text key={c.date} style={styles.note}>{`${c.date}: ${c.text}`}</Text>)}
      <Account run={run} session={session} />
      {over ? <Summary run={run} session={session} scenario={scenario} /> : <StepBar session={session} data={data} run={run} onMove={move} />}
      {over ? null : <Chain session={session} data={data} picked={picked} onPick={setPicked} />}
      {over ? null : <Ticket session={session} data={data} picked={picked} onOrder={order} />}
      <Positions run={run} data={data} session={session} />
      <Orders session={session} run={run} onCancel={(id) => onChange({ ...session, orders: session.orders.filter((o) => o.id !== id) })} />
      <CoachHint screen="fno" />
      <Note>{FNO_CAVEATS}</Note>
    </>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  note: { color: colors.muted, marginTop: 8 },
  warn: { color: colors.warn, marginTop: 8 },
  spot: { color: colors.text, marginVertical: 6 },
  chainHead: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  chainRow: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.line },
  cell: { flex: 1, minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  cellOn: { backgroundColor: '#dbe9ff' },
  cellPrice: { color: colors.text, fontVariant: ['tabular-nums'] },
  cellDetail: { color: colors.muted, fontSize: 11 },
  cellHead: { flex: 1, color: colors.muted, fontSize: 12 },
  strike: { width: 64, textAlign: 'center', color: colors.text, fontWeight: '600' },
});
