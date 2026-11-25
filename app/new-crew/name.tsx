import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';

import { Input } from '@/components/ds';
import { CrewStamp } from '@/features/communities/components/CrewPreview';
import { nameError, NEW_CREW_STEPS, useNewCrew } from '@/features/communities/newCrewStore';
import { StepLayout } from '@/features/shared/StepLayout';
import { useErrorText } from '@/i18n/useErrorText';

export default function CrewName() {
  const { t } = useTranslation();
  const errorText = useErrorText();
  const { name, stampColor, set } = useNewCrew();
  const [error, setError] = useState<string>();

  const next = () => {
    const e = nameError(name);
    if (e) return setError(e);
    router.push('/new-crew/kind');
  };

  return (
    <StepLayout
      step={1}
      total={NEW_CREW_STEPS}
      onBack={() => (router.canGoBack() ? router.back() : router.replace('/communities'))}
      title={t('communities.wizard.name.title')}
      body={t('communities.wizard.name.body')}
      primary={{ label: t('common.continue'), disabled: !name.trim(), onPress: next }}
    >
      <CrewStamp name={name} color={stampColor} />
      <Input
        label={t('communities.wizard.name.label')}
        placeholder={t('communities.wizard.name.placeholder')}
        hint={t('communities.wizard.name.hint')}
        value={name}
        onChangeText={(v) => {
          setError(undefined);
          set({ name: v });
        }}
        error={errorText(error)}
        maxLength={40}
        autoFocus
        returnKeyType="next"
        onSubmitEditing={next}
      />
    </StepLayout>
  );
}
