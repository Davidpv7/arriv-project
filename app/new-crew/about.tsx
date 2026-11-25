import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';

import { Input, Text } from '@/components/ds';
import { NEW_CREW_STEPS, useNewCrew } from '@/features/communities/newCrewStore';
import { StepLayout } from '@/features/shared/StepLayout';

export default function CrewAbout() {
  const { t } = useTranslation();
  const { description, kind, set } = useNewCrew();

  return (
    <StepLayout
      step={4}
      total={NEW_CREW_STEPS}
      title={t('communities.wizard.about.title')}
      body={t('communities.wizard.about.body')}
      primary={{ label: t('common.continue'), onPress: () => router.push('/new-crew/stamp') }}
    >
      <Input
        label={t('communities.wizard.about.label')}
        hint={t('communities.wizard.about.hint')}
        value={description}
        onChangeText={(v) => set({ description: v })}
        multiline
        maxLength={500}
        autoFocus
      />
      <Text variant="meta" color="muted">
        {t(`communities.wizard.about.examples.${kind}`)}
      </Text>
    </StepLayout>
  );
}
