import { useTranslation } from 'react-i18next';

import { StepLayout } from '@/features/onboarding/StepLayout';
import { useOnboarding } from '@/features/onboarding/store';
import { useSaveProfile } from '@/features/profile/api';
import { CityField } from '@/features/profile/components/CityField';

/** Last step: saves everything and sets onboarded_at, which moves the app to Home. */
export default function CityStep() {
  const { t } = useTranslation();
  const state = useOnboarding();
  const save = useSaveProfile();
  const city = state.city.trim();

  const finish = () =>
    save.mutate(
      {
        visa: {
          visa_subclass: state.visaSubclass || null,
          visa_label: state.visaLabel.trim() || null,
          visibility: state.visibility,
        },
        profile: {
          origin_country: state.origin,
          arrived_on: state.arrivedOn,
          city,
          onboarded_at: new Date().toISOString(),
        },
      },
      { onSuccess: () => state.reset() },
    );

  return (
    <StepLayout
      step={4}
      title={t('onboarding.city.title')}
      body={t('onboarding.city.body')}
      primary={{
        label: t('onboarding.finish'),
        disabled: !city || !state.origin || !state.arrivedOn,
        loading: save.isPending,
        onPress: finish,
      }}
      error={save.error ? t('common.error') : undefined}
    >
      <CityField value={state.city} onChange={(c) => state.set({ city: c })} />
    </StepLayout>
  );
}
