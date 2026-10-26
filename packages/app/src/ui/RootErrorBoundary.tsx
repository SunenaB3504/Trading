import { Component } from 'react';
import type { ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors } from './colors';

interface State {
  failed: boolean;
}

/**
 * The permanent error boundary around the whole app (runbook R4.3). A screen that throws shows a recoverable page
 * instead of a blank one; nothing saved on the device is touched, so "Try again" starts the app afresh.
 */
export class RootErrorBoundary extends Component<{ children: ReactNode }, State> {
  override state: State = { failed: false };

  static getDerivedStateFromError(): State {
    return { failed: true };
  }

  override render(): ReactNode {
    if (!this.state.failed) return this.props.children;
    return (
      <View style={styles.page} testID="error-screen">
        <Text style={styles.title}>Something went wrong on this screen.</Text>
        <Text style={styles.text}>Your saved practice data is safe. Try again to reopen the app.</Text>
        <Pressable accessibilityRole="button" onPress={() => this.setState({ failed: false })} style={styles.button}>
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  page: { flex: 1, padding: 24, justifyContent: 'center', backgroundColor: colors.background },
  title: { fontSize: 18, fontWeight: '700', color: colors.text, marginBottom: 8 },
  text: { fontSize: 14, color: colors.text, marginBottom: 16 },
  button: { backgroundColor: colors.accent, borderRadius: 6, minHeight: 44, justifyContent: 'center', alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
});
