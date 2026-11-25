import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  ActionSheet,
  ConfirmDialog,
  Header,
  IconButton,
  Notice,
  Screen,
  Text,
  type ActionSheetAction,
} from '@/components/ds';
import { useUserId } from '@/features/auth/session';
import {
  useConversation,
  useConversationRealtime,
  useDeleteMessage,
  useEditMessage,
  useMarkRead,
  useMessages,
  useSendMessage,
  type ChatMessage,
  type Conversation,
} from '@/features/chat/api';
import { Composer, type ComposerEdit } from '@/features/chat/components/Composer';
import { ConversationAvatar } from '@/features/chat/components/ConversationAvatar';
import { MessageBubble } from '@/features/chat/components/MessageBubble';
import { conversationTitle, startsRun } from '@/features/chat/format';
import { useMyMemberships } from '@/features/communities/api';
import { gateCode } from '@/features/feed/format';
import { colors, space } from '@/theme/tokens';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/chat'));

export default function ConversationScreen() {
  const { t } = useTranslation();
  const { id = '' } = useLocalSearchParams<{ id: string }>();
  const conversation = useConversation(id);

  if (conversation.isPending) {
    return (
      <Screen>
        <ActivityIndicator color={colors.navy} />
      </Screen>
    );
  }
  if (!conversation.data) {
    return (
      <Screen scroll>
        <View style={styles.stack}>
          <Header onBack={goBack} backLabel={t('common.back')} title={t('chat.notFound')} />
          <Text variant="body" color="muted">
            {conversation.isError ? t('common.error') : t('chat.notFoundBody')}
          </Text>
        </View>
      </Screen>
    );
  }
  return <Chat conversation={conversation.data} />;
}

function Chat({ conversation }: { conversation: Conversation }) {
  const { t } = useTranslation();
  const me = useUserId();
  const id = conversation.id;
  const messages = useMessages(id);
  const send = useSendMessage(id);
  const edit = useEditMessage(id);
  const remove = useDeleteMessage(id);
  const markRead = useMarkRead(id);
  const memberships = useMyMemberships();
  useConversationRealtime(id);

  const [selected, setSelected] = useState<ChatMessage | null>(null);
  const [editing, setEditing] = useState<ComposerEdit | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<ChatMessage | null>(null);

  const list = useMemo(
    () => messages.data?.pages.flatMap((p) => p.messages) ?? [],
    [messages.data],
  );
  const newestId = list[0]?.id;

  // Read up to the newest message whenever one arrives while the chat is open.
  const { mutate: markReadNow } = markRead;
  useEffect(() => {
    if (newestId !== undefined) markReadNow();
  }, [newestId, markReadNow]);

  const other =
    conversation.kind === 'direct'
      ? (conversation.members.find((m) => m.user_id !== me)?.profile ?? null)
      : null;
  const title = conversationTitle(t, { ...conversation, other });
  const role = conversation.community_id
    ? memberships.data?.get(conversation.community_id)
    : undefined;
  const canModerate = role === 'owner' || role === 'moderator';
  const showNotice = conversation.kind !== 'direct';

  const actions: ActionSheetAction[] = [];
  if (selected?.sender_id === me && selected.body) {
    actions.push({
      label: t('chat.actions.edit'),
      onPress: () => {
        setEditing({ id: selected.id, body: selected.body ?? '' });
        setSelected(null);
      },
    });
  }
  if (selected && (selected.sender_id === me || canModerate)) {
    actions.push({
      label: selected.sender_id === me ? t('chat.actions.delete') : t('chat.actions.remove'),
      destructive: true,
      onPress: () => {
        setConfirmDelete(selected);
        setSelected(null);
      },
    });
  }

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <SafeAreaView style={styles.flex} edges={['top']}>
        <View style={styles.inner}>
          <ChatHeader conversation={conversation} title={title} other={other} />
          {showNotice && (
            <View style={styles.notice}>
              <Notice eyebrow={t('notice.customsEyebrow')} body={t('notice.customsBody')} />
            </View>
          )}
          <FlatList
            inverted
            style={styles.flex}
            contentContainerStyle={styles.list}
            data={list}
            keyExtractor={(m) => String(m.id)}
            renderItem={({ item, index }) => (
              <MessageBubble
                message={item}
                mine={item.sender_id === me}
                showSender={conversation.kind !== 'direct' && startsRun(list, index)}
                onLongPress={
                  item.sender_id === me || canModerate ? () => setSelected(item) : undefined
                }
              />
            )}
            onEndReached={() => {
              if (messages.hasNextPage && !messages.isFetchingNextPage) {
                void messages.fetchNextPage();
              }
            }}
            onEndReachedThreshold={0.3}
            ListFooterComponent={
              messages.isPending || messages.isFetchingNextPage ? (
                <ActivityIndicator color={colors.navy} style={styles.footer} />
              ) : !messages.hasNextPage ? (
                <Text variant="label" color="muted" align="center" style={styles.footer}>
                  {t('chat.startOfChat')}
                </Text>
              ) : undefined
            }
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          />
          <Composer
            busy={send.isPending || edit.isPending}
            error={messages.isError ? 'common.error' : null}
            editing={editing}
            onCancelEdit={() => setEditing(null)}
            onSend={(draft) => send.mutateAsync(draft)}
            onSaveEdit={async (e) => {
              await edit.mutateAsync(e);
              setEditing(null);
            }}
          />
        </View>
      </SafeAreaView>

      <ActionSheet
        visible={!!selected && actions.length > 0}
        title={t('chat.actions.title')}
        actions={actions}
        cancelLabel={t('common.cancel')}
        onCancel={() => setSelected(null)}
      />
      <ConfirmDialog
        visible={!!confirmDelete}
        title={
          confirmDelete?.sender_id === me
            ? t('chat.actions.deleteTitle')
            : t('chat.actions.removeTitle')
        }
        body={t('chat.actions.deleteBody')}
        confirmLabel={
          confirmDelete?.sender_id === me ? t('chat.actions.delete') : t('chat.actions.remove')
        }
        cancelLabel={t('common.cancel')}
        destructive
        loading={remove.isPending}
        onCancel={() => setConfirmDelete(null)}
        onConfirm={() =>
          confirmDelete &&
          remove.mutate(confirmDelete.id, { onSuccess: () => setConfirmDelete(null) })
        }
      />
    </KeyboardAvoidingView>
  );
}

/** Back, who/what this chat is (gate sign for communities), and details. */
function ChatHeader({
  conversation,
  title,
  other,
}: {
  conversation: Conversation;
  title: string;
  other: Conversation['members'][number]['profile'];
}) {
  const { t } = useTranslation();
  const community = conversation.community;

  const eyebrow =
    conversation.kind === 'community'
      ? `${t('communities.gate', { code: gateCode(community?.city) })} · ${t('communities.onBoard', { count: community?.member_count ?? 0 })}`
      : conversation.kind === 'group'
        ? t('chat.groupMeta', { count: conversation.members.length })
        : other
          ? `@${other.handle}`
          : t('chat.kinds.direct');

  const openSubject = () => {
    if (conversation.kind === 'direct' && other) router.push(`/profile/${other.handle}`);
    else if (conversation.kind === 'community' && community)
      router.push(`/community/${community.slug}`);
    else router.push(`/conversation/${conversation.id}/settings`);
  };

  return (
    <View style={styles.header}>
      <IconButton icon="back" accessibilityLabel={t('common.back')} onPress={goBack} />
      <Pressable
        onPress={openSubject}
        accessibilityRole="button"
        accessibilityLabel={`${title}, ${eyebrow}`}
        style={styles.headerSubject}
      >
        <ConversationAvatar
          kind={conversation.kind}
          title={title}
          community={community}
          other={other}
          size={40}
        />
        <View style={styles.flex}>
          <Text variant="label" color="rust" numberOfLines={1}>
            {eyebrow}
          </Text>
          <Text variant="heading" numberOfLines={1} accessibilityRole="header">
            {title}
          </Text>
        </View>
      </Pressable>
      <IconButton
        icon="settings"
        accessibilityLabel={t('chat.detailsA11y')}
        onPress={() => router.push(`/conversation/${conversation.id}/settings`)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  stack: { gap: space[5] },
  inner: { flex: 1, width: '100%', maxWidth: 720, alignSelf: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[1],
    paddingHorizontal: space[2],
    paddingVertical: space[2],
  },
  headerSubject: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: space[3],
    minHeight: 44,
  },
  notice: { paddingHorizontal: space[4], paddingBottom: space[2] },
  list: { paddingHorizontal: space[4], paddingVertical: space[3] },
  footer: { paddingVertical: space[4] },
});
