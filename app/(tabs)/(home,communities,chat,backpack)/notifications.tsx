import { router } from 'expo-router';
import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';

import { Avatar, Button, Card, Divider, Header, Icon, ListScreen, Text } from '@/components/ds';
import { relativeTime } from '@/features/feed/format';
import {
  communitySlug,
  useMarkNotificationsRead,
  useNotifications,
  type AppNotification,
} from '@/features/notifications/api';
import { destination } from '@/features/notifications/format';
import { initials } from '@/features/profile/format';
import { avatarUrl } from '@/lib/storage';
import { colors, radius, space } from '@/theme/tokens';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/home'));

/** Everything that happened to me, newest first. Opening it marks it all read. */
export default function NotificationsScreen() {
  const { t } = useTranslation();
  const list = useNotifications();
  const markRead = useMarkNotificationsRead();
  const items = list.data ?? [];
  const hasUnread = items.some((n) => !n.read_at);

  // Mark read once what's unread has been shown (the rows keep their dot until next visit).
  const { mutate: markAllRead } = markRead;
  useEffect(() => {
    if (hasUnread) markAllRead();
  }, [hasUnread, markAllRead]);

  return (
    <ListScreen<AppNotification>
      data={items}
      keyExtractor={(n) => n.id}
      refreshing={list.isRefetching}
      onRefresh={() => void list.refetch()}
      ItemSeparatorComponent={Divider}
      ListHeaderComponent={
        <View style={styles.header}>
          <Header
            onBack={goBack}
            backLabel={t('common.back')}
            eyebrow={t('notifications.eyebrow')}
            title={t('notifications.title')}
            right={
              <Button
                label={t('notifications.settingsLink')}
                variant="secondary"
                onPress={() => router.push('/settings/notifications')}
              />
            }
          />
          {list.isPending && <ActivityIndicator color={colors.navy} />}
          {list.isError && (
            <Text variant="body" color="muted">
              {t('common.error')}
            </Text>
          )}
        </View>
      }
      renderItem={({ item, index }) => (
        <View
          style={[
            styles.rowWrap,
            index === 0 && styles.first,
            index === items.length - 1 && styles.last,
          ]}
        >
          <NotificationRow notification={item} />
        </View>
      )}
      ListEmptyComponent={
        list.isSuccess ? (
          <Card>
            <Text variant="body" color="muted">
              {t('notifications.empty')}
            </Text>
          </Card>
        ) : undefined
      }
    />
  );
}

function NotificationRow({ notification: n }: { notification: AppNotification }) {
  const { t } = useTranslation();
  const name = n.actor?.display_name ?? t('notifications.someone');
  const text =
    n.type === 'community_join'
      ? t('notifications.types.community_join', { name, community: n.preview ?? '' })
      : n.type === 'milestone_reminder'
        ? t('notifications.types.milestone_reminder', { title: n.preview ?? '' })
        : t(`notifications.types.${n.type as 'comment'}`, { name });
  const quote = n.preview && ['comment', 'reply', 'like'].includes(n.type) ? n.preview : undefined;
  const when = relativeTime(t, n.created_at);
  const unread = !n.read_at;

  const open = async () => {
    const to = destination(n);
    if (!to) return;
    if (to.kind === 'href') router.push(to.href);
    else {
      const slug = await communitySlug(to.id);
      if (slug) router.push(`/community/${slug}`);
    }
  };

  return (
    <Pressable
      onPress={() => void open()}
      accessibilityRole="button"
      accessibilityLabel={[text, quote, when, unread ? t('notifications.unreadA11y') : null]
        .filter(Boolean)
        .join(', ')}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      {n.type === 'milestone_reminder' ? (
        <View style={styles.iconBubble}>
          <Icon name="bell" />
        </View>
      ) : (
        <Avatar
          initials={initials(name)}
          uri={avatarUrl(n.actor?.avatar_path)}
          size={40}
          fill="sky"
        />
      )}
      <View style={styles.text}>
        <Text variant="body">{text}</Text>
        {quote ? (
          <Text variant="meta" color="muted" numberOfLines={2}>
            {`“${quote}”`}
          </Text>
        ) : null}
        <Text variant="label" color="muted">
          {when}
        </Text>
      </View>
      {unread && <View style={styles.dot} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: { gap: space[4], marginBottom: space[4] },
  rowWrap: { overflow: 'hidden', backgroundColor: colors.card },
  first: { borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card },
  last: { borderBottomLeftRadius: radius.card, borderBottomRightRadius: radius.card },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: space[3],
    padding: space[4],
    minHeight: 64,
  },
  pressed: { opacity: 0.8 },
  text: { flex: 1, gap: 2 },
  iconBubble: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.sunshine,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.tangerine,
    marginTop: space[2],
  },
});
