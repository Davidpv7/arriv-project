import { StyleSheet, Switch, View } from 'react-native';

import { colors, fonts, space, touchTarget } from '@/theme/tokens';

import { Text } from './Text';

export type SwitchRowProps = {
  label: string;
  description?: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
};

// react-native-web colours the knob with its own prop when on (default teal-ish).
const webThumb = { activeThumbColor: colors.card } as object;

/** A setting that's on or off: label (and description) on the left, a switch on the right. */
export function SwitchRow({ label, description, value, onValueChange, disabled }: SwitchRowProps) {
  return (
    <View style={styles.row}>
      <View style={styles.text}>
        <Text variant="body" style={styles.label}>
          {label}
        </Text>
        {description ? (
          <Text variant="meta" color="muted">
            {description}
          </Text>
        ) : null}
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        accessibilityLabel={label}
        accessibilityHint={description}
        trackColor={{ false: colors.rule, true: colors.tangerine }}
        thumbColor={colors.card}
        ios_backgroundColor={colors.rule}
        {...webThumb}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: touchTarget + 12,
    paddingHorizontal: space[4],
    paddingVertical: space[2],
  },
  text: { flex: 1, gap: 2 },
  label: { fontFamily: fonts.sans700 },
});
