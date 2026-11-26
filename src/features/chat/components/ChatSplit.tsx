import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Icon, Text } from '@/components/ds';
import { colors, space } from '@/theme/tokens';

import { ConversationView } from './ConversationView';
import { Inbox } from './Inbox';

type Props = {
  /** The conversation open on the right, or null for the "pick a chat" pane. */
  selectedId: string | null;
  onSelect: (conversationId: string) => void;
};

/** Desktop chat: the inbox on the left, the open conversation on the right. */
export function ChatSplit({ selectedId, onSelect }: Props) {
  const { t } = useTranslation();
  return (
    <View style={styles.row}>
      <View style={styles.inbox}>
        <Inbox selectedId={selectedId} onOpen={onSelect} />
      </View>
      <View style={styles.pane}>
        {selectedId ? (
          // Keyed so switching chats starts fresh (composer text, scroll, dialogs).
          <ConversationView key={selectedId} id={selectedId} embedded />
        ) : (
          <View style={styles.empty}>
            <Icon name="chat" size={40} color="muted" />
            <Text variant="heading">{t('chat.pickTitle')}</Text>
            <Text variant="body" color="muted" align="center">
              {t('chat.pickBody')}
            </Text>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flex: 1, flexDirection: 'row' },
  inbox: { width: 420, borderRightWidth: 1, borderRightColor: colors.rule },
  pane: { flex: 1 },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: space[3],
    padding: space[6],
  },
});
