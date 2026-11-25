import { useState } from 'react';
import { StyleSheet, TextInput, View, type TextInputProps } from 'react-native';

import { colors, fonts, radius, space, touchTarget } from '@/theme/tokens';

import { Text } from './Text';

export type InputProps = TextInputProps & {
  label: string;
  hint?: string;
  error?: string;
};

/** Text field: DM Mono label above, card fill, pill radius. Never rotated. */
export function Input({
  label,
  hint,
  error,
  style,
  onFocus,
  onBlur,
  multiline,
  ...rest
}: InputProps) {
  const [focused, setFocused] = useState(false);
  const borderColor = error ? colors.rust : focused ? colors.navy : colors.rule;

  return (
    <View style={styles.wrap}>
      <Text
        variant="label"
        color="muted"
        nativeID={rest.nativeID ? `${rest.nativeID}-label` : undefined}
      >
        {label}
      </Text>
      <TextInput
        accessibilityLabel={label}
        accessibilityHint={hint}
        placeholderTextColor={colors.muted}
        multiline={multiline}
        style={[styles.field, multiline && styles.multiline, { borderColor }, style]}
        onFocus={(e) => {
          setFocused(true);
          onFocus?.(e);
        }}
        onBlur={(e) => {
          setFocused(false);
          onBlur?.(e);
        }}
        {...rest}
      />
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
  wrap: { gap: space[1] + 2, alignSelf: 'stretch' },
  field: {
    minHeight: touchTarget + 4,
    borderRadius: radius.pill,
    borderWidth: 2,
    backgroundColor: colors.card,
    paddingHorizontal: space[4] + 2,
    color: colors.navy,
    fontFamily: fonts.sans600,
    fontSize: 15,
  },
  multiline: {
    borderRadius: radius.ticket,
    paddingVertical: space[3],
    minHeight: 96,
    textAlignVertical: 'top',
  },
});
