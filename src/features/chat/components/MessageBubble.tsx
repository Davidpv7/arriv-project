import { Image } from 'expo-image';
import * as WebBrowser from 'expo-web-browser';
import { useTranslation } from 'react-i18next';
import { Pressable, StyleSheet, View } from 'react-native';

import { Avatar, FileChip, Text } from '@/components/ds';
import type { ChatMessage } from '@/features/chat/api';
import { messageTime } from '@/features/chat/format';
import { initials } from '@/features/profile/format';
import { avatarUrl } from '@/lib/storage';
import { colors, radius, space } from '@/theme/tokens';

type Props = {
  message: ChatMessage;
  mine: boolean;
  /** First of a run: show the sender (group and community chats). */
  showSender: boolean;
  onLongPress?: () => void;
};

const AVATAR = 28;
const PHOTO = 220;

const open = (url: string) => void WebBrowser.openBrowserAsync(url);

/** One message: mine on the right in tangerine, others on the left on card. Never rotated. */
export function MessageBubble({ message, mine, showSender, onLongPress }: Props) {
  const { t } = useTranslation();
  const name = message.sender?.display_name ?? t('chat.unknownPerson');
  const time = messageTime(message.created_at);
  const a = message.attachment;
  const body = message.body?.trim();

  return (
    <View style={[styles.row, mine && styles.rowMine, showSender && styles.runStart]}>
      {!mine && (
        <View style={styles.avatarSlot}>
          {showSender && (
            <Avatar
              initials={initials(name)}
              uri={avatarUrl(message.sender?.avatar_path)}
              size={AVATAR}
              fill="sky"
            />
          )}
        </View>
      )}
      <Pressable
        onLongPress={onLongPress}
        delayLongPress={350}
        accessible={false}
        style={[styles.column, mine && styles.columnMine]}
      >
        {showSender && !mine && (
          <Text variant="label" color="muted">
            {name}
          </Text>
        )}
        {a?.isImage && (
          <Pressable
            onPress={() => open(a.url)}
            onLongPress={onLongPress}
            accessibilityRole="imagebutton"
            accessibilityLabel={t('chat.photoA11y', { name })}
          >
            <Image source={{ uri: a.url }} style={styles.photo} contentFit="cover" />
          </Pressable>
        )}
        {a && !a.isImage && (
          <FileChip
            fileName={a.name}
            fill={mine ? 'tangerine' : 'sky'}
            direction={mine ? 1 : -1}
            onPress={() => open(a.url)}
            accessibilityLabel={t('chat.openFileA11y', { name: a.name })}
          />
        )}
        {body ? (
          <Pressable
            onLongPress={onLongPress}
            delayLongPress={350}
            accessibilityRole="text"
            accessibilityLabel={t('chat.messageA11y', {
              name: mine ? t('chat.you') : name,
              time,
              body,
            })}
            accessibilityHint={onLongPress ? t('chat.actions.title') : undefined}
            style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}
          >
            <Text variant="body" selectable>
              {body}
            </Text>
          </Pressable>
        ) : null}
        <Text variant="label" color="muted" style={mine && styles.timeMine}>
          {message.edited_at ? `${time} · ${t('chat.edited')}` : time}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'flex-end', gap: space[2], marginTop: space[1] },
  rowMine: { justifyContent: 'flex-end' },
  runStart: { marginTop: space[3] },
  avatarSlot: { width: AVATAR },
  column: { maxWidth: '78%', gap: space[1], alignItems: 'flex-start' },
  columnMine: { alignItems: 'flex-end' },
  bubble: {
    paddingVertical: space[2] + 2,
    paddingHorizontal: space[3] + 2,
    borderRadius: radius.ticket,
  },
  bubbleMine: { backgroundColor: colors.tangerine, borderBottomRightRadius: radius.stamp },
  bubbleTheirs: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.rule,
    borderBottomLeftRadius: radius.stamp,
  },
  photo: {
    width: PHOTO,
    height: PHOTO * 0.75,
    borderRadius: radius.ticket,
    backgroundColor: colors.rule,
  },
  timeMine: { textAlign: 'right' },
});
