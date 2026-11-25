import { useRef, useState, type ComponentRef } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';

import { colors, fonts, radius, space, touchTarget } from '@/theme/tokens';

import { Text } from './Text';

export type DateFieldProps = {
  label: string;
  /** ISO date (YYYY-MM-DD) or null. */
  value: string | null;
  /** Called with an ISO date once all three parts are filled, or null while incomplete. */
  onChange: (value: string | null) => void;
  /** Screen-reader labels and placeholders for the three parts. */
  parts: { day: string; month: string; year: string };
  error?: string;
  hint?: string;
};

const split = (v: string | null) => {
  const [y = '', m = '', d = ''] = v?.split('-') ?? [];
  return { d, m, y };
};

/**
 * Date as three short number fields (DD / MM / YYYY). Works the same on iOS,
 * Android and web, with no native picker. Validation lives in the form schema.
 */
export function DateField({ label, value, onChange, parts, error, hint }: DateFieldProps) {
  const [state, setState] = useState(() => split(value));
  const monthRef = useRef<ComponentRef<typeof TextInput>>(null);
  const yearRef = useRef<ComponentRef<typeof TextInput>>(null);

  // Follow a new date coming from outside (e.g. form defaults). While the person is
  // typing, `value` is null for an incomplete date, so their partial input is kept.
  const [prevValue, setPrevValue] = useState(value);
  if (value !== prevValue) {
    setPrevValue(value);
    if (value !== null) setState(split(value));
  }

  const update = (patch: Partial<typeof state>) => {
    const next = { ...state, ...patch };
    setState(next);
    if (next.d.length && next.m.length && next.y.length === 4) {
      onChange(`${next.y}-${next.m.padStart(2, '0')}-${next.d.padStart(2, '0')}`);
    } else {
      onChange(null);
    }
  };

  const digits = (v: string, max: number) => v.replace(/\D/g, '').slice(0, max);
  const border = { borderColor: error ? colors.rust : colors.rule };

  return (
    <View style={styles.wrap}>
      <Text variant="label" color="muted">
        {label}
      </Text>
      <View style={styles.row}>
        <TextInput
          value={state.d}
          onChangeText={(v) => {
            const d = digits(v, 2);
            update({ d });
            if (d.length === 2) monthRef.current?.focus();
          }}
          placeholder={parts.day}
          accessibilityLabel={`${label}, ${parts.day}`}
          keyboardType="number-pad"
          placeholderTextColor={colors.muted}
          style={[styles.field, styles.short, border]}
          maxLength={2}
        />
        <TextInput
          ref={monthRef}
          value={state.m}
          onChangeText={(v) => {
            const m = digits(v, 2);
            update({ m });
            if (m.length === 2) yearRef.current?.focus();
          }}
          placeholder={parts.month}
          accessibilityLabel={`${label}, ${parts.month}`}
          keyboardType="number-pad"
          placeholderTextColor={colors.muted}
          style={[styles.field, styles.short, border]}
          maxLength={2}
        />
        <TextInput
          ref={yearRef}
          value={state.y}
          onChangeText={(v) => update({ y: digits(v, 4) })}
          placeholder={parts.year}
          accessibilityLabel={`${label}, ${parts.year}`}
          keyboardType="number-pad"
          placeholderTextColor={colors.muted}
          style={[styles.field, styles.long, border]}
          maxLength={4}
        />
      </View>
      {error ? (
        <Text variant="meta" color="rust" accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="meta" color="muted">
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[1] + 2 },
  row: { flexDirection: 'row', gap: space[2] },
  field: {
    minHeight: touchTarget + 4,
    borderRadius: radius.pill,
    borderWidth: 2,
    backgroundColor: colors.card,
    color: colors.navy,
    fontFamily: fonts.sans800,
    fontSize: 17,
    textAlign: 'center',
  },
  short: { width: 72 },
  long: { width: 104 },
});
