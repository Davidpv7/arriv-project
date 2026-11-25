import { Pressable, StyleSheet, View } from 'react-native';

import { colors, fonts, radius, space, touchTarget } from '@/theme/tokens';

import { Icon, type IconName } from './Icon';
import { Text } from './Text';

export type ChipProps = {
  label: string;
  selected?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
};

/** Selectable pill (city, filters). Selected: tangerine fill, navy text. */
export function Chip({ label, selected = false, onPress, accessibilityLabel }: ChipProps) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="radio"
      accessibilityState={{ checked: selected }}
      accessibilityLabel={accessibilityLabel ?? label}
      style={({ pressed }) => [
        styles.chip,
        selected ? styles.chipOn : styles.chipOff,
        pressed && styles.pressed,
      ]}
    >
      <Text variant="meta">{label}</Text>
    </Pressable>
  );
}

export type ChoiceOption<T extends string> = {
  value: T;
  label: string;
  description?: string;
  icon?: IconName;
};

export type ChoiceListProps<T extends string> = {
  options: ChoiceOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel: string;
};

/** Vertical radio list with descriptions (e.g. who can see your visa). */
export function ChoiceList<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: ChoiceListProps<T>) {
  return (
    <View
      accessibilityRole="radiogroup"
      accessibilityLabel={accessibilityLabel}
      style={styles.list}
    >
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable
            key={o.value}
            onPress={() => onChange(o.value)}
            accessibilityRole="radio"
            accessibilityState={{ checked: on }}
            accessibilityLabel={o.description ? `${o.label}. ${o.description}` : o.label}
            style={({ pressed }) => [
              styles.option,
              on && styles.optionOn,
              pressed && styles.pressed,
            ]}
          >
            {o.icon && <Icon name={o.icon} />}
            <View style={styles.optionText}>
              <Text variant="body" style={styles.optionLabel}>
                {o.label}
              </Text>
              {o.description ? (
                <Text variant="meta" color="muted">
                  {o.description}
                </Text>
              ) : null}
            </View>
            <View style={[styles.radio, on && styles.radioOn]}>
              {on && <View style={styles.radioDot} />}
            </View>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    minHeight: touchTarget,
    paddingHorizontal: space[4],
    borderRadius: radius.pill,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipOn: { backgroundColor: colors.tangerine, borderColor: colors.tangerine },
  chipOff: { backgroundColor: colors.card, borderColor: colors.rule },
  list: { gap: space[2] },
  option: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: 64,
    padding: space[3],
    paddingHorizontal: space[4],
    borderRadius: radius.ticket,
    borderWidth: 2,
    borderColor: colors.rule,
    backgroundColor: colors.card,
  },
  optionOn: { borderColor: colors.navy },
  optionText: { flex: 1, gap: 2 },
  optionLabel: { fontFamily: fonts.sans800 },
  radio: {
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: colors.muted,
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioOn: { borderColor: colors.navy },
  radioDot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.tangerine },
  pressed: { opacity: 0.85 },
});
