import { Image } from 'expo-image';
import { Pressable, StyleSheet, View } from 'react-native';

import { colors, radius, space } from '@/theme/tokens';

import { Icon } from './Icon';

export type Photo = { id: string; uri: string };

export type PhotoGridProps = {
  photos: Photo[];
  /** Accessible label per photo, e.g. "Photo 1 of 3". */
  labelFor: (index: number, total: number) => string;
  /** Composer: shows a remove button on each photo. */
  onRemove?: (index: number) => void;
  removeLabel?: (index: number) => string;
};

/** 1–4 photos: one wide, two side by side, or a 2×2 grid. Straight, never tilted. */
export function PhotoGrid({ photos, labelFor, onRemove, removeLabel }: PhotoGridProps) {
  if (photos.length === 0) return null;
  const single = photos.length === 1;
  return (
    <View style={styles.grid}>
      {photos.map((p, i) => (
        <View
          key={p.id}
          style={[
            single ? styles.single : styles.cell,
            photos.length === 3 && i === 0 && styles.wide,
          ]}
        >
          <Image
            source={{ uri: p.uri }}
            style={styles.image}
            contentFit="cover"
            accessibilityLabel={labelFor(i, photos.length)}
            transition={150}
          />
          {onRemove && (
            <Pressable
              onPress={() => onRemove(i)}
              accessibilityRole="button"
              accessibilityLabel={removeLabel?.(i) ?? ''}
              hitSlop={6}
              style={styles.remove}
            >
              <Icon name="close" size={18} color="onNavy" />
            </Pressable>
          )}
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space[1] },
  single: { width: '100%', aspectRatio: 4 / 3 },
  cell: { width: '49%', flexGrow: 1, aspectRatio: 1 },
  wide: { width: '100%', aspectRatio: 2 },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: radius.stamp,
    backgroundColor: colors.rule,
  },
  remove: {
    position: 'absolute',
    top: space[2],
    right: space[2],
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.navy,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
