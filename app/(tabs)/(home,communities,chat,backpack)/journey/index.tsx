import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Button, Card, Divider, Header, ListRow, NextStamp, Screen, Text } from '@/components/ds';
import { useMilestones } from '@/features/journey/api';
import { StampTile } from '@/features/journey/components/StampTile';
import { useNewStamp } from '@/features/journey/newStampStore';
import { daysUntil, formatDay, splitJourney, type Milestone } from '@/features/journey/rules';
import { colors, radius, space } from '@/theme/tokens';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/home'));

/** Passport page of done stamps, then what's coming up (with reminders). */
export default function JourneyScreen() {
  const { t } = useTranslation();
  const milestones = useMilestones();
  const { done, upcoming } = splitJourney(milestones.data ?? []);
  const add = () => {
    useNewStamp.getState().reset();
    router.push('/new-stamp/kind');
  };

  return (
    <Screen scroll>
      <View style={styles.stack}>
        <Header
          onBack={goBack}
          backLabel={t('common.back')}
          eyebrow={t('journey.eyebrow')}
          title={t('journey.title')}
        />
        <Text variant="body" color="muted">
          {t('journey.intro')}
        </Text>
        <Button label={t('journey.addStamp')} icon="plus" fullWidth onPress={add} />

        {milestones.isPending ? (
          <ActivityIndicator color={colors.navy} />
        ) : milestones.isError ? (
          <Card>
            <Text variant="body">{t('common.error')}</Text>
            <Button
              label={t('common.retry')}
              variant="secondary"
              onPress={() => void milestones.refetch()}
            />
          </Card>
        ) : (
          <>
            <View style={styles.section}>
              <Text variant="label" color="rust" accessibilityRole="header">
                {t('journey.stamps')}
              </Text>
              <View style={styles.page}>
                {done.length === 0 && (
                  <Text variant="body" color="muted" style={styles.pageEmpty}>
                    {t('journey.empty')}
                  </Text>
                )}
                <View style={styles.grid}>
                  {done.map((m, i) => (
                    <StampTile
                      key={m.id}
                      stamp={m}
                      index={i}
                      onPress={() => router.push(`/journey/${m.id}`)}
                    />
                  ))}
                  <View style={styles.slot}>
                    <NextStamp label={t('journey.nextStamp')} onPress={add} />
                  </View>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text variant="label" color="rust" accessibilityRole="header">
                {t('journey.upcoming')}
              </Text>
              {upcoming.length === 0 ? (
                <Card>
                  <Text variant="body" color="muted">
                    {t('journey.upcomingEmpty')}
                  </Text>
                </Card>
              ) : (
                <Card flush>
                  {upcoming.map((m, i) => (
                    <View key={m.id}>
                      {i > 0 && <Divider />}
                      <UpcomingRow milestone={m} />
                    </View>
                  ))}
                </Card>
              )}
            </View>
          </>
        )}
      </View>
    </Screen>
  );
}

function UpcomingRow({ milestone }: { milestone: Milestone }) {
  const { t } = useTranslation();
  const due = milestone.due_on ?? '';
  const days = daysUntil(due);
  const when =
    days > 0
      ? t('journey.dueIn', { count: days })
      : days === 0
        ? t('journey.dueToday')
        : t('journey.overdue');
  const meta = t('journey.upcomingMeta', {
    due: t('journey.dueOn', { date: formatDay(due) }),
    when,
  });
  const reminder =
    milestone.remind_on && !milestone.reminded_at
      ? t('journey.remindOn', { date: formatDay(milestone.remind_on) })
      : null;
  return (
    <ListRow
      icon={reminder ? 'bell' : 'calendar'}
      title={milestone.title}
      meta={meta}
      accessibilityLabel={[milestone.title, meta, reminder].filter(Boolean).join(', ')}
      onPress={() => router.push(`/journey/${milestone.id}`)}
    />
  );
}

const styles = StyleSheet.create({
  stack: { gap: space[5] },
  section: { gap: space[3] },
  // The passport page: card paper with a hairline frame, stamps laid out loosely.
  page: {
    backgroundColor: colors.card,
    borderRadius: radius.postcard,
    borderWidth: 1,
    borderColor: colors.rule,
    padding: space[4],
    gap: space[3],
  },
  pageEmpty: { textAlign: 'center' },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    rowGap: space[4],
  },
  slot: { width: 110 + space[4], alignItems: 'center' },
});
