import { router, useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import {
  Button,
  Card,
  ConfirmDialog,
  Divider,
  Header,
  Input,
  ListRow,
  Screen,
  Text,
} from '@/components/ds';
import { useUserId } from '@/features/auth/session';
import {
  useCancelGroupInvite,
  useConversation,
  useGroupInvites,
  useLeaveGroup,
  useRenameGroup,
  useSetMuted,
  type Conversation,
} from '@/features/chat/api';
import { conversationTitle } from '@/features/chat/format';
import { initials } from '@/features/profile/format';
import { avatarUrl } from '@/lib/storage';
import { colors, space } from '@/theme/tokens';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/chat'));

export default function ChatDetails() {
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
            {t('chat.notFoundBody')}
          </Text>
        </View>
      </Screen>
    );
  }
  return <Details conversation={conversation.data} />;
}

function Details({ conversation }: { conversation: Conversation }) {
  const { t } = useTranslation();
  const me = useUserId();
  const other =
    conversation.kind === 'direct'
      ? (conversation.members.find((m) => m.user_id !== me)?.profile ?? null)
      : null;
  const title = conversationTitle(t, { ...conversation, other });
  const myRole = conversation.me?.role;
  const isGroupMod =
    conversation.kind === 'group' && (myRole === 'owner' || myRole === 'moderator');

  return (
    <Screen scroll>
      <View style={styles.stack}>
        <Header
          onBack={goBack}
          backLabel={t('common.back')}
          eyebrow={t(`chat.kinds.${conversation.kind}`)}
          title={title}
        />

        {isGroupMod && <Rename key={conversation.title ?? ''} conversation={conversation} />}

        {conversation.kind !== 'community' && <Members conversation={conversation} />}

        {conversation.kind === 'group' && (
          <PendingInvites conversationId={conversation.id} canCancelAll={isGroupMod} />
        )}

        <MuteToggle conversation={conversation} />

        {conversation.kind === 'community' && conversation.community && (
          <View style={styles.section}>
            <Button
              label={t('chat.settings.openCommunity')}
              variant="secondary"
              onPress={() => router.push(`/community/${conversation.community?.slug ?? ''}`)}
            />
            <Text variant="meta" color="muted">
              {t('chat.settings.communityHint')}
            </Text>
          </View>
        )}

        {conversation.kind === 'direct' && other && (
          <Button
            label={t('chat.settings.openProfile')}
            variant="secondary"
            onPress={() => router.push(`/profile/${other.handle}`)}
          />
        )}

        {conversation.kind === 'group' && (
          <LeaveGroup conversationId={conversation.id} title={title} isOwner={myRole === 'owner'} />
        )}
      </View>
    </Screen>
  );
}

function Rename({ conversation }: { conversation: Conversation }) {
  const { t } = useTranslation();
  const rename = useRenameGroup(conversation.id);
  const [title, setTitle] = useState(conversation.title ?? '');
  const changed = title.trim() !== (conversation.title ?? '') && title.trim().length > 0;

  return (
    <View style={styles.section}>
      <Input
        label={t('chat.settings.rename')}
        value={title}
        onChangeText={setTitle}
        maxLength={60}
        error={rename.isError ? t('common.error') : undefined}
      />
      <Button
        label={t('chat.settings.renameSave')}
        variant="secondary"
        disabled={!changed}
        loading={rename.isPending}
        onPress={() => rename.mutate(title)}
      />
    </View>
  );
}

function Members({ conversation }: { conversation: Conversation }) {
  const { t } = useTranslation();
  const roleLabel = (role: string) =>
    role === 'owner'
      ? t('chat.settings.owner')
      : role === 'moderator'
        ? t('chat.settings.moderator')
        : undefined;

  return (
    <View style={styles.section}>
      <Text variant="label" color="rust" accessibilityRole="header">
        {t('chat.settings.members')}
      </Text>
      <Card flush>
        {conversation.members.map((m, i) => {
          const name = m.profile?.display_name ?? t('chat.unknownPerson');
          const handle = m.profile?.handle;
          const role = conversation.kind === 'group' ? roleLabel(m.role) : undefined;
          return (
            <View key={m.user_id}>
              {i > 0 && <Divider />}
              <ListRow
                title={name}
                meta={[handle ? `@${handle}` : null, role].filter(Boolean).join(' · ')}
                avatar={{ initials: initials(name), uri: avatarUrl(m.profile?.avatar_path) }}
                onPress={handle ? () => router.push(`/profile/${handle}`) : undefined}
              />
            </View>
          );
        })}
      </Card>
      {conversation.kind === 'group' && (
        <Button
          label={t('chat.settings.invite')}
          icon="plus"
          onPress={() =>
            router.push({ pathname: '/chat-new', params: { invite: conversation.id } })
          }
        />
      )}
    </View>
  );
}

function PendingInvites({
  conversationId,
  canCancelAll,
}: {
  conversationId: string;
  canCancelAll: boolean;
}) {
  const { t } = useTranslation();
  const me = useUserId();
  const invites = useGroupInvites(conversationId);
  const cancel = useCancelGroupInvite(conversationId);
  const list = invites.data ?? [];
  if (list.length === 0) return null;

  return (
    <View style={styles.section}>
      <Text variant="label" color="rust" accessibilityRole="header">
        {t('chat.settings.pending')}
      </Text>
      <Card flush>
        {list.map((inv, i) => {
          const name = inv.invitee?.display_name ?? t('chat.unknownPerson');
          const canCancel = canCancelAll || inv.invited_by === me;
          return (
            <View key={inv.invitee_id}>
              {i > 0 && <Divider />}
              <ListRow
                title={name}
                meta={t('chat.settings.pendingMeta')}
                avatar={{ initials: initials(name), uri: avatarUrl(inv.invitee?.avatar_path) }}
                right={
                  canCancel ? (
                    <Button
                      label={t('chat.settings.cancelInvite')}
                      variant="secondary"
                      loading={cancel.isPending && cancel.variables === inv.invitee_id}
                      onPress={() => cancel.mutate(inv.invitee_id)}
                    />
                  ) : undefined
                }
              />
            </View>
          );
        })}
      </Card>
    </View>
  );
}

function MuteToggle({ conversation }: { conversation: Conversation }) {
  const { t } = useTranslation();
  const setMuted = useSetMuted(conversation.id);
  const muted = !!conversation.me?.muted;
  return (
    <View style={styles.section}>
      <Button
        label={muted ? t('chat.settings.unmute') : t('chat.settings.mute')}
        icon="muted"
        variant="secondary"
        loading={setMuted.isPending}
        onPress={() => setMuted.mutate(!muted)}
      />
      {!muted && (
        <Text variant="meta" color="muted">
          {t('chat.settings.muteHint')}
        </Text>
      )}
      {setMuted.isError && (
        <Text variant="meta" color="rust">
          {t('common.error')}
        </Text>
      )}
    </View>
  );
}

function LeaveGroup({
  conversationId,
  title,
  isOwner,
}: {
  conversationId: string;
  title: string;
  isOwner: boolean;
}) {
  const { t } = useTranslation();
  const leave = useLeaveGroup(conversationId);
  const [confirm, setConfirm] = useState(false);
  return (
    <>
      <Button label={t('chat.settings.leave')} variant="dark" onPress={() => setConfirm(true)} />
      {leave.isError && (
        <Text variant="meta" color="rust">
          {t('common.error')}
        </Text>
      )}
      <ConfirmDialog
        visible={confirm}
        title={t('chat.settings.leaveTitle', { name: title })}
        body={isOwner ? t('chat.settings.leaveOwnerBody') : t('chat.settings.leaveBody')}
        confirmLabel={t('chat.settings.leave')}
        cancelLabel={t('common.cancel')}
        destructive
        loading={leave.isPending}
        onCancel={() => setConfirm(false)}
        onConfirm={() =>
          leave.mutate(undefined, {
            onSuccess: () => {
              setConfirm(false);
              router.replace('/chat');
            },
          })
        }
      />
    </>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space[5] },
  section: { gap: space[3] },
});
