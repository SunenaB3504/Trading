import { useState } from 'react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { formatPaise } from '../format/rupees';
import type { ExitPlan, ExitPlanInput } from '../trading/exitPlans';
import type { Holding } from '../trading/paperSession';
import { colors } from '../ui/colors';
import { AppText as Text } from '../ui/typography';

export type PlanResult = { ok: true } | { ok: false; error: string };

export interface PlanActions {
  save: (instrumentId: string, input: ExitPlanInput) => Promise<PlanResult>;
  remove: (instrumentId: string) => Promise<void>;
  sellReached: (instrumentId: string) => Promise<void>;
}

const rupees = (p: number | null): string => (p === null ? '' : (p / 100).toFixed(2));

/** "stop ₹855.43 · target ₹1,049.92 · close of 2026-11-06 · asks you first". */
export function planSummary(p: ExitPlan): string {
  const parts = [
    p.stopPaise === null ? null : `stop ${formatPaise(p.stopPaise)}`,
    p.targetPaise === null ? null : `target ${formatPaise(p.targetPaise)}`,
    p.exitDate === null ? null : `close of ${p.exitDate}`,
    `${String(p.quantity)} shares`,
    p.mode === 'auto' ? 'sells automatically' : 'asks you first',
  ];
  return parts.filter((x) => x !== null).join(' · ');
}

function reachedText(p: ExitPlan): string {
  const e = p.event;
  if (e === undefined) return 'The exit plan was reached.';
  if (e.kind === 'stop') return `Stop ${formatPaise(p.stopPaise ?? 0)} was touched on ${e.date}.`;
  if (e.kind === 'target') return `Target ${formatPaise(p.targetPaise ?? 0)} was reached on ${e.date}.`;
  return `The exit date ${e.date} came (close ${formatPaise(e.pricePaise)}).`;
}

function Field(props: { label: string; value: string; onChange: (v: string) => void; placeholder: string; testID: string; numeric?: boolean }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChange}
        placeholder={props.placeholder}
        placeholderTextColor={colors.muted}
        keyboardType={props.numeric === true ? 'decimal-pad' : 'default'}
        style={styles.input}
        accessibilityLabel={props.label}
        testID={props.testID}
      />
    </View>
  );
}

function ModeChoice(props: { mode: 'auto' | 'ask'; onChange: (m: 'auto' | 'ask') => void }) {
  const option = (m: 'auto' | 'ask', label: string) => (
    <Pressable
      key={m}
      accessibilityRole="radio"
      accessibilityState={{ selected: props.mode === m }}
      onPress={() => props.onChange(m)}
      style={[styles.mode, props.mode === m ? styles.modeOn : null]}
      testID={`plan-mode-${m}`}
    >
      <Text style={props.mode === m ? styles.modeTextOn : styles.modeText}>{label}</Text>
    </Pressable>
  );
  return (
    <View style={styles.modes}>
      {option('ask', 'Ask me first')}
      {option('auto', 'Sell automatically')}
    </View>
  );
}

/** Set, change or take away the exit plan of one holding: stop, target, exit date (at its close), shares, and mode. */
/** The form's starting values: the plan being changed, or all the shares, asking first. */
const initialInput = (h: Holding): ExitPlanInput =>
  h.plan === null
    ? { quantity: String(h.quantity), stop: '', target: '', exitDate: '', mode: 'ask' }
    : { quantity: String(h.plan.quantity), stop: rupees(h.plan.stopPaise), target: rupees(h.plan.targetPaise), exitDate: h.plan.exitDate ?? '', mode: h.plan.mode };

function PlanForm(props: { h: Holding; actions: PlanActions; onClose: () => void }) {
  const { h } = props;
  const p = h.plan;
  const [input, setInput] = useState<ExitPlanInput>(() => initialInput(h));
  const [error, setError] = useState<string | null>(null);
  const set = (k: keyof ExitPlanInput) => (v: string) => setInput((i) => ({ ...i, [k]: v }));
  const save = () =>
    void props.actions.save(h.instrumentId, input).then((r) => (r.ok ? props.onClose() : setError(r.error)));
  return (
    <View style={styles.form} testID="exit-plan-form">
      <Text style={styles.formTitle}>{`Exit plan for ${h.symbol}: whichever comes first sells`}</Text>
      <Field label="Stop price (₹): sell if it falls to" value={input.stop} onChange={set('stop')} placeholder="e.g. 855.43" testID="plan-stop" numeric />
      <Field label="Target price (₹): sell if it rises to" value={input.target} onChange={set('target')} placeholder="e.g. 1049.92" testID="plan-target" numeric />
      <Field label="Exit date: sell at that day's close (YYYY-MM-DD)" value={input.exitDate} onChange={set('exitDate')} placeholder="e.g. 2026-11-06" testID="plan-date" />
      <Field label={`Shares to sell (you hold ${String(h.quantity)})`} value={input.quantity} onChange={set('quantity')} placeholder={String(h.quantity)} testID="plan-quantity" numeric />
      <Text style={styles.label}>When it happens</Text>
      <ModeChoice mode={input.mode} onChange={(mode) => setInput((i) => ({ ...i, mode }))} />
      <Text style={styles.hint}>
        {input.mode === 'ask'
          ? 'Nothing is sold by itself: the app tells you and you decide. A sale you confirm goes at the next open.'
          : 'The first of stop, target or date sells by itself, at that price or that close, and the others are dropped.'}
      </Text>
      {error !== null ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.buttons}>
        <Pressable accessibilityRole="button" onPress={props.onClose} style={[styles.button, styles.quiet]}>
          <Text style={styles.quietText}>Close</Text>
        </Pressable>
        {p !== null ? (
          <Pressable accessibilityRole="button" onPress={() => void props.actions.remove(h.instrumentId).then(props.onClose)} style={[styles.button, styles.quiet]} testID="plan-remove">
            <Text style={styles.quietText}>Remove plan</Text>
          </Pressable>
        ) : null}
        <Pressable accessibilityRole="button" onPress={save} style={[styles.button, styles.primary]} testID="plan-save">
          <Text style={styles.primaryText}>Save plan</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** A plan in "ask" mode that has been reached: what happened, and the person's three choices. */
function Reached(props: { h: Holding; actions: PlanActions; onEdit: () => void }) {
  const { h } = props;
  const p = h.plan as ExitPlan;
  return (
    <View style={styles.reached} testID={`plan-reached-${h.symbol}`}>
      <Text style={styles.reachedTitle}>{`Exit plan reached: ${h.symbol}`}</Text>
      <Text style={styles.text}>{`${reachedText(p)} Sell ${String(Math.min(p.quantity, h.quantity))} shares now? The sale goes at the next open, so the price can differ.`}</Text>
      <View style={styles.buttons}>
        <Pressable accessibilityRole="button" onPress={() => void props.actions.remove(h.instrumentId)} style={[styles.button, styles.quiet]} testID="plan-keep">
          <Text style={styles.quietText}>Keep shares</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={props.onEdit} style={[styles.button, styles.quiet]}>
          <Text style={styles.quietText}>Change plan</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => void props.actions.sellReached(h.instrumentId)} style={[styles.button, styles.sell]} testID="plan-sell-now">
          <Text style={styles.primaryText}>Sell now</Text>
        </Pressable>
      </View>
    </View>
  );
}

/** Under a holding: its exit plan in one line with a button to set or change it, the form, or the reached prompt. */
export function ExitPlanPanel(props: { h: Holding; actions: PlanActions }) {
  const [editing, setEditing] = useState(false);
  const { h } = props;
  if (editing) return <PlanForm h={h} actions={props.actions} onClose={() => setEditing(false)} />;
  if (h.plan?.status === 'reached') return <Reached h={h} actions={props.actions} onEdit={() => setEditing(true)} />;
  return (
    <View style={styles.line}>
      <Text style={styles.planText} testID={`plan-line-${h.symbol}`}>
        {h.plan === null ? 'No exit plan' : `Exit plan: ${planSummary(h.plan)}`}
      </Text>
      <Pressable accessibilityRole="button" onPress={() => setEditing(true)} style={styles.link} testID={`plan-edit-${h.symbol}`}>
        <Text style={styles.linkText}>{h.plan === null ? 'Set exit plan' : 'Change'}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' },
  planText: { color: colors.muted, fontSize: 12, flexShrink: 1 },
  link: { minHeight: 44, justifyContent: 'center', paddingHorizontal: 4 },
  linkText: { color: colors.accent, fontWeight: '600' },
  form: { borderWidth: 1, borderColor: colors.line, borderRadius: 8, padding: 10, marginVertical: 6, gap: 4 },
  formTitle: { color: colors.text, fontWeight: '700' },
  field: { marginTop: 4 },
  label: { color: colors.muted, fontSize: 13, marginTop: 4 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 6, padding: 10, minHeight: 44, color: colors.text },
  modes: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  mode: { borderWidth: 1, borderColor: colors.line, borderRadius: 6, paddingHorizontal: 12, minHeight: 44, justifyContent: 'center', flexGrow: 1, alignItems: 'center' },
  modeOn: { borderColor: colors.accent, backgroundColor: colors.selected },
  modeText: { color: colors.text },
  modeTextOn: { color: colors.accent, fontWeight: '700' },
  hint: { color: colors.muted, fontSize: 12 },
  error: { color: colors.loss },
  buttons: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginTop: 6 },
  button: { minHeight: 44, borderRadius: 6, paddingHorizontal: 12, justifyContent: 'center', alignItems: 'center', flexGrow: 1 },
  quiet: { borderWidth: 1, borderColor: colors.line },
  quietText: { color: colors.accent, fontWeight: '600' },
  primary: { backgroundColor: colors.accent },
  primaryText: { color: '#fff', fontWeight: '700' },
  sell: { backgroundColor: colors.loss },
  reached: { borderWidth: 2, borderColor: colors.warn, borderRadius: 8, padding: 10, marginVertical: 6, gap: 4 },
  reachedTitle: { color: colors.warn, fontWeight: '700' },
  text: { color: colors.text },
});
