import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button, Card, Divider, Input, ListRow, Text } from '@/components/ds';
import { space } from '@/theme/tokens';

import { findCountry, searchCountries } from '../places';

export type CountryFieldProps = {
  value: string | null;
  onChange: (alpha2: string | null) => void;
  label: string;
  error?: string;
};

/** Type to search; shows up to 8 matches. Selected country shows as a row with "Change". */
export function CountryField({ value, onChange, label, error }: CountryFieldProps) {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const selected = findCountry(value);

  if (selected) {
    return (
      <View style={styles.wrap}>
        <Text variant="label" color="muted">
          {label}
        </Text>
        <Card flush>
          <ListRow
            title={selected.name}
            meta={selected.alpha3}
            accessibilityLabel={t('onboarding.origin.selected', { name: selected.name })}
            right={
              <Button
                label={t('onboarding.origin.change')}
                variant="secondary"
                onPress={() => {
                  onChange(null);
                  setQuery('');
                }}
              />
            }
          />
        </Card>
      </View>
    );
  }

  const results = searchCountries(query);
  return (
    <View style={styles.wrap}>
      <Input
        label={label}
        value={query}
        onChangeText={setQuery}
        placeholder={t('onboarding.origin.searchPlaceholder')}
        autoCorrect={false}
        autoCapitalize="words"
        error={error}
        accessibilityHint={t('onboarding.origin.search')}
      />
      {query.trim().length > 0 &&
        (results.length ? (
          <Card flush>
            {results.map((c, i) => (
              <View key={c.alpha2}>
                {i > 0 && <Divider />}
                <ListRow title={c.name} meta={c.alpha3} onPress={() => onChange(c.alpha2)} />
              </View>
            ))}
          </Card>
        ) : (
          <Text variant="meta" color="muted">
            {t('onboarding.origin.noResults')}
          </Text>
        ))}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space[2] },
});
