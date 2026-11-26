import { router } from 'expo-router';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, View } from 'react-native';

import {
  Avatar,
  BoardingPass,
  Button,
  Card,
  Divider,
  IconButton,
  ListRow,
  ListScreen,
  Screen,
  Stamp,
  Text,
  useIsWide,
} from '@/components/ds';
import { useSuggestedCommunities } from '@/features/communities/api';
import { useHomeFeed } from '@/features/feed/api';
import { PostCard } from '@/features/feed/components/PostCard';
import { asStampColor, communityInitials, relativeTime } from '@/features/feed/format';
import { useMilestones } from '@/features/journey/api';
import { useNotifications, useUnreadNotificationCount } from '@/features/notifications/api';
import { useMyProfile, type ProfileWithVisa } from '@/features/profile/api';
import { boardingPass, initials } from '@/features/profile/format';
import { avatarUrl } from '@/lib/storage';
import { colors, radius, space } from '@/theme/tokens';

/**
 * Home. Phone: greeting, boarding pass, shortcuts, then the feed.
 * Desktop: the feed in the middle; boarding pass, shortcuts, suggested crews and the
 * latest notifications in a column on the right (the sidebar has the bell and profile).
 */
export default function Home() {
  const { t } = useTranslation();
  const wide = useIsWide();
  const { data: profile } = useMyProfile();
  const feed = useHomeFeed();

  if (!profile) {
    return (
      <Screen>
        <ActivityIndicator color={colors.navy} />
      </Screen>
    );
  }

  const posts = feed.data?.pages.flatMap((p) => p.posts) ?? [];

  const list = (
    <ListScreen
      data={posts}
      keyExtractor={(p) => p.id}
      renderItem={({ item }) => <PostCard post={item} />}
      ListHeaderComponent={
        <View style={styles.header}>
          <Greeting profile={profile} compact={wide} />
          {wide ? <QuickPost profile={profile} /> : <PassAndShortcuts profile={profile} />}
        </View>
      }
      ListEmptyComponent={
        feed.isPending ? (
          <ActivityIndicator color={colors.navy} />
        ) : feed.isError ? (
          <Text variant="body">{t('common.error')}</Text>
        ) : (
          <Card>
            <Text variant="body">{t('feed.empty')}</Text>
            <Button label={t('feed.findCrews')} onPress={() => router.navigate('/communities')} />
          </Card>
        )
      }
      ListFooterComponent={
        feed.isFetchingNextPage ? (
          <ActivityIndicator color={colors.navy} style={styles.footer} />
        ) : posts.length > 0 && !feed.hasNextPage ? (
          <Text variant="label" color="muted" align="center" style={styles.footer}>
            {t('feed.end')}
          </Text>
        ) : undefined
      }
      onEndReached={() => {
        if (feed.hasNextPage && !feed.isFetchingNextPage) void feed.fetchNextPage();
      }}
      onEndReachedThreshold={0.5}
      refreshing={feed.isRefetching && !feed.isFetchingNextPage}
      onRefresh={() => void feed.refetch()}
    />
  );

  if (!wide) return list;

  return (
    <View style={styles.wide}>
      <View style={styles.flex}>{list}</View>
      <ScrollView style={styles.rail} contentContainerStyle={styles.railContent}>
        <PassAndShortcuts profile={profile} />
        <SuggestedCrews />
        <LatestNotifications />
      </ScrollView>
    </View>
  );
}

/** "Hi, Ana". On phones it also has the bell and avatar (the sidebar has them on desktop). */
function Greeting({ profile, compact }: { profile: ProfileWithVisa; compact: boolean }) {
  const { t } = useTranslation();
  const unread = useUnreadNotificationCount().data ?? 0;
  const firstName = profile.display_name.split(' ')[0];
  return (
    <View style={styles.greeting}>
      <View style={styles.flex}>
        <Text variant="label" color="rust">
          {t('home.eyebrow')}
        </Text>
        <Text variant="title" accessibilityRole="header">
          {t('home.greeting', { name: firstName })}
        </Text>
      </View>
      {!compact && (
        <>
          <IconButton
            icon="bell"
            dot={unread > 0}
            accessibilityLabel={
              unread > 0
                ? t('notifications.openUnread', { count: unread })
                : t('notifications.open')
            }
            onPress={() => router.push('/notifications')}
          />
          <Pressable
            onPress={() => router.push(`/profile/${profile.handle}`)}
            accessibilityRole="link"
            accessibilityLabel={t('home.profileA11y')}
            hitSlop={8}
          >
            <Avatar
              initials={initials(profile.display_name)}
              uri={avatarUrl(profile.avatar_path)}
              size={44}
              fill="sky"
            />
          </Pressable>
        </>
      )}
    </View>
  );
}

/** Desktop: a one-line "share something" box at the top of the feed. */
function QuickPost({ profile }: { profile: ProfileWithVisa }) {
  const { t } = useTranslation();
  const open = () => router.push('/compose');
  // Two separate buttons side by side (a button inside a button isn't valid on the web).
  return (
    <View style={styles.quick}>
      <Pressable
        onPress={open}
        accessibilityRole="button"
        accessibilityLabel={t('compose.bodyPlaceholder')}
        style={({ hovered }) => [styles.quickPrompt, hovered && styles.quickHover]}
      >
        <Avatar
          initials={initials(profile.display_name)}
          uri={avatarUrl(profile.avatar_path)}
          size={40}
          fill="sky"
        />
        <Text variant="body" color="muted" style={styles.flex}>
          {t('compose.bodyPlaceholder')}
        </Text>
      </Pressable>
      <Button label={t('tabs.newPostcard')} icon="plus" onPress={open} />
    </View>
  );
}

function PassAndShortcuts({ profile }: { profile: ProfileWithVisa }) {
  const { t } = useTranslation();
  const pass = boardingPass(profile);
  const milestones = useMilestones();
  const stampCount = milestones.data?.filter((m) => m.status === 'done').length;
  const openProfile = () => router.push(`/profile/${profile.handle}`);

  return (
    <View style={styles.header}>
      <Pressable
        onPress={openProfile}
        accessibilityRole="link"
        accessibilityLabel={t('home.profileA11y')}
      >
        <BoardingPass
          eyebrowStart={t('boardingPass.eyebrow')}
          eyebrowEnd={t('boardingPass.carrier')}
          name={profile.display_name}
          from={{ code: pass.from, city: pass.fromName }}
          to={{ code: pass.to, city: pass.toName }}
          fields={[
            { label: t('boardingPass.visa'), value: pass.visa ?? t('home.noVisa') },
            { label: t('boardingPass.day'), value: pass.day ? String(pass.day) : t('home.noDay') },
            {
              label: t('boardingPass.stamps'),
              value: stampCount == null ? '—' : String(stampCount),
            },
          ]}
          showPlane
        />
      </Pressable>
      <View style={styles.shortcuts}>
        <Stamp
          size="lg"
          label={t('home.journey')}
          icon="plane"
          fill="sunshine"
          direction={-1}
          accessibilityLabel={t('home.journeyA11y')}
          onPress={() => router.push('/journey')}
        />
        <Stamp
          size="lg"
          label={t('home.passport')}
          icon="globe"
          fill="sky"
          accessibilityLabel={t('home.passportA11y')}
          onPress={openProfile}
        />
        {/* Three fit on a phone: Lawyers (after v1) becomes the third. */}
      </View>
    </View>
  );
}

/** Desktop rail: crews suggested for me (city, visa, language). */
function SuggestedCrews() {
  const { t } = useTranslation();
  const crews = useSuggestedCommunities();
  const items = (crews.data ?? []).slice(0, 4);
  if (items.length === 0) return null;
  return (
    <View style={styles.section}>
      <Text variant="label" color="rust" accessibilityRole="header">
        {t('home.crewsForYou')}
      </Text>
      <Card flush>
        {items.map((c, i) => (
          <View key={c.id}>
            {i > 0 && <Divider />}
            <ListRow
              title={c.name}
              meta={t('communities.onBoard', { count: c.member_count })}
              right={
                <Stamp
                  label={communityInitials(c.name)}
                  fill={asStampColor(c.stamp_color)}
                  accessibilityLabel={c.name}
                />
              }
              onPress={() => router.push(`/community/${c.slug}`)}
            />
          </View>
        ))}
      </Card>
    </View>
  );
}

/** Desktop rail: the three latest notifications. */
function LatestNotifications() {
  const { t } = useTranslation();
  const list = useNotifications();
  const items = (list.data ?? []).slice(0, 3);
  return (
    <View style={styles.section}>
      <Text variant="label" color="rust" accessibilityRole="header">
        {t('notifications.title')}
      </Text>
      <Card flush>
        {items.length === 0 ? (
          <View style={styles.pad}>
            <Text variant="meta" color="muted">
              {t('notifications.empty')}
            </Text>
          </View>
        ) : (
          items.map((n, i) => {
            const name = n.actor?.display_name ?? t('notifications.someone');
            const text =
              n.type === 'community_join'
                ? t('notifications.types.community_join', { name, community: n.preview ?? '' })
                : n.type === 'milestone_reminder'
                  ? t('notifications.types.milestone_reminder', { title: n.preview ?? '' })
                  : t(`notifications.types.${n.type as 'comment'}`, { name });
            return (
              <View key={n.id}>
                {i > 0 && <Divider />}
                <ListRow
                  title={text}
                  meta={relativeTime(t, n.created_at)}
                  onPress={() => router.push('/notifications')}
                />
              </View>
            );
          })
        )}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  wide: { flex: 1, flexDirection: 'row' },
  rail: { width: 380, flexGrow: 0, borderLeftWidth: 1, borderLeftColor: colors.rule },
  railContent: { padding: space[6], gap: space[6] },
  header: { gap: space[5], marginBottom: space[5] },
  greeting: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  flex: { flex: 1 },
  shortcuts: { flexDirection: 'row', gap: space[4], paddingHorizontal: space[1] },
  footer: { marginVertical: space[5] },
  section: { gap: space[3] },
  pad: { padding: space[4] },
  quick: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    backgroundColor: colors.card,
    borderRadius: radius.card,
    padding: space[3],
    paddingLeft: space[4],
  },
  quickPrompt: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: 44,
  },
  quickHover: { opacity: 0.8 },
});
