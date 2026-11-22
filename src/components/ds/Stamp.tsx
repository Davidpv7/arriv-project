import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';

import { colors, fonts, radius, rotate, type FillColor, type Tilt } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type StampProps = {
  /** Small: community initials. Large: a one-word shortcut label (with an icon). */
  label: string;
  size?: 'sm' | 'lg';
  fill?: FillColor;
  icon?: IconName;
  tilt?: Tilt;
  /** Alternate across a row so it looks hand-placed. */
  direction?: 1 | -1;
  /** Makes the stamp a link/button (shortcuts). */
  onPress?: () => void;
  accessibilityLabel?: string;
};

const SIZES = { sm: { width: 50, height: 58 }, lg: { width: 104, height: 80 } } as const;
const BORDER = 3;

/** Perforated postage stamp: dotted navy border, navy content. */
export function Stamp({
  label,
  size = 'sm',
  fill = 'tangerine',
  icon,
  tilt = 'sm',
  direction = 1,
  onPress,
  accessibilityLabel,
}: StampProps) {
  const { width, height } = SIZES[size];

  const body = (
    <View
      style={[
        styles.body,
        { width, height, backgroundColor: colors[fill], transform: rotate(tilt, direction) },
      ]}
    >
      <Svg width={width} height={height} style={StyleSheet.absoluteFill}>
        <Rect
          x={BORDER / 2}
          y={BORDER / 2}
          width={width - BORDER}
          height={height - BORDER}
          rx={radius.stamp - BORDER / 2}
          fill="none"
          stroke={colors.navy}
          strokeWidth={BORDER}
          strokeDasharray="0.01 6"
          strokeLinecap="round"
        />
      </Svg>
      {icon && <Icon name={icon} />}
      <Text
        style={{ fontFamily: fonts.sans900, fontSize: size === 'sm' ? 14 : 15, lineHeight: 18 }}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );

  if (!onPress) {
    return (
      <View accessible accessibilityLabel={accessibilityLabel ?? label} accessibilityRole="image">
        {body}
      </View>
    );
  }

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => pressed && styles.pressed}
    >
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  body: {
    borderRadius: radius.stamp,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  pressed: { opacity: 0.85 },
});
