import { Pressable, StyleSheet, Text } from 'react-native';
import { colors } from './Section';

/** The app's filled button, at least 44 points tall so it is easy to hit on a phone. */
export function Button(props: {
  label: string;
  onPress: () => void;
  testID?: string;
  quiet?: boolean;
  danger?: boolean;
}) {
  const quiet = props.quiet === true;
  return (
    <Pressable
      accessibilityRole="button"
      onPress={props.onPress}
      style={[styles.button, quiet ? styles.quiet : null, props.danger === true ? styles.danger : null]}
      {...(props.testID === undefined ? {} : { testID: props.testID })}
    >
      <Text style={quiet ? styles.quietText : styles.text}>{props.label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: colors.accent,
    borderRadius: 6,
    minHeight: 44,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginVertical: 6,
  },
  quiet: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.line },
  danger: { backgroundColor: colors.warn },
  text: { color: '#fff', fontWeight: '600' },
  quietText: { color: colors.accent, fontWeight: '600' },
});
