import { ActivityIndicator, Pressable, StyleSheet, View, type PressableProps } from 'react-native';

import { colors, fonts, radius, space, touchTarget, type ColorName } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type ButtonVariant = 'primary' | 'secondary' | 'dark' | 'onNavy';

export type ButtonProps = Omit<PressableProps, 'children' | 'style'> & {
  label: string;
  /**
   * primary: tangerine, the one main action. secondary: navy outline, supporting actions.
   * dark: solid navy, create actions in headers. onNavy: outline for navy surfaces.
   */
  variant?: ButtonVariant;
  size?: 'md' | 'lg';
  icon?: IconName;
  iconPosition?: 'start' | 'end';
  loading?: boolean;
  fullWidth?: boolean;
};

const variantStyles: Record<
  ButtonVariant,
  { bg: ColorName | null; border: ColorName | null; ink: ColorName }
> = {
  primary: { bg: 'tangerine', border: null, ink: 'navy' },
  secondary: { bg: 'card', border: 'navy', ink: 'navy' },
  dark: { bg: 'navy', border: null, ink: 'onNavy' },
  onNavy: { bg: null, border: 'onNavy', ink: 'onNavy' },
};

/** Pill button. Never rotated. */
export function Button({
  label,
  variant = 'primary',
  size = 'md',
  icon,
  iconPosition = 'start',
  loading = false,
  fullWidth = false,
  disabled,
  ...rest
}: ButtonProps) {
  const v = variantStyles[variant];
  const isDisabled = disabled || loading;
  const iconEl = icon ? <Icon name={icon} size={20} color={v.ink} /> : null;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: !!isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        size === 'lg' ? styles.lg : styles.md,
        {
          backgroundColor: v.bg ? colors[v.bg] : 'transparent',
          borderColor: v.border ? colors[v.border] : 'transparent',
          borderWidth: v.border ? 2 : 0,
        },
        fullWidth && styles.fullWidth,
        pressed && styles.pressed,
        isDisabled && styles.disabled,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator color={colors[v.ink]} />
      ) : (
        <View style={styles.content}>
          {iconPosition === 'start' && iconEl}
          <Text
            variant="body"
            color={v.ink}
            style={[styles.label, size === 'lg' && styles.labelLg]}
            numberOfLines={1}
          >
            {label}
          </Text>
          {iconPosition === 'end' && iconEl}
        </View>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    minHeight: touchTarget,
    borderRadius: radius.pill,
    paddingHorizontal: space[5],
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'flex-start',
  },
  md: { height: 48 },
  lg: { height: 56, paddingHorizontal: space[6] },
  fullWidth: { alignSelf: 'stretch' },
  content: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  label: { fontFamily: fonts.sans900, fontSize: 16, lineHeight: 20 },
  labelLg: { fontSize: 18, lineHeight: 22 },
  pressed: { opacity: 0.85 },
  disabled: { opacity: 0.5 },
});
