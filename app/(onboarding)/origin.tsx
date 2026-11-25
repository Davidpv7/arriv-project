import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { StepLayout } from '@/features/onboarding/StepLayout';
import { useOnboarding } from '@/features/onboarding/store';
import { CountryField } from '@/features/profile/components/CountryField';

export default function OriginStep() {
  const { t } = useTranslation();
  const origin = useOnboarding((s) => s.origin);
  const set = useOnboarding((s) => s.set);

  return (
    <StepLayout
      step={1}
      title={t('onboarding.origin.title')}
      body={t('onboarding.origin.body')}
      primary={{
        label: t('common.continue'),
        disabled: !origin,
        onPress: () => router.push('/arrival'),
      }}
    >
      <CountryField
        label={t('onboarding.origin.search')}
        value={origin}
        onChange={(origin) => set({ origin })}
      />
    </StepLayout>
  );
}
