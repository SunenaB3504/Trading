import { StyleSheet, View } from 'react-native';
import { hintFor, lessonById } from '@trading/content';
import { colors } from './colors';
import { AppText as Text } from './typography';

/** The built-in coach: one fixed sentence for the screen, and the lesson to read about it. No AI, and it never touches an order. */
export function CoachHint({ screen }: { screen: string }) {
  const hint = hintFor(screen);
  if (hint === null) return null;
  const lesson = hint.lesson === undefined ? null : lessonById(hint.lesson);
  return (
    <View style={styles.box} testID={`coach-${screen}`}>
      <Text style={styles.label}>Coach</Text>
      <Text style={styles.text}>{hint.text}</Text>
      {lesson !== null ? <Text style={styles.lesson}>{`Lesson: ${lesson.title} (Learn)`}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  box: { backgroundColor: '#eef5ff', borderRadius: 8, padding: 10, marginBottom: 12 },
  label: { fontSize: 12, fontWeight: '700', color: colors.accent, marginBottom: 2 },
  text: { fontSize: 14, color: colors.text },
  lesson: { fontSize: 12, color: colors.muted, marginTop: 4 },
});
