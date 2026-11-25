import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ONBOARDING_STEPS, useOnboarding } from '@/features/onboarding/store';
import { StepLayout } from '@/features/shared/StepLayout';
import { useSaveProfile } from '@/features/profile/api';
import { CityField } from '@/features/profile/components/CityField';

/**
 * Step 4: saves everything collected so far (without finishing onboarding), so the
 * next step can suggest crews from the saved city, visa and home country.
 */
export default function CityStep() {
  const { t } = useTranslation();
  const state = useOnboarding();
  const save = useSaveProfile();
  const city = state.city.trim();

  const next = () =>
    save.mutate(
      {
        visa: {
          visa_subclass: state.visaSubclass || null,
          visa_label: state.visaLabel.trim() || null,
          visibility: state.visibility,
        },
        profile: { origin_country: state.origin, arrived_on: state.arrivedOn, city },
      },
      { onSuccess: () => router.push('/crews') },
    );

  return (
    <StepLayout
      total={ONBOARDING_STEPS}
      step={4}
      title={t('onboarding.city.title')}
      body={t('onboarding.city.body')}
      primary={{
        label: t('common.continue'),
        disabled: !city || !state.origin || !state.arrivedOn,
        loading: save.isPending,
        onPress: next,
      }}
      error={save.error ? t('common.error') : undefined}
    >
      <CityField value={state.city} onChange={(c) => state.set({ city: c })} />
    </StepLayout>
  );
}
