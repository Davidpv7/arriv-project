import { Image } from 'expo-image';
import { StyleSheet, View } from 'react-native';

import { colors, fonts, radius, type FillColor } from '@/theme/tokens';

import { Text } from './Text';

export type AvatarProps = {
  /** Shown when there is no image. One or two letters. */
  initials: string;
  uri?: string | null;
  size?: number;
  fill?: FillColor;
  /** Pass a label when the avatar is the only thing naming the person. */
  accessibilityLabel?: string;
};

export function Avatar({
  initials,
  uri,
  size = 40,
  fill = 'sunshine',
  accessibilityLabel,
}: AvatarProps) {
  const dims = { width: size, height: size, borderRadius: radius.pill };
  return (
    <View
      style={[styles.base, dims, { backgroundColor: colors[fill] }]}
      accessible={!!accessibilityLabel}
      accessibilityLabel={accessibilityLabel}
      accessibilityElementsHidden={!accessibilityLabel}
      importantForAccessibility={accessibilityLabel ? 'yes' : 'no-hide-descendants'}
    >
      {uri ? (
        <Image source={{ uri }} style={dims} contentFit="cover" />
      ) : (
        <Text style={{ fontFamily: fonts.sans900, fontSize: size * 0.4, lineHeight: size * 0.5 }}>
          {initials.slice(0, 2).toUpperCase()}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
