import { StyleSheet, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';

import { colors, fonts, rotate } from '@/theme/tokens';

import { Text } from './Text';

export type PostmarkLine = {
  text: string;
  /** mono: DM Mono small words/dates. main: Nunito 900. big: large Nunito 900 (e.g. a subclass). */
  style?: 'mono' | 'main' | 'big';
};

export type PostmarkProps = {
  lines: PostmarkLine[];
  /** teal: positive or verified. rust: visa grants. */
  ink?: 'teal' | 'rust';
  size?: number;
  direction?: 1 | -1;
  /** Decorative by default (the same fact should be written nearby). */
  decorative?: boolean;
};

/** Round double-border postmark. No fill; always tilted by tilt-lg. Max one per card. */
export function Postmark({
  lines,
  ink = 'teal',
  size = 110,
  direction = 1,
  decorative = true,
}: PostmarkProps) {
  const color = colors[ink];
  const scale = size / 110;
  const r = size / 2;

  return (
    <View
      style={[styles.wrap, { width: size, height: size, transform: rotate('lg', direction) }]}
      accessible={!decorative}
      accessibilityLabel={decorative ? undefined : lines.map((l) => l.text).join(' ')}
      accessibilityElementsHidden={decorative}
      importantForAccessibility={decorative ? 'no-hide-descendants' : 'yes'}
    >
      <Svg width={size} height={size} style={StyleSheet.absoluteFill}>
        <Circle cx={r} cy={r} r={r - 0.75} stroke={color} strokeWidth={1.5} fill="none" />
        <Circle cx={r} cy={r} r={r - 3.75} stroke={color} strokeWidth={1.5} fill="none" />
      </Svg>
      {lines.map((line, i) => {
        const kind = line.style ?? 'main';
        const style =
          kind === 'mono'
            ? { fontFamily: fonts.mono500, fontSize: 10 * Math.max(scale, 0.8), letterSpacing: 1 }
            : kind === 'big'
              ? { fontFamily: fonts.sans900, fontSize: 30 * scale, lineHeight: 32 * scale }
              : { fontFamily: fonts.sans900, fontSize: 16 * scale, lineHeight: 17 * scale };
        return (
          <Text key={`${i}-${line.text}`} align="center" style={[{ color }, style]}>
            {kind === 'mono' ? line.text.toUpperCase() : line.text}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', padding: 10 },
});
