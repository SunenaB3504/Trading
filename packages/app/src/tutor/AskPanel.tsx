import { useState } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import type { TutorAnswer, TutorContext } from '@trading/tutor';
import { Button } from '../ui/Button';
import { colors } from '../ui/Section';
import { AppText as Text } from '../ui/typography';
import { runAsk } from './run';
import type { TutorEnv } from './run';

const SOURCE_TEXT: Record<TutorAnswer['source'], string> = {
  ai: 'AI answer',
  coach: 'Built-in coach (no AI used)',
  preview: 'Sample answer (Preview, no AI used)',
  declined: 'Not answered',
};

/** An answer with where it came from, the facts it used and how it was made. */
export function AnswerView({ answer, testID }: { answer: TutorAnswer; testID: string }) {
  return (
    <View style={styles.answer} testID={testID}>
      <Text style={styles.source}>{SOURCE_TEXT[answer.source]}</Text>
      <Text style={styles.text}>{answer.text}</Text>
      {answer.facts.length > 0 ? (
        <Text style={styles.facts}>Facts used: {answer.facts.map((f) => `${f.label} ${f.value}`).join('; ')}</Text>
      ) : null}
      {answer.provenance !== null ? (
        <Text style={styles.facts}>
          Model {answer.provenance.model}, template {answer.provenance.templateVersion}, checked by code.
        </Text>
      ) : null}
    </View>
  );
}

/**
 * A button that asks the tutor one thing. `build` makes the context when pressed, so it reads the screen as it is then.
 * With `question`, a text box is shown first. The tutor can only write text: nothing here can place or change an order.
 */
export function AskPanel(props: {
  env: TutorEnv;
  label: string;
  testID: string;
  build: (question: string) => TutorContext | Promise<TutorContext>;
  question?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [q, setQ] = useState('');
  const [answer, setAnswer] = useState<TutorAnswer | null>(null);
  const go = () => {
    setBusy(true);
    void Promise.resolve(props.build(q))
      .then((ctx) => runAsk(props.env, ctx))
      .then(setAnswer)
      .finally(() => setBusy(false));
  };
  return (
    <View style={styles.panel}>
      {props.question === true ? (
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="Your question"
          style={styles.input}
          accessibilityLabel="Your question for the tutor"
          testID={`${props.testID}-q`}
        />
      ) : null}
      <Button label={busy ? 'Thinking…' : props.label} quiet onPress={busy ? () => undefined : go} testID={props.testID} />
      {answer !== null ? <AnswerView answer={answer} testID={`${props.testID}-answer`} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: { marginVertical: 6 },
  input: { borderWidth: 1, borderColor: colors.line, borderRadius: 6, minHeight: 44, paddingHorizontal: 10, color: colors.text },
  answer: { borderWidth: 1, borderColor: colors.line, borderRadius: 6, padding: 10, marginTop: 6 },
  source: { color: colors.muted, fontSize: 12, marginBottom: 4 },
  text: { color: colors.text, fontSize: 14, lineHeight: 20 },
  facts: { color: colors.muted, fontSize: 12, marginTop: 6 },
});
