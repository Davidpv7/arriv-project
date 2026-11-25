import type { ReactNode } from 'react';
import { ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, space } from '@/theme/tokens';

export type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  background?: 'paper' | 'navy';
  edges?: Edge[];
};

/** Screen container: paper ground, safe areas, 20px side padding, max width for wide web. */
export function Screen({
  children,
  scroll = false,
  background = 'paper',
  edges = ['top'],
}: ScreenProps) {
  const bg = { backgroundColor: colors[background] };
  return (
    <SafeAreaView style={[styles.flex, bg]} edges={edges}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.content} style={styles.flex}>
          <View style={styles.inner}>{children}</View>
        </ScrollView>
      ) : (
        <View style={[styles.flex, styles.content]}>
          <View style={[styles.inner, styles.flex]}>{children}</View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  content: { paddingHorizontal: space[5], paddingVertical: space[6] },
  inner: { width: '100%', maxWidth: 560, alignSelf: 'center' },
});
