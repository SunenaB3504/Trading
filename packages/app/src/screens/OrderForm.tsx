import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import type { BeforeFields } from '../journal/journalStore';
import { activeReasons } from '../journal/reasons';
import type { Reason } from '../journal/reasons';
import { formatPaise } from '../format/rupees';
import type { Market } from '../trading/market';
import type { OrderForm } from '../trading/orderRequest';
import { applyTiming, nextSession, today } from '../trading/orderTiming';
import type { Timing } from '../trading/orderTiming';
import { quoteOf } from '../trading/quote';
import { colors } from '../ui/colors';
import { Choice, Field } from '../ui/FormControls';
import { Note } from '../ui/Section';
import { AppText as Text } from '../ui/typography';
import type { SetField } from './OrderBar';

/**
 * The order form in two modes (owner, 2026-11-06). Express, the default, asks only what a new buyer needs: stock, buy or
 * sell, how much (shares or rupees), when (today's close or a date) and an optional reason, and is always a plain market
 * order for one day. Advanced adds every order type, good-till-triggered, the full journal and the simulator ticket.
 */
export type OrderMode = 'express' | 'advanced';

/** Per profile: the mode last used. */
export const ORDER_MODE_KEY = 'practise/orderMode';

/** Everything on the form that is not the engine's order itself. */
export interface OrderUi {
  mode: OrderMode;
  timing: Timing;
  qtyBy: 'shares' | 'amount';
  amount: string;
}

/** Whole shares a rupee amount buys at the last close; null when it cannot be worked out. */
export function sharesFor(amount: string, close: number | null): number | null {
  const m = /^(\d{1,9})(?:\.(\d{1,2}))?$/.exec(amount.trim());
  if (m === null || close === null || close <= 0) return null;
  const paise = Number(m[1]) * 100 + Number((m[2] ?? '').padEnd(2, '0'));
  return Math.floor(paise / close);
}

/** The safe defaults Express (and a market order) fall back to: nothing hidden can block an order. */
export const expressSafe = (f: OrderForm): OrderForm => ({ ...f, type: 'market', validity: 'day', until: '', trigger: '', limit: '', stop: '' });

/** The order the engine gets: Express made safe, a rupee amount turned into shares, and the timing applied. */
export function finalForm(form: OrderForm, ui: OrderUi, market: Market, now: number): { ok: true; form: OrderForm } | { ok: false; error: string } {
  let f = ui.mode === 'express' ? expressSafe(form) : form;
  if (ui.mode === 'express' && ui.qtyBy === 'amount') {
    const shares = sharesFor(ui.amount, form.instrumentId === '' ? null : (quoteOf(market, form.instrumentId)?.close ?? null));
    if (shares === null || shares < 1) return { ok: false, error: 'The amount does not buy a whole share at the last close.' };
    f = { ...f, quantity: String(shares) };
  }
  return applyTiming(f, ui.timing, now);
}

/** Express | Advanced at the top of the form. */
export function ModeSwitch(props: { mode: OrderMode; onChange: (m: OrderMode) => void }) {
  const option = (m: OrderMode, label: string) => (
    <Pressable
      key={m}
      accessibilityRole="radio"
      accessibilityState={{ selected: props.mode === m }}
      onPress={() => props.onChange(m)}
      style={[styles.segment, props.mode === m ? styles.segmentOn : null]}
      testID={`mode-${m}`}
    >
      <Text style={props.mode === m ? styles.segmentTextOn : styles.segmentText}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={styles.switch} accessibilityRole="radiogroup">
      {option('express', 'Express')}
      {option('advanced', 'Advanced')}
    </View>
  );
}

/** Today's close or a date (for a limit or stop order: when it starts being watched). */
export function WhenFields(props: { form: OrderForm; timing: Timing; onChange: (t: Timing) => void; now: number }) {
  const t = today(props.now);
  const market = props.form.type === 'market';
  const labels = {
    today: market ? (t.closeOpen ? "Today's close" : "Today's close (closed now)") : 'Next trading day',
    date: market ? 'On a date (at its close)' : 'From a date',
  };
  return (
    <View testID="when-fields">
      <Choice
        label={market ? 'When to trade' : 'Start watching'}
        value={props.timing.when}
        options={['today', 'date'] as const}
        labels={labels}
        onChange={(when) => props.onChange({ when, date: props.timing.date === '' ? (nextSession(t.date) ?? t.date) : props.timing.date })}
        testID="pick-timing"
      />
      {props.timing.when === 'date' ? (
        <Field label="Date (YYYY-MM-DD)" value={props.timing.date} onChange={(date) => props.onChange({ ...props.timing, date })} testID="date-input" placeholder={nextSession(t.date) ?? ''} />
      ) : null}
    </View>
  );
}

/** Shares, or in Express a rupee amount that the app turns into whole shares at the last close. */
export function QuantityFields(props: { market: Market; form: OrderForm; set: SetField; ui: OrderUi; setUi: (u: Partial<OrderUi>) => void }) {
  const { form, ui } = props;
  const close = form.instrumentId === '' ? null : (quoteOf(props.market, form.instrumentId)?.close ?? null);
  const byAmount = ui.mode === 'express' && ui.qtyBy === 'amount';
  const shares = byAmount ? sharesFor(ui.amount, close) : null;
  return (
    <>
      {ui.mode === 'express' ? (
        <Choice label="How much" value={ui.qtyBy} options={['shares', 'amount'] as const} labels={{ shares: 'Shares', amount: 'Rupees' }} onChange={(qtyBy) => props.setUi({ qtyBy })} testID="pick-qty-by" />
      ) : null}
      {byAmount ? (
        <>
          <Field label="Amount (₹)" value={ui.amount} onChange={(amount) => props.setUi({ amount })} testID="amount-input" keyboard="decimal-pad" placeholder="e.g. 50000" />
          <Note>{shares === null ? 'Enter an amount in rupees.' : `That buys ${String(shares)} shares at the last close${close === null ? '' : ` of ${formatPaise(close)}`}.`}</Note>
        </>
      ) : (
        <Field label="Quantity (shares)" value={form.quantity} onChange={(v) => props.set('quantity', v)} testID="qty-input" keyboard="numeric" />
      )}
    </>
  );
}

/** Reason chips from the master list, with "+ Add a reason" in place. One main reason first, up to three in all. */
export function ReasonChips(props: {
  group: Reason['group'];
  reasons: readonly Reason[];
  chosen: readonly string[];
  onChange: (ids: string[]) => void;
  onAdd: (label: string) => Promise<string | null>;
}) {
  const [adding, setAdding] = useState(false);
  const [label, setLabel] = useState('');
  const toggle = (id: string) =>
    props.onChange(props.chosen.includes(id) ? props.chosen.filter((x) => x !== id) : [...props.chosen, id].slice(0, 3));
  const add = () =>
    void props.onAdd(label).then((id) => {
      if (id !== null) props.onChange([...props.chosen.filter((x) => x !== id), id].slice(0, 3));
      setLabel('');
      setAdding(false);
    });
  return (
    <View style={styles.reasons} testID={`reasons-${props.group}`}>
      <Text style={styles.label}>{props.group === 'entry' ? 'Why (optional, the first is the main reason)' : 'Why are you selling? (optional)'}</Text>
      <View style={styles.chips}>
        {activeReasons(props.reasons, props.group).map((r) => {
          const on = props.chosen.includes(r.id);
          return (
            <Pressable key={r.id} accessibilityRole="checkbox" accessibilityState={{ checked: on }} onPress={() => toggle(r.id)} style={[styles.chip, on ? styles.chipOn : null]} testID={`reason-${r.id}`}>
              <Text style={on ? styles.chipTextOn : styles.chipText}>{props.chosen[0] === r.id ? `★ ${r.label}` : r.label}</Text>
            </Pressable>
          );
        })}
        <Pressable accessibilityRole="button" onPress={() => setAdding(!adding)} style={styles.chip} testID="reason-add">
          <Text style={styles.chipTextOn}>+ Add a reason</Text>
        </Pressable>
      </View>
      {adding ? (
        <View style={styles.addRow}>
          <View style={styles.grow}>
            <Field label="New reason" value={label} onChange={setLabel} testID="reason-new" placeholder="e.g. Sector rotation" />
          </View>
          <Pressable accessibilityRole="button" onPress={add} style={styles.addButton} testID="reason-save">
            <Text style={styles.addText}>Add</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

const CONFIDENCE = ['1', '2', '3', '4', '5'] as const;

/** Advanced only: the journal as prices and words, and the simulator ticket. */
export function AdvancedJournal(props: { value: BeforeFields; onChange: (v: BeforeFields) => void; sell: boolean }) {
  const { value, onChange } = props;
  return (
    <View testID="journal-fields">
      <Note>Journal (optional): your plan, written before you trade.</Note>
      {props.sell ? null : (
        <>
          <Field label="Target price (₹): where you will take profit" value={value.target} onChange={(target) => onChange({ ...value, target })} testID="journal-target" keyboard="decimal-pad" placeholder="e.g. 1049.92" />
          <Field label="Exit if wrong: price (₹)" value={value.exitPlan} onChange={(exitPlan) => onChange({ ...value, exitPlan })} testID="journal-exit" keyboard="decimal-pad" placeholder="e.g. 855.43" />
        </>
      )}
      <Field label="Note" value={value.why} onChange={(why) => onChange({ ...value, why })} testID="journal-why" />
      <Choice label="Confidence (1 low, 5 high)" value={value.confidence === null ? '' : String(value.confidence)} options={CONFIDENCE} onChange={(c) => onChange({ ...value, confidence: Number(c) })} testID="journal-confidence" />
      <Field label="Simulator ticket (optional)" value={value.ticket ?? ''} onChange={(ticket) => onChange({ ...value, ticket })} testID="journal-ticket" placeholder="e.g. TKT-INDIGOPNTS-20261105-2731" />
    </View>
  );
}

/** The bar's line on when the order trades, or why it cannot yet. */
export function timingLine(form: OrderForm, ui: OrderUi, market: Market, now: number): string {
  const r = finalForm(form, ui, market, now);
  return r.ok ? '' : r.error;
}

const styles = StyleSheet.create({
  switch: { flexDirection: 'row', borderWidth: 1, borderColor: colors.accent, borderRadius: 8, overflow: 'hidden', marginBottom: 12 },
  segment: { flex: 1, minHeight: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: colors.background },
  segmentOn: { backgroundColor: colors.accent },
  segmentText: { color: colors.accent, fontWeight: '600' },
  segmentTextOn: { color: '#fff', fontWeight: '700' },
  reasons: { marginBottom: 10 },
  label: { color: colors.muted, fontSize: 13, marginBottom: 4 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { borderWidth: 1, borderColor: colors.line, borderRadius: 16, paddingHorizontal: 12, minHeight: 44, justifyContent: 'center' },
  chipOn: { borderColor: colors.accent, backgroundColor: colors.selected },
  chipText: { color: colors.text },
  chipTextOn: { color: colors.accent, fontWeight: '600' },
  addRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 6 },
  grow: { flex: 1 },
  addButton: { backgroundColor: colors.accent, borderRadius: 6, minHeight: 44, paddingHorizontal: 16, justifyContent: 'center', marginBottom: 10 },
  addText: { color: '#fff', fontWeight: '700' },
});
