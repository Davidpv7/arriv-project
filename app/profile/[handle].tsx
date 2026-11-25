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
  IconButton,
  ListRow,
  PassportCover,
  Screen,
  Text,
} from '@/components/ds';
import { useUserId } from '@/features/auth/session';
import {
  useAcceptConnection,
  useConnectionCount,
  useConnectionState,
  useMyConnections,
  useProfileByHandle,
  useRemoveConnection,
  useRequestConnection,
  type ProfileWithVisa,
} from '@/features/profile/api';
import { initials, monthYear, visaText } from '@/features/profile/format';
import { findCountry } from '@/features/profile/places';
import { useBlockUser } from '@/features/safety/api';
import { avatarUrl } from '@/lib/storage';
import { colors, space } from '@/theme/tokens';

export default function ProfileScreen() {
  const { t } = useTranslation();
  const { handle = '' } = useLocalSearchParams<{ handle: string }>();
  const me = useUserId();
  const profile = useProfileByHandle(handle);
  const goBack = () => (router.canGoBack() ? router.back() : router.replace('/'));

  if (profile.isPending) {
    return (
      <Screen>
        <ActivityIndicator color={colors.navy} />
      </Screen>
    );
  }

  if (!profile.data) {
    return (
      <Screen scroll>
        <View style={styles.stack}>
          <Header onBack={goBack} backLabel={t('common.back')} title={t('profile.notFound')} />
          <Text variant="body" color="muted">
            {profile.isError ? t('common.error') : t('profile.notFoundBody')}
          </Text>
        </View>
      </Screen>
    );
  }

  const p = profile.data;
  const isMe = p.id === me;

  return (
    <Screen scroll>
      <View style={styles.stack}>
        <Header
          onBack={goBack}
          backLabel={t('common.back')}
          right={
            isMe ? (
              <IconButton
                icon="settings"
                accessibilityLabel={t('profile.settings')}
                onPress={() => router.push('/settings')}
              />
            ) : (
              <OtherMenu profile={p} />
            )
          }
        />
        <PassportCover
          eyebrow={t('profile.eyebrow')}
          name={p.display_name}
          handle={p.handle}
          initials={initials(p.display_name)}
          avatarUri={avatarUrl(p.avatar_path)}
          route={
            findCountry(p.origin_country)
              ? t('profile.route', { from: findCountry(p.origin_country)!.alpha3 })
              : undefined
          }
          since={
            monthYear(p.arrived_on)
              ? t('profile.since', { date: monthYear(p.arrived_on) })
              : undefined
          }
          bio={p.bio}
        >
          {isMe ? (
            <Button
              label={t('profile.edit')}
              variant="onNavy"
              icon="edit"
              onPress={() => router.push('/profile/edit')}
            />
          ) : (
            <ConnectionActions profile={p} />
          )}
        </PassportCover>

        <Card flush>
          <VisaRow profile={p} isMe={isMe} />
          <Divider />
          <ConnectionsRow profile={p} isMe={isMe} />
        </Card>

        <View style={styles.section}>
          <Text variant="label" color="rust" accessibilityRole="header">
            {t('profile.postcards')}
          </Text>
          <Card>
            <Text variant="body" color="muted">
              {t('profile.postcardsEmpty')}
            </Text>
          </Card>
        </View>
      </View>
    </Screen>
  );
}

function VisaRow({ profile, isMe }: { profile: ProfileWithVisa; isMe: boolean }) {
  const { t } = useTranslation();
  const text = visaText(profile.visa);
  const subclass = profile.visa?.visa_subclass;
  const title = text
    ? subclass
      ? t('profile.visaSubclass', { subclass })
      : text
    : t('profile.visaHidden');
  const meta =
    isMe && profile.visa
      ? t('profile.visibleTo', { who: t(`visibility.${profile.visa.visibility}`) })
      : t('profile.visa');
  return (
    <ListRow
      icon="document"
      title={title}
      meta={meta}
      onPress={isMe ? () => router.push('/profile/edit') : undefined}
    />
  );
}

function ConnectionsRow({ profile, isMe }: { profile: ProfileWithVisa; isMe: boolean }) {
  const { t } = useTranslation();
  const count = useConnectionCount(profile.id);
  const mine = useMyConnections();
  const incoming = isMe
    ? (mine.data ?? []).filter((c) => c.status === 'pending' && c.direction === 'incoming').length
    : 0;
  return (
    <ListRow
      icon="communities"
      title={t('profile.connections', { count: count.data ?? 0 })}
      meta={isMe && incoming > 0 ? t('profile.requests', { count: incoming }) : undefined}
      onPress={isMe ? () => router.push('/connections') : undefined}
    />
  );
}

function ConnectionActions({ profile }: { profile: ProfileWithVisa }) {
  const { t } = useTranslation();
  const state = useConnectionState(profile.id);
  const request = useRequestConnection();
  const accept = useAcceptConnection();
  const remove = useRemoveConnection();
  const [confirmRemove, setConfirmRemove] = useState(false);

  if (!state.data) return <ActivityIndicator color={colors.onNavy} />;
  const busy = request.isPending || accept.isPending || remove.isPending;

  return (
    <View style={styles.actions}>
      {state.data.kind === 'none' && (
        <Button
          label={t('profile.connect')}
          loading={busy}
          onPress={() => request.mutate(profile.id)}
        />
      )}
      {state.data.kind === 'outgoing' && (
        <Button
          label={t('profile.cancelRequest')}
          variant="onNavy"
          loading={busy}
          onPress={() => remove.mutate(profile.id)}
        />
      )}
      {state.data.kind === 'incoming' && (
        <>
          <Button
            label={t('profile.accept')}
            loading={accept.isPending}
            disabled={busy}
            onPress={() => accept.mutate(profile.id)}
          />
          <Button
            label={t('profile.decline')}
            variant="onNavy"
            disabled={busy}
            onPress={() => remove.mutate(profile.id)}
          />
        </>
      )}
      {state.data.kind === 'connected' && (
        <Button
          label={t('profile.connected')}
          variant="onNavy"
          icon="check"
          onPress={() => setConfirmRemove(true)}
          accessibilityHint={t('profile.remove')}
        />
      )}
      {(request.error || accept.error || remove.error) && (
        <Text variant="meta" color="sunshine">
          {t('common.error')}
        </Text>
      )}
      <ConfirmDialog
        visible={confirmRemove}
        title={t('profile.removeTitle', { name: profile.display_name })}
        body={t('profile.removeBody')}
        confirmLabel={t('profile.remove')}
        cancelLabel={t('common.cancel')}
        destructive
        loading={remove.isPending}
        onCancel={() => setConfirmRemove(false)}
        onConfirm={() => remove.mutate(profile.id, { onSuccess: () => setConfirmRemove(false) })}
      />
    </View>
  );
}

function OtherMenu({ profile }: { profile: ProfileWithVisa }) {
  const { t } = useTranslation();
  const block = useBlockUser();
  const [open, setOpen] = useState(false);
  return (
    <>
      <IconButton
        icon="more"
        accessibilityLabel={t('profile.moreA11y')}
        onPress={() => setOpen(true)}
      />
      <ConfirmDialog
        visible={open}
        title={t('profile.blockTitle', { name: profile.display_name })}
        body={t('profile.blockBody')}
        confirmLabel={t('profile.block')}
        cancelLabel={t('common.cancel')}
        destructive
        loading={block.isPending}
        onCancel={() => setOpen(false)}
        onConfirm={() =>
          block.mutate(profile.id, {
            onSuccess: () => {
              setOpen(false);
              router.replace('/');
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
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: space[3], alignItems: 'center' },
});
