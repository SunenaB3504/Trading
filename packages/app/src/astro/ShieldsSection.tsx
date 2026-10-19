import { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Note, Row, Section, colors } from '../ui/Section';
import type { Engine } from './engine';
import { usePack, useT } from './i18n/react';
import { Button, Field } from './ProfileFields';
import { bannerView, taraView } from './shieldsView';
import type { TaraView } from './shieldsView';

const CONVENTIONS_VERSION = 1;
const IST_ZONE = 'Asia/Kolkata';

/** Why a typed first-trade date and time cannot be used, as a key the screen puts into the person's language. */
type Problem = 'tara.badFormat' | 'tara.notReal';

class TimeProblem extends Error {
  constructor(readonly key: Problem) {
    super(key);
  }
}

/** A first-trade date and time as typed (IST) to a UTC instant, using the zone's own history. */
function firstTradeMs(engine: Engine, date: string, time: string): number {
  const d = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
  const t = /^(\d{2}):(\d{2})$/.exec(time.trim());
  if (d === null || t === null) throw new TimeProblem('tara.badFormat');
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
  if (!real) throw new TimeProblem('tara.notReal');
  return engine.localToUtc(IST_ZONE, ms / 1000).utcSec * 1000;
}

function Banner(props: { engine: Engine; moonSign: number; now: () => number }) {
  const t = useT();
  const pack = usePack();
  const [at] = useState(() => props.now());
  const banner = useMemo(() => {
    const conventions = props.engine.freezeConventions(CONVENTIONS_VERSION).calc;
    return props.engine.chandrashtamaBanner(props.moonSign, at, conventions);
  }, [props.engine, props.moonSign, at]);
  const view = bannerView(banner, pack);
  return (
    <Section title={t('cs.title')}>
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

function TaraCheck(props: { engine: Engine; moonNakshatra: number }) {
  const t = useT();
  const pack = usePack();
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [assumed, setAssumed] = useState(false);
  const [out, setOut] = useState<
    | { kind: 'result'; result: ReturnType<Engine['taraForStock']> }
    | { kind: 'problem'; key: Problem | 'form.error' }
    | null
  >(null);
  const run = () => {
    try {
      const frozen = props.engine.freezeConventions(CONVENTIONS_VERSION);
      const ms = firstTradeMs(props.engine, date, time);
      setOut({
        kind: 'result',
        result: props.engine.taraForStock(props.moonNakshatra, ms, assumed, frozen),
      });
    } catch (e) {
      setOut({ kind: 'problem', key: e instanceof TimeProblem ? e.key : 'form.error' });
    }
  };
  return (
    <Section title={t('tara.title')}>
      <Note>{t('tara.intro')}</Note>
      <Field label={t('tara.date')} value={date} onChange={setDate} testID="tara-date" />
      <Field label={t('tara.time')} value={time} onChange={setTime} testID="tara-time" />
      <Pressable
        accessibilityRole="checkbox"
        accessibilityState={{ checked: assumed }}
        onPress={() => setAssumed(!assumed)}
        style={styles.check}
        testID="tara-assumed"
      >
        <Text style={styles.checkText}>
          {assumed ? '☑' : '☐'} {t('tara.assumed')}
        </Text>
      </Pressable>
      <Button label={t('tara.run')} onPress={run} testID="tara-run" />
      {out?.kind === 'problem' ? (
        <Text style={styles.message} testID="tara-message">
          {t(out.key)}
        </Text>
      ) : null}
      {out?.kind === 'result' ? <TaraResult view={taraView(out.result, pack)} /> : null}
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
  check: { minHeight: 44, justifyContent: 'center', marginBottom: 4 },
  checkText: { color: colors.text, fontSize: 14 },
  message: { color: colors.text, marginBottom: 8 },
  warning: { color: colors.warn, fontSize: 13, marginBottom: 8 },
});
