import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Chip, Input, Text } from '@/components/ds';
import { space } from '@/theme/tokens';

import { CITIES } from '../places';

export type CityFieldProps = {
  value: string;
  onChange: (city: string) => void;
  label?: string;
  error?: string;
};

/** Major cities as chips, plus "Somewhere else" with a free-text field. */
export function CityField({ value, onChange, label, error }: CityFieldProps) {
  const { t } = useTranslation();
  const isListed = CITIES.some((c) => c.name === value);
  const [other, setOther] = useState(!isListed && value.length > 0);

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="label" color="muted">
          {label}
        </Text>
      ) : null}
      <View style={styles.chips} accessibilityRole="radiogroup">
        {CITIES.map((c) => (
          <Chip
            key={c.code}
            label={c.name}
            selected={!other && value === c.name}
            onPress={() => {
              setOther(false);
              onChange(c.name);
            }}
          />
        ))}
        <Chip
          label={t('onboarding.city.other')}
          selected={other}
          onPress={() => {
            setOther(true);
            if (isListed) onChange('');
          }}
        />
      </View>
      {other && (
        <Input
          label={t('onboarding.city.otherLabel')}
          value={value}
          onChangeText={onChange}
          placeholder={t('onboarding.city.otherPlaceholder')}
          maxLength={60}
          error={error}
          autoFocus
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[3] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
});
