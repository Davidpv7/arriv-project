import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ChoiceList } from '@/components/ds';
import { StampPreview } from '@/features/journey/components/StampPreview';
import { NEW_STAMP_STEPS, useNewStamp } from '@/features/journey/newStampStore';
import { StepLayout } from '@/features/shared/StepLayout';

/** Step 4 (done): who can see the stamp on the profile. */
export default function StampVisibilityStep() {
  const { t } = useTranslation();
  const { visibility, set } = useNewStamp();

  return (
    <StepLayout
      step={4}
      total={NEW_STAMP_STEPS}
      title={t('journey.wizard.visibility.title')}
      body={t('journey.wizard.visibility.body')}
      primary={{ label: t('common.continue'), onPress: () => router.push('/new-stamp/notes') }}
    >
      <StampPreview />
      <ChoiceList
        accessibilityLabel={t('journey.wizard.visibility.title')}
        value={visibility}
        onChange={(v) => set({ visibility: v })}
        options={(['private', 'connections', 'public'] as const).map((v) => ({
          value: v,
          label: t(`journey.visibility.${v}`),
          description: t(`journey.wizard.visibility.${v}`),
          icon: v === 'private' ? 'lock' : v === 'connections' ? 'communities' : 'globe',
        }))}
      />
    </StepLayout>
  );
}
