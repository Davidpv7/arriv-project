import type { ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, fonts, space } from '@/theme/tokens';

import { Avatar } from './Avatar';
import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type ListRowProps = {
  title: string;
  meta?: string;
  /** Leading avatar (people) or icon (settings). */
  avatar?: { initials: string; uri?: string | null };
  icon?: IconName;
  /** Trailing actions; when absent and pressable, a chevron. */
  right?: ReactNode;
  onPress?: () => void;
  accessibilityLabel?: string;
};

/** Row for people and settings lists. Rows are straight, never tilted. */
export function ListRow({
  title,
  meta,
  avatar,
  icon,
  right,
  onPress,
  accessibilityLabel,
}: ListRowProps) {
  const content = (
    <>
      {avatar && <Avatar initials={avatar.initials} uri={avatar.uri} />}
      {icon && <Icon name={icon} />}
      <View style={styles.text}>
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {meta ? (
          <Text variant="meta" color="muted" numberOfLines={1}>
            {meta}
          </Text>
        ) : null}
      </View>
      {right ?? (onPress ? <Icon name="chevronRight" size={20} color="muted" /> : null)}
    </>
  );

  if (!onPress) return <View style={styles.row}>{content}</View>;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? (meta ? `${title}, ${meta}` : title)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: 60,
    paddingVertical: space[2],
    paddingHorizontal: space[4],
    backgroundColor: colors.card,
  },
  text: { flex: 1, gap: 2 },
  title: { fontFamily: fonts.sans800, fontSize: 16, lineHeight: 20 },
  pressed: { opacity: 0.8 },
});
