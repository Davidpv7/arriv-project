import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ChoiceList, DateField } from '@/components/ds';
import {
  answers,
  NEW_STAMP_STEPS,
  stepErrors,
  suggestionKey,
  useNewStamp,
} from '@/features/journey/newStampStore';
import { StepLayout } from '@/features/shared/StepLayout';
import { useErrorText } from '@/i18n/useErrorText';

/** Step 2: has it happened (a stamp, with its date) or is it coming up (a due date)? */
export default function StampWhenStep() {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const stamp = useNewStamp();
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const done = stamp.status === 'done';
  const dateParts = { day: t('date.day'), month: t('date.month'), year: t('date.year') };

  const next = () => {
    const found = stepErrors(answers(stamp), done ? ['happenedOn'] : ['dueOn']);
    if (Object.keys(found).length > 0) return setErrors(found);
    // Suggest a title for the kind (e.g. "Visa granted") unless they already wrote one.
    const suggestions = (['done', 'upcoming'] as const).flatMap((st) => {
      const key = suggestionKey(stamp.kind, st);
      return key ? [t(key)] : [];
    });
    if (!stamp.title.trim() || suggestions.includes(stamp.title)) {
      const key = suggestionKey(stamp.kind, stamp.status);
      stamp.set({ title: key ? t(key) : '' });
    }
    router.push('/new-stamp/details');
  };

  return (
    <StepLayout
      step={2}
      total={NEW_STAMP_STEPS}
      title={t('journey.wizard.when.title')}
      body={t('journey.wizard.when.body')}
      primary={{ label: t('common.continue'), onPress: next }}
    >
      <ChoiceList
        accessibilityLabel={t('journey.wizard.when.title')}
        value={stamp.status}
        onChange={(status) => {
          setErrors({});
          stamp.set({ status });
        }}
        options={[
          {
            value: 'done',
            label: t('journey.wizard.when.done'),
            description: t('journey.wizard.when.doneHint'),
            icon: 'check',
          },
          {
            value: 'upcoming',
            label: t('journey.wizard.when.upcoming'),
            description: t('journey.wizard.when.upcomingHint'),
            icon: 'calendar',
          },
        ]}
      />
      {done ? (
        <DateField
          key="happened"
          label={t('journey.form.happenedOn')}
          value={stamp.happenedOn}
          onChange={(v) => {
            setErrors({});
            stamp.set({ happenedOn: v });
          }}
          parts={dateParts}
          error={errorText(errors.happenedOn)}
        />
      ) : (
        <DateField
          key="due"
          label={t('journey.form.dueOn')}
          value={stamp.dueOn}
          onChange={(v) => {
            setErrors({});
            stamp.set({ dueOn: v });
          }}
          parts={dateParts}
          error={errorText(errors.dueOn)}
        />
      )}
    </StepLayout>
  );
}
