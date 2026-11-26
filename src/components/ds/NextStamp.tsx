import { Pressable, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors, rotate } from '@/theme/tokens';

import { Icon } from './Icon';
import { Text } from './Text';

export type NextStampProps = {
  /** e.g. "Next stamp?" */
  label: string;
  onPress: () => void;
  size?: number;
  accessibilityLabel?: string;
};

/** The empty slot on a passport page: a dashed circle that adds the next stamp. */
export function NextStamp({ label, onPress, size = 110, accessibilityLabel }: NextStampProps) {
  const r = size / 2;
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.wrap,
        { width: size, height: size, transform: rotate('md', -1) },
        pressed && styles.pressed,
      ]}
    >
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle
          cx={r}
          cy={r}
          r={r - 1.5}
          stroke={colors.perforation}
          strokeWidth={2}
          strokeDasharray="6 5"
          fill="none"
        />
      </Svg>
      <Icon name="plus" size={22} color="muted" />
      <Text variant="label" color="muted" align="center">
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', gap: 2, padding: 12 },
  pressed: { opacity: 0.7 },
});
