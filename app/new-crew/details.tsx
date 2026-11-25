import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Chip, Input, Text } from '@/components/ds';
import { detailsError, NEW_CREW_STEPS, useNewCrew } from '@/features/communities/newCrewStore';
import { LANGUAGES } from '@/features/communities/schemas';
import { CityField } from '@/features/profile/components/CityField';
import { StepLayout } from '@/features/shared/StepLayout';
import { useErrorText } from '@/i18n/useErrorText';
import { space } from '@/theme/tokens';

/** Step 3 asks what the chosen kind needs: a city, a visa, a language, or just a gate. */
export default function CrewDetails() {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const crew = useNewCrew();
  const [error, setError] = useState<string>();
  const { kind } = crew;

  const copy = {
    city: ['cityTitle', 'cityBody'],
    visa: ['visaTitle', 'visaBody'],
    language: ['languageTitle', 'languageBody'],
    culture: ['placeTitle', 'placeBody'],
    interest: ['placeTitle', 'placeBody'],
  } as const;
  const [titleKey, bodyKey] = copy[kind];

  const next = () => {
    const e = detailsError(crew);
    if (e) return setError(e);
    router.push('/new-crew/about');
  };

  const optionalGate = (
    <View style={styles.group}>
      <Text variant="label" color="muted">
        {t('communities.wizard.details.gate')}
      </Text>
      <Chip
        label={t('communities.create.australiaWide')}
        selected={!crew.city}
        onPress={() => crew.set({ city: '' })}
      />
      <CityField value={crew.city} onChange={(city) => crew.set({ city })} />
      <Text variant="meta" color="muted">
        {t('communities.wizard.details.gateHint')}
      </Text>
    </View>
  );

  return (
    <StepLayout
      step={3}
      total={NEW_CREW_STEPS}
      title={t(`communities.wizard.details.${titleKey}`)}
      body={t(`communities.wizard.details.${bodyKey}`)}
      primary={{ label: t('common.continue'), onPress: next }}
      error={errorText(error)}
    >
      {kind === 'city' && (
        <CityField
          value={crew.city}
          onChange={(city) => {
            setError(undefined);
            crew.set({ city });
          }}
        />
      )}

      {kind === 'visa' && (
        <>
          <Input
            label={t('communities.create.visa')}
            value={crew.visaSubclass}
            onChangeText={(v) => {
              setError(undefined);
              crew.set({ visaSubclass: v.replace(/\D/g, '').slice(0, 3) });
            }}
            placeholder={t('onboarding.visa.subclassPlaceholder')}
            keyboardType="number-pad"
            maxLength={3}
          />
          {optionalGate}
        </>
      )}

      {kind === 'language' && (
        <>
          <View style={styles.chips} accessibilityRole="radiogroup">
            {LANGUAGES.map((l) => (
              <Chip
                key={l.code}
                label={l.name}
                selected={crew.language === l.code}
                onPress={() => {
                  setError(undefined);
                  crew.set({ language: l.code });
                }}
              />
            ))}
          </View>
          {optionalGate}
        </>
      )}

      {(kind === 'culture' || kind === 'interest') && optionalGate}
    </StepLayout>
  );
}

const styles = StyleSheet.create({
  group: { gap: space[2] },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2] },
});
