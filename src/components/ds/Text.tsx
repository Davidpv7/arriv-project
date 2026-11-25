import { Text as RNText, type TextProps as RNTextProps } from 'react-native';

import { colors, typography, type ColorName, type TypographyVariant } from '@/theme/tokens';

export type TextProps = RNTextProps & {
  variant?: TypographyVariant;
  color?: ColorName;
  align?: 'left' | 'center' | 'right';
};

/** All readable text in Arriv. Nunito for reading, DM Mono (`label`, `labelLg`) for travel labels. */
export function Text({ variant = 'body', color = 'navy', align, style, ...rest }: TextProps) {
  return (
    <RNText
      style={[typography[variant], { color: colors[color] }, align && { textAlign: align }, style]}
      {...rest}
    />
  );
}
