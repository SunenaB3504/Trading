import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import type { KeyValueStore } from '../store/kv';
import { previewCosts } from '../trading/costPreview';
import type { OrderForm } from '../trading/orderRequest';
import type { Market } from '../trading/market';
import { PaperSession } from '../trading/paperSession';
import type { SessionView } from '../trading/paperSession';
import { Note, Row, Section, colors } from '../ui/Section';

/** Where the form starts: the first stock and a date whose next session has prices, so a first order fills. */
const firstForm = (market: Market): OrderForm => ({
  instrumentId: market.instruments[0] ?? '',
  side: 'buy',
  type: 'market',
  quantity: '10',
  limit: '',
  stop: '',
  date: market.defaultDate,
});

function Choice<T extends string>(props: {
  label: string;
  value: T;
  options: readonly T[];
  onChange: (v: T) => void;
  testID: string;
  labels?: Readonly<Record<string, string>>;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      <View style={styles.choices} testID={props.testID}>
        {props.options.map((o) => (
          <Pressable
            key={o}
            accessibilityRole="button"
            accessibilityState={{ selected: o === props.value }}
            onPress={() => props.onChange(o)}
            style={[styles.choice, o === props.value ? styles.choiceOn : null]}
          >
            <Text style={o === props.value ? styles.choiceTextOn : styles.choiceText}>
              {props.labels?.[o] ?? o}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  testID: string;
  keyboard?: 'default' | 'numeric' | 'decimal-pad';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        testID={props.testID}
        value={props.value}
        onChangeText={props.onChange}
        keyboardType={props.keyboard ?? 'default'}
        style={styles.input}
        accessibilityLabel={props.label}
      />
    </View>
  );
}

function Book({ view }: { view: SessionView }) {
  return (
    <>
      <Section title="Cash and positions">
        <Row label="Cash" value={view.cash} />
        {view.positions.length === 0 ? <Note>No open positions.</Note> : null}
        {view.positions.map((p) => (
          <Row
            key={p.instrumentId}
            label={`${p.symbol}, ${p.quantity} shares`}
            value={`basis ${p.basis}`}
          />
        ))}
      </Section>
      <Section title="Orders">
        {view.orders.length === 0 ? <Note>No orders yet.</Note> : null}
        <View testID="order-list">
          {view.orders.map((o) => (
            <Row
              key={o.id}
              label={`${o.line}${o.reason ? ` (${o.reason})` : ''}`}
              value={o.state}
            />
          ))}
        </View>
      </Section>
    </>
  );
}

type SetField = <K extends keyof OrderForm>(k: K, v: OrderForm[K]) => void;

/** What to tell the person after an order is accepted: the next open, or why it will wait. */
function placedMessage(r: { orderId: string; state: string }, market: Market, instrumentId: string): string {
  if (r.state === 'pending') {
    const bars = market.snapshot.bars[instrumentId] ?? [];
    const ends = bars[bars.length - 1]?.date ?? market.lastDate;
    const name = market.symbols[instrumentId] ?? instrumentId;
    return `Order ${r.orderId} placed, but it stays pending: prices for ${name} end on ${ends}, so there is no later session to fill it.`;
  }
  return `Order ${r.orderId} placed. It is tried at the next session's open, which can be days away around a holiday or a weekend.`;
}

function useTrade(kv: KeyValueStore, now: () => number, market: Market) {
  const [session, setSession] = useState<PaperSession | null>(null);
  const [view, setView] = useState<SessionView | null>(null);
  const [form, setForm] = useState<OrderForm>(() => firstForm(market));
  const [message, setMessage] = useState<string | null>(null);
  useEffect(() => {
    void PaperSession.open(kv, now, market).then(async (s) => {
      setSession(s);
      setView(await s.view());
    });
  }, [kv, now, market]);
  const set: SetField = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const submit = useCallback(async () => {
    if (session === null) return;
    const r = await session.place(form);
    setMessage(r.ok ? placedMessage(r, market, form.instrumentId) : r.error);
    setView(await session.view());
  }, [session, form, market]);
  return { view, form, message, set, submit };
}

/** A few instruments are buttons; a longer list gets a search box and shows the matches as buttons. */
function StockPicker(props: { market: Market; value: string; onChange: (id: string) => void }) {
  const { market } = props;
  const [query, setQuery] = useState('');
  if (market.instruments.length <= 6)
    return (
      <Choice
        label="Instrument"
        value={props.value}
        options={market.instruments}
        labels={market.symbols}
        onChange={props.onChange}
        testID="pick-instrument"
      />
    );
  const q = query.trim().toUpperCase();
  const name = (id: string): string => market.symbols[id] ?? id;
  const matches = market.instruments.filter((id) => q === '' || name(id).includes(q)).slice(0, 12);
  const shown = matches.includes(props.value) ? matches : [props.value, ...matches.slice(0, 11)];
  return (
    <>
      <Field label={`Stock (${market.instruments.length} to choose from): type to search`} value={query} onChange={setQuery} testID="stock-search" />
      <Choice
        label={`Selected: ${name(props.value)}`}
        value={props.value}
        options={shown}
        labels={market.symbols}
        onChange={props.onChange}
        testID="pick-instrument"
      />
    </>
  );
}

function OrderFields(props: { market: Market; form: OrderForm; set: SetField }) {
  const { market, form, set } = props;
  return (
    <>
      <StockPicker market={market} value={form.instrumentId} onChange={(v) => set('instrumentId', v)} />
      <Choice
        label="Side"
        value={form.side}
        options={['buy', 'sell'] as const}
        onChange={(v) => set('side', v)}
        testID="pick-side"
      />
      <Choice
        label="Type"
        value={form.type}
        options={['market', 'limit'] as const}
        onChange={(v) => set('type', v)}
        testID="pick-type"
      />
      <Field
        label="Quantity"
        value={form.quantity}
        onChange={(v) => set('quantity', v)}
        testID="qty-input"
        keyboard="numeric"
      />
      {form.type === 'limit' ? (
        <Field
          label="Limit price (₹)"
          value={form.limit}
          onChange={(v) => set('limit', v)}
          testID="limit-input"
          keyboard="decimal-pad"
        />
      ) : null}
      <Field
        label="Decision date (placed after the close)"
        value={form.date}
        onChange={(v) => set('date', v)}
        testID="date-input"
      />
    </>
  );
}

function CostSection({ market, form }: { market: Market; form: OrderForm }) {
  const preview = useMemo(
    () =>
      previewCosts(market.snapshot, {
        instrumentId: form.instrumentId,
        side: form.side,
        quantity: Number(form.quantity) || 0,
        date: form.date,
      }),
    [market, form],
  );
  return (
    <Section title="Cost preview">
      {preview === null ? (
        <Note>Enter a quantity and a valid date (from 2020-04-01, when the charges table starts) to see the estimated charges.</Note>
      ) : null}
      {preview?.rows.map((r) => (
        <Row key={r.label} label={r.label} value={r.value} />
      ))}
      {preview?.caveats.map((c) => (
        <Note key={c}>{`Assumption: ${c}`}</Note>
      ))}
      <Note>
        Estimate at the last close; the real fill is the next open. Not investment advice.
      </Note>
    </Section>
  );
}

export function TradeScreen({ kv, now, market }: { kv: KeyValueStore; now: () => number; market: Market }) {
  const { view, form, message, set, submit } = useTrade(kv, now, market);
  return (
    <ScrollView contentContainerStyle={styles.page} testID="trade-screen">
      <Section title="New order (virtual money)">
        <OrderFields market={market} form={form} set={set} />
        <Pressable
          accessibilityRole="button"
          onPress={() => void submit()}
          style={styles.place}
          testID="place-order"
        >
          <Text style={styles.placeText}>Place order</Text>
        </Pressable>
        {message !== null ? (
          <Text style={styles.message} testID="order-message">
            {message}
          </Text>
        ) : null}
      </Section>
      <CostSection market={market} form={form} />
      {view !== null ? <Book view={view} /> : <Note>Loading the book...</Note>}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, maxWidth: 720, width: '100%', alignSelf: 'center' },
  field: { marginBottom: 10 },
  label: { color: colors.muted, fontSize: 13, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 6,
    padding: 10,
    minHeight: 44,
    color: colors.text,
  },
  choices: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  choice: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 6,
    paddingHorizontal: 14,
    minHeight: 44,
    justifyContent: 'center',
  },
  choiceOn: { borderColor: colors.accent, backgroundColor: '#e8f0fe' },
  choiceText: { color: colors.text },
  choiceTextOn: { color: colors.accent, fontWeight: '600' },
  place: {
    backgroundColor: colors.accent,
    borderRadius: 6,
    minHeight: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 6,
  },
  placeText: { color: '#fff', fontWeight: '600' },
  message: { marginTop: 8, color: colors.text },
});
