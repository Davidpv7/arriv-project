import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path, Polygon } from 'react-native-svg';

import { colors, fonts, rotate, space, type FillColor } from '@/theme/tokens';

import { Text } from './Text';

const TAG_W = 150;
const TAG_H = 128;
const CLIP = 18;
const FOOT_R = 14;

/** Tag outline: clipped top corners, rounded bottom corners. */
const tagPath = (w: number, h: number) =>
  [
    `M${CLIP} 0`,
    `H${w - CLIP}`,
    `L${w} ${CLIP}`,
    `V${h - FOOT_R}`,
    `Q${w} ${h} ${w - FOOT_R} ${h}`,
    `H${FOOT_R}`,
    `Q0 ${h} 0 ${h - FOOT_R}`,
    `V${CLIP}`,
    'Z',
  ].join(' ');

export type LuggageTagProps = {
  /** DM Mono code, e.g. "TAG 001". */
  code: string;
  name: string;
  /** e.g. "3 files" (from i18n). Tags show names and counts only, never previews. */
  countLabel: string;
  fill?: FillColor;
  direction?: 1 | -1;
  /** Colour behind the tag; the hole is punched in it. */
  background?: 'paper' | 'card';
  onPress?: () => void;
};

/** Backpack folder as a luggage tag. */
export function LuggageTag({
  code,
  name,
  countLabel,
  fill = 'tangerine',
  direction = 1,
  background = 'paper',
  onPress,
}: LuggageTagProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="link"
      accessibilityLabel={`${name}, ${countLabel}`}
      style={({ pressed }) => [
        styles.tag,
        { transform: rotate('sm', direction) },
        pressed && styles.pressed,
      ]}
    >
      <Svg width={TAG_W} height={TAG_H} style={StyleSheet.absoluteFill}>
        <Path d={tagPath(TAG_W, TAG_H)} fill={colors[fill]} />
      </Svg>
      <View style={[styles.hole, { backgroundColor: colors[background] }]} />
      <Text variant="label" style={styles.code}>
        {code}
      </Text>
      <View>
        <Text style={styles.name} numberOfLines={1}>
          {name}
        </Text>
        <Text variant="meta">{countLabel}</Text>
      </View>
    </Pressable>
  );
}

export type FileChipProps = {
  fileName: string;
  fill?: FillColor;
  direction?: 1 | -1;
  background?: 'paper' | 'card';
  onPress?: () => void;
  accessibilityLabel?: string;
};

const TIP = 14;

/** A file as a small sideways tag (chat attachments, receipts). Opens the file. */
export function FileChip({
  fileName,
  fill = 'sky',
  direction = -1,
  background = 'paper',
  onPress,
  accessibilityLabel,
}: FileChipProps) {
  const [size, setSize] = useState({ w: 0, h: 0 });
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? fileName}
      style={({ pressed }) => [
        styles.chipWrap,
        { transform: rotate('sm', direction) },
        pressed && styles.pressed,
      ]}
    >
      <View
        style={styles.chip}
        onLayout={(e) => setSize({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
      >
        {size.w > 0 && (
          <Svg width={size.w} height={size.h} style={StyleSheet.absoluteFill}>
            <Polygon
              points={`${TIP},0 ${size.w},0 ${size.w},${size.h} ${TIP},${size.h} 0,${size.h / 2}`}
              fill={colors[fill]}
            />
          </Svg>
        )}
        <View style={[styles.chipHole, { backgroundColor: colors[background] }]} />
        <Text variant="label" style={styles.chipText} numberOfLines={1}>
          {fileName}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tag: {
    width: TAG_W,
    height: TAG_H,
    paddingTop: 30,
    paddingHorizontal: 14,
    paddingBottom: space[3],
    justifyContent: 'space-between',
  },
  hole: {
    position: 'absolute',
    top: space[2],
    left: TAG_W / 2 - 8,
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  code: { letterSpacing: 0 },
  name: { fontFamily: fonts.sans900, fontSize: 18, lineHeight: 22 },
  chipWrap: { alignSelf: 'flex-start', minHeight: 44, justifyContent: 'center' },
  chip: {
    paddingVertical: space[2],
    paddingLeft: 26,
    paddingRight: space[3],
    justifyContent: 'center',
  },
  chipHole: {
    position: 'absolute',
    left: 12,
    top: '50%',
    marginTop: -4,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  chipText: { fontSize: 12, letterSpacing: 0, maxWidth: 220 },
  pressed: { opacity: 0.85 },
});
