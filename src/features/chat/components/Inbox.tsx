import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, ScrollView, StyleSheet, View } from 'react-native';

import { Button, Card, Chip, Divider, ListScreen, Text } from '@/components/ds';
import { useUserId } from '@/features/auth/session';
import {
  useInbox,
  useMyGroupInvites,
  useRespondToGroupInvite,
  type InboxItem,
  type MyGroupInvite,
} from '@/features/chat/api';
import { InboxRow } from './InboxRow';
import {
  filterInbox,
  INBOX_FILTERS,
  unreadChatsByKind,
  type InboxFilter,
} from '@/features/chat/format';
import { colors, radius, space } from '@/theme/tokens';

type InboxProps = {
  /** Opens a conversation: push on phones, select in the right pane on desktop. */
  onOpen: (conversationId: string) => void;
  /** Desktop: the conversation open in the right pane (highlighted). */
  selectedId?: string | null;
};

/** The chat inbox: title, new chat, filters, group invites and every conversation. */
export function Inbox({ onOpen, selectedId }: InboxProps) {
  const { t } = useTranslation();
  const me = useUserId();
  const inbox = useInbox();
  const invites = useMyGroupInvites();

  const [filter, setFilter] = useState<InboxFilter>('all');
  const all = inbox.data ?? [];
  const items = filterInbox(all, filter);
  const unread = unreadChatsByKind(all);
  const showInvites = filter === 'all' || filter === 'group';

  return (
    <ListScreen<InboxItem>
      data={items}
      keyExtractor={(c) => c.conversation_id}
      refreshing={inbox.isRefetching || invites.isRefetching}
      onRefresh={() => {
        void inbox.refetch();
        void invites.refetch();
      }}
      ItemSeparatorComponent={Divider}
      ListHeaderComponent={
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Text variant="title" accessibilityRole="header" style={styles.flex}>
              {t('chat.title')}
            </Text>
            <Button
              label={t('chat.newChat')}
              variant="dark"
              icon="plus"
              onPress={() => router.push('/chat-new')}
            />
          </View>
          {all.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.filtersScroll}
              contentContainerStyle={styles.filters}
              accessibilityRole="radiogroup"
            >
              {INBOX_FILTERS.map((f) => {
                const label = t(`chat.filters.${f}`);
                const count = unread[f];
                return (
                  <Chip
                    key={f}
                    label={count > 0 ? t('chat.filterWithUnread', { label, count }) : label}
                    accessibilityLabel={
                      count > 0 ? t('chat.filterUnreadA11y', { label, count }) : label
                    }
                    selected={filter === f}
                    onPress={() => setFilter(f)}
                  />
                );
              })}
            </ScrollView>
          )}
          {showInvites && <Invites invites={invites.data ?? []} onOpen={onOpen} />}
          {inbox.isPending && <ActivityIndicator color={colors.navy} />}
          {inbox.isError && (
            <Card>
              <Text variant="body">{t('common.error')}</Text>
              <Button
                label={t('common.retry')}
                variant="secondary"
                onPress={() => void inbox.refetch()}
              />
            </Card>
          )}
        </View>
      }
      renderItem={({ item, index }) => (
        <View
          style={[
            styles.rowWrap,
            index === 0 && styles.first,
            index === items.length - 1 && styles.last,
            item.conversation_id === selectedId && styles.selected,
          ]}
        >
          <InboxRow item={item} me={me} onPress={() => onOpen(item.conversation_id)} />
        </View>
      )}
      ListEmptyComponent={
        inbox.isSuccess ? (
          <Card>
            <Text variant="body" color="muted">
              {filter === 'all' ? t('chat.empty') : t(`chat.emptyFiltered.${filter}`)}
            </Text>
          </Card>
        ) : undefined
      }
    />
  );
}

function Invites({
  invites,
  onOpen,
}: {
  invites: MyGroupInvite[];
  onOpen: (conversationId: string) => void;
}) {
  const { t } = useTranslation();
  const respond = useRespondToGroupInvite();
  if (invites.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text variant="label" color="rust" accessibilityRole="header">
        {t('chat.invites')}
      </Text>
      {invites.map((invite) => {
        const busy =
          respond.isPending && respond.variables?.conversationId === invite.conversation_id;
        const answer = (accept: boolean) =>
          respond.mutate(
            { conversationId: invite.conversation_id, accept },
            {
              onSuccess: () => {
                if (accept) onOpen(invite.conversation_id);
              },
            },
          );
        return (
          <Card key={invite.conversation_id}>
            <View style={styles.invite}>
              <Text variant="heading">{invite.conversation?.title ?? t('chat.untitledGroup')}</Text>
              <Text variant="meta" color="muted">
                {t('chat.invitedBy', {
                  name: invite.inviter?.display_name ?? t('chat.unknownPerson'),
                })}
              </Text>
              <View style={styles.inviteActions}>
                <Button
                  label={t('chat.accept')}
                  loading={busy && respond.variables?.accept === true}
                  disabled={busy}
                  onPress={() => answer(true)}
                />
                <Button
                  label={t('chat.decline')}
                  variant="secondary"
                  loading={busy && respond.variables?.accept === false}
                  disabled={busy}
                  onPress={() => answer(false)}
                />
              </View>
            </View>
          </Card>
        );
      })}
      {respond.isError && (
        <Text variant="meta" color="rust">
          {t('common.error')}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  header: { gap: space[4], marginBottom: space[3] },
  flex: { flex: 1 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: space[3] },
  // Bleed to the screen edges so chips scroll under the side padding.
  filtersScroll: { marginHorizontal: -space[5] },
  section: { gap: space[3] },
  filters: { flexDirection: 'row', gap: space[2], paddingHorizontal: space[5] },
  invite: { gap: space[2] },
  inviteActions: { flexDirection: 'row', gap: space[2], marginTop: space[1] },
  rowWrap: { overflow: 'hidden' },
  first: { borderTopLeftRadius: radius.card, borderTopRightRadius: radius.card },
  last: { borderBottomLeftRadius: radius.card, borderBottomRightRadius: radius.card },
  // Desktop: the conversation open on the right.
  selected: { borderLeftWidth: 4, borderLeftColor: colors.tangerine },
});
