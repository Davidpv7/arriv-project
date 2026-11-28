import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { ChoiceList, DateField, type ChoiceOption } from '@/components/ds';
import {
  answers,
  NEW_STAMP_STEPS,
  stepErrors,
  suggestionKey,
  useNewStamp,
} from '@/features/journey/newStampStore';
import { StepLayout } from '@/features/shared/StepLayout';
import type { FormStatus } from '@/features/journey/rules';
import { useErrorText } from '@/i18n/useErrorText';

/**
 * Step 2: has it happened (a stamp, with its date), is it coming up (a due date),
 * or, for a visa, is it lodged and waiting (the lodged date)?
 */
export default function StampWhenStep() {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const stamp = useNewStamp();
  const [errors, setErrors] = useState<Record<string, string | undefined>>({});
  const visa = stamp.kind === 'visa';
  // "Still waiting" is only for visas; drop it if they went back and changed the kind.
  const status: FormStatus = !visa && stamp.status === 'waiting' ? 'done' : stamp.status;
  const dateParts = { day: t('date.day'), month: t('date.month'), year: t('date.year') };

  const next = () => {
    if (status !== stamp.status) stamp.set({ status });
    const values = { ...answers(stamp), status };
    const fields =
      status === 'done'
        ? (['happenedOn', 'lodgedOn'] as const)
        : status === 'waiting'
          ? (['lodgedOn'] as const)
          : (['dueOn'] as const);
    const found = stepErrors(values, [...fields]);
    if (Object.keys(found).length > 0) return setErrors(found);
    // Suggest a title for the kind (e.g. "Visa granted") unless they already wrote one.
    const suggestions = (['done', 'upcoming', 'waiting'] as const).flatMap((st) => {
      const key = suggestionKey(stamp.kind, st);
      return key ? [t(key)] : [];
    });
    if (!stamp.title.trim() || suggestions.includes(stamp.title)) {
      const key = suggestionKey(stamp.kind, status);
      stamp.set({ title: key ? t(key) : '' });
    }
    router.push('/new-stamp/details');
  };

  const options: ChoiceOption<FormStatus>[] = [
    {
      value: 'done',
      label: t(visa ? 'journey.wizard.when.granted' : 'journey.wizard.when.done'),
      description: t('journey.wizard.when.doneHint'),
      icon: 'check',
    },
    ...(visa
      ? [
          {
            value: 'waiting' as const,
            label: t('journey.wizard.when.waiting'),
            description: t('journey.wizard.when.waitingHint'),
            icon: 'send' as const,
          },
        ]
      : []),
    {
      value: 'upcoming',
      label: t(visa ? 'journey.wizard.when.visaUpcoming' : 'journey.wizard.when.upcoming'),
      description: t('journey.wizard.when.upcomingHint'),
      icon: 'calendar',
    },
  ];
  const lodgedField = (hint?: string) => (
    <DateField
      key="lodged"
      label={t(status === 'waiting' ? 'journey.form.lodgedOn' : 'journey.form.lodgedOnOptional')}
      value={stamp.lodgedOn}
      onChange={(v) => {
        setErrors({});
        stamp.set({ lodgedOn: v });
      }}
      parts={dateParts}
      hint={hint}
      error={errorText(errors.lodgedOn)}
    />
  );

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
        value={status}
        onChange={(status) => {
          setErrors({});
          stamp.set({ status });
        }}
        options={options}
      />
      {status === 'waiting' ? (
        lodgedField()
      ) : status === 'done' ? (
        <>
          <DateField
            key="happened"
            label={t(visa ? 'journey.form.grantedOn' : 'journey.form.happenedOn')}
            value={stamp.happenedOn}
            onChange={(v) => {
              setErrors({});
              stamp.set({ happenedOn: v });
            }}
            parts={dateParts}
            error={errorText(errors.happenedOn)}
          />
          {visa && lodgedField(t('journey.form.lodgedHint'))}
        </>
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
