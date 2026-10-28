import { useCallback, useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { FEATURES, FEATURE_LABELS, MODELS, PRICES_AS_OF, askScreen } from '@trading/tutor';
import type { Feature, Usage } from '@trading/tutor';
import { saveDeviceSettings } from '../settings/settings';
import type { DeviceSettings } from '../settings/settings';
import type { KeyValueStore } from '../store/kv';
import { AskPanel } from '../tutor/AskPanel';
import { clearKey, featureOn, keyLooksRight, loadAnswers, loadKey, loadUsage, modelFor, saveKey } from '../tutor/aiStore';
import type { StoredAnswer } from '../tutor/aiStore';
import { guideContext } from '../tutor/guide';
import { testKey } from '../tutor/run';
import type { TutorEnv } from '../tutor/run';
import { Button } from '../ui/Button';
import { Note, Section, colors } from '../ui/Section';
import { AppText as Text } from '../ui/typography';

const PRIVACY = [
  'Sent to the AI company when you use a live answer: the question or screen text, the lesson text it needs, your practice trades and journal text for that feature, and the figures shown under the answer.',
  'Never sent: your name, profile names, PINs, your API key (apart from the call itself), backups or anything outside this app.',
  'The tutor only writes text. It cannot place, change or cancel an order.',
];

const rupees = (paise: number): string => `₹${(paise / 100).toFixed(2)}`;

function MeterSection({ usage, limit }: { usage: Usage | null; limit: number }) {
  return (
    <Section title="Usage this month">
      <Text style={styles.line} testID="ai-meter">
        {usage === null ? '…' : `${rupees(usage.spentPaise)} of ₹${String(limit)} used, ${String(usage.calls)} calls`}
      </Text>
      <Note>{`Costs are estimates (prices checked ${PRICES_AS_OF}, about ₹90 to the dollar). The tutor stops at the limit and shows the built-in coach instead.`}</Note>
    </Section>
  );
}

function KeySection({ env }: { env: TutorEnv }) {
  const [text, setText] = useState('');
  const [saved, setSaved] = useState<boolean | null>(null);
  const [msg, setMsg] = useState('');
  useEffect(() => {
    void loadKey(env.secure).then((k) => setSaved(k !== null));
  }, [env.secure]);
  const save = () => {
    if (!keyLooksRight(text)) return setMsg('That does not look like an API key.');
    void saveKey(env.secure, text).then(() => {
      setText('');
      setSaved(true);
      setMsg('Key saved on this device.');
    });
  };
  const test = () => {
    setMsg('Testing…');
    void testKey(env).then((r) => setMsg(r.ok ? 'The key works.' : r.message));
  };
  const remove = () => void clearKey(env.secure).then(() => { setSaved(false); setMsg('Key removed.'); });
  return (
    <Section title="Claude API key">
      <Text style={styles.line} testID="ai-key-state">{saved === null ? '…' : saved ? 'A key is saved on this device.' : 'No key saved.'}</Text>
      <TextInput value={text} onChangeText={setText} secureTextEntry autoCapitalize="none" autoCorrect={false} style={styles.input} accessibilityLabel="Claude API key" testID="ai-key" />
      <Button label="Save key" quiet onPress={save} testID="ai-key-save" />
      {saved === true ? <Button label="Test key" quiet onPress={test} testID="ai-key-test" /> : null}
      {saved === true ? <Button label="Remove key" quiet danger onPress={remove} /> : null}
      {msg !== '' ? <Text style={styles.line} testID="ai-key-msg">{msg}</Text> : null}
      <Note>The key stays in this device's secure storage. It is never put in a backup.</Note>
    </Section>
  );
}

function FeatureRow(props: { feature: Feature; settings: DeviceSettings; save: (s: DeviceSettings) => void }) {
  const { feature, settings, save } = props;
  const on = featureOn(settings, feature);
  const model = modelFor(settings, feature);
  const next = MODELS[(MODELS.findIndex((m) => m.id === model) + 1) % MODELS.length];
  return (
    <View style={styles.feature}>
      <Text style={styles.featureName}>{FEATURE_LABELS[feature]}</Text>
      <Pressable accessibilityRole="switch" accessibilityState={{ checked: on }} onPress={() => save({ ...settings, aiFeatures: { ...settings.aiFeatures, [feature]: !on } })} style={styles.tap} testID={`ai-feature-${feature}`}>
        <Text style={styles.link}>{on ? 'On' : 'Off'}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={() => next !== undefined && save({ ...settings, aiModels: { ...settings.aiModels, [feature]: next.id } })} style={styles.tap} testID={`ai-model-${feature}`}>
        <Text style={styles.link}>{MODELS.find((m) => m.id === model)?.label.split(' (')[0] ?? model}</Text>
      </Pressable>
    </View>
  );
}

function Saved({ items }: { items: StoredAnswer[] }) {
  const [open, setOpen] = useState<string | null>(null);
  if (items.length === 0) return <Note>No AI answers are kept yet.</Note>;
  return (
    <>
      {[...items].reverse().slice(0, 20).map((a) => (
        <Pressable key={a.id} accessibilityRole="button" onPress={() => setOpen(open === a.id ? null : a.id)} style={styles.tap}>
          <Text style={styles.link}>{`${FEATURE_LABELS[a.feature]}, ${new Date(a.at).toISOString().slice(0, 10)}`}</Text>
          {open === a.id ? <Text style={styles.line}>{a.text}</Text> : null}
        </Pressable>
      ))}
    </>
  );
}

/** The Tutor section (SSD v4.1 §7): learning guide, a free question, and, for the owner, the AI settings. */
export function TutorScreen(props: { env: TutorEnv; owner: boolean; deviceKv: KeyValueStore; profileKv: KeyValueStore; onDevice: (s: DeviceSettings) => void }) {
  const { env, owner, deviceKv, profileKv } = props;
  const [usage, setUsage] = useState<Usage | null>(null);
  const [kept, setKept] = useState<StoredAnswer[]>([]);
  const refresh = useCallback(() => {
    void loadUsage(deviceKv, env.now()).then(setUsage);
    void loadAnswers(profileKv).then(setKept);
  }, [deviceKv, profileKv, env]);
  useEffect(refresh, [refresh]);
  const save = (s: DeviceSettings) => void saveDeviceSettings(deviceKv, s).then(() => props.onDevice(s));
  return (
    <ScrollView contentContainerStyle={styles.body} testID="tutor-screen">
      <Section title="Tutor">
        <Note>{`Mode: ${env.settings.aiMode === 'on' ? 'On' : env.settings.aiMode === 'preview' ? 'Preview' : 'Off'}. The tutor teaches; it never gives tips.`}</Note>
        <AskPanel env={env} label="What should I learn next?" testID="tutor-guide" build={() => guideContext(profileKv)} />
        <AskPanel env={env} label="Ask a question" testID="tutor-ask" question build={(question) => askScreen({ screen: 'Tutor', screenText: 'The Tutor section: learning guide and questions.', lessonId: null, facts: [], symbols: [], question })} />
      </Section>
      {owner ? <KeySection env={env} /> : <Note>Only the device owner can change the AI key and settings.</Note>}
      <MeterSection usage={usage} limit={env.settings.aiMonthlyLimitRupees} />
      {owner ? (
        <Section title="Features and models">
          {FEATURES.filter((f) => f !== 'scenario_debrief').map((f) => (
            <FeatureRow key={f} feature={f} settings={env.settings} save={save} />
          ))}
        </Section>
      ) : null}
      <Section title="What is sent">
        {PRIVACY.map((p) => <Note key={p}>{p}</Note>)}
      </Section>
      <Section title="Kept answers">
        <Saved items={kept} />
      </Section>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  body: { padding: 16 },
  line: { color: colors.text, fontSize: 14, marginVertical: 4 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 6, minHeight: 44, paddingHorizontal: 10, color: colors.text },
  feature: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderBottomColor: colors.line, minHeight: 44 },
  featureName: { flex: 1, color: colors.text, fontSize: 14 },
  tap: { minHeight: 44, minWidth: 44, justifyContent: 'center', paddingHorizontal: 8 },
  link: { color: colors.accent, fontSize: 14 },
});
