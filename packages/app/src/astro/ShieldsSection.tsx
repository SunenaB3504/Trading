import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { Note, Row, Section, colors } from '../ui/Section';
import type { Engine } from './engine';
import { bannerView, taraView } from './shieldsView';
import type { TaraView } from './shieldsView';

const CONVENTIONS_VERSION = 1;
const IST_ZONE = 'Asia/Kolkata';

/** A first-trade date and time as typed (IST) to a UTC instant, using the zone's own history. */
function firstTradeMs(engine: Engine, date: string, time: string): number {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  const t = /^(\d{2}):(\d{2})$/.exec(time.trim());
  if (d === null || t === null)
    throw new Error('Enter the date as YYYY-MM-DD and the time as HH:MM (IST).');
  const [y, mo, da, h, mi] = [d[1], d[2], d[3], t[1], t[2]].map(Number) as [
    number,
    number,
    number,
    number,
    number,
  ];
  const ms = Date.UTC(y, mo - 1, da, h, mi);
  const back = new Date(ms);
  const real =
    back.getUTCFullYear() === y &&
    back.getUTCMonth() === mo - 1 &&
    back.getUTCDate() === da &&
    h < 24 &&
    mi < 60;
  if (!real) throw new Error('That is not a real date and time.');
  return engine.localToUtc(IST_ZONE, ms / 1000).utcSec * 1000;
}

function Banner(props: { engine: Engine; moonSign: number; now: () => number }) {
  const [at] = useState(() => props.now());
  const view = useMemo(() => {
    const conventions = props.engine.freezeConventions(CONVENTIONS_VERSION).calc;
    return bannerView(props.engine.chandrashtamaBanner(props.moonSign, at, conventions));
  }, [props.engine, props.moonSign, at]);
  return (
    <Section title="Chandrashtama">
      <Text style={styles.headline} testID="banner-headline">
        {view.headline}
      </Text>
      {view.lines.map((l) => (
        <Row key={l.label} label={l.label} value={l.value} />
      ))}
      <Note>{view.footnote}</Note>
    </Section>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  testID: string;
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{props.label}</Text>
      <TextInput
        accessibilityLabel={props.label}
        onChangeText={props.onChange}
        style={styles.input}
        testID={props.testID}
        value={props.value}
      />
    </View>
  );
}

function TaraCheck(props: { engine: Engine; moonNakshatra: number }) {
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [assumed, setAssumed] = useState(false);
  const [out, setOut] = useState<TaraView | string | null>(null);
  const run = () => {
    try {
      const frozen = props.engine.freezeConventions(CONVENTIONS_VERSION);
      const ms = firstTradeMs(props.engine, date, time);
      setOut(taraView(props.engine.taraForStock(props.moonNakshatra, ms, assumed, frozen)));
    } catch (e) {
      setOut(e instanceof Error ? e.message : 'Something went wrong.');
    }
  };
  return (
    <Section title="Tara Bala for a stock">
      <Note>
        Enter the stock's first-trade date and time from the exchange record. The count runs from
        your birth star to the stock's.
      </Note>
      <Field
        label="First-trade date (YYYY-MM-DD)"
        value={date}
        onChange={setDate}
        testID="tara-date"
      />
      <Field
        label="First-trade time, IST (HH:MM)"
        value={time}
        onChange={setTime}
        testID="tara-time"
      />
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: assumed }}
        onPress={() => setAssumed(!assumed)}
        style={styles.check}
        testID="tara-assumed"
      >
        <Text style={styles.checkText}>
          {assumed ? '☑' : '☐'} The exchange gave no time, so this time is assumed
        </Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={run} style={styles.button} testID="tara-run">
        <Text style={styles.buttonText}>Check Tara</Text>
      </Pressable>
      {typeof out === 'string' ? (
        <Text style={styles.message} testID="tara-message">
          {out}
        </Text>
      ) : null}
      {out !== null && typeof out !== 'string' ? <TaraResult view={out} /> : null}
    </Section>
  );
}

function TaraResult({ view }: { view: TaraView }) {
  return (
    <View testID="tara-result">
      <Text style={styles.headline} testID="tara-headline">
        {view.headline}
      </Text>
      {view.warning !== null ? <Text style={styles.warning}>{view.warning}</Text> : null}
      {view.lines.map((l) => (
        <Row key={l.label} label={l.label} value={l.value} />
      ))}
      <Note>{view.footnote}</Note>
    </View>
  );
}

/** The two personal shields (FR-P6, FR-P7): information about the Moon, never a score or a trading instruction. */
export function ShieldsSection(props: {
  engine: Engine;
  moonSign: number;
  moonNakshatra: number;
  now: () => number;
}) {
  return (
    <>
      <Banner engine={props.engine} moonSign={props.moonSign} now={props.now} />
      <TaraCheck engine={props.engine} moonNakshatra={props.moonNakshatra} />
    </>
  );
}

const styles = StyleSheet.create({
  headline: { color: colors.text, fontSize: 15, fontWeight: '600', marginBottom: 6 },
  field: { marginBottom: 12 },
  label: { color: colors.muted, fontSize: 13, marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 8,
    padding: 12,
    minHeight: 44,
    color: colors.text,
    fontSize: 15,
  },
  check: { minHeight: 44, justifyContent: 'center', marginBottom: 4 },
  checkText: { color: colors.text, fontSize: 14 },
  button: {
    backgroundColor: colors.accent,
    borderRadius: 8,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 4,
    marginBottom: 8,
  },
  buttonText: { color: '#ffffff', fontWeight: '600' },
  message: { color: colors.text, marginBottom: 8 },
  warning: { color: colors.warn, fontSize: 13, marginBottom: 8 },
});
