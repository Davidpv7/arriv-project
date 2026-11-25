import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { ChoiceList, type IconName } from '@/components/ds';
import { NEW_CREW_STEPS, useNewCrew, type CrewKind } from '@/features/communities/newCrewStore';
import { communityKinds } from '@/features/communities/schemas';
import { StepLayout } from '@/features/shared/StepLayout';

const ICONS: Record<CrewKind, IconName> = {
  city: 'home',
  visa: 'document',
  language: 'chat',
  culture: 'globe',
  interest: 'heart',
};

export default function CrewKindStep() {
  const { t } = useTranslation();
  const { kind, set } = useNewCrew();

  return (
    <StepLayout
      step={2}
      total={NEW_CREW_STEPS}
      title={t('communities.wizard.kind.title')}
      body={t('communities.wizard.kind.body')}
      primary={{ label: t('common.continue'), onPress: () => router.push('/new-crew/details') }}
    >
      <ChoiceList
        accessibilityLabel={t('communities.wizard.kind.title')}
        value={kind}
        onChange={(k) => set({ kind: k })}
        options={communityKinds.map((k) => ({
          value: k,
          label: t(`communities.kinds.${k}`),
          description: t(`communities.wizard.kind.${k}`),
          icon: ICONS[k],
        }))}
      />
    </StepLayout>
  );
}
