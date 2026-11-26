import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, touchTarget, type ColorName } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';

export type IconButtonProps = {
  icon: IconName;
  /** Required: icon-only controls need a screen-reader label. */
  accessibilityLabel: string;
  onPress?: () => void;
  color?: ColorName;
  /** Card-filled circle behind the icon (on paper). */
  filled?: boolean;
  disabled?: boolean;
  /** A small tangerine dot for "something new" (say so in accessibilityLabel too). */
  dot?: boolean;
};

/** 44×44 icon-only button. */
export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  color = 'navy',
  filled = false,
  disabled,
  dot = false,
}: IconButtonProps) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      hitSlop={4}
      style={({ pressed }) => [
        styles.base,
        filled && styles.filled,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      <Icon name={icon} color={color} />
      {dot && <View style={styles.dot} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    width: touchTarget,
    height: touchTarget,
    borderRadius: radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  filled: { backgroundColor: colors.card },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.4 },
  dot: {
    position: 'absolute',
    top: 9,
    right: 9,
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.tangerine,
    borderWidth: 2,
    borderColor: colors.paper,
  },
});
