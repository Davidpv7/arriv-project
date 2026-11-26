import { Redirect, router, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Card, Header, Icon, Screen, Text } from '@/components/ds';
import { useUserId } from '@/features/auth/session';
import { useStamps } from '@/features/journey/api';
import { StampTile } from '@/features/journey/components/StampTile';
import { formatDay } from '@/features/journey/rules';
import { useProfileByHandle } from '@/features/profile/api';
import { colors, radius, space } from '@/theme/tokens';

/**
 * Someone else's Journey: the done stamps they let this viewer see (the database
 * applies each stamp's visibility and blocks). Never notes, documents or coming-up items.
 */
export default function TheirJourneyScreen() {
  const { t } = useTranslation();
  const me = useUserId();
  const { handle = '' } = useLocalSearchParams<{ handle: string }>();
  const profile = useProfileByHandle(handle);
  const stamps = useStamps(profile.data?.id);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace(`/profile/${handle}`));

  if (profile.data?.id === me) return <Redirect href="/journey" />;

  const name = profile.data?.display_name.split(' ')[0] ?? '';
  const items = stamps.data ?? [];

  return (
    <Screen scroll>
      <View style={styles.stack}>
        <Header
          onBack={goBack}
          backLabel={t('common.back')}
          eyebrow={t('journey.theirEyebrow', { handle })}
          title={profile.data ? t('journey.theirTitle', { name }) : t('common.notFound')}
        />
        {profile.isPending || (profile.data && stamps.isPending) ? (
          <ActivityIndicator color={colors.navy} />
        ) : !profile.data || stamps.isError ? (
          <Text variant="body" color="muted">
            {profile.isError || stamps.isError ? t('common.error') : t('common.notFound')}
          </Text>
        ) : items.length === 0 ? (
          <Card>
            <Text variant="body" color="muted">
              {t('journey.theirEmpty', { name })}
            </Text>
          </Card>
        ) : (
          <View style={styles.page}>
            <View style={styles.grid}>
              {items.map((stamp, i) => (
                <View key={stamp.id} style={styles.cell}>
                  <StampTile stamp={stamp} index={i} />
                  {stamp.happened_on && (
                    <Text variant="label" color="muted" align="center">
                      {formatDay(stamp.happened_on)}
                    </Text>
                  )}
                </View>
              ))}
            </View>
          </View>
        )}
        {profile.data && (
          <View style={styles.privacy}>
            <Icon name="lock" size={18} color="teal" />
            <Text variant="meta" color="muted" style={styles.flex}>
              {t('journey.theirNote', { name })}
            </Text>
          </View>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space[5] },
  flex: { flex: 1 },
  page: {
    backgroundColor: colors.card,
    borderRadius: radius.postcard,
    borderWidth: 1,
    borderColor: colors.rule,
    padding: space[4],
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    rowGap: space[4],
  },
  cell: { alignItems: 'center', gap: space[1] },
  privacy: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
});
