import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useKeyboardHeight } from '../hooks/useKeyboardHeight';
import type { KeyValueStore } from '../store/kv';
import { previewCosts } from '../trading/costPreview';
import type { OrderForm } from '../trading/orderRequest';
import type { Market } from '../trading/market';
import { marketNow, timingText } from '../trading/orderTiming';
import type { Holding, SessionView } from '../trading/paperSession';
import { Holdings, holdingLine } from './Holdings';
import { OrderBar } from './OrderBar';
import type { SetField } from './OrderBar';
import { AdvancedJournal, finalForm, ModeSwitch, QuantityFields, ReasonChips, sharesFor, WhenFields } from './OrderForm';
import type { OrderUi } from './OrderForm';
import { journalSuggestions, useJournalEntries, useReasons, useStockLists, useTrade } from './tradeState';
import type { TradeState } from './tradeState';
import { Note, Row, Section, colors } from '../ui/Section';
import { preTrade } from '@trading/tutor';
import { AskPanel } from '../tutor/AskPanel';
import type { TutorEnv } from '../tutor/run';
import { CoachHint } from '../ui/CoachHint';
import { useUnsaved } from '../ui/unsaved';
import { quoteOf } from '../trading/quote';
import { StockPicker } from './StockPicker';

export { StockPicker } from './StockPicker';
export { Choice, Field } from '../ui/FormControls';
import { Choice, Field } from '../ui/FormControls';

const TYPE_LABELS = {
  market: 'Market',
  limit: 'Limit',
  stop: 'Stop-loss market (SL-M)',
  stop_limit: 'Stop-loss limit (SL)',
} as const;
const WHEN_LABELS = { at_or_below: 'Price falls to', at_or_above: 'Price rises to' } as const;
const VALIDITY_LABELS = { day: 'One day', gtt: 'Good till triggered (GTT)' } as const;

function Book({ view, onCancel }: { view: SessionView; onCancel: (id: string) => void }) {
  const [open, setOpen] = useState<string | null>(null);
  return (
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
                <Text style={styles.cancelText}>Cancel this order</Text>
              </Pressable>
            ) : null}
          </View>
        ))}
      </View>
    </Section>
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

/** Advanced: the trigger, limit and lifetime fields, shown only for the order types that use them. */
function PriceFields({ form, set }: { form: OrderForm; set: SetField }) {
  const stop = form.type === 'stop' || form.type === 'stop_limit';
  const limit = form.type === 'limit' || form.type === 'stop_limit';
  if (form.type === 'market') return null;
  return (
    <>
      {stop ? <TriggerFields form={form} set={set} /> : null}
      {limit ? <Field label="Limit price (₹)" value={form.limit} onChange={(v) => set('limit', v)} testID="limit-input" keyboard="decimal-pad" /> : null}
      <Choice label="How long" value={form.validity ?? 'day'} options={['day', 'gtt'] as const} labels={VALIDITY_LABELS} onChange={(v) => set('validity', v)} testID="pick-validity" />
      {form.validity === 'gtt' ? (
        <Field label="Last valid day (YYYY-MM-DD), empty for the longest (250 sessions)" value={form.until ?? ''} onChange={(v) => set('until', v)} testID="until-input" />
      ) : null}
    </>
  );
}

function OrderFields(props: { market: Market; t: TradeState; lists: ReturnType<typeof useStockLists>; holding: Holding | undefined; reasons: ReturnType<typeof useReasons>; now: number }) {
  const { market, t, lists } = props;
  const { form, set, ui, setUi } = t;
  const advanced = ui.mode === 'advanced';
  const group = form.side === 'buy' ? 'entry' : 'exit';
  return (
    <>
      <ModeSwitch mode={ui.mode} onChange={(mode) => setUi({ mode })} />
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
      {advanced ? (
        <Choice label="Type" value={form.type} options={['market', 'limit', 'stop', 'stop_limit'] as const} labels={TYPE_LABELS} onChange={(v) => set('type', v)} testID="pick-type" />
      ) : null}
      <QuantityFields market={market} form={form} set={set} ui={ui} setUi={setUi} />
      {advanced ? <PriceFields form={form} set={set} /> : null}
      <WhenFields form={form} timing={ui.timing} onChange={(timing) => setUi({ timing })} now={props.now} />
      <ReasonChips
        group={group}
        reasons={props.reasons.reasons}
        chosen={t.journal.reasons ?? []}
        onChange={(reasons) => t.setJournal({ ...t.journal, reasons })}
        onAdd={(label) => props.reasons.add(group, label)}
      />
      {advanced ? <AdvancedJournal value={t.journal} onChange={t.setJournal} sell={form.side === 'sell'} /> : null}
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
        date: quoteOf(market, form.instrumentId)?.date ?? market.lastDate,
        sttExempt: market.config.sttExempt?.includes(form.instrumentId) === true,
      }),
    [market, form],
  );
  return (
    <Section title="Cost preview">
      {preview === null ? <Note>Enter a quantity to see the estimated charges.</Note> : null}
      {preview?.rows.map((r) => (
        <Row key={r.label} label={r.label} value={r.value} />
      ))}
      {preview?.caveats.map((c) => (
        <Note key={c}>{`Assumption: ${c}`}</Note>
      ))}
      <Note>Estimate at the last close; the real fill is the close of the day the order trades. Not investment advice.</Note>
    </Section>
  );
}

const orderText = (f: OrderForm): string => `${f.side} ${f.quantity || '?'} of ${f.instrumentId || '(no stock chosen)'}, ${f.type} order`;

/** The quantity the bar and the cost preview show: in Express by amount, the shares the amount buys. */
function shownForm(form: OrderForm, ui: OrderUi, market: Market): OrderForm {
  if (ui.mode !== 'express' || ui.qtyBy !== 'amount' || form.instrumentId === '') return form;
  const shares = sharesFor(ui.amount, quoteOf(market, form.instrumentId)?.close ?? null);
  return { ...form, quantity: shares === null ? '' : String(shares) };
}

/** The bar's line on when the order trades, or what stops it. */
function whenProps(built: ReturnType<typeof finalForm>, form: OrderForm, ui: OrderUi, at: number): { when: string; problem: string } {
  if (!built.ok) return { when: '', problem: built.error };
  return { when: timingText(built.form.type === 'market' ? form : built.form, ui.timing, at), problem: '' };
}

export function TradeScreen({ kv, now, market, env, embedded = false }: { kv: KeyValueStore; now: () => number; market: Market; env: TutorEnv; embedded?: boolean }) {
  const t = useTrade(kv, now, market);
  const { view, form, ui, message, set, submit, cancel, journal, touched, prepareSell, plans } = t;
  const at = marketNow(market, now());
  const holding = view?.positions.find((p) => p.instrumentId === form.instrumentId);
  const lists = useStockLists(kv, now, market, view);
  const reasons = useReasons(kv, now);
  const suggestions = journalSuggestions(view, useJournalEntries(kv, view), market.id);
  useUnsaved('trade', touched, 'an order you have not placed');
  // While a field is being typed in, the bar steps aside so the keyboard leaves room for the field itself.
  const typing = useKeyboardHeight() > 0;
  const shown = shownForm(form, ui, market);
  const built = finalForm(form, ui, market, at);
  const content = (
    <>
      <CoachHint screen="trade" />
      {view !== null ? <Holdings cash={view.cash} holdings={view.positions} onSell={prepareSell} plans={plans} suggestions={suggestions} /> : null}
      <Section title="New order (virtual money)">
        <OrderFields market={market} t={t} lists={lists} holding={holding} reasons={reasons} now={at} />
        <AskPanel env={env} label="Check my plan before I trade" testID="pre-trade" build={() => preTrade({ order: orderText(form), facts: [{ key: 'side', label: 'side', value: form.side }, { key: 'quantity', label: 'quantity', value: form.quantity || 'not set' }], flags: [], journal, symbols: form.instrumentId === '' ? [] : [form.instrumentId], names: env.names, lessonIds: ['habits-that-help', 'types-of-risk'] })} />
      </Section>
      {form.instrumentId !== '' ? <CostSection market={market} form={shown} /> : null}
      {view !== null ? <Book view={view} onCancel={(id) => void cancel(id)} /> : <Note>Loading the book...</Note>}
    </>
  );
  const bar = <OrderBar market={market} form={shown} set={set} submit={() => void submit()} message={message} holding={holding} {...whenProps(built, form, ui, at)} />;
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
  cancel: { minHeight: 44, justifyContent: 'center', marginBottom: 6 },
  cancelText: { color: colors.accent, fontWeight: '600' },
  contractNote: { paddingLeft: 12, marginBottom: 8 },
  tapRow: { minHeight: 44, justifyContent: 'center' },
});
