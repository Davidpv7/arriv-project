import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { DateField } from '@/components/ds';
import {
  answers,
  NEW_STAMP_STEPS,
  stepErrors,
  useNewStamp,
} from '@/features/journey/newStampStore';
import { StepLayout } from '@/features/shared/StepLayout';
import { useErrorText } from '@/i18n/useErrorText';

/** Step 4 (coming up): an optional reminder, sent at 9am in their city. */
export default function StampRemindStep() {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const stamp = useNewStamp();
  const [error, setError] = useState<string>();

  const next = () => {
    const found = stepErrors(answers(stamp), ['remindOn']);
    if (found.remindOn) return setError(found.remindOn);
    router.push('/new-stamp/notes');
  };

  return (
    <StepLayout
      step={4}
      total={NEW_STAMP_STEPS}
      title={t('journey.wizard.remind.title')}
      body={t('journey.wizard.remind.body')}
      primary={{ label: t('common.continue'), onPress: next }}
      onSkip={() => {
        stamp.set({ remindOn: null });
        router.push('/new-stamp/notes');
      }}
    >
      <DateField
        label={t('journey.form.remindOn')}
        value={stamp.remindOn}
        onChange={(v) => {
          setError(undefined);
          stamp.set({ remindOn: v });
        }}
        parts={{ day: t('date.day'), month: t('date.month'), year: t('date.year') }}
        hint={t('journey.form.remindHint')}
        error={errorText(error)}
      />
    </StepLayout>
  );
}
