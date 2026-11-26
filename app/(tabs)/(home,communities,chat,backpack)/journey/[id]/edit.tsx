import { router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Header, Screen, Text } from '@/components/ds';
import { afterSave } from '@/features/journey/afterSave';
import { useMilestone, useSaveMilestone } from '@/features/journey/api';
import { MilestoneForm } from '@/features/journey/components/MilestoneForm';
import { toFormInput } from '@/features/journey/rules';
import { colors, space } from '@/theme/tokens';

export default function EditMilestoneScreen() {
  const { t } = useTranslation();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const milestone = useMilestone(id);
  const save = useSaveMilestone();
  const goBack = () => (router.canGoBack() ? router.back() : router.replace(`/journey/${id}`));

  return (
    <Screen scroll>
      <View style={styles.stack}>
        <Header
          onBack={goBack}
          backLabel={t('common.back')}
          eyebrow={t('journey.form.eyebrow')}
          title={t('journey.form.editTitle')}
        />
        {milestone.isPending ? (
          <ActivityIndicator color={colors.navy} />
        ) : !milestone.data ? (
          <Text variant="body" color="muted">
            {milestone.isError ? t('common.error') : t('journey.detail.notFoundBody')}
          </Text>
        ) : (
          <MilestoneForm
            initial={toFormInput(milestone.data)}
            saving={save.isPending}
            saveError={save.isError ? t('common.error') : undefined}
            onSubmit={(values) =>
              save.mutate({ id, values }, { onSuccess: () => void afterSave(id, values) })
            }
          />
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space[5] },
});
