import { StyleSheet, View } from 'react-native';

import { colors, radius, space } from '@/theme/tokens';

const HEIGHT = 72;

type Props = {
  /** Grants per week, oldest first. */
  weeks: number[];
  accessibilityLabel: string;
};

/** A small bar chart of grants per week. Empty weeks show as a hairline. */
export function WeeklyGrants({ weeks, accessibilityLabel }: Props) {
  const max = Math.max(1, ...weeks);
  return (
    <View
      style={styles.chart}
      accessible
      accessibilityRole="image"
      accessibilityLabel={accessibilityLabel}
    >
      {weeks.map((n, i) => (
        <View key={i} style={styles.slot}>
          <View
            style={[
              styles.bar,
              n === 0
                ? styles.empty
                : { height: Math.max(6, (n / max) * HEIGHT), backgroundColor: colors.tangerine },
            ]}
          />
        </View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  chart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: space[1],
    height: HEIGHT,
    borderBottomWidth: 1,
    borderBottomColor: colors.rule,
  },
  slot: { flex: 1, justifyContent: 'flex-end' },
  bar: { borderTopLeftRadius: radius.stamp / 2, borderTopRightRadius: radius.stamp / 2 },
  empty: { height: 2, backgroundColor: colors.rule },
});
