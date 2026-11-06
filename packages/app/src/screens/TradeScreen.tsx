import { useCallback, useEffect, useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import { addBefore } from '../journal/journalStore';
import type { BeforeFields } from '../journal/journalStore';
import type { KeyValueStore } from '../store/kv';
import { previewCosts } from '../trading/costPreview';
import type { OrderForm } from '../trading/orderRequest';
import type { Market } from '../trading/market';
import { PaperSession } from '../trading/paperSession';
import type { Holding, SessionView } from '../trading/paperSession';
import { Holdings, holdingLine } from './Holdings';
import { OrderBar } from './OrderBar';
import { Note, Row, Section, colors } from '../ui/Section';
import { preTrade } from '@trading/tutor';
import { AskPanel } from '../tutor/AskPanel';
import type { TutorEnv } from '../tutor/run';
import { CoachHint } from '../ui/CoachHint';
import { useUnsaved } from '../ui/unsaved';
import { loadList, pushRecent, recentKey, toggleWatch, watchlistKey } from '../trading/stockLists';
import { StockPicker } from './StockPicker';
import type { StockGroup } from './StockPicker';

export { StockPicker } from './StockPicker';

/**
 * Where the form starts: a date whose next session has prices, so a first order fills. A short list starts on its
 * first instrument; a long one starts with nothing chosen, so no order goes to a stock the person never picked.
 */
const firstForm = (market: Market): OrderForm => ({
  instrumentId: market.instruments.length <= 6 ? (market.instruments[0] ?? '') : '',
  side: 'buy',
  type: 'market',
  quantity: '10',
  limit: '',
  stop: '',
  trigger: '',
  validity: 'day',
  until: '',
  date: market.defaultDate,
});

const TYPE_LABELS = {
  market: 'Market',
  limit: 'Limit',
  stop: 'Stop-loss market (SL-M)',
  stop_limit: 'Stop-loss limit (SL)',
} as const;
const WHEN_LABELS = { at_or_below: 'Price falls to', at_or_above: 'Price rises to' } as const;
const VALIDITY_LABELS = { day: 'One day', gtt: 'Good till triggered (GTT)' } as const;

export function Choice<T extends string>(props: {
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

export function Field(props: {
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

function Book({ view, onCancel }: { view: SessionView; onCancel: (id: string) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
    <>
      <Section title="Orders">
        <Note>Tap an order to see its contract note once it has filled.</Note>
        {view.orders.length === 0 ? <Note>No orders yet.</Note> : null}
        <View testID="order-list">
          {view.orders.map((o) => (
            <View key={o.id}>
              <Pressable accessibilityRole="button" onPress={() => setOpen(open === o.id ? null : o.id)} style={styles.tapRow} testID={`order-${o.id}`}>
                <Row label={`${o.line}${o.reason ? ` (${o.reason})` : ''}`} value={o.state} />
              </Pressable>
              {open === o.id && o.note !== null ? (
                <View style={styles.contractNote} testID={`note-${o.id}`}>
                  {o.note.map(([k, v]) => (
                    <Row key={k} label={k} value={v} />
                  ))}
                </View>
              ) : null}
              {o.state === 'pending' ? (
                <Pressable accessibilityRole="button" onPress={() => onCancel(o.id)} style={styles.cancel} testID={`cancel-${o.id}`}>
                  <Text style={styles.choiceTextOn}>Cancel this order</Text>
                </Pressable>
              ) : null}
            </View>
          ))}
        </View>
      </Section>
    </>
  );
}

import type { SetField } from './OrderBar';

/** What to tell the person after an order is accepted: the next open, or why it will wait. */
function placedMessage(r: { orderId: string; state: string }, market: Market, form: OrderForm): string {
  const instrumentId = form.instrumentId;
  if (r.state === 'pending' && form.validity === 'gtt') {
    return `Order ${r.orderId} placed and waiting: a good-till-triggered order is checked against each new trading day and fills when its trigger is reached. It can be cancelled until then.`;
  }
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
  const [journal, setJournalState] = useState<BeforeFields>(NO_JOURNAL);
  // Typed but not placed: a profile switch asks before throwing it away.
  const [touched, setTouched] = useState(false);
  const setJournal = (j: BeforeFields) => {
    setJournalState(j);
    setTouched(true);
  };
  useEffect(() => {
    // another profile or market: start a clean form, so nothing typed for the last one carries over
    setForm(firstForm(market));
    setJournalState(NO_JOURNAL);
    setTouched(false);
    setMessage(null);
    void PaperSession.open(kv, now, market).then(async (s) => {
      setSession(s);
      setView(await s.view());
    });
  }, [kv, now, market]);
  const set: SetField = (k, v) => {
    setForm((f) => ({ ...f, [k]: v }));
    setTouched(true);
  };
  const submit = useCallback(async () => {
    if (session === null) {
      // the first start also saves the price file, so the book can take a moment to open: say so, never do nothing
      setMessage('Your practice book is still opening. Try again in a moment.');
      return;
    }
    if (form.instrumentId === '') {
      setMessage('Choose a stock first: type its name in the search box.');
      return;
    }
    const r = await session.place(form);
    setMessage(r.ok ? placedMessage(r, market, form) : r.error);
    if (r.ok) {
      await addBefore(kv, market.id, r.orderId, journal, now());
      setJournalState(NO_JOURNAL);
      setTouched(false);
    }
    setView(await session.view());
  }, [session, form, market, journal, kv, now]);
  const cancel = useCallback(
    async (id: string) => {
      if (session === null) return;
      const r = await session.cancel(id);
      setMessage(r.ok ? `Order ${id} cancelled.` : r.error);
      setView(await session.view());
    },
    [session],
  );
  // A holding tapped: a market sell of all of it, ready to check and place.
  const prepareSell = (h: Holding) => {
    setForm((f) => ({ ...f, instrumentId: h.instrumentId, side: 'sell', type: 'market', quantity: String(h.quantity) }));
    setTouched(true);
    setMessage(`Ready to sell ${String(h.quantity)} ${h.symbol}. Change the quantity to sell part, then tap Place sell order.`);
  };
  return { view, form, message, set, submit, cancel, journal, setJournal, touched, prepareSell };
}

/** The stocks offered before anything is typed: what the book holds, the watchlist, and recent picks. */
function useStockLists(kv: KeyValueStore, now: () => number, market: Market, view: SessionView | null) {
  const [watch, setWatch] = useState<string[]>([]);
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => {
    void loadList(kv, watchlistKey(market.id)).then(setWatch);
    void loadList(kv, recentKey(market.id)).then(setRecent);
  }, [kv, market.id]);
  const known = (ids: readonly string[]) => ids.filter((id) => market.instruments.includes(id));
  const groups: StockGroup[] = [
    { title: 'Holdings', ids: known(view?.positions.map((p) => p.instrumentId) ?? []) },
    { title: 'Watchlist', ids: known(watch) },
    { title: 'Recent', ids: known(recent) },
  ];
  return {
    groups,
    watching: (id: string) => watch.includes(id),
    toggle: (id: string) => void toggleWatch(kv, market.id, id, now()).then(setWatch),
    picked: (id: string) => void pushRecent(kv, market.id, id, now()).then(setRecent),
  };
}

const NO_JOURNAL: BeforeFields = { why: '', target: '', exitPlan: '', confidence: null };
const CONFIDENCE = ['1', '2', '3', '4', '5'] as const;

/** The note before an order (SSD v4.1 §6.1): optional, but the mistake checker looks for an exit plan. */
function JournalFields(props: { value: BeforeFields; onChange: (v: BeforeFields) => void }) {
  const { value, onChange } = props;
  return (
    <View testID="journal-fields">
      <Note>Journal (optional): write down your thinking before you trade.</Note>
      <Field label="Why this trade?" value={value.why} onChange={(why) => onChange({ ...value, why })} testID="journal-why" />
      <Field label="Target: where will you take profit?" value={value.target} onChange={(target) => onChange({ ...value, target })} testID="journal-target" />
      <Field label="Exit if wrong: at what price or reason will you sell?" value={value.exitPlan} onChange={(exitPlan) => onChange({ ...value, exitPlan })} testID="journal-exit" />
      <Choice label="Confidence (1 low, 5 high)" value={value.confidence === null ? '' : String(value.confidence)} options={CONFIDENCE} onChange={(c) => onChange({ ...value, confidence: Number(c) })} testID="journal-confidence" />
    </View>
  );
}

/** The trigger direction and price of a stop order. */
function TriggerFields({ form, set }: { form: OrderForm; set: SetField }) {
  const sell = form.side === 'sell';
  const when = form.when ?? (sell ? 'at_or_below' : 'at_or_above');
  return (
    <>
      <Choice
        label={sell ? 'Sell when (stop-loss falls, target rises)' : 'Buy when (breakout rises, dip falls)'}
        value={when}
        options={['at_or_below', 'at_or_above'] as const}
        labels={WHEN_LABELS}
        onChange={(v) => set('when', v)}
        testID="pick-when"
      />
      <Field label="Trigger price (₹)" value={form.trigger ?? ''} onChange={(v) => set('trigger', v)} testID="trigger-input" keyboard="decimal-pad" />
    </>
  );
}

/** How long a limit or stop order lives: one day, or good till triggered with an optional last day. */
function LifetimeFields({ form, set }: { form: OrderForm; set: SetField }) {
  return (
    <>
      <Choice label="How long" value={form.validity ?? 'day'} options={['day', 'gtt'] as const} labels={VALIDITY_LABELS} onChange={(v) => set('validity', v)} testID="pick-validity" />
      {form.validity === 'gtt' ? (
        <Field label="Last valid day (YYYY-MM-DD), empty for the longest (250 sessions)" value={form.until ?? ''} onChange={(v) => set('until', v)} testID="until-input" />
      ) : null}
    </>
  );
}

/** Trigger, limit and lifetime fields, shown only for the order types that use them. */
function PriceFields({ form, set }: { form: OrderForm; set: SetField }) {
  const stop = form.type === 'stop' || form.type === 'stop_limit';
  const limit = form.type === 'limit' || form.type === 'stop_limit';
  return (
    <>
      {stop ? <TriggerFields form={form} set={set} /> : null}
      {limit ? (
        <Field label="Limit price (₹)" value={form.limit} onChange={(v) => set('limit', v)} testID="limit-input" keyboard="decimal-pad" />
      ) : null}
      {form.type !== 'market' ? <LifetimeFields form={form} set={set} /> : null}
    </>
  );
}

function OrderFields(props: {
  market: Market;
  form: OrderForm;
  set: SetField;
  lists: ReturnType<typeof useStockLists>;
  holding: Holding | undefined;
}) {
  const { market, form, set, lists } = props;
  return (
    <>
      <StockPicker
        market={market}
        value={form.instrumentId}
        onChange={(v) => {
          set('instrumentId', v);
          lists.picked(v);
        }}
        groups={lists.groups}
        watched={lists.watching(form.instrumentId)}
        onToggleWatch={() => lists.toggle(form.instrumentId)}
        {...(props.holding === undefined ? {} : { holding: holdingLine(props.holding) })}
      />
      <Choice
        label="Type"
        value={form.type}
        options={['market', 'limit', 'stop', 'stop_limit'] as const}
        labels={TYPE_LABELS}
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
      <PriceFields form={form} set={set} />
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
        sttExempt: market.config.sttExempt?.includes(form.instrumentId) === true,
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

const orderText = (f: OrderForm): string => `${f.side} ${f.quantity || '?'} of ${f.instrumentId || '(no stock chosen)'}, ${f.type} order`;

export function TradeScreen({ kv, now, market, env, embedded = false }: { kv: KeyValueStore; now: () => number; market: Market; env: TutorEnv; embedded?: boolean }) {
  const { view, form, message, set, submit, cancel, journal, setJournal, touched, prepareSell } = useTrade(kv, now, market);
  const holding = view?.positions.find((p) => p.instrumentId === form.instrumentId);
  const lists = useStockLists(kv, now, market, view);
  useUnsaved('trade', touched, 'an order you have not placed');
  // While a field is being typed in, the bar steps aside so the keyboard leaves room for the field itself.
  const typing = useKeyboardHeight() > 0;
  const content = (
    <>
      <CoachHint screen="trade" />
      {view !== null ? <Holdings cash={view.cash} holdings={view.positions} onSell={prepareSell} /> : null}
      <View>
        <Section title="New order (virtual money)">
          <OrderFields market={market} form={form} set={set} lists={lists} holding={holding} />
          <JournalFields value={journal} onChange={setJournal} />
          <AskPanel env={env} label="Check my plan before I trade" testID="pre-trade" build={() => preTrade({ order: orderText(form), facts: [{ key: 'side', label: 'side', value: form.side }, { key: 'quantity', label: 'quantity', value: form.quantity || 'not set' }], flags: [], journal, symbols: form.instrumentId === '' ? [] : [form.instrumentId], names: env.names, lessonIds: ['habits-that-help', 'types-of-risk'] })} />
        </Section>
      </View>
      {form.instrumentId !== '' ? <CostSection market={market} form={form} /> : null}
      {view !== null ? <Book view={view} onCancel={(id) => void cancel(id)} /> : <Note>Loading the book...</Note>}
    </>
  );
  const bar = <OrderBar market={market} form={form} set={set} submit={() => void submit()} message={message} holding={holding} />;
  // Inside a Time Machine session the page already scrolls, so the bar follows the form instead of floating.
  if (embedded)
    return (
      <View testID="trade-screen">
        <View style={styles.page}>
          {content}
          {bar}
        </View>
      </View>
    );
  return (
    <View style={styles.screen}>
      <ScrollView contentContainerStyle={styles.page} keyboardShouldPersistTaps="handled" testID="trade-screen">
        {content}
      </ScrollView>
      {typing ? null : bar}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
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
    minWidth: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  choiceOn: { borderColor: colors.accent, backgroundColor: colors.selected },
  choiceText: { color: colors.text },
  choiceTextOn: { color: colors.accent, fontWeight: '600' },
  cancel: { minHeight: 44, justifyContent: 'center', marginBottom: 6 },
  contractNote: { paddingLeft: 12, marginBottom: 8 },
  tapRow: { minHeight: 44, justifyContent: 'center' },
});
