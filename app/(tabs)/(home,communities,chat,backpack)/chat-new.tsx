import { router, useLocalSearchParams } from 'expo-router';
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { StyleSheet, View } from 'react-native';

import { Button, Chip, Header, Input, Screen, Text } from '@/components/ds';
import {
  useConversation,
  useCreateGroup,
  useGroupInvites,
  useInviteToGroup,
  useStartDirect,
} from '@/features/chat/api';
import { PeoplePicker } from '@/features/chat/components/PeoplePicker';
import type { ConnectionPerson } from '@/features/profile/api';
import { space } from '@/theme/tokens';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/chat'));

/** New direct or group chat. With ?invite=<conversation id>, invites people to that group. */
export default function NewChat() {
  const { invite } = useLocalSearchParams<{ invite?: string }>();
  return invite ? <InviteToGroup conversationId={invite} /> : <StartChat />;
}

function StartChat() {
  const { t } = useTranslation();
  const [mode, setMode] = useState<'direct' | 'group'>('direct');
  const [title, setTitle] = useState('');
  const [picked, setPicked] = useState<Map<string, ConnectionPerson>>(new Map());
  const [problem, setProblem] = useState<'needName' | 'needPeople' | null>(null);
  const startDirect = useStartDirect();
  const createGroup = useCreateGroup();
  const selected = useMemo(() => new Set(picked.keys()), [picked]);

  const toggle = (p: ConnectionPerson) =>
    setPicked((prev) => {
      const next = new Map(prev);
      if (next.has(p.id)) next.delete(p.id);
      else next.set(p.id, p);
      return next;
    });

  const create = () => {
    if (!title.trim()) return setProblem('needName');
    if (picked.size === 0) return setProblem('needPeople');
    setProblem(null);
    createGroup.mutate(
      { title, inviteeIds: [...picked.keys()] },
      { onSuccess: (id) => router.replace(`/conversation/${id}`) },
    );
  };

  return (
    <Screen scroll>
      <View style={styles.stack}>
        <Header onBack={goBack} backLabel={t('common.back')} title={t('chat.new.title')} />
        <View style={styles.modes} accessibilityRole="radiogroup">
          <Chip
            label={t('chat.new.direct')}
            selected={mode === 'direct'}
            onPress={() => setMode('direct')}
          />
          <Chip
            label={t('chat.new.group')}
            selected={mode === 'group'}
            onPress={() => setMode('group')}
          />
        </View>

        {mode === 'group' && (
          <View style={styles.section}>
            <Input
              label={t('chat.new.groupName')}
              placeholder={t('chat.new.groupNamePlaceholder')}
              value={title}
              onChangeText={setTitle}
              maxLength={60}
              error={problem === 'needName' ? t('chat.new.needName') : undefined}
            />
            <Text variant="meta" color="muted">
              {t('chat.new.inviteHint')}
            </Text>
          </View>
        )}

        <PeoplePicker
          mode={mode === 'group' ? 'multi' : 'single'}
          selected={selected}
          onPick={(p) =>
            mode === 'group'
              ? toggle(p)
              : startDirect.mutate(p.id, {
                  onSuccess: (id) => router.replace(`/conversation/${id}`),
                })
          }
        />

        {mode === 'group' && (
          <View style={styles.section}>
            {problem === 'needPeople' && (
              <Text variant="meta" color="rust">
                {t('chat.new.needPeople')}
              </Text>
            )}
            <Button
              label={
                picked.size > 0
                  ? `${t('chat.new.create')} · ${t('chat.new.selected', { count: picked.size })}`
                  : t('chat.new.create')
              }
              fullWidth
              loading={createGroup.isPending}
              onPress={create}
            />
          </View>
        )}
        {(startDirect.isError || createGroup.isError) && (
          <Text variant="meta" color="rust">
            {t('common.error')}
          </Text>
        )}
      </View>
    </Screen>
  );
}

function InviteToGroup({ conversationId }: { conversationId: string }) {
  const { t } = useTranslation();
  const conversation = useConversation(conversationId);
  const pending = useGroupInvites(conversationId);
  const invite = useInviteToGroup(conversationId);
  const [picked, setPicked] = useState<Set<string>>(new Set());
  const [result, setResult] = useState<number | null>(null);

  const exclude = useMemo(
    () =>
      new Set([
        ...(conversation.data?.members.map((m) => m.user_id) ?? []),
        ...(pending.data?.map((i) => i.invitee_id) ?? []),
      ]),
    [conversation.data, pending.data],
  );

  const toggle = (p: ConnectionPerson) =>
    setPicked((prev) => {
      const next = new Set(prev);
      if (next.has(p.id)) next.delete(p.id);
      else next.add(p.id);
      return next;
    });

  return (
    <Screen scroll>
      <View style={styles.stack}>
        <Header
          onBack={goBack}
          backLabel={t('common.back')}
          eyebrow={conversation.data?.title ?? undefined}
          title={t('chat.settings.invite')}
        />
        <Text variant="meta" color="muted">
          {t('chat.new.inviteHint')}
        </Text>
        <PeoplePicker mode="multi" selected={picked} onPick={toggle} exclude={exclude} />
        {result !== null && (
          <Text
            variant="meta"
            color={result > 0 ? 'teal' : 'muted'}
            accessibilityLiveRegion="polite"
          >
            {result > 0
              ? t('chat.settings.invitedCount', { count: result })
              : t('chat.settings.invitedNone')}
          </Text>
        )}
        {invite.isError && (
          <Text variant="meta" color="rust">
            {t('common.error')}
          </Text>
        )}
        <Button
          label={
            picked.size > 0
              ? `${t('chat.settings.invite')} · ${t('chat.new.selected', { count: picked.size })}`
              : t('chat.settings.invite')
          }
          fullWidth
          disabled={picked.size === 0}
          loading={invite.isPending}
          onPress={() =>
            invite.mutate([...picked], {
              onSuccess: (count) => {
                setResult(count);
                setPicked(new Set());
                if (count > 0) goBack();
              },
            })
          }
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space[5] },
  section: { gap: space[2] },
  modes: { flexDirection: 'row', gap: space[2] },
});
