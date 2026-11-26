import type { ReactNode } from 'react';
import {
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type FlatListProps,
} from 'react-native';
import { SafeAreaView, type Edge } from 'react-native-safe-area-context';

import { colors, space } from '@/theme/tokens';

export type ScreenProps = {
  children: ReactNode;
  scroll?: boolean;
  background?: 'paper' | 'navy';
  edges?: Edge[];
  /** Content width cap; desktop layouts with columns pass a wider one. Default 560. */
  maxWidth?: number;
};

/** Screen container: paper ground, safe areas, 20px side padding, max width for wide web. */
export function Screen({
  children,
  scroll = false,
  background = 'paper',
  edges = ['top'],
  maxWidth,
}: ScreenProps) {
  const bg = { backgroundColor: colors[background] };
  const cap = maxWidth ? { maxWidth } : null;
  return (
    <SafeAreaView style={[styles.flex, bg]} edges={edges}>
      {scroll ? (
        <ScrollView contentContainerStyle={styles.content} style={styles.flex}>
          <View style={[styles.inner, cap]}>{children}</View>
        </ScrollView>
      ) : (
        <View style={[styles.flex, styles.content]}>
          <View style={[styles.inner, cap, styles.flex]}>{children}</View>
        </View>
      )}
    </SafeAreaView>
  );
}

export type ListScreenProps<T> = Omit<FlatListProps<T>, 'contentContainerStyle'> & {
  edges?: Edge[];
  /** Pull to refresh. */
  refreshing?: boolean;
  onRefresh?: () => void;
};

/** Screen for long lists (feeds): a FlatList with the same padding, width and safe areas. */
export function ListScreen<T>({
  edges = ['top'],
  refreshing,
  onRefresh,
  ...props
}: ListScreenProps<T>) {
  return (
    <SafeAreaView style={[styles.flex, { backgroundColor: colors.paper }]} edges={edges}>
      <FlatList
        {...props}
        style={styles.flex}
        contentContainerStyle={[styles.content, styles.listContent]}
        ItemSeparatorComponent={props.ItemSeparatorComponent ?? ListGap}
        refreshControl={
          onRefresh ? (
            <RefreshControl
              refreshing={!!refreshing}
              onRefresh={onRefresh}
              tintColor={colors.navy}
              colors={[colors.tangerine]}
            />
          ) : undefined
        }
      />
    </SafeAreaView>
  );
}

function ListGap() {
  return <View style={styles.gap} />;
}

const styles = StyleSheet.create({
  listContent: { width: '100%', maxWidth: 600, alignSelf: 'center' },
  gap: { height: space[4] },
  flex: { flex: 1 },
  content: { paddingHorizontal: space[5], paddingVertical: space[6] },
  inner: { width: '100%', maxWidth: 560, alignSelf: 'center' },
});
