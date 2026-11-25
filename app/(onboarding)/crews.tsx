import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, Card, Divider, ListRow, Stamp, Text } from '@/components/ds';
import {
  useJoinCommunity,
  useLeaveCommunity,
  useMyMemberships,
  useSuggestedCommunities,
  type Community,
} from '@/features/communities/api';
import { asStampColor, communityInitials, gateCode } from '@/features/feed/format';
import { ONBOARDING_STEPS, useOnboarding } from '@/features/onboarding/store';
import { StepLayout } from '@/features/shared/StepLayout';
import { useSaveProfile } from '@/features/profile/api';
import { colors, space } from '@/theme/tokens';

/** Step 5: suggested crews, then finish onboarding (sets onboarded_at → Home). */
export default function CrewsStep() {
  const { t } = useTranslation();
  const reset = useOnboarding((s) => s.reset);
  const save = useSaveProfile();
  const suggested = useSuggestedCommunities();
  const memberships = useMyMemberships();
  const join = useJoinCommunity();
  const leave = useLeaveCommunity();

  const finish = () =>
    save.mutate(
      { profile: { onboarded_at: new Date().toISOString() } },
      { onSuccess: () => reset() },
    );

  // Keep the first suggestions on screen: suggestions exclude joined crews, so a
  // refetch after joining would otherwise remove the row the person just tapped.
  const [snapshot, setSnapshot] = useState<Community[] | null>(null);
  if (!snapshot && suggested.data) setSnapshot(suggested.data);
  const list = snapshot ?? [];

  return (
    <StepLayout
      total={ONBOARDING_STEPS}
      step={5}
      title={t('onboarding.crews.title')}
      body={t('onboarding.crews.body')}
      primary={{ label: t('onboarding.finish'), loading: save.isPending, onPress: finish }}
      error={save.error ? t('common.error') : undefined}
    >
      {suggested.isPending ? (
        <ActivityIndicator color={colors.navy} />
      ) : list.length === 0 ? (
        <Text variant="body" color="muted">
          {t('onboarding.crews.empty')}
        </Text>
      ) : (
        <Card flush>
          {list.map((c, i) => {
            const joined = memberships.data?.has(c.id) ?? false;
            const busy =
              (join.isPending && join.variables === c.id) ||
              (leave.isPending && leave.variables === c.id);
            return (
              <View key={c.id}>
                {i > 0 && <Divider />}
                <View style={styles.row}>
                  <Stamp
                    label={communityInitials(c.name)}
                    fill={asStampColor(c.stamp_color)}
                    direction={i % 2 ? 1 : -1}
                    accessibilityLabel={c.name}
                  />
                  <View style={styles.flex}>
                    <ListRow
                      title={c.name}
                      meta={`${t('communities.gate', { code: gateCode(c.city) })} · ${t('communities.onBoard', { count: c.member_count })}`}
                    />
                  </View>
                  <Button
                    label={joined ? t('communities.joined') : t('communities.join')}
                    variant={joined ? 'secondary' : 'primary'}
                    icon={joined ? 'check' : undefined}
                    loading={busy}
                    onPress={() => (joined ? leave.mutate(c.id) : join.mutate(c.id))}
                    accessibilityState={{ selected: joined }}
                  />
                </View>
              </View>
            );
          })}
        </Card>
      )}
    </StepLayout>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[2],
    paddingVertical: space[2],
    paddingHorizontal: space[3],
    backgroundColor: colors.card,
  },
  flex: { flex: 1 },
});
