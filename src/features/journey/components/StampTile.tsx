import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet } from 'react-native';

import { Postmark, Text } from '@/components/ds';
import { formatDay, stampInk, stampLines, type StampWithTitle } from '@/features/journey/rules';
import { space } from '@/theme/tokens';

type Props = {
  stamp: StampWithTitle;
  /** Alternates the tilt across a page so stamps look hand-placed. */
  index: number;
  size?: number;
  onPress?: () => void;
};

/** One passport stamp: the postmark, with its title written underneath (never rotated). */
export function StampTile({ stamp, index, size = 110, onPress }: Props) {
  const { t } = useTranslation();
  const kindLabel = t(`journey.kinds.${stamp.kind}`);
  const date = stamp.happened_on ? formatDay(stamp.happened_on) : '';
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      accessibilityRole={onPress ? 'link' : undefined}
      accessibilityLabel={t('journey.stampA11y', { title: stamp.title, kind: kindLabel, date })}
      style={({ pressed }) => [styles.tile, { width: size + space[4] }, pressed && styles.pressed]}
    >
      <Postmark
        lines={stampLines(stamp, kindLabel)}
        ink={stampInk(stamp.kind)}
        size={size}
        direction={index % 2 === 0 ? 1 : -1}
      />
      <Text variant="meta" align="center" numberOfLines={2}>
        {stamp.title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  tile: { alignItems: 'center', gap: space[2], minHeight: 44 },
  pressed: { opacity: 0.8 },
});
