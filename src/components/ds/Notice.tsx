import { StyleSheet, View } from 'react-native';

import { colors, radius, space } from '@/theme/tokens';

import { Text } from './Text';

export type NoticeProps = {
  /** DM Mono eyebrow, e.g. "CUSTOMS NOTICE". */
  eyebrow: string;
  body: string;
  tone?: 'sunshine' | 'sky';
};

/** Pinned notice ("Customs notice" not-advice disclaimer, visa guide disclaimer). */
export function Notice({ eyebrow, body, tone = 'sunshine' }: NoticeProps) {
  return (
    <View style={[styles.box, { backgroundColor: colors[tone] }]} accessibilityRole="summary">
      <Text variant="label">{eyebrow}</Text>
      <Text variant="body">{body}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { borderRadius: radius.ticket, padding: space[4], gap: space[1] },
});
