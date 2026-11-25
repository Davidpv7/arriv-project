import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ONBOARDING_STEPS, useOnboarding } from '@/features/onboarding/store';
import { StepLayout } from '@/features/shared/StepLayout';
import { VisaFields } from '@/features/profile/components/VisaFields';
import { visaSchema } from '@/features/profile/schemas';
import { useErrorText } from '@/i18n/useErrorText';

export default function VisaStep() {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const { visaSubclass, visaLabel, visibility, set } = useOnboarding();
  const [errors, setErrors] = useState<{ subclass?: string; label?: string }>({});

  const next = () => {
    const parsed = visaSchema.safeParse({ subclass: visaSubclass, label: visaLabel, visibility });
    if (!parsed.success) {
      const fieldErrors = parsed.error.flatten().fieldErrors;
      setErrors({ subclass: fieldErrors.subclass?.[0], label: fieldErrors.label?.[0] });
      return;
    }
    router.push('/city');
  };

  return (
    <StepLayout
      total={ONBOARDING_STEPS}
      step={3}
      title={t('onboarding.visa.title')}
      body={t('onboarding.visa.body')}
      primary={{ label: t('common.continue'), onPress: next }}
      onSkip={() => {
        set({ visaSubclass: '', visaLabel: '' });
        router.push('/city');
      }}
    >
      <VisaFields
        subclass={visaSubclass}
        label={visaLabel}
        visibility={visibility}
        subclassError={errorText(errors.subclass)}
        labelError={errorText(errors.label)}
        onChange={(patch) => {
          setErrors({});
          set({
            ...(patch.subclass !== undefined && { visaSubclass: patch.subclass }),
            ...(patch.label !== undefined && { visaLabel: patch.label }),
            ...(patch.visibility && { visibility: patch.visibility }),
          });
        }}
      />
    </StepLayout>
  );
}
