import type { ReactNode } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';

import { colors, radius, space } from '@/theme/tokens';

/** Plain card surface (lists, forms). `flush` removes padding for edge-to-edge rows. */
export function Card({
  children,
  flush = false,
  style,
}: {
  children: ReactNode;
  flush?: boolean;
  style?: StyleProp<ViewStyle>;
}) {
  return <View style={[styles.card, !flush && styles.padded, style]}>{children}</View>;
}

/** Hairline between rows inside a flush Card. */
export function Divider() {
  return <View style={styles.divider} />;
}

const styles = StyleSheet.create({
  card: { backgroundColor: colors.card, borderRadius: radius.card, overflow: 'hidden' },
  padded: { padding: space[4], gap: space[3] },
  divider: { height: 1, backgroundColor: colors.rule, marginLeft: space[4] },
});
