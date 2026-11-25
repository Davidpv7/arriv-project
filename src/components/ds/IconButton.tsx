import { Pressable, StyleSheet } from 'react-native';

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
};

/** 44×44 icon-only button. */
export function IconButton({
  icon,
  accessibilityLabel,
  onPress,
  color = 'navy',
  filled = false,
  disabled,
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
});
