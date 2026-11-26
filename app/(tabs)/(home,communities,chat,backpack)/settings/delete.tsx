import { useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import {
  ActionSheet,
  Button,
  Card,
  ConfirmDialog,
  Header,
  Icon,
  Input,
  Screen,
  Text,
} from '@/components/ds';
import { useDeleteAccount } from '@/features/auth/api';
import {
  useDeleteCommunity,
  useOtherMembers,
  useOwnedCommunities,
  useTransferOwnership,
  type CommunityMember,
  type OwnedCommunity,
} from '@/features/communities/api';
import { colors, space } from '@/theme/tokens';

const goBack = () => (router.canGoBack() ? router.back() : router.replace('/settings'));

/**
 * Delete account (spec journey 8): hand over or delete each community you own,
 * type DELETE, confirm. The server removes your files, then the account.
 */
export default function DeleteAccountScreen() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const owned = useOwnedCommunities();
  const remove = useDeleteAccount();
  const [typed, setTyped] = useState('');
  const [confirming, setConfirming] = useState(false);

  const ownsSome = (owned.data?.length ?? 0) > 0;
  const ready =
    owned.isSuccess && !ownsSome && typed.trim().toUpperCase() === t('deleteAccount.confirmWord');
  const removes = t('deleteAccount.removes', { returnObjects: true }) as string[];

  return (
    <Screen scroll>
      <View style={styles.stack}>
        <Header
          onBack={goBack}
          backLabel={t('common.back')}
          eyebrow={t('deleteAccount.eyebrow')}
          title={t('deleteAccount.title')}
        />
        <View style={styles.group}>
          <Text variant="body">{t('deleteAccount.intro')}</Text>
          {removes.map((line) => (
            <View key={line} style={styles.bullet}>
              <Icon name="close" size={18} color="rust" />
              <Text variant="body" style={styles.flex}>
                {line}
              </Text>
            </View>
          ))}
          <Text variant="meta" color="muted">
            {t('deleteAccount.stays')}
          </Text>
        </View>

        {owned.isPending ? (
          <ActivityIndicator color={colors.navy} />
        ) : ownsSome ? (
          <View style={styles.group}>
            <Text variant="label" color="rust" accessibilityRole="header">
              {t('deleteAccount.ownedTitle')}
            </Text>
            <Text variant="meta" color="muted">
              {t('deleteAccount.ownedBody')}
            </Text>
            {owned.data?.map((c) => (
              <OwnedRow key={c.id} community={c} />
            ))}
          </View>
        ) : null}

        <Input
          label={t('deleteAccount.confirmLabel')}
          placeholder={t('deleteAccount.confirmWord')}
          value={typed}
          onChangeText={setTyped}
          autoCapitalize="characters"
          autoCorrect={false}
        />
        {remove.isError && (
          <Text variant="meta" color="rust" accessibilityLiveRegion="polite">
            {ownsSome ? t('deleteAccount.ownsError') : t('common.error')}
          </Text>
        )}
        <Button
          label={t('deleteAccount.submit')}
          variant="dark"
          size="lg"
          fullWidth
          disabled={!ready}
          onPress={() => setConfirming(true)}
        />
      </View>

      <ConfirmDialog
        visible={confirming}
        title={t('deleteAccount.finalTitle')}
        body={t('deleteAccount.finalBody')}
        confirmLabel={t('deleteAccount.submit')}
        cancelLabel={t('common.cancel')}
        destructive
        loading={remove.isPending}
        onCancel={() => setConfirming(false)}
        onConfirm={() =>
          remove.mutate(undefined, {
            onSuccess: () => {
              queryClient.clear();
              router.replace('/welcome');
            },
            onError: () => {
              setConfirming(false);
              void owned.refetch(); // e.g. became an owner again meanwhile
            },
          })
        }
      />
    </Screen>
  );
}

/** One owned community: hand it to a member, or delete it. */
function OwnedRow({ community }: { community: OwnedCommunity }) {
  const { t } = useTranslation();
  const [picking, setPicking] = useState(false);
  const [person, setPerson] = useState<CommunityMember | null>(null);
  const [deleting, setDeleting] = useState(false);
  const members = useOtherMembers(picking ? community.id : null);
  const transfer = useTransferOwnership();
  const del = useDeleteCommunity();

  return (
    <Card>
      <View style={styles.group}>
        <Text variant="heading">{community.name}</Text>
        <Text variant="meta" color="muted">
          {t('deleteAccount.members', { count: community.member_count })}
        </Text>
        <View style={styles.actions}>
          <Button
            label={t('deleteAccount.handOver')}
            variant="secondary"
            onPress={() => setPicking(true)}
          />
          <Button
            label={t('deleteAccount.deleteCommunity')}
            variant="dark"
            onPress={() => setDeleting(true)}
          />
        </View>
        {(transfer.isError || del.isError) && (
          <Text variant="meta" color="rust">
            {t('common.error')}
          </Text>
        )}
      </View>

      <ActionSheet
        visible={picking && !members.isPending}
        title={
          (members.data?.length ?? 0) > 0
            ? t('deleteAccount.handOverTitle', { name: community.name })
            : t('deleteAccount.handOverEmpty')
        }
        actions={(members.data ?? []).map((m) => ({
          label: `${m.profile?.display_name ?? ''} (@${m.profile?.handle ?? ''})`,
          onPress: () => {
            setPicking(false);
            setPerson(m);
          },
        }))}
        cancelLabel={t('common.cancel')}
        onCancel={() => setPicking(false)}
      />
      <ConfirmDialog
        visible={!!person}
        title={t('deleteAccount.handOverConfirmTitle', {
          name: community.name,
          person: person?.profile?.display_name ?? '',
        })}
        body={t('deleteAccount.handOverConfirmBody')}
        confirmLabel={t('deleteAccount.handOverConfirm')}
        cancelLabel={t('common.cancel')}
        loading={transfer.isPending}
        onCancel={() => setPerson(null)}
        onConfirm={() =>
          person &&
          transfer.mutate(
            { communityId: community.id, newOwner: person.user_id },
            { onSuccess: () => setPerson(null) },
          )
        }
      />
      <ConfirmDialog
        visible={deleting}
        title={t('deleteAccount.deleteCommunityTitle', { name: community.name })}
        body={t('deleteAccount.deleteCommunityBody')}
        confirmLabel={t('deleteAccount.deleteCommunity')}
        cancelLabel={t('common.cancel')}
        destructive
        loading={del.isPending}
        onCancel={() => setDeleting(false)}
        onConfirm={() => del.mutate(community.id, { onSuccess: () => setDeleting(false) })}
      />
    </Card>
  );
}

const styles = StyleSheet.create({
  stack: { gap: space[5] },
  group: { gap: space[2] },
  flex: { flex: 1 },
  bullet: { flexDirection: 'row', gap: space[2], alignItems: 'flex-start' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space[2], marginTop: space[1] },
});
