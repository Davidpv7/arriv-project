import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Chip, Notice } from '@/components/ds';
import { useCreateCommunity } from '@/features/communities/api';
import { CrewBoardPreview, CrewStamp } from '@/features/communities/components/CrewPreview';
import { NEW_CREW_STEPS, useNewCrew } from '@/features/communities/newCrewStore';
import { STAMP_COLORS } from '@/features/feed/format';
import { StepLayout } from '@/features/shared/StepLayout';
import { space } from '@/theme/tokens';

/** Last step: pick the stamp colour, preview the board row, create. */
export default function CrewStampStep() {
  const { t } = useTranslation();
  const crew = useNewCrew();
  const create = useCreateCommunity();

  const submit = () =>
    create.mutate(
      {
        name: crew.name.trim(),
        description: crew.description.trim(),
        kind: crew.kind,
        city: crew.city.trim() || null,
        language: crew.kind === 'language' ? crew.language || null : null,
        visa_subclass: crew.kind === 'visa' ? crew.visaSubclass || null : null,
        tags: [],
        stamp_color: crew.stampColor,
      },
      {
        onSuccess: (slug) => {
          crew.reset();
          // Replace the wizard with the new crew; Back goes to the departures board.
          router.dismissTo('/communities');
          router.push(`/community/${slug}`);
        },
      },
    );

  return (
    <StepLayout
      step={5}
      total={NEW_CREW_STEPS}
      title={t('communities.wizard.stamp.title')}
      body={t('communities.wizard.stamp.body')}
      primary={{
        label: t('communities.wizard.stamp.create'),
        loading: create.isPending,
        onPress: submit,
      }}
      error={create.error ? t('common.error') : undefined}
    >
      <CrewStamp name={crew.name} color={crew.stampColor} />
      <View style={styles.chips} accessibilityRole="radiogroup">
        {STAMP_COLORS.map((c) => (
          <Chip
            key={c}
            label={t(`communities.colors.${c}`)}
            selected={crew.stampColor === c}
            onPress={() => crew.set({ stampColor: c })}
          />
        ))}
      </View>
      <CrewBoardPreview name={crew.name} city={crew.city} />
      <Notice eyebrow={t('notice.customsEyebrow')} body={t('communities.create.note')} tone="sky" />
    </StepLayout>
  );
}

const styles = StyleSheet.create({
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], justifyContent: 'center' },
});
