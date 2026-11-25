import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Icon, Text } from '@/components/ds';
import type { InboxItem } from '@/features/chat/api';
import { conversationTitle, messagePreview } from '@/features/chat/format';
import { relativeTime } from '@/features/feed/format';
import { colors, fonts, radius, space, touchTarget } from '@/theme/tokens';

import { ConversationAvatar } from './ConversationAvatar';

type Props = { item: InboxItem; me: string; onPress: () => void };

/** One conversation in the inbox: who, the last message, when, and how many unread. */
export function InboxRow({ item, me, onPress }: Props) {
  const { t } = useTranslation();
  const title = conversationTitle(t, item);
  const preview = messagePreview(t, item, me);
  const when = item.last_message_id != null ? relativeTime(t, item.last_message_at) : '';
  const unread = item.muted ? 0 : item.unread_count;
  const unreadLabel = unread > 99 ? '99+' : String(unread);

  const a11y = [
    title,
    t(`chat.kinds.${item.kind}`),
    preview,
    when,
    unread > 0 ? t('chat.unreadA11y', { count: unread }) : null,
    item.muted ? t('chat.mutedA11y') : null,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={a11y}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <ConversationAvatar
        kind={item.kind}
        title={title}
        community={item.community}
        other={item.other}
      />
      <View style={styles.text}>
        <View style={styles.top}>
          <Text style={[styles.title, unread > 0 && styles.titleUnread]} numberOfLines={1}>
            {title}
          </Text>
          {item.muted && <Icon name="muted" size={16} color="muted" />}
          {when ? (
            <Text variant="label" color={unread > 0 ? 'rust' : 'muted'}>
              {when}
            </Text>
          ) : null}
        </View>
        <View style={styles.bottom}>
          <Text
            variant="meta"
            color={unread > 0 ? 'navy' : 'muted'}
            numberOfLines={1}
            style={styles.preview}
          >
            {preview}
          </Text>
          {unread > 0 && (
            <View style={styles.badge}>
              <Text variant="label">{unreadLabel}</Text>
            </View>
          )}
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: touchTarget + 28,
    paddingVertical: space[3],
    paddingHorizontal: space[4],
    backgroundColor: colors.card,
  },
  pressed: { opacity: 0.8 },
  text: { flex: 1, gap: 2 },
  top: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  title: { flex: 1, fontFamily: fonts.sans800, fontSize: 16, lineHeight: 20 },
  titleUnread: { fontFamily: fonts.sans900 },
  bottom: { flexDirection: 'row', alignItems: 'center', gap: space[2] },
  preview: { flex: 1 },
  badge: {
    minWidth: 24,
    height: 24,
    paddingHorizontal: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.tangerine,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
