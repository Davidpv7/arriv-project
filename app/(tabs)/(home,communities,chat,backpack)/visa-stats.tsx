import { router, useLocalSearchParams } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  Divider,
  Header,
  Input,
  ListRow,
  Notice,
  Screen,
  Text,
  useIsWide,
} from '@/components/ds';
import { usePostList } from '@/features/feed/api';
import { PostCard } from '@/features/feed/components/PostCard';
import { useMilestones } from '@/features/journey/api';
import { useNewStamp } from '@/features/journey/newStampStore';
import { useMyProfile } from '@/features/profile/api';
import { useVisaStats } from '@/features/visa-stats/api';
import { WeeklyGrants } from '@/features/visa-stats/components/WeeklyGrants';
import {
  cleanSubclass,
  formatMonth,
  isEmptyStats,
  OFFICIAL_PROCESSING_TIMES_URL,
  type VisaStats,
} from '@/features/visa-stats/stats';
import { colors, radius, space } from '@/theme/tokens';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/home'));

/**
 * Visa stats: member-reported waiting times for one subclass, from visa stamps their
 * owners chose to count. Phone: one column, stats first, then journey updates.
 * Desktop: stats on the left, journey updates in a column on the right.
 */
export default function VisaStatsScreen() {
  const { t } = useTranslation();
  const wide = useIsWide();
  const params = useLocalSearchParams<{ subclass?: string }>();
  const profile = useMyProfile();
  const milestones = useMilestones();

  // Start from the link's subclass, else my profile's visa, else my latest visa stamp.
  const myVisaStamp = (milestones.data ?? []).find((m) => m.kind === 'visa' && m.visa_subclass);
  const fallback =
    cleanSubclass(params.subclass) ??
    cleanSubclass(profile.data?.visa?.visa_subclass) ??
    cleanSubclass(myVisaStamp?.visa_subclass);
  const [chosen, setChosen] = useState<string | null>(null);
  const [draft, setDraft] = useState<string | null>(null);
  const [draftError, setDraftError] = useState(false);
  const subclass = chosen ?? fallback;

  const show = () => {
    const next = cleanSubclass(draft ?? subclass);
    if (!next) return setDraftError(true);
    setChosen(next);
    setDraft(null);
  };

  const iShare = (milestones.data ?? []).some(
    (m) => m.kind === 'visa' && m.share_stats && m.visa_subclass === subclass,
  );

  const header = (
    <View style={styles.group}>
      <Header
        onBack={goBack}
        backLabel={t('common.back')}
        eyebrow={t('visaStats.eyebrow')}
        title={t('visaStats.title')}
      />
      <View style={styles.picker}>
        <View style={styles.flex}>
          <Input
            label={t('visaStats.subclass')}
            placeholder={t('visaStats.subclassPlaceholder')}
            value={draft ?? subclass ?? ''}
            onChangeText={(v) => {
              setDraftError(false);
              setDraft(v.replace(/\D/g, ''));
            }}
            onSubmitEditing={show}
            keyboardType="number-pad"
            returnKeyType="search"
            maxLength={3}
            error={draftError ? t('visaStats.subclassError') : undefined}
          />
        </View>
        <View style={styles.pickerButton}>
          <Button label={t('visaStats.show')} variant="secondary" onPress={show} />
        </View>
      </View>
      <Notice
        tone="sky"
        eyebrow={t('visaStats.notOfficialEyebrow')}
        body={t('visaStats.notOfficial')}
      />
    </View>
  );

  const stats = subclass ? (
    <StatsSection subclass={subclass} />
  ) : (
    <Card>
      <Text variant="body" color="muted">
        {t('visaStats.pickSubclass')}
      </Text>
    </Card>
  );

  const shareYours =
    subclass && !iShare ? (
      <Card>
        <View style={styles.group}>
          <Text variant="heading">{t('visaStats.shareYours')}</Text>
          <Text variant="body" color="muted">
            {t('visaStats.shareYoursHint')}
          </Text>
          <Button
            label={t('journey.addStamp')}
            icon="plus"
            variant="secondary"
            onPress={() => {
              const stamp = useNewStamp.getState();
              stamp.reset();
              stamp.set({ kind: 'visa', visaSubclass: subclass });
              router.push('/new-stamp/kind');
            }}
          />
        </View>
      </Card>
    ) : null;

  const official = (
    <Card flush>
      <ListRow
        icon="external"
        title={t('visaStats.official')}
        accessibilityLabel={t('visaStats.officialA11y')}
        onPress={() => void WebBrowser.openBrowserAsync(OFFICIAL_PROCESSING_TIMES_URL)}
      />
    </Card>
  );

  const updates = subclass ? <JourneyUpdates subclass={subclass} /> : null;

  if (wide) {
    return (
      <Screen scroll maxWidth={1040}>
        <View style={styles.stack}>
          {header}
          <View style={styles.columns}>
            <View style={[styles.flex, styles.stack]}>
              {stats}
              {shareYours}
              {official}
            </View>
            <View style={[styles.side, styles.stack]}>{updates}</View>
          </View>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <View style={styles.stack}>
        {header}
        {stats}
        {shareYours}
        {updates}
        {official}
      </View>
    </Screen>
  );
}

function StatsSection({ subclass }: { subclass: string }) {
  const { t } = useTranslation();
  const query = useVisaStats(subclass);

  if (query.isPending) return <ActivityIndicator color={colors.navy} />;
  if (query.isError || !query.data) {
    return (
      <Card>
        <Text variant="body" color="muted">
          {t('common.error')}
        </Text>
      </Card>
    );
  }
  const s = query.data;
  if (isEmptyStats(s)) {
    return (
      <Card>
        <Text variant="body" color="muted">
          {t('visaStats.notEnough')}
        </Text>
      </Card>
    );
  }
  return <StatsBody stats={s} />;
}

function StatsBody({ stats: s }: { stats: VisaStats }) {
  const { t } = useTranslation();
  return (
    <View style={styles.stack}>
      <View style={styles.group}>
        <View style={styles.tiles}>
          <Tile value={s.waiting} label={t('visaStats.waiting')} />
          <Tile value={s.granted_7d} label={t('visaStats.grantedWeek')} />
          <Tile
            value={s.wait_days?.median ?? null}
            label={t('visaStats.medianWait')}
            format={(n) => t('visaStats.daysShort', { count: n })}
            a11yFormat={(n) => t('visaStats.days', { count: n })}
          />
        </View>
        {s.wait_days ? (
          <Text variant="meta" color="muted" align="center">
            {t('visaStats.fromPeople', { count: s.wait_days.people })} ·{' '}
            {t('visaStats.range', { p25: s.wait_days.p25, p75: s.wait_days.p75 })}
          </Text>
        ) : null}
      </View>

      {s.weekly_grants ? (
        <View style={styles.group}>
          <View style={styles.sectionHead}>
            <Text variant="label" color="rust" accessibilityRole="header">
              {t('visaStats.weekly')}
            </Text>
            <Text variant="meta" color="muted">
              {t('visaStats.weeklyHint')}
            </Text>
          </View>
          <Card>
            <WeeklyGrants
              weeks={s.weekly_grants}
              accessibilityLabel={t('visaStats.weeklyA11y', { counts: s.weekly_grants.join(', ') })}
            />
          </Card>
        </View>
      ) : null}

      <View style={styles.group}>
        <Text variant="label" color="rust" accessibilityRole="header">
          {t('visaStats.byMonth')}
        </Text>
        <Card flush>
          {s.waiting_by_month.length === 0 ? (
            <View style={styles.pad}>
              <Text variant="meta" color="muted">
                {t('visaStats.byMonthEmpty')}
              </Text>
            </View>
          ) : (
            s.waiting_by_month.map((m, i) => (
              <View key={m.month}>
                {i > 0 && <Divider />}
                <View
                  style={styles.row}
                  accessible
                  accessibilityLabel={t('visaStats.byMonthA11y', {
                    month: formatMonth(m.month),
                    count: m.people,
                  })}
                >
                  <Text variant="body">{formatMonth(m.month)}</Text>
                  <Text variant="label">
                    {m.people} {t('visaStats.waiting')}
                  </Text>
                </View>
              </View>
            ))
          )}
        </Card>
      </View>
    </View>
  );
}

/** One figure. Null means fewer than 5 people, so it isn't shown. */
function Tile({
  value,
  label,
  format = String,
  a11yFormat,
}: {
  value: number | null;
  label: string;
  format?: (n: number) => string;
  a11yFormat?: (n: number) => string;
}) {
  const { t } = useTranslation();
  const shown = value == null ? t('visaStats.fewer') : format(value);
  const spoken = value == null ? t('visaStats.fewerA11y') : (a11yFormat ?? format)(value);
  return (
    <View style={styles.tile} accessible accessibilityLabel={`${spoken} ${label}`}>
      <Text variant="heading" numberOfLines={1} adjustsFontSizeToFit>
        {shown}
      </Text>
      <Text variant="meta" color="muted" numberOfLines={2}>
        {label}
      </Text>
    </View>
  );
}

/** Journey updates sharing a visa stamp of this subclass, with likes and comments. */
function JourneyUpdates({ subclass }: { subclass: string }) {
  const { t } = useTranslation();
  const list = usePostList({ visaSubclass: subclass });
  const posts = list.data?.pages.flatMap((p) => p.posts) ?? [];

  return (
    <View style={styles.group}>
      <Text variant="label" color="rust" accessibilityRole="header">
        {t('visaStats.updates')}
      </Text>
      {list.isPending ? (
        <ActivityIndicator color={colors.navy} />
      ) : posts.length === 0 ? (
        <Card>
          <Text variant="body" color="muted">
            {list.isError ? t('common.error') : t('visaStats.updatesEmpty')}
          </Text>
        </Card>
      ) : (
        <>
          {posts.map((p) => (
            <PostCard key={p.id} post={p} />
          ))}
          {list.hasNextPage && (
            <Button
              label={t('visaStats.moreUpdates')}
              variant="secondary"
              loading={list.isFetchingNextPage}
              onPress={() => void list.fetchNextPage()}
            />
          )}
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space[5] },
  group: { gap: space[3] },
  flex: { flex: 1 },
  columns: { flexDirection: 'row', alignItems: 'flex-start', gap: space[6] },
  side: { width: 380 },
  picker: { flexDirection: 'row', alignItems: 'flex-start', gap: space[3] },
  // Lines the button up with the input box, under the input's label.
  pickerButton: { paddingTop: space[6] },
  tiles: { flexDirection: 'row', gap: space[3] },
  tile: {
    flex: 1,
    gap: space[1],
    backgroundColor: colors.card,
    borderRadius: radius.ticket,
    padding: space[3],
    minHeight: 88,
  },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: space[3],
    paddingHorizontal: space[4],
    minHeight: 48,
  },
  pad: { padding: space[4] },
});
