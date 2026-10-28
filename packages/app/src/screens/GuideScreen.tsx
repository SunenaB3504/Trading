import { useMemo } from 'react';
import { ScrollView, StyleSheet } from 'react-native';
import { GUIDE_MD, parseBlocks } from '@trading/content';
import { MarkdownView } from '../ui/MarkdownView';

/** Settings, Guide: how to use the app, from the same text as USER_GUIDE.md. */
export function GuideScreen() {
  const blocks = useMemo(() => parseBlocks(GUIDE_MD), []);
  return (
    <ScrollView contentContainerStyle={styles.page} testID="guide-screen">
      <MarkdownView blocks={blocks} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { padding: 16, maxWidth: 720, width: '100%', alignSelf: 'center' },
});
