import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ChoiceList, type IconName } from '@/components/ds';
import { StampPreview } from '@/features/journey/components/StampPreview';
import { NEW_STAMP_STEPS, useNewStamp } from '@/features/journey/newStampStore';
import { MILESTONE_KINDS, type MilestoneKind } from '@/features/journey/rules';
import { StepLayout } from '@/features/shared/StepLayout';

const ICONS: Record<MilestoneKind, IconName> = {
  visa: 'document',
  arrival: 'plane',
  education: 'edit',
  work: 'communities',
  home: 'home',
  pr: 'check',
  citizenship: 'globe',
  other: 'heart',
};

/** Step 1: what kind of milestone (sets the stamp's style). */
export default function StampKindStep() {
  const { t } = useTranslation();
  const { kind, set } = useNewStamp();

  return (
    <StepLayout
      step={1}
      total={NEW_STAMP_STEPS}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/journey'))}
      title={t('journey.wizard.kind.title')}
      body={t('journey.wizard.kind.body')}
      primary={{ label: t('common.continue'), onPress: () => router.push('/new-stamp/when') }}
    >
      <StampPreview />
      <ChoiceList
        accessibilityLabel={t('journey.wizard.kind.title')}
        value={kind}
        onChange={(k) => set({ kind: k })}
        options={MILESTONE_KINDS.map((k) => ({
          value: k,
          label: t(`journey.kinds.${k}`),
          description: t(`journey.wizard.kind.${k}`),
          icon: ICONS[k],
        }))}
      />
    </StepLayout>
  );
}
