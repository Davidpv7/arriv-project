import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { Card, ConfirmDialog, Divider, Header, Screen, Text } from '@/components/ds';
import { useUserId } from '@/features/auth/session';
import { useDocument } from '@/features/backpack/api';
import { useInbox, useSendDocumentCopy, type InboxItem } from '@/features/chat/api';
import { InboxRow } from '@/features/chat/components/InboxRow';
import { conversationTitle } from '@/features/chat/format';
import { colors, space } from '@/theme/tokens';

const isNoPermission = (e: unknown) =>
  typeof e === 'object' && e !== null && 'code' in e && e.code === '42501';

/** Pick a chat, confirm it will be visible to everyone there, send a copy. */
export default function SendDocumentScreen() {
  const { t } = useTranslation();
  const me = useUserId();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const doc = useDocument(id);
  const inbox = useInbox();
  const send = useSendDocumentCopy();
  const [target, setTarget] = useState<InboxItem | null>(null);

  const goBack = () => (router.canGoBack() ? router.back() : router.replace(`/document/${id}`));
  const chats = inbox.data ?? [];

  return (
    <Screen scroll>
      <View style={styles.stack}>
        <Header
          onBack={goBack}
          backLabel={t('common.back')}
          eyebrow={t('backpack.send.eyebrow')}
          title={t('backpack.send.title')}
        />
        {doc.data && (
          <Text variant="body" color="muted">
            {t('backpack.send.body', { name: doc.data.name })}
          </Text>
        )}
        {inbox.isPending || doc.isPending ? (
          <ActivityIndicator color={colors.navy} />
        ) : inbox.isError || !doc.data ? (
          <Text variant="body" color="muted">
            {doc.data ? t('common.error') : t('backpack.document.notFoundBody')}
          </Text>
        ) : chats.length === 0 ? (
          <Card>
            <Text variant="body" color="muted">
              {t('backpack.send.noChats')}
            </Text>
          </Card>
        ) : (
          <Card flush>
            {chats.map((chat, i) => (
              <View key={chat.conversation_id}>
                {i > 0 && <Divider />}
                <InboxRow
                  item={chat}
                  me={me}
                  onPress={() => {
                    send.reset();
                    setTarget(chat);
                  }}
                />
              </View>
            ))}
          </Card>
        )}
      </View>

      <ConfirmDialog
        visible={!!target}
        title={t('backpack.send.confirmTitle', {
          chat: target ? conversationTitle(t, target) : '',
        })}
        body={
          send.isError
            ? isNoPermission(send.error)
              ? t('chat.composer.blocked')
              : t('common.error')
            : t('backpack.send.confirmBody')
        }
        confirmLabel={t('backpack.send.confirm')}
        cancelLabel={t('common.cancel')}
        loading={send.isPending}
        onCancel={() => setTarget(null)}
        onConfirm={() => {
          if (!target || !doc.data) return;
          const conversationId = target.conversation_id;
          send.mutate(
            { conversationId, doc: doc.data },
            {
              onSuccess: () => {
                setTarget(null);
                router.replace(`/conversation/${conversationId}`);
              },
            },
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space[5] },
});
