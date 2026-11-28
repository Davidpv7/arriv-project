import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Input } from '@/components/ds';
import { savedPath } from '@/features/journey/afterSave';
import { useSaveMilestone } from '@/features/journey/api';
import { StampPreview } from '@/features/journey/components/StampPreview';
import { answers, NEW_STAMP_STEPS, useNewStamp } from '@/features/journey/newStampStore';
import { milestoneFormSchema, NOTES_MAX } from '@/features/journey/rules';
import { StepLayout } from '@/features/shared/StepLayout';
import { registerForPush } from '@/lib/notifications';

/** Last step: optional private notes, then save and open the new milestone. */
export default function StampNotesStep() {
  const { t } = useTranslation();
  const stamp = useNewStamp();
  const save = useSaveMilestone();
  const [error, setError] = useState<string>();

  const submit = () => {
    const parsed = milestoneFormSchema.safeParse(answers(stamp));
    if (!parsed.success) return setError(t('common.error'));
    const values = parsed.data;
    save.mutate(
      { values },
      {
        onSuccess: async (id) => {
          // Ask for notification permission in context: right after setting a reminder.
          if (values.status === 'upcoming' && values.remindOn) await registerForPush({ ask: true });
          stamp.reset();
          // Replace the wizard with the new milestone; Back goes to the Journey page.
          router.dismissTo('/journey');
          router.push(savedPath(id, values));
        },
        onError: () => setError(t('common.error')),
      },
    );
  };

  return (
    <StepLayout
      step={5}
      total={NEW_STAMP_STEPS}
      title={t('journey.wizard.notes.title')}
      body={t('journey.wizard.notes.body')}
      primary={{ label: t('journey.form.save'), loading: save.isPending, onPress: submit }}
      error={error}
    >
      <StampPreview />
      <Input
        label={t('journey.form.notes')}
        value={stamp.notes}
        onChangeText={(notes) => stamp.set({ notes })}
        multiline
        maxLength={NOTES_MAX}
        hint={t('journey.form.notesHint')}
      />
    </StepLayout>
  );
}
