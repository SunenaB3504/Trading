import { useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import type { FundsMarket } from '@trading/core';
import type { KeyValueStore } from '../store/kv';
import { FundSession } from '../trading/fundSession';
import type { FundForm, FundView } from '../trading/fundSession';
import { fundNoteLines } from '../trading/fundNote';
import { Button } from '../ui/Button';
import { Note, Row, Section, colors } from '../ui/Section';
import { Choice, Field } from './TradeScreen';

const ACTIONS = { buy: 'Buy once', sip: 'Start a SIP', redeem: 'Sell' } as const;
const CUTOFF = { before: 'Before 3 pm', after: 'After 3 pm' } as const;

const firstForm = (m: FundsMarket): FundForm => {
  const last = m.funds.map((f) => f.lastDate).sort()[0] ?? '';
  return { fundId: m.funds[0]?.id ?? '', action: 'buy', date: last, beforeCutoff: true, amount: '5000', units: 'all', dayOfMonth: '5', instalments: '6' };
};

function Account({ view }: { view: FundView }) {
  return (
    <Section title="Fund account">
      <Row label="Cash" value={view.cash} />
      <Row label="Value of units" value={view.value} />
      <Row label={`Total at ${view.asOf}`} value={view.total} />
      {view.holdings.length === 0 ? <Note>No units held yet.</Note> : null}
      {view.holdings.map((h) => (
        <View key={h.fundId} testID={`holding-${h.fundId}`}>
          <Row label={`${h.name}, ${h.units} units`} value={`${h.value} (cost ${h.cost})`} />
          <Note>{`Latest NAV ${h.nav}`}</Note>
        </View>
      ))}
    </Section>
  );
}

function Txns({ view }: { view: FundView }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <Section title="Fund transactions">
      {view.txns.length === 0 ? <Note>No fund orders yet.</Note> : null}
      <View testID="fund-txns">
        {view.txns.map((t) => (
          <View key={t.key}>
            <Pressable accessibilityRole="button" onPress={() => setOpen(open === t.key ? null : t.key)} testID={`txn-${t.key}`}>
              <Row label={`${t.line}${t.reason ? ` (${t.reason})` : ''}`} value={t.status} />
            </Pressable>
            {open === t.key ? (
              <View style={styles.note} testID={`note-${t.key}`}>
                {fundNoteLines(t.txn, t.name).map(([k, v]) => (
                  <Row key={k} label={k} value={v} />
                ))}
              </View>
            ) : null}
          </View>
        ))}
      </View>
      <Note>Tap a transaction to see its contract note.</Note>
    </Section>
  );
}

type SetFundField = <K extends keyof FundForm>(k: K, v: FundForm[K]) => void;

function Order(props: { form: FundForm; market: FundsMarket; set: SetFundField }) {
  const { form, market, set } = props;
  const labels = useMemo(() => Object.fromEntries(market.funds.map((f) => [f.id, f.name])), [market]);
  return (
    <Section title="New fund order (virtual money)">
      <Choice label="Fund" value={form.fundId} options={market.funds.map((f) => f.id)} labels={labels} onChange={(v) => set('fundId', v)} testID="pick-fund" />
      <Choice label="What" value={form.action} options={['buy', 'sip', 'redeem'] as const} labels={ACTIONS} onChange={(v) => set('action', v)} testID="pick-fund-action" />
      {form.action === 'redeem' ? (
        <Field label="Units to sell (or all)" value={form.units} onChange={(v) => set('units', v)} testID="fund-units" keyboard="decimal-pad" />
      ) : (
        <Field label={form.action === 'sip' ? 'Amount of each instalment (₹)' : 'Amount (₹)'} value={form.amount} onChange={(v) => set('amount', v)} testID="fund-amount" keyboard="decimal-pad" />
      )}
      {form.action === 'sip' ? (
        <>
          <Field label="Day of the month (1 to 28)" value={form.dayOfMonth} onChange={(v) => set('dayOfMonth', v)} testID="fund-day" keyboard="numeric" />
          <Field label="Number of instalments" value={form.instalments} onChange={(v) => set('instalments', v)} testID="fund-instalments" keyboard="numeric" />
        </>
      ) : (
        <Choice label="Order given" value={form.beforeCutoff ? 'before' : 'after'} options={['before', 'after'] as const} labels={CUTOFF} onChange={(v) => set('beforeCutoff', v === 'before')} testID="pick-cutoff" />
      )}
      <Field label="Date (YYYY-MM-DD)" value={form.date} onChange={(v) => set('date', v)} testID="fund-date" />
    </Section>
  );
}

export function FundsScreen({ kv, now, funds }: { kv: KeyValueStore; now: () => number; funds: FundsMarket | null }) {
  const [session, setSession] = useState<FundSession | null>(null);
  const [view, setView] = useState<FundView | null>(null);
  const [form, setForm] = useState<FundForm | null>(null);
  const [message, setMessage] = useState('');
  useEffect(() => {
    if (funds === null) return;
    let live = true;
    void FundSession.open(kv, now, funds).then((s) => {
      if (!live) return;
      setSession(s);
      setView(s.view());
      setForm(firstForm(funds));
    });
    return () => {
      live = false;
    };
  }, [kv, now, funds]);
  if (funds === null)
    return (
      <View style={styles.page} testID="funds-screen">
        <Note>No fund NAVs on this device yet. Open Settings, Data to fetch them.</Note>
      </View>
    );
  if (session === null || view === null || form === null)
    return (
      <View style={styles.page} testID="funds-screen">
        <Note>Loading funds…</Note>
      </View>
    );
  const place = () => {
    void session.place(form).then((r) => {
      setMessage(r.ok ? `Order ${r.orderId} placed. A fund fills at the NAV of a day, so it shows below at once.` : r.error);
      setView(session.view());
    });
  };
  return (
    <ScrollView contentContainerStyle={styles.page} testID="funds-screen">
      <Note>Funds are bought at the day's NAV (net asset value per unit), not at a live price. An order before 3 pm on a business day gets that day's NAV; later, or on a holiday, the next business day's.</Note>
      <Order form={form} market={funds} set={(k, v) => setForm({ ...form, [k]: v })} />
      <Button label="Place fund order" onPress={place} testID="place-fund-order" />
      {message !== '' ? (
        <Text style={styles.message} testID="fund-message">
          {message}
        </Text>
      ) : null}
      <Account view={view} />
      <Txns view={view} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, maxWidth: 720, width: '100%', alignSelf: 'center' },
  message: { marginTop: 8, color: colors.text },
  note: { paddingLeft: 12, marginBottom: 8 },
});
