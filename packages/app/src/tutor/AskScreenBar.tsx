import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { hintFor } from '@trading/content';
import { askScreen } from '@trading/tutor';
import { Button } from '../ui/Button';
import { colors } from '../ui/Section';
import { AskPanel } from './AskPanel';
import type { TutorEnv } from './run';

/**
 * "Ask about this screen", shown on every section. The tutor is told which screen this is and its fixed coach hint,
 * plus your question. Facts about the account are not sent from here; only the screen name, hint and question are.
 */
export function AskScreenBar({ env, screen, label }: { env: TutorEnv; screen: string; label: string }) {
  const [open, setOpen] = useState(false);
  const hint = hintFor(screen);
  return (
    <View style={styles.bar}>
      <Button label={open ? 'Close' : 'Ask about this screen'} quiet onPress={() => setOpen(!open)} testID="ask-screen-toggle" />
      {open ? (
        <AskPanel
          env={env}
          label="Ask"
          testID="ask-screen"
          question
          build={(question) =>
            askScreen({
              screen: label,
              screenText: hint === null ? `The ${label} screen.` : hint.text,
              lessonId: hint?.lesson ?? null,
              facts: [],
              symbols: [],
              question,
            })
          }
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { paddingHorizontal: 16, borderBottomWidth: 1, borderBottomColor: colors.line },
});
