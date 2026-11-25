import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DateField } from '@/components/ds';
import { StepLayout } from '@/features/onboarding/StepLayout';
import { useOnboarding } from '@/features/onboarding/store';
import { arrivalSchema } from '@/features/profile/schemas';
import { useErrorText } from '@/i18n/useErrorText';

export default function ArrivalStep() {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const arrivedOn = useOnboarding((s) => s.arrivedOn);
  const set = useOnboarding((s) => s.set);
  const [error, setError] = useState<string>();

  const next = () => {
    const parsed = arrivalSchema.safeParse(arrivedOn ?? '');
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message);
      return;
    }
    router.push('/visa');
  };

  return (
    <StepLayout
      step={2}
      title={t('onboarding.arrival.title')}
      body={t('onboarding.arrival.body')}
      primary={{ label: t('common.continue'), disabled: !arrivedOn, onPress: next }}
    >
      <DateField
        label={t('onboarding.arrival.label')}
        value={arrivedOn}
        onChange={(v) => {
          setError(undefined);
          set({ arrivedOn: v });
        }}
        parts={{ day: t('date.day'), month: t('date.month'), year: t('date.year') }}
        error={errorText(error)}
      />
    </StepLayout>
  );
}
